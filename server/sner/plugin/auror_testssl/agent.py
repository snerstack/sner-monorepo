# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
Sner agent auror_testssl module
"""
import ipaddress
import logging
import socket

from schema import Schema

from sner.agent.modules import ModuleBase
from sner.version import __version__ as sner_version

logger = logging.getLogger(__name__)


AUROR_TESTSSL_TARGET_REGEXP = r'[0-9a-zA-Z\.\-]{1,256};(?P<address>[0-9\.]{7,15}|[0-9a-fA-F:]{3,45});[0-9]{1,5};(I|E)'


class AgentModule(ModuleBase):  # pragma: cover-ignore-if-not-pytestslow
    """
    auror_testssl module implementation

    ABNF for target specification

    For unspecified literals, refer to:
        - snerstack/sner-monorepo/refs/heads/main/server/sner/agent/modules.py
        - RFC 3986 Appendix A: https://tools.ietf.org/html/rfc3986#appendix-A

    Encryption mode options:
    I = Implicit TLS
    E = Explicit TLS via STARTTLS

    ## target specification

    encryption-mode = "I" / "E"
    target = reg-name ";" ( IPv4address / IPv6address ) ";" port ";" encryption-mode

    Attributes:
        CONFIG_SCHEMA (Schema): The configuration schema for the module.
    """

    CONFIG_SCHEMA = Schema({
        "module": "auror_testssl"
    })

    def __init__(self):
        super().__init__()
        self.loop = True

    # pylint: disable=duplicate-code
    def _filter_exit_codes(self, value):
        """Cope with testssl return values, not all !=0 values means job really failed
        https://github.com/drwetter/testssl.sh/blob/3.2/doc/testssl.1.md#exit-status

        Args:
            value (int): The exit code from the testssl.sh command.

        Returns:
            int: The filtered exit code.
        """

        if value < 200:
            # testssl uses exit code as error counted, but the output can contain lots of good results
            return 0
        if value == 245:
            # non-tls service, ipv4 vs ipv6, ...
            return 0
        if value == 246:
            # connectivity issues
            return 0

        return value

    # pylint: enable=duplicate-code

    def is_ipv6(self, address):
        """Check if address is IPv6.

        Args:
            address (str): The IP address to check.

        Returns:
            bool: True if the address is IPv6, False otherwise.
        """
        try:
            return isinstance(ipaddress.ip_address(address), ipaddress.IPv6Address)
        except ValueError:
            logger.warning("Invalid IP address: %s", address)
            return False

    def enumerate_auror_testssl_targets(self, targets):
        """Parse list of service targets for auror_testssl.

        Args:
            targets (list): The list of target strings to parse.

        Yields:
            tuple: A tuple of parsed target data (idx, host, ip, port, encryption_mode).
        """
        for idx, target in enumerate(targets):
            targets = target.split(";")
            host = targets[0]
            address = targets[1]
            port = int(targets[2])
            encryption_mode = targets[3]
            yield idx, host, address, port, encryption_mode

    def run(self, assignment):
        """Run the agent.

        Args:
            assignment (dict): The assignment data.

        Returns:
            int: The return code.
        """

        super().run(assignment)
        ret = 0

        connect_timeout = assignment["config"].get("connect_timeout", 5)
        openssl_timeout = assignment["config"].get("openssl_timeout", 5)
        for idx, host, address, port, encryption_mode in self.enumerate_auror_testssl_targets(assignment["targets"]):

            params = [
                "testssl.sh",
                "--quiet",
                "--full",
                "--connect-timeout",
                str(connect_timeout),
                "--openssl-timeout",
                str(openssl_timeout),
                "--phone-out",
                "--hints",
                "--overwrite",
                "--user-agent",
                f"Mozilla/5.0 (compatible; sner/{sner_version}; +https://sner-hub.flab.cesnet.cz)",
            ]
            if self.is_ipv6(address):
                params.append("-6")
            if encryption_mode == "E":
                service = socket.getservbyport(port, "tcp")
                params.extend(["--starttls", service])
            target_args = ["--jsonfile-pretty", f"output-{idx}.json", "--ip", address, f"{host}:{port}"]
            cmd = params + target_args
            logger.debug("Running command: %s", " ".join(cmd))
            ret |= self._filter_exit_codes(self._execute(cmd, f"output-{idx}"))

            if not self.loop:  # pragma: no cover  ; not tested
                ret = -16
                break

        return ret

    def terminate(self):  # pragma: no cover  ; not tested / running over multiprocessing
        """terminate scanner if running"""

        self.loop = False
        self._terminate()

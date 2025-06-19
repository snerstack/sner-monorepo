# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner agent auror_testssl module
"""
import ipaddress
import logging
import socket

from schema import Schema

from sner.agent.modules import ModuleBase
from sner.version import __version__ as sner_version

logger = logging.getLogger(__name__)


class AgentModule(ModuleBase):  # pragma: cover-ignore-if-not-pytestslow
    """
    auror_testssl module implementation

    ## target specification
    hostname;ip_address;port;explicit
    """

    CONFIG_SCHEMA = Schema({"module": "auror_testssl"})

    def __init__(self):
        super().__init__()
        self.loop = True

    # pylint: disable=duplicate-code
    def _filter_exit_codes(self, value):  # pragma: nocover  ; won't test
        """cope with testssl return values, not all !=0 values means job really failed
        https://github.com/drwetter/testssl.sh/blob/3.2/doc/testssl.1.md#exit-status
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
        """check if address is IPv6"""
        try:
            return isinstance(ipaddress.ip_address(address), ipaddress.IPv6Address)
        except ValueError:
            logger.warning("Invalid IP address: %s", address)
            return False

    def enumerate_auror_testssl_targets(self, targets):
        """
        parse list of service targets for auror_testssl

        :return: tuple of parsed target data
        :rtype: (idx, host, ip, port, explicit)
        """
        for idx, target in enumerate(targets):
            targets = target.split(";")
            host = targets[0]
            address = targets[1]
            port = int(targets[2])
            explicit = targets[3] == "True"
            yield idx, host, address, port, explicit

    def run(self, assignment):
        """run the agent"""

        super().run(assignment)
        ret = 0

        for idx, host, address, port, explicit in self.enumerate_auror_testssl_targets(assignment["targets"]):

            params = [
                "testssl.sh",
                "--quiet",
                "--full",
                "--connect-timeout",
                "5",
                "--openssl-timeout",
                "5",
                "--phone-out",
                "--hints",
                "--overwrite",
                "--user-agent",
                f"Mozilla/5.0 (compatible; sner/{sner_version}; +https://sner-hub.flab.cesnet.cz)",
            ]
            if self.is_ipv6(address):
                params.append("-6")
            if explicit:
                service = socket.getservbyport(port, "tcp")
                params.extend(["--starttls", service])
            target_args = ["--jsonfile-pretty", f"output-{idx}.json", "--ip", address, f"{host}:{port}"]
            cmd = params + target_args
            print(cmd)
            ret |= self._filter_exit_codes(self._execute(cmd, f"output-{idx}"))

            if not self.loop:  # pragma: no cover  ; not tested
                ret = -16
                break

        return ret

    def terminate(self):  # pragma: no cover  ; not tested / running over multiprocessing
        """terminate scanner if running"""

        self.loop = False
        self._terminate()

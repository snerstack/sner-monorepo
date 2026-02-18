# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
Sner agent auror_testssl module
"""

import logging
import socket

from schema import Schema, Optional

from sner.agent.modules import ModuleBase
from sner.version import __version__ as sner_version

logger = logging.getLogger(__name__)


class AgentModule(ModuleBase):  # pragma: cover-ignore-if-not-pytestslow
    """auror_testssl module implementation"""

    CONFIG_SCHEMA = Schema({
        "module": "auror_testssl",
        Optional('args'): list
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

    def run(self, assignment):
        """Run the agent.

        Args:
            assignment (dict): The assignment data.

        Returns:
            int: The return code.
        """

        super().run(assignment)
        ret = 0

        # TODO: refactor schema to pydantic which does have default values
        connect_timeout = assignment["config"].get("connect_timeout", 5)
        openssl_timeout = assignment["config"].get("openssl_timeout", 5)
        args = assignment["config"].get("args", ["--full"])

        for idx, target in self.enumerate_targets(assignment):
            params = [
                "testssl.sh",
                "--quiet",
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
            if target.is_ipv6_address():
                params.append("-6")
            if target.enc == "E":
                service = socket.getservbyport(target.port, "tcp")
                params.extend(["--starttls", service])
            target_args = [
                "--jsonfile-pretty",
                f"output-{idx}.json",
                "--ip",
                target.address,
                f"{target.hostname}:{target.port}",
            ]
            cmd = params + args + target_args
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

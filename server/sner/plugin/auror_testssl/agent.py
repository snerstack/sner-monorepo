# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
Sner agent auror_testssl module
"""

import logging
import os
import socket
from typing import Literal

from sner.agent.modules import ModuleBase
from sner.config import ConfigBase
from sner.version import __version__ as sner_version

logger = logging.getLogger(__name__)


class Config(ConfigBase):
    """auror_testssl agent plugin config"""

    module: str = Literal["auror_testssl"]
    args: list[str] = ["--full"]
    connect_timeout: int = 5
    openssl_timeout: int = 5


class AgentModule(ModuleBase):  # pragma: cover-ignore-if-not-pytestslow
    """
    auror_testssl module implementation

    ## target specification
    targetsV2 NamedServiceTarget
    """

    CONFIG_SCHEMA = Config

    def __init__(self):
        super().__init__()
        self.loop = True

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

    def _wait_children(self):
        """Wait for zombie grandchildren left behind by testssl.sh."""

        # Since https://github.com/testssl/testssl.sh/commit/d1531cdf60f0ce0d55c4d4a1b2fa5de114cbc682
        # testssl.sh leaks zombie processes likely due to process substitutions <(...) used inside
        # command substitutions $(...). When run from an interactive shell, the shell's job control
        # reaps them silently. When run from a long-running Python process, we must reap them explicitly.
        while True:
            try:
                pid, _ = os.waitpid(-1, os.WNOHANG)
                if pid == 0:
                    break  # children exist but none have exited yet
            except ChildProcessError:
                break  # no children left at all

    def run(self, assignment):
        """Run the agent.

        Args:
            assignment (dict): The assignment data.

        Returns:
            int: The return code.
        """

        asg_config = self.init_job(assignment)
        ret = 0

        for idx, target in self.enumerate_targets(assignment):
            params = [
                "testssl.sh",
                "--quiet",
                "--connect-timeout",
                str(asg_config.connect_timeout),
                "--openssl-timeout",
                str(asg_config.openssl_timeout),
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
            cmd = params + asg_config.args + target_args

            logger.debug("Running command: %s", " ".join(cmd))
            ret |= self._filter_exit_codes(self._execute(cmd, f"output-{idx}"))
            self._wait_children()

            if not self.loop:  # pragma: no cover  ; not tested
                ret = -16
                break

        return ret

    def terminate(self):  # pragma: no cover  ; not tested / running over multiprocessing
        """terminate scanner if running"""

        self.loop = False
        self._terminate()

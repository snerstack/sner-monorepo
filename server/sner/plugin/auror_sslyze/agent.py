# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner agent auror_sslyze module
"""

from typing import Literal

from sslyze import ProtocolWithOpportunisticTlsEnum

from sner.agent.modules import ModuleBase
from sner.config import ConfigBase
from sner.lib import uri_ipv6_address
from sner.targets import AurorTestsslTarget, NamedServiceTarget, ServiceTarget


class Config(ConfigBase):
    """auror_sslyze agent plugin config"""

    module: str = Literal["auror_sslyze"]
    args: list[str] = [
        "--certinfo",
        "--sslv2",
        "--sslv3",
        "--tlsv1",
        "--tlsv1_1",
        "--tlsv1_2",
        "--tlsv1_3",
        "--heartbleed",
        "--openssl_ccs",
        "--robot",
        "--compression",
        "--fallback",
        "--reneg",
        "--resum",
        "--elliptic_curves",
        "--ems",
        "--early_data",
    ]


class AgentModule(ModuleBase):  # pragma: cover-ignore-if-not-pytestslow
    """
    auror_sslyze module implementation

    ## target specification
    targetsV2 ServiceTarget | NamedServiceTarget | AurorTestsslTarget
    """

    CONFIG_SCHEMA = Config

    def __init__(self):
        super().__init__()
        self.loop = True

    @staticmethod
    def _server_string(target):
        """
        sslyze server string, hostname targets use pinned ip (no dns resolution, sni and
        server_location.hostname set from hostname)
        """

        if isinstance(target, (NamedServiceTarget, AurorTestsslTarget)):
            return f"{target.hostname}:{target.port}{{{target.address}}}"

        address = uri_ipv6_address(target.address) if target.is_ipv6_address() else target.address
        return f"{address}:{target.port}"

    def run(self, assignment):
        """run the agent"""

        asg_config = self.init_job(assignment)
        ret = 0

        for idx, target in self.enumerate_targets(assignment):
            if not isinstance(target, (ServiceTarget, NamedServiceTarget, AurorTestsslTarget)):
                self.log.warning("ignore invalid target %s", target)
                continue
            if isinstance(target, (ServiceTarget, NamedServiceTarget)) and target.proto != "tcp":
                self.log.warning("ignore non-TCP target %s", target)
                continue

            params = ["sslyze", "--quiet"]
            if isinstance(target, AurorTestsslTarget) and target.enc == "E":
                # sslyze derives starttls protocol from port number, unknown port would fall back to plain tls (double scan)
                if not ProtocolWithOpportunisticTlsEnum.from_default_port(target.port):
                    self.log.warning("ignore starttls target, unsupported port %s", target)
                    continue
                params.extend(["--starttls", "auto"])
            cmd = params + asg_config.args + ["--json_out", f"output-{idx}.json", self._server_string(target)]

            self.log.debug("running command: %s", " ".join(cmd))
            ret |= self._execute(cmd, f"output-{idx}")

            if not self.loop:  # pragma: no cover  ; not tested
                ret = -16
                break

        return ret

    def terminate(self):  # pragma: no cover  ; not tested / running over multiprocessing
        """terminate scanner if running"""

        self.loop = False
        self._terminate()

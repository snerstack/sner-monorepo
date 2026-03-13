# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner agent nuclei module
"""

from pathlib import Path
from typing import Literal

from sner.agent.modules import ModuleBase
from sner.config import ConfigBase
from sner.lib import uri_ipv6_address
from sner.targets import NamedServiceTarget, ServiceTarget


class Config(ConfigBase):
    """nuclei agent plugin config"""

    module: str = Literal["nuclei"]
    args: list[str]


class AgentModule(ModuleBase):
    """nuclei module

    ## target specification
    targetsV2 GenericTarget | ServiceTarget | NamedServiceTarget
    """

    CONFIG_SCHEMA = Config

    def run(self, assignment):
        asg_config = self.init_job(assignment)

        targets = []
        for _, target in self.enumerate_targets(assignment):
            if isinstance(target, ServiceTarget):
                address = uri_ipv6_address(target.address) if target.is_ipv6_address() else target.address
                targets.append(f"{address}:{target.port}")
                continue
            if isinstance(target, NamedServiceTarget):
                targets.append(f"{target.hostname}:{target.port}")
                continue
            targets.append(target.value)
        Path("targets").write_text("\n".join(targets), encoding="utf-8")

        output_args = ["-nc", "-je", "output.json", "-se", "output.sarif.json", "-o", "output"]
        target_args = ["-l", "targets"]
        cmd = ["nuclei"] + target_args + asg_config.args + output_args

        return self._execute(cmd, "output")

    def terminate(self):  # pragma: no cover  ; not tested / running over multiprocessing
        """terminate scanner if running"""
        self._terminate()

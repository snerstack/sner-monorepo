# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner agent manymap module
"""

from time import sleep
from typing import Literal

from sner.agent.modules import ModuleBase
from sner.config import ConfigBase
from sner.targets import ServiceTarget


class Config(ConfigBase):
    """manymap agent plugin config"""

    module: str = Literal["manymap"]
    args: list[str]
    delay: int = 0


class AgentModule(ModuleBase):
    """
    internet endpoints nmap-based scanner

    ## target specification
    targetsV2 ServiceTarget
    """

    CONFIG_SCHEMA = Config

    def __init__(self):
        super().__init__()
        self.loop = True

    def run(self, assignment):
        """run the agent"""

        asg_config = self.init_job(assignment)
        ret = 0

        for idx, target in self.enumerate_targets(assignment):
            if not isinstance(target, ServiceTarget):
                self.log.warning("ignored non-ServiceTarget %s", target)
                continue

            output_args = ["-oA", f"output-{idx}", "--reason"]

            target_args = ["-p", f"{target.proto[0].upper()}:{target.port}"]
            if target.is_ipv6_address():
                target_args += ["-6", target.address]
            else:
                target_args += [target.address]

            cmd = ["nmap"] + asg_config.args + output_args + target_args
            ret |= self._execute(cmd, f"output-{idx}")

            sleep(asg_config.delay)
            if not self.loop:  # pragma: no cover  ; not tested
                ret |= 2
                break

        return ret

    def terminate(self):  # pragma: no cover  ; not tested / running over multiprocessing
        """terminate scanner if running"""

        self.loop = False
        self._terminate()

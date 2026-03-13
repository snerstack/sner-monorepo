# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner agent jarm module
"""

from time import sleep
from typing import Literal

from sner.agent.modules import ModuleBase
from sner.config import ConfigBase


class Config(ConfigBase):
    """jarm agent plugin config"""

    module: str = Literal["jarm"]
    delay: int = 0


class AgentModule(ModuleBase):
    """
    jarm fingerprinter

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
            if target.proto != "tcp":
                self.log.warning("ignore non-TCP target %s", target)
                continue

            target_args = ["-p", str(target.port), target.address]
            cmd = ["jarm", "-v"] + target_args

            ret |= self._execute(cmd, f"output-{idx}.out")
            sleep(asg_config.delay)

            if not self.loop:  # pragma: no cover  ; not tested
                break

        return ret

    def terminate(self):  # pragma: no cover  ; not tested / running over multiprocessing
        """terminate scanner if running"""

        self.loop = False
        self._terminate()

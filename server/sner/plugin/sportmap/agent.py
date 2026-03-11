# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner sportmap module
"""

from pathlib import Path
from time import sleep
from typing import Literal

from sner.agent.modules import ModuleBase
from sner.config import ConfigBase
from sner.plugin.nmap.agent import AgentModule as NmapAgent

DEFAULT_SPORT = -1


class Config(ConfigBase):
    """nessus agent plugin config"""
    module: str = Literal["sportmap"]
    source_ports: list[int] = [DEFAULT_SPORT, 80, 53, 443, 123]
    args: list[str] = ["-sS", "-sU", "-Pn", "-n", "--max-retries", "3", "--top-ports", "20", "--max-rate", "5"]
    delay: int = 0


class AgentModule(ModuleBase):
    """
    sportmap module

    ## target specification
    targetsV2 GenericTarget | HostTarget
    """

    CONFIG_SCHEMA = Config

    def __init__(self):
        super().__init__()
        self.loop = True

    def run(self, assignment):
        """run the agent"""

        asg_config = self.init_job(assignment)
        ret = 0

        enumerated_targets = [target for _, target in self.enumerate_targets(assignment)]
        targets, targets6 = NmapAgent.split_by_address_family(enumerated_targets)

        if targets and self.loop:
            ret |= self.run_scan(asg_config, targets, "output")
        if targets6 and self.loop:
            ret |= self.run_scan(asg_config, targets6, "output6", extra_args=["-6"])

        return ret

    def run_scan(self, asg_config, targets, output_base, extra_args=None):
        """run scan"""

        ret = 0
        targets_file = Path(f"{output_base}.targets")
        targets_file.write_text("\n".join(targets), encoding="utf-8")

        for sport in asg_config.source_ports:
            output_file = f"{output_base}-sport-{'default' if sport == DEFAULT_SPORT else sport}"
            output_args = ["-oA", output_file, "--reason"]
            target_args = ["-iL", targets_file]
            sport_args = [] if sport == DEFAULT_SPORT else ["--source-port", str(sport)]

            cmd = ["nmap"] + (extra_args or []) + asg_config.args + output_args + sport_args + target_args
            ret |= self._execute(cmd, output_file)

            if not self.loop:  # pragma: no cover  ; not tested
                return 2
            sleep(asg_config.delay)

        return ret

    def terminate(self):  # pragma: no cover  ; not tested / running over multiprocessing
        """terminate scanner if running"""

        self.loop = False
        self._terminate()

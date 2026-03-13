# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner agent nmap module
"""

from pathlib import Path
from typing import Literal, Optional

from sner.agent.modules import ModuleBase
from sner.config import ConfigBase
from sner.targets import GenericTarget


class Config(ConfigBase):
    """nmap agent plugin config"""

    module: str = Literal["nmap"]
    args: list[str]
    timing_perhost: Optional[int] = None
    max_retries: int = 3
    script_timeout: str = "10m"


class AgentModule(ModuleBase):
    """
    nmap module

    ## target specification
    targetsV2 GenericTarget | HostTarget
    """

    CONFIG_SCHEMA = Config

    def __init__(self):
        super().__init__()
        self.loop = True

    @staticmethod
    def split_by_address_family(intargets):
        """split v4 and v6 targets"""

        targets4, targets6 = [], []
        append4, append6 = targets4.append, targets6.append

        for target in intargets:
            value = target.value if isinstance(target, GenericTarget) else target.address
            (append6 if target.is_ipv6_address() else append4)(value)

        return targets4, targets6

    def run_scan(self, asg_config, targets, targets_file, output_file, extra_args=None):
        """run scan"""

        Path(targets_file).write_text("\n".join(targets), encoding="utf-8")

        timing_args = []
        if asg_config.timing_perhost is not None:
            output_rate = asg_config.timing_perhost * len(targets)
            timing_args = [
                "--max-retries",
                str(asg_config.max_retries),
                "--script-timeout",
                asg_config.script_timeout,
                "--min-hostgroup",
                str(len(targets)),
                "--min-rate",
                str(output_rate),
                "--max-rate",
                str(int(output_rate * 1.05)),
            ]

        output_args = ["-oA", output_file, "--reason"]
        target_args = ["-iL", targets_file]

        cmd = ["nmap"] + (extra_args or []) + asg_config.args + timing_args + output_args + target_args
        return self._execute(cmd, output_file)

    def run(self, assignment):
        """run the agent"""

        asg_config = self.init_job(assignment)
        ret = 0

        enumerated_targets = [target for _, target in self.enumerate_targets(assignment)]
        targets, targets6 = self.split_by_address_family(enumerated_targets)

        if targets and self.loop:
            ret |= self.run_scan(asg_config, targets, "targets", "output")

        if targets6 and self.loop:
            ret |= self.run_scan(asg_config, targets6, "targets6", "output6", extra_args=["-6"])

        return ret

    def terminate(self):  # pragma: no cover  ; not tested / running over multiprocessing
        """terminate scanner if running"""

        self.loop = False
        self._terminate()

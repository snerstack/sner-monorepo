# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner agent nessus module
"""

from pathlib import Path
from time import sleep
from typing import Literal

from sner.agent.modules import ModuleBase
from sner.config import ConfigBase
from sner.plugin.nessus.manager import NessusManager
from sner.targets import GenericTarget


SCAN_POLL_INTERVAL = 10
OUTPUT_FILENAME = "output.nessus"


class Config(ConfigBase):
    """nessus agent plugin config"""
    module: str = Literal["nessus"]
    policy_name: str = "sner-basic"


class AgentModule(ModuleBase):
    """nessus module

    ## target specification
    targetsV2 GenericTarget | HostTarget
    """

    CONFIG_SCHEMA = Config

    def __init__(self):
        super().__init__()
        self.loop = True
        self.nessus = None

    def _wait_scan(self, scan_id):
        """wait until scan finishes, interruptable"""

        end_states = ["aborted", "canceled", "completed"]
        while self.loop:
            status = self.nessus.scan_status(scan_id)
            if status in end_states:
                if status == "completed":
                    return 0
                return 1  # pragma: nocover  ; won't test
            sleep(SCAN_POLL_INTERVAL)
        return 1  # pragma: nocover  ; won't test

    def run(self, assignment):
        asg_config = self.init_job(assignment)
        self.nessus = NessusManager.from_env()

        targets = [
            target.value if isinstance(target, GenericTarget) else target.address
            for _, target in self.enumerate_targets(assignment)
        ]

        scan_id = self.nessus.scan_create(f'{asg_config.policy_name}.{assignment["id"]}', targets, asg_config.policy_name)

        ret = self._wait_scan(scan_id)
        if not self.loop:
            return ret  # pragma: nocover  ; won't test

        Path(OUTPUT_FILENAME).write_text(self.nessus.scan_report(scan_id), encoding="utf-8")
        self.nessus.scan_delete(scan_id)

        self.nessus = None
        return ret

    def terminate(self):  # pragma: no cover  ; not tested / running over multiprocessing
        """terminate scanner if running"""

        self.loop = False

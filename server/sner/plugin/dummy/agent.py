# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner agent dummy module
"""

from typing import Literal

from sner.agent.modules import ModuleBase
from sner.config import ConfigBase


class Config(ConfigBase):
    """dummy agent plugin config"""
    module: str = Literal["dummy"]
    args: list[str]


class AgentModule(ModuleBase):
    """
    testing module implementation

    ## target specification
    targetsV2 GenericTarget
    """

    CONFIG_SCHEMA = Config

    def run(self, assignment):
        """simply write assignment and return"""
        self.init_job(assignment)
        return 0

    def terminate(self):
        """nothing to be done for dummy terminate"""

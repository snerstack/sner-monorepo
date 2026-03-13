# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner agent auror_hostnames module
"""

from typing import Literal

from sner.agent.modules import ModuleBase
from sner.config import ConfigBase
from sner.plugin.auror_hostnames import core


class Config(ConfigBase):
    """auror_hostnames agent plugin config"""

    module: str = Literal["auror_hostnames"]
    git_key_path: str = "/etc/sner.auror_hostnames.pubkey"
    git_server: str = "server.hostname"


class AgentModule(ModuleBase):
    """auror_hostnames module implementation

    ## target specification
    target = simple-target
    """

    CONFIG_SCHEMA = Config

    def run(self, assignment):
        """simply write assignment and return"""
        self.init_job(assignment)
        return core.run(assignment)

    def terminate(self):
        """nothing to be done for auror_hostnames terminate"""

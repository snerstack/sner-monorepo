# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner agent auror_hostnames module
"""
from schema import Schema

from sner.agent.modules import ModuleBase
from sner.plugin.auror_hostnames import core


class AgentModule(ModuleBase):
    """auror_hostnames module implementation

    ## target specification
    target = simple-target
    """

    CONFIG_SCHEMA = Schema({
        "module": "auror_hostnames",
        "git_key_path": str,
        "git_server": str
    })

    def run(self, assignment):
        """simply write assignment and return"""

        super().run(assignment)

        return core.run(assignment, self.log)

    def terminate(self):
        """nothing to be done for auror_hostnames terminate"""

# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner agent quicmap module
"""

import shlex

from schema import Schema

from sner.agent.modules import ModuleBase


class AgentModule(ModuleBase):
    """
    quicmap module

    ## target specification
    target = host-target
    """

    CONFIG_SCHEMA = Schema({
        'module': 'quicmap',
        'args': str,
    })

    def __init__(self):
        super().__init__()
        self.loop = True

    def run(self, assignment):
        """run the agent"""

        super().run(assignment)

        targets = assignment['targets']

        cmd = ['quicmap'] + shlex.split(assignment['config']['args']) + [",".join(targets)]

        self._execute(cmd, 'output')

        return 0

    def terminate(self):  # pragma: no cover  ; not tested / running over multiprocessing
        """terminate scanner if running"""

        self.loop = False
        self._terminate()

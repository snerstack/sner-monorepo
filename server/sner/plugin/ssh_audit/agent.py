# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner agent ssh audit module
"""

from pathlib import Path
from schema import Schema
from sner.agent.modules import ModuleBase


class AgentModule(ModuleBase):
    """
    ssh audit module

    ## target specification
    target = service-target
    """

    CONFIG_SCHEMA = Schema({
        'module': 'ssh_audit',
    })

    def run(self, assignment):
        super().run(assignment)

        Path('targets').write_text('\n'.join(assignment['targets']), encoding='utf-8')

        target_args = ['-T', 'targets']
        output_args = ['-j', '-n']

        cmd = ['ssh-audit'] + target_args + output_args

        self._execute(cmd, 'output')

        return 0

    def terminate(self):  # pragma: no cover  ; not tested / running over multiprocessing
        """terminate scanner if running"""

        self._terminate()

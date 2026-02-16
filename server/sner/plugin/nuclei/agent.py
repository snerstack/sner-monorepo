# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner agent nuclei module
"""

import shlex
from pathlib import Path
from schema import Schema

from sner.agent.modules import ModuleBase
from sner.lib import format_host_address
from sner.targets import TargetManager, ServiceTarget, NamedServiceTarget


class AgentModule(ModuleBase):
    """nuclei module

    ## target specification
    targets v2 GenericTarget | ServiceTarget | NamedServiceTarget
    """

    CONFIG_SCHEMA = Schema({
        'module': 'nuclei',
        'args': str
    })

    def run(self, assignment):
        super().run(assignment)

        targets = []
        for item in assignment['targets']:
            target = TargetManager.from_str(item)
            if isinstance(target, ServiceTarget):
                targets.append(f"{format_host_address(target.address)}:{target.port}")
                continue
            if isinstance(target, NamedServiceTarget):
                targets.append(f"{target.hostname}:{target.port}")
                continue
            targets.append(target.value)
        Path('targets').write_text('\n'.join(targets), encoding='utf-8')

        output_args = ['-nc', '-je', 'output.json', '-se', 'output.sarif.json', '-o', 'output']
        target_args = ['-l', 'targets']
        cmd = ['nuclei'] + target_args + shlex.split(assignment['config']['args']) + output_args

        return self._execute(cmd, 'output')

    def terminate(self):  # pragma: no cover  ; not tested / running over multiprocessing
        """terminate scanner if running"""

        self._terminate()

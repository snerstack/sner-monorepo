# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner sportmap module
"""

from pathlib import Path
import shlex
from time import sleep

from schema import Schema, Optional

from sner.agent.modules import ModuleBase
from sner.plugin.nmap.agent import AgentModule as NmapAgent


class AgentModule(ModuleBase):
    """
    sportmap module

    ## target specification
    target = host-target
    """

    CONFIG_SCHEMA = Schema({
        'module': 'sportmap',
        Optional('source_ports'): list,
        Optional('args'): str,
        Optional('delay'): int,
    })

    DEFAULT_SPORT = -1

    def __init__(self):
        super().__init__()
        self.loop = True

    def run(self, assignment):
        """run the agent"""

        if 'args' not in assignment['config']:  # pragma: no cover  ; not tested
            assignment["config"]["args"] = "-sS -sU -Pn -n --max-retries 3 --top-ports 20 --max-rate 5"
        if 'source_ports' not in assignment['config']:  # pragma: no cover  ; not tested
            assignment["config"]["source_ports"] = [self.DEFAULT_SPORT, 80, 53, 443, 123]
        super().run(assignment)

        ret = 0
        targets, targets6 = NmapAgent.sort_ipv6_targets(assignment['targets'])
        if targets and self.loop:
            ret |= self.run_scan(assignment, targets, 'output')
        if targets6 and self.loop:
            ret |= self.run_scan(assignment, targets6, 'output6', extra_args=['-6'])

        return ret

    def run_scan(self, assignment, targets, output_base, extra_args=None):
        """run scan"""

        ret = 0
        targets_file = Path(f"{output_base}.targets")
        targets_file.write_text('\n'.join(targets), encoding='utf-8')

        for sport in assignment['config']['source_ports']:
            output_file = f"{output_base}-sport-{'default' if sport == self.DEFAULT_SPORT else sport}"
            output_args = ['-oA', output_file, '--reason']
            target_args = ['-iL', targets_file]
            sport_args = [] if sport == self.DEFAULT_SPORT else ['--source-port', str(sport)]
            config_args = shlex.split(assignment['config']['args'])

            cmd = ['nmap'] + (extra_args or []) + config_args + output_args + sport_args + target_args
            ret |= self._execute(cmd, output_file)

            if not self.loop:  # pragma: no cover  ; not tested
                return 2
            sleep(assignment['config'].get('delay', 0))

        return ret

    def terminate(self):  # pragma: no cover  ; not tested / running over multiprocessing
        """terminate scanner if running"""

        self.loop = False
        self._terminate()

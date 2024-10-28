# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner agent testssl module
"""

from time import sleep

from schema import Schema

from sner.agent.modules import ModuleBase


class AgentModule(ModuleBase):  # pragma: cover-ignore-if-not-pytestslow
    """
    internet endpoints nmap-based scanner

    ## target specification
    target = service-target
    """

    CONFIG_SCHEMA = Schema({
        'module': 'testssl',
        'delay': int,
    })

    def __init__(self):
        super().__init__()
        self.loop = True

    def _filter_exit_codes(self, value):  # pragma: nocover  ; won't test
        """cope with testssl return values, not all !=0 values means job really failed
        https://github.com/drwetter/testssl.sh/blob/3.2/doc/testssl.1.md#exit-status
        """

        if value < 200:
            # testssl uses exit code as error counted, but the output can contain lots of good results
            return 0
        if value == 245:
            # non-tls service, ipv4 vs ipv6, ...
            return 0
        if value == 246:
            # connectivity issues
            return 0

        return value

    def run(self, assignment):
        """run the agent"""

        super().run(assignment)
        ret = 0

        for idx, target, proto, host, port in self.enumerate_service_targets(assignment['targets']):
            if proto != 'tcp':
                self.log.warning('ignoring non-tcp target %s', target)
                continue

            target_args = ['--jsonfile-pretty', f'output-{idx}.json', f'{host}:{port}']
            cmd = ['testssl.sh', '--quiet', '--full', '-6', '--connect-timeout', '5', '--openssl-timeout', '5'] + target_args
            ret |= self._filter_exit_codes(self._execute(cmd, f'output-{idx}'))

            sleep(assignment['config']['delay'])
            if not self.loop:  # pragma: no cover  ; not tested
                ret = -16
                break

        return ret

    def terminate(self):  # pragma: no cover  ; not tested / running over multiprocessing
        """terminate scanner if running"""

        self.loop = False
        self._terminate()

# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner agent six enum from storage discover
"""

from ipaddress import ip_address, ip_network

from pyroute2 import NDB  # pylint: disable=no-name-in-module
from schema import Schema

from sner.agent.modules import ModuleBase
from sner.targets import TargetManager


class AgentModule(ModuleBase):
    """
    enumeration based ipv6 discover

    man scan6
    -d DST_ADDRESS, --dst-address DST_ADDRESS
    This  option  specifies the target address prefix/range of the address scan. An IPv6 prefix can be specified in the form 2001:db8::/64,
    or as 2001:db8:a-b:1-10 (where specific address ranges are specified for the two low order 16-bit words). This option must be specified
    for remote address scanning attacks.

    ## target specification
    target = TargetV2 SixEnumTarget
    """

    CONFIG_SCHEMA = Schema({
        'module': 'six_enum_discover',
        'rate': int,
    })

    def __init__(self):
        super().__init__()
        self.loop = True
        self._local_networks = [
            (ip_network(f'{record.address}/{record.prefixlen}', strict=False), record.ifname)
            for record
            in NDB().addresses.summary()  # pylint: disable=no-member
        ]

    def _is_localnet(self, addr):
        """semidetect if target is on localnet"""

        # loopback addres is not considered link-local, used by pytest
        if addr == ip_address("::1"):
            return False, None

        for localnet, ifname in self._local_networks:
            if addr in localnet:
                return True, ifname

        return False, None  # pragma: no cover  ; no IPv6 in CI (GH Actions)

    def run(self, assignment):
        """run the agent"""

        super().run(assignment)
        ret = 0

        for idx, value in enumerate(assignment['targets']):
            target = TargetManager.from_str(value)

            # detect if scan has to be performed with --dst-addr or --local-scan
            first, _last = target.boundaries()
            is_localnet, iface = self._is_localnet(first)
            args = ['--local-scan', '--print-type', 'global', '-i', iface] if is_localnet else ['--dst-addr', target.value]

            ret |= self._execute(['scan6', '--rate-limit', f'{assignment["config"]["rate"]}pps'] + args, f'output-{idx}.txt')
            if not self.loop:  # pragma: no cover  ; not tested
                break

        return ret

    def terminate(self):  # pragma: no cover  ; not tested / running over multiprocessing
        """terminate scanner if running"""

        self.loop = False
        self._terminate()

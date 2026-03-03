# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner agent ipv6 (via ipv4 enum ptr) dns discovery module
"""

import json
from pathlib import Path
from socket import AF_INET6, getaddrinfo, gethostbyaddr
from time import sleep
from typing import Literal, Union

from sner.agent.modules import ModuleBase
from sner.config import ConfigBase
from sner.targets import GenericTarget


class Config(ConfigBase):
    """nessus agent plugin config"""
    module: str = Literal["six_dns_discover"]
    delay: Union[int, float] = 1


class AgentModule(ModuleBase):
    """
    dns based ipv6 from ipv4 address discover

    ## target specification
    targetsV2 HostTarget
    """

    CONFIG_SCHEMA = Config

    def __init__(self):
        super().__init__()
        self.loop = True

    @staticmethod
    def find_ipv6_by_hostname(ipv4_address):
        """find ipv6 addresses by same hostname of PTR and AAAA"""
        result = []

        try:
            (hostname, _, _) = gethostbyaddr(ipv4_address)
            resolved_addrs = getaddrinfo(hostname, None, AF_INET6)
            for _, _, _, _, sockaddr in resolved_addrs:
                result.append((sockaddr[0], hostname, ipv4_address))
        except OSError:
            pass

        return result

    # pylint: disable=duplicate-code
    def run(self, assignment):
        """run the agent"""
        asg_config = self.init_job(assignment)

        result = {}
        for _, target in self.enumerate_targets(assignment):
            addr = target.value if isinstance(target, GenericTarget) else target.address
            for v6addr, hostname, via_ipv4 in self.find_ipv6_by_hostname(addr):
                result[v6addr] = (hostname, via_ipv4)

            if not self.loop:  # pragma: no cover  ; not tested
                break
            sleep(asg_config.delay)

        Path("output.json").write_text(json.dumps(result), encoding="utf-8")
        return 0

    def terminate(self):  # pragma: no cover  ; not tested / running over multiprocessing
        """terminate scanner if running"""
        self.loop = False

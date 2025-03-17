# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner agent auror_hostnames module
"""
import json
import os
import shutil
from pathlib import Path
from schema import Schema

from sner.agent.modules import ModuleBase
from sner.plugin.auror_hostnames.core import get_zone_file_paths, get_records, process_cnames, process_ptrs, clone_dns_repos, get_repos


class AgentModule(ModuleBase):
    """
    auror_hostnames module implementation

    ## target specification
    target = simple-target
    """

    CONFIG_SCHEMA = Schema({"module": "auror_hostnames", "git_key_path": str, "git_server": str, "args": str})

    def run(self, assignment):
        """simply write assignment and return"""

        super().run(assignment)

        git_key_path = assignment["config"]["git_key_path"]
        git_server = assignment["config"]["git_server"]

        if os.path.exists(git_key_path) is False:
            self.log.error("Git key file does not exist")
            return 1

        repos = get_repos(git_server, git_key_path)
        clone_dns_repos(git_server, repos, git_key_path)
        zone_file_paths = get_zone_file_paths()

        cnames = {}
        a_aaaa = {}
        ptrs = {}
        ip_hostnames = {}

        for zone_file_path in zone_file_paths:
            result = get_records(zone_file_path)
            cnames.update(result[0])
            a_aaaa.update(result[1])
            ptrs.update(result[2])
            ip_hostnames.update(result[3])

        ip_hostnames = process_ptrs(ptrs, ip_hostnames)
        ip_hostnames = process_cnames(cnames, a_aaaa, ip_hostnames)
        ip_hostnames = {k: list(v) for k, v in ip_hostnames.items()}

        shutil.rmtree("dns-zones")
        Path("output.json").write_text(json.dumps(ip_hostnames), encoding="utf-8")
        return 0

    def terminate(self):
        """nothing to be done for auror_hostnames terminate"""

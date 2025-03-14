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
from sner.plugin.auror_hostnames.core import get_zone_file_paths, get_records, process_cnames, process_ptrs, clone_dns_repo, get_repos


class AgentModule(ModuleBase):
    """
    auror_hostnames module implementation

    ## target specification
    target = simple-target
    """

    CONFIG_SCHEMA = Schema({"module": "auror_hostnames", "args": str})

    def run(self, assignment):
        """simply write assignment and return"""

        super().run(assignment)

        if os.environ["GIT_KEY_PATH"] == "":
            git_key_path = assignment["config"]["git_key_path"]
        else:
            git_key_path = os.environ["GIT_KEY_PATH"]

        git_server = assignment["config"]["git_server"]

        # git_server = ""
        # git_key_path = f"~/.ssh/{git_server}"

        repos = get_repos(git_server, git_key_path)
        for repo in repos:
            clone_dns_repo(git_server, repo, git_key_path)
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

        # print(f"CNAMES: {len(cnames)}")
        # print(f"PTRS: {len(ptrs)}")
        # print(f"A_AAAA: {len(a_aaaa)}")
        # print(f"IP_HOSTNAMES: {len(ip_hostnames)}")

        ip_hostnames = process_ptrs(ptrs, ip_hostnames)
        ip_hostnames = process_cnames(cnames, a_aaaa, ip_hostnames)
        ip_hostnames = {k: list(v) for k, v in ip_hostnames.items()}

        shutil.rmtree("dns-zones")
        Path("output.json").write_text(json.dumps(ip_hostnames), encoding="utf-8")
        return 0

    def terminate(self):
        """nothing to be done for auror_hostnames terminate"""

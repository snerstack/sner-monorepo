# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""git related functions for auror_hostnames plugin"""

import logging
import os
import subprocess
from pathlib import Path

logger = logging.getLogger(__name__)


def check_git_key_path(git_key_path) -> bool:
    """Check if git key path exists"""
    return os.path.exists(git_key_path)


def get_repos(git_server, git_key_path) -> list:
    """
    Get DNS repositories from git server
    """
    cmd = ["ssh", "-i", git_key_path, f"git@{git_server}", "info"]
    output = subprocess.check_output(cmd, text=True).splitlines()[2:]  # Skip the first line
    repos = [line.split("\t")[-1] for line in output]

    return repos


def clone_dns_repos(git_server, repos, git_key_path):
    """Clone DNS zones from git repository"""
    env = os.environ.copy()
    env["GIT_SSH_COMMAND"] = f"ssh -i {git_key_path}"
    for repo in repos:
        subprocess.run(["git", "clone", f"git@{git_server}:{repo}", f"dns-zones/{repo}"], check=True, env=env)


def get_zone_file_paths() -> set:
    """
    Get DNS zone names from git repos
    """
    repos_folder = Path("dns-zones")
    zone_file_paths = set()
    for zone_file in repos_folder.glob("**/*.zone"):
        zone_file_paths.add(str(zone_file))

    return sorted(zone_file_paths)


def run(assignment):
    """Run auror_hostnames module"""

    git_key_path = assignment["config"]["git_key_path"]
    git_server = assignment["config"]["git_server"]

    if check_git_key_path(git_key_path) is False:
        logger.error("Git key file does not exist")
        return []

    try:
        repos = get_repos(git_server, git_key_path)
        clone_dns_repos(git_server, repos, git_key_path)
        zone_file_paths = get_zone_file_paths()
        return zone_file_paths
    except (OSError, subprocess.CalledProcessError):
        logger.exception("Failed to load DNS zone files from git")
        return []

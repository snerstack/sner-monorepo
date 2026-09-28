# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""git related functions for auror_hostnames plugin"""

import logging
import os
import subprocess
from pathlib import Path

from sner.plugin.auror_hostnames.constants import WORKDIR

logger = logging.getLogger(__name__)


def get_repos(git_server, git_key_path) -> list:
    """
    Get DNS repositories from git server
    """

    cmd = ["ssh", "-i", git_key_path, f"git@{git_server}", "info"]
    output = subprocess.check_output(cmd, text=True).splitlines()[2:]  # Skip the first line
    repos = [line.split("\t")[-1] for line in output]
    return repos


def crawl_repos(git_server, git_key_path, repos):
    """Clone DNS zones from git repository"""

    zone_file_paths = []
    env = os.environ.copy()
    env["GIT_SSH_COMMAND"] = f"ssh -i {git_key_path}"

    for repo in repos:
        repo_dir = Path(f"{WORKDIR}/{repo}")
        cmd = ["git", "clone", f"git@{git_server}:{repo}", str(repo_dir)]
        subprocess.run(cmd, check=True, env=env)
        zone_file_paths.extend(str(item) for item in repo_dir.glob("**/*.zone"))

    return zone_file_paths


def run(source):
    """Run auror_hostnames module"""

    git_server = source["git_server"]
    git_key_path = source["git_key_path"]
    if not Path(git_key_path).exists():
        logger.error("Git key file does not exist")
        return []

    try:
        repos = get_repos(git_server, git_key_path)
        zone_file_paths = crawl_repos(git_server, git_key_path, repos)
        return zone_file_paths
    except (OSError, subprocess.CalledProcessError):
        logger.error("Failed to load DNS zone files from git")
        return []

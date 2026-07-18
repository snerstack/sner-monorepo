# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auror_hostnames plugin git tests
"""

from pathlib import Path

from sner.plugin.auror_hostnames.git import run


def test_run(gitolite_server):
    """run lists gitolite repositories, clones them and returns discovered zone file paths"""

    zone_file_paths = run({"config": gitolite_server})

    assert zone_file_paths == ["dns-zones/zones/repo1/git1.example.com.zone", "dns-zones/zones/repo2/git2.example.com.zone"]
    for path in zone_file_paths:
        assert "SOA" in Path(path).read_text(encoding="utf-8")


def test_run_missing_key(tmpworkdir):  # pylint: disable=unused-argument
    """run returns empty list when the configured git key does not exist"""

    assert run({"config": {"git_key_path": "/nonexistent/gitkey", "git_server": "git.example.com"}}) == []


def test_run_git_error(gitolite_server):
    """run returns empty list when git operations fail"""

    assert run({"config": {"git_key_path": gitolite_server["git_key_path"], "git_server": "fail.example.com"}}) == []

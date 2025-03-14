# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auror_hostnames plugin core tests
"""

from unittest.mock import mock_open
import os
import subprocess

import dns.zone

from sner.plugin.auror_hostnames.core import clone_dns_repo, get_zone_file_paths, process_cnames, process_ptrs, get_records, get_repos


def test_get_repos(mocker):
    """Test getting DNS repositories"""
    mocker.patch("os.getenv", return_value="dummy_token")
    mocker.patch("subprocess.check_output", return_value="dummy_repo1\t\ndummy_repo2\t\n")
    result = get_repos()
    assert result == ["dummy_repo1", "dummy_repo2"]


def test_clone_dns_repo(mocker):
    """Test cloning DNS repo"""
    mocker.patch("os.environ.copy", return_value={"GIT_SSH_COMMAND": "dummy_command"})
    mocker.patch("subprocess.run")
    clone_dns_repo("dummy_git_server", "dummy_repo", "dummy_key")
    os.environ.copy.assert_called_once()
    subprocess.run.assert_called_once_with(
        ["git", "clone", "git@dummy_git_server:dummy_repo", "dns-zones/dummy_repo"], check=True, env={"GIT_SSH_COMMAND": "dummy_command"}
    )


def test_get_zone_file_paths(mocker):
    """Test getting zone file paths"""
    mocker.patch("shutil.copytree")
    mocker.patch("os.walk", return_value=[("root", [], ["file1.zone", "file2.txt"])])
    result = get_zone_file_paths()
    assert result == {"root/file1.zone"}


def test_process_cnames():
    """Test processing CNAMEs"""
    cnames = {"alias1": "cname1", "alias2": "cname2"}
    a_aaaa = {"cname1": ["1.1.1.1"], "cname2": ["2.2.2.2"]}
    ip_hostnames = {}
    result = process_cnames(cnames, a_aaaa, ip_hostnames)
    assert result == {"1.1.1.1": {"alias1"}, "2.2.2.2": {"alias2"}}


def test_process_ptrs():
    """Test processing PTRs"""
    ptrs = {"1.1.1.1.in-addr.arpa": "hostname1.", "2.2.2.2.in-addr.arpa": "hostname2."}
    ip_hostnames = {}
    result = process_ptrs(ptrs, ip_hostnames)
    assert result == {"1.1.1.1": {"hostname1"}, "2.2.2.2": {"hostname2"}}


def test_get_records(mocker):
    """Test getting records from zone file"""
    zone_file_content = """
    $ORIGIN example.com.
    @   IN  SOA ns.example.com. hostmaster.example.com. (
                2021010101 ; serial
                3600       ; refresh (1 hour)
                1800       ; retry (30 minutes)
                1209600    ; expire (2 weeks)
                3600       ; minimum (1 hour)
                )
        IN  NS  ns.example.com.
    ns  IN  A   192.0.2.1
    www IN  CNAME   example.com.
    """
    mock_open_file = mock_open(read_data=zone_file_content)
    mocker.patch("builtins.open", mock_open_file)
    mocker.patch("dns.zone.from_file", return_value=dns.zone.from_text(zone_file_content))
    result = get_records("dummy_path")
    assert result == [{"www.example.com.": "example.com."}, {"ns.example.com.": {"192.0.2.1"}}, {}, {"192.0.2.1": {"ns.example.com."}}]

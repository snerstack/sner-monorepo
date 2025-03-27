# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auror_hostnames plugin core tests
"""
import pytest
from pathlib import Path
from unittest.mock import patch, call

import dns.zone

from sner.plugin.auror_hostnames.core import (
    clone_dns_repos,
    get_zone_file_paths,
    process_cnames,
    process_ptrs,
    get_records,
    get_repos,
    check_if_hostname,
    create_fqdn,
    check_git_key_path,
    resolve_hostname,
)

dummy_repos = ["dummy_repo1", "dummy_repo2", "dummy_repo3"]
key = "dummy_key"
server = "dummy_domain.com"
test_files_path = "tests/server/data/auror_hostnames-dns_zones"
dns_zones_folder = "dns-zones"
zone_file_path1 = f"{test_files_path}/{dns_zones_folder}/dummy_repo1/zones/example.com.zone"
zone_file_path2 = f"{test_files_path}/{dns_zones_folder}/dummy_repo2/zones/1.168.192.in-addr.arpa.zone"


def test_get_repos():
    """Test getting DNS repositories"""
    output_file_path = "tests/server/data/auror_hostnames-gitolite_output"
    with open(output_file_path, "r", encoding="utf-8") as file:
        mock_output = file.read()
    with patch("subprocess.check_output", return_value=mock_output):
        result = get_repos(server, key)

    assert result == dummy_repos


def test_clone_dns_repos():
    """Test cloning DNS repo"""
    dummy_git_server = "dummy_git_server"

    # Mock the subprocess.run to simulate cloning
    with patch("subprocess.run") as mock_run:
        clone_dns_repos(dummy_git_server, dummy_repos, key)

        # Check if subprocess.run was called with the correct arguments
        expected_calls = [call(["git", "clone", f"git@{dummy_git_server}:{repo}", f"{dns_zones_folder}/{repo}"]) for repo in dummy_repos]
        actual_calls = [call(*args) for args, _ in mock_run.call_args_list]
        assert actual_calls == expected_calls


def test_get_zone_file_paths():
    """Test getting zone file paths"""

    with patch("sner.plugin.auror_hostnames.core.Path", return_value=Path(f"{test_files_path}/{dns_zones_folder}")):
        result = get_zone_file_paths()

    expected_result = {
        f"{test_files_path}/{dns_zones_folder}/dummy_repo1/zones/example.com.zone",
        f"{test_files_path}/{dns_zones_folder}/dummy_repo2/zones/1.168.192.in-addr.arpa.zone",
        f"{test_files_path}/{dns_zones_folder}/dummy_repo3/zones/8.b.d.0.1.0.0.2.ip6.arpa.zone",
    }
    assert result == expected_result


def test_process_cnames():
    """Test processing CNAMEs"""
    cnames = {"alias1": "cname1", "alias2": "cname2"}
    cnames_loop = {"alias1": "alias2", "alias2": "alias3", "alias3": "alias1"}
    a_aaaa = {"cname1": ["1.1.1.1"]}
    ip_hostnames = {"1.1.1.1": {"cname1"}}

    with patch("sner.plugin.auror_hostnames.core.resolve_hostname") as mock_resolve_hostname:
        mock_resolve_hostname.side_effect = lambda hostname: {
            "cname1": ["1.1.1.1"],
            "cname2": ["2.2.2.2"],
            "alias1": ["1.1.1.1"],
            "alias2": ["2.2.2.2"],
        }.get(hostname, [])

        result = process_cnames(cnames, a_aaaa, ip_hostnames)
    expected_result = {
        "1.1.1.1": {"alias1", "cname1"},
        "2.2.2.2": {"alias2", "cname2"},
    }
    assert result == expected_result
    mock_resolve_hostname.assert_any_call("cname2")
    mock_resolve_hostname.assert_any_call("alias2")
    with pytest.raises(ValueError, match="CNAME chain loop detected"):
        process_cnames(cnames_loop, a_aaaa, ip_hostnames)


def test_resolve_hostname():
    """Test resolving hostname"""
    hostname = "example.com"
    expected_ips = ["93.184.216.34"]

    with patch("sner.plugin.auror_hostnames.core.getaddrinfo", return_value=[(2, 1, 6, "", ("93.184.216.34", 0))]):
        result = resolve_hostname(hostname)
        assert result == expected_ips

    with patch("sner.plugin.auror_hostnames.core.getaddrinfo", side_effect=OSError):
        result = resolve_hostname("invalid-hostname")
        assert result == []


def test_process_ptrs():
    """Test processing PTRs"""
    ptrs = {
        "1.1.1.1.in-addr.arpa": "hostname1.",
        "2.2.2.2.in-addr.arpa": "hostname2.",
        "3.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.1.ip6.arpa": "hostname3.",
        "4.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.2.ip6.arpa": "hostname4.",
    }
    ip_hostnames = {}

    result = process_ptrs(ptrs, ip_hostnames)

    assert result == {
        "1.1.1.1": {"hostname1"},
        "2.2.2.2": {"hostname2"},
        "10::3": {"hostname3"},
        "20::4": {"hostname4"},
    }

    # Test handling of dns.zone.UnknownOrigin exception
    with patch("dns.zone.from_file", side_effect=dns.zone.UnknownOrigin):
        result = get_records(zone_file_path1)
        assert result == [{}, {}, {}, {}]

    # Test handling of generic exceptions
    with patch("dns.zone.from_file", side_effect=Exception("Generic error")):
        result = get_records(zone_file_path1)
        assert result == [{}, {}, {}, {}]


def test_check_if_hostname():
    """Test checking if hostname is valid"""
    assert check_if_hostname("host-name.com") is True
    assert check_if_hostname("host-name") is True
    assert check_if_hostname("invalid@hostname.com") is False
    assert check_if_hostname("invalid/hostname.com") is False
    assert check_if_hostname("invalid*hostname.com") is False
    assert check_if_hostname("invalid_hostname.com") is False


def test_create_fqdn():
    """Test creating FQDN from record"""
    assert create_fqdn("record", "example.com") == "record.example.com"
    assert create_fqdn("record.example.com.", "example.com") == "record.example.com"


def test_check_git_key_path():
    """Test checking git key path"""
    with patch("os.path.exists", return_value=True):
        assert check_git_key_path("dummy_path") is True

    with patch("os.path.exists", return_value=False):
        assert check_git_key_path("dummy_path") is False


def test_get_records():
    """Test getting records from zone file"""

    result1 = get_records(zone_file_path1)
    result2 = get_records(zone_file_path2)

    expected_result1 = [
        {"alias.example.com": "www.example.com"},
        {
            "ns1.example.com": {"2001:db8::1", "192.168.1.1"},
            "ns2.example.com": {"192.168.1.2", "2001:db8::2"},
            "www.example.com": {"2001:db8::3", "192.168.1.3"},
        },
        {},
        {
            "192.168.1.1": {"ns1.example.com"},
            "192.168.1.2": {"ns2.example.com"},
            "192.168.1.3": {"www.example.com"},
            "2001:db8::1": {"ns1.example.com"},
            "2001:db8::2": {"ns2.example.com"},
            "2001:db8::3": {"www.example.com"},
        },
    ]

    expected_result2 = [
        {},
        {},
        {
            "1.1.168.192.in-addr.arpa": "ns1.example.com.",
            "2.1.168.192.in-addr.arpa": "ns2.example.com.",
            "3.1.168.192.in-addr.arpa": "www.example.com.",
        },
        {},
    ]

    assert result1 == expected_result1
    assert result2 == expected_result2

# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auror_hostnames plugin core tests
"""

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import dns.zone
import pytest

from sner.agreegate import Group
from sner.plugin.auror_hostnames import core as core_module
from sner.plugin.auror_hostnames.agent import Config as AgentConfig
from sner.plugin.auror_hostnames.core import (
    build_ip_hostnames,
    check_if_hostname,
    collect_agreegate_dns_sources,
    create_fqdn,
    get_records_from_file,
    get_records_from_zone,
    process_cnames,
    process_ptrs,
    resolve_hostname,
    run,
)

test_files_dir = "tests/server/data/auror_hostnames"
test_repo1_dir = f"{test_files_dir}/dns-zones/dummy_repo1"
test_repo1_zonefile = f"{test_repo1_dir}/zones/example.test.zone"
test_repo2_dir = f"{test_files_dir}/dns-zones/dummy_repo2"
test_repo2_zonefile = f"{test_repo2_dir}/zones/1.168.127.in-addr.arpa.zone"

GIT_ZONE_TEXT = """
$ORIGIN git1.example.test.
$TTL 300
@ IN SOA ns1.git1.example.test. admin.git1.example.test. 1 3600 900 604800 300
@ IN NS ns1.git1.example.test.
www IN A 127.0.2.11
"""

AXFR_ZONE_TEXT = """
$ORIGIN axfr.example.test.
@ 300 IN SOA ns1.axfr.example.test. admin.axfr.example.test. 1 3600 900 604800 300
@ 300 IN NS ns1.axfr.example.test.
www 300 IN A 127.0.2.31
alias 300 IN CNAME www.axfr.example.test.
"""

HTTPS_ZONE_TEXT = """
$ORIGIN https.example.test.
$TTL 300
@ IN SOA ns1.https.example.test. admin.https.example.test. 1 3600 900 604800 300
@ IN NS ns1.https.example.test.
www IN A 127.0.2.21
"""


def test_resolve_hostname():
    """Test resolving hostname"""

    mock_getaddrinfo = MagicMock(return_value=[(2, 1, 6, "", ("127.0.0.5", 0))])
    with patch.object(core_module, "getaddrinfo", mock_getaddrinfo):
        assert resolve_hostname("example.test") == ["127.0.0.5"]

    mock_getaddrinfo = MagicMock(side_effect=OSError)
    with patch.object(core_module, "getaddrinfo", mock_getaddrinfo):
        assert resolve_hostname("invalid-hostname") == []


def test_process_cnames():
    """Test processing CNAMEs"""

    cnames = {"alias1": "cname1", "alias2": "cname2"}
    cnames_loop = {"alias1": "alias2", "alias2": "alias3", "alias3": "alias1"}
    a_aaaa = {"cname1": ["1.1.1.1"]}
    ip_hostnames = {"1.1.1.1": {"cname1"}}

    def _mocked_getaddrinfo(hostname, port):
        """mock getaddrinfo"""
        addresses = {"cname2": "2.2.2.2", "alias2": "2.2.2.2"}
        return [(2, 1, 6, "", (addresses[hostname], 0))]

    mock_getaddrinfo = MagicMock(side_effect=_mocked_getaddrinfo)
    expected = {
        "1.1.1.1": {"alias1", "cname1"},
        "2.2.2.2": {"alias2", "cname2"},
    }
    with patch.object(core_module, "getaddrinfo", mock_getaddrinfo):
        result = process_cnames(cnames, a_aaaa, ip_hostnames)
        assert result == expected

    with pytest.raises(ValueError, match="CNAME chain loop detected"):
        process_cnames(cnames_loop, a_aaaa, ip_hostnames)


def test_process_ptrs():
    """Test processing PTRs"""

    ptrs = {
        "1.1.1.1.in-addr.arpa": "hostname1.",
        "2.2.2.2.in-addr.arpa": "hostname2.",
        "3.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.1.ip6.arpa": "hostname3.",
        "4.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.2.ip6.arpa": "hostname4.",
    }
    expected = {
        "1.1.1.1": {"hostname1"},
        "2.2.2.2": {"hostname2"},
        "10::3": {"hostname3"},
        "20::4": {"hostname4"},
    }

    result = process_ptrs(ptrs, {})
    assert result == expected


def test_check_if_hostname():
    """Test checking if hostname is valid"""

    assert check_if_hostname("host-name.test") is True
    assert check_if_hostname("host-name") is True
    assert check_if_hostname("invalid@hostname.test") is False


def test_create_fqdn():
    """Test creating FQDN from record"""

    assert create_fqdn("record", "example.test") == "record.example.test"
    assert create_fqdn("record.example.test.", "example.test") == "record.example.test"


def test_get_records_from_file():
    """Test getting records from zone files, with and without $ORIGIN directive"""

    expected_result1 = [
        {"alias.example.test": "www.example.test"},
        {
            "ns1.example.test": {"2001:db8::1", "127.168.1.1"},
            "ns2.example.test": {"127.168.1.2", "2001:db8::2"},
            "www.example.test": {"2001:db8::3", "127.168.1.3"},
        },
        {},
        {
            "127.168.1.1": {"ns1.example.test"},
            "127.168.1.2": {"ns2.example.test"},
            "127.168.1.3": {"www.example.test"},
            "2001:db8::1": {"ns1.example.test"},
            "2001:db8::2": {"ns2.example.test"},
            "2001:db8::3": {"www.example.test"},
        },
    ]
    result1 = get_records_from_file(test_repo1_zonefile)
    assert result1 == expected_result1

    expected_result2 = [
        {},
        {},
        {
            "1.1.168.127.in-addr.arpa": "ns1.example.test.",
            "2.1.168.127.in-addr.arpa": "ns2.example.test.",
            "3.1.168.127.in-addr.arpa": "www.example.test.",
        },
        {},
    ]
    result2 = get_records_from_file(test_repo2_zonefile)
    assert result2 == expected_result2


def test_get_records_from_file_invalid_files(tmpworkdir):  # pylint: disable=unused-argument
    """get_records_from_file returns empty records for unparseable zone files"""

    # no $ORIGIN directive and the fallback parse from filename-derived origin fails (no SOA)
    Path("noorigin.zone").write_text("www 300 IN A 127.0.2.1\n", encoding="utf-8")
    assert get_records_from_file("noorigin.zone") == [{}, {}, {}, {}]

    # $ORIGIN present but content malformed
    Path("garbage.zone").write_text("$ORIGIN garbage.example.test.\ngarbage garbage garbage\n", encoding="utf-8")
    assert get_records_from_file("garbage.zone") == [{}, {}, {}, {}]


def test_get_records_from_zone():
    """get_records_from_zone parses a dns.zone.Zone object as produced by AXFR"""

    zone = dns.zone.from_text(AXFR_ZONE_TEXT, origin="axfr.example.test.", relativize=False, check_origin=False)

    cnames, a_aaaa, ptrs, ip_hostnames = get_records_from_zone(zone)

    assert cnames == {"alias.axfr.example.test": "www.axfr.example.test"}
    assert a_aaaa == {"www.axfr.example.test": {"127.0.2.31"}}
    assert ptrs == {}
    assert ip_hostnames == {"127.0.2.31": {"www.axfr.example.test"}}


def test_build_ip_hostnames():
    """build_ip_hostnames merges records from zone files (git/https) and AXFR zones into one mapping"""

    axfr_zone = dns.zone.from_text(
        "www.example.test. 300 IN A 127.168.1.3\naxfr.example.test. 300 IN A 127.0.2.30\n",
        origin="example.test.",
        relativize=False,
        check_origin=False,
    )

    result = build_ip_hostnames([test_repo1_zonefile, test_repo2_zonefile], [axfr_zone])

    # forward records from example.test.zone (file source)
    assert "www.example.test" in result["127.168.1.3"]
    # PTR records from 1.168.127.in-addr.arpa.zone (file source)
    assert "ns1.example.test" in result["127.168.1.1"]
    # A record from the AXFR zone
    assert result["127.0.2.30"] == ["axfr.example.test"]
    # hostname sets for the same IP are unioned across sources, not overwritten
    assert set(result["127.168.1.3"]) == {"www.example.test", "alias.example.test"}


def test_collect_agreegate_dns_sources():
    """collect_dns_sources flattens group sources and splits them into AXFR and HTTPS buckets"""

    expected_axfr_source = {"type": "AXFR", "dns_server": "ns.example.test"}
    expected_http_source = {"type": "HTTPS", "http_url": "https://zones.example.test/archive.zip"}
    groups = [Group(id=1, name="group1", allowed_networks=[]), Group(id=2, name="group2", allowed_networks=[])]
    dns_sources = {1: [expected_axfr_source], 2: [expected_http_source]}

    mock_manager = MagicMock()
    mock_manager.get_groups.return_value = groups
    mock_manager.get_group_dns_sources.side_effect = dns_sources.__getitem__
    mock_factory = MagicMock()
    mock_factory.from_env.return_value = mock_manager

    with patch.object(core_module, "AgreegateManager", mock_factory):
        dns_sources = collect_agreegate_dns_sources()

    assert dns_sources == [expected_axfr_source, expected_http_source]


def test_run(tmpworkdir):  # pylint: disable=unused-argument
    """test core.run"""

    def create_disk_zone(repo_name, origin, data):
        zone_file = Path(core_module.WORKDIR) / repo_name / "zones" / origin
        zone_file.parent.mkdir(parents=True)
        zone_file.write_text(data, encoding="utf-8")
        return [zone_file]

    def mock_collect():
        return [{"type": "AXFR", "dummy": 1}, {"type": "HTTPS", "dummy": 1}]

    def mock_git_run(_):
        return create_disk_zone("git1", "git1.example.test", GIT_ZONE_TEXT)

    def mock_axfr_run(_):
        return [dns.zone.from_text(AXFR_ZONE_TEXT)]

    def mock_http_run(_):
        return create_disk_zone("http1", "https.example.test", HTTPS_ZONE_TEXT)

    with (
        patch("sner.plugin.auror_hostnames.core.collect_agreegate_dns_sources", MagicMock(side_effect=mock_collect)),
        patch("sner.plugin.auror_hostnames.git.run", MagicMock(side_effect=mock_git_run)),
        patch("sner.plugin.auror_hostnames.axfr.run", MagicMock(side_effect=mock_axfr_run)),
        patch("sner.plugin.auror_hostnames.http.run", MagicMock(side_effect=mock_http_run)),
    ):
        test_assignment = AgentConfig()
        result = run(test_assignment)
        assert result == 0

    output = json.loads(Path("output.json").read_text(encoding="utf-8"))
    assert output["127.0.2.11"] == ["www.git1.example.test"]
    assert output["127.0.2.21"] == ["www.https.example.test"]
    assert sorted(output["127.0.2.31"]) == ["alias.axfr.example.test", "www.axfr.example.test"]
    assert not Path(core_module.WORKDIR).exists()

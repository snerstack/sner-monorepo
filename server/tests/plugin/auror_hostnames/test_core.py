# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auror_hostnames plugin core tests
"""

import io
import json
import zipfile
from pathlib import Path

import dns.zone
import pytest

from sner.plugin.auror_hostnames import core as core_module
from sner.plugin.auror_hostnames.core import (
    build_ip_hostnames,
    check_if_hostname,
    collect_dns_sources,
    create_fqdn,
    get_records_from_file,
    get_records_from_zone,
    process_cnames,
    process_ptrs,
    resolve_hostname,
    run,
    write_output,
)
from sner.plugin.auror_hostnames.manager import AgreegateManager

test_files_path = "tests/server/data/auror_hostnames-dns_zones"
dns_zones_folder = "dns-zones"
zone_file_path1 = f"{test_files_path}/{dns_zones_folder}/dummy_repo1/zones/example.com.zone"
zone_file_path2 = f"{test_files_path}/{dns_zones_folder}/dummy_repo2/zones/1.168.192.in-addr.arpa.zone"

AXFR_ZONE_TEXT = """
@ 300 IN SOA ns1.axfr.example.com. admin.axfr.example.com. 1 3600 900 604800 300
@ 300 IN NS ns1.axfr.example.com.
www 300 IN A 192.0.2.31
alias 300 IN CNAME www.axfr.example.com.
"""

HTTPS_ZONE_TEXT = """
$ORIGIN https.example.com.
$TTL 300
@ IN SOA ns1.https.example.com. admin.https.example.com. 1 3600 900 604800 300
@ IN NS ns1.https.example.com.
www IN A 192.0.2.21
"""


def test_process_cnames(monkeypatch):
    """Test processing CNAMEs"""

    cnames = {"alias1": "cname1", "alias2": "cname2"}
    cnames_loop = {"alias1": "alias2", "alias2": "alias3", "alias3": "alias1"}
    a_aaaa = {"cname1": ["1.1.1.1"]}
    ip_hostnames = {"1.1.1.1": {"cname1"}}

    addresses = {"cname2": "2.2.2.2", "alias2": "2.2.2.2"}
    monkeypatch.setattr(core_module, "getaddrinfo", lambda hostname, port: [(2, 1, 6, "", (addresses[hostname], 0))])

    result = process_cnames(cnames, a_aaaa, ip_hostnames)

    assert result == {
        "1.1.1.1": {"alias1", "cname1"},
        "2.2.2.2": {"alias2", "cname2"},
    }

    with pytest.raises(ValueError, match="CNAME chain loop detected"):
        process_cnames(cnames_loop, a_aaaa, ip_hostnames)


def test_resolve_hostname(monkeypatch):
    """Test resolving hostname"""

    monkeypatch.setattr(core_module, "getaddrinfo", lambda hostname, port: [(2, 1, 6, "", ("93.184.216.34", 0))])
    assert resolve_hostname("example.com") == ["93.184.216.34"]

    def getaddrinfo_error(hostname, port):
        raise OSError

    monkeypatch.setattr(core_module, "getaddrinfo", getaddrinfo_error)
    assert resolve_hostname("invalid-hostname") == []


def test_process_ptrs():
    """Test processing PTRs"""

    ptrs = {
        "1.1.1.1.in-addr.arpa": "hostname1.",
        "2.2.2.2.in-addr.arpa": "hostname2.",
        "3.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.1.ip6.arpa": "hostname3.",
        "4.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.2.ip6.arpa": "hostname4.",
    }

    result = process_ptrs(ptrs, {})

    assert result == {
        "1.1.1.1": {"hostname1"},
        "2.2.2.2": {"hostname2"},
        "10::3": {"hostname3"},
        "20::4": {"hostname4"},
    }


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


def test_get_records_from_file():
    """Test getting records from zone files, with and without $ORIGIN directive"""

    result1 = get_records_from_file(zone_file_path1)
    result2 = get_records_from_file(zone_file_path2)

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


def test_get_records_from_file_invalid_files(tmpworkdir):  # pylint: disable=unused-argument
    """get_records_from_file returns empty records for unparseable zone files"""

    # no $ORIGIN directive and the fallback parse from filename-derived origin fails (no SOA)
    Path("noorigin.zone").write_text("www 300 IN A 192.0.2.1\n", encoding="utf-8")
    assert get_records_from_file("noorigin.zone") == [{}, {}, {}, {}]

    # $ORIGIN present but content malformed
    Path("garbage.zone").write_text("$ORIGIN garbage.example.com.\ngarbage garbage garbage\n", encoding="utf-8")
    assert get_records_from_file("garbage.zone") == [{}, {}, {}, {}]


def test_get_records_from_zone():
    """get_records_from_zone parses a dns.zone.Zone object as produced by AXFR"""

    zone = dns.zone.from_text(AXFR_ZONE_TEXT, origin="axfr.example.com.", relativize=False, check_origin=False)

    cnames, a_aaaa, ptrs, ip_hostnames = get_records_from_zone(zone)

    assert cnames == {"alias.axfr.example.com": "www.axfr.example.com"}
    assert a_aaaa == {"www.axfr.example.com": {"192.0.2.31"}}
    assert ptrs == {}
    assert ip_hostnames == {"192.0.2.31": {"www.axfr.example.com"}}


def test_build_ip_hostnames():
    """build_ip_hostnames merges records from zone files (git/https) and AXFR zones into one mapping"""

    axfr_zone = dns.zone.from_text(
        "www.example.com. 300 IN A 192.168.1.3\naxfr.example.com. 300 IN A 192.0.2.30\n",
        origin="example.com.",
        relativize=False,
        check_origin=False,
    )

    result = build_ip_hostnames([zone_file_path1, zone_file_path2], [axfr_zone])

    # forward records from example.com.zone (file source)
    assert "www.example.com" in result["192.168.1.3"]
    # PTR records from 1.168.192.in-addr.arpa.zone (file source)
    assert "ns1.example.com" in result["192.168.1.1"]
    # A record from the AXFR zone
    assert result["192.0.2.30"] == ["axfr.example.com"]
    # hostname sets for the same IP are unioned across sources, not overwritten
    assert set(result["192.168.1.3"]) == {"www.example.com", "alias.example.com"}


def test_collect_dns_sources(httpserver):
    """collect_dns_sources flattens group sources and splits them into AXFR and HTTPS buckets"""

    axfr_source = {"type": "AXFR", "dns_server": "ns.example.org"}
    http_source = {"type": "HTTPS", "http_url": "https://zones.example.com/archive.zip"}
    other_source = {"type": "OTHER"}

    httpserver.expect_request("/api/v1/groups").respond_with_json(
        [{"id": 1, "name": "group1", "allowed_networks": []}, {"id": 2, "name": "group2", "allowed_networks": []}]
    )
    httpserver.expect_request("/api/v1/group/1/dns_sources").respond_with_json([axfr_source])
    httpserver.expect_request("/api/v1/group/2/dns_sources").respond_with_json([http_source, other_source])

    agreegate = AgreegateManager(httpserver.url_for(""), "dummy")
    groups = agreegate.get_all_groups(only_with_dns_source=True)

    dns_sources, axfr_sources, http_sources = collect_dns_sources(agreegate, groups)

    assert dns_sources == [axfr_source, http_source, other_source]
    assert axfr_sources == [axfr_source]
    assert http_sources == [http_source]


def test_write_output(tmpworkdir):  # pylint: disable=unused-argument
    """write_output writes output json and removes the dns-zones scratch directory"""

    dns_zones_dir = Path("dns-zones")
    dns_zones_dir.mkdir()
    (dns_zones_dir / "old_file.txt").write_text("old content", encoding="utf-8")

    write_output({"1.2.3.4": ["example.com"]})

    assert not dns_zones_dir.exists()
    assert json.loads(Path("output.json").read_text(encoding="utf-8")) == {"1.2.3.4": ["example.com"]}


def test_write_output_no_dns_zones_dir(tmpworkdir):  # pylint: disable=unused-argument
    """write_output works when the dns-zones directory does not exist"""

    write_output({"5.6.7.8": ["test.example.com"]})

    assert json.loads(Path("output.json").read_text(encoding="utf-8")) == {"5.6.7.8": ["test.example.com"]}


def test_run(gitolite_server, httpserver, axfr_server, monkeypatch):
    """core.run end-to-end; combines zones from git, https and axfr sources served by local servers"""

    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w") as zipf:
        zipf.writestr("https.example.com.zone", HTTPS_ZONE_TEXT)

    httpserver.expect_request("/api/v1/groups").respond_with_json([{"id": 1, "name": "group1", "allowed_networks": []}])
    httpserver.expect_request("/api/v1/group/1/dns_sources").respond_with_json(
        [
            {"type": "HTTPS", "http_url": httpserver.url_for("/archive.zip")},
            {"type": "AXFR", "dns_server": "127.0.0.1", "port": axfr_server.port, "list_of_zones": ["axfr.example.com"]},
        ]
    )
    httpserver.expect_request("/archive.zip").respond_with_data(zip_buf.getvalue(), content_type="application/zip")
    axfr_server.add_zone(AXFR_ZONE_TEXT, "axfr.example.com.")
    monkeypatch.setenv("SNER_AGREEGATE_URL", httpserver.url_for(""))
    monkeypatch.setenv("SNER_AGREEGATE_APIKEY", "dummy")

    result = run({"config": gitolite_server})

    assert result == 0
    output = json.loads(Path("output.json").read_text(encoding="utf-8"))
    assert output["192.0.2.11"] == ["www.git1.example.com"]
    assert output["192.0.2.12"] == ["www.git2.example.com"]
    assert output["192.0.2.21"] == ["www.https.example.com"]
    assert sorted(output["192.0.2.31"]) == ["alias.axfr.example.com", "www.axfr.example.com"]
    assert not Path("dns-zones").exists()

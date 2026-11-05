# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auror_sslyze output parser tests
"""

import copy
import json
from pathlib import Path

from sner.plugin.auror_sslyze.parser import ParserModule
from sner.server.parser import ParsedItemsDb


def _attrs(collection, attr_name):
    return [getattr(item, attr_name) for item in collection]


def test_parse_path():
    """Test parse_path with both JSON and ZIP input."""

    expected_hosts = ["127.0.0.1"]
    expected_services = [44300]
    expected_notes = ["auror.sslyze.implicit"]

    for path in ("tests/server/data/parser-auror_sslyze-output.json", "tests/server/data/parser-auror_sslyze-job.zip"):
        pidb = ParserModule.parse_path(path)
        assert _attrs(pidb.hosts, "address") == expected_hosts
        assert _attrs(pidb.services, "port") == expected_services
        assert _attrs(pidb.notes, "xtype") == expected_notes
        assert _attrs(pidb.notes, "via_target") == ["127.0.0.1"]

        # the note carries the raw per-server sslyze result verbatim
        note = json.loads(list(pidb.notes)[0].data)
        assert note["connectivity_status"] == "COMPLETED"
        assert note["server_location"]["ip_address"] == "127.0.0.1"


def test_parse_data_empty():
    """Test _parse_data with a document without any server scan results."""

    pidb = ParserModule._parse_data(json.dumps({}), ParsedItemsDb())
    assert not list(pidb.notes)


def test_parse_data_incomplete_scan():
    """Test _parse_data skips servers without completed connectivity or scan result."""

    report = json.dumps(
        {
            "server_scan_results": [
                {"connectivity_status": "ERROR", "scan_result": None, "server_location": {"ip_address": "127.0.0.1"}},
                {"connectivity_status": "COMPLETED", "scan_result": {}, "server_location": {"ip_address": "127.0.0.2"}},
            ]
        }
    )

    pidb = ParserModule._parse_data(report, ParsedItemsDb())
    assert not list(pidb.notes)
    assert not list(pidb.hosts)


def test_parse_data_tls_method():
    """Test _parse_data stores implicit and explicit (starttls) results of same service-hostname as separate notes."""

    report = json.loads(Path("tests/server/data/parser-auror_sslyze-output.json").read_text(encoding="utf-8"))
    server_explicit = copy.deepcopy(report["server_scan_results"][0])
    server_explicit["network_configuration"]["tls_opportunistic_encryption"] = "SMTP"
    report["server_scan_results"].append(server_explicit)

    pidb = ParserModule._parse_data(json.dumps(report), ParsedItemsDb())
    assert sorted(_attrs(pidb.notes, "xtype")) == ["auror.sslyze.explicit", "auror.sslyze.implicit"]

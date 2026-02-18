# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auror_testssl output parser tests
"""

import json
import pytest
from pathlib import Path
from unittest.mock import patch
from sner.plugin.auror_testssl.parser import ParserModule
from sner.server.parser import ParsedItemsDb


# @pytest.fixture
# def pidb():
#     return ParsedItemsDb()


def test_parse_path():
    """Test parse_path with both JSON and ZIP input."""

    def attrs(collection, attr_name):
        return [getattr(item, attr_name) for item in collection]

    expected_hosts = ["127.0.0.1"]
    expected_services = [8443]
    expected_notes = ["auror.testssl.implicit"]

    # Test JSON file
    pidb_json = ParserModule.parse_path("tests/server/data/parser-auror_testssl-output.json")
    assert attrs(pidb_json.hosts, "address") == expected_hosts
    assert attrs(pidb_json.services, "port") == expected_services
    assert attrs(pidb_json.notes, "xtype") == expected_notes

    # Test ZIP file
    pidb_zip = ParserModule.parse_path("tests/server/data/parser-auror_testssl-job.zip")
    assert attrs(pidb_zip.hosts, "address") == expected_hosts
    assert attrs(pidb_zip.services, "port") == expected_services
    assert attrs(pidb_zip.notes, "xtype") == expected_notes


def test_process_cert_openssl():
    """Check process_cert_openssl function."""

    cert_data = Path("tests/server/data/parser-auror_testssl-cert.pem").read_text(encoding="utf-8")
    cert_decoded = ParserModule._process_cert(cert_data)
    assert "3a:31:01:18:ae:8e:be:c6:24:2d:23:67:d1:34:b1:e8:dc:a8:49:e4" in cert_decoded


def test_process_testssl_result():
    """Test _process_testssl_result with minimal valid input."""

    test_input_path = "tests/server/data/parser-auror_testssl-output.json"
    testssl_output_data = json.loads(Path(test_input_path).read_text())
    result = ParserModule._process_testssl_result(testssl_output_data)
    assert result["invocation"] == (
        "testssl.sh --quiet --connect-timeout 5 --openssl-timeout 5 --phone-out --hints "
        "--overwrite --user-agent 'Mozilla/5.0 (compatible; sner/1.2.1; +https://sner-hub.flab.cesnet.cz)' "
        "--full --jsonfile-pretty output-0.json --ip 127.0.0.1 testssl-target.localdomain:8443"
    )
    assert result["tls_method"] == "SSL/TLS"
    assert result["ip"] == "127.0.0.1"
    assert result["targetHost"] == "testssl-target.localdomain"
    assert result["port"] == "8443"
    assert result["result_desc"] == "testssl.sh success"
    assert result["SSLv2"] == "not offered"


@pytest.mark.parametrize(
    "scan_result,expected_desc",
    [
        ([{"finding": "Some finding"}], "Some finding"),
        ([{}], "testssl.sh success"),
        ([{"finding": "First finding"}, {"finding": "Second finding"}], "First finding"),
    ],
)
def test_process_testssl_result_variants(scan_result, expected_desc):
    """Test _process_testssl_result with various scan_result inputs."""

    testssl_result = {"scanResult": scan_result, "Invocation": ""}
    result = ParserModule._process_testssl_result(testssl_result)
    assert result["result_desc"] == expected_desc


def test_process_testssl_result_attribute_error():
    """Test _process_testssl_result with attribute error."""

    malformed_input = object()
    with patch("sner.plugin.auror_testssl.parser.logger.error") as mock_logger_error:
        ParserModule._process_testssl_result(malformed_input)
        mock_logger_error.assert_called()
        assert "Results are not in expected format" in mock_logger_error.call_args[0][0]


def test_process_testssl_result_key_error():
    """Test _process_testssl_result with key error."""

    bad_input = {"startTime": 123, "scanTime": 456, "Invocation": "", "scanResult": [{}]}
    with patch("sner.plugin.auror_testssl.parser.logger") as mock_logger:
        ParserModule._process_testssl_result(bad_input)
        mock_logger.error.assert_called()
        assert "Results are missing some keys" in mock_logger.error.call_args[0][0]


def test_parse_data_multiple_scan_results():
    """Test _parse_data with multiple scan results."""

    pidb = object()
    json_data = json.dumps({"scanTime": 123, "Invocation": "", "scanResult": [{"ip": "1.2.3.4"}, {"ip": "5.6.7.8"}]})
    with pytest.raises(ValueError, match="Multiple scan results found"):
        ParserModule._parse_data(json_data, pidb)


def test_parse_data_missing_ip():
    """Test _parse_data with missing ip field."""

    pidb = object()
    json_data = json.dumps({"scanTime": 123, "Invocation": "", "scanResult": [{}]})
    with patch("sner.plugin.auror_testssl.parser.logger.warning") as mock_logger_warning:
        result = ParserModule._parse_data(json_data, pidb)
        assert result is pidb
        mock_logger_warning.assert_called()
        assert "missing ip field" in mock_logger_warning.call_args[0][0]


def test__parse_data_scanTime_not_int():
    """Test _parse_data with scanTime not being an integer."""

    testssl_json = json.dumps(
        {
            "scanTime": "not_an_int",
            "Invocation": "--starttls",
            "scanResult": [{"ip": "127.0.0.1", "targetHost": "localhost", "port": 443}],
        }
    )

    pidb = ParsedItemsDb()
    result_pidb = ParserModule._parse_data(testssl_json, pidb)
    assert result_pidb is pidb
    assert list(result_pidb.notes) == []
    assert list(result_pidb.hosts) == []
    assert list(result_pidb.services) == []

# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auror_sslyze plugin agent tests
"""

import json
import ssl
from unittest.mock import patch
from uuid import uuid4

import pytest
from pytest_httpserver.httpserver import HTTPServer
from werkzeug.serving import make_ssl_devcert

from sner.agent.core import main as agent_main
from sner.lib import file_from_zip
from sner.plugin.auror_sslyze.agent import AgentModule


@pytest.fixture
def https_server(tmpworkdir):  # pylint: disable=unused-argument
    """HTTPS server fixture dubbed from pytest-httpserver.

    Args:
        tmpworkdir (Path): The temporary working directory fixture.
    """

    cert, key = make_ssl_devcert("testcert")
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(cert, key)

    server = HTTPServer(ssl_context=context)
    server.start()
    yield server
    server.clear()
    if server.is_running():
        server.stop()


def test_basic(tmpworkdir, https_server):  # pylint: disable=unused-argument
    """auror_sslyze module execution test.

    Args:
        tmpworkdir (Path): The temporary working directory fixture.
        https_server (HTTPServer): The HTTPS server fixture.
    """

    https_server.expect_request("/").respond_with_data("Hello world!", content_type="text/plain")

    port = https_server.port
    # limit scan commands for scanning speed; cover plain, SNI and encryption-aware (implicit) targets
    test_a = {
        "id": str(uuid4()),
        "config": {"module": "auror_sslyze", "args": ["--tlsv1_2", "--tlsv1_3"]},
        "targets": [
            f"svc,127.0.0.1,proto=tcp,port={port}",
            f"named,127.0.0.1,proto=tcp,port={port},hostname=localhost",
            f"auror,127.0.0.1,port={port},hostname=localhost,enc=I",
        ],
    }

    result = agent_main(["--assignment", json.dumps(test_a), "--debug"])
    assert result == 0

    expected_hostnames = ["127.0.0.1", "localhost", "localhost"]
    for idx, expected_hostname in enumerate(expected_hostnames):
        results = json.loads(file_from_zip(f"{test_a['id']}.zip", f"output-{idx}.json"))
        server_result = results["server_scan_results"][0]
        assert server_result["connectivity_status"] == "COMPLETED"
        assert server_result["server_location"]["hostname"] == expected_hostname
        assert server_result["server_location"]["ip_address"] == "127.0.0.1"
        assert server_result["server_location"]["port"] == port
        assert server_result["network_configuration"]["tls_server_name_indication"] == expected_hostname


def test_command_line(tmpworkdir):  # pylint: disable=unused-argument
    """check generated command lines without live scan"""

    test_a = {
        "id": str(uuid4()),
        "config": {"module": "auror_sslyze", "args": ["--tlsv1_2"]},
        "targets": [
            "svc,::1,proto=tcp,port=443",
            "auror,::1,port=443,hostname=www.example.com,enc=I",
            "auror,127.0.0.1,port=25,hostname=mail.example.com,enc=E",
            "auror,127.0.0.1,port=23,hostname=mail.example.com,enc=E",
            "svc,127.0.0.1,proto=udp,port=443",
            "host,127.0.0.1",
        ],
    }
    agent = AgentModule()
    captured = []

    with patch.object(agent, "_execute", side_effect=lambda cmd, output_file: captured.append(cmd) or 0):
        assert agent.run(test_a) == 0

    assert len(captured) == 3
    assert captured[0][-1] == "[::1]:443"
    assert captured[1][-1] == "www.example.com:443{::1}"
    assert "--starttls" not in captured[1]
    assert captured[2][-1] == "mail.example.com:25{127.0.0.1}"
    assert captured[2][captured[2].index("--starttls") + 1] == "auto"

# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auror_testssl plugin agent tests
"""

import json
import ssl
from uuid import uuid4

import pytest
from pytest_httpserver.httpserver import HTTPServer
from werkzeug.serving import make_ssl_devcert

from sner.agent.core import main as agent_main
from sner.lib import file_from_zip

from sner.plugin.auror_testssl.agent import AgentModule


@pytest.fixture
def https_server(tmpworkdir):
    """HTTPS server fixture dubbed from pytest-httpserver.

    Args:
        tmpworkdir (Path): The temporary working directory.
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
    """testssl module execution test.

    Args:
        tmpworkdir (Path): The temporary working directory.
        https_server (HTTPServer): The HTTPS server fixture.
    """

    https_server.expect_request("/").respond_with_data("Hello world!", content_type="text/plain")

    port = https_server.port
    test_a = {
        "id": str(uuid4()),
        "config": {"module": "auror_testssl"},
        "targets": [f"localhost;127.0.0.1;{port};I", f"localhost;::1;{port};I"],
    }

    result = agent_main(["--assignment", json.dumps(test_a), "--debug"])
    assert result == 0

    results = json.loads(file_from_zip(f"{test_a['id']}.zip", "output-0.json"))
    assert results
    assert type(results["scanTime"]) is int


def test_is_ipv6():
    """Test the is_ipv6 method of the AgentModule."""
    agent = AgentModule()
    assert agent.is_ipv6("::1") is True
    assert agent.is_ipv6("127.0.0.1") is False
    assert agent.is_ipv6("invalid") is False


def test_enumerate_auror_testssl_targets():
    """Test the enumerate_auror_testssl_targets method of the AgentModule."""
    agent = AgentModule()
    targets = ["domain.test;127.0.0.1;443;E", "another.test;::1;8443;I"]
    results = list(agent.enumerate_auror_testssl_targets(targets))
    assert results[0] == (0, "domain.test", "127.0.0.1", 443, "E")
    assert results[1] == (1, "another.test", "::1", 8443, "I")


def test_filter_exit_codes():
    """Test the _filter_exit_codes method of the AgentModule."""
    agent = AgentModule()
    assert agent._filter_exit_codes(0) == 0
    assert agent._filter_exit_codes(100) == 0
    assert agent._filter_exit_codes(245) == 0
    assert agent._filter_exit_codes(246) == 0
    assert agent._filter_exit_codes(250) == 250

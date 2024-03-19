# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
ssl_audit plugin agent tests
"""

import json
from uuid import uuid4

import pytest
from pytest_httpserver.httpserver import HTTPServer

from sner.agent.core import main as agent_main
from sner.lib import file_from_zip


@pytest.fixture
def https_server(tmpworkdir):
    server = HTTPServer()
    server.start()
    yield server
    server.clear()
    if server.is_running():
        server.stop()


def test_basic(tmpworkdir, https_server):  # pylint: disable=unused-argument
    """ssh_audit module execution test"""

    test_a = {
        'id': str(uuid4()),
        'config': {'module': 'ssh_audit'},
        'targets': [f'127.0.0.1:{https_server.port}']
    }

    result = agent_main(['--assignment', json.dumps(test_a), '--debug'])
    assert result == 0

    results = file_from_zip(f'{test_a["id"]}.zip', 'output').decode()
    assert "banner" in results
    assert "fingerprints" in results

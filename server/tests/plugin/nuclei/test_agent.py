# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
nuclei plugin agent tests
"""

import json
from unittest.mock import Mock, patch
from uuid import uuid4

import sner.plugin.nuclei.agent
from sner.agent.core import main as agent_main
from sner.lib import file_from_zip


class VulnerableServer:
    """vulnerable test server for nuclei"""

    def __init__(self, server):
        self.server = server
        self.server.expect_request("/download.php").respond_with_handler(self.handler)

    def handler(self, request):
        """handle request"""
        filename = request.args.get("file")

        if not filename:
            return "File not found"

        return "root:x:0:0:root:/root:/bin/bash"


def test_basic(tmpworkdir, httpserver):
    """nuclei module execution test"""

    vuln_server = VulnerableServer(httpserver)

    test_a = {
        "id": str(uuid4()),
        "config": {"module": "nuclei", "args": ["-pt", "http", "-id", "flir-path-traversal"]},
        "targets": [f"svc,127.0.0.1,proto=tcp,port={vuln_server.server.port}"],
    }

    result = agent_main(["--assignment", json.dumps(test_a), "--debug"])
    assert result == 0

    [report] = json.loads(file_from_zip(f"{test_a['id']}.zip", "output.json").decode("utf-8"))
    assert report["template-id"] == "flir-path-traversal"
    assert report["info"]["severity"] == "high"


def test_target_handling(tmpworkdir):
    """mock nuclei agent target hndling"""

    test_a = {
        "id": str(uuid4()),
        "config": {"module": "nuclei", "args": ["-pt", "http", "-id", "flir-path-traversal"]},
        "targets": [
            "svc,127.0.0.1,proto=tcp,port=1",
            "svc,::1,proto=tcp,port=2",
            "named,127.0.0.1,proto=tcp,port=3,hostname=localhost",
            "http://127.0.0.1:4",
        ],
    }

    mock = Mock(return_value=0)
    path_exec = patch.object(sner.plugin.nuclei.agent.AgentModule, "_execute", mock)
    with path_exec:
        result = agent_main(["--assignment", json.dumps(test_a), "--debug"])
        assert result == 0

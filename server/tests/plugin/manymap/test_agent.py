# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
manymap plugin agent tests
"""

import json
from uuid import uuid4

from sner.agent.core import main as agent_main
from sner.lib import file_from_zip
from tests import running_as_root


def test_basic(tmpworkdir):  # pylint: disable=unused-argument
    """manymap module execution test"""

    test_a = {
        "id": str(uuid4()),
        "config": {"module": "manymap", "args": ["-sV"], "delay": 1},
        "targets": ["invalid", "svc,127.0.0.1,proto=tcp,port=1"],
    }

    result = agent_main(["--assignment", json.dumps(test_a), "--debug"])
    assert result == 0

    assert "Host: 127.0.0.1 (localhost)" in file_from_zip(f"{test_a['id']}.zip", "output-1.gnmap").decode("utf-8")


def test_udp(tmpworkdir):  # pylint: disable=unused-argument
    """manymap module execution test

    separate UDP target test which requires root and is allowed to fail in agentic or CI runs
    """

    test_a = {
        "id": str(uuid4()),
        "config": {"module": "manymap", "args": ["-sV"], "delay": 1},
        "targets": ["invalid", "svc,::1,proto=udp,port=2"],
    }

    result = agent_main(["--assignment", json.dumps(test_a), "--debug"])

    # allow to fail for agentic and GitHub actions
    if not running_as_root():
        assert result == 1
        return

    assert result == 0
    assert "Host: ::1 (localhost)" in file_from_zip(f"{test_a['id']}.zip", "output-1.gnmap").decode("utf-8")

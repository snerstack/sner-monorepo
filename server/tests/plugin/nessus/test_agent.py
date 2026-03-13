# This file is part of SNER project governed by MIT license, see the LICENSE.txt file.
"""
nessus plugin agent test
"""

import json
from unittest.mock import MagicMock, patch
from uuid import uuid4

import sner.plugin.nessus.manager
from sner.agent.core import main as agent_main
from sner.lib import file_from_zip


def test_basic(tmpworkdir):  # pylint: disable=unused-argument
    """nessus module execution test"""

    test_a = {"id": str(uuid4()), "config": {"module": "nessus"}, "targets": ["127.0.0.1"]}

    mock = MagicMock()
    mock.scan_create.return_value = 111
    mock.scan_status.side_effect = ["running", "completed"]
    mock.scan_report.return_value = "dummy_report_content"

    patch_manager = patch.object(sner.plugin.nessus.manager.NessusManager, "from_env", return_value=mock)
    patch_poll_time = patch("sner.plugin.nessus.agent.SCAN_POLL_INTERVAL", 0)

    with patch_manager, patch_poll_time:
        result = agent_main(["--assignment", json.dumps(test_a), "--debug"])

    assert result == 0
    assert "dummy_report_content" in file_from_zip(f"{test_a['id']}.zip", "output.nessus").decode("utf-8")

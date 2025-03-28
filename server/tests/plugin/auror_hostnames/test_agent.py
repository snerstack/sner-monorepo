# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auror_hostnames plugin agent tests
"""

import json
from uuid import uuid4
from unittest.mock import patch

from sner.agent.core import main as agent_main
from sner.lib import file_from_zip


@patch("sner.plugin.auror_hostnames.core.run", return_value=0)
def test_basic(tmpworkdir):  # pylint: disable=unused-argument
    """auror_hostnames module execution test"""

    test_a = {
        "id": str(uuid4()),
        "config": {"module": "auror_hostnames", "git_key_path": "~/.ssh/key", "git_server": "git.example.com"},
        "targets": ["target1"],
    }

    result = agent_main(["--assignment", json.dumps(test_a), "--debug"])
    assert result == 0
    assert test_a["targets"][0] in file_from_zip(f'{test_a["id"]}.zip', "assignment.json").decode("utf-8")

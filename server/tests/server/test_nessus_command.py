# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
db commands tests
"""

# from pathlib import Path
from unittest.mock import MagicMock, patch

from flask import current_app
# from sqlalchemy import inspect

from sner.server.nessus_command import command
# from sner.server.extensions import db
# from sner.server.scheduler.models import Target
# from sner.server.storage.models import Vuln


def test_list_command(runner):
    """nessus list"""

    mock_nessus = MagicMock()
    mock_nessus.return_value.scans.list.return_value = {
        "scans": [{"id": 1, "name": "dummy", "status": "completed", "creation_date": 1, "last_modification_date": 1}]
    }
    patch_api = patch("sner.plugin.nessus.manager.Nessus", mock_nessus)

    current_app.config["SNER_NESSUS_URL"] = "http://dummy"
    with patch_api:
        result = runner.invoke(command, ["list"])
        assert result.exit_code == 0


def test_delete_command(runner):
    """nessus delete"""

    mock_nessus = MagicMock()
    mock_nessus.return_value.scans.delete.return_value = 0
    patch_api = patch("sner.plugin.nessus.manager.Nessus", mock_nessus)

    current_app.config["SNER_NESSUS_URL"] = "http://dummy"
    with patch_api:
        result = runner.invoke(command, ["delete", "1"])
        assert result.exit_code == 0

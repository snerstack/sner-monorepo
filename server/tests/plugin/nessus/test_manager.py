# This file is part of SNER project governed by MIT license, see the LICENSE.txt file.
"""
nessus plugin manager test
"""

from io import BytesIO
from pathlib import Path
from unittest.mock import MagicMock, patch

import yaml
from flask import current_app

from sner.plugin.nessus.manager import NessusManager


def test_basic(app, tmpworkdir):  # pylint: disable=unused-argument
    """test manager basics"""

    def _get_manager():
        return NessusManager("http://dummy", "dummy", "dummy")

    # list_scans
    mock_nessus = MagicMock()
    mock_nessus.return_value.scans.list.return_value = {"scans": ["dummy"]}
    patch_api = patch("sner.plugin.nessus.manager.Nessus", mock_nessus)

    with patch_api:
        manager = _get_manager()
        assert manager.list_scans() == ["dummy"]

    # create_scan
    mock_nessus = MagicMock()
    mock_nessus.return_value.policies.list.return_value = [{"name": "dummypolicy", "template_uuid": "dummyuuid", "id": "dummyid"}]
    mock_nessus.return_value.scans.create.return_value = {"scan": {"id": 42}}
    patch_api = patch("sner.plugin.nessus.manager.Nessus", mock_nessus)

    with patch_api:
        manager = _get_manager()
        assert manager.scan_create("sname", ["target"], "dummypolicy") == 42

    # scan_status
    mock_nessus = MagicMock()
    mock_nessus.return_value.scans.details.return_value = {"info": {"status": "ok"}}
    patch_api = patch("sner.plugin.nessus.manager.Nessus", mock_nessus)

    with patch_api:
        manager = _get_manager()
        assert manager.scan_status(1) == "ok"

    # scan_report
    mock_nessus = MagicMock()
    mock_nessus.return_value.scans.export_scan.return_value = BytesIO(b"bytes")
    patch_api = patch("sner.plugin.nessus.manager.Nessus", mock_nessus)

    with patch_api:
        manager = _get_manager()
        assert manager.scan_report(1) == "bytes"

    # scan_delete
    mock_nessus = MagicMock()
    mock_nessus.return_value.scans.delete.return_value = 0
    patch_api = patch("sner.plugin.nessus.manager.Nessus", mock_nessus)

    with patch_api:
        manager = _get_manager()
        assert manager.scan_delete(1) == 0


def test_factories(app, tmpworkdir):  # pylint: disable=unused-argument
    """nessus manager factories test"""

    Path("sner.nessus.yaml").write_text(yaml.safe_dump({"url": "http://dummy", "access_key": "dummy", "secret_key": "dummy"}), encoding="utf-8")
    assert NessusManager.from_creds_file("sner.nessus.yaml")

    current_app.config["SNER_NESSUS_URL"] = "http://dummy"
    current_app.config["SNER_NESSUS_ACCESS_KEY"] = "dummy"
    current_app.config["SNER_NESSUS_SECRET_KEY"] = "dummy"
    assert NessusManager.from_app_config()

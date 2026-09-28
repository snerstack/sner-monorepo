# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
agreegate integration tests
"""

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

from flask import current_app

from sner.agreegate import AGAPI_GroupsResponseAdapter, AGAPI_UserGroupsResponseAdapter
from sner.server.agreegate import (
    NETLISTS_FILE,
    fetch_agreegate_netlists,
    init_agreegate_netlists,
    sync_agreegate_allowed_networks,
)
from sner.server.auth.models import User


def _mock_agreegate_manager(**methods_returns):
    """context manager patching AgreegateManager.from_app_config with a mock manager"""

    manager = MagicMock()
    for fname, retval in methods_returns.items():
        getattr(manager, fname).return_value = retval

    return patch.object(sner.server.agreegate.AgreegateManager, "from_app_config", return_value=manager)



def test_fetch_agreegate_netlists(app):  # pylint: disable=unused-argument
    """test fetch agreegate netlists"""

    mock_agmanager = MagicMock()
    mock_agmanager.from_app_config.return_value.get_networks_aggregated.return_value = {"sner/basic": ["127.6.6.0/24"]}
    patch_manager = patch("sner.server.agreegate.AgreegateManager", mock_agmanager)

    with patch_manager:
        assert fetch_agreegate_netlists() == 0


def test_init_agreegate_netlists(app):  # pylint: disable=unused-argument
    """test load and merge agreegate configs"""

    Path(f"{current_app.config['SNER_VAR']}/{NETLISTS_FILE}").write_text(
        json.dumps(
            {
                "sner/basic": ["127.6.6.0/24", "2001:db8::11/128", "invalid"],
                "sner/nuclei": ["127.6.6.0/24"],
                "sner/nessus": ["127.6.7.0/24"],
                "auror": ["2001:db8::11/128"],
            }
        ),
        encoding="utf-8",
    )

    init_agreegate_netlists(app)

    assert len(app.config["SNER_PLANNER"]["basic_nets"]) == 3
    assert len(app.config["SNER_PLANNER"]["nuclei_nets"]) == 1
    assert len(app.config["SNER_PLANNER"]["nessus_nets"]) == 1
    assert len(app.config["SNER_PLANNER"]["auror_testssl_nets"]) == 1


def test_sync_agreegate_allowed_networks(app, user_factory):  # pylint: disable=unused-argument
    """test sync_agreegate_allowed_networks"""

    # test adding "user" role if user account gets autocreated directly in sner with oidc (eg. no roles)
    user_factory.create(username="testuser@einfra.cesnet.cz", roles=[])

    _groups = AGAPI_GroupsResponseAdapter.validate_python([{"id": 1, "name": "group1", "allowed_networks": ["127.0.0.0/8"]}])
    _users = AGAPI_UserGroupsResponseAdapter.validate_python(
        [
            {
                "username": "nonepui",
                "email": "nonepui@dummy",
                "full_name": "",
                "role": "user",
                "groups": ["group1"],
            },
            {
                "username": "testmain@einfra.cesnet.cz",
                "email": "testmain@dummy",
                "full_name": "",
                "role": "maintainer",
                "groups": ["group2"],
            },
            {
                "username": "testuser@einfra.cesnet.cz",
                "email": "testuser@dummy",
                "full_name": "full dummy name",
                "role": "viewer",
                "groups": ["group1"],
            },
        ]
    )
    mock_agmanager = MagicMock()
    mock_agmanager.from_app_config.return_value.get_groups.return_value = _groups
    mock_agmanager.from_app_config.return_value.get_usergroups.return_value = _users
    patch_manager = patch("sner.server.agreegate.AgreegateManager", mock_agmanager)

    with patch_manager:
        assert sync_agreegate_allowed_networks() == 0

    testuser = User.query.filter_by(username="testuser@einfra.cesnet.cz").one()
    assert "user" in testuser.roles
    assert testuser.api_networks == ["127.0.0.0/8"]

# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
agreegate integration tests
"""

import json
from http import HTTPStatus
from pathlib import Path
from unittest.mock import Mock, patch

import pytest
import requests
import yaml
from flask import current_app

import sner.server.agreegate
from sner.server.agreegate import (
    agreegate_apicall,
    AGREEGATE_NETLISTS_FILE,
    AgreegateApiError,
    fetch_agreegate_netlists,
    load_merge_agreegate_netlists,
    sync_agreegate_allowed_networks,
)
from sner.server.auth.models import User


def test_aggregate_apicall_success(app):  # pylint: disable=unused-argument
    """test agreegate_apicall successful request"""

    mock_response = Mock()
    mock_response.return_value = Mock()
    mock_response.return_value.status_code = HTTPStatus.OK
    mock_response.return_value.json = lambda: {"result": "ok"}

    with patch.object(requests, "request", mock_response):
        response = agreegate_apicall("GET", "/dummy")

    assert response == {"result": "ok"}


def test_aggregate_apicall_failure(app):  # pylint: disable=unused-argument
    """test agreegate_apicall failed request"""

    mock_response = Mock()
    mock_response.return_value = Mock()
    mock_response.return_value.status_code = HTTPStatus.INTERNAL_SERVER_ERROR
    mock_response.return_value.text = "error message text"

    with (
        pytest.raises(AgreegateApiError, match="agreegate apicall failed"),
        patch.object(requests, "request", mock_response)
    ):
        agreegate_apicall("POST", "/fail")


def test_fetchagreegatenetlists(app):  # pylint: disable=unused-argument
    """test fetch agreegate netlists"""

    mock_response = Mock(return_value={"sner/basic": ["127.6.6.0/24"]})
    with patch.object(sner.server.agreegate, 'agreegate_apicall', mock_response):
        assert fetch_agreegate_netlists() == 0


def test_loadmergeagreegatenetlists(app):  # pylint: disable=unused-argument
    """test load and merge agreegate configs"""

    Path(f"{current_app.config['SNER_VAR']}/{AGREEGATE_NETLISTS_FILE}").write_text(
        json.dumps({"sner/basic": ["127.6.6.0/24", "2001:db8::11/128", "invalid"]}),
        encoding="utf-8",
    )

    config = yaml.safe_load(
        """
      basic_nets_ipv4: ['127.0.0.11/32']
      basic_nets_ipv6: ['::1/128']
    """
    )

    config = load_merge_agreegate_netlists(config)
    assert len(config["basic_nets_ipv4"]) == 2
    assert len(config["basic_nets_ipv6"]) == 2


def test_sync_agreegate_allowed_networks(app, user_factory):  # pylint: disable=unused-argument
    """test sync_agreegate_allowed_networks"""

    def agreegate_apicall_mock(_, url):
        groups = [{"name": "group1", "allowed_networks": ["127.0.0.0/8"]}]
        users = [
            {
                "username": "nonepui",
                "email": "nonepui@dummy",
                "full_name": None,
                "roles": ["user"],
                "groups": ["group1"],
            },
            {
                "username": "testmain@einfra.cesnet.cz",
                "email": "testmain@dummy",
                "full_name": None,
                "roles": ["maintainer"],
                "groups": [["group2"]],
            },
            {
                "username": "testuser@einfra.cesnet.cz",
                "email": "testuser@dummy",
                "full_name": None,
                "roles": ["user"],
                "groups": ["group1"],
            },
        ]

        if url == "/api/v1/groups":
            return groups
        if url == "/api/v1/usergroups":
            return users
        return None

    with patch.object(sner.server.agreegate, 'agreegate_apicall', agreegate_apicall_mock):
        assert sync_agreegate_allowed_networks() == 0

    assert User.query.filter_by(username="testuser@einfra.cesnet.cz").one().api_networks == ["127.0.0.0/8"]

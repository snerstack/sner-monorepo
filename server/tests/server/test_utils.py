# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
misc server components tests
"""

from http import HTTPStatus
from unittest.mock import patch, Mock

import pytest
import requests

from sner.server.extensions import db
from sner.server.storage.models import Host
from sner.server.utils import agreegate_apicall, AgreegateApiError, windowed_query


def test_windowed_query(app, host):  # pylint: disable=unused-argument
    """test windowed query"""

    assert list(windowed_query(Host.query, Host.id, 1))
    assert list(windowed_query(db.session.query(Host.id, Host.id).select_from(Host), Host.id, 1))


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

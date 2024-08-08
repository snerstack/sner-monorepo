# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
frontend assets serving tests
"""

from http import HTTPStatus
from unittest.mock import Mock, patch

from flask import url_for


def test_asset_serving(client):
    """test index"""

    # patches here to handle tests/coverage without built frontend
    html = Mock(return_value="<html></html>")

    with patch('sner.server.frontend.views.send_from_directory', html):
        response = client.get(url_for('frontend.index_route'))
        assert response.status_code == HTTPStatus.OK

    with patch('sner.server.frontend.views.asset_route', html):
        response = client.get("/frontendurlx")
        assert response.status_code == HTTPStatus.OK


def test_config_route(client):
    """test config route"""

    response = client.get("/backend/frontend_config")
    assert response.status_code == HTTPStatus.OK
    assert response.json


def test_reset_browser_storage_route(client):
    """test reset_browser_storage route"""

    response = client.get("/backend/reset_browser_storage")
    assert response.status_code == HTTPStatus.OK

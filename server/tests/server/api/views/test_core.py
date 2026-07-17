# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
api.views tests
"""

from http import HTTPStatus

from flask import url_for


def test_v2_stats_prometheus_route(client, queue):  # pylint: disable=unused-argument
    """job prometheus stats route test"""

    response = client.get(url_for("api.v2_stats_prometheus_route"))
    assert response.status_code == HTTPStatus.OK

# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
lens.views tests
"""

from http import HTTPStatus

from flask import url_for


def test_host_json_route(cl_user, host_factory):
    """host json route test"""

    host_permitted = host_factory.create(address="127.3.3.3")
    host_denied = host_factory.create(address="192.168.3.3")

    response = cl_user.get(url_for('lens.host_json_route', host_id=host_permitted.id))
    assert response.status_code == HTTPStatus.OK

    response = cl_user.get(url_for('lens.host_json_route', host_id=host_denied.id), status="*")
    assert response.status_code == HTTPStatus.FORBIDDEN

    response = cl_user.get(url_for('lens.host_json_route', host_id=-1), status="*")
    assert response.status_code == HTTPStatus.NOT_FOUND

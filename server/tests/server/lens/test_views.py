# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
lens.views tests
"""

from http import HTTPStatus

from flask import url_for


def test_host_view_json_route(cl_user, host_permitted, host_denied):
    """host json route test"""

    response = cl_user.get(url_for('lens.host_view_json_route', host_id=host_permitted.id))
    assert response.status_code == HTTPStatus.OK

    response = cl_user.get(url_for('lens.host_view_json_route', host_id=host_denied.id), status="*")
    assert response.status_code == HTTPStatus.FORBIDDEN

    response = cl_user.get(url_for('lens.host_view_json_route', host_id=-1), status="*")
    assert response.status_code == HTTPStatus.NOT_FOUND


def test_host_list_json_route(cl_user, host_permitted, host_denied):
    """host list json route test"""

    response = cl_user.post(url_for('lens.host_list_json_route'), {'draw': 1, 'start': 0, 'length': 100 })
    assert response.status_code == HTTPStatus.OK

    assert len(response.json['data']) == 1
    assert response.json['data'][0]['address'] == host_permitted.address


def test_service_list_json_route(cl_user, host_permitted, host_denied, service_factory):
    """service list json route test"""

    service_permitted = service_factory.create(host=host_permitted, port=111)
    service_denied = service_factory.create(host=host_denied, port=222)

    response = cl_user.post(url_for('lens.service_list_json_route'), {'draw': 1, 'start': 0, 'length': 100 })
    assert response.status_code == HTTPStatus.OK

    assert len(response.json['data']) == 1
    assert response.json['data'][0]['port'] == service_permitted.port

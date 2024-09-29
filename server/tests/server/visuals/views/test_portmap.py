# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
visuals.views.portmap tests
"""

from http import HTTPStatus

from flask import url_for


def test_portmap_route(cl_operator, service):
    """portmap route test"""

    response = cl_operator.get(url_for('visuals.portmap_json_route'))
    assert response.status_code == HTTPStatus.OK
    assert response.json['portmap'][0]['port'] == service.port

    response = cl_operator.get(url_for('visuals.portmap_json_route', filter=f'Service.state=="{service.state}"'))
    assert response.status_code == HTTPStatus.OK
    assert response.json['portmap'][0]['port'] == service.port


def test_portmap_portstat_route(cl_operator, service):
    """portmap portstat route test"""

    response = cl_operator.get(url_for('visuals.portmap_portstat_json_route', port=service.port, filter=f'Service.state=="{service.state}"'))
    assert response.status_code == HTTPStatus.OK
    assert response.json['infos'][0]['info'] == service.info

    response = cl_operator.get(url_for('visuals.portmap_portstat_json_route', port=0))
    assert response.status_code == HTTPStatus.OK
    assert response.json['port'] == '0'

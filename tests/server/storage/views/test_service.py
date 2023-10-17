# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
storage.views.service tests
"""

import json
from http import HTTPStatus

from flask import url_for

from sner.server.storage.models import Service
from tests.server.storage.views import check_annotate, check_delete_multiid, check_tag_multiid


def test_service_list_json_route(cl_operator, service):
    """service list_json route test"""

    response = cl_operator.post(url_for('storage.service_list_json_route'), {'draw': 1, 'start': 0, 'length': 1, 'search[value]': service.info})
    assert response.status_code == HTTPStatus.OK
    response_data = json.loads(response.body.decode('utf-8'))
    assert response_data['data'][0]['info'] == service.info

    response = cl_operator.post(
        url_for('storage.service_list_json_route', filter=f'Service.info=="{service.info}"'),
        {'draw': 1, 'start': 0, 'length': 1}
    )
    assert response.status_code == HTTPStatus.OK
    response_data = json.loads(response.body.decode('utf-8'))
    assert response_data['data'][0]['info'] == service.info

    # test filtering library for joined models handling
    response = cl_operator.post(
        url_for('storage.service_list_json_route', filter=f'Host.address=="{service.host.address}"'),
        {'draw': 1, 'start': 0, 'length': 1}
    )
    assert response.status_code == HTTPStatus.OK

    response = cl_operator.post(url_for('storage.service_list_json_route', filter='invalid'), {'draw': 1, 'start': 0, 'length': 1}, status='*')
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_service_add_route(cl_operator, host, service_factory):
    """service add route test"""

    aservice = service_factory.build(host=host)

    form_data = [('host_id', host.id), ('proto', aservice.proto), ('port', aservice.port), ('state', aservice.state),
                 ('name', aservice.name), ('info', aservice.info), ('comment', aservice.comment)]
    response = cl_operator.post(url_for('storage.service_add_route', host_id=aservice.host.id), params=form_data)
    assert response.status_code == HTTPStatus.OK

    tservice = Service.query.filter(Service.info == aservice.info).one()
    assert tservice.proto == aservice.proto
    assert tservice.port == aservice.port
    assert tservice.info == aservice.info
    assert tservice.comment == aservice.comment


def test_service_edit_route(cl_operator, service):
    """service edit route test"""

    response = cl_operator.get(url_for('storage.service_view_json_route', service_id=service.id))
    new_info = f'{response.json["info"]}_edited'

    form_data = [('host_id', response.json['host_id']), ('port', response.json['port']), ('proto', response.json['proto']),
                 ('state', 'down'), ('info', new_info)]
    response = cl_operator.post(url_for('storage.service_edit_route', service_id=service.id), params=form_data)

    assert response.status_code == HTTPStatus.OK

    tservice = Service.query.get(service.id)
    assert tservice.state == 'down'
    assert tservice.info == new_info


def test_service_delete_route(cl_operator, service):
    """service delete route test"""

    response = cl_operator.post(url_for('storage.service_delete_route', service_id=service.id))
    assert response.status_code == HTTPStatus.OK

    assert not Service.query.get(service.id)


def test_service_annotate_route(cl_operator, service):
    """service annotate route test"""

    check_annotate(cl_operator, 'storage.service_annotate_route', service)


def test_service_tag_multiid_route(cl_operator, service):
    """service tag_multiid route test"""

    check_tag_multiid(cl_operator, 'storage.service_tag_multiid_route', service)


def test_service_delete_multiid_route(cl_operator, service):
    """service delete_multiid route test"""

    check_delete_multiid(cl_operator, 'storage.service_delete_multiid_route', service)


def test_service_grouped_json_route(cl_operator, service):
    """service grouped json route test"""

    response = cl_operator.post(
        url_for('storage.service_grouped_json_route'),
        {'draw': 1, 'start': 0, 'length': 1, 'search[value]': service.info}
    )
    assert response.status_code == HTTPStatus.OK
    response_data = json.loads(response.body.decode('utf-8'))
    assert service.info in response_data['data'][0]['info']

    response = cl_operator.post(
        url_for('storage.service_grouped_json_route', filter=f'Service.info=="{service.info}"'),
        {'draw': 1, 'start': 0, 'length': 1}
    )
    assert response.status_code == HTTPStatus.OK
    response_data = json.loads(response.body.decode('utf-8'))
    assert service.info in response_data['data'][0]['info']

    response = cl_operator.post(url_for('storage.service_grouped_json_route', filter='invalid'), {'draw': 1, 'start': 0, 'length': 1}, status='*')
    assert response.status_code == HTTPStatus.BAD_REQUEST

    response = cl_operator.post(
        url_for('storage.service_grouped_json_route', crop=2),
        {'draw': 1, 'start': 0, 'length': 1}
    )
    assert response.status_code == HTTPStatus.OK
    response_data = json.loads(response.body.decode('utf-8'))
    assert response_data['data'][0]['info'] == ' '.join(service.info.split(' ')[:2])

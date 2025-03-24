# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
storage.views.vuln tests
"""

import json
from http import HTTPStatus

from flask import url_for

from sner.server.extensions import db
from sner.server.storage.models import Vuln
from tests.server.storage.views import check_annotate, check_delete_multiid, check_tag_multiid


def test_vuln_list_json_route(cl_operator, vuln):
    """vuln list_json route test"""

    response = cl_operator.post(url_for('storage.vuln_list_json_route'), {'draw': 1, 'start': 0, 'length': 1, 'search[value]': vuln.name})
    assert response.status_code == HTTPStatus.OK
    response_data = json.loads(response.body.decode('utf-8'))
    assert vuln.name in response_data['data'][0]['name']

    response = cl_operator.post(
        url_for('storage.vuln_list_json_route', filter=f'Vuln.name=="{vuln.name}"'),
        {'draw': 1, 'start': 0, 'length': 1}
    )
    assert response.status_code == HTTPStatus.OK
    response_data = json.loads(response.body.decode('utf-8'))
    assert vuln.name in response_data['data'][0]['name']


def test_vuln_add_route(cl_operator, host, service, vuln_factory):
    """vuln add route test"""

    avuln = vuln_factory.build(host=host, service=service)

    form_data = [('host_id', avuln.host.id), ('name', avuln.name), ('xtype', avuln.xtype), ('severity', avuln.severity),
                 ('descr', avuln.descr), ('data', avuln.data), ('refs', '\n'.join(avuln.refs)), ('tags', '\n'.join(avuln.tags))]
    response = cl_operator.post(url_for('storage.vuln_add_route', model_name='service', model_id=avuln.service.id), params=form_data)
    assert response.status_code == HTTPStatus.OK

    tvuln = Vuln.query.filter(Vuln.name == avuln.name).one()
    assert tvuln.xtype == avuln.xtype
    assert tvuln.severity == avuln.severity
    assert tvuln.refs == avuln.refs
    assert tvuln.tags == avuln.tags


def test_vuln_edit_route(cl_operator, vuln):
    """vuln edit route test"""

    response = cl_operator.get(url_for('storage.vuln_view_json_route', vuln_id=vuln.id))
    new_name = f'{vuln.name}_edited'
    new_tags = '\n'.join(vuln.tags) + '\nedited'

    form_data = [('host_id', vuln.host.id), ('name', new_name), ('severity', vuln.severity), ('tags', new_tags)]
    response = cl_operator.post(url_for('storage.vuln_edit_route', vuln_id=vuln.id), params=form_data)
    assert response.status_code == HTTPStatus.OK

    tvuln = db.session.get(Vuln, vuln.id)
    assert tvuln.name == new_name
    assert len(tvuln.tags) == 4


def test_vuln_delete_route(cl_operator, vuln):
    """vuln delete route test"""

    response = cl_operator.post(url_for('storage.vuln_delete_route', vuln_id=vuln.id))
    assert response.status_code == HTTPStatus.OK
    assert not db.session.get(Vuln, vuln.id)


def test_vuln_invalid_add_request(cl_operator, host, service, vuln_factory):
    """vuln invalid add request"""

    avuln = vuln_factory.build(host=host, service=service)

    response = cl_operator.post(url_for('storage.vuln_add_route', model_name='service', model_id=avuln.service.id), expect_errors=True)
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_vuln_invalid_edit_request(cl_operator, vuln):
    """vuln invalid edit request"""

    response = cl_operator.post(url_for('storage.vuln_edit_route', vuln_id=vuln.id), expect_errors=True)
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_vuln_invalid_view_request(cl_operator):
    """vuln invalid view request"""

    response = cl_operator.get(url_for('storage.vuln_view_json_route', vuln_id=-1), expect_errors=True)
    assert response.status_code == HTTPStatus.NOT_FOUND


def test_vuln_invalid_multicopy_json_request(cl_operator, vuln):
    """vuln invalid multicopy json request"""

    response = cl_operator.post(url_for('storage.vuln_multicopy_json_route', vuln_id=vuln.id), expect_errors=True)
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_vuln_annotate_route(cl_operator, vuln):
    """vuln annotate route test"""

    check_annotate(cl_operator, 'storage.vuln_annotate_route', vuln)


def test_vuln_delete_multiid_route(cl_operator, vuln):
    """vuln multi delete route for ajaxed toolbars test"""

    check_delete_multiid(cl_operator, 'storage.vuln_delete_multiid_route', vuln)


def test_vuln_tag_multiid_route(cl_operator, vuln):
    """vuln multi tag route for ajaxed toolbars test"""

    check_tag_multiid(cl_operator, 'storage.vuln_tag_multiid_route', vuln)


def test_vuln_grouped_json_route(cl_operator, vuln):
    """vuln grouped json route test"""

    response = cl_operator.post(
        url_for('storage.vuln_grouped_json_route'),
        {'draw': 1, 'start': 0, 'length': 1, 'search[value]': vuln.name}
    )
    assert response.status_code == HTTPStatus.OK
    response_data = json.loads(response.body.decode('utf-8'))
    assert vuln.name in response_data['data'][0]['name']

    response = cl_operator.post(
        url_for('storage.vuln_grouped_json_route', filter=f'Vuln.name=="{vuln.name}"'),
        {'draw': 1, 'start': 0, 'length': 1}
    )
    assert response.status_code == HTTPStatus.OK
    response_data = json.loads(response.body.decode('utf-8'))
    assert vuln.name in response_data['data'][0]['name']
    assert 'i:tag3' not in response_data['data'][0]['tags']


def test_vuln_grouped_json_route_tagaggregation(cl_operator, vuln_factory):
    """vuln grouped json route test, different order tags"""

    vuln_name = 'aggregable vuln'
    vuln_factory.create(name=vuln_name, tags=['1', '2'])
    vuln_factory.create(name=vuln_name, tags=['2', '1'])
    vuln_factory.create(name=vuln_name, tags=[])

    response = cl_operator.post(
        url_for('storage.vuln_grouped_json_route'),
        {'draw': 1, 'start': 0, 'length': 10, 'search[value]': vuln_name}
    )
    assert response.status_code == HTTPStatus.OK
    response_data = json.loads(response.body.decode('utf-8'))
    assert len(response_data['data']) == 2


def test_vuln_report_route(cl_operator, vuln):
    """vuln report route test"""

    response = cl_operator.get(url_for('storage.vuln_report_route'))
    assert response.status_code == HTTPStatus.OK
    assert f',"{vuln.name}",' in response.body.decode('utf-8')


def test_vuln_export_route(cl_operator, vuln):
    """vuln export route test"""

    response = cl_operator.get(url_for('storage.vuln_export_route'))
    assert response.status_code == HTTPStatus.OK
    assert f',"{vuln.name}",' in response.body.decode('utf-8')


def test_vuln_multicopy_json_route(cl_operator, vuln, host_factory):
    """vuln multicopy route test"""

    host = host_factory.create()

    form_data = [('name', vuln.name), ('severity', vuln.severity), ('endpoints', json.dumps([{"host_id": host.id}]))]
    response = cl_operator.post(url_for('storage.vuln_multicopy_json_route', vuln_id=vuln.id), params=form_data)

    assert response.status_code == HTTPStatus.OK
    assert Vuln.query.filter(Vuln.name == vuln.name).count() == 2


def test_vuln_multicopy_endpoints_json_route(cl_operator, vuln):
    """vuln multicopy endpoints route test"""

    response = cl_operator.post(
        url_for('storage.vuln_multicopy_endpoints_json_route'),
        {'draw': 1, 'start': 0, 'length': 1}
    )
    assert response.status_code == HTTPStatus.OK
    response_data = json.loads(response.body.decode('utf-8'))
    assert vuln.host.hostname in response_data['data'][0]["host_hostname"]


def test_vuln_addedit_host_autocomplete_route(cl_operator, vuln):
    """vuln addedit autocomplete host route test"""

    response = cl_operator.get(url_for('storage.vuln_addedit_host_autocomplete_route'))
    assert json.loads(response.body.decode('utf-8')) == []

    response = cl_operator.get(url_for('storage.vuln_addedit_host_autocomplete_route', term=vuln.host.hostname[0]))
    assert response.status_code == HTTPStatus.OK
    response_data = json.loads(response.body.decode('utf-8'))
    assert vuln.host.hostname in response_data[0]["label"]


def test_vuln_addedit_service_autocomplete_route(cl_operator, service, vuln_factory):
    """vuln addedit autocomplete service route test"""

    vuln = vuln_factory.create(host=service.host, service=service)

    response = cl_operator.get(url_for('storage.vuln_addedit_service_autocomplete_route'))
    assert json.loads(response.body.decode('utf-8')) == []

    response = cl_operator.get(url_for('storage.vuln_addedit_service_autocomplete_route', host_id=vuln.host.id, service_term=vuln.service.proto[0]))
    assert response.status_code == HTTPStatus.OK
    response_data = json.loads(response.body.decode('utf-8'))
    assert vuln.service.proto in response_data[0]["label"]


def test_vuln_addedit_viatarget_autocomplete_route(cl_operator, service, vuln_factory):
    """vuln addedit autocomplete viatarget route test"""

    vuln = vuln_factory.create(host=service.host, service=service, via_target='dummy via target')

    response = cl_operator.get(url_for('storage.vuln_addedit_viatarget_autocomplete_route'))
    assert json.loads(response.body.decode('utf-8')) == []

    response = cl_operator.get(url_for('storage.vuln_addedit_viatarget_autocomplete_route', host_id=vuln.host.id, target_term=vuln.via_target[0]))
    assert response.status_code == HTTPStatus.OK
    response_data = json.loads(response.body.decode('utf-8'))
    assert vuln.via_target in response_data[0]


def test_vuln_duplicate_route(cl_operator, vuln):
    """vuln duplicate test"""

    cl_operator.post(url_for('storage.vuln_duplicate_route', vuln_id=vuln.id))
    assert Vuln.query.count() == 2

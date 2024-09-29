# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
storage.views.host tests
"""

import json
from http import HTTPStatus

from flask import url_for

from sner.server.storage.models import Host
from tests.server.storage.views import check_annotate, check_delete_multiid, check_tag_multiid


def test_host_list_json_route(cl_operator, host):
    """host list_json route test"""

    response = cl_operator.post(url_for('storage.host_list_json_route'), {'draw': 1, 'start': 0, 'length': 1, 'search[value]': host.hostname})
    assert response.status_code == HTTPStatus.OK
    response_data = json.loads(response.body.decode('utf-8'))
    assert response_data['data'][0]['hostname'] == host.hostname

    response = cl_operator.post(
        url_for('storage.host_list_json_route', filter=f'Host.hostname=="{host.hostname}"'),
        {'draw': 1, 'start': 0, 'length': 1}
    )
    assert response.status_code == HTTPStatus.OK
    response_data = json.loads(response.body.decode('utf-8'))
    assert response_data['data'][0]['hostname'] == host.hostname


def test_host_add_route(cl_operator, host_factory):
    """host add route test"""

    ahost = host_factory.build()

    form_data = [('address', ahost.address), ('hostname', ahost.hostname), ('os', ahost.os), ('comment', ahost.comment)]
    response = cl_operator.post(url_for('storage.host_add_route'), params=form_data)

    assert response.status_code == HTTPStatus.OK

    thost = Host.query.filter(Host.hostname == ahost.hostname).one()
    assert thost.hostname == ahost.hostname
    assert thost.os == ahost.os
    assert thost.comment == ahost.comment


def test_host_edit_route(cl_operator, host):
    """host edit route test"""

    response = cl_operator.get(url_for('storage.host_view_json_route', host_id=host.id))
    new_hostname = f'{response.json["hostname"]}_edited'

    form_data = [('address', host.address), ('hostname', new_hostname), ('comment', '')]
    response = cl_operator.post(url_for('storage.host_edit_route', host_id=host.id), params=form_data)

    assert response.status_code == HTTPStatus.OK

    thost = Host.query.get(host.id)
    assert thost.hostname == new_hostname
    assert thost.comment is None


def test_host_delete_route(cl_operator, host):
    """host delete route test"""

    response = cl_operator.post(url_for('storage.host_delete_route', host_id=host.id))
    assert response.status_code == HTTPStatus.OK

    assert not Host.query.get(host.id)


def test_host_invalid_form_requests(cl_operator, host):
    """host invalid requests test"""

    response = cl_operator.post(url_for('storage.host_add_route'), expect_errors=True)
    assert response.status_code == HTTPStatus.BAD_REQUEST

    response = cl_operator.post(url_for('storage.host_edit_route', host_id=host.id), expect_errors=True)
    assert response.status_code == HTTPStatus.BAD_REQUEST

    response = cl_operator.get(url_for('storage.host_view_json_route', host_id=-1), expect_errors=True)
    assert response.status_code == HTTPStatus.NOT_FOUND


def test_host_annotate_route(cl_operator, host):
    """host annotate route test"""

    check_annotate(cl_operator, 'storage.host_annotate_route', host)


def test_host_tag_multiid_route(cl_operator, host):
    """host multi tag route for ajaxed toolbars test"""

    check_tag_multiid(cl_operator, 'storage.host_tag_multiid_route', host)


def test_host_delete_multiid_route(cl_operator, host):
    """host multi delete route for ajaxed toolbars test"""

    check_delete_multiid(cl_operator, 'storage.host_delete_multiid_route', host)


def test_host_loookup_route(cl_operator, host_factory):
    """host lookup route test"""

    host1 = host_factory.create(address='127.5.5.5', hostname='ahost.localdomain')
    host_factory.create(address='127.5.5.6', hostname='ahost.localdomain')

    response = cl_operator.get(url_for('storage.host_lookup_route', address=host1.address))
    assert response.json.get("url")

    response = cl_operator.get(url_for('storage.host_lookup_route', hostname=host1.hostname))
    assert response.json.get("url")

    response = cl_operator.get(url_for('storage.host_lookup_route'), expect_errors=True)
    assert response.status_code == HTTPStatus.NOT_FOUND

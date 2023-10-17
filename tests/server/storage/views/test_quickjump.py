# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
storage.views.jumper tests
"""

from http import HTTPStatus

from flask import url_for


def test_quickjump_route(cl_operator, host, service):
    """test quickjump"""

    data = {'quickjump': host.address}
    response = cl_operator.post(url_for('storage.quickjump_route'), data)
    assert response.status_code == HTTPStatus.OK
    assert response.json['url'] == f'/storage/host/view/{host.id}'

    data = {'quickjump': host.hostname}
    response = cl_operator.post(url_for('storage.quickjump_route'), data)
    assert response.status_code == HTTPStatus.OK
    assert response.json['url'] == f'/storage/host/view/{host.id}'

    data = {'quickjump': service.port}
    response = cl_operator.post(url_for('storage.quickjump_route'), data)
    assert response.status_code == HTTPStatus.OK
    assert response.json['url'].startswith("/storage/service/list?filter=")

    data = {'quickjump': 'notfound'}
    response = cl_operator.post(url_for('storage.quickjump_route'), data, status='*')
    assert response.status_code == HTTPStatus.NOT_FOUND

    response = cl_operator.post(url_for('storage.quickjump_route'), status='*')
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_quickjump_autocomplete_route(cl_operator, host):
    """test quickjump autocomplete"""

    response = cl_operator.get(url_for('storage.quickjump_autocomplete_route'))
    assert not response.json

    response = cl_operator.get(url_for('storage.quickjump_autocomplete_route', term=host.address[:2]))
    assert host.address in response.json

    response = cl_operator.get(url_for('storage.quickjump_autocomplete_route', term=host.hostname[:2]))
    assert host.hostname in response.json

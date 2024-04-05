# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
storage.views.jumper tests
"""

from flask import url_for


def test_quickjump_autocomplete_route(cl_operator, host, service):
    """test quickjump autocomplete"""

    response = cl_operator.get(url_for('storage.quickjump_autocomplete_route'))
    assert response.json == {'hosts': [], 'services': []}

    response = cl_operator.get(url_for('storage.quickjump_autocomplete_route', term=host.address[:2]))
    assert host.address in response.json.get('hosts')[0].get('label')

    response = cl_operator.get(url_for('storage.quickjump_autocomplete_route', term=host.hostname[:2]))
    assert host.hostname in response.json.get('hosts')[0].get('label')

    response = cl_operator.get(url_for('storage.quickjump_autocomplete_route', ip=host.address[:2]))
    assert host.address in response.json.get('hosts')[0].get('label')

    response = cl_operator.get(url_for('storage.quickjump_autocomplete_route', port=str(service.port)[:1]))
    assert str(service.port) in response.json.get('services')[0].get('label')

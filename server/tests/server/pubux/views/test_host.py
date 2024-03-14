# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
pubux.views tests
"""

from http import HTTPStatus

from flask import url_for

import sner.server.api.schema as api_schema


def test_single_host_route(cl_user, host_factory, service_factory, service):
    """test single host route"""

    service_factory.create(host=host_factory.create(address='2001:db8::11'), proto='udp', port=0, state='open:test')
    host_factory.create(address='192.0.2.1')

    # ipv4
    response = cl_user.post_json(url_for('pubux.single_host_route'), {'address': service.host.address})
    assert api_schema.PublicHostSchema().load(response.json)
    assert response.json['address'] == service.host.address
    assert len(response.json['services']) == 1

    # ipv6
    response = cl_user.post_json(url_for('pubux.single_host_route'), {'address': '2001:db8:0000::11'})
    assert api_schema.PublicHostSchema().load(response.json)
    assert response.json['address'] == '2001:db8::11'
    assert len(response.json['services']) == 1

    # query not-allowed ip
    response = cl_user.post_json(url_for('pubux.single_host_route'), {'address': '192.0.2.1'}, status="*")
    assert response.status_code == HTTPStatus.NOT_FOUND


def test_single_host_route_no_networks(cl_user_nonetworks, host):
    """test single host route with no networks configured"""

    response = cl_user_nonetworks.post_json(url_for('pubux.single_host_route'), {'address': host.address}, status="*")
    assert response.status_code == HTTPStatus.FORBIDDEN


def test_range_host_route(cl_user, host_factory):
    """test range host route"""

    host_factory.create(address='127.0.1.1')
    host_factory.create(address='127.0.2.1')

    response = cl_user.post_json(url_for('pubux.range_host_route'), {'cidr': '127.0.0.0/8'})
    assert api_schema.PublicRangeSchema(many=True).load(response.json)
    assert len(response.json) == 2


def test_range_host_route_no_networks(cl_user_nonetworks, host):
    """test single host route with no networks configured"""

    response = cl_user_nonetworks.post_json(url_for('pubux.range_host_route'), {'cidr': f'{host.address}/32'}, status="*")
    assert response.status_code == HTTPStatus.FORBIDDEN

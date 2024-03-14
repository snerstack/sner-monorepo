# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
pubux.views.service tests
"""

from http import HTTPStatus

from flask import url_for

import sner.server.api.schema as api_schema


def test_service_list_route(cl_user, service_factory):
    """test service list route"""

    service_factory.create(port=1)
    service_factory.create(port=2)

    response = cl_user.post_json(url_for('pubux.service_list_route'), {'filter': 'Service.port=="1"'})
    assert api_schema.PublicServicelistSchema(many=True).load(response.json)
    assert len(response.json) == 1

    response = cl_user.post_json(url_for('pubux.service_list_route'), {'filter': 'invalid'}, status='*')
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_service_list_route_no_networks(cl_user_nonetworks, service):
    """test service list route with no networks configured"""

    response = cl_user_nonetworks.post_json(url_for('pubux.service_list_route'), {'filter': 'Service.port=="1"'}, status='*')
    assert response.status_code == HTTPStatus.FORBIDDEN

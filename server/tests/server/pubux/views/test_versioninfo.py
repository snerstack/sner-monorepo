# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
pubux.views.versioninfo tests
"""

from http import HTTPStatus

from flask import url_for

import sner.server.api.schema as api_schema


def test_versioninfo_route(cl_user, versioninfo):
    """test versioninfo route"""

    response = cl_user.post_json(url_for('pubux.versioninfo_route'))
    assert api_schema.PublicVersioninfoSchema(many=True).load(response.json)
    assert len(response.json) == 1

    response = cl_user.post_json(url_for('pubux.versioninfo_route'), {'product': 'DuMmY', 'versionspec': '>1.0'})

    assert api_schema.PublicVersioninfoSchema(many=True).load(response.json)
    assert len(response.json) == 1
    assert response.json[0]["product"] == "dummy product"

    response = cl_user.post_json(url_for('pubux.versioninfo_route'), {'product': 'dummy', 'versionspec': '<1.0'})
    assert len(response.json) == 0

    response = cl_user.post_json(url_for('pubux.versioninfo_route'), {'filter': 'invalid'}, status='*')
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_versioninfo_route_no_networks(cl_user_nonetworks, versioninfo):
    """test versioninfo route with no networks configured"""

    response = cl_user_nonetworks.post_json(url_for('pubux.versioninfo_route'), status='*')
    assert response.status_code == HTTPStatus.FORBIDDEN

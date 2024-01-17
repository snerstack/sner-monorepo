# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
visuals.views.internals tests
"""

from http import HTTPStatus

from flask import url_for


def test_internals_json_route(cl_admin):
    """dnstree.json route test"""

    response = cl_admin.get(url_for('visuals.internals_json_route'))
    assert response.status_code == HTTPStatus.OK
    assert response.json['exclusions'] == '- - regex\n  - ^tcp://.*:22$\n- - network\n  - 127.66.66.0/26\n'

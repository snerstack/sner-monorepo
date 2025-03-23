# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auth.core tests
"""

from http import HTTPStatus

from flask import url_for

from sner.server.password_supervisor import PasswordSupervisor as PWS
from tests.server import get_csrf_token
from tests.server.conftest import CustomTestApp


def test_auth_session(cl_user):
    """test session auth"""

    response = cl_user.get(url_for('auth.profile_json_route'))
    assert response.status_code == HTTPStatus.OK

    # session authenticated user should not access api
    response = cl_user.post_json(url_for('api.v2_public_storage_host_route'), {'address': '192.0.2.1'}, status='*')
    assert response.status_code == HTTPStatus.FORBIDDEN


def test_auth_apikey(api_user):
    """test session auth"""

    # apikey authenticated user should not access webui
    response = api_user.get(url_for('auth.profile_json_route'), status='*')
    assert response.status_code == HTTPStatus.FORBIDDEN

    response = api_user.post_json(url_for('api.v2_public_storage_host_route'), {'address': '192.0.2.1'})
    assert response.status_code == HTTPStatus.OK


def test_user_loader(app, user_factory):
    """test user_loader"""
    # flask3/flask-login uses g for tracking user authentication. while subsequent requests within
    # single test app context "reuses user identity" from g, so user_loader is not triggered for coverage
    # this test deliberately uses two separate contexts to test session based user_loader

    client = CustomTestApp(app)
    password = PWS.generate()
    user = user_factory.create(password=PWS.hash(password))

    with app.app_context():
        form_data = [('username', user.username), ('password', password), ('csrf_token', get_csrf_token(client))]
        response = client.post(url_for('auth.login_route'), params=form_data)
        assert response.status_code == HTTPStatus.OK

    with app.app_context():
        response = client.get(url_for('auth.user_me_route'))
        assert response.status_code == HTTPStatus.OK
        assert response.json['username'] == user.username

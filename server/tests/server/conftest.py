# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
pytest config and fixtures
"""

import pytest
from flask import url_for
from webtest import TestApp

from sner.server.password_supervisor import PasswordSupervisor as PWS
from tests.server import get_csrf_token


@pytest.fixture
def client(app):  # pylint: disable=redefined-outer-name
    """create webtest testapp client"""
    return CustomTestApp(app)


@pytest.fixture
def client_without_csrf_token(app):  # pylint: disable=redefined-outer-name
    """create webtest testapp client without csrf token"""
    return TestApp(app)


@pytest.fixture
def runner(app):  # pylint: disable=redefined-outer-name
    """create cli test runner"""
    return app.test_cli_runner()


def client_in_roles(ufactory, clnt, roles):
    """create user role and login client to role(s)"""

    password = PWS.generate()
    user = ufactory.create(username='pytest_user', password=PWS.hash(password), roles=roles)

    form_data = [('username', user.username), ('password', password)]
    clnt.post(url_for('auth.login_route'), headers={'X-CSRF-TOKEN': get_csrf_token(clnt)}, params=form_data)

    return clnt


@pytest.fixture
def cl_user(user_factory, client):  # pylint: disable=redefined-outer-name
    """yield client authenticated to role user"""

    yield client_in_roles(user_factory, client, ['user'])


@pytest.fixture
def cl_operator(user_factory, client):  # pylint: disable=redefined-outer-name
    """yield client authenticated to role operator"""

    yield client_in_roles(user_factory, client, ['user', 'operator'])


@pytest.fixture
def cl_admin(user_factory, client):  # pylint: disable=redefined-outer-name
    """yield client authenticated to role admin"""

    yield client_in_roles(user_factory, client, ['user', 'operator', 'admin'])


class CustomTestApp(TestApp):
    """automatically obtaining csrf token for webtest client/app"""

    def __init__(self, app):
        super().__init__(app)

    def _inject_csrf(self, kwargs):
        """inject x-csrf-token to kwargs["headers"]"""

        kwargs.setdefault("headers", {})
        kwargs["headers"]["X-CSRF-TOKEN"] = get_csrf_token(self)
        return kwargs

    def get(self, *args, **kwargs):
        """token setup before GET request"""

        if args[0] == '/backend/auth/user/me':   # prevent recursion
            return super().get(*args, **kwargs)

        kwargs = self._inject_csrf(kwargs)
        return super().get(*args, **kwargs)

    def post(self, *args, **kwargs):
        """token setup before POST request"""

        kwargs = self._inject_csrf(kwargs)
        return super().post(*args, **kwargs)

    def post_json(self, *args, **kwargs):
        """token setup before POST JSON request"""

        kwargs = self._inject_csrf(kwargs)
        return super().post_json(*args, **kwargs)


class TestAppApi(TestApp):
    """autenticating webtest client/app"""

    def __init__(self, app, apikey):
        self.apikey = apikey
        super().__init__(app)

    def get(self, *args, **kwargs):
        """authenticated get"""

        kwargs['headers'] = {'X-API-KEY': self.apikey}
        return super().get(*args, **kwargs)

    def post_json(self, *args, **kwargs):
        """authenticated post_json"""

        kwargs['headers'] = {'X-API-KEY': self.apikey}
        return super().post_json(*args, **kwargs)


@pytest.fixture
def api_agent(app, apikey_agent):  # pylint: disable=redefined-outer-name
    """create webtest testapp client"""

    return TestAppApi(app, apikey_agent)


@pytest.fixture
def api_user(app, apikey_user):  # pylint: disable=redefined-outer-name
    """create webtest testapp client"""

    return TestAppApi(app, apikey_user)


@pytest.fixture
def api_user_nonetworks(app, user_factory):
    """create webtest testappclient without any api networks configures"""

    tmp_apikey = PWS.generate_apikey()
    user_factory.create(username='pytest_user', apikey=PWS.hash_simple(tmp_apikey), roles=['user'], api_networks=[])
    return TestAppApi(app, tmp_apikey)

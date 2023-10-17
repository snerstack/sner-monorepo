# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auth.views.user tests
"""

import json
from http import HTTPStatus

from flask import url_for

from sner.server.auth.models import User
from sner.server.password_supervisor import PasswordSupervisor as PWS


def test_user_me_route(cl_user, user):
    """user me route test"""
    response = cl_user.get(url_for('auth.user_me_route'))
    assert response.status_code == HTTPStatus.OK
    assert response.json['email'] == user.email

def test_user_me_unauthenticated(client):
    """user me route unauthenticated test"""
    response = client.get(url_for('auth.user_me_route'), expect_errors=True)
    assert response.status_code == HTTPStatus.UNAUTHORIZED

def test_user_list_json_route(cl_admin, user):
    """user list json route test"""

    response = cl_admin.post(url_for('auth.user_list_json_route'), {'draw': 1, 'start': 0, 'length': 1, 'search[value]': user.username})
    assert response.status_code == HTTPStatus.OK
    response_data = json.loads(response.body.decode('utf-8'))
    assert response_data['data'][0]['username'] == user.username

    response = cl_admin.post(
        url_for('auth.user_list_json_route', filter=f'User.username=="{user.username}"'),
        {'draw': 1, 'start': 0, 'length': 1}
    )
    assert response.status_code == HTTPStatus.OK
    response_data = json.loads(response.body.decode('utf-8'))
    assert response_data['data'][0]['username'] == user.username

    response = cl_admin.post(url_for('auth.user_list_json_route', filter='invalid'), {'draw': 1, 'start': 0, 'length': 1}, status='*')
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_user_add_route(cl_admin, user_factory):
    """user add route test"""

    password = PWS.generate()
    auser = user_factory.build()

    form_data = [('username', auser.username), ('roles', auser.roles), ('active', auser.active), ('new_password', password)]
    response = cl_admin.post(url_for('auth.user_add_route'), params=form_data)

    assert response.status_code == HTTPStatus.OK

    tuser = User.query.filter(User.username == auser.username).one()
    assert tuser.username == auser.username
    assert PWS.compare(PWS.hash(password, PWS.get_salt(tuser.password)), tuser.password)
    assert tuser.active == auser.active
    assert tuser.roles == auser.roles


def test_user_invalid_add_route(cl_admin):
    """user add invalid route test"""
    response = cl_admin.post(url_for('auth.user_add_route'), params=[('new_password', 'psw')], expect_errors=True)
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_user_edit_route(cl_admin, user):
    """user edit route test"""

    password = PWS.generate()

    response = cl_admin.get(url_for('auth.user_json_route', user_id=user.id))
    new_username = f'{response.json["username"]}_edited'
    form_data = [('username', new_username), ('roles', []), ('new_password', password), ('api_networks', '127.0.0.0/23\n192.0.2.0/24\n2001:db8::/48')]

    response = cl_admin.post(url_for('auth.user_edit_route', user_id=user.id), params=form_data)
    assert response.status_code == HTTPStatus.OK

    tuser = User.query.filter(User.username == new_username).one()
    assert tuser.username == new_username
    assert PWS.compare(PWS.hash(password, PWS.get_salt(tuser.password)), tuser.password)
    assert not user.roles
    assert user.api_networks == ['127.0.0.0/23', '192.0.2.0/24', '2001:db8::/48']


def test_user_invalid_edit_route(cl_admin, user):
    """user edit invalid route test"""
    response = cl_admin.post(url_for('auth.user_edit_route', user_id=user.id), expect_errors=True)
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_user_delete_route(cl_admin, user):
    """user delete route test"""

    response = cl_admin.post(url_for('auth.user_delete_route', user_id=user.id))
    assert response.status_code == HTTPStatus.OK

    assert not User.query.filter(User.username == user.username).one_or_none()


def test_user_apikey_route(cl_admin, user):
    """user apikey route test"""

    response = cl_admin.post(url_for('auth.user_apikey_route', user_id=user.id, action='generate'))
    assert response.status_code == HTTPStatus.OK
    assert User.query.get(user.id).apikey

    response = cl_admin.post(url_for('auth.user_apikey_route', user_id=user.id, action='revoke'))
    assert response.status_code == HTTPStatus.OK
    assert not User.query.get(user.id).apikey

    response = cl_admin.post(url_for('auth.user_apikey_route', user_id=user.id, action='invalid'), status='*')
    assert response.status_code == HTTPStatus.BAD_REQUEST

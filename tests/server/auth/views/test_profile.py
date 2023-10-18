# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auth.views.profile tests
"""

import json
from base64 import b64decode, b64encode
from http import HTTPStatus

from fido2 import cbor
from flask import url_for
from soft_webauthn import SoftWebauthnDevice

from sner.server.auth.core import TOTPImpl
from sner.server.auth.models import User, WebauthnCredential
from sner.server.extensions import db, webauthn
from sner.server.password_supervisor import PasswordSupervisor as PWS


def test_profile_changepassword_route(cl_user):
    """user profile change password"""

    cur_password = PWS.generate()
    new_password = PWS.generate()
    user = User.query.filter(User.username == 'pytest_user').one()
    user.password = PWS.hash(cur_password)
    db.session.commit()

    form_data = [('current_password', cur_password), ('password1', 'AlongPassword1'), ('password2', 'AlongPassword2')]
    response = cl_user.post(url_for('auth.profile_changepassword_route'), params=form_data, expect_errors=True)
    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "Passwords does not match." in response.json["error"]["errors"]["password1"]

    form_data = [('current_password', cur_password), ('password1', 'weak'), ('password2', 'weak')]
    response = cl_user.post(url_for('auth.profile_changepassword_route'), params=form_data, expect_errors=True)
    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "Password too short. At least 10 characters required." in response.json["error"]["errors"]["password1"]

    form_data = [('current_password', '1'), ('password1', new_password), ('password2', new_password)]
    response = cl_user.post(url_for('auth.profile_changepassword_route'), params=form_data, expect_errors=True)
    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json["error"]["message"] == 'Invalid current password.'

    form_data = [('current_password', cur_password), ('password1', new_password), ('password2', new_password)]
    response = cl_user.post(url_for('auth.profile_changepassword_route'), params=form_data)
    assert response.status_code == HTTPStatus.OK
    user = User.query.filter(User.username == 'pytest_user').one()
    assert PWS.compare(PWS.hash(new_password, PWS.get_salt(user.password)), user.password)


def test_profile_totp_route_enable(cl_user):
    """user profile enable totp"""

    response = cl_user.get(url_for('auth.profile_totp_route'))

    form_data = [('code', 'invalid')]
    response = cl_user.post(url_for('auth.profile_totp_route'), params=form_data, expect_errors=True)
    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json["error"]["message"] == "Invalid code."

    response = cl_user.get(url_for('auth.profile_totp_route'))
    secret = response.json["secret"]
    form_data = [('code', TOTPImpl(secret).current_code())]
    response = cl_user.post(url_for('auth.profile_totp_route'), params=form_data)
    assert response.status_code == HTTPStatus.OK
    user = User.query.filter(User.username == 'pytest_user').one()
    assert user.totp

    response = cl_user.get(url_for('auth.profile_totp_route'))
    assert response.status_code == HTTPStatus.OK


def test_profile_totp_route_disable(cl_user):
    """user profile disable totp"""

    tmp_secret = TOTPImpl.random_base32()
    user = User.query.filter(User.username == 'pytest_user').one()
    user.totp = tmp_secret
    db.session.commit()

    form_data = [('code', 'invalid')]
    response = cl_user.post(url_for('auth.profile_totp_route'), params=form_data, expect_errors=True)
    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json["error"]["message"] == "Invalid code."

    form_data = [('code', TOTPImpl(tmp_secret).current_code())]
    response = cl_user.post(url_for('auth.profile_totp_route'), params=form_data)
    assert response.status_code == HTTPStatus.OK
    user = User.query.filter(User.username == 'pytest_user').one()
    assert not user.totp


def test_profile_webauthn_list_json_route(cl_user, webauthn_credential_factory):
    """profile webauthn credentials json route test"""

    wncred = webauthn_credential_factory.create(user=User.query.filter(User.username == 'pytest_user').one())

    response = cl_user.post(url_for('auth.profile_webauthn_list_json_route'), {'draw': 1, 'start': 0, 'length': 1, 'search[value]': wncred.name})
    assert response.status_code == HTTPStatus.OK
    response_data = json.loads(response.body.decode('utf-8'))
    assert response_data['data'][0]['name'] == wncred.name


def test_profile_webauthn_register_route(cl_user):
    """register new credential for user"""

    device = SoftWebauthnDevice()

    # # some javascript code must be emulated
    pkcco = cbor.decode(b64decode(cl_user.post(url_for('auth.profile_webauthn_pkcco_route')).body))
    attestation = device.create(pkcco, f'https://{webauthn.rp.id}')
    attestation_data = {
        'clientDataJSON': attestation['response']['clientDataJSON'],
        'attestationObject': attestation['response']['attestationObject']}

    form_data = [('attestation', b64encode(cbor.encode(attestation_data))), ('name', 'pytest token')]

    response = cl_user.post(url_for('auth.profile_webauthn_register_route'), params=form_data)

    assert response.status_code == HTTPStatus.OK
    user = User.query.filter(User.username == 'pytest_user').one()
    assert user.webauthn_credentials


def test_profile_webauthn_pkcco_route_invalid_request(cl_user):
    """test error handling in pkcco route"""

    response = cl_user.post(url_for('auth.profile_webauthn_pkcco_route'), status='*', headers={"Cookie": ""})

    assert response.status_code == HTTPStatus.FOUND


def test_profile_webauthn_register_route_invalid_attestation(cl_user):
    """register new credential for user; error handling"""

    form_data = [('attestation', 'invalid')]
    response = cl_user.post(url_for('auth.profile_webauthn_register_route'), params=form_data, expect_errors=True)

    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
    assert response.json['error']['message'] == 'Error during registration.'

    response = cl_user.post(url_for('auth.profile_webauthn_register_route'), expect_errors=True)
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_profile_webauthn_route(cl_user, webauthn_credential_factory):
    """profile webauthn credentials route test"""
    wncred = webauthn_credential_factory.create(user=User.query.filter(User.username == 'pytest_user').one())

    response = cl_user.get(url_for('auth.profile_webauthn_route', webauthn_id=wncred.id))
    assert response.status_code == HTTPStatus.OK
    assert response.json['id'] == 1
    assert response.json['name'] == 'testcredential'


def test_profile_webauthn_edit_route(cl_user, webauthn_credential_factory):
    """profile edit webauthn credentials route test"""

    wncred = webauthn_credential_factory.create(user=User.query.filter(User.username == 'pytest_user').one())

    new_name = f'{wncred.name}_edited'
    form_data = [('name', new_name)]

    response = cl_user.post(url_for('auth.profile_webauthn_edit_route', webauthn_id=wncred.id), params=form_data)
    assert response.status_code == HTTPStatus.OK

    assert wncred.name == new_name


def test_profile_webauthn_edit_route_invalid_request(cl_user, webauthn_credential_factory):
    """profile invalid edit webauthn credentials route test"""

    wncred = webauthn_credential_factory.create(user=User.query.filter(User.username == 'pytest_user').one())

    form_data = [('name', "A"*300)]

    response = cl_user.post(url_for('auth.profile_webauthn_edit_route', webauthn_id=wncred.id), params=form_data, expect_errors=True)
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_profile_webauthn_delete_route(cl_user, webauthn_credential_factory):
    """profile delete webauthn credentials route test"""

    wncred = webauthn_credential_factory.create(user=User.query.filter(User.username == 'pytest_user').one())

    response = cl_user.post(url_for('auth.profile_webauthn_delete_route', webauthn_id=wncred.id))
    assert response.status_code == HTTPStatus.OK

    assert not WebauthnCredential.query.get(wncred.id)


def test_profile_apikey_route(cl_user):
    """profile delete webauthn credentials route test"""

    user = User.query.filter(User.username == 'pytest_user').one()
    assert not user.apikey

    response = cl_user.post(url_for('auth.profile_apikey_route', action='generate'))
    assert response.status_code == HTTPStatus.OK
    assert user.apikey

    response = cl_user.post(url_for('auth.profile_apikey_route', action='revoke'))
    assert response.status_code == HTTPStatus.OK
    assert not user.apikey

    response = cl_user.post(url_for('auth.profile_apikey_route', action='invalid'), expect_errors=True)
    assert response.status_code == HTTPStatus.BAD_REQUEST

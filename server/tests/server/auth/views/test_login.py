# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auth.views.login tests
"""

from base64 import b64decode, b64encode
from http import HTTPStatus
from unittest.mock import Mock, patch

from authlib.common.errors import AuthlibBaseError
from fido2 import cbor
from flask import current_app, redirect, url_for
from soft_webauthn import SoftWebauthnDevice

from sner.server.auth.core import TOTPImpl
from sner.server.extensions import oauth, webauthn
from sner.server.password_supervisor import PasswordSupervisor as PWS
from tests.server import get_csrf_token


def test_session_login(client, user_factory):
    """test login"""

    password = PWS.generate()
    user = user_factory.create(password=PWS.hash(password))

    csrf_token = get_csrf_token(client)
    headers = {"X-CSRFToken": csrf_token}

    invalid_data = {"username": user.username, "password": "invalid"}
    response = client.post_json(url_for("auth.login_route"), invalid_data, headers=headers, expect_errors=True)

    assert response.status_code == HTTPStatus.UNAUTHORIZED
    assert response.json["error"]["message"] == "Invalid credentials."

    before_login_session_id = client.cookies["session"]
    data = {"username": user.username, "password": password}
    response = client.post_json(url_for("auth.login_route"), data, headers=headers)
    after_login_session_id = client.cookies["session"]

    assert response.status_code == HTTPStatus.OK
    assert before_login_session_id != after_login_session_id


def test_session_logout(cl_user):
    """test logout"""

    response = cl_user.get(url_for("auth.logout_route"))
    assert response.status_code == HTTPStatus.OK
    assert response.json["message"] == "Successfully logged out."


def test_session_forbidden(cl_user):
    """access forbidden"""

    response = cl_user.get(url_for("auth.user_list_json_route"), status="*")
    assert response.status_code == HTTPStatus.FORBIDDEN


def test_login_totp(client, user_factory):
    """test login totp"""

    password = PWS.generate()
    secret = TOTPImpl.random_base32()
    user = user_factory(password=PWS.hash(password), totp=secret)

    data = {"username": user.username, "password": password}
    response = client.post_json(url_for("auth.login_route"), data)
    assert response.status_code == HTTPStatus.OK

    data = {"code": "invalid"}
    response = client.post_json(url_for("auth.login_totp_route"), data, expect_errors=True)
    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json["error"]["message"] == "Invalid code."

    response = client.post_json(url_for("auth.login_totp_route"), expect_errors=True)
    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY

    data = {"code": TOTPImpl(secret).current_code().decode()}
    response = client.post_json(url_for("auth.login_totp_route"), data)
    assert response.status_code == HTTPStatus.OK


def test_login_totp_unauthorized(client):
    """test unauthorized login totp"""

    data = {"code": "invalid"}
    response = client.post_json(url_for("auth.login_totp_route"), data, expect_errors=True)
    assert response.status_code == HTTPStatus.UNAUTHORIZED


def test_login_webauthn(client, webauthn_credential_factory):
    """test login by webauthn"""

    device = SoftWebauthnDevice()
    device.cred_init(webauthn.rp.id, b"randomhandle")
    wncred = webauthn_credential_factory.create(initialized_device=device)

    data = {"username": wncred.user.username}
    response = client.post_json(url_for("auth.login_route"), data)
    assert response.status_code == HTTPStatus.OK
    assert response.json["webauthn_login"]

    # some javascript code muset be emulated
    pkcro = cbor.decode(b64decode(client.post(url_for("auth.login_webauthn_pkcro_route")).body))
    assertion = device.get(pkcro, f"https://{webauthn.rp.id}")
    assertion_data = {
        "credentialRawId": assertion["rawId"],
        "authenticatorData": assertion["response"]["authenticatorData"],
        "clientDataJSON": assertion["response"]["clientDataJSON"],
        "signature": assertion["response"]["signature"],
        "userHandle": assertion["response"]["userHandle"],
    }

    data = {"assertion": b64encode(cbor.encode(assertion_data)).decode()}
    response = client.post_json(url_for("auth.login_webauthn_route"), data)

    # and back to standard test codeflow
    assert response.status_code == HTTPStatus.OK


def test_login_webauthn_unauthorized(client):
    """test unauthorized login webauthn"""

    response = client.post_json(url_for("auth.login_webauthn_route"), {"assertion": "something"}, expect_errors=True)
    assert response.status_code == HTTPStatus.UNAUTHORIZED


def test_login_webauthn_invalid_request(client, webauthn_credential_factory):
    """test invalid login webauthn"""

    device = SoftWebauthnDevice()
    device.cred_init(webauthn.rp.id, b"randomhandle")
    wncred = webauthn_credential_factory.create(initialized_device=device)

    data = {"username": wncred.user.username}
    response = client.post_json(url_for("auth.login_route"), data)
    assert response.status_code == HTTPStatus.OK
    assert response.json["webauthn_login"]

    response = client.post_json(url_for("auth.login_webauthn_route"), {}, expect_errors=True)
    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY


def test_profile_webauthn_pkcro_route_invalid_request(client):
    """test error handling in pkcro route"""

    response = client.post(url_for("auth.login_webauthn_pkcro_route"), status="*")
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_login_webauthn_invalid_assertion(client, webauthn_credential):
    """test login by webauthn; error hanling"""

    data = {"username": webauthn_credential.user.username}
    response = client.post_json(url_for("auth.login_route"), data)
    assert response.status_code == HTTPStatus.OK
    assert response.json["webauthn_login"]

    data = {"assertion": "invalid"}
    response = client.post_json(url_for("auth.login_webauthn_route"), data, expect_errors=True)

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert response.json["error"]["message"] == "Error during Webauthn authentication."


def test_login_oidc_route(client, user):
    """test_login_oidc_route"""

    authorize_redirect_mock = Mock(return_value=redirect("fake_redir_to_idp"))
    authorize_access_token_mock = Mock(return_value={"userinfo": {"sub": user.username, "email": user.email}})

    patch_oauth_redirect = patch.object(oauth.OIDC_DEFAULT, "authorize_redirect", authorize_redirect_mock)
    patch_oauth_token = patch.object(oauth.OIDC_DEFAULT, "authorize_access_token", authorize_access_token_mock)
    with patch_oauth_redirect, patch_oauth_token:
        response = client.get(url_for("auth.login_oidc_route"), expect_errors=True)
        assert response.status_code == HTTPStatus.FOUND
        assert response.headers["Location"] == "fake_redir_to_idp"

        response = client.get(url_for("auth.login_oidc_callback_route"))
        assert response.status_code == HTTPStatus.FOUND

    authorize_redirect_mock.assert_called_once()
    authorize_access_token_mock.assert_called_once()


def test_login_oidc_route_noexist_user(client):
    """test non-existing user"""

    authorize_access_token_mock = Mock(return_value={"userinfo": {"sub": "dummy", "email": "notexist"}})
    current_app.config["OIDC_CREATE_USER"] = True

    patch_oauth_token = patch.object(oauth.OIDC_DEFAULT, "authorize_access_token", authorize_access_token_mock)
    with patch_oauth_token:
        response = client.get(url_for("auth.login_oidc_callback_route"))
        assert response.status_code == HTTPStatus.FOUND

    authorize_access_token_mock.assert_called_once()


def test_login_oidc_route_failed_userinfo(client):
    """test non-existing user"""

    authorize_access_token_mock = Mock(return_value={"userinfo": {"required_fields_missing": 1}})

    patch_oauth_token = patch.object(oauth.OIDC_DEFAULT, "authorize_access_token", authorize_access_token_mock)
    with patch_oauth_token:
        response = client.get(url_for("auth.login_oidc_callback_route"), expect_errors=True)
        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
        assert response.json["error"]["message"] == "OIDC authentication error, user lookup error"

    authorize_access_token_mock.assert_called_once()


def test_login_oidc_route_handle_oidc_errors(client):
    """test_login_oidc_route"""

    authorize_redirect_mock = Mock(side_effect=AuthlibBaseError)
    authorize_access_token_mock = Mock(side_effect=AuthlibBaseError)

    patch_oauth_redirect = patch.object(oauth.OIDC_DEFAULT, "authorize_redirect", authorize_redirect_mock)
    patch_oauth_token = patch.object(oauth.OIDC_DEFAULT, "authorize_access_token", authorize_access_token_mock)

    with patch_oauth_redirect, patch_oauth_token:
        response = client.get(url_for("auth.login_oidc_route"), expect_errors=True)
        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
        assert response.json["error"]["message"] == "OIDC authentication error."

        response = client.get(url_for("auth.login_oidc_callback_route"), expect_errors=True)
        assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR
        assert response.json["error"]["message"] == "OIDC authentication error."

    authorize_redirect_mock.assert_called_once()
    authorize_access_token_mock.assert_called_once()

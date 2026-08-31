# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auth profile views; user profile self-management
"""

import json
import string
from base64 import b64decode, b64encode
from http import HTTPStatus
from random import SystemRandom
from socket import getfqdn

from datatables import ColumnDT, DataTables
from fido2 import cbor
from fido2.webauthn import AttestationObject, CollectedClientData
from flask import Response, current_app, jsonify, request, session
from flask_login import current_user
from sqlalchemy import literal_column

from sner.server.auth.core import TOTPImpl, UserManager, session_required, webauthn_credentials
from sner.server.auth.models import User, WebauthnCredential
from sner.server.auth.schemas import (
    ProfileResponse,
    TotpCodeRequest,
    TotpProvisioningResponse,
    UserChangePasswordRequest,
    WebauthnCredentialResponse,
    WebauthnEditRequest,
    WebauthnRegisterRequest,
)
from sner.server.auth.views import blueprint
from sner.server.extensions import db, webauthn
from sner.server.password_supervisor import PasswordSupervisor as PWS
from sner.server.schemas import MessageResponse
from sner.server.utils import SnerJSONEncoder, error_response


def random_string(length=32):
    """generates random string"""
    return "".join([SystemRandom().choice(string.ascii_letters + string.digits) for i in range(length)])


@blueprint.route("/profile.json")
@blueprint.response(HTTPStatus.OK, ProfileResponse)
@session_required("user")
def profile_json_route():
    """general user profile route"""

    return jsonify(
        {
            "username": current_user.username,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "api_networks": current_user.api_networks,
            "has_apikey": current_user.apikey is not None,
            "has_totp": current_user.totp is not None,
        }
    )


@blueprint.route("/profile/changepassword", methods=["GET", "POST"])
@blueprint.arguments(UserChangePasswordRequest)
@blueprint.response(HTTPStatus.OK, MessageResponse)
@session_required("user")
def profile_changepassword_route(args):
    """user profile change password"""

    user = User.query.filter(User.id == current_user.id).one()

    if not PWS.compare(PWS.hash(args["current_password"], PWS.get_salt(user.password)), user.password):
        return error_response(message="Invalid current password.", code=HTTPStatus.BAD_REQUEST)

    user.password = PWS.hash(args["password1"])
    db.session.commit()
    current_app.logger.info("auth.profile password changed")
    return jsonify({"message": "Password successfully changed."})


@blueprint.route("/profile/totp", methods=["GET"])
@blueprint.response(HTTPStatus.OK, TotpProvisioningResponse)
@session_required("user")
def profile_totp_route():
    """user profile totp management route"""
    user = db.session.get(User, current_user.id)

    if not user.totp:
        if "totp_new_secret" not in session:
            session["totp_new_secret"] = TOTPImpl.random_base32()
        provisioning_url = TOTPImpl(session.get("totp_new_secret")).get_provisioning_uri(
            user.username, current_app.config["SERVER_NAME"] or getfqdn()
        )
        return jsonify({"provisioning_url": provisioning_url, "secret": session["totp_new_secret"]})

    return jsonify({"provisioning_url": "", "secret": ""})


@blueprint.route("/profile/totp", methods=["POST"])
@session_required("user")
@blueprint.arguments(TotpCodeRequest)
@blueprint.response(HTTPStatus.OK, MessageResponse)
def profile_totp_post_route(args):
    """enable/disable totp based on current state"""
    user = db.session.get(User, current_user.id)

    if not user.totp:
        # enable totp
        if TOTPImpl(session.get("totp_new_secret")).verify_code(args["code"]):
            user.totp = session["totp_new_secret"]
            db.session.commit()
            session.pop("totp_new_secret", None)
            current_app.logger.info("auth.profile totp enabled")
            return jsonify({"message": "TOTP successfully enabled."})
        return error_response(message="Invalid code.", code=HTTPStatus.BAD_REQUEST)

    # disable totp
    if TOTPImpl(user.totp).verify_code(args["code"]):
        user.totp = None
        db.session.commit()
        session.pop("totp_new_secret", None)
        current_app.logger.info("auth.profile totp disabled")
        return jsonify({"message": "TOTP successfully disabled."})

    return error_response(message="Invalid code.", code=HTTPStatus.BAD_REQUEST)

# webauthn.guide
#
# registration
#
# 1. create credential
#   - client retrieves publickKeyCredentialCreationOptions (pkcco) from server; state/challenge must be preserved on the server side
#   - client/navigator calls authenticator with options to create credential
#   - authenticator will create new credential and return an atestation response (new credential's public key + metadata)
#
# 2. register credential
#   - attestation is packed; credential object is RO, ArrayBuffers must be casted to views (Uint8Array) before CBOR encoding
#   - packed attestation is sent to the server for registration
#   - server verifies the attestation and stores credential public key and association with the user
#
# authentication
#
# 1. create assertion
#   - client retrieves publicKeyCredentialRequestOption (pkcro) from server; state/challenge has to be preserved on the server side
#   - client/navigator calls authenticator with options to generate assertion
# 2. authenticate (using) assertion
#   - assertion is packed; credential is RO, ArrayBuffers must be casted to views (Uint8Array) before CBOR encoding
#   - packed assertion is sent to the server for authentication
#   - server validates the assertion (challenge, signature) against registered user credentials and performs logon process on success


@blueprint.route("/profile/webauthn/list.json", methods=["GET", "POST"])
@session_required("user")
def profile_webauthn_list_json_route():
    """get registered credentials list for current user"""

    columns = [
        ColumnDT(WebauthnCredential.id, mData="id", search_method="none", global_search=False),
        ColumnDT(WebauthnCredential.registered, mData="registered"),
        ColumnDT(WebauthnCredential.name, mData="name"),
        ColumnDT(literal_column("1"), mData="_buttons", search_method="none", global_search=False),
    ]
    query = (
        db.session.query()
        .select_from(WebauthnCredential)
        .filter(WebauthnCredential.user_id == current_user.id)
        .order_by(WebauthnCredential.registered.asc())
    )
    creds = DataTables(request.values.to_dict(), query, columns).output_result()
    return Response(json.dumps(creds, cls=SnerJSONEncoder), mimetype="application/json")


@blueprint.route("/profile/webauthn/pkcco", methods=["POST"])
@session_required("user")
def profile_webauthn_pkcco_route():
    """get publicKeyCredentialCreationOptions"""

    user = db.session.get(User, current_user.id)
    user_handle = random_string()
    exclude_credentials = webauthn_credentials(user)
    pkcco, state = webauthn.register_begin(
        {"id": user_handle.encode("utf-8"), "name": user.username, "displayName": user.username}, exclude_credentials
    )
    session["webauthn_register_user_handle"] = user_handle
    session["webauthn_register_state"] = state
    return Response(b64encode(cbor.encode(pkcco)).decode("utf-8"), mimetype="text/plain")


@blueprint.route("/profile/webauthn/register", methods=["POST"])
@blueprint.arguments(WebauthnRegisterRequest)
@blueprint.response(HTTPStatus.OK, MessageResponse)
@session_required("user")
def profile_webauthn_register_route(args):
    """register credential for current user"""

    user = db.session.get(User, current_user.id)

    try:
        attestation = cbor.decode(b64decode(args["attestation"]))
        auth_data = webauthn.register_complete(
            session.pop("webauthn_register_state"),
            CollectedClientData(attestation["clientDataJSON"]),
            AttestationObject(attestation["attestationObject"]),
        )

        db.session.add(
            WebauthnCredential(
                user_id=user.id,
                user_handle=session.pop("webauthn_register_user_handle"),
                credential_data=cbor.encode(auth_data.credential_data.__dict__),
                name=args["name"],
            )
        )
        db.session.commit()

        current_app.logger.info("auth.profile webauthn registered new credential")
        return jsonify({"message": "Webauthn credential registered successfully."})
    except (KeyError, ValueError) as exc:
        current_app.logger.exception(exc)
        return error_response(message="Error during registration.", code=HTTPStatus.INTERNAL_SERVER_ERROR)


@blueprint.route("/profile/webauthn/<webauthn_id>.json")
@blueprint.response(HTTPStatus.OK, WebauthnCredentialResponse)
@session_required("user")
def profile_webauthn_route(webauthn_id):
    """get registered credential"""

    cred = WebauthnCredential.query.filter(WebauthnCredential.user_id == current_user.id, WebauthnCredential.id == webauthn_id).one_or_none()

    if not cred:
        return error_response(message="Credential not found.", code=HTTPStatus.NOT_FOUND)

    return jsonify({"id": cred.id, "name": cred.name})


@blueprint.route("/profile/webauthn/edit/<webauthn_id>", methods=["POST"])
@blueprint.arguments(WebauthnEditRequest)
@blueprint.response(HTTPStatus.OK, MessageResponse)
@session_required("user")
def profile_webauthn_edit_route(args, webauthn_id):
    """edit registered credential"""

    cred = WebauthnCredential.query.filter(WebauthnCredential.user_id == current_user.id, WebauthnCredential.id == webauthn_id).one_or_none()

    if not cred:
        return error_response(message="Credential not found.", code=HTTPStatus.NOT_FOUND)

    cred.name = args["name"]
    db.session.commit()
    current_app.logger.info("auth.profile webauthn credential edited")
    return jsonify({"message": "Webauthn credential has been successfully edited."})


@blueprint.route("/profile/webauthn/delete/<webauthn_id>", methods=["POST"])
@blueprint.response(HTTPStatus.OK, MessageResponse)
@session_required("user")
def profile_webauthn_delete_route(webauthn_id):
    """delete registered credential"""

    cred = WebauthnCredential.query.filter(WebauthnCredential.user_id == current_user.id, WebauthnCredential.id == webauthn_id).one_or_none()

    if not cred:
        return error_response(message="Credential not found.", code=HTTPStatus.NOT_FOUND)

    db.session.delete(cred)
    db.session.commit()
    current_app.logger.info("auth.profile webauthn credential deleted")
    return jsonify({"message": "Webauthn credential has been successfully deleted."})


@blueprint.route("/profile/apikey/<action>", methods=["POST"])
@session_required("user")
def profile_apikey_route(action):
    """user manage apikey for self"""

    if action == "generate":
        return jsonify({"apikey": UserManager.apikey_generate(current_user)})

    if action == "revoke":
        UserManager.apikey_revoke(current_user)
        return jsonify({"message": "Apikey successfully revoked."})

    return error_response(message="Bad action.", code=HTTPStatus.BAD_REQUEST)

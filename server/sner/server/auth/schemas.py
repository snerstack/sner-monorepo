# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auth schema
"""

from ipaddress import ip_network

from marshmallow import Schema, ValidationError, validate, validates_schema
from marshmallow.fields import Boolean, DateTime, Email, Int, List, Str, String

from sner.server.password_supervisor import PasswordSupervisor as PWS
from sner.server.schemas import EmailNoneField, StringNoneField


def validate_strong_password(value):
    """validate password strength"""

    pwsr = PWS.check_strength(value)
    if not pwsr.is_strong:
        raise ValidationError(pwsr.message)


def validate_api_networks(value):
    """validate api_networks list config"""

    try:
        for item in value:
            ip_network(item)
    except ValueError as exc:
        raise ValidationError(f"Invalid network value: {str(exc)}") from exc


class LoginRequest(Schema):
    """login schema"""

    username = Str(required=True)
    password = String(load_only=True)


class UserAuthResponse(Schema):
    """user auth schema"""

    id = Int()
    username = Str()
    email = Str()
    full_name = Str()
    roles = List(Str())


class UserRequest(Schema):
    """user schema"""

    username = String(required=True, validate=validate.Length(min=1, max=250))
    email = EmailNoneField(allow_none=True, validate=validate.Length(max=250))
    full_name = StringNoneField(allow_none=True, validate=validate.Length(max=250))
    active = Boolean(dump_default=True)
    roles = List(String())
    new_password = StringNoneField(
        load_only=True,
        validate=[validate.Length(min=10), validate_strong_password],
        allow_none=True
    )
    api_networks = List(
        String(),
        validate=validate_api_networks
    )


class UserChangePasswordRequest(Schema):
    """user change password schema"""
    current_password = String(required=True, load_only=True)
    password1 = String(
        required=True,
        load_only=True,
        validate=[validate.Length(min=10), validate_strong_password]
    )
    password2 = String(required=True, load_only=True)

    @validates_schema
    def validate_passwords(self, data, **kwargs):  # pylint: disable=unused-argument
        """validate password match"""
        if data["password1"] != data["password2"]:
            raise ValidationError("Passwords do not match.", field_name="password2")


class UserMeResponse(Schema):
    """user me schema"""
    id = Int(dump_only=True)
    username = String(dump_only=True)
    email = Email(dump_only=True)
    roles = List(String(), dump_only=True)


class WebauthnLoginRequest(Schema):
    """webauthn login schema"""
    assertion = String(required=True)


class WebauthnRegisterRequest(Schema):
    """webauthn register schema"""
    attestation = String(required=True)
    name = String(validate=validate.Length(max=250))


class WebauthnEditRequest(Schema):
    """webauthn edit schema"""
    name = String(required=True, validate=validate.Length(max=250))


class WebauthnCredentialResponse(Schema):
    """webauthn credential schema"""
    id = Int(dump_only=True)
    name = String(dump_only=True)
    registered = DateTime(dump_only=True)


class ProfileResponse(Schema):
    """profile schema"""
    username = String(dump_only=True)
    email = Email(dump_only=True)
    full_name = String(dump_only=True)
    api_networks = List(String(), dump_only=True)
    has_apikey = Boolean(dump_only=True)
    has_totp = Boolean(dump_only=True)


class TotpCodeRequest(Schema):
    """totp code schema"""
    code = String(required=True, load_only=True)


class TotpProvisioningResponse(Schema):
    """totp provisioning schema"""
    provisioning_url = String(dump_only=True)
    secret = String(dump_only=True)

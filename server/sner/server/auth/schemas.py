# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auth schema
"""

from ipaddress import ip_network

from marshmallow import Schema, ValidationError, fields, validate, validates_schema

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

    username = fields.String(required=True)
    password = fields.String(load_only=True)


class UserAuthResponse(Schema):
    """user auth schema"""

    id = fields.Int()
    username = fields.String()
    email = fields.String()
    full_name = fields.String()
    roles = fields.List(fields.String())


class UserRequest(Schema):
    """user schema"""

    username = fields.String(required=True, validate=validate.Length(min=1, max=250))
    email = EmailNoneField(validate=validate.Length(max=250))
    full_name = StringNoneField(validate=validate.Length(max=250))
    active = fields.Boolean()
    roles = fields.List(fields.String())
    new_password = StringNoneField(load_only=True, validate=validate_strong_password)
    api_networks = fields.List(fields.String(), validate=validate_api_networks)


class UserChangePasswordRequest(Schema):
    """user change password schema"""

    current_password = fields.String(required=True, load_only=True)
    password1 = fields.String(required=True, load_only=True, validate=validate_strong_password)
    password2 = fields.String(required=True, load_only=True)

    @validates_schema
    def validate_passwords(self, data, **kwargs):  # pylint: disable=unused-argument
        """validate password match"""
        if data["password1"] != data["password2"]:
            raise ValidationError("Passwords do not match.", field_name="password2")


class UserMeResponse(Schema):
    """user me schema"""

    id = fields.Int()
    username = fields.String()
    email = fields.Email()
    roles = fields.List(fields.String())


class WebauthnLoginRequest(Schema):
    """webauthn login schema"""

    assertion = fields.String(required=True)


class WebauthnRegisterRequest(Schema):
    """webauthn register schema"""

    attestation = fields.String(required=True)
    name = fields.String(validate=validate.Length(max=250))


class WebauthnEditRequest(Schema):
    """webauthn edit schema"""

    name = fields.String(required=True, validate=validate.Length(max=250))


class WebauthnCredentialResponse(Schema):
    """webauthn credential schema"""

    id = fields.Int()
    name = fields.String()
    registered = fields.DateTime()


class ProfileResponse(Schema):
    """profile schema"""

    username = fields.String()
    email = fields.Email()
    full_name = fields.String()
    api_networks = fields.List(fields.String())
    has_apikey = fields.Boolean()
    has_totp = fields.Boolean()


class TotpCodeRequest(Schema):
    """totp code schema"""

    code = fields.String(required=True, load_only=True)


class TotpProvisioningResponse(Schema):
    """totp provisioning schema"""

    provisioning_url = fields.String()
    secret = fields.String()

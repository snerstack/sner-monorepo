# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
storage schema
"""

import ipaddress

from marshmallow import Schema, ValidationError, validate, validates_schema
from marshmallow.fields import Int, List, Nested, String

from sner.server.schema import StringNoneField
from sner.server.storage.models import Host, Service, SeverityEnum


def validate_ip_address(value):
    """validates whether the value is a valid IPv4 or IPv6 address"""
    if value:
        try:
            ipaddress.ip_address(value)
        except ValueError as exc:
            raise ValidationError("Invalid IP address format.") from exc


def host_id_exists(value):
    """validates whether the host ID exists"""
    if not Host.query.filter(Host.id == value).one_or_none():
        raise ValidationError("No such host")


def validate_service_belongs_to_host(data):
    """validates whether the service belongs to the host"""
    service_id = data.get('service_id')
    host_id = data.get('host_id')

    if service_id:
        service = Service.query.filter(Service.id == service_id).one_or_none()

        if not service:
            raise ValidationError("No such service", field_name="service_id")

        if host_id and service.host_id != host_id:
            raise ValidationError("Service does not belong to the host", field_name="service_id")


class HostSchema(Schema):
    """host schema"""
    address = StringNoneField(required=True, validate=validate_ip_address)
    hostname = StringNoneField(validate=validate.Length(max=256), allow_none=True)
    os = StringNoneField(allow_none=True)
    tags = List(String(), allow_none=True)
    comment = StringNoneField(allow_none=True)


class ServiceSchema(Schema):
    """service schema"""
    host_id = Int(required=True, validate=host_id_exists)
    proto = String(required=True, validate=validate.Length(min=1, max=250))
    port = Int(required=True, validate=validate.Range(min=0, max=65535))
    state = StringNoneField(validate=validate.Length(max=250), allow_none=True)
    name = StringNoneField(validate=validate.Length(max=250), allow_none=True)
    info = StringNoneField(allow_none=True)
    tags = List(String(), allow_none=True)
    comment = StringNoneField(allow_none=True)


class VulnSchema(Schema):
    """vulnerability schema"""
    host_id = Int(required=True, validate=host_id_exists)
    service_id = Int(allow_none=True)
    via_target = StringNoneField(validate=validate.Length(max=250), allow_none=True)
    name = String(required=True, validate=validate.Length(min=1, max=1000))
    xtype = StringNoneField(validate=validate.Length(max=250), allow_none=True)
    severity = String(required=True, validate=validate.OneOf([e.value for e in SeverityEnum]))
    descr = StringNoneField(allow_none=True)
    data = StringNoneField(allow_none=True)
    refs = List(String(), allow_none=True)
    tags = List(String(), allow_none=True)
    comment = StringNoneField(allow_none=True)

    @validates_schema
    def validate_service(self, data, **kwargs):  # pylint: disable=unused-argument
        """validates whether the service belongs to the host"""
        validate_service_belongs_to_host(data)


class NoteSchema(Schema):
    """note schema"""
    host_id = Int(required=True, validate=host_id_exists)
    service_id = Int(allow_none=True, load_default=None)
    via_target = StringNoneField(validate=validate.Length(max=250), allow_none=True)
    xtype = StringNoneField(validate=validate.Length(max=250), allow_none=True)
    data = StringNoneField(allow_none=True)
    tags = List(String(), allow_none=True)
    comment = StringNoneField(allow_none=True)

    @validates_schema
    def validate_service(self, data, **kwargs):  # pylint: disable=unused-argument
        """validates whether the service belongs to the host"""
        validate_service_belongs_to_host(data)


class MultiidSchema(Schema):
    """multi ID schema"""
    ids = List(Int(required=True), required=True, validate=validate.Length(min=1))


class TagMultiidSchema(Schema):
    """tag multi ID schema"""
    ids = List(Int(required=True), required=True, validate=validate.Length(min=1))
    tags = List(String(required=True), required=True, validate=validate.Length(min=1))
    action = String(required=True, validate=validate.OneOf(["set", "unset"]))


class TagMultiStringIdSchema(TagMultiidSchema):
    """tag multi string ID schema"""
    ids = List(String(required=True), validate=validate.Length(min=1))


class AnnotateSchema(Schema):
    """annotate schema"""
    tags = List(String(), allow_none=True)
    comment = StringNoneField(allow_none=True)


class EndpointSchema(Schema):
    """endpoint schema"""
    host_id = Int(required=True)
    service_id = Int(allow_none=True, load_default=None)


class VulnMulticopySchema(Schema):
    """vulnerability multicopy schema"""
    endpoints = List(Nested(EndpointSchema), required=True)
    name = StringNoneField(required=True, validate=validate.Length(min=1, max=1000))
    xtype = StringNoneField(validate=validate.Length(max=250), allow_none=True)
    severity = String(required=True, validate=validate.OneOf([e.value for e in SeverityEnum]))
    descr = StringNoneField(allow_none=True)
    data = StringNoneField(allow_none=True)
    refs = List(String(), allow_none=True)
    tags = List(String(), allow_none=True)
    comment = StringNoneField(allow_none=True)
    return_url = StringNoneField(load_only=True)

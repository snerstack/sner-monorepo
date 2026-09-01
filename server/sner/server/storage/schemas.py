# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
storage schema
"""

import ipaddress

from marshmallow import Schema, ValidationError, fields, validate, validates_schema

from sner.server.schemas import StringNoneField
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


class HostRequest(Schema):
    """host schema"""
    address = StringNoneField(required=True, allow_none=False, validate=validate_ip_address)
    hostname = StringNoneField(validate=validate.Length(max=256))
    os = StringNoneField()
    tags = fields.List(fields.String(), allow_none=True)
    comment = StringNoneField()


class ServiceRequest(Schema):
    """service schema"""
    host_id = fields.Int(required=True, validate=host_id_exists)
    proto = fields.String(required=True, validate=validate.Length(min=1, max=250))
    port = fields.Int(required=True, validate=validate.Range(min=0, max=65535))
    state = StringNoneField(validate=validate.Length(max=250))
    name = StringNoneField(validate=validate.Length(max=250))
    info = StringNoneField()
    tags = fields.List(fields.String(), allow_none=True)
    comment = StringNoneField()


class VulnRequest(Schema):
    """vulnerability schema"""
    host_id = fields.Int(required=True, validate=host_id_exists)
    service_id = fields.Int(allow_none=True)
    via_target = StringNoneField(validate=validate.Length(max=250))
    name = fields.String(required=True, validate=validate.Length(min=1, max=1000))
    xtype = StringNoneField(validate=validate.Length(max=250))
    severity = fields.String(required=True, validate=validate.OneOf([e.value for e in SeverityEnum]))
    descr = StringNoneField()
    data = StringNoneField()
    refs = fields.List(fields.String(), allow_none=True)
    tags = fields.List(fields.String(), allow_none=True)
    comment = StringNoneField()

    @validates_schema
    def validate_service(self, data, **kwargs):  # pylint: disable=unused-argument
        """validates whether the service belongs to the host"""
        validate_service_belongs_to_host(data)


class NoteRequest(Schema):
    """note schema"""
    host_id = fields.Int(required=True, validate=host_id_exists)
    service_id = fields.Int(allow_none=True, load_default=None)
    via_target = StringNoneField(validate=validate.Length(max=250))
    xtype = StringNoneField(validate=validate.Length(max=250))
    data = StringNoneField()
    tags = fields.List(fields.String(), allow_none=True)
    comment = StringNoneField()

    @validates_schema
    def validate_service(self, data, **kwargs):  # pylint: disable=unused-argument
        """validates whether the service belongs to the host"""
        validate_service_belongs_to_host(data)


class MultiidRequest(Schema):
    """multi ID schema"""
    ids = fields.List(fields.Int(required=True), required=True, validate=validate.Length(min=1))


class TagMultiidRequest(Schema):
    """tag multi ID schema"""
    ids = fields.List(fields.Int(required=True), required=True, validate=validate.Length(min=1))
    tags = fields.List(fields.String(required=True), required=True, validate=validate.Length(min=1))
    action = fields.String(required=True, validate=validate.OneOf(["set", "unset"]))


class TagMultiStringIdRequest(TagMultiidRequest):
    """tag multi string ID schema"""
    ids = fields.List(fields.String(required=True), validate=validate.Length(min=1))


class AnnotateRequest(Schema):
    """annotate schema"""
    tags = fields.List(fields.String(), allow_none=True)
    comment = StringNoneField()


class EndpointSchema(Schema):
    """endpoint schema"""
    host_id = fields.Int(required=True)
    service_id = fields.Int(allow_none=True, load_default=None)


class VulnMulticopyRequest(Schema):
    """vulnerability multicopy schema"""
    endpoints = fields.List(fields.Nested(EndpointSchema), required=True)
    name = StringNoneField(required=True, allow_none=False, validate=validate.Length(min=1, max=1000))
    xtype = StringNoneField(validate=validate.Length(max=250))
    severity = fields.String(required=True, validate=validate.OneOf([e.value for e in SeverityEnum]))
    descr = StringNoneField()
    data = StringNoneField()
    refs = fields.List(fields.String(), allow_none=True)
    tags = fields.List(fields.String(), allow_none=True)
    comment = StringNoneField()
    return_url = StringNoneField(load_only=True)

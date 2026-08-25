# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
storage.schemas tests
"""
import pytest
from marshmallow import ValidationError

from sner.server.storage.schemas import HostRequest, NoteRequest, VulnRequest


def test_host_schema_ip_validation():
    """test HostRequest IP address validation"""
    schema = HostRequest()

    with pytest.raises(ValidationError) as excinfo:
        schema.load({"address": "invalid-ip"})
    assert "Invalid IP address format." in excinfo.value.messages["address"]

    assert schema.load({"address": "127.0.0.1"})["address"] == "127.0.0.1"
    assert schema.load({"address": "2001:db8::1"})["address"] == "2001:db8::1"


def test_schemas_models_relations(app, service, host_factory):  # pylint: disable=unused-argument
    """test schemas models relations"""
    other_host = host_factory.create(address="127.0.0.2")

    for schema_cls in [VulnRequest, NoteRequest]:
        schema = schema_cls()

        base_data = {}
        if schema_cls == VulnRequest:
            base_data.update({"name": "test", "severity": "info"})

        # test non-existent host
        with pytest.raises(ValidationError) as excinfo:
            schema.load({**base_data, "host_id": 666})
        assert "No such host" in excinfo.value.messages["host_id"]

        # test non-existent service
        with pytest.raises(ValidationError) as excinfo:
            schema.load({**base_data, "host_id": service.host_id, "service_id": 666})
        assert "No such service" in excinfo.value.messages["service_id"]

        # test service belonging to a different host
        # both IDs exist, but they are not related
        wrong_relation_data = {
            **base_data,
            "host_id": other_host.id,
            "service_id": service.id
        }
        with pytest.raises(ValidationError) as excinfo:
            schema.load(wrong_relation_data)

        assert "Service does not belong to the host" in excinfo.value.messages["service_id"]

def test_empty_to_none_field():
    """test EmptyToNoneMixin behavior in StringNoneField"""
    schema = HostRequest()

    # empty string is converted to None (and allowed)
    data = schema.load({"address": "127.0.0.1", "os": ""})
    assert data["os"] is None

    # explicit JSON null is also accepted
    data = schema.load({"address": "127.0.0.1", "os": None})
    assert data["os"] is None

    # required field with allow_none=False rejects both empty string and None
    with pytest.raises(ValidationError) as excinfo:
        schema.load({"address": ""})
    assert "address" in excinfo.value.messages

    with pytest.raises(ValidationError) as excinfo2:
        schema.load({"address": None})
    assert "address" in excinfo2.value.messages

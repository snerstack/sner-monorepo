# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
storage.schemas tests
"""
import pytest
from marshmallow import ValidationError

from sner.server.storage.schemas import HostSchema, NoteSchema, VulnSchema


def test_host_schema_ip_validation():
    """test HostSchema IP address validation"""
    schema = HostSchema()

    with pytest.raises(ValidationError) as excinfo:
        schema.load({"address": "invalid-ip"})
    assert "Invalid IP address format." in excinfo.value.messages["address"]

    assert schema.load({"address": "127.0.0.1"})["address"] == "127.0.0.1"
    assert schema.load({"address": "2001:db8::1"})["address"] == "2001:db8::1"


def test_schemas_models_relations(app, service, host_factory):  # pylint: disable=unused-argument
    """test schemas models relations"""
    other_host = host_factory.create(address="127.0.0.2")

    for schema_cls in [VulnSchema, NoteSchema]:
        schema = schema_cls()

        base_data = {}
        if schema_cls == VulnSchema:
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

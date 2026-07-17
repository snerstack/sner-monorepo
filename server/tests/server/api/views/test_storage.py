# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
api.views tests
"""

import json
from datetime import datetime
from http import HTTPStatus

from flask import url_for

import sner.server.api.schema as api_schema


def test_v2_public_storage_host_route_nonetworks(api_user_nonetworks, host):
    """test queries with user without any configured networks"""

    response = api_user_nonetworks.post_json(url_for("api.v2_public_storage_host_route"), {"address": host.address}, status="*")
    assert response.status_code == HTTPStatus.FORBIDDEN


def test_v2_public_storage_host_route(api_user, host_factory, service_factory, service):
    """test public host api"""

    service_factory.create(host=host_factory.create(address="2001:db8::11"), proto="udp", port=0, state="open:test")
    host_factory.create(address="192.0.2.1")

    # ipv4
    response = api_user.post_json(url_for("api.v2_public_storage_host_route"), {"address": service.host.address})
    assert api_schema.PublicHostSchema().load(response.json)
    assert response.json["address"] == service.host.address
    assert len(response.json["services"]) == 1

    # ipv6
    response = api_user.post_json(url_for("api.v2_public_storage_host_route"), {"address": "2001:db8:0000::11"})
    assert api_schema.PublicHostSchema().load(response.json)
    assert response.json["address"] == "2001:db8::11"
    assert len(response.json["services"]) == 1

    # query not-allowed ip
    response = api_user.post_json(url_for("api.v2_public_storage_host_route"), {"address": "192.0.2.1"})
    assert not response.json


def test_v2_public_storage_host_route_morenotes(api_user, service, note_factory):
    """test public host api with host and service notes"""

    note_factory.create(host=service.host, xtype="xtest", data="host note data1")
    note_factory.create(host=service.host, service=service, xtype="xtest", data="service note data2")

    response = api_user.post_json(url_for("api.v2_public_storage_host_route"), {"address": service.host.address})
    assert len(response.json["notes"]) == 1
    assert len(response.json["services"][0]["notes"]) == 1


def test_v2_public_storage_range_route_nonetworks(api_user_nonetworks, host):
    """test queries with user without any configured networks"""

    response = api_user_nonetworks.post_json(url_for("api.v2_public_storage_range_route"), {"cidr": f"{host.address}/32"}, status="*")
    assert response.status_code == HTTPStatus.FORBIDDEN


def test_v2_public_storage_range_route(api_user, host_factory):
    """test public range api"""

    host_factory.create(address="127.0.1.1", rescan_time=datetime(1900, 1, 1, 0, 0))
    host_factory.create(address="127.0.2.1", rescan_time=datetime(1900, 1, 1, 0, 0))

    response = api_user.post_json(url_for("api.v2_public_storage_range_route"), {"cidr": "127.0.0.0/8"})
    assert api_schema.PublicRangeSchema(many=True).load(response.json)
    assert len(response.json) == 2
    assert response.json[0]["rescan_time"] == "1900-01-01T00:00:00"


def test_v2_public_storage_servicelist_route_nonetworks(api_user_nonetworks, service):
    """test queries with user without any configured networks"""

    response = api_user_nonetworks.post_json(
        url_for("api.v2_public_storage_servicelist_route"), {"filter": f'Service.port=="{service.port}"'}, status="*"
    )
    assert response.status_code == HTTPStatus.FORBIDDEN


def test_v2_public_storage_servicelist_route(api_user, service_factory):
    """test public servicelist api"""

    service_factory.create(port=1)
    service_factory.create(port=2)

    response = api_user.post_json(url_for("api.v2_public_storage_servicelist_route"), {"filter": 'Service.port=="1"'})
    assert api_schema.PublicServicelistSchema(many=True).load(response.json)
    assert len(response.json) == 1


def test_v2_public_storage_servicelist_route_filterqueryerror(api_user):
    """test public servicelist api, triggers FilterQueryError app handler"""

    response = api_user.post_json(url_for("api.v2_public_storage_servicelist_route"), {"filter": "invalid"}, status="*")
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_v2_public_storage_vulnlist_route_nonetworks(api_user_nonetworks, vuln):
    """test queries with user without any configured networks"""

    response = api_user_nonetworks.post_json(url_for("api.v2_public_storage_vulnlist_route"), {"filter": f'Vuln.name=="{vuln.name}"'}, status="*")
    assert response.status_code == HTTPStatus.FORBIDDEN


def test_v2_public_storage_vulnlist_route(api_user, vuln_factory):
    """test public vulnlist api"""

    vuln_factory.create(name="dummy1")
    vuln_factory.create(name="dummy2")

    response = api_user.post_json(url_for("api.v2_public_storage_vulnlist_route"), {"filter": 'Vuln.name=="dummy2"'})
    assert api_schema.PublicVulnlistSchema(many=True).load(response.json)
    assert len(response.json) == 1


def test_v2_public_storage_notelist_route_nonetworks(api_user_nonetworks, note):
    """test queries with user without any configured networks"""

    response = api_user_nonetworks.post_json(url_for("api.v2_public_storage_notelist_route"), {"filter": f'Note.xtype=="{note.xtype}"'}, status="*")
    assert response.status_code == HTTPStatus.FORBIDDEN


def test_v2_public_storage_notelist_route(api_user, note_factory):
    """test public notelist api"""

    note_factory.create(data="dummy1")
    note_factory.create(data="dummy2")

    response = api_user.post_json(url_for("api.v2_public_storage_notelist_route"), {"filter": 'Note.data=="dummy1"'})
    assert api_schema.PublicNotelistSchema(many=True).load(response.json)
    assert len(response.json) == 1


def test_v2_public_storage_versioninfo_route_nonetworks(api_user_nonetworks, versioninfo):  # pylint: disable=unused-argument
    """test queries with user without any configured networks"""

    response = api_user_nonetworks.post_json(url_for("api.v2_public_storage_versioninfo_route"), status="*")
    assert response.status_code == HTTPStatus.FORBIDDEN


def test_v2_public_storage_versioninfo_route(api_user, versioninfo):  # pylint: disable=unused-argument
    """test public versioninfo query api"""

    response = api_user.post_json(url_for("api.v2_public_storage_versioninfo_route"))
    assert api_schema.PublicVersioninfoSchema(many=True).load(response.json)
    assert len(response.json) == 1

    response = api_user.post_json(url_for("api.v2_public_storage_versioninfo_route"), {"product": "DuMmY", "versionspec": ">1.0"})
    assert api_schema.PublicVersioninfoSchema(many=True).load(response.json)
    assert len(response.json) == 1
    assert response.json[0]["product"] == "dummy product"
    assert response.json[0]["timestamp"]

    response = api_user.post_json(url_for("api.v2_public_storage_versioninfo_route"), {"product": "dummy", "versionspec": "<1.0"})
    assert len(response.json) == 0


def test_v2_public_storage_auror_route(api_user_auror, host_factory, service_factory, note_factory):
    """test public auror api"""

    def _result_for_hostname(results, hostname):
        return next(filter(lambda item: item["input"]["hostname"] == hostname, results))

    host1 = host_factory.create(address="127.8.1.11")
    service1 = service_factory.create(host=host1, proto="tcp", port=1111, state="open:testing")
    note_factory.create(host=host1, xtype="auror.hostnames", data='["phony.hostname"]')
    note_factory.create(
        host=host1,
        service=service1,
        xtype="auror.testssl.explicit",
        data=json.dumps({"auror_data": {"data": "dummy"}}),
        via_target="phony.hostname",
    )

    host2 = host_factory.create(address="127.8.1.12", hostname=None)
    service_factory.create(host=host2, proto="tcp", port=2222, state="closed:testing")

    response = api_user_auror.post_json(url_for("api.v2_public_storage_auror_route"))
    assert len(response.json) == 3

    hostnames = list(item["input"]["hostname"] for item in response.json)
    assert "localhost.localdomain" in hostnames
    assert "phony.hostname" in hostnames
    assert "127.8.1.12" in hostnames

    all_results = response.json
    assert "tls_scan" not in _result_for_hostname(all_results, "localhost.localdomain")
    assert "tls_scan" not in _result_for_hostname(all_results, "127.8.1.12")

    result = _result_for_hostname(all_results, "phony.hostname")
    assert isinstance(result["tls_scan"], dict)
    assert result["tls_scan"]["data"] == "dummy"

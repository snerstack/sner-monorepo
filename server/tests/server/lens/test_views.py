# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
lens.views tests
"""

import json
from http import HTTPStatus

import pytest
from flask import url_for

from sner.server.lens.views import check_dt_errors
from sner.server.utils import FilterQueryError

DTARGUMENTS = {"draw": 1, "start": 0, "length": 100}


def test_check_dt_errors_with_error(app):  # pylint: disable=unused-arguments
    """check_dt_errors, error condition"""

    resultset = {"error": "Some error occurred\nMore details"}
    with pytest.raises(FilterQueryError, match="Some error occurred") as exc_info:
        check_dt_errors(resultset)
        assert str(exc_info.value) == "Some error occurred"


def test_host_view_json_route(cl_user, host_permitted, host_denied):
    """host json route test"""

    response = cl_user.get(url_for("lens.host_view_json_route", host_id=host_permitted.id))
    assert response.status_code == HTTPStatus.OK

    response = cl_user.get(url_for("lens.host_view_json_route", host_id=host_denied.id), status="*")
    assert response.status_code == HTTPStatus.NOT_FOUND

    response = cl_user.get(url_for("lens.host_view_json_route", host_id=-1), status="*")
    assert response.status_code == HTTPStatus.NOT_FOUND


def test_host_list_json_route(cl_user, host_permitted, host_denied):
    """host list json route test"""

    response = cl_user.post(url_for("lens.host_list_json_route"), DTARGUMENTS)
    assert response.status_code == HTTPStatus.OK

    assert len(response.json["data"]) == 1
    assert response.json["data"][0]["address"] == host_permitted.address


def test_host_list_json_route_filtering(cl_user, host_factory):
    """host list json route filtering test"""

    host1 = host_factory.create(address="127.6.0.1")
    host2 = host_factory.create(address="127.6.0.2")
    address_filter = {"combinator": "and", "rules": [{"field": "Host.address", "operator": "==", "value": host1.address}]}

    # test filter
    response = cl_user.post(url_for("lens.host_list_json_route", jsonfilter=json.dumps(address_filter)), DTARGUMENTS)
    assert response.status_code == HTTPStatus.OK
    assert len(response.json["data"]) == 1
    assert response.json["data"][0]["address"] == host1.address

    # test not filter
    address_filter["not"] = True
    response = cl_user.post(url_for("lens.host_list_json_route", jsonfilter=json.dumps(address_filter)), DTARGUMENTS)
    assert response.status_code == HTTPStatus.OK
    assert len(response.json["data"]) == 1
    assert response.json["data"][0]["address"] == host2.address

    # test empty filter
    empty_filter = {"combinator": "and", "rules": []}
    response = cl_user.post(url_for("lens.host_list_json_route", jsonfilter=json.dumps(empty_filter)), DTARGUMENTS)
    assert response.status_code == HTTPStatus.OK
    assert len(response.json["data"]) == 2


def test_host_list_json_route_filteringerrors(cl_user):
    """host list json route filtering error handling"""

    # invalid json
    response = cl_user.post(url_for("lens.host_list_json_route", jsonfilter="invalid{json"), DTARGUMENTS, status="*")
    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "Expecting value" in response.json["error"]["message"]

    # invalid filter
    response = cl_user.post(url_for("lens.host_list_json_route", jsonfilter=json.dumps({"dummy": 1})), DTARGUMENTS, status="*")
    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "Invalid filter" in response.json["error"]["message"]

    # invalid address filter
    invalid_address_filter = {"combinator": "and", "rules": [{"field": "Host.address", "operator": "inet_in", "value": "invalidaddress"}]}
    response = cl_user.post(url_for("lens.host_list_json_route", jsonfilter=json.dumps(invalid_address_filter)), DTARGUMENTS, status="*")
    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "invalid input syntax for type inet" in response.json["error"]["message"]


def test_service_list_json_route(cl_user, host_permitted, host_denied, service_factory):
    """service list json route test"""

    service_permitted = service_factory.create(host=host_permitted, port=111)
    service_factory.create(host=host_denied, port=222)

    response = cl_user.post(url_for("lens.service_list_json_route"), DTARGUMENTS)
    assert response.status_code == HTTPStatus.OK

    assert len(response.json["data"]) == 1
    assert response.json["data"][0]["port"] == service_permitted.port


def test_vuln_list_json_route(cl_user, host_permitted, host_denied, service_factory, vuln_factory):
    """vuln list json route test"""

    service_permitted = service_factory.create(host=host_permitted, port=111)
    service_denied = service_factory.create(host=host_denied, port=222)

    vuln_permitted = vuln_factory.create(host=host_permitted, service=service_permitted, name="vuln1")
    vuln_factory.create(host=host_denied, service=service_denied, name="vuln2")

    response = cl_user.post(url_for("lens.vuln_list_json_route"), DTARGUMENTS)
    assert response.status_code == HTTPStatus.OK

    assert len(response.json["data"]) == 1
    assert response.json["data"][0]["name"] == vuln_permitted.name


def test_overview_json_route(cl_user, host_permitted, host_denied, service_factory, vuln_factory):
    """overview json route test"""

    service_permitted = service_factory.create(host=host_permitted, port=111)
    service_denied = service_factory.create(host=host_denied, port=222)

    vuln_factory.create(host=host_permitted, service=service_permitted, name="vuln_critical", severity="critical")
    vuln_factory.create(host=host_permitted, service=service_permitted, name="vuln_high", severity="high")
    vuln_factory.create(host=host_denied, service=service_denied, name="vuln_denied", severity="critical")

    response = cl_user.get(url_for("lens.overview_json_route"))
    assert response.status_code == HTTPStatus.OK

    assert response.json["objects"]["hosts"] == 1
    assert response.json["objects"]["services"] == 1
    assert response.json["objects"]["vulns"] == 2

    assert response.json["vuln_severities"]["critical"] == 1
    assert response.json["vuln_severities"].get("unknown") is None

    assert response.json["allowed_networks"] == ["127.0.0.0/8", "2001:db8::/32"]


def test_routes_user_nonetworks(cl_user_nonetworks, vuln):
    """test all lens routes with user with no api_networks allowed"""

    response = cl_user_nonetworks.get(url_for("lens.overview_json_route"), status="*")
    assert response.status_code == HTTPStatus.FORBIDDEN

    response = cl_user_nonetworks.get(url_for("lens.host_view_json_route", host_id=vuln.host.id), status="*")
    assert response.status_code == HTTPStatus.FORBIDDEN

    response = cl_user_nonetworks.post(url_for("lens.host_list_json_route"), DTARGUMENTS, status="*")
    assert response.status_code == HTTPStatus.FORBIDDEN

    response = cl_user_nonetworks.get(url_for("lens.service_list_json_route"), DTARGUMENTS, status="*")
    assert response.status_code == HTTPStatus.FORBIDDEN

    response = cl_user_nonetworks.get(url_for("lens.vuln_list_json_route"), DTARGUMENTS, status="*")
    assert response.status_code == HTTPStatus.FORBIDDEN

    response = cl_user_nonetworks.get(url_for("lens.versioninfo_list_json_route"), DTARGUMENTS, status="*")
    assert response.status_code == HTTPStatus.FORBIDDEN


def prepare_versioninfo_testdata(factory, host, service, product, version):
    """create versioninfo testdata"""

    return factory.create(
        host_id=host.id,
        host_address=host.address,
        host_hostname=host.hostname,
        service_proto=service.proto if service else None,
        service_port=service.port if service else None,
        product=product,
        version=version,
    )


def test_versioninfo_list_json_route(cl_user, host_permitted, host_denied, versioninfo_factory):
    """versioninfo list json route test"""

    versioninfo_permitted = prepare_versioninfo_testdata(versioninfo_factory, host_permitted, None, "apache", "2.4.37")
    prepare_versioninfo_testdata(versioninfo_factory, host_denied, None, "nginx", "1.16.4")

    response = cl_user.post(url_for("lens.versioninfo_list_json_route"), DTARGUMENTS)
    assert len(response.json["data"]) == 1
    assert response.json["data"][0]["version"] == versioninfo_permitted.version


def test_versioninfo_list_json_invalid_versionspec(cl_operator):
    """versioninfo list_json route test, invalid versionspec"""

    response = cl_operator.post(
        url_for(
            "lens.versioninfo_list_json_route",
            jsonfilter=json.dumps(
                {
                    "combinator": "and",
                    "rules": [
                        {"field": "Versioninfo.product", "operator": "==", "valueSource": "value", "value": "dummy"},
                        {"field": "Versioninfo.version", "operator": "==", "valueSource": "value", "value": "invalid"},
                    ],
                }
            ),
        ),
        DTARGUMENTS,
        status="*",
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert 'Invalid version format: "invalid"' in response.json["error"]["message"]


def test_versioninfo_list_json_route_query(cl_operator, service_factory, versioninfo_factory):
    """versioninfo list_json route query test"""

    service1 = service_factory.create(port=1)
    expected_versioninfo = prepare_versioninfo_testdata(versioninfo_factory, service1.host, service1, "apache httpd", "2.4.37")

    service3 = service_factory.create(port=2)
    prepare_versioninfo_testdata(versioninfo_factory, service3.host, service3, "nginx", "1.16.1")

    response = cl_operator.get(
        url_for(
            "lens.versioninfo_list_json_route",
            jsonfilter=json.dumps(
                {
                    "combinator": "and",
                    "rules": [
                        {"field": "Versioninfo.product", "operator": "==", "valueSource": "value", "value": expected_versioninfo.product},
                        {"field": "Versioninfo.version", "operator": ">=", "valueSource": "value", "value": expected_versioninfo.version},
                    ],
                }
            ),
        ),
        DTARGUMENTS,
    )

    assert len(response.json["data"]) == 1
    assert response.json["data"][0]["product"] == expected_versioninfo.product
    assert response.json["data"][0]["version"] == expected_versioninfo.version

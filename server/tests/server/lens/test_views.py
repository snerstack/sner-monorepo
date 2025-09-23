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


DTARGUMENTS = {'draw': 1, 'start': 0, 'length': 100}


def test_check_dt_errors_with_error(app):  # pylint: disable=unused-arguments
    """check_dt_errors, error condition"""

    resultset = {"error": "Some error occurred\nMore details"}
    with pytest.raises(FilterQueryError, match="Some error occurred") as exc_info:
        check_dt_errors(resultset)
        assert str(exc_info.value) == "Some error occurred"


def test_host_view_json_route(cl_user, host_permitted, host_denied):
    """host json route test"""

    response = cl_user.get(url_for('lens.host_view_json_route', host_id=host_permitted.id))
    assert response.status_code == HTTPStatus.OK

    response = cl_user.get(url_for('lens.host_view_json_route', host_id=host_denied.id), status="*")
    assert response.status_code == HTTPStatus.NOT_FOUND

    response = cl_user.get(url_for('lens.host_view_json_route', host_id=-1), status="*")
    assert response.status_code == HTTPStatus.NOT_FOUND


def test_host_list_json_route(cl_user, host_permitted, host_denied):
    """host list json route test"""

    response = cl_user.post(url_for('lens.host_list_json_route'), DTARGUMENTS)
    assert response.status_code == HTTPStatus.OK

    assert len(response.json['data']) == 1
    assert response.json['data'][0]['address'] == host_permitted.address


def test_host_list_json_route_filtering(cl_user, host_factory):
    """host list json route filtering test"""

    host1 = host_factory.create(address="127.6.0.1")
    host2 = host_factory.create(address="127.6.0.2")
    address_filter = {"combinator": "and", "rules": [{"field": "Host.address", "operator": "==", "value": host1.address}]}

    # test filter
    response = cl_user.post(
        url_for('lens.host_list_json_route', jsonfilter=json.dumps(address_filter)),
        DTARGUMENTS
    )
    assert response.status_code == HTTPStatus.OK
    assert len(response.json['data']) == 1
    assert response.json['data'][0]['address'] == host1.address

    # test not filter
    address_filter["not"] = True
    response = cl_user.post(
        url_for('lens.host_list_json_route', jsonfilter=json.dumps(address_filter)),
        DTARGUMENTS
    )
    assert response.status_code == HTTPStatus.OK
    assert len(response.json['data']) == 1
    assert response.json['data'][0]['address'] == host2.address

    # test empty filter
    empty_filter = {"combinator": "and", "rules": []}
    response = cl_user.post(
        url_for('lens.host_list_json_route', jsonfilter=json.dumps(empty_filter)),
        DTARGUMENTS
    )
    assert response.status_code == HTTPStatus.OK
    assert len(response.json['data']) == 2


def test_host_list_json_route_filteringerrors(cl_user):
    """host list json route filtering error handling"""

    # invalid json
    response = cl_user.post(
        url_for('lens.host_list_json_route', jsonfilter="invalid{json"),
        DTARGUMENTS,
        status="*"
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "Expecting value" in response.json["error"]["message"]

    # invalid filter
    response = cl_user.post(
        url_for('lens.host_list_json_route', jsonfilter=json.dumps({"dummy": 1})),
        DTARGUMENTS,
        status="*"
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "Invalid filter" in response.json["error"]["message"]

    # invalid address filter
    invalid_address_filter = {"combinator": "and", "rules": [{"field": "Host.address", "operator": "inet_in", "value": "invalidaddress"}]}
    response = cl_user.post(
        url_for(
            'lens.host_list_json_route',
            jsonfilter=json.dumps(invalid_address_filter)
        ),
        DTARGUMENTS,
        status="*"
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "invalid input syntax for type inet" in response.json["error"]["message"]


def test_service_list_json_route(cl_user, host_permitted, host_denied, service_factory):
    """service list json route test"""

    service_permitted = service_factory.create(host=host_permitted, port=111)
    service_factory.create(host=host_denied, port=222)

    response = cl_user.post(url_for('lens.service_list_json_route'), DTARGUMENTS)
    assert response.status_code == HTTPStatus.OK

    assert len(response.json['data']) == 1
    assert response.json['data'][0]['port'] == service_permitted.port


def test_vuln_list_json_route(cl_user, host_permitted, host_denied, service_factory, vuln_factory):
    """vuln list json route test"""

    service_permitted = service_factory.create(host=host_permitted, port=111)
    service_denied = service_factory.create(host=host_denied, port=222)

    vuln_permitted = vuln_factory.create(host=host_permitted, service=service_permitted, name="vuln1")
    vuln_factory.create(host=host_denied, service=service_denied, name="vuln2")

    response = cl_user.post(url_for('lens.vuln_list_json_route'), DTARGUMENTS)
    assert response.status_code == HTTPStatus.OK

    assert len(response.json['data']) == 1
    assert response.json['data'][0]['name'] == vuln_permitted.name


def test_versioninfo_list_json_route(cl_user, host_permitted, host_denied, service_factory, versioninfo_factory):
    """versioninfo list json route test"""

    service_permitted = service_factory.create(host=host_permitted, port=111)
    service_denied = service_factory.create(host=host_denied, port=222)

    versioninfo_permitted = versioninfo_factory.create(
        host_id=host_permitted.id,
        host_address=host_permitted.address,
        host_hostname=host_permitted.hostname,
        service_proto=service_permitted.proto,
        service_port=service_permitted.port,
        product='apache httpd',
        version='2.4.37',
    )

    versioninfo_factory.create(
        host_id=host_denied.id,
        host_address=host_denied.address,
        host_hostname=host_denied.hostname,
        service_proto=service_denied.proto,
        service_port=service_denied.port,
        product='nginx',
        version='1.16.1',
    )

    response = cl_user.post(url_for('lens.versioninfo_list_json_route'), DTARGUMENTS)
    assert response.status_code == HTTPStatus.OK

    assert len(response.json['data']) == 1
    assert response.json['data'][0]['version'] == versioninfo_permitted.version


def test_versioninfo_list_json_invalid_versionspec(cl_operator):
    """versioninfo list_json route test, invalid versionspec"""

    response = cl_operator.post(
        url_for(
            'lens.versioninfo_list_json_route',
            product='dummy',
            versionspec='invalid'
        ),
        DTARGUMENTS,
        status="*"
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert 'Invalid format: version specifier "invalid" does not meet the format criteria.' in response.json["error"]["message"]


def test_versioninfo_list_json_route_query(cl_operator, service_factory, versioninfo_factory):
    """versioninfo list_json route query test"""

    service1 = service_factory.create(port=1)
    expected_versioninfo = versioninfo_factory.create(
        host_id=service1.host.id,
        host_address=service1.host.address,
        host_hostname=service1.host.hostname,
        service_proto=service1.proto,
        service_port=service1.port,
        product='apache httpd',
        version='2.4.37'
    )

    service2 = service_factory.create(port=2)
    expected_versioninfo2 = versioninfo_factory.create(
        host_id=service2.host.id,
        host_address=service2.host.address,
        host_hostname=service2.host.hostname,
        service_proto=service2.proto,
        service_port=service2.port,
        product='apache httpd',
        version='2.4.38'
    )

    service3 = service_factory.create(port=3)
    versioninfo_factory.create(
        host_id=service3.host.id,
        host_address=service3.host.address,
        host_hostname=service3.host.hostname,
        service_proto=service3.proto,
        service_port=service3.port,
        product='nginx',
        version='1.16.1'
    )

    response = cl_operator.get(
        url_for(
            'lens.versioninfo_list_json_route',
            product=expected_versioninfo.product,
            versionspec=f'>={expected_versioninfo.version}'
        ),
        {'draw': 1, 'start': 1, 'length': 1}
    )

    assert response.status_code == HTTPStatus.OK
    response_data = json.loads(response.body.decode('utf-8'))
    assert len(response_data['data']) == 1
    assert response_data['data'][0]['product'] == expected_versioninfo2.product
    assert response_data['data'][0]['version'] == expected_versioninfo2.version

# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
storage.views.versioninfo tests
"""

import json
from http import HTTPStatus

from flask import url_for

from tests.server.storage.models import prepare_versioninfo_testdata
from tests.server.storage.views import check_annotate, check_tag_multiid

DTARGUMENTS = {"draw": 1, "start": 0, "length": 100}


def test_versioninfo_list_json_route(cl_operator, versioninfo):
    """versioninfo list_json route test"""

    expected_product = versioninfo.product

    response = cl_operator.post(
        url_for("storage.versioninfo_list_json_route"), {"draw": 1, "start": 0, "length": 1, "search[value]": expected_product}
    )
    assert response.status_code == HTTPStatus.OK
    response_data = json.loads(response.body.decode("utf-8"))
    assert response_data["data"][0]["product"] == expected_product

    response = cl_operator.post(
        url_for(
            "storage.versioninfo_list_json_route", filter=f'Versioninfo.product=="{expected_product}"', product=expected_product, versionspec=">0"
        ),
        DTARGUMENTS,
    )
    assert response.status_code == HTTPStatus.OK
    response_data = json.loads(response.body.decode("utf-8"))
    assert response_data["data"][0]["product"] == expected_product


def test_versioninfo_list_json_route_query_form_paging(cl_operator, service_factory, versioninfo_factory):
    """versioninfo list_json route test"""

    service1 = service_factory.create(port=1)
    prepare_versioninfo_testdata(versioninfo_factory, service1.host, service1, "apache httpd", "1.0")
    service2 = service_factory.create(port=2)
    prepare_versioninfo_testdata(versioninfo_factory, service2.host, service1, "apache httpd", "1.2")
    service3 = service_factory.create(port=3)
    prepare_versioninfo_testdata(versioninfo_factory, service3.host, service1, "apache httpd", "1.2")

    response = cl_operator.post(url_for("storage.versioninfo_list_json_route", product="ApAcHe", versionspec=">=1.1"), {**DTARGUMENTS, "start": 1})
    assert response.status_code == HTTPStatus.OK
    assert len(response.json["data"]) == 1
    assert response.json["data"][0]["version"] == "1.2"


def test_versioninfo_list_json_route_errorhandling(cl_operator):
    """versioninfo list_json error handling route test"""

    response = cl_operator.post(url_for("storage.versioninfo_list_json_route", product="dummy", versionspec="invalid"), DTARGUMENTS, status="*")
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_versioninfo_tag_multiid_route(cl_operator, versioninfo):
    """versioninfo multi tag route for ajaxed toolbars test"""

    check_tag_multiid(cl_operator, "storage.versioninfo_tag_multiid_route", versioninfo)


def test_versioninfo_annotate_route(cl_operator, versioninfo):
    """versioninfo annotate route test"""

    check_annotate(cl_operator, "storage.versioninfo_annotate_route", versioninfo)

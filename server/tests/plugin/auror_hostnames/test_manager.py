# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auror_hostnames plugin agreegate manager tests
"""

import pytest

from sner.plugin.auror_hostnames.manager import AgreegateApiError, AgreegateManager

APIKEY = "dummy-apikey"


def test_apicall(httpserver):
    """apicall sends the api key header and returns decoded json body"""

    httpserver.expect_request("/dummy", headers={"X-API-KEY": APIKEY}).respond_with_json({"result": "ok"})

    assert AgreegateManager(httpserver.url_for(""), APIKEY).apicall("GET", "/dummy") == {"result": "ok"}


def test_apicall_failure(httpserver):
    """apicall raises AgreegateApiError on non-OK status"""

    httpserver.expect_request("/fail").respond_with_data("error message text", status=500)

    with pytest.raises(AgreegateApiError, match="agreegate apicall failed"):
        AgreegateManager(httpserver.url_for(""), APIKEY).apicall("POST", "/fail")


def test_from_env(monkeypatch):
    """from_env initializes manager from environment variables"""

    monkeypatch.setenv("SNER_AGREEGATE_URL", "https://agreegate.example/")
    monkeypatch.setenv("SNER_AGREEGATE_APIKEY", APIKEY)

    manager = AgreegateManager.from_env()

    assert manager.url == "https://agreegate.example"
    assert manager.apikey == APIKEY


def test_from_env_missing_url(monkeypatch):
    """from_env fails when URL env var is not set"""

    monkeypatch.delenv("SNER_AGREEGATE_URL", raising=False)

    with pytest.raises(AgreegateApiError, match="missing SNER_AGREEGATE_URL"):
        AgreegateManager.from_env()


def test_from_env_missing_apikey(monkeypatch):
    """from_env fails when API key env var is not set"""

    monkeypatch.setenv("SNER_AGREEGATE_URL", "https://agreegate.example")
    monkeypatch.delenv("SNER_AGREEGATE_APIKEY", raising=False)

    with pytest.raises(AgreegateApiError, match="missing SNER_AGREEGATE_APIKEY"):
        AgreegateManager.from_env()


def test_get_all_groups(httpserver):
    """get_all_groups returns validated Group objects"""

    groups_payload = [{"id": 1, "name": "group1", "description": "desc", "allowed_networks": ["127.0.0.0/8"]}]
    httpserver.expect_request("/api/v1/groups", headers={"X-API-KEY": APIKEY}).respond_with_json(groups_payload)

    result = AgreegateManager(httpserver.url_for(""), APIKEY).get_all_groups(only_with_dns_source=True)

    assert len(result) == 1
    assert result[0].name == "group1"


def test_get_all_groups_validation_error(httpserver):
    """get_all_groups raises AgreegateApiError on invalid payload"""

    httpserver.expect_request("/api/v1/groups").respond_with_json([{"invalid": "shape"}])

    with pytest.raises(AgreegateApiError, match="groups response validation failed"):
        AgreegateManager(httpserver.url_for(""), APIKEY).get_all_groups()


def test_get_group_dns_sources(httpserver):
    """get_group_dns_sources returns validated list of source dictionaries"""

    dns_sources_payload = [{"type": "AXFR", "dns_server": "ns.example.org"}]
    httpserver.expect_request("/api/v1/group/1/dns_sources").respond_with_json(dns_sources_payload)

    assert AgreegateManager(httpserver.url_for(""), APIKEY).get_group_dns_sources(1) == dns_sources_payload


def test_get_group_dns_sources_unwraps_dict_payload(httpserver):
    """get_group_dns_sources unwraps the dns_sources key from a dict response"""

    payload = {"dns_sources": [{"type": "HTTPS", "http_url": "https://zones.example.com/archive.zip"}]}
    httpserver.expect_request("/api/v1/group/1/dns_sources").respond_with_json(payload)

    assert AgreegateManager(httpserver.url_for(""), APIKEY).get_group_dns_sources(1) == payload["dns_sources"]


def test_get_group_dns_sources_requires_group_id():
    """get_group_dns_sources validates required group_id"""

    with pytest.raises(ValueError, match="group_id is required"):
        AgreegateManager("https://agreegate.example", APIKEY).get_group_dns_sources(None)

    with pytest.raises(ValueError, match="group_id is required"):
        AgreegateManager("https://agreegate.example", APIKEY).get_group_dns_sources("   ")


def test_get_group_dns_sources_validation_error(httpserver):
    """get_group_dns_sources raises AgreegateApiError on invalid payload"""

    httpserver.expect_request("/api/v1/group/1/dns_sources").respond_with_json({"invalid": "shape"})

    with pytest.raises(AgreegateApiError, match="group dns_sources response validation failed"):
        AgreegateManager(httpserver.url_for(""), APIKEY).get_group_dns_sources(1)

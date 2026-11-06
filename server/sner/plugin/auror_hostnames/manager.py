# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner auror_hostnames agreegate api manager module
"""

import os
from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import requests
from pydantic import BaseModel, Field, TypeAdapter, ValidationError


class AgreegateApiError(Exception):
    """agreegate api call or payload validation error"""


class Group(BaseModel):
    """Group model returned by AgreeGate API"""

    id: int
    name: str
    description: str | None = None
    external_id: str | None = None
    allowed_networks: list[str] = Field(default_factory=list)


GROUPS_RESPONSE_ADAPTER = TypeAdapter(list[Group])
DNS_SOURCES_RESPONSE_ADAPTER = TypeAdapter(list[dict[str, Any]])


class AgreegateManager:
    """AgreeGate API client for the auror_hostnames plugin"""

    def __init__(self, url, apikey):
        self.url = url.rstrip("/")
        self.apikey = apikey

    @classmethod
    def from_env(cls, url_envname="SNER_AGREEGATE_URL", apikey_envname="SNER_AGREEGATE_APIKEY"):
        """factory, initialize from environment variables"""

        url = os.environ.get(url_envname)
        apikey = os.environ.get(apikey_envname)
        if not url:
            raise AgreegateApiError(f"missing {url_envname} environment variable")
        if not apikey:
            raise AgreegateApiError(f"missing {apikey_envname} environment variable")
        return cls(url, apikey)

    def apicall(self, method, url, **kwargs):
        """make an authenticated AgreeGate API call and return decoded JSON body"""

        response = requests.request(
            method,
            f"{self.url}{url}",
            headers={"X-API-KEY": self.apikey},
            timeout=60,
            **kwargs,
        )

        if response.status_code != HTTPStatus.OK:
            raise AgreegateApiError(f"agreegate apicall failed, status={response.status_code}, body={response.text}")

        return response.json()

    def get_all_groups(self, only_with_dns_source=False):
        """fetch and validate all groups"""

        response_json = self.apicall("GET", "/api/v1/groups", params={"only_with_dns_source": only_with_dns_source})
        try:
            return GROUPS_RESPONSE_ADAPTER.validate_python(response_json)
        except ValidationError as exc:
            raise AgreegateApiError(f"groups response validation failed: {exc}") from exc

    def get_group_dns_sources(self, group_id):
        """fetch and validate DNS sources for a required group_id"""

        if group_id is None or str(group_id).strip() == "":
            raise ValueError("group_id is required")

        group_id_escaped = quote(str(group_id), safe="")
        response_json = self.apicall("GET", f"/api/v1/group/{group_id_escaped}/dns_sources")
        sources = response_json.get("dns_sources", response_json) if isinstance(response_json, dict) else response_json
        try:
            return DNS_SOURCES_RESPONSE_ADAPTER.validate_python(sources)
        except ValidationError as exc:
            raise AgreegateApiError(f"group dns_sources response validation failed: {exc}") from exc

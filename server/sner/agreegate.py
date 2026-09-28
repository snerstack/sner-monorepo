# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner agreegate api gatekeeper
"""

import os
from http import HTTPStatus
from typing import Any

import requests
import yaml
from flask import current_app
from pydantic import BaseModel, Field, TypeAdapter

from sner.config import ConfigBase


class CredsConfig(ConfigBase):
    """agreegate credential file validation schema"""

    api_url: str
    api_key: str


class AgreegateApiError(Exception):
    """agreegate api call or payload validation error"""


# keep name, reused from AG
class Group(BaseModel):
    """Group model for adding/editing groups"""

    id: int
    name: str
    description: str | None = None
    external_id: str | None = None
    allowed_networks: list[str]


# keep name, reused from AG
class UserGroupsResponse(BaseModel):
    """Model for syncing users/groups.allowed_networs with SNER instance"""

    username: str
    email: str
    full_name: str
    role: str | None = Field(None, description="User role")
    groups: list[str] = Field([], description="User groups")
    enabled: bool = Field(False, description="User enabled flag")


AGAPI_GroupsResponseAdapter = TypeAdapter(list[Group])
AGAPI_UserGroupsResponseAdapter = TypeAdapter(list[UserGroupsResponse])
# TODO: define single response
DNS_SOURCES_RESPONSE_ADAPTER = TypeAdapter(list[dict[str, Any]])


class AgreegateManager:
    """AgreeGate API client for the auror_hostnames plugin"""

    def __init__(self, api_url, api_key):
        self.api_url = api_url.rstrip("/")
        self.api_key = api_key

    @classmethod
    def from_env(cls, envname="SNER_AGREEGATE_CREDS", **kwargs):
        """factory, initialize from creds environment variable"""

        data = yaml.safe_load(os.environ[envname])
        creds_config = CredsConfig.model_validate(data)
        return cls(**creds_config.model_dump(), **kwargs)

    @classmethod
    def from_app_config(cls):
        """factory, initialize from app config"""
        return cls(current_app.config["SNER_AGREEGATE_URL"], current_app.config["SNER_AGREEGATE_APIKEY"])

    def apicall(self, method, url, **kwargs):
        """make an authenticated AgreeGate API call and return decoded JSON body"""

        response = requests.request(
            method,
            f"{self.api_url}{url}",
            headers={"X-API-KEY": self.api_key},
            timeout=60,
            **kwargs,
        )

        if response.status_code != HTTPStatus.OK:
            current_app.logger.error("agreegate apicall failed, %s", response.text)
            raise AgreegateApiError("agreegate apicall failed")

        return response.json()

    def get_networks_aggregated(self):
        """return aggregated networks"""
        return self.apicall("GET", "/api/v1/networks/aggregated?output=json")

    def get_groups(self, **kwargs):
        """get groups with params"""
        return AGAPI_GroupsResponseAdapter.validate_python(self.apicall("GET", "/api/v1/groups", **kwargs))

    def get_usergroups(self):
        """get usergroups"""
        return AGAPI_UserGroupsResponseAdapter.validate_python(self.apicall("GET", "/api/v1/usergroups"))

    def get_group_dns_sources(self, group_id):
        """fetch and validate DNS sources for a required group_id"""

        response = self.apicall("GET", f"/api/v1/group/{group_id}/dns_sources")
        return DNS_SOURCES_RESPONSE_ADAPTER.validate_python(response.json["dns_sources"])

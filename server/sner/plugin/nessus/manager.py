# This file is part of sner project governed by MIT license, see the LICENSE.txt file.
"""
sner nessus manager module
"""

import os

import yaml
from flask import current_app
from tenable.nessus.api import Nessus

from sner.config import ConfigBase


class CredsConfig(ConfigBase):
    """nessus credential file validation schema"""

    url: str
    access_key: str
    secret_key: str


class NessusManager:
    """remote nessus scanner manager"""

    def __init__(self, url, access_key, secret_key):
        self.nessus = Nessus(url=url, access_key=access_key, secret_key=secret_key)

    @classmethod
    def from_env(cls, envname="SNER_NESSUS_CREDS"):
        """factory, initialize from creds environment variable"""

        data = yaml.safe_load(os.environ[envname])
        creds_config = CredsConfig.model_validate(data)
        return cls(**creds_config.model_dump())

    @classmethod
    def from_app_config(cls):
        """factory, initialize from app config"""
        return cls(current_app.config["SNER_NESSUS_URL"], current_app.config["SNER_NESSUS_ACCESS_KEY"], current_app.config["SNER_NESSUS_SECRET_KEY"])

    def list_scans(self):
        """list scans"""
        return self.nessus.scans.list()["scans"]

    def scan_create(self, name, targets, policy_name):
        """create and launch scan with selected policy"""

        policies = self.nessus.policies.list()
        policy = next(item for item in policies if item["name"] == policy_name)

        resp = self.nessus.scans.create(
            **{
                "uuid": policy["template_uuid"],
                "settings": {"name": name, "policy_id": policy["id"], "enabled": True, "text_targets": "\n".join(targets)},
            }
        )
        scan_id = resp["scan"]["id"]
        self.nessus.scans.launch(scan_id)
        return scan_id

    def scan_status(self, scan_id):
        """return scan status"""

        scan = self.nessus.scans.details(scan_id)
        status = scan["info"]["status"]
        return status

    def scan_report(self, scan_id):
        """fetch report data and optionaly delete scan"""

        buf = self.nessus.scans.export_scan(scan_id=scan_id, format="nessus")
        return buf.getvalue().decode(encoding="utf-8")

    def scan_delete(self, scan_id):
        """delete scan"""
        return self.nessus.scans.delete(scan_id)

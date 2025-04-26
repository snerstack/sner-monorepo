# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
agreegate related functions
"""

import ipaddress
import json
from http import HTTPStatus
from pathlib import Path

import requests
from flask import current_app


AGREEGATE_NETLISTS_FILE = "agreegate_netlists.json"


class AgreegateApiError(Exception):
    """agreegate api call error"""


def agreegate_apicall(method, url, **kwargs):
    """make agreegate api call"""

    resp = requests.request(
        method,
        f"{current_app.config['SNER_AGREEGATE_URL']}{url}",
        headers={"X-API-KEY": current_app.config["SNER_AGREEGATE_APIKEY"]},
        timeout=60,
        **kwargs
    )
    current_app.logger.debug("apicall, %s", resp)

    if resp.status_code != HTTPStatus.OK:
        current_app.logger.error("agreegate apicall failed, %s", resp.text)
        raise AgreegateApiError("agreegate apicall failed")

    return resp.json()


def fetch_agreegate_netlists():
    """fetch networks to be scanned from agreegate API"""

    try:
        netlists_json = agreegate_apicall("GET", "/api/v1/networks/aggregated?output=json")
    except AgreegateApiError:  # pragma: nocover  ; won't test
        current_app.logger.error("failed to fetch agreegate netlists")
        return 1

    agreegate_netlists_path = Path(f"{current_app.config['SNER_VAR']}/{AGREEGATE_NETLISTS_FILE}")
    agreegate_netlists_path.write_text(
        json.dumps(netlists_json, indent=4),
        encoding="utf-8"
    )
    return 0


def split_ip_networks(networks):
    """split ipv4/ipv6 addrs helper"""

    ipv4_networks = []
    ipv6_networks = []

    for net in networks:
        try:
            ip_net = ipaddress.ip_network(net, strict=False)
            if ip_net.version == 4:
                ipv4_networks.append(net)
            else:
                ipv6_networks.append(net)
        except ValueError:
            current_app.logger.error("Invalid network: %s", net)

    return ipv4_networks, ipv6_networks


def load_merge_agreegate_netlists(config):
    """load and merge netlists from agreegate file into planner config dict"""

    agreegate_netlists_path = Path(f"{current_app.config['SNER_VAR']}/{AGREEGATE_NETLISTS_FILE}")

    if agreegate_netlists_path.exists():
        current_app.logger.debug("merging agreegate netlists")
        ag_netlists = json.loads(agreegate_netlists_path.read_text(encoding="utf-8"))

        ipv4_networks, ipv6_networks = split_ip_networks(ag_netlists.get("sner/basic", []))
        config["basic_nets_ipv4"] = sorted(list(set(config.get("basic_nets_ipv4", []) + ipv4_networks)))
        config["basic_nets_ipv6"] = sorted(list(set(config.get("basic_nets_ipv6", []) + ipv6_networks)))

        ipv4_networks, ipv6_networks = split_ip_networks(ag_netlists.get("sner/nuclei", []))
        config["nuclei_nets_ipv4"] = sorted(list(set(config.get("nuclei_nets_ipv4", []) + ipv4_networks)))
        config["nuclei_nets_ipv6"] = sorted(list(set(config.get("nuclei_nets_ipv6", []) + ipv6_networks)))
        config["sportmap_nets_ipv4"] = sorted(list(set(config.get("sportmap_nets_ipv4", []) + ipv4_networks)))
        config["sportmap_nets_ipv6"] = sorted(list(set(config.get("sportmap_nets_ipv6", []) + ipv6_networks)))

    return config

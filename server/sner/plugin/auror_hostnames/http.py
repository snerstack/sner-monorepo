# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""http related functions for auror_hostnames plugin"""

import logging

import requests

from sner.plugin.auror_hostnames.decompress import extract_zone_files

logger = logging.getLogger(__name__)


def download_zone_archive(url, auth=None) -> bytes | None:
    """Download the zone archive from the given URL"""

    try:
        response = requests.get(url, auth=auth, timeout=30)
        response.raise_for_status()
        return response.content
    except requests.RequestException as e:
        logger.error("Failed to download zone archive from %s: %s", url, e)
        return None


def run(http_source) -> list[str]:
    """Run auror_hostnames module"""
    http_server_url = http_source.get("http_url")
    username = http_source.get("http_auth_login") or None
    password = http_source.get("http_auth_password") or None
    auth = (username, password) if username and password else None
    archive_bytes = download_zone_archive(http_server_url, auth=auth)

    if not archive_bytes:
        logger.warning("No archive bytes returned for %s", http_server_url)
        return []

    zone_file_paths = extract_zone_files(archive_bytes)
    return zone_file_paths

# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""http related functions for auror_hostnames plugin"""

import io
import logging
import zipfile

import requests

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


# TODO: consider passing data from zip files in-memory only
def extract_zone_files(archive_bytes) -> list[str]:
    """Extract zone files from a plain (non-encrypted) zip archive."""

    if not archive_bytes:
        return []

    extracted = []

    try:
        logger.info("Extracting zone files from the archive")

        buf = io.BytesIO(archive_bytes)
        if not zipfile.is_zipfile(buf):
            raise RuntimeError("Archive is not a ZIP archive")
        buf.seek(0)

        dest_path = Path("dns-zones").resolve()
        dest_path.mkdir(parents=True, exist_ok=True)

        with zipfile.ZipFile(buf) as zipf:
            for info in zipf.infolist():
                # skip directories, non .zone files
                if info.is_dir():
                    continue
                if not info.filename.endswith(".zone"):
                    continue

                # detect and handle traversal entries
                target = (dest_path / info.filename).resolve()
                if not target.is_relative_to(dest_path):
                    raise RuntimeError("Archive containing traversal filename rejected")

                # read-write by ourselves, prevent .extract() to pop-out potentially dangerous objects (symlinks)
                data = zipf.read(info)
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)

                extracted.append(str(target.relative_to(dest_path.parent)))

    except (zipfile.BadZipFile, RuntimeError) as e:
        logger.error("Failed to extract zip archive: %s", e)
        return []

    return extracted


def run(source) -> list[str]:
    """Run auror_hostnames module"""

    http_server_url = source.get("http_url")
    username = source.get("http_auth_login") or None
    password = source.get("http_auth_password") or None
    auth = (username, password) if username and password else None

    archive_bytes = download_zone_archive(http_server_url, auth=auth)
    if not archive_bytes:
        logger.warning("No archive bytes returned for %s", http_server_url)
        return []

    zone_file_paths = extract_zone_files(archive_bytes)
    return zone_file_paths

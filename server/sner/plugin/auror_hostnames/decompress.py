# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""archive decompression related functions for auror_hostnames plugin"""

import io
import logging
import os
import zipfile

logger = logging.getLogger(__name__)


def extract_zone_files(archive_bytes) -> list[str]:
    """Extract zone files from a plain (non-encrypted) zip archive."""

    if not archive_bytes:
        return []

    logger.info("Extracting zone files from the archive")
    buf = io.BytesIO(archive_bytes)

    if not zipfile.is_zipfile(buf):
        logger.error("Unable to detect archive format")
        return []

    buf.seek(0)
    try:
        with zipfile.ZipFile(buf) as zipf:
            zone_names = [n for n in zipf.namelist() if n.endswith(".zone")]
            for name in zone_names:
                zipf.extract(name, "dns-zones")
            return [os.path.join("dns-zones", n) for n in zone_names]
    except (zipfile.BadZipFile, RuntimeError) as e:
        logger.error("Failed to extract zip archive: %s", e)
        return []

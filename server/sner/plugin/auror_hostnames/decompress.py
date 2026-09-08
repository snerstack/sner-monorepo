# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""archive decompression related functions for auror_hostnames plugin"""

import io
import logging
import zipfile
from pathlib import Path

logger = logging.getLogger(__name__)


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

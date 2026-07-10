# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auror_hostnames plugin decompress tests
"""

import io
import zipfile
from pathlib import Path

from sner.plugin.auror_hostnames.decompress import extract_zone_files


def test_extract_zone_files(tmpworkdir):  # pylint: disable=unused-argument
    """extract_zone_files extracts .zone files from a zip archive"""

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zipf:
        zipf.writestr("example.com.zone", "dummy zone data")
        zipf.writestr("readme.txt", "not a zone")
        zipf.writestr("nested/beta.example.com.zone", "dummy zone data")

    zone_file_paths = extract_zone_files(buf.getvalue())

    assert zone_file_paths == ["dns-zones/example.com.zone", "dns-zones/nested/beta.example.com.zone"]
    for path in zone_file_paths:
        assert Path(path).read_text(encoding="utf-8") == "dummy zone data"
    assert not Path("dns-zones/readme.txt").exists()


def test_extract_zone_files_empty_input():
    """extract_zone_files returns empty list for empty input"""

    assert extract_zone_files(None) == []
    assert extract_zone_files(b"") == []


def test_extract_zone_files_not_an_archive():
    """extract_zone_files returns empty list when data is not a zip archive"""

    assert extract_zone_files(b"not a zip archive") == []


def test_extract_zone_files_corrupted_archive(tmpworkdir):  # pylint: disable=unused-argument
    """extract_zone_files returns empty list when the archive is corrupted"""

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zipf:
        zipf.writestr("example.com.zone", "dummy zone data" * 100)
    # valid magic and central directory, corrupted member data
    corrupted = bytearray(buf.getvalue())
    corrupted[30:40] = b"\x00" * 10

    assert extract_zone_files(bytes(corrupted)) == []

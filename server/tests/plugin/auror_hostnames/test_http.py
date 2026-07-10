# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auror_hostnames plugin http tests
"""

import io
import zipfile
from pathlib import Path

from werkzeug.wrappers import Response

from sner.plugin.auror_hostnames.http import run


def zone_archive():
    """build zone archive bytes"""

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zipf:
        zipf.writestr("zones/example.com.zone", "dummy zone data")
        zipf.writestr("readme.txt", "not a zone")
    return buf.getvalue()


def test_run(tmpworkdir, httpserver):  # pylint: disable=unused-argument
    """run downloads the archive and extracts zone files"""

    httpserver.expect_request("/archive.zip").respond_with_data(zone_archive(), content_type="application/zip")

    zone_file_paths = run({"http_url": httpserver.url_for("/archive.zip")})

    assert zone_file_paths == ["dns-zones/zones/example.com.zone"]
    assert Path("dns-zones/zones/example.com.zone").read_text(encoding="utf-8") == "dummy zone data"


def test_run_with_auth(tmpworkdir, httpserver):  # pylint: disable=unused-argument
    """run sends basic auth when credentials are configured"""

    httpserver.expect_request(
        "/archive.zip", headers={"Authorization": "Basic YWxpY2U6c2VjcmV0"}
    ).respond_with_data(zone_archive(), content_type="application/zip")

    zone_file_paths = run(
        {
            "http_url": httpserver.url_for("/archive.zip"),
            "http_auth_login": "alice",
            "http_auth_password": "secret",
        }
    )

    assert zone_file_paths == ["dns-zones/zones/example.com.zone"]


def test_run_empty_credentials_send_no_auth(tmpworkdir, httpserver):  # pylint: disable=unused-argument
    """run treats empty-string credentials as absent and sends no authorization header"""

    def handler(request):
        assert "Authorization" not in request.headers
        return Response(zone_archive(), content_type="application/zip")

    httpserver.expect_request("/archive.zip").respond_with_handler(handler)

    zone_file_paths = run(
        {
            "http_url": httpserver.url_for("/archive.zip"),
            "http_auth_login": "",
            "http_auth_password": "",
        }
    )

    assert zone_file_paths == ["dns-zones/zones/example.com.zone"]


def test_run_download_failed(tmpworkdir, httpserver):  # pylint: disable=unused-argument
    """run returns empty list when the archive cannot be downloaded"""

    httpserver.expect_request("/missing.zip").respond_with_data("not found", status=404)

    assert run({"http_url": httpserver.url_for("/missing.zip")}) == []

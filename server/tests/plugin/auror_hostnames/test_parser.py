# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auror_hostnames output parser tests
"""

from sner.plugin.auror_hostnames.parser import ParserModule


def test_host_list():
    """check host list extraction"""

    expected_hosts = ["127.0.0.1", "::1"]
    json_file_path = "tests/server/data/parser-auror_hostnames-results.json"
    zip_file_path = "tests/server/data/parser-auror_hostnames-results-job.zip"

    pidb = ParserModule.parse_path(json_file_path)

    assert [x.address for x in pidb.hosts] == expected_hosts

    pidb = ParserModule.parse_path(zip_file_path)

    assert [x.address for x in pidb.hosts] == expected_hosts

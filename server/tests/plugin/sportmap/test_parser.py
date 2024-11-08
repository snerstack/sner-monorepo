# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sportmap output parser tests
"""

from sner.plugin.sportmap.parser import ParserModule


def test_parse_path():
    """check basic parse_path impl"""

    expected_hosts = ['127.3.4.1']

    pidb = ParserModule.parse_path('tests/server/data/job-sportmap-testjob.zip')

    assert [x.address for x in pidb.hosts] == expected_hosts
    assert len(list(filter(lambda x: x.xtype == 'sportmap', pidb.notes))) == 1

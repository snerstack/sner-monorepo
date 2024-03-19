# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
ssh_audit output parser tests
"""

from sner.plugin.ssh_audit.parser import ParserModule


def test_parse_path():
    """check basic parse_path impl"""

    pidb = ParserModule.parse_path('tests/server/data/parser-ssh-audit.json')

    assert [x.address for x in pidb.hosts] == ['127.1.2.3']
    assert [x.port for x in pidb.services] == ['22']
    assert ['CVE-2020-15778'] in [x.refs for x in pidb.vulns]


def test_parse_agent_output():
    """check agent output parsing"""

    pidb = ParserModule.parse_path('tests/server/data/parser-ssh-audit-job.zip')

    assert [x.address for x in pidb.hosts] == ['127.1.2.3']
    assert [x.port for x in pidb.services] == ['22']
    assert ['CVE-2020-15778'] in [x.refs for x in pidb.vulns]

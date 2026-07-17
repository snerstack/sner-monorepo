# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
planner scope_checks tests
"""

import yaml
from flask import current_app

from sner.server.planner.scope_checks import outofscope_check
from sner.server.storage.models import Host, Note, Vuln


def test_outofscopecheck(app, host_factory, note_factory, vuln_factory):  # pylint: disable=unused-argument
    """test hosts_outside_scope"""

    current_app.config["SNER_PLANNER"] = yaml.safe_load(
        """
      basic_nets: ['127.0.0.11/32', '2001:db8::11/128']
      nuclei_nets: ['127.3.3.0/24']
      sportmap_nets: ['2001:db8:eeee::12/64']
      nessus_nets: ['127.3.3.0/24']
      auror_testssl_nets: ['127.4.4.0/24']
    """
    )

    host1 = host_factory.create(address="127.0.0.11")
    host2 = host_factory.create(address="2001:db8::11")
    host_factory.create(address="127.4.0.1")
    host_factory.create(address="2001:db8:eeee::13")
    host_factory.create(address="2001:db8:aaaa::6")

    vuln_factory.create(host=host1, xtype="nuclei.test")
    vuln_factory.create(host=host1, xtype="nessus.test")
    note_factory.create(host=host2, xtype="sportmap")
    note_factory.create(host=host2, xtype="auror.testssl.implicit")

    outofscope_check(prune=True)
    assert Host.query.count() == 3
    assert Vuln.query.count() == 0
    assert Note.query.count() == 0


def test_outofscopecheck_emptyscope(app):  # pylint: disable=unused-argument
    """test hosts_outside_scope with empty scope"""

    current_app.config["SNER_PLANNER"] = {}
    assert outofscope_check(prune=False) == 0

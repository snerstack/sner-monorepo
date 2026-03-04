# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
planner core tests
"""

import yaml
from flask import current_app

from sner.server.planner.core import outofscope_check, Planner
from sner.server.storage.models import Host, Note, Vuln


def test_planner_simple(app, queue_factory):  # pylint: disable=unused-argument
    """try somewhat default config"""

    queue_factory.create(name="sner.nmap.serviceversion")
    queue_factory.create(name="sner.nmap.servicedisco")
    queue_factory.create(name="sner.six_dns_discover")
    queue_factory.create(name="sner.six_enum_discover")
    queue_factory.create(name="standalone")
    queue_factory.create(name="sner.nuclei.rolling")
    queue_factory.create(name="sner.nessus.rolling")
    queue_factory.create(name="sner.sportmap.rolling")
    queue_factory.create(name="auror.hostnames")
    queue_factory.create(name="auror.testssl")

    config = yaml.safe_load(
        """
      basic_nets: ['::1/128']
      nuclei_nets: []
      sportmap_nets: []
      auror_testssl_nets: []

      pipelines:
          standalone_queues:
            queues:
              - standalone

          service_disco:
            netlist_schedule: 5days
            queue: sner.nmap.servicedisco

          six_disco:
            dns_netlist_schedule: 2days
            dns_disco_queue: sner.six_dns_discover
            storage_enum_schedule: 2days
            storage_enum_queue: sner.six_enum_discover

          service_scan:
            schedule: 1hour
            service_interval: 2days
            queues:
              - sner.nmap.serviceversion

          host_rescan:
            schedule: 1day
            host_interval: 3days

          nuclei_scan:
            schedule: 5days
            queue: sner.nuclei.rolling

          nessus_scan:
            schedule: 5days
            queue: sner.nessus.rolling

          sportmap_scan:
            schedule: 13days
            queue: sner.sportmap.rolling

          auror_hostnames:
            schedule: 1day
            queue: auror.hostnames

          auror_testssl:
            targetlist_schedule: 1day
            queue: auror.testssl
            ports_starttls:
              21: ftp
            cleanup_schedule: 1day

          storage_cleanup:
            enabled: true

          rebuild_versioninfo_map:
            schedule: 10minutes
      """
    )

    planner = Planner(config)
    planner.run(oneshot=True)


def test_outofscopecheck(app, host_factory, note_factory, vuln_factory):  # pylint: disable=unused-argument
    """test hosts_outside_scope"""

    current_app.config["SNER_PLANNER"] = yaml.safe_load(
        """
      basic_nets: ['127.0.0.11/32', '2001:db8::11/128']
      nuclei_nets: ['127.3.3.0/24']
      sportmap_nets: ['2001:db8:eeee::12/64']
    """
    )

    host1 = host_factory.create(address="127.0.0.11")
    host2 = host_factory.create(address="2001:db8::11")
    host_factory.create(address="127.4.0.1")
    host_factory.create(address="2001:db8:eeee::13")
    host_factory.create(address="2001:db8:aaaa::6")

    vuln_factory.create(host=host1, xtype="nuclei.test")
    note_factory.create(host=host2, xtype="sportmap")

    outofscope_check(prune=True)
    assert Host.query.count() == 3
    assert Vuln.query.count() == 0
    assert Note.query.count() == 0


def test_outofscopecheck_emptyscope(app):  # pylint: disable=unused-argument
    """test hosts_outside_scope with empty scope"""

    current_app.config["SNER_PLANNER"] = {}
    assert outofscope_check(prune=False) == 0

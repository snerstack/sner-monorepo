# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
planner core tests
"""

import yaml

from sner.server.planner.core import Planner, _split_ip_networks


def test_planner_simple(app, queue_factory):  # pylint: disable=unused-argument
    """try somewhat default config"""

    queue_factory.create(name="standalone")
    queue_factory.create(name="sner.nmap.servicedisco")
    queue_factory.create(name="sner.six_dns_discover")
    queue_factory.create(name="sner.six_enum_discover")
    queue_factory.create(name="sner.nmap.serviceversion")
    queue_factory.create(name="sner.nuclei.rolling")
    queue_factory.create(name="sner.sportmap.rolling")
    queue_factory.create(name="sner.nessus.rolling")
    queue_factory.create(name="auror.hostnames")
    queue_factory.create(name="auror.testssl")

    config = yaml.safe_load(
        """
      basic_nets: []
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

          rebuild_versioninfo:
            schedule: 10minutes
      """
    )

    planner = Planner(config)
    planner.run(oneshot=True)


def test_planner_empty_config(app):  # pylint: disable=unused-argument
    """try empty config"""

    planner = Planner({"pipelines": {"storage_cleanup": {"enabled": True}}})
    planner.run(oneshot=True)


def test_split_ip_networks():
    """test utility function"""

    addr4, addr6 = _split_ip_networks(["127.0.0.1", "::1"])

    assert len(addr4) == 1
    assert len(addr6) == 1

# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
planner core tests
"""

import yaml

from sner.server.planner.core import Planner


def test_planner_simple(app, queue_factory):  # pylint: disable=unused-argument
    """try somewhat default config"""

    queue_factory.create(name='sner.nmap.serviceversion')
    queue_factory.create(name='sner.nmap.servicedisco')
    queue_factory.create(name='sner.six_dns_discover')
    queue_factory.create(name='sner.six_enum_discover')
    queue_factory.create(name='standalone')
    queue_factory.create(name='sner.nuclei.rolling')
    queue_factory.create(name='sner.testssl')
    queue_factory.create(name='sner.sportmap.rolling')

    config = yaml.safe_load("""
basic_nets_ipv4: []
filter_nets_ipv6: ['::1/128']
nuclei_nets_ipv4: []
sportmap_nets_ipv4: []
pipelines:
    standalone_queues:
      queues:
        - standalone

    basic_scan:
      netlist_schedule: 5days
      service_disco_queue: sner.nmap.servicedisco
      six_dns_disco_queue: sner.six_dns_discover
      service_scan_queues:
        - sner.nmap.serviceversion

    basic_rescan:
      schedule: 1day
      host_interval: 3days
      service_interval: 2days

    storage_six_enum:
      schedule: 2days
      queue: sner.six_enum_discover

    nuclei_scan:
      netlist_schedule: 5days
      queue: sner.nuclei.rolling

    testssl_scan:
      schedule: 7days
      queue: sner.testssl

    sportmap_scan:
      schedule: 13days
      queue: sner.sportmap.rolling

    storage_cleanup:
      enabled: true

    rebuild_versioninfo_map:
      schedule: 10minutes
""")

    planner = Planner(config, oneshot=True)
    planner.run()


def test_planner_dumptargets(app):  # pylint: disable=unused-argument
    """test dump targets"""

    config = yaml.safe_load("""
basic_nets_ipv4: ['127.0.0.11/32']
filter_nets_ipv6: ['::1/128']
""")

    planner = Planner(config)
    assert len(planner.dump_targets("basic_nets_ipv4")) == 1

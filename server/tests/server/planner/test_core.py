# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
planner core tests
"""

import json
from http import HTTPStatus
from pathlib import Path
from unittest.mock import Mock, patch

import requests
import yaml
from flask import current_app

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


def test_planner_loadmergeagreegatenetlists(app, tmpworkdir):  # pylint: disable=unused-argument
    """test load and merge agreegate configs"""

    config = yaml.safe_load("""
basic_nets_ipv4: ['127.0.0.11/32']
filter_nets_ipv6: ['::1/128']
""")

    Path(f"{current_app.config['SNER_VAR']}/agreegate_netlists.json").write_text(
        json.dumps({"sner/basic": ["127.6.6.0/24", "2001:db8::11/128", "invalid"]}),
        encoding="utf-8"
    )

    planner = Planner(config)
    assert len(planner.config.basic_nets_ipv4) == 2
    assert len(planner.config.filter_nets_ipv6) == 2


def test_planner_fetchagreegatenetlists(app, tmpworkdir):  # pylint: disable=unused-argument
    """test fetch agreegate netlists"""

    mock_get = Mock()
    mock_get.return_value = Mock()
    mock_get.return_value.status_code = HTTPStatus.OK
    mock_get.return_value.json = lambda: {"sner/basic": ["127.6.6.0/24"]}

    planner = Planner({})
    with patch.object(requests, "get", mock_get):
        assert planner.fetch_agreegate_netlists() == 0

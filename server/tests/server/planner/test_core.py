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

from sner.server.planner.core import (
    AGREEGATE_NETLISTS_FILE,
    dump_targets,
    fetch_agreegate_netlists,
    load_merge_agreegate_netlists,
    outofscope_check,
    Planner,
)
from sner.server.storage.models import Host, Note, Vuln


def test_planner_simple(app, queue_factory):  # pylint: disable=unused-argument
    """try somewhat default config"""

    queue_factory.create(name="sner.nmap.serviceversion")
    queue_factory.create(name="sner.nmap.servicedisco")
    queue_factory.create(name="sner.six_dns_discover")
    queue_factory.create(name="sner.six_enum_discover")
    queue_factory.create(name="standalone")
    queue_factory.create(name="sner.nuclei.rolling")
    queue_factory.create(name="sner.testssl")
    queue_factory.create(name="sner.sportmap.rolling")
    queue_factory.create(name="auror.hostnames")

    config = yaml.safe_load(
        """
      basic_nets_ipv4: []
      basic_nets_ipv6: ['::1/128']
      nuclei_nets_ipv4: []
      sportmap_nets_ipv4: []
      pipelines:
          standalone_queues:
            queues:
              - standalone

          basic_scan:
            schedule: 5days
            service_disco_queue: sner.nmap.servicedisco
            service_scan_queues:
              - sner.nmap.serviceversion

          basic_rescan:
            schedule: 1day
            host_interval: 3days
            service_interval: 2days

          six_disco:
            schedule: 2days
            dns_disco_queue: sner.six_dns_discover
            storage_enum_queue: sner.six_enum_discover

          nuclei_scan:
            schedule: 5days
            queue: sner.nuclei.rolling

          testssl_scan:
            schedule: 7days
            queue: sner.testssl

          sportmap_scan:
            schedule: 13days
            queue: sner.sportmap.rolling

          auror_scan:
            hostnames_schedule: 1day
            hostnames_queue: auror.hostnames

          storage_cleanup:
            enabled: true

          rebuild_versioninfo_map:
            schedule: 10minutes
      """
    )

    planner = Planner(config, oneshot=True)
    planner.run()


def test_dumptargets(app):  # pylint: disable=unused-argument
    """test dump targets"""

    current_app.config["SNER_PLANNER"] = yaml.safe_load(
        """
      basic_nets_ipv4: ['127.0.0.11/32']
      basic_nets_ipv6: ['::1/128']
      """
    )

    assert len(dump_targets("basic_nets_ipv4")) == 1


def test_fetchagreegatenetlists(app):  # pylint: disable=unused-argument
    """test fetch agreegate netlists"""

    current_app.config["SNER_PLANNER"] = {
        "agreegate_url": "dummy",
        "agreegate_apikey": "dummy",
    }

    mock_get = Mock()
    mock_get.return_value = Mock()
    mock_get.return_value.status_code = HTTPStatus.OK
    mock_get.return_value.json = lambda: {"sner/basic": ["127.6.6.0/24"]}

    with patch.object(requests, "get", mock_get):
        assert fetch_agreegate_netlists() == 0


def test_loadmergeagreegatenetlists(app):  # pylint: disable=unused-argument
    """test load and merge agreegate configs"""

    Path(f"{current_app.config['SNER_VAR']}/{AGREEGATE_NETLISTS_FILE}").write_text(
        json.dumps({"sner/basic": ["127.6.6.0/24", "2001:db8::11/128", "invalid"]}),
        encoding="utf-8",
    )

    config = yaml.safe_load(
        """
      basic_nets_ipv4: ['127.0.0.11/32']
      basic_nets_ipv6: ['::1/128']
    """
    )

    config = load_merge_agreegate_netlists(config)
    assert len(config["basic_nets_ipv4"]) == 2
    assert len(config["basic_nets_ipv6"]) == 2


def test_outofscopecheck(
    app, host_factory, note_factory, vuln_factory
):  # pylint: disable=unused-argument
    """test hosts_outside_scope"""

    current_app.config["SNER_PLANNER"] = yaml.safe_load(
        """
      basic_nets_ipv4: ['127.0.0.11/32']
      basic_nets_ipv6: ['2001:db8::11/128']
      nuclei_nets_ipv4: ['127.3.3.0/24']
      sportmap_nets_ipv6: ['2001:db8:eeee::12/64']
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

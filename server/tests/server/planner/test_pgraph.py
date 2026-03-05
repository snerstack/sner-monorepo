# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
planner core tests
"""

from pathlib import Path

import yaml

from sner.server.planner.core import Planner
from sner.server.planner.pgraph import generate_graph


def test_pipelines_graph(app, tmpworkdir, queue_factory):  # pylint: disable=unused-argument
    """test graph generation"""

    queue_factory.create(name="standalone")
    queue_factory.create(name="servicedisco")
    queue_factory.create(name="sixdns")
    queue_factory.create(name="sixenum")

    config = yaml.safe_load(
        """
      basic_nets: ['127.0.0.1/32']
      pipelines:
          standalone_queues:
            queues:
              - standalone

          service_disco:
            netlist_schedule: 1day
            queue: servicedisco

          six_disco:
            dns_netlist_schedule: 1day
            dns_disco_queue: sixdns
            storage_enum_schedule: 1day
            storage_enum_queue: sixenum

          storage_cleanup:
            enabled: true
    """
    )
    planner = Planner(config)

    generate_graph(planner)
    assert Path("pipeline_graph.svg").exists()

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

    config = yaml.safe_load(
        """
      pipelines:
          standalone_queues:
            queues:
              - standalone
    """
    )
    planner = Planner(config)

    generate_graph(planner)
    assert Path("pipeline_graph.svg").exists()

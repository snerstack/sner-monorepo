# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
planner commands
"""

import click
from flask import current_app
from flask.cli import with_appcontext

from sner.server.agreegate import fetch_agreegate_netlists
from sner.server.planner.core import outofscope_check, Planner
from sner.server.planner.pgraph import generate_graph


@click.group(name='planner', help='sner.server planner commands')
def command():
    """planner commands container"""


@command.command(name='run', help='run planner daemon')
@with_appcontext
@click.option('--oneshot', is_flag=True)
def run_command(**kwargs):
    """run planner daemon"""

    planner = Planner(current_app.config['SNER_PLANNER'])
    planner.run(kwargs['oneshot'])


@command.command(name='fetch-agreegate-netlists', help='fetch networks to be scanned from agreegate API')
@with_appcontext
def fetch_agreegate_netlists_command():  # pragma nocover  ; won't test
    """fetch networks to be scanned from agreegate API"""

    return fetch_agreegate_netlists()


@command.command(name='outofscope-check', help="check for storage objects which are outside the planner's current scanning scope")
@with_appcontext
@click.option('--prune', is_flag=True)
def outofscope_check_command(prune):  # pragma nocover  ; won't test
    """fetch networks to be scanned from agreegate API"""

    return outofscope_check(prune)


@command.command(name='pipelines-graph', help="generate pipeline graph using graphviz")
@with_appcontext
def pipelines_graph_command():  # pragma nocover  ; won't test
    """generate pipeline graph using graphviz"""

    planner = Planner(current_app.config['SNER_PLANNER'])
    return generate_graph(planner)

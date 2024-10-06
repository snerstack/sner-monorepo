# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
planner commands
"""

import click
from flask import current_app
from flask.cli import with_appcontext

from sner.server.planner.core import Planner


@click.group(name='planner', help='sner.server planner commands')
def command():
    """planner commands container"""


@command.command(name='run', help='run planner daemon')
@with_appcontext
@click.option('--oneshot', is_flag=True)
def run(**kwargs):
    """run planner daemon"""

    Planner(current_app.config['SNER_PLANNER'], kwargs['oneshot']).run()


@command.command(name='dump-targets', help='dump all targets respecting exclusions')
@with_appcontext
@click.option(
    '--netlist',
    type=click.Choice(['basic_nets_ipv4', 'nuclei_nets_ipv4'], case_sensitive=False),
    default="basic_nets_ipv4"
)
def dump_targets(netlist):
    """dump all targets respecting exclusions"""

    if targets := Planner(current_app.config['SNER_PLANNER']).dump_targets(netlist):
        print("\n".join(targets))

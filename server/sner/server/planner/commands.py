# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
planner commands
"""

import click
from flask import current_app
from flask.cli import with_appcontext

from sner.server.planner.core import (
    dump_targets,
    fetch_agreegate_netlists,
    outofscope_check,
    Planner
)


@click.group(name='planner', help='sner.server planner commands')
def command():
    """planner commands container"""


@command.command(name='run', help='run planner daemon')
@with_appcontext
@click.option('--oneshot', is_flag=True)
def run_command(**kwargs):
    """run planner daemon"""

    Planner(current_app.config['SNER_PLANNER'], kwargs['oneshot']).run()


@command.command(name='dump-targets', help='dump all targets respecting exclusions')
@with_appcontext
@click.option(
    '--netlist',
    type=click.Choice(['basic_nets_ipv4', 'nuclei_nets_ipv4'], case_sensitive=False),
    default="basic_nets_ipv4"
)
def dump_targets_command(netlist):
    """dump all targets respecting exclusions"""

    if targets := dump_targets(netlist):
        print("\n".join(targets))


@command.command(name='fetch-agreegate-netlists', help='fetch networks to be scanned from agreegate API')
@with_appcontext
def fetch_agreegate_netlists_command():  # pragma nocover  ; won't test
    """fetch networks to be scanned from agreegate API"""

    return fetch_agreegate_netlists()


@command.command(name='outofscope-check', help="handles data in storage that is outside the planner's scanning scope")
@with_appcontext
@click.option('--prune', is_flag=True)
def outofscope_check_command(prune):  # pragma nocover  ; won't test
    """fetch networks to be scanned from agreegate API"""

    return outofscope_check(prune)

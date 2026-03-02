# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
nessus commands
"""

from datetime import datetime

import click
from flask.cli import with_appcontext

from sner.plugin.nessus.manager import NessusManager


@click.group(name='nessus', help='sner.server nessus management')
def command():
    """nessus commands container"""


def _date_fmt(timestamp):
    return datetime.fromtimestamp(timestamp).isoformat()


def _print_scan_list(scans):
    """list vms"""

    fmt = "{id:>4} {name:<50} {status:<10} {creation_date:>20} {last_modification_date:>20}"
    print(fmt.format(id="ID", name="Name", status="Status", creation_date="Created", last_modification_date="Modified"))
    print("-" * 110)

    for scan in sorted(scans, key=lambda item: item["name"]):
        scan["creation_date"] = _date_fmt(scan["creation_date"])
        scan["last_modification_date"] = _date_fmt(scan["last_modification_date"])
        print(fmt.format(**scan))


@command.command(name='list', help='list nessus scans')
@with_appcontext
def list_command():
    """nessus list"""

    nessus = NessusManager.from_app_config()
    _print_scan_list(nessus.list_scans() or [])


@command.command(name='delete', help='delete nessus scan')
@click.argument('scan_id')
@with_appcontext
def delete_command(scan_id):
    """nessus delete scan command"""

    nessus = NessusManager.from_app_config()
    nessus.scan_delete(scan_id)

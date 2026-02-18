# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
storage commands
"""

import sys
from pathlib import Path

import click
from flask import current_app
from flask.cli import with_appcontext

from sner.server.extensions import db
from sner.server.utils import FilterQueryError
from sner.server.parser import REGISTERED_PARSERS
from sner.server.storage.core import StorageManager, vuln_export, vuln_report
from sner.server.storage.models import Host, Versioninfo
from sner.server.storage.service_list import service_list
from sner.server.storage.versioninfo import VersioninfoManager


@click.group(name="storage", help="sner.server storage management")
def command():
    """storage commands container"""


@command.command(name="import", help="import data from files")
@with_appcontext
@click.option("--dry", is_flag=True, help="do not update database, only print new items")
@click.option("--addtag", multiple=True, help="add tag to all imported objects, can be used several times")
@click.argument("parser")
@click.argument("path", nargs=-1)
def storage_import(path, parser, **kwargs):
    """import data"""

    if parser not in REGISTERED_PARSERS:
        current_app.logger.error("no such parser")
        sys.exit(1)

    parser_impl = REGISTERED_PARSERS[parser]
    for item in path:
        if not Path(item).is_file():
            current_app.logger.warning(f'invalid path "{item}"')
            continue

        try:
            if kwargs.get("dry"):
                StorageManager.import_parsed_dryrun(parser_impl.parse_path(item))
            else:
                StorageManager.import_parsed(parser_impl.parse_path(item), list(kwargs["addtag"]))
        except Exception as exc:  # pylint: disable=broad-except
            current_app.logger.warning(f"failed to parse {item}, {repr(exc)}")

    sys.exit(0)


@command.command(name="flush", help="flush all objects from storage")
@with_appcontext
def storage_flush():
    """flush all objects from storage"""

    db.session.query(Host).delete()
    db.session.query(Versioninfo).delete()
    db.session.commit()


@command.command(name="vuln-report", help="generate vulnerabilities report")
@with_appcontext
@click.option("--filter", help="filter query")
@click.option("--group_by_host", is_flag=True, help="generate report per host")
def storage_vuln_report(**kwargs):
    """generate vuln report"""

    print(vuln_report(kwargs.get("filter"), kwargs.get("group_by_host")))


@command.command(name="vuln-export", help="export vulnerabilities")
@with_appcontext
@click.option("--filter", help="filter query")
def storage_vuln_export(**kwargs):
    """export vulnerabilities"""

    print(vuln_export(kwargs.get("filter")))


@command.command(name="service-list", help="service (filtered) listing")
@with_appcontext
@click.option("--filter", help="filter query")
@click.option(
    "--format",
    type=click.Choice(
        [
            "servicetarget",
            "namedservicetarget",
            "address",
            "hostname",
            "addressport",
            "hostnameport",
            "full",
            "fullhostname",
        ]
    ),
    default="servicetarget",
)
def storage_service_list(**kwargs):
    """service listing; used to feed manymap queues from storage data"""

    # output can be big, stream it
    try:
        iterator = service_list(kwargs.get("filter"), kwargs.get("format"))
        for item in iterator:
            print(item)
    except FilterQueryError:
        sys.exit(1)


@command.command(name="rebuild-versioninfo", help="rebuild versioninfo map")
@with_appcontext
def storage_rebuild_versioninfo():
    """rebuild versioninfo command"""

    VersioninfoManager.rebuild()

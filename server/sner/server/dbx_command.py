# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner.server db command module
"""
# pylint: disable=missing-class-docstring,too-many-instance-attributes

import difflib
import json
import os
import shutil
from enum import IntEnum
from dataclasses import dataclass, field, fields

import click
import yaml
from flask import current_app
from flask.cli import with_appcontext
from sqlalchemy import text

from sner.server.auth.models import User
from sner.server.extensions import db
from sner.server.scheduler.core import QueueManager
from sner.server.scheduler.models import Queue
from sner.server.storage.versioninfo import VersioninfoManager
from sner.server.storage.models import Host, Note, Service, SeverityEnum, Vuln
from sner.server.utils import yaml_dump
from sner.targets import TargetManager


@dataclass
class DefBase:
    def to_dict(self):
        """dump definition model to dict excluding _underscored attributes"""
        return {f.name: getattr(self, f.name) for f in fields(self) if not f.name.startswith("_")}


class QueuePrio(IntEnum):
    HIGH = 15
    NORMAL = 10
    LOW = 5


@dataclass
class QueueDef(DefBase):
    name: str
    config: dict
    group_size: int
    priority: QueuePrio
    reqs: list[str] = field(default_factory=list)
    active: bool = True

    def __post_init__(self):
        self.config = yaml_dump(self.config)

    def to_dict(self):
        data = self.__dict__
        data["priority"] = int(self.priority)
        return data


def _dbqueue_to_dict(queue):
    return {fitem.name: getattr(queue, fitem.name) for fitem in fields(QueueDef)}

DEFAULT_DEV_QUEUES = [
    QueueDef("dev.dummy", {"module": "dummy", "args": ["--dummyparam", "1"]}, 2, QueuePrio.NORMAL, [])
]

DEFAULT_PROD_QUEUES = [
    # basic scan
    QueueDef(
        "sner.nmap.servicedisco",
        {"module": "nmap", "args": ["-sS", "--top-ports", "10000", "-Pn"], "timing_perhost": 2},
        1000,
        QueuePrio.NORMAL,
        ["default"],
    ),
    QueueDef("sner.six_dns_discover", {"module": "six_dns_discover"}, 1000, QueuePrio.NORMAL, ["default"]),
    QueueDef("sner.six_enum_discover", {"module": "six_enum_discover"}, 5, QueuePrio.NORMAL, ["default"]),
    QueueDef(
        "sner.nmap.serviceversion",
        {"module": "manymap", "args": ["-sV", "--version-intensity", "4", "-O", "-Pn"]},
        10,
        QueuePrio.HIGH,
        ["default"],
    ),
    QueueDef("sner.jarm", {"module": "jarm"}, 10, QueuePrio.HIGH, ["default"]),
    QueueDef(
        "sner.nmap.script",
        {
            "module": "manymap",
            "args": [
                "-sS",
                "--script",
                "default,http-headers,ldap-rootdse,ssl-enum-ciphers,ssh-auth-methods",
                "--script-timeout",
                "10m",
                "-Pn",
            ],
        },
        1,
        QueuePrio.HIGH,
        ["default"],
    ),
    # nuclei scan
    QueueDef(
        "sner.nuclei.rolling",
        {"module": "nuclei", "args": ["-rate-limit", "30", "-disable-unsigned-templates"]},
        1,
        QueuePrio.HIGH,
        ["nuclei"],
    ),
    QueueDef("sner.sportmap.rolling", {"module": "sportmap"}, 1, QueuePrio.LOW, ["sportmap"]),
    # nessus scan
    QueueDef("sner.nessus.rolling", {"module": "nessus"}, 5, QueuePrio.HIGH, ["nuclei"]),
    # auror
    QueueDef(
        "auror.hostnames",
        {"module": "auror_hostnames", "git_key_path": "/absolute/file/path", "git_server": "server.hostname"},
        1,
        QueuePrio.NORMAL,
        ["auror"],
    ),
    QueueDef("auror.testssl", {"module": "auror_testssl"}, 1, QueuePrio.NORMAL, ["auror"]),
    # standalone
    QueueDef(
        "sner.nuclei",
        {"module": "nuclei", "args": ["-rate-limit", "50", "-disable-unsigned-templates"]},
        5,
        QueuePrio.NORMAL,
        ["default"],
    ),
    QueueDef("sner.sportmap", {"module": "sportmap"}, 1, QueuePrio.NORMAL, ["sportmap"]),
    # others
    QueueDef(
        "sner.nmap.udpscan",
        {
            "module": "nmap",
            "args": ["-sU", "-F", "-sV", "--version-intensity", "0", "-Pn", "--open", "--max-retries", "1"],
        },
        50,
        QueuePrio.HIGH,
        ["default"],
    ),
    QueueDef(
        "pentest.nmap.fullsynscan",
        {
            "module": "nmap",
            "args": [
                "-sS",
                "-A",
                "-p1-65535",
                "-Pn",
                "--max-retries",
                "3",
                "--script-timeout",
                "10m",
                "--min-hostgroup",
                "20",
                "--min-rate",
                "900",
                "--max-rate",
                "1500",
            ],
        },
        20,
        QueuePrio.NORMAL,
        ["default"],
    ),
]


@dataclass
class HostDef(DefBase):
    address: str
    hostname: str = None
    os: str = None
    comment: str = None
    _services: list = field(default_factory=list)
    _notes: list = field(default_factory=list)
    _vulns: list = field(default_factory=list)


@dataclass
class ServiceDef(DefBase):
    proto: str
    port: int
    state: str
    name: str = None
    info: str = None
    comment: str = None
    _notes: list = field(default_factory=list)
    _vulns: list = field(default_factory=list)


@dataclass
class NoteDef(DefBase):
    xtype: str
    data: str = None
    comment: str = None
    via_target: str = None


@dataclass
class VulnDef(DefBase):
    name: str
    xtype: str
    severity: SeverityEnum
    descr: str = None
    data: str = None
    tags: list = field(default_factory=list)
    refs: list = field(default_factory=list)
    comment: str = None
    via_target: str = None


_AGGREGABLE_VULN = VulnDef(
    name="aggregable vuln",
    xtype="x.agg",
    severity=SeverityEnum.MEDIUM,
    descr="aggregable vuln description",
    data="agg vuln data",
    tags=["report:data", "i:via_sner"],
)

DEFAULT_DEV_STORAGE_DATA = [
    HostDef(
        address="127.4.4.4",
        hostname="testhost.testdomain.test<script>alert(1);</script>",
        os="Test Linux 1",
        comment="a some unknown service server",
        _services=[
            ServiceDef(
                proto="tcp",
                port=12345,
                state="open:testreason",
                name="svcx",
                info="testservice banner",
                comment="manual testservice comment",
                _notes=[
                    NoteDef(xtype="cpe", data=json.dumps(["cpe:/o:microsoft:windows_nt:3.5.1"])),
                    NoteDef(xtype="manual", data="some other note data", via_target="dummy.via_target"),
                ],
            )
        ],
        _vulns=[_AGGREGABLE_VULN],
    ),
    HostDef(
        address="127.3.3.3",
        hostname="testhost1.testdomain.test",
        os="Test Linux 2",
        comment="another server",
        _services=[
            ServiceDef(
                proto="tcp",
                port=12345,
                state="closed:testreason",
                name="svcx",
                _vulns=[
                    VulnDef(
                        name="vulnerability3", xtype="testxtype.124", severity=SeverityEnum.UNKNOWN, tags=["report"]
                    ),
                    _AGGREGABLE_VULN,
                ],
            )
        ],
        _notes=[
            NoteDef(xtype="sner.testnote", data="testnote data<script>alert(2);</script>", comment="test note comment")
        ],
        _vulns=[
            VulnDef(
                name="test vulnerability",
                xtype="testxtype.123",
                severity=SeverityEnum.CRITICAL,
                comment="a test vulnerability comment",
                refs=["ref1", "ref2"],
                tags=["tag1", "tag2"],
            ),
            VulnDef(
                name="another test vulnerability",
                xtype="testxtype.124",
                severity=SeverityEnum.HIGH,
                comment="another vulnerability comment",
                tags=None,
            ),
            VulnDef(name="vulnerability1", xtype="testxtype.124", severity=SeverityEnum.MEDIUM, tags=["info"]),
            VulnDef(name="vulnerability2", xtype="testxtype.124", severity=SeverityEnum.LOW, tags=["report"]),
            VulnDef(name="vulnerability2", xtype="testxtype.124", severity=SeverityEnum.INFO, tags=["info"]),
        ],
    ),
    HostDef(
        address="127.5.5.5",
        hostname="productdummy",
        _services=[
            ServiceDef(
                proto="tcp",
                port=80,
                state="open:syn-ack",
                name="http",
                info="product: Apache httpd version: 2.2.21 extrainfo: (Win32) mod_ssl/2.2.21 OpenSSL/1.0.0e PHP/5.3.8 mod_perl/2.0.4 Perl/v5.10.1",
                _notes=[
                    NoteDef(xtype="cpe", data=json.dumps(["cpe:/a:apache:http_server:2.2.21"])),
                    NoteDef(
                        xtype="nmap.banner_dict",
                        data=json.dumps(
                            {
                                "product": "Apache httpd",
                                "version": "2.2.21",
                                "extrainfo": "(Win32) mod_ssl/2.2.21 OpenSSL/1.0.0e PHP/5.3.8 mod_perl/2.0.4 Perl/v5.10.1",
                            }
                        ),
                    ),
                    NoteDef(
                        xtype="nmap.banner_dict",
                        data=json.dumps(
                            {
                                "product": "Apache httpd",
                                "version": "0.0",
                                "extrainfo": "(xssdummy<script>alert(window);</script>) dummy/1.1",
                            }
                        ),
                    ),
                    NoteDef(xtype="hostnames", data=json.dumps(["productdummy"])),
                ],
            )
        ],
    ),
]


def _create_queues(definitions):
    """initialize storage queues from definitions"""
    for queue_def in definitions:
        existing = Queue.query.filter_by(name=queue_def.name).first()
        if existing:
            print(f"skipped existing queue {existing.name}")
            continue
        db.session.add(Queue(**queue_def.to_dict()))
    db.session.commit()


def _create_storage(definitions):
    """initialize storage models from definitions"""
    # pylint: disable=protected-access

    for host_def in definitions:
        host = Host(**host_def.to_dict())
        db.session.add(host)

        for vuln_def in host_def._vulns:
            vuln = Vuln(host=host, **vuln_def.to_dict())
            db.session.add(vuln)

        for note_def in host_def._notes:
            note = Note(host=host, **note_def.to_dict())
            db.session.add(note)

        for service_def in host_def._services:
            service = Service(host=host, **service_def.to_dict())
            db.session.add(service)

            for vuln_def in service_def._vulns:
                vuln = Vuln(host=host, service=service, **vuln_def.to_dict())
                db.session.add(vuln)

            for note_def in service_def._notes:
                note = Note(host=host, service=service, **note_def.to_dict())
                db.session.add(note)

    db.session.commit()


def initdata_prod():
    """Initialize sner queues"""
    _create_queues(DEFAULT_PROD_QUEUES)


def initdata_dev():
    """initialize development data"""

    _create_queues(DEFAULT_DEV_QUEUES)
    queue = Queue.query.filter_by(name="dev.dummy").one()
    QueueManager.enqueue(queue, TargetManager.from_list(["1", "2", "3"]))

    _create_storage(DEFAULT_DEV_STORAGE_DATA)

    VersioninfoManager.rebuild()
    db.session.commit()


def check_queue_configs():
    """check diff of current and DEFAULT_PROD_QUEUES settings"""

    def _dump(data):
        # pyyaml doubles newlines in dumped multiline strings, get rid of them
        return yaml.safe_dump(data, sort_keys=True).replace("\n\n", "\n")

    for queue_def in DEFAULT_PROD_QUEUES + DEFAULT_DEV_QUEUES:
        if not (queue_db := Queue.query.filter_by(name=queue_def.name).one_or_none()):
            print(f"queue missing, {queue_def.name}")
            continue

        _queue_def = _dump(queue_def.to_dict())
        _queue_db = _dump(_dbqueue_to_dict(queue_db))
        diff = list(difflib.unified_diff(_queue_db.splitlines(), _queue_def.splitlines(), fromfile="queue_db", tofile="queue_def", lineterm=""))
        if diff:
            print(f"diff a/{queue_db.name} b/{queue_def.name} differs")
            print("\n".join(diff))


def db_remove():
    """remove database artefacts (including var content)"""

    db.session.close()
    db.session.remove()
    db.engine.dispose()

    db.drop_all()
    db.session.execute(text("DROP TABLE IF EXISTS alembic_version"))
    db.session.execute(text("DROP TYPE IF EXISTS severityenum"))
    db.session.commit()

    path = current_app.config["SNER_VAR"]
    for file_object in os.listdir(path):
        file_object_path = os.path.join(path, file_object)
        if os.path.isdir(file_object_path):
            shutil.rmtree(file_object_path)
        else:
            os.unlink(file_object_path)


@click.group(name="dbx", help="sner.server db management")
def command():
    """db command container"""


@command.command(name="init", help="initialize database schema")
@with_appcontext
def init():  # pragma: no cover
    """initialize database schema"""

    db.create_all()


@command.command(name="init-data", help="put initial data to database")
@with_appcontext
def initdata():
    """put initial data to database"""

    db.session.add(User(username="user1", active=True, roles=["user", "operator", "admin"]))
    initdata_dev()
    initdata_prod()


@command.command(name="remove", help="remove database (including var content)")
@with_appcontext
def remove():
    """db remove command stub"""
    db_remove()


@command.command(name="update-prod-queues", help="update new prod queues (deployment helper)")
@with_appcontext
def update_prod_queues_command():
    """update new prod queues"""
    initdata_prod()


@command.command(name="check-queue-configs", help="check if queue settings differs from defaults (deployment helper)")
@with_appcontext
def check_queue_configs_command():
    """check queues"""
    check_queue_configs()

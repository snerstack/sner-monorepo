# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner.server db command module
"""

from enum import IntEnum
import json
import os
import shutil

import click
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


def db_remove():
    """remove database artefacts (including var content)"""

    db.session.close()
    db.drop_all()
    db.session.execute(text('DROP TABLE IF EXISTS alembic_version'))
    db.session.execute(text('DROP TYPE IF EXISTS severityenum'))
    db.session.commit()

    path = current_app.config['SNER_VAR']
    for file_object in os.listdir(path):
        file_object_path = os.path.join(path, file_object)
        if os.path.isdir(file_object_path):
            shutil.rmtree(file_object_path)
        else:
            os.unlink(file_object_path)


class QueuePrio(IntEnum):
    """queue priority enum"""
    HIGH = 15
    NORMAL = 10
    LOW = 5


def initdata_prod():
    """Initialize sner queues"""

    definitions = [
        # standalone_queues
        {
            'name': 'sner.nuclei',
            'config': {'module': 'nuclei', 'args': '-rate-limit 15 -no-mhe -disable-unsigned-templates'},
            'group_size': 5,
            'priority': QueuePrio.NORMAL,
            'reqs': ['default'],
        },
        {
            'name': 'sner.testssl',
            'config': {'module': 'testssl', 'delay': 1},
            'group_size': 1,
            'priority': QueuePrio.LOW,
            'reqs': ['testssl'],
        },
        {
            'name': 'sner.sportmap',
            'config': {'module': 'sportmap', 'delay': 1},
            'group_size': 1,
            'priority': QueuePrio.NORMAL,
            'reqs': ['sportmap'],
        },

        # basic scan
        {
            'name': 'sner.nmap.servicedisco',
            'config': {'module': 'nmap', 'args': '-sS --top-ports 10000 -Pn', 'timing_perhost': 2},
            'group_size': 1000,
            'priority': QueuePrio.NORMAL,
            'reqs': ['default'],
        },
        {
            'name': 'sner.six_dns_discover',
            'config': {'module': 'six_dns_discover', 'delay': 1},
            'group_size': 1000,
            'priority': QueuePrio.NORMAL,
            'reqs': ['default'],
        },
        {
            'name': 'sner.nmap.serviceversion',
            'config': {'module': 'manymap', 'args': '-sV --version-intensity 4 -O -Pn', 'delay': 1},
            'group_size': 50,
            'priority': QueuePrio.HIGH,
            'reqs': ['default'],
        },
        {
            'name': 'sner.jarm',
            'config': {'module': 'jarm', 'delay': 1},
            'group_size': 50,
            'priority': QueuePrio.HIGH,
            'reqs': ['default'],
        },
        {
            'name': 'sner.nmap.script',
            'config': {
                'module': 'manymap',
                'args': '-sS --script default,http-headers,ldap-rootdse,ssl-enum-ciphers,ssh-auth-methods --script-timeout 10m -Pn',
                'delay': 5
            },
            'group_size': 50,
            'priority': QueuePrio.HIGH,
            'reqs': ['default'],
        },

        # storage_six_enum
        {
            'name': 'sner.six_enum_discover',
            'config': {'module': 'six_enum_discover', 'rate': 100},
            'group_size': 5,
            'priority': QueuePrio.NORMAL,
            'reqs': ['default'],
        },

        # nuclei_scan
        {
            'name': 'sner.nuclei.rolling',
            'config': {'module': 'nuclei', 'args': '-rate-limit 15 -no-mhe -disable-unsigned-templates'},
            'group_size': 5,
            'priority': QueuePrio.NORMAL,
            'reqs': ['default'],
        },

        # sportmap_scan
        {
            'name': 'sner.sportmap.rolling',
            'config': {'module': 'sportmap', 'delay': 1},
            'group_size': 1,
            'priority': QueuePrio.LOW,
            'reqs': ['sportmap'],
        },

        # other queues
        {
            'name': 'sner.nmap.udpscan',
            'config': {'module': 'nmap', 'args': '-sU -F -sV --version-intensity 0 -Pn --open --max-retries 1'},
            'group_size': 50,
            'priority': QueuePrio.HIGH,
            'reqs': ['default'],
        },
        {
            'name': 'sner.quicmap',
            'config': {'module': 'quicmap', 'args': '--ports 1-1024'},
            'group_size': 50,
            'priority': QueuePrio.HIGH,
            'reqs': ['default'],
        },
        {
            'name': 'pentest.nmap.fullsynscan',
            'config': {
                'module': 'nmap',
                'args': '-sS -A -p1-65535 -Pn --max-retries 3 --script-timeout 10m --min-hostgroup 20 --min-rate 900 --max-rate 1500'
            },
            'group_size': 20,
            'priority': QueuePrio.NORMAL,
            'reqs': ['default'],
        },
        {
            'name': 'auror.hostnames',
            'config': {
                'module': 'auror_hostnames',
                'git_key_path': '/absolute/file/path',
                'git_server': 'server.hostname',
            },
            'group_size': 1,
            'priority': QueuePrio.NORMAL,
            'reqs': ['auror'],
        }
    ]

    for queue_info in definitions:
        queue_info['config'] = yaml_dump(queue_info['config'])
        existing = Queue.query.filter_by(name=queue_info['name']).first()
        if not existing:
            db.session.add(Queue(**queue_info))
    db.session.commit()


def initdata_dev():
    """initialize development data"""

    queue = Queue(**{
        'name': 'dev.dummy',
        'config': yaml_dump({
            'module': 'dummy',
            'args': '--dummyparam 1'
        }),
        'group_size': 2,
        'priority': QueuePrio.NORMAL,
        'reqs': [],
    })
    db.session.add(queue)
    db.session.commit()
    QueueManager.enqueue(queue, ['1', '2', '3'])

    # storage test data host1
    aggregable_vuln = {
        'name': 'aggregable vuln',
        'xtype': 'x.agg',
        'severity': SeverityEnum.MEDIUM,
        'descr': 'aggregable vuln description',
        'data': 'agg vuln data',
        'tags': ['report:data', 'i:via_sner']
    }

    host = Host(
        address='127.4.4.4',
        hostname='testhost.testdomain.test<script>alert(1);</script>',
        os='Test Linux 1',
        comment='a some unknown service server'
    )
    db.session.add(host)

    service = Service(
        host=host,
        proto='tcp',
        port=12345,
        state='open:testreason',
        name='svcx',
        info='testservice banner',
        comment='manual testservice comment'
    )
    db.session.add(service)

    db.session.add(Vuln(host=host, **aggregable_vuln))

    db.session.add(Note(host=host, service=service, xtype='cpe', data=json.dumps(["cpe:/o:microsoft:windows_nt:3.5.1"])))
    db.session.add(Note(host=host, service=service, xtype='manual', data='some other note data', via_target='dummy.via_target'))

    # storage test data host2
    host = Host(
        address='127.3.3.3',
        hostname='testhost1.testdomain.test',
        os='Test Linux 2',
        comment='another server'
    )
    db.session.add(host)

    db.session.add(Service(
        host=host,
        proto='tcp',
        port=12345,
        state='closed:testreason',
        name='svcx'
    ))

    db.session.add(Vuln(
        host=host,
        name='test vulnerability',
        xtype='testxtype.123',
        severity=SeverityEnum.CRITICAL,
        comment='a test vulnerability comment',
        refs=['ref1', 'ref2'],
        tags=['tag1', 'tag2']
    ))

    db.session.add(Vuln(
        host=host,
        name='another test vulnerability',
        xtype='testxtype.124',
        severity=SeverityEnum.HIGH,
        comment='another vulnerability comment',
        tags=None
    ))

    db.session.add(Vuln(
        host=host,
        name='vulnerability1',
        xtype='testxtype.124',
        severity=SeverityEnum.MEDIUM,
        tags=['info']
    ))

    db.session.add(Vuln(
        host=host,
        name='vulnerability2',
        xtype='testxtype.124',
        severity=SeverityEnum.LOW,
        tags=['report']
    ))

    db.session.add(Vuln(
        host=host,
        name='vulnerability2',
        xtype='testxtype.124',
        severity=SeverityEnum.INFO,
        tags=['info']
    ))

    db.session.add(Vuln(
        host=host,
        service=Service.query.first(),
        name='vulnerability3',
        xtype='testxtype.124',
        severity=SeverityEnum.UNKNOWN,
        tags=['report']
    ))

    db.session.add(Vuln(host=host, service=Service.query.first(), **aggregable_vuln))

    db.session.add(Note(
        host=host,
        xtype='sner.testnote',
        data='testnote data<script>alert(2);</script>',
        comment='test note comment'
    ))

    product_host = Host(address='127.5.5.5', hostname='productdummy')
    db.session.add(product_host)
    product_service = Service(
        host=product_host,
        proto='tcp',
        port=80,
        state='open:syn-ack',
        name='http',
        info='product: Apache httpd version: 2.2.21 extrainfo: (Win32) mod_ssl/2.2.21 OpenSSL/1.0.0e PHP/5.3.8 mod_perl/2.0.4 Perl/v5.10.1',
    )
    db.session.add(product_service)
    product_note = Note(
        host=product_host,
        service=product_service,
        xtype='cpe',
        data='["cpe:/a:apache:http_server:2.2.21"]'
    )
    db.session.add(product_note)
    db.session.commit()  # required to obtain ids

    db.session.add(Note(
        host=product_host,
        service=product_service,
        xtype='nmap.banner_dict',
        data='{"product": "Apache httpd", "version": "2.2.21", '
             '"extrainfo": "(Win32) mod_ssl/2.2.21 OpenSSL/1.0.0e PHP/5.3.8 mod_perl/2.0.4 Perl/v5.10.1"}'
    ))
    db.session.add(Note(
        host=product_host,
        service=product_service,
        xtype='nmap.banner_dict',
        data='{"product": "Apache httpd", "version": "0.0", "extrainfo": "(xssdummy<script>alert(window);</script>) dummy/1.1"}'
    ))

    db.session.add(Note(
        host=product_host,
        service=product_service,
        xtype='hostnames',
        data='["productdummy"]'
    ))

    VersioninfoManager.rebuild()
    db.session.commit()


@click.group(name='dbx', help='sner.server db management')
def command():
    """db command container"""


@command.command(name='init', help='initialize database schema')
@with_appcontext
def init():  # pragma: no cover
    """initialize database schema"""

    db.create_all()


@command.command(name='init-data', help='put initial data to database')
@with_appcontext
def initdata():  # pylint: disable=too-many-statements
    """put initial data to database"""

    db.session.add(User(username='user1', active=True, roles=['user', 'operator', 'admin']))
    initdata_dev()
    initdata_prod()


@command.command(name='remove', help='remove database (including var content)')
@with_appcontext
def remove():
    """db remove command stub"""

    db_remove()


@command.command(name='update-prod-queues', help='update new prod queues (deployment helper)')
@with_appcontext
def update_prod_queues_command():
    """update new prod queues"""

    initdata_prod()

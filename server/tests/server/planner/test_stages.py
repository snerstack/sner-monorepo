# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
planner stages tests
"""

import logging
import os
from ipaddress import ip_address
from pathlib import Path
from unittest.mock import patch

import pytest

from sner.server.extensions import db
from sner.server.parser import ParsedItemsDb
from sner.server.planner.stages import (
    DummyStage,
    filter_external_hosts,
    filter_tarpits,
    Netlist,
    project_hosts,
    project_services,
    project_sixenum_targets,
    ServiceDisco,
    SixDisco,
    StorageCleanup,
    StorageLoader,
    StorageLoaderNuclei,
    StorageLoaderSportmap,
    StorageRescan,
    StorageSixTargetlist,
    StorageSixEnumTargetlist,
    StorageTestsslTargetlist,
)
from sner.server.scheduler.core import SchedulerService
from sner.server.scheduler.models import Job, Target
from sner.server.storage.models import Host, Note, Service, Vuln
from sner.server.utils import yaml_dump


def test_project_hosts(sample_pidb):
    """test project host"""

    hosts = project_hosts(sample_pidb)
    assert sorted(hosts) == sorted(['127.0.3.1', '127.0.4.1'])


def test_project_services(sample_pidb):
    """test project servicelist"""

    services = project_services(sample_pidb)
    assert len(services) == 202


def test_project_sixenum_targets():
    """test project_v6_enums"""

    enums = project_sixenum_targets(['::1', '2001:db8:0:0:0:00ff:fe00:0'])
    assert enums == ['sixenum://0000:0000:0000:0000:0000:0000:0000:0-ffff']


def test_filter_external_hosts():
    """test filter_nets"""

    hosts = filter_external_hosts(['127.0.0.1', '127.0.1.1'], ['127.0.0.0/24'])
    assert hosts == ['127.0.0.1']


def test_filter_tarpits(sample_pidb):
    """test filter_tarpits"""

    pidb = filter_tarpits(sample_pidb)
    assert len(pidb.hosts) == 1
    assert len(pidb.services) == 1


def test_netlist(app):  # pylint: disable=unused-argument
    """test Netlist"""

    dummy = DummyStage()
    Netlist(schedule='600s', lockname='dummylock', netlist=['127.0.0.0/31'], next_stages=[dummy]).run()
    # trigger schedule timing code, must not affect output stages
    Netlist(schedule='600s', lockname='dummylock', netlist=['127.0.0.0/31'], next_stages=[dummy]).run()

    assert dummy.task_count == 1
    assert dummy.task_args == ['127.0.0.0', '127.0.0.1']


def test_storagesixtargetlist(app, host_factory):  # pylint: disable=unused-argument
    """test StorageSixTargetlist"""

    host_factory.create(address='2001:db8:aa::1')
    host_factory.create(address='2001:db8:bb::1')
    dummy = DummyStage()
    StorageSixTargetlist(
        schedule='0s',
        lockname='dummylock',
        filternets=['2001:db8:aa::0/64'],
        next_stage=dummy
    ).run()

    expected = ['[2001:db8:aa::1]']
    assert sorted(dummy.task_args) == sorted(expected)


def test_storagesixenumtargetlist(app, host_factory):  # pylint: disable=unused-argument
    """test StorageSixEnumTargetlist"""

    host_factory.create(address='2001:db8:aa::')
    host_factory.create(address='2001:db8:bb::')
    dummy = DummyStage()
    StorageSixEnumTargetlist(
        schedule='0s',
        lockname='dummylock',
        filternets=['::/0'],
        next_stage=dummy
    ).run()

    expected = ['sixenum://2001:0db8:00aa:0000:0000:0000:0000:0-ffff', 'sixenum://2001:0db8:00bb:0000:0000:0000:0000:0-ffff']
    assert sorted(dummy.task_args) == sorted(expected)


def test_storagerescan(app, host_factory, service_factory, queue_factory):  # pylint: disable=unused-argument
    """test rescan_services pipeline"""

    service_factory.create(host=host_factory.create(address='127.0.0.1'))
    service_factory.create(host=host_factory.create(address='::1'))
    sdisco_dummy = DummyStage()
    sscan_dummy = DummyStage()
    StorageRescan(
        schedule='0s',
        lockname='dummylock',
        host_interval='0s',
        servicedisco_stage=sdisco_dummy,
        service_interval='0s',
        servicescan_stages=[sscan_dummy],
        filternets=["127.0.0.0/8", "::1/128"]
    ).run()

    assert len(sdisco_dummy.task_args) == 2
    assert len(sscan_dummy.task_args) == 2


def test_sixdiscoqueuehandler(app, job_completed_sixenumdiscover):  # pylint: disable=unused-argument
    """test SixDiscoQueueHandle"""

    dummy = DummyStage()
    SixDisco(
        queue_name=job_completed_sixenumdiscover.queue.name,
        next_stage=dummy,
        filternets=['127.0.0.0/24', '::1/128']
    ).run()

    assert dummy.task_count == 1
    assert '::1' in dummy.task_args


def test_servicedisco(app, job_completed_nmap):  # pylint: disable=unused-argument
    """test ServiceDisco"""

    dummy = DummyStage()
    ServiceDisco(queue_name=job_completed_nmap.queue.name, next_stages=[dummy]).run()

    assert dummy.task_count == 1
    assert len(dummy.task_args) == 5
    assert 'tcp://127.0.0.1:139' in dummy.task_args


def test_storageloader(app, job_completed_nmap):  # pylint: disable=unused-argument
    """test test_stage_StandaloneQueues"""

    StorageLoader(queue_name=job_completed_nmap.queue.name).run()

    assert Host.query.count() == 1
    assert Service.query.count() == 6
    assert Note.query.count() == 21


def test_storageloader_invalidjobs(app, queue_factory, job_completed_factory):  # pylint: disable=unused-argument
    """test StorageLoader planner stage"""

    queue = queue_factory.create(name='test queue', config=yaml_dump({'module': 'dummy'}))
    job = job_completed_factory.create(queue=queue, make_output=Path('tests/server/data/parser-dummy-job-invalidjson.zip').read_bytes())
    job_completed_factory.create(queue=queue, make_output=Path('tests/server/data/parser-dummy-job.zip').read_bytes())
    assert Job.query.count() == 2

    dummy = DummyStage()
    ServiceDisco(queue_name=queue.name, next_stages=[dummy]).run()

    assert job.retval == 1000
    assert Job.query.count() == 1


def test_queuehandler_nxqueue(app, job_completed_nmap):  # pylint: disable=unused-argument
    """test exception handling"""

    with pytest.raises(ValueError):
        StorageLoader(queue_name='nx queue')


def test_storagecleanup(app, host_factory, service_factory):  # pylint: disable=unused-argument
    """test planners cleanup storage stage"""

    host_factory.create(address='127.127.127.134', hostname=None, os=None, comment=None)
    service_factory.create(state='closed:test')
    StorageCleanup().run()

    assert Service.query.count() == 0
    assert Host.query.count() == 1


@pytest.mark.skipif('PYTEST_SLOW' not in os.environ, reason='large dataset test is slow')
def test_storagerescan_largedataset(runner, queue_factory, host_factory):  # pylint: disable=unused-argument
    """test StorageRescan with large dataset"""

    logger = logging.getLogger(__name__)

    logger.info('lot_of_targets prepare start')
    queue = queue_factory.create(name='queue1', config=yaml_dump({'module': 'nmap', 'args': 'arg1'}))
    existing_targets_count = 10**6
    existings_targets_vals = [
        str((queue.id, str(ip_address(idx)), SchedulerService.hashval(str(ip_address(idx)))))
        for idx in range(existing_targets_count)
    ]
    # bypass all db layers for performance
    query = 'INSERT INTO target (queue_id, target, hashval) VALUES ' + ','.join(existings_targets_vals)
    db.session.execute(query)
    logger.info('lot_of_targets prepare end')

    logger.info('lot_of_services prepare start')
    for addr in range(10):
        host = host_factory.create(address=str(ip_address(addr)))
        # bypass all db layers for performance
        query = 'INSERT INTO service (host_id, proto, port, tags) VALUES ' + ','.join([str((host.id, 'tcp', str(idx), '{}')) for idx in range(64000)])
        db.session.execute(query)
        logging.info('prepared %s', host)
    logger.info('lot_of_services prepare end')

    db.session.expire_all()

    dummy = ServiceDisco(
        queue_name='queue1',
        next_stages=[DummyStage()]
    )
    StorageRescan(
        schedule='0s',
        lockname='dummylock',
        host_interval='0s',
        servicedisco_stage=dummy,
        service_interval='0s',
        servicescan_stages=[dummy],
        filternets=["0.0.0.0/0", "::/0"]
    ).run()

    assert Target.query.count() == existing_targets_count + Service.query.count()


def test_storage_loader_nuclei(app, queue_factory, job_completed_factory, vuln_factory):  # pylint: disable=unused-argument
    """mock completed job with real data"""

    queue = queue_factory.create(
        name='nuclei.rolling.test',
        config=yaml_dump({'module': 'nuclei', 'args': 'arg1'}),
    )
    job_completed_factory.create(
        queue=queue,
        make_output=Path('tests/server/data/nuclei_movingtarget_phase1.job.zip').read_bytes()
    )

    loader = StorageLoaderNuclei(queue_name=queue.name)
    loader.run()

    assert Host.query.count() == 1
    assert Vuln.query.filter_by(xtype='nuclei.http-missing-security-headers.x-frame-options').count() == 1
    assert Vuln.query.filter_by(xtype='nuclei.readme-md').count() == 0

    host = Host.query.one()
    # should not be pruned, not nuclei.* vuln
    vuln_factory.create(host=host, name="rolling dummy", xtype="dummy", via_target=host.address)

    job_completed_factory.create(
        queue=queue,
        make_output=Path('tests/server/data/nuclei_movingtarget_phase2.job.zip').read_bytes()
    )
    loader.run()

    assert Host.query.count() == 1
    assert Vuln.query.filter_by(xtype='nuclei.http-missing-security-headers.x-frame-options').count() == 0
    assert Vuln.query.filter_by(xtype='nuclei.readme-md').count() == 1
    assert Vuln.query.filter_by(xtype='dummy').count() == 1


def test_storage_testssl_targetlist(app, service_factory):  # pylint: disable=unused-argument
    """test stage"""

    service_factory.create(port=443)
    dummy = DummyStage()

    StorageTestsslTargetlist('0s', 'lockname', dummy).run()
    assert dummy.task_count == 1


def test_storage_loader_sportmap(app, queue, host_factory, note_factory):  # pylint: disable=unused-argument
    """mock completed job with real data"""

    host1 = host_factory.create(address='127.3.4.6')
    note_factory.create(host=host1, xtype='sportmap', data='prune dummy')

    pidb = ParsedItemsDb()
    pidb.upsert_host('127.3.4.6')
    pidb.upsert_note('127.3.4.2', xtype='sportmap', data='dummy')

    loader = StorageLoaderSportmap(queue_name=queue.name)
    with patch.object(loader, '_drain') as drain_mock:
        drain_mock.return_value = [pidb]
        loader.run()

    assert Host.query.count() == 2
    assert Note.query.count() == 1

# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
planner core tests
"""

import logging
import os
from ipaddress import ip_address
from pathlib import Path

import pytest
import yaml

from sner.server.extensions import db
from sner.server.planner.core import (
    DummyStage,
    filter_external_hosts,
    filter_tarpits,
    NetlistEnum,
    Planner,
    project_hosts,
    project_services,
    project_sixenum_targets,
    ServiceDisco,
    SixDisco,
    StorageSixTargetlist,
    StorageCleanup,
    StorageLoader,
    StorageLoaderNuclei,
    StorageRescan
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


def test_netlistenum(app):  # pylint: disable=unused-argument
    """test NetlistEnum"""

    dummy = DummyStage()
    NetlistEnum('600s', ['127.0.0.0/31'], [dummy]).run()
    # trigger schedule timing code, must not affect output stages
    NetlistEnum('600s', ['127.0.0.0/31'], [dummy]).run()

    assert dummy.task_count == 1
    assert dummy.task_args == ['127.0.0.0', '127.0.0.1']


def test_storagesixtargetlist(app, host_factory):  # pylint: disable=unused-argument
    """test StorageSixTargetlist"""

    host_factory.create(address='2001:DB8:aa::')
    host_factory.create(address='2001:DB8:bb::')
    dummy = DummyStage()
    StorageSixTargetlist('0s', dummy).run()

    expected = ['sixenum://2001:0db8:00aa:0000:0000:0000:0000:0-ffff', 'sixenum://2001:0db8:00bb:0000:0000:0000:0000:0-ffff']
    assert sorted(dummy.task_args) == sorted(expected)


def test_storagerescan(app, host_factory, service_factory, queue_factory):  # pylint: disable=unused-argument
    """test rescan_services pipeline"""

    service_factory.create(host=host_factory.create(address='127.0.0.1'))
    service_factory.create(host=host_factory.create(address='::1'))
    sdisco_dummy = DummyStage()
    sscan_dummy = DummyStage()
    StorageRescan('0s', '0s', sdisco_dummy, '0s', [sscan_dummy]).run()

    assert len(sdisco_dummy.task_args) == 2
    assert len(sscan_dummy.task_args) == 2


def test_sixdiscoqueuehandler(app, job_completed_sixenumdiscover):  # pylint: disable=unused-argument
    """test SixDiscoQueueHandle"""

    dummy = DummyStage()
    SixDisco(job_completed_sixenumdiscover.queue.name, dummy, ['127.0.0.0/24', '::1/128']).run()

    assert dummy.task_count == 1
    assert '::1' in dummy.task_args


def test_servicedisco(app, job_completed_nmap):  # pylint: disable=unused-argument
    """test ServiceDisco"""

    dummy = DummyStage()
    ServiceDisco(job_completed_nmap.queue.name, [dummy]).run()

    assert dummy.task_count == 1
    assert len(dummy.task_args) == 5
    assert 'tcp://127.0.0.1:139' in dummy.task_args


def test_storageloader(app, job_completed_nmap):  # pylint: disable=unused-argument
    """test test_stage_StandaloneQueues"""

    StorageLoader(job_completed_nmap.queue.name).run()

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
    ServiceDisco(queue.name, [dummy]).run()

    assert job.retval == 1000
    assert Job.query.count() == 1


def test_queuehandler_nxqueue(app, job_completed_nmap):  # pylint: disable=unused-argument
    """test exception handling"""

    with pytest.raises(ValueError):
        StorageLoader('nx queue')


def test_storagecleanup(app, host_factory, service_factory):  # pylint: disable=unused-argument
    """test planners cleanup storage stage"""

    host_factory.create(address='127.127.127.134', hostname=None, os=None, comment=None)
    service_factory.create(state='closed:test')
    StorageCleanup().run()

    assert Service.query.count() == 0
    assert Host.query.count() == 1


def test_planner_simple(app, queue_factory):  # pylint: disable=unused-argument
    """try somewhat default config"""

    queue_factory.create(name='sner.nmap.serviceversion')
    queue_factory.create(name='sner.nmap.servicedisco')
    queue_factory.create(name='sner.six_dns_discover')
    queue_factory.create(name='sner.six_enum_discover')
    queue_factory.create(name='standalone')
    queue_factory.create(name='sner.nuclei.rolling')

    config = yaml.safe_load("""
basic_nets_ipv4: []
basic_nets_ipv6: ['::1/128']
nuclei_nets_ipv4: []

pipelines:
    standalone_queues:
      queues:
        - standalone

    basic_scan:
      netlist_schedule: 5days
      service_disco_queue: sner.nmap.servicedisco
      six_dns_disco_queue: sner.six_dns_discover
      service_scan_queues:
        - sner.nmap.serviceversion

    basic_rescan:
      schedule: 1day
      host_interval: 3days
      service_interval: 2days

    storage_six_enum:
      schedule: 2days
      queue: sner.six_enum_discover

    nuclei_scan:
      netlist_schedule: 5days
      queue: sner.nuclei.rolling

    storage_cleanup:
      enabled: true

    rebuild_versioninfo_map:
      schedule: 10minutes
""")

    planner = Planner(config, oneshot=True)
    planner.run()


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

    dummy = ServiceDisco('queue1', [DummyStage()])
    StorageRescan('0s', '0s', dummy, '0s', [dummy]).run()

    assert Target.query.count() == existing_targets_count + Service.query.count()


def test_planner_dumptargets(app):  # pylint: disable=unused-argument
    """test dump targets"""

    config = yaml.safe_load("""
basic_nets_ipv4: ['127.0.0.11/32']
basic_nets_ipv6: ['::1/128']
""")

    planner = Planner(config)
    assert len(planner.dump_targets()) == 1


def test_storage_loader_nuclei(app, queue_factory, job_completed_factory):  # pylint: disable=unused-argument
    """mock completed job with real data"""

    queue = queue_factory.create(
        name='nuclei.rolling.test',
        config=yaml_dump({'module': 'nuclei', 'args': 'arg1'}),
    )
    job_completed_factory.create(
        queue=queue,
        make_output=Path('tests/server/data/nuclei_movingtarget_phase1.job.zip').read_bytes()
    )

    loader = StorageLoaderNuclei(queue.name)
    loader.run()

    assert Host.query.count() == 1
    assert Vuln.query.filter_by(xtype='nuclei.http-missing-security-headers.x-frame-options').count() == 1
    assert Vuln.query.filter_by(xtype='nuclei.readme-md').count() == 0

    job_completed_factory.create(
        queue=queue,
        make_output=Path('tests/server/data/nuclei_movingtarget_phase2.job.zip').read_bytes()
    )
    loader.run()

    assert Host.query.count() == 1
    assert Vuln.query.filter_by(xtype='nuclei.http-missing-security-headers.x-frame-options').count() == 0
    assert Vuln.query.filter_by(xtype='nuclei.readme-md').count() == 1

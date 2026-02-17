# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
planner stages tests
"""

from unittest.mock import patch

import pytest

from sner.server.parser import ParsedItemsDb
from sner.server.planner.stages import (
    AurorHostnamesStorageLoader,
    DummyStage,
    filter_tarpits,
    Netlist,
    PruningStorageLoader,
    ServiceDisco,
    SixDisco,
    SportmapStorageLoader,
    StorageCleanup,
    StorageHostRescan,
    StorageLoader,
    StorageSixEnumTargetlist,
    StorageSixTargetlist,
)
from sner.server.storage.models import Host, Note, Service, Vuln
from sner.server.utils import yaml_dump
from sner.targets import TargetManager, HostTarget, GenericTarget


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
    assert dummy.task_args == TargetManager.from_list(['127.0.0.0', '127.0.0.1'])


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

    expected = [HostTarget("2001:db8:aa::1")]
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

    expected = ['sixenum,2001:0db8:00aa:0000:0000:0000:0000:0-ffff', 'sixenum,2001:0db8:00bb:0000:0000:0000:0000:0-ffff']
    assert sorted(map(str, dummy.task_args)) == sorted(expected)


def test_storagehostrescan(app, host_factory, service_factory, queue_factory):  # pylint: disable=unused-argument
    """test rescan_services pipeline"""

    service_factory.create(host=host_factory.create(address='127.0.0.1'))
    service_factory.create(host=host_factory.create(address='::1'))
    sdisco_dummy = DummyStage()
    StorageHostRescan(
        schedule='0s',
        lockname='dummylock',
        filternets=["127.0.0.0/8", "::1/128"],
        host_interval='0s',
        servicedisco_stage=sdisco_dummy,
    ).run()

    assert len(sdisco_dummy.task_args) == 2


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


def test_storageloader(app, job_completed_nmap):  # pylint: disable=unused-argument
    """test test_stage_StandaloneQueues"""

    StorageLoader(queue_name=job_completed_nmap.queue.name).run()

    assert Host.query.count() == 1
    assert Service.query.count() == 6
    assert Note.query.count() == 20


def test_queuehandler(app, queue):  # pylint: disable=unused-argument
    """test queue handler"""

    stage = ServiceDisco(queue.name)
    target = GenericTarget("dummy")

    stage.task([target])
    assert len(queue.targets) == 1

    stage.task([target])
    assert len(queue.targets) == 1


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


def test_storage_loader_sportmap(app, queue, host_factory, note_factory):  # pylint: disable=unused-argument
    """mock completed job with real data"""

    host1 = host_factory.create(address='127.3.4.6')
    note_factory.create(host=host1, xtype='sportmap', data='prune dummy')

    pidb = ParsedItemsDb()
    pidb.upsert_host('127.3.4.6')
    pidb.upsert_note('127.3.4.2', xtype='sportmap', data='dummy')

    loader = SportmapStorageLoader(queue_name=queue.name)
    with patch.object(loader, '_drain') as drain_mock:
        drain_mock.return_value = [pidb]
        loader.run()

    assert Host.query.count() == 2
    assert Note.query.count() == 1


def test_storage_loader_auror_hostnames(app, queue_factory, job_completed_factory, host_factory, note_factory):  # pylint: disable=unused-argument
    """mock completed job with real data"""

    host1 = host_factory.create(address='127.0.0.1')
    note_factory.create(host=host1, xtype='auror.hostnames', data='["adummy1.hostname.test"]')
    host2 = host_factory.create(address='127.0.0.2')
    note_factory.create(host=host2, xtype='auror.hostnames', data='["adummy2.hostname.test"]')
    host_factory.create(address='::1')
    queue = queue_factory.create(
        name='test queue',
        config=yaml_dump({'module': 'auror_hostnames', 'git_key_path': 'dummy', 'git_key_server': 'dummy'}),
    )
    job_completed_factory.create(
        queue=queue,
        make_output="tests/server/data/parser-auror_hostnames-job.zip"
    )

    AurorHostnamesStorageLoader(queue_name=queue.name).run()

    assert Note.query.count() == 2


def test_versionscan(app, queue_factory):  # pylint: disable=unused-argument
    """test version scan stage"""

    queue1 = queue_factory.create(name="queue1")
    stage = PruningStorageLoader(queue1.name)

    pidb = ParsedItemsDb()
    pidb.insert_target("svc,127.0.0.1,proto=tcp,port=1")
    pidb.upsert_note("127.0.0.1", "cpe", service_proto="tcp", service_port=1, via_target="127.0.0.1", data="dummy1")
    pidb.upsert_note("127.0.0.1", "nmap.banner_dict", service_proto="tcp", service_port=1, via_target="127.0.0.1", data="dummy2")
    pidb.upsert_note("127.0.0.1", "nmap.clock-skew", service_proto=None, service_port=None, via_target="127.0.0.1", data="dummy3")

    with patch.object(stage, "_drain", return_value=[pidb]):
        stage.run()

    assert Service.query.filter_by(proto="tcp").count() == 1
    assert Note.query.count() == 3

    pidb = ParsedItemsDb()
    pidb.insert_target("svc,127.0.0.1,proto=tcp,port=1")
    pidb.upsert_service("127.0.0.1", "tcp", 1, state="open")
    pidb.upsert_note("127.0.0.1", "nmap.clock-skew", service_proto=None, service_port=None, via_target="127.0.0.1", data="dummy3")

    with patch.object(stage, "_drain", return_value=[pidb]):
        stage.run()

    assert Service.query.filter_by(proto="tcp").count() == 1
    assert Note.query.count() == 1


def test_nucleiscan(app, queue_factory, job_completed_factory, vuln_factory):  # pylint: disable=unused-argument
    """mock completed job with real data"""

    queue = queue_factory.create(
        name="nuclei.rolling.test",
        config=yaml_dump({"module": "nuclei", "args": "arg1"}),
    )
    job_completed_factory.create(
        queue=queue,
        make_output="tests/server/data/nuclei_v2_movingtarget_phase1.job.zip",
    )

    stage = PruningStorageLoader(queue_name=queue.name)
    stage.run()

    assert Host.query.count() == 1
    assert Vuln.query.filter_by(xtype="nuclei.http-missing-security-headers.x-frame-options").count() == 1
    assert Vuln.query.filter_by(xtype="nuclei.readme-md").count() == 0

    host = Host.query.one()
    # should not be pruned, not nuclei.* vuln
    vuln_factory.create(host=host, name="rolling dummy", xtype="dummy", via_target=host.address)

    job_completed_factory.create(
        queue=queue, make_output="tests/server/data/nuclei_v2_movingtarget_phase2.job.zip"
    )
    stage.run()

    assert Host.query.count() == 1
    assert Vuln.query.filter_by(xtype="nuclei.http-missing-security-headers.x-frame-options").count() == 0
    assert Vuln.query.filter_by(xtype="nuclei.readme-md").count() == 1
    assert Vuln.query.filter_by(xtype="dummy").count() == 1

    # empty results, should prune all nuclei
    job_completed_factory.create(
        queue=queue, make_output="tests/server/data/nuclei_v2_movingtarget_phase3.job.zip"
    )
    stage.run()
    assert Host.query.count() == 1
    assert Vuln.query.filter_by(xtype="nuclei.http-missing-security-headers.x-frame-options").count() == 0
    assert Vuln.query.filter_by(xtype="nuclei.readme-md").count() == 0
    assert Vuln.query.filter_by(xtype="dummy").count() == 1

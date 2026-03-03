# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
planner stages tests
"""

from collections import namedtuple
from unittest.mock import patch

import pytest

from sner.server.parser import ParsedItemsDb
from sner.server.planner.stages import (
    DummyStage,
    HostRescanStorageTargetlist,
    Netlist,
    PruningStorageLoader,
    PruningStrategyType,
    ServiceDiscoStorageLoader,
    SixDisco,
    SixEnumStorageTargetlist,
    SixStorageTargetlist,
    SportmapStorageLoader,
    StorageCleanup,
    StorageLoader,
)
from sner.server.storage.models import Host, Note, Service, Vuln
from sner.server.utils import yaml_dump
from sner.targets import TargetManager, HostTarget, GenericTarget


def test_filter_tarpits(sample_pidb):
    """test filter_tarpits"""

    pidb = ServiceDiscoStorageLoader._filter_tarpits(sample_pidb)  # pylint: disable=protected-access
    assert len(pidb.hosts) == 1
    assert len(pidb.services) == 1


def test_filter_closed_services():
    """test filter_closed_services"""

    TestData = namedtuple("TestData", ["address", "port", "state", "note", "vuln"])
    test_data = [
        TestData("127.0.0.2", 2, "closed:test", None, None),
        TestData("127.0.0.3", 3, "closed:test", "notedummy3", "vulndummy3"),
        TestData("127.0.0.4", 4, "open:test", "notedummy4", "vulndummy4"),
        TestData("127.0.0.4", 5, "closed:test", "notedummy5", "vulndummy5"),
    ]
    pidb = ParsedItemsDb()
    for item in test_data:
        pidb.upsert_host(item.address)
        pidb.upsert_service(item.address, "tcp", item.port, state=item.state)
        if item.note:
            pidb.upsert_note(item.address, item.note, "tcp", item.port, data=item.note)
        if item.vuln:
            pidb.upsert_vuln(item.address, item.vuln, item.vuln, "tcp", item.port)

    pidb = ServiceDiscoStorageLoader._filter_closed_services(pidb)  # pylint: disable=protected-access
    assert len(pidb.hosts) == 1
    assert len(pidb.services) == 1
    assert len(pidb.vulns) == 1
    assert len(pidb.notes) == 1


def test_netlist(app):  # pylint: disable=unused-argument
    """test Netlist"""

    dummy = DummyStage()
    stage = Netlist("netlist", schedule='600s', netlist=['127.0.0.0/31'], next_stages=[dummy])
    stage.run()
    # trigger schedule timing code, must not affect output stages
    stage.run()

    assert dummy.task_count == 1
    assert dummy.task_args == TargetManager.from_list(['127.0.0.0', '127.0.0.1'])


def test_sixstoragetargetlist(app, host_factory):  # pylint: disable=unused-argument
    """test SixStorageTargetlist"""

    host_factory.create(address='2001:db8:aa::1')
    host_factory.create(address='2001:db8:bb::1')
    dummy = DummyStage()
    SixStorageTargetlist(
        "SixStorageTargetlist",
        schedule='0s',
        filternets=['2001:db8:aa::0/64'],
        next_stage=dummy
    ).run()

    expected = [HostTarget("2001:db8:aa::1")]
    assert sorted(dummy.task_args) == sorted(expected)


def test_sixenumstoragetargetlist(app, host_factory):  # pylint: disable=unused-argument
    """test SixEnumStorageTargetlist"""

    host_factory.create(address='2001:db8:aa::')
    host_factory.create(address='2001:db8:bb::')

    dummy = DummyStage()
    SixEnumStorageTargetlist(
        "SixEnumStorageTargetlist",
        schedule='0s',
        filternets=['::/0'],
        next_stage=dummy
    ).run()

    expected = ['sixenum,2001:0db8:00aa:0000:0000:0000:0000:0-ffff', 'sixenum,2001:0db8:00bb:0000:0000:0000:0000:0-ffff']
    assert sorted(map(str, dummy.task_args)) == sorted(expected)


def test_hostrescanstoragetargetlist(app, host_factory, service_factory, queue_factory):  # pylint: disable=unused-argument
    """test hostrescan"""

    service_factory.create(host=host_factory.create(address='127.0.0.1'))
    service_factory.create(host=host_factory.create(address='::1'))
    sdisco_dummy = DummyStage()
    HostRescanStorageTargetlist(
        "HostRescanStorageTargetlist",
        schedule='0s',
        filternets=["127.0.0.0/8", "::1/128"],
        host_interval='0s',
        servicedisco_stage=sdisco_dummy,
    ).run()

    assert len(sdisco_dummy.task_args) == 2


def test_sixdisco(app, job_completed_sixenumdiscover):  # pylint: disable=unused-argument
    """test SixDisco queue handler"""

    dummy = DummyStage()
    SixDisco(
        "SixDisco",
        queue_name=job_completed_sixenumdiscover.queue.name,
        filternets=['127.0.0.0/24', '::1/128'],
        next_stage=dummy,
    ).run()

    assert dummy.task_count == 1
    assert '::1' in map(str, dummy.task_args)


def test_storageloader(app, job_completed_nmap):  # pylint: disable=unused-argument
    """test test_stage_StandaloneQueues"""

    StorageLoader("StorageLoader", job_completed_nmap.queue.name).run()

    assert Host.query.count() == 1
    assert Service.query.count() == 6
    assert Note.query.count() == 20


def test_queuehandler(app, queue):  # pylint: disable=unused-argument
    """test queue handler, must test through final class"""

    stage = StorageLoader("StorageLoader", queue.name)
    target = GenericTarget("dummy")

    stage.task([target])
    assert len(queue.targets) == 1

    stage.task([target])
    assert len(queue.targets) == 1


def test_queuehandler_nxqueue(app):  # pylint: disable=unused-argument
    """test exception handling"""

    with pytest.raises(ValueError):
        StorageLoader("StorageLoader", "nx queue")


def test_storagecleanup(app, host_factory, service_factory):  # pylint: disable=unused-argument
    """test storage cleanup stage"""

    service_factory.create(host=host_factory.create(address="127.0.0.2"), state="closed:test")
    service_factory.create(host=host_factory.create(address="127.0.0.3"), state="open:test")

    StorageCleanup().run()

    assert Service.query.count() == 1
    assert Host.query.count() == 1


def test_sportmapstorageloader(app, queue, host_factory, note_factory):  # pylint: disable=unused-argument
    """mock completed job with real data"""

    host1 = host_factory.create(address='127.3.4.6')
    note_factory.create(host=host1, xtype='sportmap', data='prune dummy')

    pidb = ParsedItemsDb()
    pidb.upsert_host('127.3.4.6')
    pidb.upsert_note('127.3.4.2', xtype='sportmap', data='dummy')

    loader = SportmapStorageLoader("sportmap_scan", queue.name)
    with patch.object(loader, '_drain') as drain_mock:
        drain_mock.return_value = [pidb]
        loader.run()

    assert Host.query.count() == 2
    assert Note.query.count() == 1


def test_versionscan(app, queue_factory):  # pylint: disable=unused-argument
    """test version scan stage"""

    queue1 = queue_factory.create(name="queue1")
    stage = PruningStorageLoader("version_scan", queue1.name)

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
    """test nuclei_scan loader"""

    queue = queue_factory.create(
        name="nuclei.rolling.test",
        config=yaml_dump({"module": "nuclei", "args": "arg1"}),
    )
    job_completed_factory.create(
        queue=queue,
        make_output="tests/server/data/nuclei_v2_movingtarget_phase1.job.zip",
    )

    stage = PruningStorageLoader("nuclei_scan", queue_name=queue.name)
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


def test_nessusscan(app, queue_factory, job_completed_factory, host_factory, service_factory, vuln_factory):  # pylint: disable=unused-argument
    """test nessus scan loader"""

    queue = queue_factory.create(
        name="nessus.rolling.test",
        config=yaml_dump({"module": "nessus"}),
    )
    job_completed_factory.create(
        queue=queue,
        make_output="tests/server/data/parser-nessus-job.zip",
    )

    host = host_factory.create(address="127.0.0.1")
    service = service_factory.create(host=host, proto="tcp", port=22, state="open:dummy")
    vuln_factory.create(host=host, service=service, source=queue.name, xtype="nessus.delete_dummy", data="dummy")

    stage = PruningStorageLoader("nessus_scan", queue_name=queue.name, strategy=PruningStrategyType.HOST)
    stage.run()

    assert Host.query.count() == 1
    assert Vuln.query.count() == 2
    assert Vuln.query.filter_by(xtype="nessus.14272").count() == 1
    assert Vuln.query.filter_by(xtype="nessus.45590").count() == 1
    assert Vuln.query.filter_by(xtype="nessus.delete_dummy").count() == 0

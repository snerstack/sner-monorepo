# This file is part of sner project governed by MIT license, see the LICENSE.txt file.
"""
planner auror stages tests
"""

import json
from collections import namedtuple

from sner.server.planner.stages import DummyStage
from sner.server.planner.stages_auror import (
    AurorHostnamesStorageLoader,
    AurorHostnamesTrigger,
    AurorTestsslStorageCleanup,
    AurorTestsslStorageTargetlist,
)
from sner.server.storage.models import Host, Note
from sner.server.utils import yaml_dump


def test_auror_hostnames_trigger(app):  # pylint: disable=unused-argument
    """test stage"""

    dummy = DummyStage()
    AurorHostnamesTrigger("AurorHostnamesTrigger", schedule="1d", next_stage=dummy).run()

    assert len(dummy.task_args) == 1


def test_auror_hostnames_storage_loader(app, queue_factory, job_completed_factory, host_factory, note_factory):  # pylint: disable=unused-argument
    """test auror_hostnames"""

    def hostnames_for(addr):
        if note := Note.query.join(Host).filter(Host.address == addr).one_or_none():
            return json.loads(note.data)
        return None

    def prepare_testdata():
        TestData = namedtuple("TestData", ["address", "hostnames"])
        test_data = [
            TestData("127.0.0.1", ["dummy1"]),
            TestData("127.0.0.2", ["dummy2"]),
            TestData("::1", []),
        ]
        for item in test_data:
            host = host_factory.create(address=item.address)
            if item.hostnames:
                note_factory.create(host=host, xtype="auror.hostnames", data=json.dumps(item.hostnames))

    prepare_testdata()
    queue = queue_factory.create(
        name="test queue",
        config=yaml_dump({"module": "auror_hostnames", "git_key_path": "dummy", "git_key_server": "dummy"}),
    )
    job_completed_factory.create(queue=queue, make_output="tests/server/data/parser-auror_hostnames-job.zip")

    AurorHostnamesStorageLoader("AurorHostnamesStorageLoader", queue.name).run()

    assert Note.query.count() == 2
    assert hostnames_for("127.0.0.1") == ["localhost", "test.localdomain"]
    assert hostnames_for("127.0.0.2") is None
    assert hostnames_for("::1") == ["localhost"]


def test_auror_testssl_storage_targetlist(app, host_factory, note_factory, service_factory):  # pylint: disable=unused-argument
    """test stage"""

    def prepare_testdata():
        TestData = namedtuple("TestData", ["address", "hostname", "port", "port_name", "hostnames"])
        test_models = [
            TestData("127.0.0.1", None, 443, "https", []),
            TestData("::1", "localhost.localdomain", 25, "smtp", []),
            TestData(
                "127.0.0.3", "localhost.localdomain", 80, "http", ["localhost.localdomain", "localhost.localdomain"]
            ),
        ]
        for item in test_models:
            host = host_factory.create(address=item.address, hostname=item.hostname)
            service = service_factory.create(
                host=host, proto="tcp", port=item.port, name=item.port_name, state="open:test"
            )
            note_factory.create(host=host, service=service, xtype="nmap.ssl-cert", data="dummy")
            if item.hostnames:
                note_factory.create(host=host, xtype="auror.hostnames", data=json.dumps(item.hostnames))

    prepare_testdata()
    dummy = DummyStage()

    AurorTestsslStorageTargetlist(
        "AurorTestsslStorageTargetlist",
        schedule="1d",
        filternets=["127.0.0.0/8", "::1"],
        ports_starttls={25: "smtp"},
        next_stage=dummy,
    ).run()

    expected = [
        "auror,127.0.0.1,port=443,hostname=127.0.0.1,enc=I",
        "auror,::1,port=25,hostname=localhost.localdomain,enc=I",
        "auror,::1,port=25,hostname=localhost.localdomain,enc=E",
        "auror,127.0.0.3,port=80,hostname=localhost.localdomain,enc=I",
    ]
    assert list(map(str, dummy.task_args)) == expected


def test_aurortestssl_cleanup(app, host, note_factory):  # pylint: disable=unused-argument
    """test"""

    note_factory.create(host=host, xtype="auror.hostnames", data=json.dumps(["dummy1"]))
    note_factory.create(host=host, xtype="auror.testssl.explicit", via_target="dummy1", data="dummy")
    note_factory.create(host=host, xtype="auror.testssl.implicit", via_target="dummy2", data="dummy")

    AurorTestsslStorageCleanup("AurorTestsslStorageCleanup", schedule="1d").run()

    assert Note.query.count() == 2
    assert Note.query.filter_by(xtype="auror.hostnames").count() == 1
    assert Note.query.filter_by(xtype="auror.testssl.explicit").count() == 1

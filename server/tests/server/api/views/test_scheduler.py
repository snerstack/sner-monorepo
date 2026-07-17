# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
api.views tests
"""

import base64
from http import HTTPStatus
from ipaddress import ip_network
from pathlib import Path
from unittest.mock import patch

from flask import current_app, url_for
from sqlalchemy import create_engine, func, select

import sner.server.scheduler.core
from sner.server.extensions import db
from sner.server.scheduler.core import SCHEDULER_LOCK_NUMBER, SchedulerService
from sner.server.scheduler.models import Heatmap, Job, Queue, Readynet, Target


def test_v2_scheduler_job_assign_route(api_agent, target):
    """job assign route test"""

    qname = target.queue.name

    # assign from queue by name
    response = api_agent.post_json(url_for("api.v2_scheduler_job_assign_route"), {"queue": qname})
    assert response.status_code == HTTPStatus.OK
    assert response.json
    assert len(Queue.query.filter(Queue.name == qname).one().jobs) == 1

    # assign from non-existent queue, should return response-nowork
    response = api_agent.post_json(url_for("api.v2_scheduler_job_assign_route"), {"queue": "notexist"})
    assert response.status_code == HTTPStatus.OK
    assert not response.json


def test_v2_scheduler_job_assign_route_unauthenticated(client):
    """job assign route test"""

    # attempt without credentials
    response = client.post_json(url_for("api.v2_scheduler_job_assign_route"), status="*")
    assert response.status_code == HTTPStatus.UNAUTHORIZED


def test_v2_scheduler_job_assign_route_maintenance(api_agent, target):
    """job assign route test maintenance test"""

    qname = target.queue.name

    # test maintenance
    current_app.config["SNER_MAINTENANCE"] = True
    response = api_agent.post_json(url_for("api.v2_scheduler_job_assign_route"), {"queue": qname})
    assert response.status_code == HTTPStatus.OK
    assert not response.json

    current_app.config["SNER_MAINTENANCE"] = False
    response = api_agent.post_json(url_for("api.v2_scheduler_job_assign_route"), {"queue": qname})
    assert response.status_code == HTTPStatus.OK
    assert response.json
    assert len(Queue.query.filter(Queue.name == qname).one().jobs) == 1


def test_v2_scheduler_job_assign_route_priority(api_agent, queue_factory, target_factory):
    """job assign route test"""

    queue1 = queue_factory.create(name="queue1", priority=10, active=True)
    queue2 = queue_factory.create(name="queue2", priority=20, active=True)
    target_factory.create(queue=queue1)
    target_factory.create(queue=queue2)

    response = api_agent.post_json(url_for("api.v2_scheduler_job_assign_route"))
    assert response.status_code == HTTPStatus.OK
    assert response.json

    assert len(db.session.get(Queue, queue1.id).jobs) == 0
    assert len(db.session.get(Queue, queue2.id).jobs) == 1


def test_v2_scheduler_job_assign_route_exclusion(api_agent, queue, target_factory):
    """job assign route test cleaning up excluded hosts"""

    current_app.config["SNER_EXCLUSIONS"] = [["network", "127.66.66.0/24"]]
    target_factory.create(queue=queue, target=str(ip_network(current_app.config["SNER_EXCLUSIONS"][0][1]).network_address))

    response = api_agent.post_json(url_for("api.v2_scheduler_job_assign_route"))  # should return response-nowork
    assert response.status_code == HTTPStatus.OK
    assert not response.json


def test_v2_scheduler_job_assign_route_locked(api_agent, target):  # pylint: disable=unused-argument
    """job assign route test lock handling"""

    # flush current session and create new independent connection to simulate lock from other agent
    db.session.commit()
    with create_engine(current_app.config["SQLALCHEMY_DATABASE_URI"]).connect() as conn:
        conn.execute(select(func.pg_advisory_lock(SCHEDULER_LOCK_NUMBER)))

        with patch.object(sner.server.scheduler.core.SchedulerService, "TIMEOUT_JOB_ASSIGN", 1):
            response = api_agent.post_json(url_for("api.v2_scheduler_job_assign_route"))  # should return response-nowork

        conn.execute(select(func.pg_advisory_unlock(SCHEDULER_LOCK_NUMBER)))

    assert response.status_code == HTTPStatus.OK
    assert not response.json


def test_v2_scheduler_job_output_route(api_agent, job):
    """job output route test"""

    with patch.object(sner.server.scheduler.core.SchedulerService, "HEATMAP_GC_PROBABILITY", 1.0):
        response = api_agent.post_json(
            url_for("api.v2_scheduler_job_output_route"),
            {"id": job.id, "retval": 12345, "output": base64.b64encode(b"a-test-file-contents").decode("utf-8")},
        )
    assert response.status_code == HTTPStatus.OK
    assert job.retval == 12345
    assert Path(job.output_abspath).read_text(encoding="utf-8") == "a-test-file-contents"


def test_v2_scheduler_job_output_route_invalidrequest(api_agent):
    """job output route test invalid and discarded requests"""

    response = api_agent.post_json(url_for("api.v2_scheduler_job_output_route"), {"invalid": "output"}, status="*")
    assert response.status_code == HTTPStatus.UNPROCESSABLE_ENTITY

    response = api_agent.post_json(
        url_for("api.v2_scheduler_job_output_route"), {"id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "retval": 1, "output": "invalid b64"}, status="*"
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST

    response = api_agent.post_json(
        url_for("api.v2_scheduler_job_output_route"), {"id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "retval": 1, "output": ""}
    )
    assert response.status_code == HTTPStatus.OK


def test_v2_scheduler_job_output_route_locked(api_agent, job):
    """job output route test locked"""

    # flush current session and create new independent connection to simulate lock from other agent
    db.session.commit()
    with create_engine(current_app.config["SQLALCHEMY_DATABASE_URI"]).connect() as conn:
        conn.execute(select(func.pg_advisory_lock(SCHEDULER_LOCK_NUMBER)))

        with patch.object(sner.server.scheduler.core.SchedulerService, "TIMEOUT_JOB_OUTPUT", 1):
            response = api_agent.post_json(
                url_for("api.v2_scheduler_job_output_route"),
                {"id": job.id, "retval": 12345, "output": base64.b64encode(b"a-test-file-contents").decode("utf-8")},
                status="*",
            )

        conn.execute(select(func.pg_advisory_unlock(SCHEDULER_LOCK_NUMBER)))

    assert response.status_code == HTTPStatus.TOO_MANY_REQUESTS


def test_v2_scheduler_job_lifecycle_with_heatmap(api_agent, queue, target_factory):
    """job assign route test"""

    current_app.config["SNER_HEATMAP_HOT_LEVEL"] = 1
    target_factory.create(queue=queue, target="127.0.0.1", hashval=SchedulerService.hashval("127.0.0.1"))
    target_factory.create(queue=queue, target="127.0.0.2", hashval=SchedulerService.hashval("127.0.0.2"))

    assert len(Target.query.all()) == 2
    assert len(Readynet.query.all()) == 1
    assert len(Job.query.all()) == 0
    assert len(Heatmap.query.all()) == 0

    response = api_agent.post_json(url_for("api.v2_scheduler_job_assign_route"))
    assert response.status_code == HTTPStatus.OK
    assignment = response.json
    assert assignment

    assert len(Target.query.all()) == 1
    assert len(Readynet.query.all()) == 0
    assert len(Job.query.all()) == 1
    assert len(Heatmap.query.all()) == 1

    response = api_agent.post_json(
        url_for("api.v2_scheduler_job_output_route"),
        {"id": assignment["id"], "retval": 12345, "output": base64.b64encode(b"a-test-file-contents").decode("utf-8")},
    )
    assert response.status_code == HTTPStatus.OK

    assert len(Target.query.all()) == 1
    assert len(Readynet.query.all()) == 1
    assert len(Job.query.all()) == 1

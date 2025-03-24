# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
scheduler.views.queue tests
"""

import json
from http import HTTPStatus
from pathlib import Path

from flask import url_for

from sner.server.extensions import db
from sner.server.scheduler.models import Job, Queue


def test_queue_list_json_route(cl_operator, queue):
    """queue list_json route test"""

    response = cl_operator.post(
        url_for('scheduler.queue_list_json_route'),
        {'draw': 1, 'start': 0, 'length': 1, 'search[value]': queue.name}
    )
    assert response.status_code == HTTPStatus.OK
    response_data = json.loads(response.body.decode('utf-8'))
    assert response_data['data'][0]['name'] == queue.name

    response = cl_operator.post(
        url_for('scheduler.queue_list_json_route', filter=f'Queue.name=="{queue.name}"'),
        {'draw': 1, 'start': 0, 'length': 1}
    )
    assert response.status_code == HTTPStatus.OK
    response_data = json.loads(response.body.decode('utf-8'))
    assert response_data['data'][0]['name'] == queue.name


def test_queue_add_route(cl_operator, queue_factory):
    """queue add route test"""

    aqueue = queue_factory.build()

    form_data = [('name', aqueue.name), ('config', aqueue.config), ('group_size', aqueue.group_size), ('priority', aqueue.priority)]
    response = cl_operator.post(url_for('scheduler.queue_add_route'), params=form_data, expect_errors=True)

    assert response.status_code == HTTPStatus.OK

    tqueue = Queue.query.filter(Queue.name == aqueue.name).one()
    assert tqueue.name == aqueue.name


def test_queue_add_route_config_validation(cl_operator, queue_factory):
    """queue add route test"""

    aqueue = queue_factory.build()

    form_data = [('name', aqueue.name), ('config', ''), ('group_size', aqueue.group_size), ('priority', aqueue.priority)]
    response = cl_operator.post(url_for('scheduler.queue_add_route'), params=form_data, expect_errors=True)

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "Invalid YAML: 'NoneType' object has no attribute 'read'" in response.json['error']['errors']['config']

    form_data = [('name', aqueue.name), ('config', 'queue_form'), ('group_size', aqueue.group_size), ('priority', aqueue.priority)]
    response = cl_operator.post(url_for('scheduler.queue_add_route'), params=form_data, expect_errors=True)

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert 'Invalid module specified' in response.json['error']['errors']['config']

    form_data = [('name', aqueue.name), ('config', "module: 'dummy'\nadditionalKey: 'value'\n"), ('group_size', aqueue.group_size),
                 ('priority', aqueue.priority)]
    response = cl_operator.post(url_for('scheduler.queue_add_route'), params=form_data, expect_errors=True)

    assert response.status_code == HTTPStatus.BAD_REQUEST
    assert "Invalid config: Missing key: 'args'" in response.json['error']['errors']['config']


def test_queue_edit_route(cl_operator, queue):
    """queue edit route test"""

    response = cl_operator.get(url_for('scheduler.queue_json_route', queue_id=queue.id))
    new_name = f'{response.json["name"]}_edited'

    form_data = [('name', new_name), ('config', response.json['config']), ('group_size', response.json['group_size']),
                 ('priority', response.json['priority'])]
    response = cl_operator.post(url_for('scheduler.queue_edit_route', queue_id=queue.id), params=form_data)

    assert response.status_code == HTTPStatus.OK

    assert db.session.get(Queue, queue.id).name == new_name


def test_queue_enqueue_route(cl_operator, queue, target_factory):
    """queue enqueue route test"""

    atarget = target_factory.build(queue=None)

    form_data = [('targets', f'{atarget.target}\n \n ')]
    response = cl_operator.post(url_for('scheduler.queue_enqueue_route', queue_id=queue.id), params=form_data)

    assert response.status_code == HTTPStatus.OK

    tqueue = db.session.get(Queue, queue.id)
    assert len(tqueue.targets) == 1
    assert tqueue.targets[0].target == atarget.target


def test_queue_flush_route(cl_operator, target):
    """queue flush route test"""

    queue_id = target.queue_id

    response = cl_operator.post(url_for('scheduler.queue_flush_route', queue_id=target.queue_id))
    assert response.status_code == HTTPStatus.OK

    assert not db.session.get(Queue, queue_id).targets


def test_queue_prune_route(cl_operator, job_completed):
    """queue flush route test"""

    response = cl_operator.post(url_for('scheduler.queue_prune_route', queue_id=job_completed.queue_id))
    assert response.status_code == HTTPStatus.OK

    assert not Job.query.filter(Job.queue_id == job_completed.queue_id).all()
    assert not Path(job_completed.output_abspath).exists()


def test_queue_prune_route_runningjob(cl_operator, job):
    """queue flush route test with running job; should fail, delete running job would corrupt heatmap"""

    response = cl_operator.post(url_for('scheduler.queue_prune_route', queue_id=job.queue_id), expect_errors=True)
    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR

    assert len(Job.query.filter(Job.queue_id == job.queue_id).all()) == 1


def test_queue_delete_route(cl_operator, job_completed):
    """queue delete route test"""

    tqueue = db.session.get(Queue, job_completed.queue_id)
    assert Path(tqueue.data_abspath)

    response = cl_operator.post(url_for('scheduler.queue_delete_route', queue_id=tqueue.id))
    assert response.status_code == HTTPStatus.OK

    assert not db.session.get(Queue, tqueue.id)
    assert not Path(tqueue.data_abspath).exists()


def test_queue_delete_route_runningjob(cl_operator, job):
    """queue delete route test with running job; should fail as deleting queue with running job would corrupt heatmap"""

    response = cl_operator.post(url_for('scheduler.queue_delete_route', queue_id=job.queue_id), expect_errors=True)
    assert response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR

    assert len(Job.query.filter(Job.queue_id == job.queue_id).all()) == 1


def test_queue_invalid_form_requests(cl_operator, queue):
    """queue invalid requests test"""
    response = cl_operator.post(url_for('scheduler.queue_edit_route', queue_id=queue.id), expect_errors=True)
    assert response.status_code == HTTPStatus.BAD_REQUEST

    response = cl_operator.post(url_for('scheduler.queue_enqueue_route', queue_id=queue.id), expect_errors=True)
    assert response.status_code == HTTPStatus.BAD_REQUEST

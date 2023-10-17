# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
scheduler queue views
"""

from http import HTTPStatus

from datatables import ColumnDT, DataTables
from flask import jsonify, request
from sqlalchemy import func, literal_column

from sner.server.auth.core import session_required
from sner.server.extensions import db
from sner.server.scheduler.core import QueueManager
from sner.server.scheduler.forms import QueueEnqueueForm, QueueForm
from sner.server.scheduler.models import Job, Queue, Target
from sner.server.scheduler.views import blueprint
from sner.server.utils import filter_query, error_response


@blueprint.route('/queue/list.json', methods=['GET', 'POST'])
@session_required('operator')
def queue_list_json_route():
    """list queues, data endpoint"""

    query_nr_targets = db.session.query(Target.queue_id, func.count(Target.id).label('cnt')).group_by(Target.queue_id).subquery()
    query_nr_jobs = db.session.query(Job.queue_id, func.count(Job.id).label('cnt')).group_by(Job.queue_id).subquery()
    columns = [
        ColumnDT(Queue.id, mData='id'),
        ColumnDT(Queue.name, mData='name'),
        ColumnDT(Queue.config, mData='config'),
        ColumnDT(Queue.group_size, mData='group_size'),
        ColumnDT(Queue.priority, mData='priority'),
        ColumnDT(Queue.active, mData='active'),
        ColumnDT(Queue.reqs, mData='reqs'),
        ColumnDT(func.coalesce(query_nr_targets.c.cnt, 0), mData='nr_targets', global_search=False),
        ColumnDT(func.coalesce(query_nr_jobs.c.cnt, 0), mData='nr_jobs', global_search=False),
        ColumnDT(literal_column('1'), mData='_buttons', search_method='none', global_search=False)
    ]
    query = db.session.query().select_from(Queue) \
        .outerjoin(query_nr_targets, Queue.id == query_nr_targets.c.queue_id) \
        .outerjoin(query_nr_jobs, Queue.id == query_nr_jobs.c.queue_id)
    if not (query := filter_query(query, request.values.get('filter'))):
        return jsonify({'message': 'Failed to filter query'}), HTTPStatus.BAD_REQUEST

    queues = DataTables(request.values.to_dict(), query, columns).output_result()
    return jsonify(queues)


@blueprint.route('/queue/<queue_id>.json')
@session_required('operator')
def queue_json_route(queue_id):
    """get queue"""

    queue = Queue.query.get(queue_id)

    return jsonify({
        "id": queue.id,
        "name": queue.name,
        "config": queue.config,
        "priority": queue.priority,
        "group_size": queue.group_size,
        "active": queue.active,
        "reqs": queue.reqs
        })


@blueprint.route('/queue/add', methods=['POST'])
@session_required('operator')
def queue_add_route():
    """queue add"""

    form = QueueForm()

    if form.validate_on_submit():
        queue = Queue()
        form.populate_obj(queue)
        db.session.add(queue)
        db.session.commit()
        return jsonify({"message": "Queue has been successfully added."})

    return error_response(message='Form is invalid.', errors=form.errors, code=HTTPStatus.BAD_REQUEST)


@blueprint.route('/queue/edit/<queue_id>', methods=['POST'])
@session_required('operator')
def queue_edit_route(queue_id):
    """queue edit"""

    queue = Queue.query.get(queue_id)
    form = QueueForm(obj=queue)

    if form.validate_on_submit():
        form.populate_obj(queue)
        db.session.commit()
        return jsonify({"message": "Queue has been successfully edited."})

    return error_response(message='Form is invalid.', errors=form.errors, code=HTTPStatus.BAD_REQUEST)


@blueprint.route('/queue/enqueue/<queue_id>', methods=['GET', 'POST'])
@session_required('operator')
def queue_enqueue_route(queue_id):
    """queue enqueue; put targets into queue"""

    form = QueueEnqueueForm()

    if form.validate_on_submit():
        QueueManager.enqueue(Queue.query.get(queue_id), form.data['targets'])
        return jsonify({"message": "success"})

    return error_response(message='Form is invalid.', errors=form.errors, code=HTTPStatus.BAD_REQUEST)


@blueprint.route('/queue/flush/<queue_id>', methods=['POST'])
@session_required('operator')
def queue_flush_route(queue_id):
    """queue flush; flush all targets from queue"""

    QueueManager.flush(Queue.query.get(queue_id))
    return jsonify({'message': 'Queue has been successfully flushed.'})


@blueprint.route('/queue/prune/<queue_id>', methods=['POST'])
@session_required('operator')
def queue_prune_route(queue_id):
    """queue prune; delete all queue jobs"""

    try:
        QueueManager.prune(Queue.query.get(queue_id))
        return jsonify({'message': 'Queue has been successfully pruned.'})
    except RuntimeError as exc:
        return error_response(message=f'Failed: {exc}', code=HTTPStatus.INTERNAL_SERVER_ERROR)


@blueprint.route('/queue/delete/<queue_id>', methods=['POST'])
@session_required('operator')
def queue_delete_route(queue_id):
    """queue delete"""

    try:
        QueueManager.delete(Queue.query.get(queue_id))
        return jsonify({'message': 'Queue has been successfully deleted.'})
    except RuntimeError as exc:
        return error_response(message=f'Failed: {exc}', code=HTTPStatus.INTERNAL_SERVER_ERROR)


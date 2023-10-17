# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
storage hosts views
"""

from http import HTTPStatus

import json
from datatables import ColumnDT, DataTables
from flask import jsonify, request, Response
from sqlalchemy import func, literal_column

from sner.server.auth.core import session_required
from sner.server.extensions import db
from sner.server.storage.core import model_annotate, model_delete_multiid, model_tag_multiid
from sner.server.storage.forms import HostForm, MultiidForm, TagMultiidForm
from sner.server.storage.models import Host, Note, Service, Vuln
from sner.server.storage.views import blueprint
from sner.server.utils import filter_query, SnerJSONEncoder, error_response


@blueprint.route('/host/list.json', methods=['GET', 'POST'])
@session_required('operator')
def host_list_json_route():
    """list hosts, data endpoint"""

    query_cnt_services = db.session.query(Service.host_id, func.count(Service.id).label('cnt')).group_by(Service.host_id).subquery()
    query_cnt_vulns = db.session.query(Vuln.host_id, func.count(Vuln.id).label('cnt')).group_by(Vuln.host_id).subquery()
    query_cnt_notes = db.session.query(Note.host_id, func.count(Note.id).label('cnt')).group_by(Note.host_id).subquery()
    columns = [
        ColumnDT(literal_column('1'), mData='_select', search_method='none', global_search=False),
        ColumnDT(Host.id, mData='id'),
        ColumnDT(Host.address, mData='address'),
        ColumnDT(Host.hostname, mData='hostname'),
        ColumnDT(Host.os, mData='os'),
        ColumnDT(func.coalesce(query_cnt_services.c.cnt, 0), mData='cnt_s', global_search=False),
        ColumnDT(func.coalesce(query_cnt_vulns.c.cnt, 0), mData='cnt_v', global_search=False),
        ColumnDT(func.coalesce(query_cnt_notes.c.cnt, 0), mData='cnt_n', global_search=False),
        ColumnDT(Host.tags, mData='tags'),
        ColumnDT(Host.comment, mData='comment'),
        ColumnDT(Host.created, mData='created'),
        ColumnDT(Host.modified, mData='modified'),
        ColumnDT(Host.rescan_time, mData='rescan_time'),
        ColumnDT(literal_column('1'), mData='_buttons', search_method='none', global_search=False)
    ]
    query = db.session.query().select_from(Host) \
        .outerjoin(query_cnt_services, Host.id == query_cnt_services.c.host_id) \
        .outerjoin(query_cnt_vulns, Host.id == query_cnt_vulns.c.host_id) \
        .outerjoin(query_cnt_notes, Host.id == query_cnt_notes.c.host_id)
    if not (query := filter_query(query, request.values.get('filter'))):
        return error_response(message='Failed to filter query', code=HTTPStatus.BAD_REQUEST)

    hosts = DataTables(request.values.to_dict(), query, columns).output_result()
    return Response(json.dumps(hosts, cls=SnerJSONEncoder), mimetype='application/json')


@blueprint.route('/host/add', methods=['POST'])
@session_required('operator')
def host_add_route():
    """add host"""

    form = HostForm()

    if form.validate_on_submit():
        host = Host()
        form.populate_obj(host)
        db.session.add(host)
        db.session.commit()
        return jsonify({'host_id': host.id})

    return error_response(message='Form is invalid.', errors=form.errors, code=HTTPStatus.BAD_REQUEST)


@blueprint.route('/host/edit/<host_id>', methods=['POST'])
@session_required('operator')
def host_edit_route(host_id):
    """edit host"""

    host = Host.query.get(host_id)
    form = HostForm(obj=host)

    if form.validate_on_submit():
        form.populate_obj(host)
        db.session.commit()
        return jsonify({'message': 'Host has been successfully edited.'})

    return error_response(message='Form is invalid.', errors=form.errors, code=HTTPStatus.BAD_REQUEST)


@blueprint.route('/host/delete/<host_id>', methods=['POST'])
@session_required('operator')
def host_delete_route(host_id):
    """delete host"""

    db.session.delete(Host.query.get(host_id))
    db.session.commit()
    return jsonify({'message': 'Host has been successfully deleted.'})


@blueprint.route('/host/annotate/<model_id>', methods=['GET', 'POST'])
@session_required('operator')
def host_annotate_route(model_id):
    """annotate vuln"""
    return model_annotate(Host, model_id)


@blueprint.route('/host/view/<host_id>.json')
@session_required('operator')
def host_view_json_route(host_id):
    """view host"""

    host = Host.query.get(host_id)

    if host is None:
        return error_response(message='Host not found.', code=HTTPStatus.NOT_FOUND)

    return jsonify({
        "id": host.id,
        "address": host.address,
        "hostname": host.hostname,
        "created": host.created,
        "modified": host.modified,
        "rescan_time": host.rescan_time,
        "os": host.os,
        "tags": host.tags,
        "comment": host.comment,
        "servicesCount": len(host.services),
        "vulnsCount": len(host.vulns),
        "notesCount": len(host.notes)
    })


@blueprint.route('/host/delete_multiid', methods=['POST'])
@session_required('operator')
def host_delete_multiid_route():
    """delete multiple host route"""

    form = MultiidForm()
    if form.validate_on_submit():
        model_delete_multiid(Host, [tmp.data for tmp in form.ids.entries])
        return '', HTTPStatus.OK

    return error_response(message='Form is invalid.', errors=form.errors, code=HTTPStatus.BAD_REQUEST)


@blueprint.route('/host/tag_multiid', methods=['POST'])
@session_required('operator')
def host_tag_multiid_route():
    """tag multiple route"""

    form = TagMultiidForm()

    if form.validate_on_submit():
        model_tag_multiid(Host, form.action.data, form.tag.data, [tmp.data for tmp in form.ids.entries])
        return '', HTTPStatus.OK

    return error_response(message='Form is invalid.', errors=form.errors, code=HTTPStatus.BAD_REQUEST)

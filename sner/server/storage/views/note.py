# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
storage note views
"""

from http import HTTPStatus

import json
from datatables import ColumnDT, DataTables
from flask import jsonify, request, Response
from sqlalchemy import func, literal_column

from sner.server.auth.core import session_required
from sner.server.extensions import db
from sner.server.storage.core import model_annotate, get_related_models, model_delete_multiid, model_tag_multiid
from sner.server.storage.forms import MultiidForm, NoteForm, TagMultiidForm
from sner.server.storage.models import Host, Note, Service
from sner.server.storage.views import blueprint
from sner.server.utils import filter_query, SnerJSONEncoder, error_response


@blueprint.route('/note/list.json', methods=['GET', 'POST'])
@session_required('operator')
def note_list_json_route():
    """list notes, data endpoint"""

    columns = [
        ColumnDT(literal_column('1'), mData='_select', search_method='none', global_search=False),
        ColumnDT(Note.id, mData='id'),
        ColumnDT(Host.id, mData='host_id'),
        ColumnDT(Host.address, mData='host_address'),
        ColumnDT(Host.hostname, mData='host_hostname'),
        # break pylint duplicate-code
        ColumnDT(Service.proto, mData='service_proto'),
        ColumnDT(Service.port, mData='service_port'),
        ColumnDT(func.concat_ws('/', Service.port, Service.proto), mData='service'),
        ColumnDT(Note.via_target, mData='via_target'),
        ColumnDT(Note.xtype, mData='xtype'),
        ColumnDT(Note.data, mData='data'),
        ColumnDT(Note.tags, mData='tags'),
        ColumnDT(Note.comment, mData='comment'),
        ColumnDT(Note.created, mData='created'),
        ColumnDT(Note.modified, mData='modified'),
        ColumnDT(Note.import_time, mData='import_time'),
        ColumnDT(literal_column('1'), mData='_buttons', search_method='none', global_search=False)
    ]
    query = db.session.query().select_from(Note).outerjoin(Host, Note.host_id == Host.id).outerjoin(Service, Note.service_id == Service.id)
    if not (query := filter_query(query, request.values.get('filter'))):
        return error_response(message='Failed to filter query', code=HTTPStatus.BAD_REQUEST)

    notes = DataTables(request.values.to_dict(), query, columns).output_result()
    return Response(json.dumps(notes, cls=SnerJSONEncoder), mimetype='application/json')


@blueprint.route('/note/view/<note_id>.json')
@session_required('operator')
def note_view_json_route(note_id):
    """view service"""

    note = Note.query.get(note_id)

    if note is None:
        return error_response(message='Note not found.', code=HTTPStatus.NOT_FOUND)

    return jsonify({
        "id": note.id,
        "host_id": note.host.id,
        "address": note.host.address,
        "hostname": note.host.hostname,
        "service_id": getattr(note.service, 'id', None),
        "service_port": getattr(note.service, 'port', None),
        "service_proto": getattr(note.service, 'proto', None),
        "via_target": note.via_target,
        "created": note.created,
        "modified": note.modified,
        "import_time": note.import_time,
        "xtype": note.xtype,
        "data": note.data,
        "tags": note.tags,
        "comment": note.comment,
    })


@blueprint.route('/note/add/<model_name>/<model_id>', methods=['POST'])
@session_required('operator')
def note_add_route(model_name, model_id):
    """add note to host"""

    host, service = get_related_models(model_name, model_id)
    form = NoteForm(host_id=host.id, service_id=(service.id if service else None))

    if form.validate_on_submit():
        note = Note()
        form.populate_obj(note)
        db.session.add(note)
        db.session.commit()
        return jsonify({'host_id': host.id})

    return error_response(message='Form is invalid.', errors=form.errors, code=HTTPStatus.BAD_REQUEST)


@blueprint.route('/note/edit/<note_id>', methods=['GET', 'POST'])
@session_required('operator')
def note_edit_route(note_id):
    """edit note"""

    note = Note.query.get(note_id)
    form = NoteForm(obj=note)

    if form.validate_on_submit():
        form.populate_obj(note)
        db.session.commit()
        return jsonify({'message': 'Note has been successfully edited.'})

    return error_response(message='Form is invalid.', errors=form.errors, code=HTTPStatus.BAD_REQUEST)


@blueprint.route('/note/delete/<note_id>', methods=['POST'])
@session_required('operator')
def note_delete_route(note_id):
    """delete note"""

    note = Note.query.get(note_id)
    db.session.delete(note)
    db.session.commit()
    return jsonify({'message': 'Note has been successfully deleted.'})


@blueprint.route('/note/annotate/<model_id>', methods=['POST'])
@session_required('operator')
def note_annotate_route(model_id):
    """annotate note"""
    return model_annotate(Note, model_id)


@blueprint.route('/note/delete_multiid', methods=['POST'])
@session_required('operator')
def note_delete_multiid_route():
    """delete multiple note route"""

    form = MultiidForm()
    if form.validate_on_submit():
        model_delete_multiid(Note, [tmp.data for tmp in form.ids.entries])
        return '', HTTPStatus.OK

    return error_response(message='Form is invalid.', errors=form.errors, code=HTTPStatus.BAD_REQUEST)


@blueprint.route('/note/tag_multiid', methods=['POST'])
@session_required('operator')
def note_tag_multiid_route():
    """tag multiple route"""

    form = TagMultiidForm()
    if form.validate_on_submit():
        model_tag_multiid(Note, form.action.data, form.tag.data, [tmp.data for tmp in form.ids.entries])
        return '', HTTPStatus.OK

    return error_response(message='Form is invalid.', errors=form.errors, code=HTTPStatus.BAD_REQUEST)


@blueprint.route('/note/grouped.json', methods=['GET', 'POST'])
@session_required('operator')
def note_grouped_json_route():
    """view grouped notes, data endpoint"""

    columns = [
        ColumnDT(Note.xtype, mData='xtype'),
        ColumnDT(func.count(Note.id), mData='cnt_notes', global_search=False),
    ]
    # join allows filter over host attrs
    query = db.session.query().select_from(Note) \
        .outerjoin(Host, Note.host_id == Host.id) \
        .outerjoin(Service, Note.service_id == Service.id) \
        .group_by(Note.xtype)
    if not (query := filter_query(query, request.values.get('filter'))):
        return jsonify({'message': 'Failed to filter query'}), HTTPStatus.BAD_REQUEST

    notes = DataTables(request.values.to_dict(), query, columns).output_result()
    return jsonify(notes)

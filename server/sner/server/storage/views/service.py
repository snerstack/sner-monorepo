# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
storage service views
"""

from http import HTTPStatus

import json
from datatables import ColumnDT, DataTables
from flask import jsonify, request, Response
from sqlalchemy import func, literal_column
from sqlalchemy.dialects import postgresql

from sner.server.auth.core import session_required
from sner.server.extensions import db
from sner.server.storage.core import model_annotate, model_delete_multiid, model_tag_multiid
from sner.server.storage.forms import MultiidForm, ServiceForm, TagMultiidForm
from sner.server.storage.models import Host, Service
from sner.server.storage.views import blueprint
from sner.server.utils import filter_query, SnerJSONEncoder, error_response


def service_info_column(crop):
    """return optionally cropped service.info column"""

    if crop:
        return func.array_to_string(func.string_to_array(Service.info, ' ', type_=postgresql.ARRAY(db.String))[1:int(crop)], ' ')
    return Service.info


@blueprint.route('/service/list.json', methods=['GET', 'POST'])
@session_required('operator')
def service_list_json_route():
    """list services, data endpoint"""

    columns = [
        ColumnDT(literal_column('1'), mData='_select', search_method='none', global_search=False),
        ColumnDT(Service.id, mData='id'),
        ColumnDT(Host.id, mData='host_id'),
        ColumnDT(Host.address, mData='host_address'),
        ColumnDT(Host.hostname, mData='host_hostname'),
        ColumnDT(Service.proto, mData='proto'),
        ColumnDT(Service.port, mData='port'),
        ColumnDT(Service.name, mData='name'),
        ColumnDT(Service.state, mData='state'),
        ColumnDT(Service.info, mData='info'),
        ColumnDT(Service.tags, mData='tags'),
        ColumnDT(Service.comment, mData='comment'),
        ColumnDT(Service.created, mData='created'),
        ColumnDT(Service.modified, mData='modified'),
        ColumnDT(Service.rescan_time, mData='rescan_time'),
        ColumnDT(Service.import_time, mData='import_time'),
        ColumnDT(literal_column('1'), mData='_buttons', search_method='none', global_search=False)
    ]
    query = db.session.query().select_from(Service).outerjoin(Host)
    query = filter_query(query, request.values.get('filter'))

    services = DataTables(request.values.to_dict(), query, columns).output_result()
    return Response(json.dumps(services, cls=SnerJSONEncoder), mimetype='application/json')


@blueprint.route('/service/view/<service_id>.json')
@session_required('operator')
def service_view_json_route(service_id):
    """view service"""

    service = Service.query.get(service_id)

    if service is None:
        return error_response(message='Service not found.', code=HTTPStatus.NOT_FOUND)

    return jsonify({
        "id": service.id,
        "host_id": service.host.id,
        "address": service.host.address,
        "hostname": service.host.hostname,
        "proto": service.proto,
        "port": service.port,
        "state": service.state,
        "name": service.name,
        "info": service.info,
        "tags": service.tags,
        "comment": service.comment,
    })


@blueprint.route('/service/add/<host_id>', methods=['POST'])
@session_required('operator')
def service_add_route(host_id):
    """add service to host"""

    form = ServiceForm(host_id=host_id)

    if form.validate_on_submit():
        service = Service()
        form.populate_obj(service)
        db.session.add(service)
        db.session.commit()
        return jsonify({'host_id': service.host_id})

    return error_response(message='Form is invalid.', errors=form.errors, code=HTTPStatus.BAD_REQUEST)


@blueprint.route('/service/edit/<service_id>', methods=['POST'])
@session_required('operator')
def service_edit_route(service_id):
    """edit service"""

    service = Service.query.get(service_id)
    form = ServiceForm(obj=service)

    if form.validate_on_submit():
        form.populate_obj(service)
        db.session.commit()
        return jsonify({'message': 'Service has been successfully edited.'})

    return error_response(message='Form is invalid.', errors=form.errors, code=HTTPStatus.BAD_REQUEST)


@blueprint.route('/service/delete/<service_id>', methods=['POST'])
@session_required('operator')
def service_delete_route(service_id):
    """delete service"""

    service = Service.query.get(service_id)
    db.session.delete(service)
    db.session.commit()
    return jsonify({'message': 'Service has been successfully deleted.'})


@blueprint.route('/service/annotate/<model_id>', methods=['POST'])
@session_required('operator')
def service_annotate_route(model_id):
    """annotate service"""
    return model_annotate(Service, model_id)


@blueprint.route('/service/delete_multiid', methods=['POST'])
@session_required('operator')
def service_delete_multiid_route():
    """delete multiple service route"""

    form = MultiidForm()
    if form.validate_on_submit():
        model_delete_multiid(Service, [tmp.data for tmp in form.ids.entries])
        return '', HTTPStatus.OK

    return error_response(message='Form is invalid.', errors=form.errors, code=HTTPStatus.BAD_REQUEST)


@blueprint.route('/service/tag_multiid', methods=['POST'])
@session_required('operator')
def service_tag_multiid_route():
    """tag multiple route"""

    form = TagMultiidForm()
    if form.validate_on_submit():
        model_tag_multiid(Service, form.action.data, form.tag.data, [tmp.data for tmp in form.ids.entries])
        return '', HTTPStatus.OK

    return error_response(message='Form is invalid.', errors=form.errors, code=HTTPStatus.BAD_REQUEST)


@blueprint.route('/service/grouped.json', methods=['GET', 'POST'])
@session_required('operator')
def service_grouped_json_route():
    """view grouped services, data endpoint"""

    info_column = service_info_column(request.args.get('crop'))
    columns = [
        ColumnDT(info_column, mData='info'),
        ColumnDT(func.count(Service.id), mData='cnt_services', global_search=False),
    ]
    # join allows filter over host attrs
    query = db.session.query().select_from(Service).join(Host).group_by(info_column)
    query = filter_query(query, request.values.get('filter'))

    services = DataTables(request.values.to_dict(), query, columns).output_result()
    return jsonify(services)

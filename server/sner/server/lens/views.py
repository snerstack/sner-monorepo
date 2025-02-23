# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
lens views
"""

import json
from http import HTTPStatus
from ipaddress import ip_address, ip_network

from datatables import ColumnDT, DataTables
from flask import Blueprint, jsonify, request, Response
from flask_login import current_user
from sqlalchemy import func, or_

from sner.server.auth.core import session_required
from sner.server.extensions import db
from sner.server.storage.models import Host, Service, Vuln
from sner.server.utils import error_response, SnerJSONEncoder


blueprint = Blueprint('lens', __name__)  # pylint: disable=invalid-name


@blueprint.route("/host/view/<host_id>.json")
@session_required("user")
def host_view_json_route(host_id):
    """lens host json data provider"""

    host = Host.query.get(host_id)
    if host is None:
        return error_response(message="Host not found.", code=HTTPStatus.NOT_FOUND)

    addr = ip_address(host.address)
    if not any((addr in net) for net in map(ip_network, current_user.api_networks)):
        return error_response(message="Access forbidden.", code=HTTPStatus.FORBIDDEN)

    services = [
        {
            "id": svc.id,
            "proto": svc.proto,
            "port": svc.port,
            "state": svc.state,
            "info": svc.info,

            "tags": svc.tags,
            "comment": svc.comment,

            "_notes_ids": [x.id for x in svc.notes],
            "_vulns_ids": [x.id for x in svc.vulns],
        }
        for svc
        in sorted(host.services, key=lambda x: (x.proto, x.port, x.id))
    ]

    notes = [
        {
            "id": note.id,
            "host_id": note.host_id,
            "service_id": note.service_id,
            "xtype": note.xtype,
            "data": note.data,

            "tags": note.tags,
            "comment": note.comment,
        }
        for note
        in sorted(host.notes, key=lambda x: (x.xtype, x.id))
    ]

    vulns = [
        {
            "id": vuln.id,
            "host_id": vuln.host_id,
            "service_id": vuln.service_id,
            "via_target": vuln.via_target,
            "name": vuln.name,
            "xtype": vuln.xtype,
            "severity": str(vuln.severity),
            "descr": vuln.descr,
            "data": vuln.data,
            "refs": vuln.refs,

            "tags": vuln.tags,
            "comment": vuln.comment,
            "created": vuln.created,
            "modified": vuln.modified,
            "rescan_time": vuln.rescan_time,
            "import_time": vuln.import_time,

            "_service_ident": f"{vuln.service.port}/{vuln.service.proto}" if vuln.service_id else "host",
        }
        for vuln
        in sorted(
            host.vulns,
            key=lambda x: (
                (x.service.port, x.service.proto) if x.service else None,
                x.name,
                x.xtype,
                x.id
            )
        )
    ]

    return jsonify({
        "id": host.id,
        "address": host.address,
        "hostname": host.hostname,
        "os": host.os,

        "tags": host.tags,
        "comment": host.comment,
        "created": host.created,
        "modified": host.modified,
        "rescan_time": host.rescan_time,

        "services": services,
        "notes": notes,
        "vulns": vulns,
    })


@blueprint.route('/host/list.json', methods=['GET', 'POST'])
@session_required('user')
def host_list_json_route():
    """list hosts, data endpoint"""

    count_services = db.session.query(Service.host_id, func.count(Service.id).label('count')).group_by(Service.host_id).subquery()
    count_vulns = db.session.query(Vuln.host_id, func.count(Vuln.id).label('count')).group_by(Vuln.host_id).subquery()
    columns = [
        ColumnDT(Host.id, mData='id'),
        ColumnDT(Host.address, mData='address'),
        ColumnDT(Host.hostname, mData='hostname'),
        ColumnDT(func.coalesce(count_services.c.count, 0), mData='services', global_search=False),
        ColumnDT(func.coalesce(count_vulns.c.count, 0), mData='vulns', global_search=False),
        ColumnDT(Host.tags, mData='tags'),
    ]

    restrict = [Host.address.op('<<=')(net) for net in current_user.api_networks]
    query = db.session.query().select_from(Host) \
        .filter(or_(*restrict)) \
        .outerjoin(count_services, Host.id == count_services.c.host_id) \
        .outerjoin(count_vulns, Host.id == count_vulns.c.host_id)

    # query = filter_query(query, request.values.get('filter'))

    hosts = DataTables(request.values.to_dict(), query, columns).output_result()
    return Response(json.dumps(hosts, cls=SnerJSONEncoder), mimetype='application/json')


@blueprint.route('/service/list.json', methods=['GET', 'POST'])
@session_required('user')
def service_list_json_route():
    """list services, data endpoint"""

    columns = [
        ColumnDT(Service.id, mData='id'),
        ColumnDT(Host.id, mData='host_id'),
        ColumnDT(Host.address, mData='host_address'),
        ColumnDT(Host.hostname, mData='host_hostname'),
        ColumnDT(Service.proto, mData='proto'),
        ColumnDT(Service.port, mData='port'),
        # break pylint duplicate-code detection
        ColumnDT(Service.name, mData='name'),
        ColumnDT(Service.state, mData='state'),
        ColumnDT(Service.info, mData='info'),
        ColumnDT(Service.tags, mData='tags'),
    ]

    restrict = [Host.address.op('<<=')(net) for net in current_user.api_networks]
    query = db.session.query().select_from(Service) \
        .outerjoin(Host) \
        .filter(or_(*restrict))

    # query = filter_query(query, request.values.get('filter'))

    services = DataTables(request.values.to_dict(), query, columns).output_result()
    return Response(json.dumps(services, cls=SnerJSONEncoder), mimetype='application/json')


@blueprint.route('/vuln/list.json', methods=['GET', 'POST'])
@session_required('user')
def vuln_list_json_route():
    """lens list vulns, data endpoint"""

    columns = [
        ColumnDT(Vuln.id, mData='id'),
        ColumnDT(Host.id, mData='host_id'),
        ColumnDT(Host.address, mData='host_address'),
        ColumnDT(Host.hostname, mData='host_hostname'),
        ColumnDT(Service.proto, mData='service_proto'),
        ColumnDT(Service.port, mData='service_port'),
        # break pylint duplicate-code detection
        ColumnDT(func.concat_ws('/', Service.port, Service.proto), mData='service'),
        ColumnDT(Vuln.via_target, mData='via_target'),
        ColumnDT(Vuln.name, mData='name'),
        ColumnDT(Vuln.xtype, mData='xtype'),
        ColumnDT(Vuln.severity, mData='severity'),
        ColumnDT(Vuln.refs, mData='refs'),
        ColumnDT(Vuln.tags, mData='tags'),
    ]

    restrict = [Host.address.op('<<=')(net) for net in current_user.api_networks]
    query = db.session.query().select_from(Vuln) \
        .outerjoin(Host, Vuln.host_id == Host.id) \
        .outerjoin(Service, Vuln.service_id == Service.id) \
        .filter(or_(*restrict))

    # query = filter_query(query, request.values.get('filter'))

    vulns = DataTables(request.values.to_dict(), query, columns).output_result()
    return Response(json.dumps(vulns, cls=SnerJSONEncoder), mimetype='application/json')

# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
lens views
"""

from http import HTTPStatus
from ipaddress import ip_address, ip_network

from flask import Blueprint, jsonify
from flask_login import current_user

from sner.server.auth.core import session_required
from sner.server.storage.models import Host
from sner.server.utils import error_response


blueprint = Blueprint('lens', __name__)  # pylint: disable=invalid-name


@blueprint.route("/host/<host_id>.json")
@session_required("user")
def host_json_route(host_id):
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

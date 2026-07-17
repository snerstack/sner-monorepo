# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
apiv2 controller
"""

import json
from collections import defaultdict
from dataclasses import dataclass
from http import HTTPStatus

from flask import abort, current_app
from flask_login import current_user
from flask_smorest import Page
from sqlalchemy import and_, or_, select

import sner.server.api.schema as api_schema
from sner.server.api.core import current_user_api_network_filter
from sner.server.api.views import blueprint
from sner.server.auth.core import apikey_required
from sner.server.extensions import db
from sner.server.storage.models import Host, Note, Service, Versioninfo, Vuln
from sner.server.storage.version_parser import is_in_version_range
from sner.server.storage.version_parser import parse as versionspec_parse
from sner.server.utils import error_response, filter_query


class QueryPage(Page):
    """flask_smorest paging helper class"""

    @property
    def item_count(self):
        return self.collection.count()


def paged_error_response(*args, **kwargs):
    """paged view must return result or raise exception/abort"""
    resp = error_response(*args, **kwargs)
    abort(resp[1], resp[0].json)


@blueprint.route("/v2/public/storage/host", methods=["POST"])
@apikey_required("user")
@blueprint.arguments(api_schema.PublicHostArgsSchema)
@blueprint.response(HTTPStatus.OK, api_schema.PublicHostSchema)
def v2_public_storage_host_route(args):
    """host data by address"""

    if not current_user.api_networks:
        return error_response(message="No allowed networks", code=HTTPStatus.FORBIDDEN)

    query = Host.query.filter(Host.address == str(args["address"])).filter(current_user_api_network_filter())

    host = query.one_or_none()
    if not host:
        return None

    # host.notes relation holds all notes regardless of it's link to service filter response model in order to cope with output schema
    # the desing breaks the normalzation, but allows to do simple queries for notes/vulns for with all parents attributes
    # notes.filter(Service.port=="443" OR Host.address=="78.128.214.40")
    # also https://hashrocket.com/blog/posts/modeling-polymorphic-associations-in-a-relational-database
    host_data = {**host.__dict__, "services": host.services, "notes": [note for note in host.notes if note.service_id is None]}
    current_app.logger.info(f"api.public storage host {args}")
    return host_data


@blueprint.route("/v2/public/storage/range", methods=["POST"])
@apikey_required("user")
@blueprint.arguments(api_schema.PublicRangeArgsSchema)
@blueprint.response(HTTPStatus.OK, api_schema.PublicRangeSchema(many=True))
@blueprint.paginate(QueryPage, page_size=1000, max_page_size=10000)
def v2_public_storage_range_route(args):
    """list of hosts by cidr with simplified data"""

    if not current_user.api_networks:
        return paged_error_response(message="No allowed networks", code=HTTPStatus.FORBIDDEN)

    query = Host.query.filter(Host.address.op("<<=")(str(args["cidr"]))).filter(current_user_api_network_filter())
    current_app.logger.info(f"api.public storage range {args}")
    return query


@blueprint.route("/v2/public/storage/servicelist", methods=["POST"])
@apikey_required("user")
@blueprint.arguments(api_schema.PublicListArgsSchema)
@blueprint.response(HTTPStatus.OK, api_schema.PublicServicelistSchema(many=True))
@blueprint.paginate(QueryPage, page_size=1000, max_page_size=10000)
def v2_public_storage_servicelist_route(args):
    """filtered servicelist (see sner.server.sqlafilter for syntax)"""

    if not current_user.api_networks:
        return paged_error_response(message="No allowed networks", code=HTTPStatus.FORBIDDEN)

    query = (
        db.session.query()
        .select_from(Service)
        .outerjoin(Host)
        .add_columns(Host.address, Host.hostname, Service.proto, Service.port, Service.state, Service.info)
        .filter(current_user_api_network_filter())
    )

    query = filter_query(query, args.get("filter"))
    current_app.logger.info(f"api.public storage servicelist {args}")
    return query


@blueprint.route("/v2/public/storage/vulnlist", methods=["POST"])
@apikey_required("user")
@blueprint.arguments(api_schema.PublicListArgsSchema)
@blueprint.response(HTTPStatus.OK, api_schema.PublicVulnlistSchema(many=True))
@blueprint.paginate(QueryPage, page_size=1000, max_page_size=10000)
def v2_public_storage_vulnlist_route(args):
    """filtered vulnlist (see sner.server.sqlafilter for syntax)"""

    if not current_user.api_networks:
        return paged_error_response(message="No allowed networks", code=HTTPStatus.FORBIDDEN)

    query = (
        db.session.query()
        .select_from(Vuln)
        .outerjoin(Host, Vuln.host_id == Host.id)
        .outerjoin(Service, Vuln.service_id == Service.id)
        .add_columns(
            Host.address,
            Host.hostname,
            Service.proto,
            Service.port,
            Vuln.via_target,
            Vuln.name,
            Vuln.xtype,
            Vuln.severity,
            Vuln.descr,
            Vuln.data,
            Vuln.refs,
            Vuln.tags,
            Vuln.comment,
            Vuln.created,
            Vuln.modified,
            Vuln.rescan_time,
            Vuln.import_time,
        )
        .filter(current_user_api_network_filter())
    )

    query = filter_query(query, args.get("filter"))
    current_app.logger.info(f"api.public storage vulnlist {args}")
    return query


@blueprint.route("/v2/public/storage/notelist", methods=["POST"])
@apikey_required("user")
@blueprint.arguments(api_schema.PublicListArgsSchema)
@blueprint.response(HTTPStatus.OK, api_schema.PublicNotelistSchema(many=True))
@blueprint.paginate(QueryPage, page_size=1000, max_page_size=10000)
def v2_public_storage_notelist_route(args):
    """filtered notelist (see sner.server.sqlafilter for syntax)"""

    if not current_user.api_networks:
        return paged_error_response(message="No allowed networks", code=HTTPStatus.FORBIDDEN)

    query = (
        db.session.query()
        .select_from(Note)
        .outerjoin(Host, Note.host_id == Host.id)
        .outerjoin(Service, Note.service_id == Service.id)
        .add_columns(
            Host.address,
            Host.hostname,
            Service.proto,
            Service.port,
            Note.via_target,
            Note.xtype,
            Note.data,
            Note.tags,
            Note.comment,
            Note.created,
            Note.modified,
            Note.import_time,
        )
        .filter(current_user_api_network_filter())
    )

    query = filter_query(query, args.get("filter"))
    current_app.logger.info(f"api.public storage notelist {args}")
    return query


@blueprint.route("/v2/public/storage/versioninfo", methods=["POST"])
@apikey_required("user")
@blueprint.arguments(api_schema.PublicVersioninfoArgsSchema)
@blueprint.response(HTTPStatus.OK, api_schema.PublicVersioninfoSchema(many=True))
@blueprint.paginate(Page, page_size=1000, max_page_size=10000)
def v2_public_storage_versioninfo_route(args):
    """simple version search"""

    if not current_user.api_networks:
        return paged_error_response(message="No allowed networks", code=HTTPStatus.FORBIDDEN)

    restrict = or_(*[Versioninfo.host_address.op("<<=")(net) for net in current_user.api_networks])
    query = Versioninfo.query.filter(restrict)
    query = filter_query(query, args.get("filter"))

    if "product" in args:
        query = query.filter(Versioninfo.product.ilike(f"%{args['product']}%"))

    data = query.all()

    if "versionspec" in args:
        parsed_version_specifier = versionspec_parse(args["versionspec"])
        data = list(filter(lambda item: is_in_version_range(item.version, parsed_version_specifier), data))

    current_app.logger.info(f"api.public storage versioninfo {args}")
    return data


@dataclass
class HostMapItem:
    """helper class"""

    address: str
    hostnames: set
    os: str


def _prefetch_hostmap():
    """prefetch host - auror_hostnames map sfrom storage"""

    storage_data = db.session.execute(
        select(Host.id, Host.address, Host.hostname, Host.os, Note.data).outerjoin(
            Note, and_(Note.host_id == Host.id, Note.xtype == "auror.hostnames")
        )
    ).all()

    host_map = {}
    for host_id, host_address, host_hostname, host_os, auror_hostnames in storage_data:
        hostnames = set()

        if auror_hostnames:
            hostnames.update(json.loads(auror_hostnames))
        if host_hostname:
            hostnames.add(host_hostname)
        if not hostnames:
            hostnames.add(host_address)

        host_map[host_id] = HostMapItem(host_address, hostnames, host_os)

    return host_map


def _prefetch_notesmap():
    """prefetch auror_testssl scan notes to map"""

    all_tls_notes = db.session.execute(
        select(Note.host_id, Note.service_id, Note.via_target, Note.xtype, Note.data).where(Note.xtype.like("auror.testssl%"))
    ).all()

    notes_map = defaultdict(list)
    for note in all_tls_notes:
        key = (note.host_id, note.service_id, note.via_target)
        notes_map[key].append(note)

    return notes_map


@blueprint.route("/v2/public/storage/auror", methods=["POST"])
@apikey_required("auror")
@blueprint.response(HTTPStatus.OK, api_schema.PublicAurorSchema(many=True))
def v2_public_storage_auror_route():
    """internal endpoint; get hostnames and port for auror"""

    host_map = _prefetch_hostmap()
    notes_map = _prefetch_notesmap()
    services = db.session.execute(select(Service.id, Service.host_id, Service.proto, Service.port, Service.state)).all()

    response = []
    for service_id, host_id, proto, port, state in services:
        for hostname in host_map[host_id].hostnames:
            base_item = {
                "input": {
                    "hostname": hostname,
                    "ip": host_map[host_id].address,
                    "port": port,
                    "proto": proto,
                },
                "port_scan": {"port": port, "proto": proto, "port_state": state, "os": host_map[host_id].os},
                "tls_scan": None,
            }

            key = (host_id, service_id, hostname)
            notes = notes_map[key]
            if notes:
                for note in notes:
                    tls_result = json.loads(note.data).get("auror_data", None)
                    response.append({**base_item, "tls_scan": tls_result})
            else:
                response.append(base_item)

    return response

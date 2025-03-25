# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
apiv2 controller
"""

import binascii
from base64 import b64decode
from http import HTTPStatus

from flask import current_app, jsonify, Response
from flask_login import current_user
from flask_smorest import Blueprint, Page
from sqlalchemy import or_

import sner.server.api.schema as api_schema
from sner.server.api.core import get_metrics
from sner.server.auth.core import apikey_required
from sner.server.extensions import db
from sner.server.scheduler.core import SchedulerService, SchedulerServiceBusyException
from sner.server.scheduler.models import Job
from sner.server.storage.models import Host, Note, Service, Vuln, Versioninfo
from sner.server.storage.version_parser import is_in_version_range, parse as versionspec_parse
from sner.server.utils import filter_query


blueprint = Blueprint('api', __name__)  # pylint: disable=invalid-name


class QueryPage(Page):
    """flask_smorest paging helper class"""

    @property
    def item_count(self):
        if not self.collection:
            return 0
        return self.collection.count()


@blueprint.route('/v2/scheduler/job/assign', methods=['POST'])
@apikey_required('agent')
@blueprint.arguments(api_schema.JobAssignArgsSchema)
@blueprint.response(HTTPStatus.OK, api_schema.JobAssignmentSchema)
def v2_scheduler_job_assign_route(args):
    """assign job for agent"""

    if current_app.config['SNER_MAINTENANCE']:
        return {}  # nowork

    try:
        resp = SchedulerService.job_assign(args.get('queue'), args.get('caps', []))
    except SchedulerServiceBusyException:
        resp = {}  # nowork
    return resp


@blueprint.route('/v2/scheduler/job/output', methods=['POST'])
@apikey_required('agent')
@blueprint.arguments(api_schema.JobOutputSchema)
def v2_scheduler_job_output_route(args):
    """receive output from assigned job"""

    try:
        output = b64decode(args['output'])
    except binascii.Error:
        return jsonify({'message': 'invalid request'}), HTTPStatus.BAD_REQUEST

    job = Job.query.filter(Job.id == args['id'], Job.retval == None).one_or_none()  # noqa: E711  pylint: disable=singleton-comparison
    if not job:
        # invalid/repeated requests are silently discarded, agent would delete working data
        # on it's side as well
        return jsonify({'message': 'discard job'})

    try:
        SchedulerService.job_output(job, args['retval'], output)
    except SchedulerServiceBusyException:
        return jsonify({'message': 'server busy'}), HTTPStatus.TOO_MANY_REQUESTS

    return jsonify({'message': 'success'})


@blueprint.route('/v2/metrics')
@blueprint.response(HTTPStatus.OK, {'type': 'string'}, content_type='text/plain')
def v2_stats_prometheus_route():
    """internal stats"""

    return Response(get_metrics(), mimetype='text/plain')


@blueprint.route('/v2/public/storage/host', methods=['POST'])
@apikey_required('user')
@blueprint.arguments(api_schema.PublicHostArgsSchema)
@blueprint.response(HTTPStatus.OK, api_schema.PublicHostSchema)
def v2_public_storage_host_route(args):
    """host data by address"""

    return _storage_host_api(args)


def _storage_host_api(args):
    """storage host backward compatibility stub"""

    if not current_user.api_networks:
        return None

    restrict = [Host.address.op('<<=')(net) for net in current_user.api_networks]
    query = Host.query.filter(Host.address == str(args['address'])).filter(or_(*restrict))

    host = query.one_or_none()
    if not host:
        return None

    # host.notes relation holds all notes regardless of it's link to service filter response model in order to cope with output schema
    # the desing breaks the normalzation, but allows to do simple queries for notes/vulns for with all parents attributes
    # notes.filter(Service.port=="443" OR Host.address=="78.128.214.40")
    # also https://hashrocket.com/blog/posts/modeling-polymorphic-associations-in-a-relational-database
    host_data = {
        **host.__dict__,
        'services': host.services,
        'notes': [note for note in host.notes if note.service_id is None]
    }
    current_app.logger.info(f'api.public storage host {args}')
    return host_data


@blueprint.route('/v2/public/storage/range', methods=['POST'])
@apikey_required('user')
@blueprint.arguments(api_schema.PublicRangeArgsSchema)
@blueprint.response(HTTPStatus.OK, api_schema.PublicRangeSchema(many=True))
@blueprint.paginate(QueryPage, page_size=1000, max_page_size=10000)
def v2_public_storage_range_route(args):
    """list of hosts by cidr with simplified data"""

    return _storage_range_api(args)


def _storage_range_api(args):
    """storage host backward compatibility stub"""

    if not current_user.api_networks:
        return []

    restrict = [Host.address.op('<<=')(net) for net in current_user.api_networks]
    query = Host.query.filter(Host.address.op('<<=')(str(args['cidr']))).filter(or_(*restrict))
    current_app.logger.info(f'api.public storage range {args}')
    return query


@blueprint.route('/v2/public/storage/servicelist', methods=['POST'])
@apikey_required('user')
@blueprint.arguments(api_schema.PublicListArgsSchema)
@blueprint.response(HTTPStatus.OK, api_schema.PublicServicelistSchema(many=True))
@blueprint.paginate(QueryPage, page_size=1000, max_page_size=10000)
def v2_public_storage_servicelist_route(args):
    """filtered servicelist (see sner.server.sqlafilter for syntax)"""

    if not current_user.api_networks:
        return []

    restrict = [Host.address.op('<<=')(net) for net in current_user.api_networks]
    query = db.session.query().select_from(Service).outerjoin(Host).add_columns(
        Host.address,
        Host.hostname,
        Service.proto,
        Service.port,
        Service.state,
        Service.info
    ).filter(or_(*restrict))

    query = filter_query(query, args.get('filter'))
    current_app.logger.info(f'api.public storage servicelist {args}')
    return query


@blueprint.route("/v2/public/storage/vulnlist", methods=['POST'])
@apikey_required("user")
@blueprint.arguments(api_schema.PublicListArgsSchema)
@blueprint.response(HTTPStatus.OK, api_schema.PublicVulnlistSchema(many=True))
@blueprint.paginate(QueryPage, page_size=1000, max_page_size=10000)
def v2_public_storage_vulnlist_route(args):
    """filtered vulnlist (see sner.server.sqlafilter for syntax)"""

    if not current_user.api_networks:
        return []

    restrict = [Host.address.op("<<=")(net) for net in current_user.api_networks]
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
        .filter(or_(*restrict))
    )

    query = filter_query(query, args.get("filter"))
    current_app.logger.info(f"api.public storage vulnlist {args}")
    return query


@blueprint.route("/v2/public/storage/notelist", methods=['POST'])
@apikey_required("user")
@blueprint.arguments(api_schema.PublicListArgsSchema)
@blueprint.response(HTTPStatus.OK, api_schema.PublicNotelistSchema(many=True))
@blueprint.paginate(QueryPage, page_size=1000, max_page_size=10000)
def v2_public_storage_notelist_route(args):
    """filtered notelist (see sner.server.sqlafilter for syntax)"""

    if not current_user.api_networks:
        return []

    restrict = [Host.address.op("<<=")(net) for net in current_user.api_networks]
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
        .filter(or_(*restrict))
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
        return []

    restrict = [Versioninfo.host_address.op("<<=")(net) for net in current_user.api_networks]
    query = Versioninfo.query.filter(or_(*restrict))
    query = filter_query(query, args.get("filter"))

    if "product" in args:
        query = query.filter(Versioninfo.product.ilike(f'%{args["product"]}%'))

    data = query.all()

    if "versionspec" in args:
        parsed_version_specifier = versionspec_parse(args["versionspec"])
        data = list(filter(
            lambda item: is_in_version_range(item.version, parsed_version_specifier),
            data
        ))

    current_app.logger.info(f"api.public storage versioninfo {args}")
    return data

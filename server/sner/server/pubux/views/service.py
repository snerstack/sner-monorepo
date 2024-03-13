# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
pubux service views
"""

from http import HTTPStatus

from flask_login import current_user
from sqlalchemy import or_

import sner.server.api.schema as api_schema
from sner.server.auth.core import session_required
from sner.server.storage.models import Host, Service
from sner.server.pubux.views import blueprint
from sner.server.extensions import db
from sner.server.utils import error_response, filter_query


@blueprint.route('/storage/service/list', methods=['POST'])
@blueprint.arguments(api_schema.PublicServicelistArgsSchema)
@blueprint.response(HTTPStatus.OK, api_schema.PublicServicelistSchema(many=True))
@session_required('user')
def service_list_route(args):
    """service list endpoint"""

    if not current_user.api_networks:
        return error_response('No networks', code=HTTPStatus.FORBIDDEN)

    restricted_filter = [Host.address.op('<<=')(net) for net in current_user.api_networks]

    query = db.session.query().select_from(Service).outerjoin(Host).add_columns(
        Host.address,
        Host.hostname,
        Service.proto,
        Service.port,
        Service.state,
        Service.info
    ).filter(or_(*restricted_filter))

    if not (query := filter_query(query, args.get('filter'))):
        return error_response('Failed to filter query', code=HTTPStatus.BAD_REQUEST)

    return query.all()

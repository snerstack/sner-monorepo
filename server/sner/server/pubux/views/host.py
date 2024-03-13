# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
pubux host views
"""

from http import HTTPStatus

from flask_login import current_user
from sqlalchemy import or_

import sner.server.api.schema as api_schema
from sner.server.auth.core import session_required
from sner.server.storage.models import Host
from sner.server.pubux.views import blueprint
from sner.server.utils import error_response


@blueprint.route('/storage/host', methods=['POST'])
@blueprint.arguments(api_schema.PublicHostArgsSchema)
@blueprint.response(HTTPStatus.OK, api_schema.PublicHostSchema)
@session_required('user')
def single_host_route(args):
    """host data endpoint"""

    if not current_user.api_networks:
        return error_response('No networks', code=HTTPStatus.FORBIDDEN)

    restrict = [Host.address.op('<<=')(net) for net in current_user.api_networks]
    query = Host.query.filter(Host.address == str(args['address'])).filter(or_(*restrict))

    host = query.one_or_none()
    if not host:
        return error_response('Host not found', code=HTTPStatus.NOT_FOUND)

    host_data = {
        **host.__dict__,
        'services': host.services,
        'notes': [note for note in host.notes if note.service_id is None]
    }

    return host_data


@blueprint.route('/storage/range', methods=['POST'])
@blueprint.arguments(api_schema.PublicRangeArgsSchema)
@blueprint.response(HTTPStatus.OK, api_schema.PublicRangeSchema(many=True))
@session_required('user')
def range_host_route(args):
    """host range data endpoint"""

    if not current_user.api_networks:
        return error_response('No network', code=HTTPStatus.FORBIDDEN)

    restrict = [Host.address.op('<<=')(net) for net in current_user.api_networks]
    query = Host.query.filter(Host.address.op('<<=')(str(args['cidr']))).filter(or_(*restrict))
    return query.all()

# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
pubux versioninfo views
"""

from http import HTTPStatus

from flask_login import current_user
from sqlalchemy import or_

import sner.server.api.schema as api_schema
from sner.server.auth.core import session_required
from sner.server.storage.models import Versioninfo
from sner.server.storage.version_parser import is_in_version_range, parse as versionspec_parse
from sner.server.pubux.views import blueprint
from sner.server.utils import error_response, filter_query


@blueprint.route('/storage/versioninfo', methods=['POST'])
@blueprint.arguments(api_schema.PublicVersioninfoArgsSchema)
@blueprint.response(HTTPStatus.OK, api_schema.PublicVersioninfoSchema(many=True))
@session_required('user')
def versioninfo_route(args):
    """versioninfo endpoint"""

    if not current_user.api_networks:
        return error_response('No networks', code=HTTPStatus.FORBIDDEN)

    restrict = [Versioninfo.host_address.op("<<=")(net) for net in current_user.api_networks]
    query = Versioninfo.query.filter(or_(*restrict))

    if not (query := filter_query(query, args.get("filter"))):
        return error_response('Failed to filter query', code=HTTPStatus.BAD_REQUEST)

    if "product" in args:
        query = query.filter(Versioninfo.product.ilike(f'%{args["product"]}%'))

    data = query.all()

    if "versionspec" in args:
        parsed_version_specifier = versionspec_parse(args["versionspec"])
        data = list(filter(
            lambda item: is_in_version_range(item.version, parsed_version_specifier),
            data
        ))

    return data

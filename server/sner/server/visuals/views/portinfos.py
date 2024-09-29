# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
controller portinfos
"""

from flask import jsonify, request
from sqlalchemy import desc, func

from sner.server.auth.core import session_required
from sner.server.extensions import db
from sner.server.storage.views.service import service_info_column
from sner.server.storage.models import Host, Service
from sner.server.utils import filter_query
from sner.server.visuals.views import blueprint


@blueprint.route('/portinfos.json')
@session_required('operator')
def portinfos_json_route():
    """service info visualization json data endpoint"""

    info_column = service_info_column(request.args.get('crop'))
    # join allows filter over host attrs
    query = db.session.query(info_column.label('info'), func.count(Service.id).label('info_count')).join(Host) \
        .filter(Service.info != '', Service.info != None) \
        .group_by(info_column).order_by(desc('info_count'))  # noqa: E711  pylint: disable=singleton-comparison

    query = filter_query(query, request.values.get('filter'))
    if request.values.get('limit'):
        query = query.limit(request.values.get('limit'))

    return jsonify([{'info': info, 'count': count} for info, count in query.all()])

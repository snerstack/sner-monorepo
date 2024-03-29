# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
storage jumper
"""

from http import HTTPStatus
from ipaddress import ip_address

from flask import current_app, jsonify, request
from sqlalchemy import cast, or_

from sner.server.auth.core import session_required
from sner.server.extensions import db
from sner.server.storage.forms import QuickjumpForm
from sner.server.storage.models import Host
from sner.server.storage.views import blueprint
from sner.server.utils import error_response


@blueprint.route('/quickjump', methods=['POST'])
@session_required('operator')
def quickjump_route():
    """
    returns url for quick jump via simple query-string
    """

    form = QuickjumpForm()

    if form.validate_on_submit():
        try:
            address = str(ip_address(form.quickjump.data))
        except ValueError:
            address = None
        host = Host.query.filter(or_(Host.address == address, Host.hostname.ilike(f"{form.quickjump.data}%"))).first()
        if host:
            return jsonify({'message': 'success', 'url':  f'/storage/host/view/{host.id}'})

        if form.quickjump.data.isnumeric():
            return jsonify({'message': 'success', 'url': f'/storage/service/list?filter=Service.port==\"{form.quickjump.data}\"'})

        return error_response(message='Not found.', code=HTTPStatus.NOT_FOUND)

    return error_response(message='Form is invalid.', errors=form.errors, code=HTTPStatus.BAD_REQUEST)


@blueprint.route('/quickjump_autocomplete')
@session_required('operator')
def quickjump_autocomplete_route():
    """quickjump autocomplete suggestions"""

    term = request.args.get('term', '')
    if not term:
        return jsonify([])

    data = []
    hosts = Host.query.filter(
        or_(cast(Host.address, db.String).ilike(f"%{term}%"), Host.hostname.ilike(f"%{term}%"))
    ).limit(current_app.config['SNER_AUTOCOMPLETE_LIMIT']).all()
    for host in hosts:
        if term in host.address:
            data.append(host.address)
        if host.hostname and (term in host.hostname):
            data.append(host.hostname)

    return jsonify(data)

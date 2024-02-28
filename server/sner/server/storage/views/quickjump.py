# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
storage jumper
"""

from flask import current_app, jsonify, request
from sqlalchemy import cast, or_

from sner.server.auth.core import session_required
from sner.server.extensions import db
from sner.server.storage.models import Host, Service
from sner.server.storage.views import blueprint


@blueprint.route('/quickjump_autocomplete')
@session_required('operator')
def quickjump_autocomplete_route():
    """quickjump autocomplete suggestions"""

    ip_address, port, term = request.args.get('ip'), request.args.get('port'), request.args.get('term')

    if not ip_address and not port and not term:
        return jsonify({'hosts': [], 'services': []})

    data = {
        'hosts': [],
        'services': [],
    }

    if ip_address:
        hosts = Host.query.filter(cast(Host.address, db.String).ilike(f"%{ip_address}%")).limit(current_app.config['SNER_AUTOCOMPLETE_LIMIT']).all()
        for host in hosts:
            label = host.address
            if host.hostname:
                label += f" ({host.hostname})"

            data['hosts'].append({'label': label, 'host_id': host.id})

    if port:
        services = Service.query.filter(cast(Service.port, db.String).ilike(f"%{port}%")).limit(current_app.config['SNER_AUTOCOMPLETE_LIMIT']).all()
        services = list({service.port: service for service in services}.values())

        for service in services:
            data['services'].append({'label': str(service.port), 'port': service.port})

    if term:
        hosts = Host.query.filter(
            or_(cast(Host.address, db.String).ilike(f"%{term}%"), Host.hostname.ilike(f"%{term}%"))
        ).limit(current_app.config['SNER_AUTOCOMPLETE_LIMIT']).all()
        for host in hosts:
            label = host.address
            if host.hostname:
                label += f" ({host.hostname})"

            data['hosts'].append({'label': label, 'host_id': host.id})

    return jsonify({'hosts': data['hosts'], 'services': data['services']})

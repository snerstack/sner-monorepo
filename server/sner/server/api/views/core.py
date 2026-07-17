# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
apiv2 core controller
"""

from http import HTTPStatus

from flask import Response

from sner.server.api.core import get_metrics
from sner.server.api.views import blueprint


@blueprint.route("/v2/metrics")
@blueprint.response(HTTPStatus.OK, {"type": "string"}, content_type="text/plain")
def v2_stats_prometheus_route():
    """internal stats"""

    return Response(get_metrics(), mimetype="text/plain")

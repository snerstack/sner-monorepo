# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
frontend views
"""

from flask import Blueprint, send_from_directory


blueprint = Blueprint('frontend', __name__)  # pylint: disable=invalid-name


@blueprint.route('/<path:filepath>')
def asset_route(filepath):
    """serve frontend asset"""

    return send_from_directory("../../../frontend/dist", filepath, as_attachment=False)


@blueprint.route('/')
def index_route():
    """serve frontend app"""
    return asset_route("index.html")


def pagenotfound_route(err):  # pylint: disable=unused-argument
    """serve frontend app on any url, handles app bootstrap for client-side routing"""

    return asset_route("index.html")

# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
frontend views
"""

from flask import Blueprint, current_app, jsonify, send_from_directory


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


@blueprint.route('/backend/frontend_config')
def frontend_config():
    """server frontend config"""

    return jsonify(current_app.config["SNER_FRONTEND_CONFIG"])


@blueprint.route('/backend/reset_browser_storage')
def reset_browser_storage():
    """
    reset browser state for selenium tests re-using running browser.

    calling javascript "localStorage.clear()" on selenium client directly
    gives "Operation is insecure" error
    """

    return """
        <html><body><script>
            localStorage.clear()
            sessionStorage.clear()
            // tests.selenium wait_for_js barrier
            const mainElement = document.createElement('main')
            mainElement.id = 'main'
            document.body.appendChild(mainElement)
        </script></body></html>
    """

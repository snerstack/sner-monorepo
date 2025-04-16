# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
controller internals
"""

from pathlib import Path

from flask import jsonify, current_app
import yaml

from sner.server.api.core import get_metrics
from sner.server.auth.core import session_required
from sner.server.scheduler.core import SchedulerService
from sner.server.visuals.views import blueprint


@blueprint.route('/internals.json')
@session_required('admin')
def internals_json_route():
    """show various internals"""

    lastruns = {
        item.name.removeprefix('lastrun.'): item.read_text(encoding="utf-8")
        for item in Path(current_app.config['SNER_VAR']).glob("lastrun.*")
    }

    return jsonify({
        "heatmap_check": SchedulerService.heatmap_check(),
        "metrics": get_metrics(),
        "exclusions": yaml.dump(current_app.config['SNER_EXCLUSIONS']),
        "planner": yaml.dump(current_app.config['SNER_PLANNER']),
        "lastruns": yaml.dump(lastruns)
    })

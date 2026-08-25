# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
api v2 scheduler views
"""

import binascii
from base64 import b64decode
from http import HTTPStatus

from flask import current_app, jsonify

import sner.server.api.schemas as api_schemas
from sner.server.api.views import blueprint
from sner.server.auth.core import apikey_required
from sner.server.scheduler.core import SchedulerService, SchedulerServiceBusyException
from sner.server.scheduler.models import Job

NOWORK_RESPONSE = {}


@blueprint.route("/v2/scheduler/job/assign", methods=["POST"])
@apikey_required("agent")
@blueprint.arguments(api_schemas.JobAssignArgsSchema)
@blueprint.response(HTTPStatus.OK, api_schemas.JobAssignmentSchema)
def v2_scheduler_job_assign_route(args):
    """assign job for agent"""

    if current_app.config["SNER_MAINTENANCE"]:
        return NOWORK_RESPONSE

    try:
        resp = SchedulerService.job_assign(args.get("queue"), args.get("caps", []))
    except SchedulerServiceBusyException:
        resp = NOWORK_RESPONSE
    return resp


@blueprint.route("/v2/scheduler/job/output", methods=["POST"])
@apikey_required("agent")
@blueprint.arguments(api_schemas.JobOutputSchema)
def v2_scheduler_job_output_route(args):
    """receive output from assigned job"""

    try:
        output = b64decode(args["output"])
    except binascii.Error:
        return jsonify({"message": "invalid request"}), HTTPStatus.BAD_REQUEST

    job = Job.query.filter(Job.id == args["id"], Job.retval.is_(None)).one_or_none()
    if not job:
        # invalid/repeated requests are silently discarded, agent would delete working data
        # on it's side as well
        return jsonify({"message": "discard job"})

    try:
        SchedulerService.job_output(job, args["retval"], output)
    except SchedulerServiceBusyException:
        return jsonify({"message": "server busy"}), HTTPStatus.TOO_MANY_REQUESTS

    return jsonify({"message": "success"})

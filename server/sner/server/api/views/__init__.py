# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
apiv2 controller
"""
# ruff: noqa: E402, F401
# pylint: disable=invalid-name,wrong-import-position

from flask_smorest import Blueprint

blueprint = Blueprint("api", __name__)

import sner.server.api.views.core
import sner.server.api.views.scheduler
import sner.server.api.views.storage

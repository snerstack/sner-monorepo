# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
pubux views
"""

from flask_smorest import Blueprint


blueprint = Blueprint('pubux', __name__)  # pylint: disable=invalid-name

import sner.server.pubux.views.host  # noqa: E402,F401  pylint: disable=wrong-import-position
import sner.server.pubux.views.service  # noqa: E402,F401  pylint: disable=wrong-import-position
import sner.server.pubux.views.versioninfo  # noqa: E402,F401  pylint: disable=wrong-import-position

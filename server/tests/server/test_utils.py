# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
misc server components tests
"""

from sner.server.extensions import db
from sner.server.storage.models import Host
from sner.server.utils import windowed_query


def test_windowed_query(app, host):  # pylint: disable=unused-argument
    """test windowed query"""

    assert list(windowed_query(Host.query, Host.id, 1))
    assert list(windowed_query(db.session.query(Host.id, Host.id).select_from(Host), Host.id, 1))

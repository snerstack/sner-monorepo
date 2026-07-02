# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner tests package
"""

import os

from factory.alchemy import SQLAlchemyModelFactory

from sner.server.extensions import db


class BaseModelFactory(SQLAlchemyModelFactory):  # pylint: disable=too-few-public-methods
    """test model base factory"""

    class Meta:
        """test model base factory"""

        sqlalchemy_session = db.session
        sqlalchemy_session_persistence = "commit"


def running_as_root():
    """check if running as root"""

    return os.geteuid() == 0

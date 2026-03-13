# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner tests package
"""
# pylint: disable=too-few-public-methods

from factory.alchemy import SQLAlchemyModelFactory

from sner.server.extensions import db


class BaseModelFactory(SQLAlchemyModelFactory):
    """test model base factory"""

    class Meta:
        """test model base factory"""

        sqlalchemy_session = db.session
        sqlalchemy_session_persistence = "commit"

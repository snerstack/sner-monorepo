# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auth component models
"""
# pylint: disable=too-few-public-methods,abstract-method

from datetime import datetime

import flask_login
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import relationship

from sner.server.extensions import db


class User(db.Model, flask_login.UserMixin):
    """user model"""

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(250), unique=True, nullable=False)
    password = db.Column(db.String(250))
    email = db.Column(db.String(250), unique=True, nullable=True)
    full_name = db.Column(db.String(250), nullable=True)
    active = db.Column(db.Boolean, nullable=False, default=False)
    roles = db.Column(postgresql.ARRAY(db.String, dimensions=1), nullable=False, default=[])
    apikey = db.Column(db.String(250))
    totp = db.Column(db.String(32))
    api_networks = db.Column(postgresql.ARRAY(db.String, dimensions=1), nullable=False, default=[])

    webauthn_credentials = relationship('WebauthnCredential', back_populates='user', cascade='delete,delete-orphan', passive_deletes=True)

    @property
    def is_active(self):
        """user active getter"""

        return self.active

    def has_role(self, role):
        """shortcut function to check user has role"""

        if self.roles and (role in self.roles):
            return True
        return False

    def __repr__(self):
        return f'<User {self.id}: {self.username}>'


class WebauthnCredential(db.Model):
    """Webauthn credential model"""

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    user_handle = db.Column(db.String(64), nullable=False)
    credential_data = db.Column(db.LargeBinary, nullable=False)
    name = db.Column(db.String(250))
    registered = db.Column(db.DateTime, default=datetime.utcnow)

    user = relationship('User', back_populates='webauthn_credentials')

    def __repr__(self):
        return f'<WebauthnCredential {self.id}: {self.user_id}>'

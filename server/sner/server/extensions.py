# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
app extensions module
"""
# pylint: disable=invalid-name

from authlib.integrations.flask_client import OAuth
from flask_cors import CORS
from flask_login import LoginManager
from flask_migrate import Migrate
from flask_session import Session
from flask_smorest import Api
from flask_sqlalchemy import SQLAlchemy
from flask_wtf.csrf import CSRFProtect

from sner.server.wrapped_fido2_server import WrappedFido2Server

api = Api()
db = SQLAlchemy()
cors = CORS()
csrf = CSRFProtect()
sess = Session()
login_manager = LoginManager()
migrate = Migrate()
oauth = OAuth()
webauthn = WrappedFido2Server()

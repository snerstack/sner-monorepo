# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
main application package module
"""

import json
import logging
import logging.config
import os
import sys
from http import HTTPStatus

import flask.cli
import yaml
from flask import current_app, Flask, has_request_context, request
from flask_login import current_user
from flask_wtf.csrf import generate_csrf, CSRFProtect, CSRFError
from flask_cors import CORS
from sqlalchemy import func
from werkzeug.middleware.proxy_fix import ProxyFix

from sner.agent.modules import load_agent_plugins
from sner.lib import load_yaml
from sner.server.extensions import api, db, migrate, login_manager, oauth, webauthn
from sner.server.parser import load_parser_plugins
from sner.server.scheduler.core import ExclMatcher
from sner.server.sessions import FilesystemSessionInterface
from sner.server.utils import error_response, FilterQueryError
from sner.version import __version__

# blueprints and commands
from sner.server.api.views import blueprint as api_blueprint
from sner.server.auth.views import blueprint as auth_blueprint
from sner.server.frontend.views import blueprint as frontend_blueprint, pagenotfound_route
from sner.server.lens.views import blueprint as lens_blueprint
from sner.server.scheduler.views import blueprint as scheduler_blueprint
from sner.server.storage.views import blueprint as storage_blueprint
from sner.server.visuals.views import blueprint as visuals_blueprint

from sner.server.auth.commands import command as auth_command
from sner.server.dbx_command import command as dbx_command
from sner.server.planner.commands import command as planner_command
from sner.server.psql_command import command as psql_command
from sner.server.scheduler.commands import command as scheduler_command
from sner.server.storage.commands import command as storage_command

# shell context helpers
import sner.server.auth.models as auth_models
import sner.server.scheduler.models as scheduler_models
import sner.server.storage.models as storage_models


DEFAULT_CONFIG = {
    # flask
    'SECRET_KEY': os.urandom(32),
    'XFLASK_PROXYFIX': False,

    # sqlalchemy
    'SQLALCHEMY_TRACK_MODIFICATIONS': False,
    'SQLALCHEMY_DATABASE_URI': 'postgresql:///sner',
    'SQLALCHEMY_ECHO': False,

    # sner web server
    'SNER_VAR': '/var/lib/sner',
    'SNER_AUTH_ROLES': ['admin', 'agent', 'operator', 'user'],
    'SNER_SESSION_IDLETIME': 36000,
    'SNER_TRIM_REPORT_CELLS': 65000,
    'SNER_TRIM_NOTE_LIST_DATA': 4096,
    'SNER_VULN_GROUP_IGNORE_TAG_PREFIX': "i:",
    'SNER_AUTOCOMPLETE_LIMIT': 10,
    'SNER_WEBAUTHN_RP_HOSTNAME': None,

    'SNER_FRONTEND_CONFIG': {
        "tags": {
            "host": ["reviewed", "todo"],
            "service": ["reviewed", "todo"],
            "vuln": ["info", "report", "report:data", "todo", "falsepositive"],
            "note": ["reviewed", "todo"],
            "annotate": ["sslhell"],
            "versioninfo": ["reviewed", "todo"],
            "colors": {
                "todo": "#ffc107",
                "report": "#dc3545",
                "report:": "#dc3545",
            },
        },
        "oidc_enabled": False
    },

    # sner server scheduler
    'SNER_MAINTENANCE': False,
    'SNER_HEATMAP_HOT_LEVEL': 0,
    'SNER_EXCLUSIONS': [
        ['regex', r'^tcp://.*:22$'],
        ['network', '127.66.66.0/26']
    ],

    # other sner subsystems
    'SNER_PLANNER': {},
    'SNER_METRICS_STALE_HORIZONT': '1day',

    # smorest api
    'API_TITLE': 'sner4 api',
    'API_VERSION': 'vX',
    'OPENAPI_VERSION': '3.0.3',
    'OPENAPI_URL_PREFIX': '/api/doc',
    'OPENAPI_SWAGGER_UI_PATH': '/swagger',
    'OPENAPI_SWAGGER_UI_URL': "https://cdn.jsdelivr.net/npm/swagger-ui-dist/",
    # https://github.com/marshmallow-code/flask-smorest/issues/36
    # https://swagger.io/docs/specification/authentication/bearer-authentication/
    'API_SPEC_OPTIONS': {
        'components': {
            'securitySchemes': {
                'ApiKeyAuth': {'type': 'apiKey', 'in': 'header', 'name': 'X-API-KEY'}
            }
        },
        'security': [
            {'ApiKeyAuth': []}
        ],
    },

    # oauth oidc
    'OIDC_NAME': None,
    'OIDC_TIMEOUT': 10,
    'OIDC_CREATE_USER': False,
    # 'OIDC_DEFAULT_METADATA': 'https://URL/.well-known/openid-configuration',
    # 'OIDC_DEFAULT_CLIENT_ID': '',
    # 'OIDC_DEFAULT_CLIENT_SECRET': ''
}


def config_from(config_dict):
    """pull config variables from config dict"""

    config = {k.upper(): v for k, v in config_dict.get('server', {}).items()}
    if 'planner' in config_dict:
        config['SNER_PLANNER'] = config_dict['planner']
    return config


def config_from_yaml(filename):
    """pull config variables from config file"""

    return config_from(load_yaml(filename))


def config_from_env(var_name):
    """pull config variables from env var"""

    return config_from(yaml.safe_load(os.environ.get(var_name, "{}")))


class LogFormatter(logging.Formatter):
    """custom log formatter, adds remote_addr, user"""

    def format(self, record):
        record.remote_addr = '-'
        record.user = '-'
        if has_request_context():
            record.remote_addr = request.remote_addr
            if current_user.is_authenticated:
                record.user = current_user.username
        return super().format(record)


def configure_logging():
    """configure server/app logging"""

    logging.config.dictConfig({
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'formatter_server': {
                'class': 'sner.server.app.LogFormatter',
                'format': 'sner.server %(remote_addr)s - %(user)s [%(asctime)s] %(levelname)s %(message)s',
                'datefmt': '%d/%b/%Y:%H:%M:%S %z'
            },
            'formatter_werkzeug': {
                'format': 'werkzeug %(message)s'
            }
        },
        'handlers': {
            'console_server': {
                'class': 'logging.StreamHandler',
                'stream': 'ext://sys.stdout',
                'formatter': 'formatter_server'
            },
            'console_werkzeug': {
                'class': 'logging.StreamHandler',
                'stream': 'ext://sys.stdout',
                'formatter': 'formatter_werkzeug'
            }
        },
        'loggers': {
            'sner.server': {
                'level': 'INFO',
                'handlers': ['console_server']
            },
            'werkzeug': {
                'handlers': ['console_werkzeug']
            }
        }
    })


def create_app(config_file='/etc/sner.yaml', config_env='SNER_CONFIG'):  # pylint: disable=too-many-statements
    """flask application factory"""

    configure_logging()

    app = Flask('sner.server')
    app.config.update(DEFAULT_CONFIG)  # default config
    app.config.update(config_from_yaml(config_file))  # service configuration
    app.config.update(config_from_env(config_env))  # container config

    if app.config["DEBUG"]:  # pragma: nocover  ; won't test
        logging.getLogger('sner.server').setLevel(logging.DEBUG)

    if app.config['XFLASK_PROXYFIX']:
        app.wsgi_app = ProxyFix(app.wsgi_app)
    app.session_interface = FilesystemSessionInterface(os.path.join(app.config['SNER_VAR'], 'sessions'), app.config['SNER_SESSION_IDLETIME'])

    CORS(app, supports_credentials=True)
    csrf = CSRFProtect(app)
    csrf.exempt(api_blueprint)

    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login_route'
    login_manager.login_message = 'Not logged in'
    login_manager.login_message_category = 'warning'
    migrate.init_app(app, db)
    oauth.init_app(app)
    if app.config['OIDC_NAME']:
        oauth.register(
            name=app.config['OIDC_NAME'],
            server_metadata_url=app.config[f'{app.config["OIDC_NAME"]}_METADATA'],
            client_kwargs={
                'scope': 'openid email',
                'default_timeout': app.config["OIDC_TIMEOUT"],
            }
        )
        app.config['SNER_FRONTEND_CONFIG']['oidc_enabled'] = True
    webauthn.init_app(app)

    # load sner.plugin components
    load_agent_plugins()
    load_parser_plugins()
    # check exclusion matcher config
    ExclMatcher(app.config['SNER_EXCLUSIONS'])

    # initialize api blueprint; as side-effect overrides error handler
    app.config['API_SPEC_OPTIONS']['servers'] = [{'url': app.config['APPLICATION_ROOT']}]
    app.config['OPENAPI_SWAGGER_UI_URL'] = f'{app.config["APPLICATION_ROOT"] if app.config["APPLICATION_ROOT"] != "/" else ""}/static/swagger/'
    api.init_app(app)
    api.register_blueprint(api_blueprint, url_prefix='/api')

    app.register_blueprint(frontend_blueprint, url_prefix='/')
    app.register_error_handler(404, pagenotfound_route)

    app.register_blueprint(auth_blueprint, url_prefix='/backend/auth')
    app.register_blueprint(lens_blueprint, url_prefix='/backend/lens')
    app.register_blueprint(scheduler_blueprint, url_prefix='/backend/scheduler')
    app.register_blueprint(storage_blueprint, url_prefix='/backend/storage')
    app.register_blueprint(visuals_blueprint, url_prefix='/backend/visuals')

    app.cli.add_command(auth_command)
    app.cli.add_command(dbx_command)
    app.cli.add_command(planner_command)
    app.cli.add_command(psql_command)
    app.cli.add_command(scheduler_command)
    app.cli.add_command(storage_command)

    @app.template_filter('datetime')
    def format_datetime(value, fmt='%Y-%m-%dT%H:%M:%S'):
        """Format a datetime"""
        if value is None:
            return ''
        return value.strftime(fmt)

    @app.template_filter('json_indent')
    def json_indent(data):
        """parse and format json"""
        try:
            return json.dumps(json.loads(data), sort_keys=True, indent=4)
        except ValueError:
            return data

    @app.template_filter('from_json')
    def from_json(data):
        """parse json"""
        return json.loads(data)

    app.add_template_global(name='sner_version', f=__version__)

    @app.shell_context_processor
    def make_shell_context():
        return {
            'app': app,
            'db': db,
            'func': func,

            'Heatmap': scheduler_models.Heatmap,
            'Job': scheduler_models.Job,
            'Queue': scheduler_models.Queue,
            'Readynet': scheduler_models.Readynet,
            'Target': scheduler_models.Target,

            'Host': storage_models.Host,
            'Note': storage_models.Note,
            'Service': storage_models.Service,
            'Versioninfo': storage_models.Versioninfo,
            'Vuln': storage_models.Vuln,

            'User': auth_models.User,
            'WebauthnCredential': auth_models.WebauthnCredential,
        }

    @app.after_request
    def inject_csrf_token(response):
        response.set_cookie('tokencsrf', generate_csrf(), samesite='Strict')
        return response

    @app.errorhandler(CSRFError)
    def handle_csrf_error(err):
        current_app.logger.warning('csrf error, %s', err.description)
        return error_response(message=err.description, code=400)

    @app.errorhandler(FilterQueryError)
    def handle_filter_query_error(err):
        return error_response(message=str(err), code=HTTPStatus.BAD_REQUEST)

    return app


def cli():
    """server command wrapper"""

    if '--version' in sys.argv:  # pragma nocover ;  won't test
        print(f'Sner {__version__}')
    os.environ['FLASK_APP'] = 'sner.server.app'
    os.environ['FLASK_RUN_PORT'] = '18000'
    return flask.cli.main()

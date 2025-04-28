# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auth commands
"""

import sys
from uuid import uuid4

import click
from flask import current_app
from flask.cli import with_appcontext

from sner.server.agreegate import sync_agreegate_allowed_networks
from sner.server.auth.models import User
from sner.server.extensions import db
from sner.server.password_supervisor import PasswordSupervisor as PWS


@click.group(name='auth', help='sner.server auth management')
def command():
    """auth commands container"""


@command.command(name='reset-password', help='reset password')
@click.argument('username')
@with_appcontext
def reset_password(username):
    """reset password for username"""

    user = User.query.filter(User.username == username).one_or_none()
    if not user:
        current_app.logger.error('no such user')
        sys.exit(1)

    new_password = PWS.generate()
    user.password = PWS.hash(new_password)
    db.session.commit()
    print(f'new password "{user.username}:{new_password}"')


@command.command(name='add-agent', help='add agent')
@click.option('--apikey', help='set agent apikey')
@with_appcontext
def add_agent(**kwargs):
    """add new agent"""

    apikey = kwargs["apikey"] or PWS.generate_apikey()
    agent = User(
        username=f'agent_{uuid4()}',
        apikey=PWS.hash_simple(apikey),
        active=True,
        roles=['agent']
    )
    db.session.add(agent)
    db.session.commit()
    print(f'new agent {agent.username} apikey {apikey}')


@command.command(name='add-user', help='add user')
@click.argument('username')
@click.argument('email')
@click.option('--roles', help='roles separated by coma')
@click.option('--password')
@with_appcontext
def add_user(username, email, **kwargs):
    """add new user"""

    user = User(
        username=username,
        email=email,
        active=True,
        roles=kwargs['roles'].split(',') if kwargs['roles'] else [],
        password=PWS.hash(kwargs['password']) if kwargs['password'] else None
    )

    db.session.add(user)
    db.session.commit()
    print(f'new user {user.username}')


@command.command(name='sync-agreegate-allowed-networks', help='sync agreegate allowed networks to sner users')
@with_appcontext
def sync_agreegate_allowed_networks_command():  # pragma nocover  ; won't test
    """sync allowed_networks for users from agreegate"""

    return sync_agreegate_allowed_networks()

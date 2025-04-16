# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auth.command tests
"""

from unittest.mock import patch

import sner.server.auth.commands
from sner.server.auth.commands import command
from sner.server.auth.models import User
from sner.server.extensions import db
from sner.server.password_supervisor import PasswordSupervisor as PWS


def test_resetpassword_command(runner, user):
    """auth password reset command test"""

    old_password = user.password

    result = runner.invoke(command, ['reset-password', 'notexists'])
    assert result.exit_code == 1

    result = runner.invoke(command, ['reset-password', user.username])
    assert result.exit_code == 0

    tuser = db.session.get(User, user.id)
    assert tuser.password != old_password


def test_addagent_command(runner):
    """add agent command test"""

    result = runner.invoke(command, ['add-agent'])
    assert result.exit_code == 0
    new_apikey = result.output.strip().split(' ')[-1]
    assert User.query.first().apikey == PWS.hash_simple(new_apikey)


def test_adduser_command(runner):
    """add user command test"""

    result = runner.invoke(command, ['add-user', 'userx', 'test@email'])
    assert result.exit_code == 0
    assert User.query.first().email == 'test@email'


def test_sync_agreegate_allowed_networks_command(runner, user_factory):
    """test sync_agreegate_allowed_networks command"""

    def agreegate_apicall_mock(_, url):
        if url == "/api/v1/groups":
            return [{"name": "group1", "allowed_networks": ["127.0.0.0/8"]}]
        if url == "/api/v1/usergroups":
            return [{"username": "testuser", "roles": ["user"], "groups": ["group1"]}]
        return None

    user_factory.create(username="testuser", roles=["user"])

    with patch.object(sner.server.auth.commands, 'agreegate_apicall', agreegate_apicall_mock):
        result = runner.invoke(command, ['sync-agreegate-allowed-networks'])

    assert result.exit_code == 0
    assert User.query.first().api_networks == ["127.0.0.0/8"]

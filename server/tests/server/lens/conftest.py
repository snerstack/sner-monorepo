# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
lens fixtures
"""

import pytest


@pytest.fixture
def host_permitted(host_factory):
    """host permitted by pytest default user api_networks"""

    yield host_factory.create(address="127.3.4.5")


@pytest.fixture
def host_denied(host_factory):

    yield host_factory.create(address="192.168.4.5")

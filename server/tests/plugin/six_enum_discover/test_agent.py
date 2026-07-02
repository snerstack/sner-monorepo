# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
six_enum_discover plugin agent tests
"""

import json
import os
from socket import AF_INET6
from uuid import uuid4

import pytest
from pyroute2 import NDB

from sner.agent.core import main as agent_main
from sner.lib import file_from_zip
from tests import running_as_root


def test_basic(tmpworkdir):  # pylint: disable=unused-argument
    """six_enum_discover test"""

    test_a = {
        "id": str(uuid4()),
        "config": {"module": "six_enum_discover", "rate": 100},
        "targets": ["sixenum,::1-2", "sixenum,::01", "sixenum,fe80::1-2"],
    }

    result = agent_main(["--assignment", json.dumps(test_a), "--debug"])

    # allow to fail for agentic and GitHub actions
    if not running_as_root():
        assert result == 1
        return

    assert result == 0
    assert "::1" in file_from_zip(f"{test_a['id']}.zip", "output-0.txt")


@pytest.mark.skipif("PYTEST_IPV6" not in os.environ, reason="ipv6 requires global connectivity")
def test_enum_simple(tmpworkdir):  # pylint: disable=unused-argument
    """
    six_enum_discover test for local LAN.

    scanning remote nets and local nets differs in scan6, this test triggers _is_localnet() and
    only checks the number of result, at least ff02::1 is expected

    does not run in CI because it lack IPv6 support and requires root privileges
    """

    addr = list(filter(lambda x: x.family == AF_INET6 and x.scope == 0, NDB().addresses.dump()))
    assert addr, "No IPv6 address found"
    addr = addr[0].address

    test_a = {
        "id": str(uuid4()),
        "config": {"module": "six_enum_discover", "rate": 100},
        "targets": [f"sixenum,{addr}"],
    }

    result = agent_main(["--assignment", json.dumps(test_a), "--debug"])
    assert result == 0

    data = file_from_zip(f"{test_a['id']}.zip", "output-0.txt")
    assert len(data.splitlines()) >= 1

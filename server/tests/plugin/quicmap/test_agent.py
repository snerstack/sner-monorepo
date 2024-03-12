# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
quicmap plugin agent test
"""

import json
from uuid import uuid4

from sner.agent.core import main as agent_main


def test_basic(tmpworkdir):  # pylint: disable=unused-argument
    """quicmap module execution test"""

    test_a = {
        'id': str(uuid4()),
        'config': {'module': 'quicmap', 'args': '--ports 443'},
        'targets': ['127.0.0.1']
    }

    result = agent_main(['--assignment', json.dumps(test_a), '--debug'])
    assert result == 0

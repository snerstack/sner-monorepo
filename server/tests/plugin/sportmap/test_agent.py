# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sportmap plugin agent test
"""

import json
from uuid import uuid4

from sner.agent.core import main as agent_main
from sner.lib import file_from_zip


def test_basic(tmpworkdir):  # pylint: disable=unused-argument
    """sportmap module execution test"""

    test_a = {
        'id': str(uuid4()),
        'config': {'module': 'sportmap', 'args': '-sS -sU -Pn -n --max-retries 0 --top-ports 1', 'source_ports': [80, 53]},
        'targets': ['127.0.0.1', '::1'],
    }

    result = agent_main(['--assignment', json.dumps(test_a), '--debug'])
    assert result == 0
    assert '-- 1 IP address (1 host up) scanned' in file_from_zip(f'{test_a["id"]}.zip', 'output-sport-53.gnmap').decode('utf-8')
    assert '-- 1 IP address (1 host up) scanned' in file_from_zip(f'{test_a["id"]}.zip', 'output6-sport-53.gnmap').decode('utf-8')

# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
parsers to import from agent outputs to storage
"""

import json
import sys
from pprint import pprint

from pathlib import Path
from sner.lib import file_from_zip, is_zip
from sner.server.parser import ParsedItemsDb, ParserBase


class ParserModule(ParserBase):  # pylint: disable=too-few-public-methods
    """auror_hostnames output parser"""

    @classmethod
    def parse_path(cls, path):
        """parse path and returns list of hosts/addresses"""

        pidb = ParsedItemsDb()

        if is_zip(path):
            data = file_from_zip(path, "output.json")
        else:
            data = Path(path).read_text(encoding="utf-8")

        # output.json = {"IP": [hostname1, hostname2]}
        results = json.loads(data)
        for address, hostnames in results.items():
            pidb.upsert_note(address, xtype="auror.hostnames", data=json.dumps(hostnames))

        return pidb


if __name__ == "__main__":  # pragma: no cover
    pprint(ParserModule.parse_path(sys.argv[1]))

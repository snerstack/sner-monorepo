# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
parsers to import from agent outputs to storage
"""

import sys
from pprint import pprint

from sner.lib import files_from_zip
from sner.server.parser import ParsedItemsDb, ParserBase


class ParserModule(ParserBase):
    """six enum parser, pulls list of hosts for discovery module"""

    ARCHIVE_PATHS = r"output\-[0-9]+.txt"

    @classmethod
    def parse_path(cls, path):
        """parse path and returns list of hosts/addresses"""

        pidb = ParsedItemsDb()

        for filedata in files_from_zip(path, cls.ARCHIVE_PATHS):
            for addr in filedata.decode("utf-8").splitlines():
                pidb.upsert_host(addr)

        return pidb


if __name__ == "__main__":  # pragma: no cover
    pprint(ParserModule.parse_path(sys.argv[1]))

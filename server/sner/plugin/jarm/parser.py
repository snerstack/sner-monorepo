# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
parsers to import from agent outputs to storage
"""

import sys
from pprint import pprint

from sner.lib import files_from_zip
from sner.server.parser import ParsedItemsDb, ParserBase


class ParserModule(ParserBase):
    """jarm output parser"""

    ARCHIVE_PATHS = r"output-[0-9]+.out"

    @classmethod
    def parse_path(cls, path):
        """parse data from path"""

        pidb = ParsedItemsDb()

        for filedata in files_from_zip(path, cls.ARCHIVE_PATHS):
            pidb = cls._parse_data(filedata.decode("utf-8"), pidb)

        return pidb

    @staticmethod
    def _parse_data(data, pidb):
        """parse raw string data"""

        via_target = None
        address = None
        port = None
        jarm = None

        for line in data.splitlines():
            if line.startswith("Domain:"):
                via_target = line.split(" ")[-1]

            if line.startswith("Resolved IP:"):
                address = line.split(" ")[-1]

            if address and line.startswith("Port:"):
                port = line.split(" ")[-1]

            if port and line.startswith("JARM:"):
                jarm = line.split(" ")[-1]
                if via_target and address and port and (jarm != "00000000000000000000000000000000000000000000000000000000000000"):
                    pidb.upsert_note(address, "tcp", port, via_target, "jarm.fp", data=jarm)

        return pidb


if __name__ == "__main__":  # pragma: no cover
    pprint(ParserModule.parse_path(sys.argv[1]))

# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
parser to import auror_sslyze agent outputs to storage
"""

import json
import logging
import sys
from pathlib import Path
from pprint import pprint

from sner.lib import files_from_zip, is_zip
from sner.server.parser import ParsedItemsDb, ParserBase

logger = logging.getLogger(__name__)


class ParserModule(ParserBase):  # pylint: disable=too-few-public-methods
    """auror_sslyze output parser

    Attributes:
        ARCHIVE_PATHS (str): The regex pattern for archive paths.
    """

    ARCHIVE_PATHS = r"output\-[0-9]+\.json"

    @classmethod
    def parse_path(cls, path):
        """Parse data from path.

        Args:
            path (str): The path to the data file or agent output archive.

        Returns:
            ParsedItemsDb: The populated ParsedItemsDb instance.
        """

        pidb = ParsedItemsDb()

        if is_zip(path):
            for filedata in files_from_zip(path, cls.ARCHIVE_PATHS):
                pidb = cls._parse_data(filedata, pidb)
            return pidb

        return cls._parse_data(Path(path).read_text(encoding="utf-8"), pidb)

    @classmethod
    def _parse_data(cls, data, pidb):
        """Parse raw string data.

        Args:
            data (str): The raw sslyze json output.
            pidb (ParsedItemsDb): The ParsedItemsDb instance to populate.

        Returns:
            ParsedItemsDb: The populated ParsedItemsDb instance.
        """

        report = json.loads(data)
        for server in report.get("server_scan_results", []):
            if (server.get("connectivity_status") != "COMPLETED") or (not server.get("scan_result")):
                logger.warning("skipping incomplete scan for %s", server.get("server_location"))
                continue

            location = server["server_location"]
            tls_method = "explicit" if server["network_configuration"]["tls_opportunistic_encryption"] else "implicit"
            pidb.upsert_note(
                location["ip_address"],
                "tcp",
                int(location["port"]),
                location["hostname"],
                f"auror.sslyze.{tls_method}",
                data=json.dumps(server),
            )

        return pidb


if __name__ == "__main__":  # pragma: no cover
    pprint(ParserModule.parse_path(sys.argv[1]))

# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
parsers to import from agent outputs to storage
"""

import json
import logging
import re
import sys
from collections import defaultdict
from pprint import pprint
from zipfile import ZipFile

from sner.lib import file_from_zip
from sner.plugin.nmap.parser import ParserModule as NmapParserModule
from sner.server.parser import ParsedItemsDb, ParserBase


logger = logging.getLogger(__name__)


class ParserModule(ParserBase):  # pylint: disable=too-few-public-methods
    """nmap xml output parser"""

    ARCHIVE_PATHS = r'output.*\.xml|scan\-.*\.xml'

    @classmethod
    def parse_path(cls, path):
        """parse data from path"""

        allparsed = cls._prepare_allparsed(path)
        return cls._process_results(allparsed)

    @classmethod
    def _process_results(cls, allparsed):
        """process results"""

        pidb = ParsedItemsDb()
        diffmap = defaultdict(lambda: defaultdict(lambda: defaultdict(dict)))

        for sport, sport_pidb in allparsed.items():
            if sport == "default":
                continue

            for svc in sport_pidb.services:
                address = sport_pidb.hosts[svc.host_iid].address
                pidb.upsert_host(address)

                default_state = list(allparsed["default"].services.where(proto=svc.proto, port=svc.port))
                default_state = default_state[0].state if default_state else None

                if ('open' in svc.state) and ((not default_state) or (default_state != svc.state)):
                    diffmap[address][svc.proto][svc.port]["default"] = default_state or "closed:nostate"
                    diffmap[address][svc.proto][svc.port][sport] = svc.state

        # print(json.dumps(diffmap, indent=4))
        for address, data in diffmap.items():
            pidb.upsert_note(address, xtype="sportmap", via_target=address, data=json.dumps(data))

        # parsed items database contain all hosts
        # difference in source port scans for host/target is stored as note if any is detected
        # planner should prune old database sportmap notes on rolling scaning
        return pidb

    @classmethod
    def _prepare_allparsed(cls, path):
        """prepare allparsed data"""

        allparsed = defaultdict(ParsedItemsDb)
        with ZipFile(path) as fzip:
            for fname in filter(lambda x: re.match(cls.ARCHIVE_PATHS, x), fzip.namelist()):
                # recombine ipv4 and ipv6 scans
                sport = fname.replace('.xml', '').split('-')[-1]
                allparsed[sport] = NmapParserModule._parse_data(  # pylint: disable=protected-access
                    file_from_zip(path, fname).decode('utf-8'),
                    allparsed[sport]
                )

        if "default" not in allparsed:  # pragma: no cover  ; won't test
            raise ValueError(f"missing default scan for {path}")
        return allparsed


if __name__ == '__main__':  # pragma: no cover
    xpidb = ParserModule.parse_path(sys.argv[1])
    pprint(xpidb.__dict__)
    print(xpidb.hosts.csv_export(None))
    print(xpidb.notes.csv_export(None))

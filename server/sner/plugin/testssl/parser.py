# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner agent testssl
"""

import json
import logging
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path
from pprint import pprint
from zipfile import ZipFile

from sner.lib import file_from_zip, is_zip
from sner.server.parser import ParsedItemsDb, ParserBase


logger = logging.getLogger(__name__)


class ParserModule(ParserBase):  # pylint: disable=too-few-public-methods
    """testssl parser"""

    ARCHIVE_PATHS = r'output\-[0-9]+\.json'
    FINDINGS_IGNORE = []

    @classmethod
    def parse_path(cls, path):
        """parse data from path"""

        pidb = ParsedItemsDb()

        if is_zip(path):
            with ZipFile(path) as fzip:
                for fname in filter(lambda x: re.match(cls.ARCHIVE_PATHS, x), fzip.namelist()):
                    pidb = cls._parse_data(file_from_zip(path, fname).decode('utf-8'), pidb)
            return pidb

        return cls._parse_data(Path(path).read_text(encoding='utf-8'), pidb)

    @classmethod
    def _parse_data(cls, data, pidb):
        """parse raw string data"""

        json_data = json.loads(data)
        if not isinstance(json_data['scanTime'], int):  # pragma: no cover
            return pidb

        for result in json_data['scanResult']:
            if 'ip' not in result:
                logger.warning('missing ip field, %s', result)
                continue

            host_address = result['ip'].strip('[]')
            via_target = result['targetHost']
            service_port = int(result['port'])
            service_proto = 'tcp'

            note_data = {
                'output': data,
                'data': {},
                'findings': defaultdict(list)
            }
            for section_name, section_data in result.items():
                note_data = cls._process_section(note_data, section_name, section_data)

            pidb.upsert_note(
                host_address,
                'testssl',
                service_proto,
                service_port,
                via_target,
                data=json.dumps(note_data)
            )

        return pidb

    @classmethod
    def _process_section(cls, note_data, section_name, section_data):
        """proces section data as auror"""

        if isinstance(section_data, list):
            # pop findings for section
            for finding in section_data:
                if finding['id'] == 'cert':
                    # rewrap certificate data
                    tmp = finding['finding'].split(' ')
                    tmp = ' '.join(tmp[:2]) + '\n' + '\n'.join(tmp[2:-2]) + '\n' + ' '.join(tmp[-2:])
                    # parse as auror tool
                    try:
                        note_data['cert_txt'] = subprocess.run(
                            ['openssl', 'x509', '-text', '-noout'],
                            input=tmp, check=True, capture_output=True, text=True
                        ).stdout
                    except subprocess.CalledProcessError as exc:  # pragma: no cover
                        note_data['cert_txt'] = str(exc)

                if finding['severity'] not in cls.FINDINGS_IGNORE:
                    note_data['findings'][section_name].append(finding)
        else:
            # pop scalar data
            note_data['data'][section_name] = section_data

        return note_data


if __name__ == '__main__':  # pragma: no cover
    pprint(ParserModule.parse_path(sys.argv[1]))

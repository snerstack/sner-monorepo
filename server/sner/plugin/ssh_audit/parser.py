# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
parsers to import from agent outputs to storage
"""

import json
import logging
from zipfile import ZipFile
from pathlib import Path

from sner.lib import file_from_zip, is_zip
from sner.server.parser import ParsedItemsDb, ParserBase
from sner.server.storage.models import SeverityEnum
from sner.server.utils import SnerJSONEncoder


logger = logging.getLogger(__name__)


class ParserModule(ParserBase):  # pylint: disable=too-few-public-methods
    """ssh_audit output parser"""

    @classmethod
    def parse_path(cls, path):
        """parse data from path"""

        pidb = ParsedItemsDb()

        if is_zip(path):
            with ZipFile(path) as fzip:
                for fname in filter(lambda x: 'output' == x, fzip.namelist()):
                    pidb = cls._parse_data(file_from_zip(path, fname).decode('utf-8'), pidb)

            return pidb
        return cls._parse_data(Path(path).read_text(encoding='utf-8'), pidb)

    @classmethod
    def _parse_data(cls, data, pidb):  # pylint: disable=too-many-locals
        """parse taw string data"""

        data = json.loads(data)

        for record in data:
            host_address, port = record.get('target').split(":")

            pidb.upsert_host(host_address)
            pidb.upsert_service(host_address, 'tcp', port, name="ssh", state="open:ssh-audit", info=record.get('banner').get('raw'))

            cves = record.get('cves')

            if len(cves) > 0:
                for cve in cves:
                    severity = cls._get_severity(cve.get('cvssv2'))

                    vuln_data = {
                        'banner': record.get('banner'),
                        'enc': record.get('enc'),
                        'fingerprints': record.get('fingerprints'),
                        'kex': record.get('kex'),
                        'key': record.get('key'),
                        'mac': record.get('mac'),
                        'recommendation': record.get('recommendation'),
                        'informational': record.get('informational'),
                    }

                    pidb.upsert_vuln(
                        host_address,
                        service_proto='tcp',
                        service_port=port,
                        name="-".join(cve.get('description').split(" ")[:5]),
                        descr=cve.get('description'),
                        xtype='ssh_audit',
                        refs=[cve.get('name')],
                        severity=severity,
                        data=json.dumps(vuln_data, cls=SnerJSONEncoder)
                    )

        return pidb

    @staticmethod
    def _get_severity(cvssv2_score):
        if cvssv2_score == 10.0:
            return SeverityEnum.CRITICAL
        if cvssv2_score >= 7.0:
            return SeverityEnum.HIGH
        if cvssv2_score >= 4.0:
            return SeverityEnum.MEDIUM

        return SeverityEnum.LOW

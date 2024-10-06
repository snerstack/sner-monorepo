# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
parsers to import from agent outputs to storage
"""

import json
import logging
from ipaddress import ip_address
from pathlib import Path
from urllib.parse import urlsplit
from zipfile import ZipFile

from sner.lib import file_from_zip, get_nested_key, is_address, is_zip
from sner.server.parser import ParsedItemsDb, ParserBase
from sner.server.storage.models import SeverityEnum
from sner.server.utils import SnerJSONEncoder


logger = logging.getLogger(__name__)


def dnsptr_to_ip(dnsptr: str) -> str:
    """parse PTR data"""

    if dnsptr.endswith('.in-addr.arpa'):
        ip_parts = dnsptr.replace('.in-addr.arpa', '').split('.')
        address = '.'.join(reversed(ip_parts))
        return str(ip_address(address))

    if dnsptr.endswith('.ip6.arpa'):
        ip_parts = dnsptr.replace('.ip6.arpa', '').split('.')
        address = ''.join(reversed(ip_parts))
        address = ':'.join([address[i:i+4] for i in range(0, len(address), 4)])
        return str(ip_address(address))

    raise ValueError("Input is not a valid reverse DNS string.")  # pragma: nocover  ; won't test


class ParserModule(ParserBase):  # pylint: disable=too-few-public-methods
    """nuclei output parser"""

    @classmethod
    def parse_path(cls, path):
        """parse data from path"""

        pidb = ParsedItemsDb()

        if is_zip(path):
            with ZipFile(path) as fzip:
                for fname in filter(lambda x: 'output.json' == x, fzip.namelist()):
                    pidb = cls._parse_data(file_from_zip(path, fname).decode('utf-8'), pidb)

            return pidb
        return cls._parse_data(Path(path).read_text(encoding='utf-8'), pidb)

    @classmethod
    def _parse_data(cls, data, pidb):
        """parse taw string data"""

        data = json.loads(data)

        for report in data:
            report_ident = f"{report['type']}/{report['template-id']}"

            # pull dns ptr info
            if report_ident == "dns/ptr-fingerprint":
                pidb = cls._parse_dnsptr(report, pidb)
                continue

            # skip some templates
            if 'ip' not in report:
                logger.warning('IP missing in report, template ident: %s', report_ident)
                continue

            pidb = cls._parse_normal(report, pidb)

        return pidb

    @classmethod
    def _parse_dnsptr(cls, report, pidb):
        """parse dns/ptr-fingerprint"""

        host_address = dnsptr_to_ip(report['host'])
        hostname = report['extracted-results'][0].rstrip('.')
        pidb.upsert_host(host_address, hostname=hostname, hostnames=[hostname])
        return pidb

    @classmethod
    def _parse_normal(cls, report, pidb):  # pylint: disable=too-many-locals
        """parse normal item"""

        # parse host
        host_address = report['ip']
        host_data = {}
        hostname = urlsplit(report['host']).hostname
        if not is_address(hostname):
            host_data['hostname'] = hostname

        pidb.upsert_host(host_address, **host_data)

        # parse service
        service = None
        # url must contain '//' otherwise will be treated as relative and port will be parsed as path
        target_parsed = urlsplit(report['matched-at'] if '://' in report['matched-at'] else f"//{report['matched-at']}")
        port = target_parsed.port
        if (port is None) and (report['type'] == 'http'):
            # set default ports
            port = '443' if target_parsed.scheme == 'https' else '80'
        via_target = target_parsed.hostname

        if port:
            service = pidb.upsert_service(
                host_address,
                proto='tcp',
                port=int(port),
                state='open:nuclei',
                name='www' if report['type'] == 'http' else '',
                import_time=report['timestamp']
            )

        # parse vuln
        refs = []
        if cves := get_nested_key(report, 'info', 'classification', 'cve-id'):
            for cve in cves:
                refs.append(cve.upper())
        if references := get_nested_key(report, 'info', 'reference'):
            for reference in references:
                refs.append('URL-' + reference)

        vuln_data = {
            'via_target': via_target,
            'severity': str(SeverityEnum(report['info']['severity'])),
            'descr': f'## Description\n\n{report["info"].get("description")}\n\n'
                     + f'## Extracted results\n\n{report.get("extracted-results")}',
            'data': json.dumps(report, cls=SnerJSONEncoder),
            'refs': refs,
            'import_time': report['timestamp'],
        }
        if service:
            vuln_data['service_proto'] = service.proto
            vuln_data['service_port'] = service.port

        pidb.upsert_vuln(
            host_address,
            name=report['info']['name'],
            xtype=f"nuclei.{report['template-id']}{'.' + report['matcher-name'] if 'matcher-name' in report else ''}",
            **vuln_data
        )

        return pidb

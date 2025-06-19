# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner agent testssl
"""

import json
import logging
import re
import subprocess
import sys
from pathlib import Path
from pprint import pprint
from zipfile import ZipFile

from sner.lib import file_from_zip, is_zip
from sner.server.parser import ParsedItemsDb, ParserBase


logger = logging.getLogger(__name__)


class ParserModule(ParserBase):  # pylint: disable=too-few-public-methods
    """auror_testssl parser"""

    ARCHIVE_PATHS = r"output\-[0-9]+\.json"
    FINDINGS_IGNORE = []

    @classmethod
    def parse_path(cls, path):
        """parse data from path"""

        pidb = ParsedItemsDb()

        if is_zip(path):
            with ZipFile(path) as fzip:
                for fname in filter(lambda x: re.match(cls.ARCHIVE_PATHS, x), fzip.namelist()):
                    pidb = cls._parse_data(file_from_zip(path, fname).decode("utf-8"), pidb)
            return pidb

        return cls._parse_data(Path(path).read_text(encoding="utf-8"), pidb)

    @classmethod
    def _parse_data(cls, data, pidb):
        """parse raw string data"""

        json_data = json.loads(data)
        if not isinstance(json_data["scanTime"], int):
            return pidb

        if "--starttls" in json_data["Invocation"]:
            tls_method = "explicit"
        else:
            tls_method = "implicit"

        if len(json_data["scanResult"]) == 1:
            result = json_data["scanResult"][0]
        else:
            logger.error("testssl.sh scan includes %s results, %s", len(json_data), json_data)
            return pidb

        if "ip" not in result:
            logger.warning("missing ip field, %s", result)
            return pidb

        host_address = result["ip"].strip("[]")
        via_target = result["targetHost"]
        service_port = int(result["port"])
        service_proto = "tcp"

        note_data = {"output": data, "auror_data": cls._process_testssl_result(json_data)}

        pidb.upsert_note(
            host_address, f"auror.testssl_{tls_method.lower()}", service_proto, service_port, via_target, data=json.dumps(note_data)
        )

        return pidb

    @staticmethod
    def _process_testssl_result(testssl_result):
        """
        Process the testssl.sh result into a format that can be used by the plugin.

        Args:
            testssl_result (dict): The testssl.sh result dictionary.

        Returns:
            dict: The processed testssl.sh result in a format that can be used by the plugin.
        """
        SECTIONS = [
            "pretest",
            "protocols",
            "grease",
            "ciphers",
            "serverPreferences",
            "fs",
            "serverDefaults",
            "headerResponse",
            "vulnerabilities",
            "browserSimulations",
            "rating",
        ]

        processed_testssl_result = {}

        try:
            processed_testssl_result["result"] = 0
            processed_testssl_result["timestamp"] = testssl_result.get("startTime", None)
            processed_testssl_result["scantime"] = testssl_result.get("scanTime", "")
            processed_testssl_result["invocation"] = testssl_result.get("Invocation", "")
            if "--starttls" in processed_testssl_result["invocation"]:
                tls_method = "STARTTLS"
            else:
                tls_method = "SSL/TLS"
            processed_testssl_result["tls_method"] = tls_method

            if len(testssl_result["scanResult"]) == 1:
                if finding := testssl_result["scanResult"][0].get("finding", False):
                    processed_testssl_result["result_desc"] = finding
                    return processed_testssl_result
                else:
                    processed_testssl_result["result_desc"] = "testssl.sh success"
            else:
                processed_testssl_result["result_desc"] = testssl_result["scanResult"][0].get(
                    "finding", "No findings found"
                )

            scan_result = testssl_result["scanResult"][len(testssl_result["scanResult"]) - 1]
            processed_testssl_result["ip"] = scan_result["ip"]
            processed_testssl_result["targetHost"] = scan_result["targetHost"]
            processed_testssl_result["port"] = scan_result["port"]
            processed_testssl_result["rDNS"] = scan_result.get("rDNS", "")
            processed_testssl_result["service"] = scan_result.get("service", "")

            for section in SECTIONS:
                for finding in scan_result.get(section, []):
                    processed_testssl_result[finding["id"]] = finding.get("finding")
                    if finding["id"] == "cert" or finding["id"].startswith("intermediate_cert <#"):
                        processed_testssl_result[f"{finding['id']}_txt"] = ParserModule._process_cert(finding["finding"])

        except AttributeError as error:
            logger.error("Results are not in expected format - %s", error)

        except KeyError as error:
            logger.error("Results are missing some keys - %s", error)

        return processed_testssl_result

    @staticmethod
    def _process_cert(raw_cert):
        """ Decode a raw certificate using OpenSSL.
        Args:
            raw_cert (str): The raw certificate data.
        Returns:
            str: The decoded certificate data.
        """
        try:
            processed_cert = subprocess.run(
                ["openssl", "x509", "-text", "-noout"], input=raw_cert, check=True, capture_output=True, text=True
            ).stdout
        except subprocess.CalledProcessError as exc:  # pragma: no cover
            processed_cert = str(exc)

        return processed_cert


if __name__ == "__main__":  # pragma: no cover
    pprint(ParserModule.parse_path(sys.argv[1]))

# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
storage version info map functions
"""

import json
import re
from dataclasses import asdict, dataclass, field
from datetime import datetime
from hashlib import md5

from cpe import CPE
from flask import current_app
from lark.exceptions import LarkError
from sqlalchemy.dialects.postgresql import insert as pg_insert

from sner.lib import get_nested_key
from sner.server.extensions import db
from sner.server.sqlafilter import FILTER_PARSER
from sner.server.storage.models import Host, Note, Service, Versioninfo
from sner.server.storage.version_parser import InvalidFormatException
from sner.server.utils import FilterQueryError


def mutate_versioninfo_sqlfilter_rules(sqlafilter):
    """Remap Sqlalchemy filter queries from the text 'version' field to 'version_array', in place."""

    if not sqlafilter:  # pragma: nocover  ; won't test
        return

    if isinstance(sqlafilter, list):
        for item in sqlafilter:
            mutate_versioninfo_sqlfilter_rules(item)

    if isinstance(sqlafilter, dict):
        if "field" not in sqlafilter:
            mutate_versioninfo_sqlfilter_rules(sqlafilter[next(iter(sqlafilter))])
        elif sqlafilter.get("field") == "Versioninfo.version":
            sqlafilter["field"] = "Versioninfo.version_array"
            if sqlafilter.get("op") in ["==", "!=", ">", "<", ">=", "<="]:
                sqlafilter["value"] = VersioninfoManager.parse_to_int_array(sqlafilter.get("value", ""), strict=True)


def mutate_versioninfo_sqlfilter(sqlfilter):
    """mutate sqlfilter so the versioninfo.version conditions are translated to versioninfo.versioninfo_array which is processable by DB engine"""

    if not sqlfilter:  # pragma: nocover  ; won't test
        return sqlfilter

    try:
        sqlfilter = FILTER_PARSER.parse(sqlfilter)
        mutate_versioninfo_sqlfilter_rules(sqlfilter)
    except (LarkError, InvalidFormatException) as exc:
        raise FilterQueryError.with_message("failed to mutate versioninfo version sqlfilter", exc) from None

    return sqlfilter


def mutate_versioninfo_jsonfilter_rules(jsonfilter):
    """Remap JSON filter queries from the text 'version' field to 'version_array', in place."""

    rules = jsonfilter.get("rules")
    if not rules:  # pragma: nocover  ; won't test
        return

    for rule in rules:
        if "rules" in rule:
            mutate_versioninfo_jsonfilter_rules(rule)
        elif rule.get("field") == "Versioninfo.version":
            rule["field"] = "Versioninfo.version_array"
            if rule.get("operator") in ["==", "!=", ">", "<", ">=", "<="]:
                rule["value"] = VersioninfoManager.parse_to_int_array(rule.get("value", ""), strict=True)


def mutate_versioninfo_jsonfilter(jsonfilter):
    """mutate jsonfilter so the versioninfo.version conditions are translated to versioninfo.versioninfo_array which is processable by DB engine"""

    if not jsonfilter:
        return jsonfilter

    try:
        jsonfilter = json.loads(jsonfilter)
        mutate_versioninfo_jsonfilter_rules(jsonfilter)
    except (json.JSONDecodeError, InvalidFormatException) as exc:
        raise FilterQueryError.with_message("failed to mutate versioninfo version jsonfilter", exc) from None

    return jsonfilter


def versioninfo_docid(host_id, host_address, host_hostname, service_proto, service_port, via_target, product):
    """compute versioninfo docid"""

    keydata = "|".join(
        map(
            str,
            [
                host_id,
                host_address,
                host_hostname,
                service_proto,
                service_port,
                via_target,
                product,
            ],
        )
    )
    return md5(keydata.encode()).hexdigest()


@dataclass
class ExtractedVersion:
    """extracted version"""

    product: str
    version: str


@dataclass
class VMapItem:  # pylint: disable=too-many-instance-attributes
    """raw map item"""

    host_id: int
    host_address: str
    host_hostname: str
    service_proto: str
    service_port: int
    via_target: str
    product: str
    version: str
    timestamp: datetime
    extra: dict = field(default_factory=dict)
    version_array: list[int] = field(default_factory=list)

    def __post_init__(self):
        self.product = self.product.lower()
        self.version_array = VersioninfoManager.parse_to_int_array(self.version)

    def aggkey(self):
        """compute vmap aggregation key"""

        return versioninfo_docid(
            self.host_id, self.host_address, self.host_hostname, self.service_proto, self.service_port, self.via_target, self.product
        )


class VMap:
    """raw version info map"""

    def __init__(self):
        self.data = {}

    def add(self, **kwargs):
        """add data into raw map, account for uniqueness and aggregation"""

        entry = VMapItem(**kwargs)
        aggkey = entry.aggkey()

        if aggkey in self.data:
            self.data[aggkey].version = entry.version
            self.data[aggkey].version_array = entry.version_array
            self.data[aggkey].extra.update(entry.extra)
        else:
            self.data[aggkey] = entry

    def flush(self):
        """upsert database"""

        current_app.logger.debug("upsert versioninfo %d items", len(self.data))
        for key, val in self.data.items():
            db.session.execute(
                pg_insert(Versioninfo).values({"id": key, **val.__dict__}).on_conflict_do_update(constraint="versioninfo_pkey", set_=val.__dict__)
            )
        db.session.commit()

    def prune(self):
        """prune database of gone items"""

        affected_rows = Versioninfo.query.filter(Versioninfo.id.not_in(self.data.keys())).delete(synchronize_session=False)
        current_app.logger.debug("prune versioninfo %d items", affected_rows)
        db.session.commit()
        db.session.expire_all()

    def __len__(self):
        """return data dict size"""

        return len(self.data)


class VersioninfoManager:
    """version info map manager"""

    VERSION_ARRAY_SIZE = 4

    @staticmethod
    def _base_note_query():
        return (
            db.session.query()
            .select_from(Note)
            .outerjoin(Host, Note.host_id == Host.id)
            .outerjoin(Service, Note.service_id == Service.id)
            .add_columns(
                Host.id.label("host_id"),
                Host.address.label("host_address"),
                Host.hostname.label("host_hostname"),
                Service.proto.label("service_proto"),
                Service.port.label("service_port"),
                Note.via_target,
                Note.data,
                Note.import_time.label("timestamp"),
            )
        )

    @staticmethod
    def _jsondata_iterator(query):
        """note.data json decode iterator"""

        for sourcedata in query.all():
            item = sourcedata._asdict()
            try:
                data = json.loads(item.pop("data"))
            except json.decoder.JSONDecodeError:
                current_app.logger.warning("note.data invalid json, %s", sourcedata._asdict())
                continue
            yield item, data

    @staticmethod
    def extract_version(value):
        """extract product,version tuple from string"""

        if match := re.match(r"(?P<product>[^\d]+)[/ \-]v?(?P<version>\d+(?:\.[-_a-zA-Z\d]+)*)", value):
            return ExtractedVersion(match.group("product"), match.group("version"))

        if match := re.match(r"(?P<product>[^\d]+) ver:(?P<version>\d+(?:\.[-_a-zA-Z\d]+)*)", value):
            return ExtractedVersion(match.group("product"), match.group("version"))

        return None

    @classmethod
    def parse_to_int_array(cls, version, strict=False):
        """Parse version string into an array of integers."""

        # handle debian style with hope, see sner.server.version_parser is_in_version_range()
        clean = re.sub("(?<=[0-9])p(?=[0-9])", ".", version)
        clean = clean.split(" ")[0]
        nums = re.findall(r"\d+", clean)

        if strict and not nums:
            raise InvalidFormatException(f'Invalid version format: "{version}"')

        parts = [int(item) for item in nums[: cls.VERSION_ARRAY_SIZE]]
        if len(parts) < cls.VERSION_ARRAY_SIZE:
            parts.extend([0] * (cls.VERSION_ARRAY_SIZE - len(parts)))
        return parts

    @classmethod
    def rebuild(cls):
        """rebuild versioninfo map"""

        vmap = VMap()
        vmap = cls.collect_cpes(vmap)
        vmap = cls.collect_nmap_bannerdict(vmap)
        vmap = cls.collect_nmap_httpgenerator(vmap)
        vmap = cls.collect_nmap_mysqlinfo(vmap)
        vmap = cls.collect_nmap_rdpntlminfo(vmap)
        vmap.flush()
        vmap.prune()

    @classmethod
    def collect_nmap_bannerdict(cls, vmap):
        """collects nmap.banner_dict notes"""

        query = cls._base_note_query().filter(Note.xtype == "nmap.banner_dict")
        for item, data in cls._jsondata_iterator(query):
            item_extracted = False

            # {
            #   "product": "Apache httpd",
            #   "version": "2.4.6", ...
            # }
            if "product" in data:
                tmp = {"version": data["version"]} if "version" in data else {"version": "0", "extra": {"flag": "noversion"}}
                vmap.add(**item, product=data["product"], **tmp)
                item_extracted = True

            # {
            #   "product": "Apache httpd",
            #   "version": "2.2.21",
            #   "extrainfo": "(Win32) mod_ssl/2.2.21 OpenSSL/1.0.0e PHP/5.3.8 mod_perl/2.0.4 Perl/v5.10.1"
            # }
            if {"product", "extrainfo"}.issubset(data.keys()) and data["product"] == "Apache httpd":
                extra = {}
                for part in data["extrainfo"].split(" "):
                    if match := re.match(r"\((?P<osflavor>.*)\)", part):
                        extra["os"] = match.group("osflavor").lower()
                    if extracted := cls.extract_version(part):
                        vmap.add(**item, **asdict(extracted), extra=extra)
                        item_extracted = True

            if not item_extracted:
                current_app.logger.debug(f"{__name__} skipped {item} {data}")

        return vmap

    @classmethod
    def collect_nmap_httpgenerator(cls, vmap):
        """collects nmap.http_generator notes"""

        query = cls._base_note_query().filter(Note.xtype == "nmap.http-generator")
        for item, data in cls._jsondata_iterator(query):
            item_extracted = False

            if extracted := cls.extract_version(data.get("output", "")):
                vmap.add(**item, **asdict(extracted))
                item_extracted = True

            if not item_extracted:
                current_app.logger.debug(f"{__name__} skipped {item} {data}")

        return vmap

    @classmethod
    def collect_nmap_mysqlinfo(cls, vmap):
        """collects nmap.mysql-info notes"""

        version_regexp = r"(?:.*?)-(?P<version>.*?)-(?P<product>.*?)-(?P<flavor>.*)"

        query = cls._base_note_query().filter(Note.xtype == "nmap.mysql-info")
        for item, data in cls._jsondata_iterator(query):
            if verdata := get_nested_key(data, "elements", "Version"):
                if match := re.match(version_regexp, verdata):
                    vmap.add(**item, product=match.group("product"), version=match.group("version"), extra={"full_version": verdata})

        return vmap

    @classmethod
    def collect_nmap_rdpntlminfo(cls, vmap):
        """collects nmap.rdp-ntlm-info notes"""

        query = cls._base_note_query().filter(Note.xtype == "nmap.rdp-ntlm-info")
        for item, data in cls._jsondata_iterator(query):
            if verdata := get_nested_key(data, "elements", "Product_Version"):
                vmap.add(**item, product="Microsoft Windows", version=verdata)

        return vmap

    @classmethod
    def collect_cpes(cls, vmap):
        """collects cpe notes"""

        def cpe_iterator(cpes):
            for icpe in cpes:
                try:
                    parsed_cpe = CPE(icpe)
                except Exception:  # pylint: disable=broad-except  ; library does not provide own core exception class
                    current_app.logger.warning(f"invalid cpe, {icpe}")
                    continue
                product = " ".join(filter(None, [parsed_cpe.get_vendor()[0], parsed_cpe.get_product()[0]]))
                version = parsed_cpe.get_version()[0]
                if product and version:
                    yield ExtractedVersion(product, version)

        query = cls._base_note_query().filter(Note.xtype == "cpe")
        for item, data in cls._jsondata_iterator(query):
            for extracted in cpe_iterator(data):
                vmap.add(**item, **asdict(extracted))

        return vmap

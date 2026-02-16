# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner parsers core objects

The parser subsystem is responsible for parsing data from various scanning
tools. Parsers should be implemented via sner.plugin package and must
implement ParserBase interface.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from importlib import import_module
from pathlib import Path

from littletable import Table as LittleTable

import sner.plugin
from sner.targets import TargetManager


REGISTERED_PARSERS = {}


def load_parser_plugins():
    """load all parser plugins/modules"""

    for plugin_path in Path(sner.plugin.__file__).parent.glob('*/parser.py'):
        plugin_name = plugin_path.parent.name
        module = import_module(f'sner.plugin.{plugin_name}.parser')
        REGISTERED_PARSERS[plugin_name] = getattr(module, 'ParserModule')


class ParsedItemBase:
    """parsed items base object; shared functions"""

    def update(self, obj):
        """update data from other object"""

        for key, value in obj.__dict__.items():
            # do not overwrite with None value
            if value is None:
                continue

            # merge lists
            if isinstance(value, list):
                new_value = (getattr(self, key) or []) + value
                setattr(self, key, new_value)
                continue

            # set new value
            setattr(self, key, value)


@dataclass
class ParsedHost(ParsedItemBase):
    """parsed host"""

    address: str
    hostname: str = None
    hostnames: list = None
    os: str = None  # pylint: disable=invalid-name
    iid: int = None

    def ident(self, _pidb_container):
        """get storage upsert key; composite key"""
        return (self.address, )


@dataclass
class ParsedService(ParsedItemBase):  # pylint: disable=too-many-instance-attributes
    """parsed service"""

    host_iid: int
    proto: str
    port: int
    state: str = None
    name: str = None
    info: str = None
    import_time: datetime = None
    iid: int = None

    def ident(self, pidb_container):
        """get storage upsert key; composite key"""
        host = pidb_container.hosts.by.iid[self.host_iid]
        return (host.address, self.proto, self.port)


@dataclass
class ParsedVuln(ParsedItemBase):  # pylint: disable=too-many-instance-attributes
    """parsed vuln"""

    host_iid: int
    name: str
    xtype: str
    service_iid: int = None
    via_target: str = None
    severity: str = None
    descr: str = None
    data: str = None
    refs: list = None
    import_time: datetime = None
    iid: int = None

    def ident(self, pidb_container):
        """get storage upsert key; composite key"""
        host = pidb_container.hosts.by.iid[self.host_iid]
        service_ref = (
            (pidb_container.services.by.iid[self.service_iid].proto, pidb_container.services.by.iid[self.service_iid].port)
            if self.service_iid is not None else
            (None, None)
        )
        return (host.address, *service_ref, self.xtype, self.name, self.via_target)


@dataclass
class ParsedNote(ParsedItemBase):
    """parsed note"""

    host_iid: int
    xtype: str
    service_iid: tuple = None
    via_target: str = None
    data: str = None
    import_time: datetime = None
    iid: int = None

    def ident(self, pidb_container):
        """get storage upsert key; composite key"""
        host = pidb_container.hosts.by.iid[self.host_iid]
        service_ref = (
            (pidb_container.services.by.iid[self.service_iid].proto, pidb_container.services.by.iid[self.service_iid].port)
            if self.service_iid is not None else
            (None, None)
        )
        return (host.address, *service_ref, self.xtype, self.via_target)


class ParsedItemsDb:
    """container for parsed items"""

    def __init__(self):
        self.hosts = LittleTable()
        self.hosts.create_index('iid', unique=True)
        self.services = LittleTable()
        self.services.create_index('iid', unique=True)
        self.vulns = LittleTable()
        self.vulns.create_index('iid', unique=True)
        self.notes = LittleTable()
        self.notes.create_index('iid', unique=True)

        self.targets = LittleTable()

    @staticmethod
    def _first(alist):
        if alist:
            return alist[0]
        return None

    def _next_iid(self, table_name):
        """get next auto-id"""

        table = getattr(self, table_name)
        if len(table) == 0:
            return 0
        return max(item.iid for item in table) + 1

    def insert_target(self, target):
        """insert target"""

        self.targets.insert(TargetManager.from_str(target))
        return target

    def upsert_host(self, address, **kwargs):
        """upsert host"""

        host = ParsedHost(address, **kwargs)

        pidb_host = self._first(self.hosts.where(address=host.address))
        if pidb_host:
            pidb_host.update(host)
            return pidb_host

        host.iid = len(self.hosts)
        self.hosts.insert(host)
        return host

    def upsert_service(self, host_address, proto, port, **kwargs):
        """upsert service"""

        pidb_host = self.upsert_host(host_address)
        service = ParsedService(pidb_host.iid, proto, port, **kwargs)

        pidb_service = self._first(self.services.where(host_iid=service.host_iid, proto=service.proto, port=service.port))
        if pidb_service:
            pidb_service.update(service)
            return pidb_service

        service.iid = len(self.services)
        self.services.insert(service)
        return service

    def upsert_vuln(
        self,
        host_address,
        name,
        xtype,
        service_proto=None,
        service_port=None,
        via_target=None,
        **kwargs
    ):
        """upsert vuln"""

        pidb_host = self.upsert_host(host_address)
        pidb_service = self.upsert_service(host_address, service_proto, service_port) if (service_proto and service_port) else None
        vuln = ParsedVuln(pidb_host.iid, name, xtype, service_iid=pidb_service.iid if pidb_service else None, via_target=via_target, **kwargs)

        pidb_vuln = self._first(self.vulns.where(
            host_iid=vuln.host_iid,
            name=vuln.name,
            xtype=vuln.xtype,
            service_iid=vuln.service_iid,
            via_target=vuln.via_target
        ))
        if pidb_vuln:
            pidb_vuln.update(vuln)
            return pidb_vuln

        vuln.iid = len(self.vulns)
        self.vulns.insert(vuln)
        return vuln

    def upsert_note(
        self,
        host_address,
        xtype,
        service_proto=None,
        service_port=None,
        via_target=None,
        **kwargs
    ):
        """upsert vuln"""

        pidb_host = self.upsert_host(host_address)
        pidb_service = self.upsert_service(host_address, service_proto, service_port) if (service_proto and service_port) else None
        note = ParsedNote(pidb_host.iid, xtype, service_iid=pidb_service.iid if pidb_service else None, via_target=via_target, **kwargs)

        pidb_note = self._first(self.notes.where(host_iid=note.host_iid, xtype=note.xtype, service_iid=note.service_iid, via_target=note.via_target))
        if pidb_note:
            pidb_note.update(note)
            return pidb_note

        note.iid = len(self.notes)
        self.notes.insert(note)
        return note

    def ident(self, pidb_item):
        """
        ident proxy.
        to generate ident (upsert key) for service/vuln/note related items must
        be also accessed through pidb container itself
        """
        return pidb_item.ident(self)

    def idents(self, pidb_collection):
        """return indents of all items in collection"""
        return list(map(lambda item: item.ident(self), pidb_collection))

    def target_scopes(self):
        """return scopes for all targets"""
        return [item.scope() for item in self.targets]


class ParserBase(ABC):
    """parser interface definition"""

    @staticmethod
    @abstractmethod
    def parse_path(path):
        """
        Parse data from path. Must parse .zip archive produced by respective
        agent module. Optionaly can parse also raw output from external tool.

        :return: pseudo database of parsed objects (hosts, services, vulns, notes)
        :rtype: ParsedItemsDb
        """

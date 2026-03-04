# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
planner config schema
"""
# pylint: disable=missing-class-docstring

from typing import Optional

from sner.config import ConfigBase


class StandaloneQueues(ConfigBase):
    queues: list[str]


class ServiceDisco(ConfigBase):
    netlist_schedule: str
    queue: str


class SixDisco(ConfigBase):
    dns_netlist_schedule: str
    dns_disco_queue: str
    storage_enum_schedule: str
    storage_enum_queue: str


class ServiceScan(ConfigBase):
    schedule: str
    queues: list[str]
    service_interval: str


class HostRescan(ConfigBase):
    schedule: str
    host_interval: str


class NucleiScan(ConfigBase):
    schedule: str
    queue: str


class NessusScan(ConfigBase):
    schedule: str
    queue: str


class SportmapScan(ConfigBase):
    schedule: str
    queue: str


class AurorHostnames(ConfigBase):
    schedule: str
    queue: str


class AurorTestsslScan(ConfigBase):
    targetlist_schedule: str
    queue: str
    cleanup_schedule: str
    connect_timeout: int = 5
    openssl_timeout: int = 5
    ports_starttls: dict = {
        21: "ftp",
        23: "telnet",
        24: "lmtp",
        25: "smtp",
        110: "pop3",
        119: "nntp",
        143: "imap",
        389: "ldap",
        587: "smtp",
        # 674: "acap",
        3306: "mysql",
        4190: "sieve",
        5222: "xmpp",
        5269: "xmpp-server",
        5432: "postgres",
        6667: "irc",
    }


class StorageCleanup(ConfigBase):
    enabled: bool


class RebuildVersionInfoMap(ConfigBase):
    schedule: str


class Pipelines(ConfigBase):
    standalone_queues: Optional[StandaloneQueues] = None
    service_disco: Optional[ServiceDisco] = None
    six_disco: Optional[SixDisco] = None
    service_scan: Optional[ServiceScan] = None
    host_rescan: Optional[HostRescan] = None
    nuclei_scan: Optional[NucleiScan] = None
    nessus_scan: Optional[NessusScan] = None
    sportmap_scan: Optional[SportmapScan] = None
    auror_hostnames: Optional[AurorHostnames] = None
    auror_testssl: Optional[AurorTestsslScan] = None
    storage_cleanup: Optional[StorageCleanup] = None
    rebuild_versioninfo_map: Optional[RebuildVersionInfoMap] = None


class PlannerConfig(ConfigBase):
    basic_nets: list[str] = []
    nuclei_nets: list[str] = []
    sportmap_nets: list[str] = []
    nessus_nets: list[str] = []
    auror_testssl_nets: list[str] = []

    pipelines: Optional[Pipelines] = None

# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
planner config schema
"""
# pylint: disable=missing-class-docstring


from typing import List, Optional
from pydantic import BaseModel


class StandaloneQueues(BaseModel):
    queues: List[str]


class ServiceDisco(BaseModel):
    netlist_schedule: str
    queue: str


class SixDisco(BaseModel):
    dns_netlist_schedule: str
    dns_disco_queue: str
    storage_enum_schedule: str
    storage_enum_queue: str


class ServiceScan(BaseModel):
    schedule: str
    queues: List[str]
    service_interval: str


class HostRescan(BaseModel):
    schedule: str
    host_interval: str


class NucleiScan(BaseModel):
    schedule: str
    queue: str


class SportmapScan(BaseModel):
    schedule: str
    queue: str


class AurorHostnames(BaseModel):
    schedule: str
    queue: str


class AurorTestsslScan(BaseModel):
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


class StorageCleanup(BaseModel):
    enabled: bool


class RebuildVersionInfoMap(BaseModel):
    schedule: str


class Pipelines(BaseModel):
    standalone_queues: Optional[StandaloneQueues] = None
    service_disco: Optional[ServiceDisco] = None
    six_disco: Optional[SixDisco] = None
    service_scan: Optional[ServiceScan] = None
    host_rescan: Optional[HostRescan] = None
    nuclei_scan: Optional[NucleiScan] = None
    sportmap_scan: Optional[SportmapScan] = None
    auror_hostnames: Optional[AurorHostnames] = None
    auror_testssl: Optional[AurorTestsslScan] = None
    storage_cleanup: Optional[StorageCleanup] = None
    rebuild_versioninfo_map: Optional[RebuildVersionInfoMap] = None


class PlannerConfig(BaseModel):
    basic_nets_ipv4: List[str] = []
    basic_nets_ipv6: List[str] = []

    nuclei_nets_ipv4: List[str] = []
    nuclei_nets_ipv6: List[str] = []
    sportmap_nets_ipv4: List[str] = []
    sportmap_nets_ipv6: List[str] = []

    auror_testssl_ips: List[str] = []

    pipelines: Optional[Pipelines] = None

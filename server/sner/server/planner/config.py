# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
planner config schema
"""
# pylint: disable=missing-class-docstring


from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class PlannerConfigBase(BaseModel):
    model_config = ConfigDict(extra="forbid")


class StandaloneQueues(PlannerConfigBase):
    queues: List[str]


class ServiceDisco(PlannerConfigBase):
    netlist_schedule: str
    queue: str


class SixDisco(PlannerConfigBase):
    dns_netlist_schedule: str
    dns_disco_queue: str
    storage_enum_schedule: str
    storage_enum_queue: str


class ServiceScan(PlannerConfigBase):
    schedule: str
    queues: List[str]
    service_interval: str


class HostRescan(PlannerConfigBase):
    schedule: str
    host_interval: str


class NucleiScan(PlannerConfigBase):
    schedule: str
    queue: str


class NessusScan(PlannerConfigBase):
    schedule: str
    queue: str


class SportmapScan(PlannerConfigBase):
    schedule: str
    queue: str


class AurorHostnames(PlannerConfigBase):
    schedule: str
    queue: str


class AurorTestsslScan(PlannerConfigBase):
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


class StorageCleanup(PlannerConfigBase):
    enabled: bool


class RebuildVersionInfoMap(PlannerConfigBase):
    schedule: str


class Pipelines(PlannerConfigBase):
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


class PlannerConfig(BaseModel):
    basic_nets_ipv4: List[str] = []
    basic_nets_ipv6: List[str] = []
    # TODO: with separate service discovery, it's no longer needed to split ipv4/ipv6
    nuclei_nets_ipv4: List[str] = []
    nuclei_nets_ipv6: List[str] = []
    nessus_ips: List[str] = []
    sportmap_nets_ipv4: List[str] = []
    sportmap_nets_ipv6: List[str] = []
    auror_testssl_ips: List[str] = []
    pipelines: Optional[Pipelines] = None

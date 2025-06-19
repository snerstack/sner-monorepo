# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
planner config schema
"""

from typing import List, Optional
from pydantic import BaseModel


class StandaloneQueues(BaseModel):
    """standalone queues"""

    queues: List[str]


class BasicScan(BaseModel):
    """basic scan"""

    schedule: str
    service_disco_queue: str
    service_scan_queues: List[str]


class BasicRescan(BaseModel):
    """basic storage rescan"""

    schedule: str
    host_interval: str
    service_interval: str


class SixDisco(BaseModel):
    """six disco config"""

    schedule: str
    dns_disco_queue: str
    storage_enum_queue: str


class NucleiScan(BaseModel):
    """nuclei scan"""

    schedule: str
    queue: str


class SportmapScan(BaseModel):
    """sportmap scan"""

    schedule: str
    queue: str


class TestsslScan(BaseModel):
    """testssl scan"""

    schedule: str
    queue: str


class AurorHostnames(BaseModel):
    """auror hostnames import"""

    hostnames_schedule: str
    hostnames_queue: str


class AurorTestsslScan(BaseModel):
    """auror testssl scan"""

    schedule: str
    queue: str
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
    """storage cleanup"""

    enabled: bool


class RebuildVersionInfoMap(BaseModel):
    """rebuild versioninfomap"""

    schedule: str


class Pipelines(BaseModel):
    """pipelines"""

    standalone_queues: Optional[StandaloneQueues] = None
    basic_scan: Optional[BasicScan] = None
    basic_rescan: Optional[BasicRescan] = None
    six_disco: Optional[SixDisco] = None
    nuclei_scan: Optional[NucleiScan] = None
    sportmap_scan: Optional[SportmapScan] = None
    testssl_scan: Optional[TestsslScan] = None
    auror_hostnames: Optional[AurorHostnames] = None
    auror_testssl: Optional[AurorTestsslScan] = None
    storage_cleanup: Optional[StorageCleanup] = StorageCleanup(enabled=True)
    rebuild_versioninfo_map: Optional[RebuildVersionInfoMap] = None


class PlannerConfig(BaseModel):
    """
    Configuration for the planner.

    Attributes:
        basic_nets_ipv4: List of IPv4 networks to scan.
        basic_nets_ipv6: List of IPv6 networks to scan.
        basic_targets: List of targets to scan, list not enumerated.

        nuclei_nets_ipv4: List of IPv4 networks to scan; nuclei pipeline
        nuclei_nets_ipv6: List of IPv6 networks to scan; nuclei pipeline
        nuclei_targets: List of targets to scan, list, not enumerated; nuclei pipeline

        sportmap_nets_ipv4: List of IPv4 networks to scan; sportmap pipeline
        sportmap_nets_ipv6: List of IPv6 networks to scan; sportmap pipeline

        pipelines: Pipelines configuration, if any.
    """

    basic_nets_ipv4: List[str] = []
    basic_nets_ipv6: List[str] = []
    basic_targets: List[str] = []

    nuclei_nets_ipv4: List[str] = []
    nuclei_nets_ipv6: List[str] = []
    nuclei_targets: List[str] = []

    sportmap_nets_ipv4: List[str] = []
    sportmap_nets_ipv6: List[str] = []

    pipelines: Optional[Pipelines] = None

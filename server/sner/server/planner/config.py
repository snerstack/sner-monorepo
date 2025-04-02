# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
planner config schema
"""

from typing import List, Optional
from pydantic import BaseModel, SecretStr


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


class AurorScan(BaseModel):
    """testssl scan"""
    hostnames_schedule: str
    hostnames_queue: str


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
    auror_scan: Optional[AurorScan] = None
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

        agreegate_url: agreegate base url (system for managing scanned networks)
        agreegate_apikey: agreegate apikey

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

    agreegate_url: str = None
    agreegate_apikey: SecretStr = None

    pipelines: Optional[Pipelines] = None

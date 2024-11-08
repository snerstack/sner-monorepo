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
    netlist_schedule: str
    service_disco_queue: str
    six_dns_disco_queue: str
    service_scan_queues: List[str]


class BasicRescan(BaseModel):
    """basic storage rescan"""
    schedule: str
    host_interval: str
    service_interval: str


class StorageSixEnum(BaseModel):
    """storage six enum"""
    schedule: str
    queue: str


class NucleiScan(BaseModel):
    """nuclei scan"""
    netlist_schedule: str
    queue: str


class TestsslScan(BaseModel):
    """testssl scan"""
    schedule: str
    queue: str


class SportmapScan(BaseModel):
    """sportmap scan"""
    schedule: str
    queue: str


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
    storage_six_enum: Optional[StorageSixEnum] = None
    nuclei_scan: Optional[NucleiScan] = None
    testssl_scan: Optional[TestsslScan] = None
    sportmap_scan: Optional[SportmapScan] = None
    storage_cleanup: Optional[StorageCleanup] = None
    rebuild_versioninfo_map: Optional[RebuildVersionInfoMap] = None


class PlannerConfig(BaseModel):
    """
    Configuration for the planner.

    Attributes:
        basic_nets_ipv4: List of IPv4 networks to scan.
        basic_targets: List of targets to scan, list not enumerated.
        filter_nets_ipv6: List of all valid IPv6 addresses used as filters in discoveries.
        nuclei_nets_ipv4: List of IPv4 networks to scan; nuclei pipeline
        nuclei_targets: List of targets to scan, list, not enumerated; nuclei pipeline
        sportmap_nets_ipv4: List of IPv4 networks to scan; sportmap pipeline
        pipelines: Pipelines configuration, if any.
    """

    basic_nets_ipv4: List[str] = []
    basic_targets: List[str] = []
    filter_nets_ipv6: List[str] = []

    nuclei_nets_ipv4: List[str] = []
    nuclei_targets: List[str] = []

    sportmap_nets_ipv4: List[str] = []

    pipelines: Optional[Pipelines] = None

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


class AurorScan(BaseModel):
    hostnames_schedule: str
    hostnames_queue: str


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
    auror_scan: Optional[AurorScan] = None
    storage_cleanup: Optional[StorageCleanup] = None
    rebuild_versioninfo_map: Optional[RebuildVersionInfoMap] = None


class PlannerConfig(BaseModel):
    basic_nets_ipv4: List[str] = []
    basic_nets_ipv6: List[str] = []

    nuclei_nets_ipv4: List[str] = []
    nuclei_nets_ipv6: List[str] = []
    sportmap_nets_ipv4: List[str] = []
    sportmap_nets_ipv6: List[str] = []

    pipelines: Optional[Pipelines] = None

# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
planner config schema
"""
# pylint: disable=missing-class-docstring

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


class RebuildVersioninfo(ConfigBase):
    schedule: str


class Pipelines(ConfigBase):
    standalone_queues: StandaloneQueues | None = None
    service_disco: ServiceDisco | None = None
    six_disco: SixDisco | None = None
    service_scan: ServiceScan | None = None
    host_rescan: HostRescan | None = None
    nuclei_scan: NucleiScan | None = None
    nessus_scan: NessusScan | None = None
    sportmap_scan: SportmapScan | None = None
    auror_hostnames: AurorHostnames | None = None
    auror_testssl: AurorTestsslScan | None = None
    storage_cleanup: StorageCleanup | None = None
    rebuild_versioninfo: RebuildVersioninfo | None = None


class PlannerConfig(ConfigBase):
    basic_nets: list[str] = []
    nuclei_nets: list[str] = []
    sportmap_nets: list[str] = []
    nessus_nets: list[str] = []
    auror_testssl_nets: list[str] = []

    pipelines: Pipelines | None = None

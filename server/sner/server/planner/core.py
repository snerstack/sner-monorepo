# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
# Planner v2

Planner v2 implementation

## 1. Standalone queues

Load raw items from user-defined queues without any downstream processing.


## 2. Basic scanning

### Service discovery

Performs initial host and service discovery, loads all results into storage for
further processing by other stages and pipelines.

### Six discovery

Performs IPv6 address discovery based on DNS and pattern enumeration techniques,
all addresses found are passed to "Service discovery" pipeline.

### Service scanning

Any service discovered by previous pipelines gets scanned by detail scanners:
  * version scan
  * jarm scan
  * script scan

### Host rescan

Services are rescanned on known hosts in order to keep database up-to-date without
generatin too much noise on scanning unused addresses.


## 3. Vulnerability scanning

Nuclei scan (and eventually Nessus scan) scans known services in similar manner as
"Service scanning" pipeline, but can be configured with different set of networks to scan.

This pipeline uses "Service discovery" results to find open services.


## 4. Source-port scanning

TODO


## 5. Auror (TLS scanning)

TODO


## 6. Maintenance pipelines

* Storage cleanup
  Drops all closed services and hosts without any information.

* Rebuild Versioninfo map
  Rebuild versioinfo data from current storage.
"""

import logging
from itertools import chain
from time import sleep

from flask import current_app
from sqlalchemy import delete, not_, or_, select

from sner.lib import TerminateContextMixin
from sner.server.extensions import db
from sner.server.planner.config import PlannerConfig
from sner.server.planner.stages_auror import (
    AurorHostnamesStorageLoader,
    AurorHostnamesTrigger,
    AurorTestsslStorageCleanup,
    AurorTestsslStorageTargetlist
)
from sner.server.planner.stages import (
    Netlist,
    PruningStorageLoader,
    VersioninfoRebuild,
    Schedule,
    ServiceDiscoStorageLoader,
    SixDisco,
    SportmapStorageLoader,
    StorageCleanup,
    HostRescanStorageTargetlist,
    StorageLoader,
    ServiceScanStorageTargetlist,
    ServiceStorageTargetlist,
    SixEnumStorageTargetlist,
)
from sner.server.storage.models import Host, Note, Vuln


def configure_logging():
    """configure server/app logging"""

    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "formatter_planner": {
                    "format": "sner.planner [%(asctime)s] %(levelname)s %(message)s",
                    "datefmt": "%d/%b/%Y:%H:%M:%S %z",
                }
            },
            "handlers": {
                "console_planner": {
                    "class": "logging.StreamHandler",
                    "stream": "ext://sys.stdout",
                    "formatter": "formatter_planner",
                }
            },
            "loggers": {"sner.server": {"level": "INFO", "handlers": ["console_planner"]}},
        }
    )


def outofscope_check(prune=False):
    """handles data in storage that is outside the planner"s scanning scope"""

    def percent(value: int, total: int) -> str:
        """Return a formatted percentage string or 'N/A' if total is zero."""
        return f"{(value / total) * 100:.2f}%" if total else "N/A"

    # find hosts which are not in any scan scope
    scope = list(
        chain.from_iterable(
            current_app.config["SNER_PLANNER"].get(item, [])
            for item in [
                "basic_nets_ipv4",
                "basic_nets_ipv6",
                "nuclei_nets_ipv4",
                "nuclei_nets_ipv6sportmap_nets_ipv4",
                "sportmap_nets_ipv6",
            ]
        )
    )
    current_app.logger.debug("basic scan scope: %s", scope)
    scope_query = [Host.address.op("<<=")(net) for net in scope]
    query = select(Host.id).filter(not_(or_(*scope_query)))
    outscope_host_ids = list(db.session.execute(query).scalars())

    # find other objects which should be pruned from database (not in scope anymore)
    # nuclei and sportmap shares agreegate scanning scope
    scope = list(
        chain.from_iterable(
            current_app.config["SNER_PLANNER"].get(item, [])
            for item in [
                "nuclei_nets_ipv4",
                "nuclei_nets_ipv6",
                "sportmap_nets_ipv4",
                "sportmap_nets_ipv6",
            ]
        )
    )
    current_app.logger.debug("vuln scan scope: %s", scope)
    scope_query = [Host.address.op("<<=")(net) for net in scope]

    query = select(Vuln.id).join(Host).filter(Vuln.xtype.ilike("nuclei.%"))
    if scope_query:
        query = query.filter(not_(or_(*scope_query)))
    outscope_vuln_ids = list(db.session.execute(query).scalars())

    query = select(Note.id).join(Host).filter(Note.xtype == "sportmap")
    if scope_query:
        query = query.filter(not_(or_(*scope_query)))
    outscope_note_ids = list(db.session.execute(query).scalars())

    if current_app.debug:  # pragma: nocover  ; won"t test
        for model, ids in [(Host, outscope_host_ids), (Vuln, outscope_vuln_ids), (Note, outscope_note_ids)]:
            for item in db.session.execute(select(model).filter(model.id.in_(ids))).scalars():
                current_app.logger.debug("out-of-scope object: %s", item)

    outscope_counts = {
        "hosts": len(outscope_host_ids),
        "vulns": len(outscope_vuln_ids),
        "notes": len(outscope_note_ids),
    }
    totals = {
        "hosts": Host.query.count(),
        "vulns": Vuln.query.count(),
        "notes": Note.query.count(),
    }
    if any(outscope_counts.values()) or current_app.debug:
        print(
            "Out-of-scope objects\n"
            f"  Hosts: {outscope_counts['hosts']:-6d} / {totals['hosts']} ({percent(outscope_counts['hosts'], totals['hosts'])})\n"
            f"  Vulns: {outscope_counts['vulns']:-6d} / {totals['vulns']} ({percent(outscope_counts['vulns'], totals['vulns'])})\n"
            f"  Notes: {outscope_counts['notes']:-6d} / {totals['notes']} ({percent(outscope_counts['notes'], totals['notes'])})\n"
        )

    if prune:
        db.session.execute(
            delete(Note).filter(Note.id.in_(outscope_note_ids)), execution_options={"synchronize_session": False}
        )
        db.session.execute(
            delete(Vuln).filter(Vuln.id.in_(outscope_vuln_ids)), execution_options={"synchronize_session": False}
        )
        db.session.execute(
            delete(Host).filter(Host.id.in_(outscope_host_ids)), execution_options={"synchronize_session": False}
        )
        db.session.commit()
        db.session.expire_all()

    return 0


class Planner(TerminateContextMixin):
    """planner"""

    LOOPSLEEP = 60

    def __init__(self, config=None, oneshot=False):
        configure_logging()
        self.log = current_app.logger
        self.log.setLevel(logging.DEBUG if current_app.config["DEBUG"] else logging.INFO)

        # TODO: refactor to mixin ?
        self.original_signal_handlers = {}

        self.loop = None
        self.oneshot = oneshot

        self.config = PlannerConfig(**config)
        self.stages = {}

        self._setup_pipelines()

    def _add_stage(self, name, stage_cls, **kwargs):
        """add stage to planner helper"""

        if issubclass(stage_cls, Schedule) and ("lockname" not in kwargs):
            kwargs["lockname"] = name
        self.stages[name] = stage_cls(**kwargs)
        return self.stages[name]

    def _setup_pipelines(self):  # pylint: disable=too-many-branches
        """setup planner stages/pipelines"""

        plines = self.config.pipelines
        if not plines:
            return

        # standalone queues
        if plines.standalone_queues:
            for qname in plines.standalone_queues.queues:
                self._add_stage(f"standalone:{qname}", StorageLoader, queue_name=qname)

        # basic_scan: host and service discovery
        if plines.service_disco:
            service_disco_stage = self._add_stage(
                "basic_scan:service_disco",
                ServiceDiscoStorageLoader,
                queue_name=plines.service_disco.queue,
            )

            self._add_stage(
                "basic_scan:netlist",
                Netlist,
                schedule=plines.service_disco.netlist_schedule,
                netlist=self.config.basic_nets_ipv4,
                next_stages=[service_disco_stage],
            )

        # basic_scan: IPv6 discovery, DNS and neighbors enumerations
        if plines.six_disco:
            six_disco_dns_stage = self._add_stage(
                "basic_scan:sixdisco_dns",
                SixDisco,
                queue_name=plines.six_disco.dns_disco_queue,
                filternets=self.config.basic_nets_ipv6,
                next_stage=service_disco_stage,
            )

            self._add_stage(
                "basic_scan:sixdisco_dns_netlist",
                Netlist,
                schedule=plines.six_disco.dns_netlist_schedule,
                netlist=self.config.basic_nets_ipv4,
                next_stages=[six_disco_dns_stage],
            )

            six_disco_enum_stage = self._add_stage(
                "basic_scan:sixdisco_storage_enum",
                SixDisco,
                queue_name=plines.six_disco.storage_enum_queue,
                filternets=self.config.basic_nets_ipv6,
                next_stage=service_disco_stage,
            )

            self._add_stage(
                "basic_scan:sixdisco_storage_enum_targetlist",
                SixEnumStorageTargetlist,
                schedule=plines.six_disco.storage_enum_schedule,
                filternets=self.config.basic_nets_ipv6,
                next_stage=six_disco_enum_stage,
            )

        # basic_scan: version scan and other fingerprinting
        if plines.service_scan:
            servicescan_stages = [
                self._add_stage(f"basic_scan:{sscan_qname}", PruningStorageLoader, queue_name=sscan_qname)
                for sscan_qname in plines.service_scan.queues
            ]

            self._add_stage(
                "basic_scan:service_scan_targetlist",
                ServiceScanStorageTargetlist,
                schedule=plines.service_scan.schedule,
                service_interval=plines.service_scan.service_interval,
                filternets=self.config.basic_nets_ipv4 + self.config.basic_nets_ipv6,
                servicescan_stages=servicescan_stages,
            )

        # basic_scan: rescan of hosts and services in storage
        if plines.host_rescan:
            self._add_stage(
                "basic_scan:storage_host_rescan",
                HostRescanStorageTargetlist,
                schedule=plines.host_rescan.schedule,
                filternets=self.config.basic_nets_ipv4 + self.config.basic_nets_ipv6,
                host_interval=plines.host_rescan.host_interval,
                servicedisco_stage=service_disco_stage,
            )

        # nuclei_scan: scan
        if plines.nuclei_scan:
            nuclei_scan_stage = self._add_stage(
                f"nuclei_scan:{plines.nuclei_scan.queue}", PruningStorageLoader, queue_name=plines.nuclei_scan.queue
            )

            self._add_stage(
                "nuclei_scan:storage_targetlist",
                ServiceStorageTargetlist,
                schedule=plines.nuclei_scan.schedule,
                filternets=self.config.nuclei_nets_ipv4 + self.config.nuclei_nets_ipv6,
                next_stage=nuclei_scan_stage,
            )

        # nuclei_scan: source port scan
        if plines.sportmap_scan:
            sportmap_scan_stage = self._add_stage(
                "sportmap_scan:scan", SportmapStorageLoader, queue_name=plines.sportmap_scan.queue
            )

            self._add_stage(
                "sportmap_scan:storage_targetlist",
                ServiceStorageTargetlist,
                schedule=plines.nuclei_scan.schedule,
                filternets=self.config.sportmap_nets_ipv4 + self.config.sportmap_nets_ipv6,
                next_stage=sportmap_scan_stage,
            )

        # auror: hostnames
        if plines.auror_hostnames:
            auror_hostnames_stage = self._add_stage(
                "auror:hostnames", AurorHostnamesStorageLoader, queue_name=plines.auror_hostnames.queue
            )

            self._add_stage(
                "auror:hostnames_trigger",
                AurorHostnamesTrigger,
                schedule=plines.auror_hostnames.schedule,
                next_stage=auror_hostnames_stage,
            )

        # auror: testssl
        if plines.auror_testssl:
            auror_testssl_stage = self._add_stage(
                f"auror_testssl:{plines.auror_testssl.queue}",
                PruningStorageLoader,
                queue_name=plines.auror_testssl.queue
            )

            self._add_stage(
                "auror_testssl:targetlist",
                AurorTestsslStorageTargetlist,
                schedule=plines.auror_testssl.targetlist_schedule,
                next_stage=auror_testssl_stage,
                ports_starttls=plines.auror_testssl.ports_starttls,
                filternets=self.config.auror_testssl_ips
            )

            self._add_stage(
                "auror_testssl:cleanup",
                AurorTestsslStorageCleanup,
                schedule=plines.auror_testssl.cleanup_schedule,
            )

        # storage cleanup
        if plines.storage_cleanup and plines.storage_cleanup.enabled:
            self._add_stage("storage_cleanup", StorageCleanup)

        # rebuild versioninfo
        if plines.rebuild_versioninfo_map:
            self._add_stage(
                "versioninfo_map_rebuild", VersioninfoRebuild, schedule=plines.rebuild_versioninfo_map.schedule
            )

    def terminate(
        self, signum=None, frame=None
    ):  # pragma: no cover  pylint: disable=unused-argument  ; running over multiprocessing
        """terminate at once"""

        self.log.info("received terminate")
        self.loop = False

    def run(self):
        """run planner loop"""

        self.log.info(f"startup, {len(self.stages)} configured stages")
        self.loop = True

        with self.terminate_context():
            while self.loop:
                for name, stage in self.stages.items():
                    try:
                        current_app.logger.debug(f"stage run {name} {stage}")
                        stage.run()
                    except Exception as exc:  # pragma: no cover  ; pylint: disable=broad-except
                        current_app.logger.error(f"stage failed, {name} {stage}, {exc}", exc_info=True)
                        db.session.rollback()

                if self.oneshot:
                    self.loop = False
                else:  # pragma: no cover ; running over multiprocessing
                    # support for long loops, but allow fast shutdown
                    for _ in range(self.LOOPSLEEP):
                        if self.loop:
                            sleep(1)

        self.log.info("exit")
        return 0

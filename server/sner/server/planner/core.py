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
    AurorTestsslStorageTargetlist,
)
from sner.server.planner.stages import (
    Netlist,
    PruningStorageLoader,
    VersioninfoRebuild,
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
    """Continual scanning orchestrator."""

    LOOPSLEEP = 60

    def __init__(self, config=None):
        configure_logging()
        self.log = current_app.logger
        self.log.setLevel(logging.DEBUG if current_app.config["DEBUG"] else logging.INFO)

        # TODO: refactor to mixin ?
        self.original_signal_handlers = {}

        self.loop = None

        self.config = PlannerConfig(**config)
        self.stages = {}
        self._cp = self.config.pipelines
        self._setup_pipelines()

    # ------------------------------------------------------------------
    # Pipelines and builders
    # ------------------------------------------------------------------

    def _add_stage(self, stage):
        """Add stage to runtime container."""
        self.stages[stage.name] = stage
        return stage

    def _get_stage(self, name):
        """Resolve a cross-pipeline stage dependency by name."""
        try:
            return self.stages[name]
        except KeyError:
            raise RuntimeError(f"stage '{name}' not found") from None

    def _setup_standalone_queues(self):
        if not self._cp.standalone_queues:
            return

        for qname in self._cp.standalone_queues.queues:
            self._add_stage(StorageLoader(f"standalone:{qname}", qname))

    def _setup_service_disco(self):
        if not self._cp.service_disco:
            return

        loader = self._add_stage(
            ServiceDiscoStorageLoader("basic_scan:service_disco", self._cp.service_disco.queue)
        )
        self._add_stage(
            Netlist(
                "basic_scan:netlist",
                schedule=self._cp.service_disco.netlist_schedule,
                netlist=self.config.basic_nets_ipv4,
                next_stages=[loader],
            )
        )

    def _setup_six_disco(self):
        if not self._cp.six_disco:
            return

        service_disco = self._get_stage("basic_scan:service_disco")

        dns_stage = self._add_stage(
            SixDisco(
                "basic_scan:sixdisco_dns",
                queue_name=self._cp.six_disco.dns_disco_queue,
                filternets=self.config.basic_nets_ipv6,
                next_stage=service_disco,
            )
        )
        self._add_stage(
            Netlist(
                "basic_scan:sixdisco_dns_netlist",
                schedule=self._cp.six_disco.dns_netlist_schedule,
                netlist=self.config.basic_nets_ipv4,
                next_stages=[dns_stage],
            )
        )

        enum_stage = self._add_stage(
            SixDisco(
                "basic_scan:sixdisco_storage_enum",
                queue_name=self._cp.six_disco.storage_enum_queue,
                filternets=self.config.basic_nets_ipv6,
                next_stage=service_disco,
            )
        )
        self._add_stage(
            SixEnumStorageTargetlist(
                "basic_scan:sixdisco_storage_enum_targetlist",
                schedule=self._cp.six_disco.storage_enum_schedule,
                filternets=self.config.basic_nets_ipv6,
                next_stage=enum_stage,
            )
        )

    def _setup_service_scan(self):
        if not self._cp.service_scan:
            return

        loaders = [
            self._add_stage(PruningStorageLoader(f"basic_scan:{qname}", qname))
            for qname in self._cp.service_scan.queues
        ]
        self._add_stage(
            ServiceScanStorageTargetlist(
                "basic_scan:service_scan_targetlist",
                schedule=self._cp.service_scan.schedule,
                service_interval=self._cp.service_scan.service_interval,
                filternets=self.config.basic_nets_ipv4 + self.config.basic_nets_ipv6,
                servicescan_stages=loaders,
            )
        )

    def _setup_host_rescan(self):
        if not self._cp.host_rescan:
            return

        self._add_stage(
            HostRescanStorageTargetlist(
                "basic_scan:storage_host_rescan",
                schedule=self._cp.host_rescan.schedule,
                filternets=self.config.basic_nets_ipv4 + self.config.basic_nets_ipv6,
                host_interval=self._cp.host_rescan.host_interval,
                servicedisco_stage=self._get_stage("basic_scan:service_disco"),
            )
        )

    def _setup_nuclei_scan(self):
        if not self._cp.nuclei_scan:
            return

        loader = self._add_stage(
            PruningStorageLoader(f"nuclei_scan:{self._cp.nuclei_scan.queue}", self._cp.nuclei_scan.queue)
        )
        self._add_stage(
            ServiceStorageTargetlist(
                "nuclei_scan:storage_targetlist",
                schedule=self._cp.nuclei_scan.schedule,
                filternets=self.config.nuclei_nets_ipv4 + self.config.nuclei_nets_ipv6,
                next_stage=loader,
            )
        )

    def _setup_sportmap_scan(self):
        if not self._cp.sportmap_scan:
            return

        loader = self._add_stage(SportmapStorageLoader("sportmap_scan:scan", self._cp.sportmap_scan.queue))
        self._add_stage(
            ServiceStorageTargetlist(
                "sportmap_scan:storage_targetlist",
                schedule=self._cp.nuclei_scan.schedule,  # NOTE: intentionally reuses nuclei schedule
                filternets=self.config.sportmap_nets_ipv4 + self.config.sportmap_nets_ipv6,
                next_stage=loader,
            )
        )

    def _setup_auror_hostnames(self):
        if not self._cp.auror_hostnames:
            return

        loader = self._add_stage(AurorHostnamesStorageLoader("auror:hostnames", self._cp.auror_hostnames.queue))
        self._add_stage(
            AurorHostnamesTrigger(
                "auror:hostnames_trigger",
                schedule=self._cp.auror_hostnames.schedule,
                next_stage=loader,
            )
        )

    def _setup_auror_testssl(self):
        if not self._cp.auror_testssl:
            return

        loader = self._add_stage(
            PruningStorageLoader(f"auror_testssl:{self._cp.auror_testssl.queue}", self._cp.auror_testssl.queue)
        )
        self._add_stage(
            AurorTestsslStorageTargetlist(
                "auror_testssl:targetlist",
                schedule=self._cp.auror_testssl.targetlist_schedule,
                filternets=self.config.auror_testssl_ips,
                ports_starttls=self._cp.auror_testssl.ports_starttls,
                next_stage=loader,
            )
        )
        self._add_stage(
            AurorTestsslStorageCleanup(
                "auror_testssl:cleanup",
                schedule=self._cp.auror_testssl.cleanup_schedule,
            )
        )

    def _setup_storage_cleanup(self):
        if self._cp.storage_cleanup and self._cp.storage_cleanup.enabled:
            self._add_stage(StorageCleanup())

    def _setup_versioninfo_rebuild(self):
        if not self._cp.rebuild_versioninfo_map:
            return
        self._add_stage(
            VersioninfoRebuild(
                "versioninfo_map_rebuild",
                schedule=self._cp.rebuild_versioninfo_map.schedule,
            )
        )

    def _setup_pipelines(self):
        if not self._cp:
            return
        self._setup_standalone_queues()
        self._setup_service_disco()
        self._setup_six_disco()
        self._setup_service_scan()
        self._setup_host_rescan()
        self._setup_nuclei_scan()
        self._setup_sportmap_scan()
        self._setup_auror_hostnames()
        self._setup_auror_testssl()
        self._setup_storage_cleanup()
        self._setup_versioninfo_rebuild()

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def terminate(self, _signum=None, _frame=None):
        """terminate planner"""
        self.log.info("received terminate")
        self.loop = False

    def _run_stages(self):
        for name, stage in self.stages.items():
            try:
                current_app.logger.debug(f"stage run {name} {stage}")
                stage.run()
            except Exception as exc:  # pragma: nocover  pylint: disable=broad-except
                current_app.logger.error(f"stage failed, {name} {stage}, {exc}", exc_info=True)
                db.session.rollback()

    def _interruptible_sleep(self, oneshot):
        if oneshot:
            self.loop = False
            return
        for _ in range(self.LOOPSLEEP):  # pragma: no cover
            if self.loop:
                sleep(1)

    def run(self, oneshot=False):
        """main planner loop"""

        self.log.info(f"startup, {len(self.stages)} configured stages")
        self.loop = True

        with self.terminate_context():
            while self.loop:
                self._run_stages()
                self._interruptible_sleep(oneshot)

        self.log.info("exit")
        return 0

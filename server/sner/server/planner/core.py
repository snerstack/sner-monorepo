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

Nuclei scan scans known services in similar manner as "Service scanning" pipeline, but can
be configured with different set of networks to scan.

This pipeline uses "Service discovery" results to find open services.

Nessus scan scans known hosts with respective scanner (scanner only allow to scan on host/ip basis).


## 4. Source-port scanning

Scans selected services from selected well-known ports for possible firewall misconfigurations.
This pipeline uses "Service discovery" results to find open services and shares scope with sner/nuclei.


## 5. Auror

Auror performs TLS scanning and evaluations on known services mostly based on testssl.sh project.

* https://auror.cesnet.cz/about
* https://csirt.cesnet.cz/en/auror-scanner


## 6. Maintenance pipelines

* Storage cleanup
  Drops all closed services and hosts without any information.

* Rebuild Versioninfo map
  Rebuild versioinfo data from current storage.
"""

import logging
from ipaddress import ip_network
from time import sleep

from flask import current_app
from sqlalchemy import delete, not_, or_, select

from sner.lib import TerminateContextRunner
from sner.server.extensions import db
from sner.server.planner.config import PlannerConfig
from sner.server.planner.stages import (
    HostRescanStorageTargetlist,
    HostStorageTargetlist,
    Netlist,
    PruningStorageLoader,
    PruningStrategyType,
    RebuildVersioninfo,
    ServiceDiscoStorageLoader,
    ServiceScanStorageTargetlist,
    ServiceStorageTargetlist,
    SixDisco,
    SixEnumStorageTargetlist,
    SportmapStorageLoader,
    StorageCleanup,
    StorageLoader,
)
from sner.server.planner.stages_auror import (
    AurorHostnamesStorageLoader,
    AurorHostnamesTrigger,
    AurorTestsslStorageCleanup,
    AurorTestsslStorageTargetlist,
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


# does not really need to setup stages, so intentionaly is not a class method
def outofscope_check(prune=False):
    """handles data in storage that is outside the planner"s scanning scope"""

    def percent(value: int, total: int) -> str:
        """Return a formatted percentage string or 'N/A' if total is zero."""
        return f"{(value / total) * 100:.2f}%" if total else "N/A"

    planner_config = PlannerConfig(**current_app.config["SNER_PLANNER"])
    outscope_host_ids = set()
    outscope_vuln_ids = set()
    outscope_note_ids = set()

    # find hosts which are not in any scan scope
    scope = list(
        set(
            planner_config.basic_nets
            + planner_config.nuclei_nets
            + planner_config.sportmap_nets
            + planner_config.nessus_nets
        )
    )

    current_app.logger.debug("full scope: %s", scope)
    scope_query = [Host.address.op("<<=")(net) for net in scope]
    query = select(Host.id)
    if scope_query:
        query = query.filter(not_(or_(*scope_query)))
    outscope_host_ids.update(db.session.execute(query).scalars().all())

    # check nuclei/sportmap scope
    scope = list(set(planner_config.nuclei_nets + planner_config.sportmap_nets))
    current_app.logger.debug("nuclei/sportmap scope: %s", scope)
    scope_query = [Host.address.op("<<=")(net) for net in scope]

    query = select(Vuln.id).join(Host).filter(Vuln.xtype.ilike("nuclei.%"))
    if scope_query:
        query = query.filter(not_(or_(*scope_query)))
    outscope_vuln_ids.update(db.session.execute(query).scalars().all())

    query = select(Note.id).join(Host).filter(Note.xtype == "sportmap")
    if scope_query:
        query = query.filter(not_(or_(*scope_query)))
    outscope_note_ids.update(db.session.execute(query).scalars().all())

    # check nessus scope
    scope = planner_config.nessus_nets
    current_app.logger.debug("nessus scope: %s", scope)
    scope_query = [Host.address.op("<<=")(net) for net in scope]

    query = select(Vuln.id).join(Host).filter(Vuln.xtype.ilike("nessus.%"))
    if scope_query:
        query = query.filter(not_(or_(*scope_query)))
    outscope_vuln_ids.update(db.session.execute(query).scalars().all())

    if current_app.debug:  # pragma: nocover  ; won't test
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


def _split_ip_networks(networks):
    """split ipv4/ipv6 addrs helper"""

    ipv4_networks = []
    ipv6_networks = []

    for net in networks:
        ip_net = ip_network(net, strict=False)
        if ip_net.version == 4:
            ipv4_networks.append(net)
        else:
            ipv6_networks.append(net)

    return ipv4_networks, ipv6_networks


class Planner(TerminateContextRunner):
    """Continual scanning orchestrator."""

    LOOPSLEEP = 60

    def __init__(self, config=None):
        super().__init__()
        configure_logging()
        self.log = current_app.logger
        self.log.setLevel(logging.DEBUG if current_app.config["DEBUG"] else logging.INFO)

        self.loop = None

        self.config = PlannerConfig(**config)
        ipv4nets, ipv6nets = _split_ip_networks(self.config.basic_nets)
        self._basic_nets_ipv4 = ipv4nets
        self._basic_nets_ipv6 = ipv6nets
        self._cp = self.config.pipelines

        self.stages = {}
        self._setup_pipelines()

    # ------------------------------------------------------------------
    # Pipelines and builders
    # ------------------------------------------------------------------

    def _add_stage(self, stage):
        """Add stage to runtime container."""
        if stage.name in self.stages:  # pragma: nocover  ; won't test
            raise RuntimeError(f"stage {stage.name} already defined")
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

        loader = self._add_stage(ServiceDiscoStorageLoader("basic_scan:service_disco", self._cp.service_disco.queue))
        self._add_stage(
            Netlist(
                "basic_scan:netlist",
                schedule=self._cp.service_disco.netlist_schedule,
                netlist=self._basic_nets_ipv4,
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
                filternets=self._basic_nets_ipv6,
                next_stage=service_disco,
            )
        )
        self._add_stage(
            Netlist(
                "basic_scan:sixdisco_dns_netlist",
                schedule=self._cp.six_disco.dns_netlist_schedule,
                netlist=self._basic_nets_ipv4,
                next_stages=[dns_stage],
            )
        )

        enum_stage = self._add_stage(
            SixDisco(
                "basic_scan:sixdisco_storage_enum",
                queue_name=self._cp.six_disco.storage_enum_queue,
                filternets=self._basic_nets_ipv6,
                next_stage=service_disco,
            )
        )
        self._add_stage(
            SixEnumStorageTargetlist(
                "basic_scan:sixdisco_storage_enum_targetlist",
                schedule=self._cp.six_disco.storage_enum_schedule,
                filternets=self._basic_nets_ipv6,
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
                filternets=self.config.basic_nets,
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
                filternets=self.config.basic_nets,
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
                filternets=self.config.nuclei_nets,
                next_stage=loader,
            )
        )

    def _setup_sportmap_scan(self):
        if not self._cp.sportmap_scan:
            return

        loader = self._add_stage(SportmapStorageLoader("sportmap_scan:scan", self._cp.sportmap_scan.queue))
        self._add_stage(
            HostStorageTargetlist(
                "sportmap_scan:storage_targetlist",
                schedule=self._cp.sportmap_scan.schedule,
                filternets=self.config.sportmap_nets,
                next_stage=loader,
            )
        )

    def _setup_nessus_scan(self):
        if not self._cp.nessus_scan:
            return

        loader = self._add_stage(
            PruningStorageLoader(
                f"nessus_scan:{self._cp.nessus_scan.queue}",
                self._cp.nessus_scan.queue,
                strategy=PruningStrategyType.HOST,
            )
        )
        self._add_stage(
            HostStorageTargetlist(
                "nessus_scan:storage_targetlist",
                schedule=self._cp.nessus_scan.schedule,
                filternets=self.config.nessus_nets,
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
                filternets=self.config.auror_testssl_nets,
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

    def _setup_rebuild_versioninfo(self):
        if not self._cp.rebuild_versioninfo:
            return
        self._add_stage(
           RebuildVersioninfo(
                "rebuild_versioninfo",
                schedule=self._cp.rebuild_versioninfo.schedule,
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
        self._setup_nessus_scan()
        self._setup_auror_hostnames()
        self._setup_auror_testssl()
        self._setup_storage_cleanup()
        self._setup_rebuild_versioninfo()

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def terminate(self, _signum=None, _frame=None):  # pragma: no cover  ; running over multiprocessing
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

# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
planner core

planner handles processing of queues acording to defined pipelines. queues has system of priorities
and requirements so they can be handled by pools of agents with respective capabilities
"""

import ipaddress
import json
import logging
from itertools import chain
from pathlib import Path
from time import sleep

from flask import current_app
from sqlalchemy import delete, not_, or_, select

from sner.lib import TerminateContextMixin
from sner.server.extensions import db
from sner.server.planner.config import PlannerConfig
from sner.server.planner.stages import (
    Netlist,
    Targetlist,
    RebuildVersioninfoMap,
    Schedule,
    ServiceDisco,
    SixDisco,
    StorageCleanup,
    StorageLoader,
    StorageLoaderAurorHostnames,
    StorageLoaderNuclei,
    StorageLoaderSportmap,
    StorageRescan,
    StorageSixEnumTargetlist,
    StorageSixTargetlist,
    StorageTestsslTargetlist,
)
from sner.server.scheduler.core import enumerate_network, ExclMatcher
from sner.server.storage.models import Host, Note, Vuln
from sner.server.utils import agreegate_apicall, AgreegateApiError


AGREEGATE_NETLISTS_FILE = "agreegate_netlists.json"


def configure_logging():
    """configure server/app logging"""

    logging.config.dictConfig({
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "formatter_planner": {
                "format": "sner.planner [%(asctime)s] %(levelname)s %(message)s",
                "datefmt": "%d/%b/%Y:%H:%M:%S %z"
            }
        },
        "handlers": {
            "console_planner": {
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
                "formatter": "formatter_planner"
            }
        },
        "loggers": {
            "sner.server": {
                "level": "INFO",
                "handlers": ["console_planner"]
            }
        }
    })


def fetch_agreegate_netlists():
    """fetch networks to be scanned from agreegate API"""

    try:
        netlists_json = agreegate_apicall("GET", "/api/v1/networks/aggregated?output=json")
    except AgreegateApiError:  # pragma: nocover  ; won't test
        current_app.logger.error("failed to fetch agreegate netlists")
        return 1

    agreegate_netlists_path = Path(f"{current_app.config['SNER_VAR']}/{AGREEGATE_NETLISTS_FILE}")
    agreegate_netlists_path.write_text(
        json.dumps(netlists_json, indent=4),
        encoding="utf-8"
    )
    return 0


def split_ip_networks(networks):
    """split ipv4/ipv6 addrs helper"""

    ipv4_networks = []
    ipv6_networks = []

    for net in networks:
        try:
            ip_net = ipaddress.ip_network(net, strict=False)
            if ip_net.version == 4:
                ipv4_networks.append(net)
            else:
                ipv6_networks.append(net)
        except ValueError:
            current_app.logger.error("Invalid network: %s", net)

    return ipv4_networks, ipv6_networks


def load_merge_agreegate_netlists(config):
    """load and merge netlists from agreegate file into planner config dict"""

    agreegate_netlists_path = Path(f"{current_app.config['SNER_VAR']}/{AGREEGATE_NETLISTS_FILE}")

    if agreegate_netlists_path.exists():
        current_app.logger.debug("merging agreegate netlists")
        ag_netlists = json.loads(agreegate_netlists_path.read_text(encoding="utf-8"))

        ipv4_networks, ipv6_networks = split_ip_networks(ag_netlists.get("sner/basic", []))
        config["basic_nets_ipv4"] = sorted(list(set(config.get("basic_nets_ipv4", []) + ipv4_networks)))
        config["basic_nets_ipv6"] = sorted(list(set(config.get("basic_nets_ipv6", []) + ipv6_networks)))

        ipv4_networks, ipv6_networks = split_ip_networks(ag_netlists.get("sner/nuclei", []))
        config["nuclei_nets_ipv4"] = sorted(list(set(config.get("nuclei_nets_ipv4", []) + ipv4_networks)))
        config["nuclei_nets_ipv6"] = sorted(list(set(config.get("nuclei_nets_ipv6", []) + ipv6_networks)))
        config["sportmap_nets_ipv4"] = sorted(list(set(config.get("sportmap_nets_ipv4", []) + ipv4_networks)))
        config["sportmap_nets_ipv6"] = sorted(list(set(config.get("sportmap_nets_ipv6", []) + ipv6_networks)))

    return config


def dump_targets(netlist):
    """dump all available targets, helper for manual sweeps"""

    blacklist = ExclMatcher(current_app.config["SNER_EXCLUSIONS"])

    addrs = []
    for net in current_app.config["SNER_PLANNER"][netlist]:
        for addr in enumerate_network(net):
            if not blacklist.match(addr):
                addrs.append(addr)

    return addrs


def outofscope_check(prune=False):
    """handles data in storage that is outside the planner"s scanning scope"""

    # find hosts which are not in any scan scope
    scope = list(chain.from_iterable(
        current_app.config["SNER_PLANNER"].get(item, [])
        for item in [
            "basic_nets_ipv4",
            "basic_nets_ipv6",
            "nuclei_nets_ipv4",
            "nuclei_nets_ipv6"
            "sportmap_nets_ipv4",
            "sportmap_nets_ipv6",
        ]
    ))
    current_app.logger.debug("basic scan scope: %s", scope)
    scope_query = [Host.address.op("<<=")(net) for net in scope]
    query = select(Host.id).filter(not_(or_(*scope_query)))
    outscope_host_ids = list(db.session.execute(query).scalars())

    # find other objects which should be pruned from database (not in scope anymore)
    # nuclei and sportmap shares agreegate scanning scope
    scope = list(chain.from_iterable(
        current_app.config["SNER_PLANNER"].get(item, [])
        for item in [
            "nuclei_nets_ipv4",
            "nuclei_nets_ipv6",
            "sportmap_nets_ipv4",
            "sportmap_nets_ipv6",
        ]
    ))
    current_app.logger.debug("vuln scan scope: %s", scope)
    scope_query = [Host.address.op("<<=")(net) for net in scope]

    query = select(Vuln.id).join(Host).filter(
        Vuln.xtype.ilike("nuclei.%"),
        not_(or_(*scope_query))
    )
    outscope_vuln_ids = list(db.session.execute(query).scalars())

    query = select(Note.id).join(Host).filter(
        Note.xtype == "sportmap",
        not_(or_(*scope_query))
    )
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
            f"  Hosts: {outscope_counts['hosts']:-6d} / {totals['hosts']} ({outscope_counts['hosts']/totals['hosts']:-.2%})\n"
            f"  Vulns: {outscope_counts['vulns']:-6d} / {totals['vulns']} ({outscope_counts['vulns']/totals['vulns']:-.2%})\n"
            f"  Notes: {outscope_counts['notes']:-6d} / {totals['notes']} ({outscope_counts['notes']/totals['notes']:-.2%})\n"
        )

    if prune:
        db.session.execute(
            delete(Note).filter(Note.id.in_(outscope_note_ids)),
            execution_options={"synchronize_session": False}
        )
        db.session.execute(
            delete(Vuln).filter(Vuln.id.in_(outscope_vuln_ids)),
            execution_options={"synchronize_session": False}
        )
        db.session.execute(
            delete(Host).filter(Host.id.in_(outscope_host_ids)),
            execution_options={"synchronize_session": False}
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

        self.original_signal_handlers = {}
        self.loop = None
        self.oneshot = oneshot
        self.stages = {}

        self.config = PlannerConfig(**config)
        self._setup_stages()

    def _add_stage(self, name, stage_cls, **kwargs):
        """add stage to planner helper"""

        if issubclass(stage_cls, Schedule) and ("lockname" not in kwargs):
            kwargs["lockname"] = name
        self.stages[name] = stage_cls(**kwargs)
        return self.stages[name]

    def _setup_stages(self):
        """setup planner stages/pipelines"""

        if not self.config.pipelines:
            return
        plines = self.config.pipelines

        # loads standalone queues
        if plines.standalone_queues:
            for qname in plines.standalone_queues.queues:
                self._add_stage(
                    f"standalone_queue:{qname}",
                    StorageLoader,
                    queue_name=qname
                )

        # basic discovery and version scanning
        if plines.basic_scan:
            basic_servicescan_stages = [
                self._add_stage(f"basic_scan:{sscan_qname}", StorageLoader, queue_name=sscan_qname)
                for sscan_qname in plines.basic_scan.service_scan_queues
            ]

            basic_servicedisco_stage = self._add_stage(
                "basic_scan:service_disco",
                ServiceDisco,
                queue_name=plines.basic_scan.service_disco_queue,
                next_stages=basic_servicescan_stages
            )

            self._add_stage(
                "basic_scan:netlist",
                Netlist,
                schedule=plines.basic_scan.schedule,
                netlist=self.config.basic_nets_ipv4,
                next_stages=[basic_servicedisco_stage]
            )

            self._add_stage(
                "basic_scan:targetlist",
                Targetlist,
                schedule=plines.basic_scan.schedule,
                targets=self.config.basic_targets,
                next_stages=[basic_servicedisco_stage]
            )

        # basic rescan of hosts and services in storage
        if plines.basic_rescan:
            self._add_stage(
                "basic_rescan",
                StorageRescan,
                schedule=plines.basic_rescan.schedule,
                host_interval=plines.basic_rescan.host_interval,
                servicedisco_stage=basic_servicedisco_stage,
                service_interval=plines.basic_rescan.service_interval,
                servicescan_stages=basic_servicescan_stages,
                filternets=self.config.basic_nets_ipv6,
            )

        # six discovery, DNS and neighbors of known six hosts for basic scanned nets
        if plines.six_disco:
            six_disco_dns_stage = self._add_stage(
                "six_disco:dns_disco",
                SixDisco,
                queue_name=plines.six_disco.dns_disco_queue,
                filternets=self.config.basic_nets_ipv6,
                next_stage=basic_servicedisco_stage
            )

            self._add_stage(
                "six_disco:dns_netlist",
                Netlist,
                schedule=plines.six_disco.schedule,
                netlist=self.config.basic_nets_ipv4,
                next_stages=[six_disco_dns_stage]
            )

            six_disco_enum_stage = self._add_stage(
                "six_disco:storage_enum",
                SixDisco,
                queue_name=plines.six_disco.storage_enum_queue,
                filternets=self.config.basic_nets_ipv6,
                next_stage=basic_servicedisco_stage
            )

            self._add_stage(
                "six_disco:storage_six_enum_targetlist",
                StorageSixEnumTargetlist,
                schedule=plines.six_disco.schedule,
                filternets=self.config.basic_nets_ipv6,
                next_stage=six_disco_enum_stage
            )

        # nuclei scan
        if plines.nuclei_scan:
            nuclei_load_stage = self._add_stage(
                "nuclei_scan:load",
                StorageLoaderNuclei,
                queue_name=plines.nuclei_scan.queue
            )

            self._add_stage(
                "nuclei_scan:netlist",
                Netlist,
                schedule=plines.nuclei_scan.schedule,
                netlist=self.config.nuclei_nets_ipv4,
                next_stages=[nuclei_load_stage]
            )

            self._add_stage(
                "nuclei_scan:targetlist",
                Targetlist,
                schedule=plines.nuclei_scan.schedule,
                targets=self.config.nuclei_targets,
                next_stages=[nuclei_load_stage]
            )

            self._add_stage(
                "nuclei_scan:storage_six_targetlist",
                StorageSixTargetlist,
                schedule=plines.nuclei_scan.schedule,
                filternets=self.config.nuclei_nets_ipv6,
                next_stage=nuclei_load_stage
            )

        # sportmap scan
        if plines.sportmap_scan:
            sportmap_load_stage = self._add_stage(
                "sportmap_scan:load", StorageLoaderSportmap, queue_name=plines.sportmap_scan.queue
            )

            self._add_stage(
                "sportmap_scan:netlist",
                Netlist,
                schedule=plines.sportmap_scan.schedule,
                netlist=self.config.sportmap_nets_ipv4,
                next_stages=[sportmap_load_stage]
            )

            self._add_stage(
                "sportmap_scan:storage_six_targetlist",
                StorageSixTargetlist,
                schedule=plines.sportmap_scan.schedule,
                filternets=self.config.sportmap_nets_ipv6,
                next_stage=sportmap_load_stage
            )

        # testssl scan
        if plines.testssl_scan:
            testssl_load_stage = self._add_stage(
                "testssl_scan:load",
                StorageLoader,
                queue_name=plines.testssl_scan.queue
            )

            self._add_stage(
                "testssl_scan:targetlist",
                StorageTestsslTargetlist,
                schedule=plines.testssl_scan.schedule,
                next_stage=testssl_load_stage
            )

        # auror scan
        if plines.auror_scan:
            auror_hostnames_stage = self._add_stage(
                "auror:hostnames",
                StorageLoaderAurorHostnames,
                queue_name=plines.auror_scan.hostnames_queue
            )

            self._add_stage(
                "auror:hostnames_targetlist",
                Targetlist,
                schedule=plines.auror_scan.hostnames_schedule,
                targets=["trigger"],
                next_stages=[auror_hostnames_stage]
            )

        # storage cleanup
        if plines.storage_cleanup and plines.storage_cleanup.enabled:
            self._add_stage("storage_cleanup", StorageCleanup)

        # rebuild versioninfo
        if plines.rebuild_versioninfo_map:
            self._add_stage(
                "rebuild_versioninfo_map",
                RebuildVersioninfoMap,
                schedule=plines.rebuild_versioninfo_map.schedule
            )

    def terminate(self, signum=None, frame=None):  # pragma: no cover  pylint: disable=unused-argument  ; running over multiprocessing
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

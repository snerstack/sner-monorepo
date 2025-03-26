# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
planner core

planner handles processing of queues acording to defined pipelines. queues has system of priorities
and requirements so they can be handled by pools of agents with respective capabilities
"""

import ipaddress
import json
import logging
from http import HTTPStatus
from pathlib import Path
from time import sleep

import requests
from flask import current_app

from sner.lib import TerminateContextMixin
from sner.server.extensions import db
from sner.server.planner.config import PlannerConfig
from sner.server.planner.stages import (
    NetlistEnum,
    NetlistTargets,
    RebuildVersioninfoMap,
    ServiceDisco,
    SixDisco,
    StorageCleanup,
    StorageLoader,
    StorageLoaderNuclei,
    StorageLoaderSportmap,
    StorageRescan,
    StorageSixTargetlist,
    StorageTestsslTargetlist,
)
from sner.server.scheduler.core import enumerate_network, ExclMatcher
from sner.server.scheduler.models import Queue


def configure_logging():
    """configure server/app logging"""

    logging.config.dictConfig({
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'formatter_planner': {
                'format': 'sner.planner [%(asctime)s] %(levelname)s %(message)s',
                'datefmt': '%d/%b/%Y:%H:%M:%S %z'
            }
        },
        'handlers': {
            'console_planner': {
                'class': 'logging.StreamHandler',
                'stream': 'ext://sys.stdout',
                'formatter': 'formatter_planner'
            }
        },
        'loggers': {
            'sner.server': {
                'level': 'INFO',
                'handlers': ['console_planner']
            }
        }
    })


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


class Planner(TerminateContextMixin):
    """planner"""

    LOOPSLEEP = 60

    def __init__(self, config=None, oneshot=False):
        configure_logging()
        self.log = current_app.logger
        self.log.setLevel(logging.DEBUG if current_app.config['DEBUG'] else logging.INFO)

        self.original_signal_handlers = {}
        self.loop = None
        self.oneshot = oneshot
        self.stages = {}
        self.agreegate_netlists_path = Path(f"{current_app.config['SNER_VAR']}/agreegate_netlists.json")

        self.config = PlannerConfig(**config)
        self._load_merge_agreegate_netlists()
        self._setup_stages()

    def _load_merge_agreegate_netlists(self):
        """load and merge netlists from agreegate file"""

        if self.agreegate_netlists_path.exists():
            current_app.logger.debug("merging agreegate netlists")
            ag_netlists = json.loads(self.agreegate_netlists_path.read_text(encoding="utf-8"))

            ipv4_networks, ipv6_networks = split_ip_networks(ag_netlists.get("sner/basic", []))
            self.config.basic_nets_ipv4 = list(set(self.config.basic_nets_ipv4 + ipv4_networks))
            self.config.filter_nets_ipv6 = list(set(self.config.filter_nets_ipv6 + ipv6_networks))

            ipv4_networks, ipv6_networks = split_ip_networks(ag_netlists.get("sner/nuclei", []))
            self.config.nuclei_nets_ipv4 = list(set(self.config.nuclei_nets_ipv4 + ipv4_networks))
            self.config.sportmap_nets_ipv4 = list(set(self.config.sportmap_nets_ipv4 + ipv4_networks))

    def _setup_stages(self):
        """setup planner stages/pipelines"""

        if not self.config.pipelines:
            return
        plines = self.config.pipelines

        # loads standalone queues
        if plines.standalone_queues:
            for qname in plines.standalone_queues.queues:
                queue = Queue.query.filter_by(name=qname).one()
                self.stages[f'standalone_queue:{queue.name}'] = StorageLoader(queue_name=qname)

        # perform basic discovery and version scanning
        # netlist -> (service disco | six dns enum) -> service scans
        if plines.basic_scan:
            basic_servicescan_stages = []
            for sscan_qname in plines.basic_scan.service_scan_queues:
                stage = StorageLoader(queue_name=sscan_qname)
                self.stages[f"basic_scan:{sscan_qname}"] = stage
                basic_servicescan_stages.append(stage)

            self.stages['basic_scan:service_disco'] = ServiceDisco(
                queue_name=plines.basic_scan.service_disco_queue,
                next_stages=basic_servicescan_stages
            )

            self.stages['basic_scan:six_dns_disco'] = SixDisco(
                queue_name=plines.basic_scan.six_dns_disco_queue,
                next_stage=self.stages['basic_scan:service_disco'],
                filternets=self.config.filter_nets_ipv6
            )

            self.stages['basic_scan:netlist'] = NetlistEnum(
                schedule=plines.basic_scan.netlist_schedule,
                lockname="basic_scan__netlist",
                netlist=self.config.basic_nets_ipv4,
                next_stages=[
                    self.stages['basic_scan:service_disco'],
                    self.stages['basic_scan:six_dns_disco']
                ]
            )

            self.stages['basic_scan:netlist_targets'] = NetlistTargets(
                schedule=plines.basic_scan.netlist_schedule,
                lockname="basic_scan__netlist_targets",
                targets=self.config.basic_targets,
                next_stages=[self.stages['basic_scan:service_disco']]
            )

        # do basic rescan of hosts and services in storage
        if plines.basic_rescan:
            self.stages['storage_rescan'] = StorageRescan(
                schedule=plines.basic_rescan.schedule,
                lockname='storage_rescan',
                host_interval=plines.basic_rescan.host_interval,
                servicedisco_stage=self.stages['basic_scan:service_disco'],
                service_interval=plines.basic_rescan.service_interval,
                servicescan_stages=basic_servicescan_stages
            )

        # performs six discovery based on neighbors of known
        # six hosts. required basic_scan
        if plines.storage_six_enum:
            self.stages['storage_six_enum:disco'] = SixDisco(
                queue_name=plines.storage_six_enum.queue,
                next_stage=self.stages['basic_scan:service_disco'],
                filternets=self.config.filter_nets_ipv6
            )
            self.stages['storage_six_enum:targetlist'] = StorageSixTargetlist(
                schedule=plines.storage_six_enum.schedule,
                lockname='storage_six_enum__targetlist',
                next_stage=self.stages['storage_six_enum:disco']
            )

        # perform nuclei scan
        if plines.nuclei_scan:
            self.stages['nuclei_scan:load'] = StorageLoaderNuclei(queue_name=plines.nuclei_scan.queue)

            self.stages['nuclei_scan:netlist'] = NetlistEnum(
                schedule=plines.nuclei_scan.netlist_schedule,
                lockname='nuclei_scan__netlist',
                netlist=self.config.nuclei_nets_ipv4,
                next_stages=[self.stages['nuclei_scan:load']]
            )

            self.stages['nuclei_scan:netlist_targets'] = NetlistTargets(
                schedule=plines.nuclei_scan.netlist_schedule,
                lockname='nuclei_scan__netlist_targets',
                targets=self.config.nuclei_targets,
                next_stages=[self.stages['nuclei_scan:load']]
            )

        # perform testssl scan
        if plines.testssl_scan:
            self.stages['testssl_scan:load'] = StorageLoader(queue_name=plines.testssl_scan.queue)

            self.stages['testssl_scan:targetlist'] = StorageTestsslTargetlist(
                schedule=plines.testssl_scan.schedule,
                lockname='testssl_scan__targetlist',
                next_stage=self.stages['testssl_scan:load']
            )

        # perform sportmap scan
        if plines.sportmap_scan:
            self.stages['sportmap_scan:load'] = StorageLoaderSportmap(queue_name=plines.sportmap_scan.queue)

            self.stages['sportmap_scan:netlist'] = NetlistEnum(
                schedule=plines.sportmap_scan.schedule,
                lockname='sportmap_scan__netlist',
                netlist=self.config.sportmap_nets_ipv4,
                next_stages=[self.stages['sportmap_scan:load']]
            )

        # do storage cleanup
        self.stages['storage_cleanup'] = StorageCleanup()

        # rebuild versioninfo
        if plines.rebuild_versioninfo_map:
            self.stages['rebuild_versioninfo_map'] = RebuildVersioninfoMap(
                schedule=plines.rebuild_versioninfo_map.schedule,
                lockname='rebuild_versioninfo_map'
            )

    def terminate(self, signum=None, frame=None):  # pragma: no cover  pylint: disable=unused-argument  ; running over multiprocessing
        """terminate at once"""

        self.log.info('received terminate')
        self.loop = False

    def run(self):
        """run planner loop"""

        self.log.info(f'startup, {len(self.stages)} configured stages')
        self.loop = True

        with self.terminate_context():
            while self.loop:
                for name, stage in self.stages.items():
                    try:
                        current_app.logger.debug(f'stage run {name} {stage}')
                        stage.run()
                    except Exception as exc:  # pragma: no cover  ; pylint: disable=broad-except
                        current_app.logger.error(f'stage failed, {name} {stage}, {exc}', exc_info=True)
                        db.session.rollback()

                if self.oneshot:
                    self.loop = False
                else:  # pragma: no cover ; running over multiprocessing
                    # support for long loops, but allow fast shutdown
                    for _ in range(self.LOOPSLEEP):
                        if self.loop:
                            sleep(1)

        self.log.info('exit')
        return 0

    def dump_targets(self, netlist):
        """dump all available targets, helper for manual sweeps"""

        blacklist = ExclMatcher(current_app.config['SNER_EXCLUSIONS'])

        addrs = []
        for net in getattr(self.config, netlist):
            for addr in enumerate_network(net):
                if not blacklist.match(addr):
                    addrs.append(addr)

        return addrs

    def fetch_agreegate_netlists(self):
        """fetch networks to be scanned from agreegate API"""

        resp = requests.get(
            f"{self.config.agreegate_url}/api/v1/networks/aggregated?output=json",
            headers={"X-API-KEY": self.config.agreegate_apikey},
            timeout=60
        )

        if resp.status_code != HTTPStatus.OK:  # pragma nocover  ; won't test
            current_app.logger.error("failed to fetch agreegate netlists, %s", resp)
            return 1

        self.agreegate_netlists_path.write_text(
            json.dumps(resp.json(), indent=4),
            encoding="utf-8"
        )
        return 0

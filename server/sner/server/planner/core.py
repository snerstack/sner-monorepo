# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
planner core
"""

import logging
from time import sleep

import psycopg2
from flask import current_app
from sner.lib import TerminateContextMixin
from sner.server.extensions import db
from sner.server.planner.config import PlannerConfig
from sner.server.planner.stages import (
    NetlistEnum,
    NetlistEnumNuclei,
    NetlistSix,
    RebuildVersioninfoMap,
    ServiceDisco,
    SixDisco,
    StorageCleanup,
    StorageLoader,
    StorageLoaderNuclei,
    StorageRescan,
    StorageSixTargetlist,
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
        self.config = PlannerConfig(**config)

        self.stages = {}
        self._setup_stages()

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
                filternets=self.config.basic_nets_ipv6
            )

            self.stages['basic_scan:netlist'] = NetlistEnum(
                schedule=plines.basic_scan.netlist_schedule,
                netlist=self.config.basic_nets_ipv4,
                next_stages=[
                    self.stages['basic_scan:service_disco'],
                    self.stages['basic_scan:six_dns_disco']
                ]
            )

            self.stages['basic_scan:netlist_six'] = NetlistSix(
                schedule=plines.basic_scan.netlist_schedule,
                addrlist=self.config.basic_nets_ipv6_hosts,
                next_stages=[self.stages['basic_scan:service_disco']]
            )

        # do basic rescan of hosts and services in storage
        if plines.basic_rescan:
            self.stages['storage_rescan'] = StorageRescan(
                schedule=plines.basic_rescan.schedule,
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
                next_stage=self.stages['basic_scan:service_disco']
            )
            self.stages['storage_six_enum:targetlist'] = StorageSixTargetlist(
                schedule=plines.storage_six_enum.schedule,
                next_stage=self.stages['storage_six_enum:disco']
            )

        # perform nuclei scan
        if plines.nuclei_scan:
            self.stages['nuclei_scan:load'] = StorageLoaderNuclei(queue_name=plines.nuclei_scan.queue)

            self.stages['nuclei_scan:netlist'] = NetlistEnumNuclei(
                schedule=plines.nuclei_scan.netlist_schedule,
                netlist=self.config.nuclei_nets_ipv4,
                next_stages=[self.stages['nuclei_scan:load']]
            )

            self.stages['nuclei_scan:netlist_six'] = NetlistSix(
                schedule=plines.nuclei_scan.netlist_schedule,
                addrlist=self.config.nuclei_nets_ipv6_hosts,
                next_stages=[self.stages['nuclei_scan:load']]
            )

        # do storage cleanup
        self.stages['storage_cleanup'] = StorageCleanup()

        # rebuild versioninfo
        if plines.rebuild_versioninfo_map:
            self.stages['rebuild_versioninfo_map'] = RebuildVersioninfoMap(schedule=plines.rebuild_versioninfo_map.schedule)

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
                    except psycopg2.OperationalError as exc:  # pragma: no cover  ; won't test
                        current_app.logger.error(f'stage failed, {name} {stage}, {exc}', exc_info=True)
                        db.session.rollback()
                    except Exception as exc:  # pragma: no cover  ; pylint: disable=broad-except
                        current_app.logger.error(f'stage failed, {name} {stage}, {exc}', exc_info=True)

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

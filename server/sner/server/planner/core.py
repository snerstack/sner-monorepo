# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
planner core
"""

import logging
from abc import ABC, abstractmethod
from collections import defaultdict
from datetime import datetime
from ipaddress import ip_address, ip_network, IPv6Address
from pathlib import Path
from time import sleep

import psycopg2
from flask import current_app
from pytimeparse import parse as timeparse
from sqlalchemy import select, tuple_
from sqlalchemy.orm.exc import NoResultFound
from sner.lib import format_host_address, get_nested_key, TerminateContextMixin
from sner.server.extensions import db
from sner.server.scheduler.core import enumerate_network, ExclMatcher, JobManager, QueueManager
from sner.server.scheduler.models import Queue, Job, Target
from sner.server.storage.core import StorageManager
from sner.server.storage.models import Host, Vuln
from sner.server.storage.versioninfo import VersioninfoManager


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


def project_hosts(pidb):
    """project host list from context data"""

    return [f'{host.address}' for host in pidb.hosts]


def project_services(pidb):
    """project service list from pidb"""

    return [
        f'{service.proto}://{format_host_address(pidb.hosts.by.iid[service.host_iid].address)}:{service.port}'
        for service
        in pidb.services
    ]


def project_sixenum_targets(hosts):
    """project targets for six_enum_discover agent from list of ipv6 addresses"""

    targets = set()
    for host in hosts:
        exploded = IPv6Address(host).exploded
        # do not enumerate EUI-64 hosts/nets
        if exploded[27:32] == 'ff:fe':
            continue

        # generate mask for scan6 tool
        exploded = exploded.split(':')
        exploded[-1] = '0-ffff'
        target = ':'.join(exploded)

        targets.add(f'sixenum://{target}')

    return list(targets)


def filter_tarpits(pidb, threshold=200):
    """filter filter hosts with too much services detected"""

    host_services_count = defaultdict(int)
    for service in pidb.services:
        host_services_count[pidb.hosts.by.iid[service.host_iid].address] += 1
    hosts_over_threshold = dict(filter(lambda x: x[1] > threshold, host_services_count.items()))

    if hosts_over_threshold:
        for collection in ['services', 'vulns', 'notes']:
            # list() should provide copy for list-in-loop pruning
            for item in list(getattr(pidb, collection)):
                if pidb.hosts.by.iid[item.host_iid].address in hosts_over_threshold:
                    getattr(pidb, collection).remove(item)

        # list() should provide copy for list-in-loop pruning
        for host in list(pidb.hosts):
            if host.address in hosts_over_threshold:
                pidb.hosts.remove(host)

    return pidb


def filter_external_hosts(hosts, nets):
    """filter addrs not belonging to nets list"""

    whitelist = [ip_network(net) for net in nets]
    return [item for item in hosts if any(ip_address(item) in net for net in whitelist)]


def filter_service_open(pidb):
    """filter open services"""

    # list() should provide copy for list-in-loop pruning
    for service in list(pidb.services):
        if not service.state.startswith('open:'):
            pidb.services.remove(service)
    return pidb


class Stage(ABC):  # pylint: disable=too-few-public-methods
    """planner stage base"""

    @abstractmethod
    def run(self):
        """stage main runnable"""


class Schedule(Stage):  # pylint: disable=too-few-public-methods
    """schedule base"""

    def __init__(self, schedule):
        self.schedule = schedule
        self.lastrun_path = Path(f'{current_app.config["SNER_VAR"]}/lastrun.{self.__class__.__name__}')

    def run(self):
        """run only on configured schedule"""

        if self.lastrun_path.exists():
            lastrun = datetime.fromisoformat(self.lastrun_path.read_text(encoding='utf8'))
            if (datetime.utcnow().timestamp() - lastrun.timestamp()) < timeparse(self.schedule):
                return

        self._run()
        self.lastrun_path.write_text(datetime.utcnow().isoformat(), encoding='utf8')

    @abstractmethod
    def _run(self):
        """stage runnable implementation"""


class QueueHandler(Stage):  # pylint: disable=too-few-public-methods
    """queue handler base"""

    def __init__(self, queue_name):
        try:
            self.queue = Queue.query.filter(Queue.name == queue_name).one()
        except NoResultFound:
            raise ValueError(f'missing queue "{queue_name}"') from None

    def _drain(self):
        """drain queue and yield PIDBs"""

        for aajob in Job.query.filter(Job.queue_id == self.queue.id, Job.retval == 0).all():
            current_app.logger.info(f'{self.__class__.__name__} drain {aajob.id} ({aajob.queue.name})')
            try:
                parsed = JobManager.parse(aajob)
            except Exception as exc:  # pylint: disable=broad-except
                current_app.logger.error(f'{self.__class__.__name__} failed to drain {aajob.id} ({aajob.queue.name}), {exc}', exc_info=True)
                aajob.retval += 1000
                db.session.commit()
                continue
            yield parsed
            JobManager.archive(aajob)
            JobManager.delete(aajob)

    def task(self, data):
        """enqueue data/targets into all configured queues"""

        already_queued = db.session.connection().execute(select(Target.target).filter(Target.queue == self.queue)).scalars().all()
        enqueue = list(set(data) - set(already_queued))
        QueueManager.enqueue(self.queue, enqueue)
        current_app.logger.info(f'{self.__class__.__name__} enqueued {len(enqueue)} targets to "{self.queue.name}"')


class DummyStage(Stage):  # pylint: disable=too-few-public-methods
    """dummy testing stage"""

    def __init__(self):
        self.task_count = 0
        self.task_args = None
        self.run_count = 0
        self.run_args = None

    def task(self, data):
        """dummy"""

        self.task_count += 1
        self.task_args = data

    def run(self):
        """dummy impl"""


class NetlistEnum(Schedule):  # pylint: disable=too-few-public-methods
    """periodic host discovery via list of ipv4 networks"""

    def __init__(self, schedule, netlist, next_stages):
        super().__init__(schedule)
        self.netlist = netlist
        self.next_stages = next_stages

    def _run(self):
        """run"""

        hosts = []
        for net in self.netlist:
            hosts += enumerate_network(net)
        current_app.logger.info(f'{self.__class__.__name__} enumerated {len(hosts)} hosts')
        for stage in self.next_stages:
            stage.task(hosts)


class StorageSixEnum(Schedule):  # pylint: disable=too-few-public-methods
    """enumerates v6 networks from storage data"""

    def __init__(self, schedule, next_stage):
        super().__init__(schedule)
        self.next_stage = next_stage

    def _run(self):
        """run"""

        targets = project_sixenum_targets(StorageManager.get_all_six_address())
        current_app.logger.info(f'{self.__class__.__name__} projected {len(targets)} targets')
        self.next_stage.task(targets)


class StorageRescan(Schedule):  # pylint: disable=too-few-public-methods
    """storage rescan"""

    def __init__(self, schedule, host_interval, servicedisco_stage, service_interval, servicescan_stages):  # pylint: disable=too-many-arguments
        super().__init__(schedule)
        self.host_interval = host_interval
        self.servicedisco_stage = servicedisco_stage
        self.service_interval = service_interval
        self.servicescan_stages = servicescan_stages

    def _run(self):
        """run"""

        hosts = StorageManager.get_rescan_hosts(self.host_interval)
        services = StorageManager.get_rescan_services(self.service_interval)
        current_app.logger.info(f'{self.__class__.__name__} rescaning {len(hosts)} hosts {len(services)} services')
        self.servicedisco_stage.task(hosts)
        for stage in self.servicescan_stages:
            stage.task(services)


class SixDisco(QueueHandler):
    """cleanup list host ipv6 hosts (drop any outside scope) and pass it to service discovery"""

    def __init__(self, queue_name, next_stage, filternets=None):
        super().__init__(queue_name)
        self.next_stage = next_stage
        self.filternets = filternets

    def run(self):
        """run"""

        for pidb in self._drain():
            hosts = project_hosts(pidb)
            if self.filternets:
                hosts = filter_external_hosts(hosts, self.filternets)
            current_app.logger.info(f'{self.__class__.__name__} projected {len(hosts)} hosts')
            self.next_stage.task(hosts)


class ServiceDisco(QueueHandler):
    """do service discovery on targets"""

    def __init__(self, queue_name, next_stages):
        super().__init__(queue_name)
        self.next_stages = next_stages

    def run(self):
        """run"""

        for pidb in self._drain():
            tmpdb = filter_tarpits(pidb)
            tmpdb = filter_service_open(tmpdb)
            services = project_services(tmpdb)
            current_app.logger.info(f'{self.__class__.__name__} projected {len(services)} services')
            for stage in self.next_stages:
                stage.task(services)


class StorageLoader(QueueHandler):
    """load queues to storage"""

    def run(self):
        """run"""

        for pidb in self._drain():
            current_app.logger.info(
                f'{self.__class__.__name__} loading {len(pidb.hosts)} '
                f'hosts {len(pidb.services)} services {len(pidb.vulns)} vulns {len(pidb.notes)} notes'
            )
            StorageManager.import_parsed(pidb)


class StorageCleanup(Stage):  # pylint: disable=too-few-public-methods
    """cleanup storage"""

    def run(self):
        """cleanup storage"""

        StorageManager.cleanup_storage()
        current_app.logger.debug(f'{self.__class__.__name__} finished')


class RebuildVersioninfoMap(Schedule):  # pylint: disable=too-few-public-methods
    """recount versioninfo map"""

    def _run(self):
        """run"""

        VersioninfoManager.rebuild()
        current_app.logger.info(f'{self.__class__.__name__} finished')


class NetlistEnumNuclei(NetlistEnum):  # pylint: disable=too-few-public-methods
    """
    naming stub, reuses logic but has separated run file by class name
    """


class StorageLoaderNuclei(QueueHandler):
    """load nuclei queue to storage"""

    def run(self):
        """run"""

        for pidb in self._drain():
            current_app.logger.info(
                f'{self.__class__.__name__} loading {len(pidb.hosts)} '
                f'hosts {len(pidb.services)} services {len(pidb.vulns)} vulns {len(pidb.notes)} notes'
            )

            StorageManager.import_parsed(pidb)

            # To ware-out old findings, nuclei pipeline requires only full targets
            # (ip or hostname) to be specified. that yields full list of reported items.
            #
            # To prune old data, walk all storage vulns for current targets and if it's
            # upsert index is not in current job, delete it. This ensures that only
            # the latest findings are kept.
            # The upsert index for vuln in storage is handled by import_parsed(pidb) as
            # (address, name, xtype, proto, port, via_target)
            #
            # we could also drop any report item by lowest time for any target in pidb
            #
            # we could add flow tags in import_parsed, and prune not-touched item for all targets in pidb
            # than cleanup tags (would produce too many queries)

            upsert_map = set()
            targets = set()
            for vuln in pidb.vulns:
                # upsert index should be also honored by parser
                upsert_map.add((
                    pidb.hosts[vuln.host_iid].address,
                    vuln.name,
                    vuln.xtype,
                    pidb.services[vuln.service_iid].proto if (vuln.service_iid is not None) else None,
                    pidb.services[vuln.service_iid].port if (vuln.service_iid is not None) else None,
                    vuln.via_target,
                ))
                targets.add((pidb.hosts[vuln.host_iid].address, vuln.via_target))

            vulns_to_check = Vuln.query.join(Host).filter(tuple_(Host.address, Vuln.via_target).in_(targets)).all()
            for vuln in vulns_to_check:
                ident = (
                    vuln.host.address,
                    vuln.name,
                    vuln.xtype,
                    vuln.service.proto if vuln.service else None,
                    vuln.service.port if vuln.service else None,
                    vuln.via_target,
                )

                if ident not in upsert_map:
                    db.session.delete(vuln)

            db.session.commit()


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
        self.config = config
        self.stages = {}

        if self.config.get('stage'):
            self._setup_stages()

    def _setup_stages(self):
        """setup planner stages/pipelines"""

        # default pipeline, heavy to be refactored
        sscan_stages = []
        for sscan_qname in self.config['stage']['service_scan']['queues']:
            self.stages[sscan_qname] = StorageLoader(sscan_qname)
            sscan_stages.append(self.stages[sscan_qname])

        self.stages['service_disco'] = ServiceDisco(
            self.config['stage']['service_disco']['queue'],
            sscan_stages
        )

        self.stages['six_dns_disco'] = SixDisco(
            self.config['stage']['six_dns_disco']['queue'],
            self.stages['service_disco'],
            self.config['home_netranges_ipv6']
        )
        self.stages['six_enum_disco'] = SixDisco(
            self.config['stage']['six_enum_disco']['queue'],
            self.stages['service_disco']
        )

        self.stages['netlist_enum'] = NetlistEnum(
            self.config['stage']['netlist_enum']['schedule'],
            self.config['home_netranges_ipv4'],
            [self.stages['service_disco'], self.stages['six_dns_disco']]
        )

        self.stages['storage_six_enum'] = StorageSixEnum(
            self.config['stage']['storage_six_enum']['schedule'],
            self.stages['six_enum_disco']
        )
        self.stages['storage_rescan'] = StorageRescan(
            self.config['stage']['storage_rescan']['schedule'],
            self.config['stage']['storage_rescan']['host_interval'],
            self.stages['service_disco'],
            self.config['stage']['storage_rescan']['service_interval'],
            sscan_stages
        )

        if standalones := get_nested_key(self.config, 'stage', 'load_standalone', 'queues'):
            for qname in standalones:
                queue = Queue.query.filter_by(name=qname).one()
                self.stages[f'load_standalone-{queue.id}'] = StorageLoader(qname)

        self.stages['storage_cleanup'] = StorageCleanup()

        if get_nested_key(self.config, 'stage', 'rebuild_versioninfo_map'):
            self.stages['rebuild_versioninfo_map'] = RebuildVersioninfoMap(self.config['stage']['rebuild_versioninfo_map']['schedule'])

        # nuclei pipeline
        if ('load_nuclei' in self.config['stage']) and ('netlist_enum_nuclei' in self.config['stage']):
            self.stages['load_nuclei'] = StorageLoaderNuclei(self.config['stage']['load_nuclei']['queue'])

            self.stages['netlist_enum_nuclei'] = NetlistEnumNuclei(
                self.config['stage']['netlist_enum_nuclei']['schedule'],
                self.config['home_netranges_ipv4_nuclei'],
                [self.stages['load_nuclei']]
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

    def dump_targets(self):
        """dump all available targets, helper for manual sweeps"""

        blacklist = ExclMatcher(current_app.config['SNER_EXCLUSIONS'])

        addrs = []
        for net in self.config.get('home_netranges_ipv4', []):
            for addr in enumerate_network(net):
                if not blacklist.match(addr):
                    addrs.append(addr)

        return addrs

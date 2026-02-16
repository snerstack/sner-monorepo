# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
planner stages
"""

from abc import ABC, abstractmethod
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from ipaddress import ip_address, ip_network, IPv6Address
from pathlib import Path

from flask import current_app
from littletable import Table
from pytimeparse import parse as timeparse
from sqlalchemy import and_, select
from sqlalchemy.orm.exc import NoResultFound

# from sner.lib import format_host_address
from sner.targets import SixenumTarget, ServiceTarget
from sner.server.extensions import db
from sner.server.scheduler.core import enumerate_network, JobManager, QueueManager
from sner.server.scheduler.models import Queue, Job, Target
from sner.server.storage.core import StorageManager
from sner.server.storage.models import Host, Note
from sner.server.storage.versioninfo import VersioninfoManager


def filter_tarpits(pidb, threshold=200):
    """filter filter hosts with too much services detected"""

    host_services_count = defaultdict(int)
    for service in pidb.services:
        host_services_count[pidb.hosts.by.iid[service.host_iid].address] += 1
    hosts_over_threshold = dict(filter(lambda x: x[1] > threshold, host_services_count.items()))

    if hosts_over_threshold:
        for collection in ["services", "vulns", "notes"]:
            # list() should provide copy for list-in-loop pruning
            for item in list(getattr(pidb, collection)):
                if pidb.hosts.by.iid[item.host_iid].address in hosts_over_threshold:
                    getattr(pidb, collection).remove(item)

        # list() should provide copy for list-in-loop pruning
        for host in list(pidb.hosts):
            if host.address in hosts_over_threshold:
                pidb.hosts.remove(host)

    return pidb


def log_parsed(caller, pidb):
    """log number of items parsed/imported to storage"""
    current_app.logger.info(
        f"{caller} imported pidb hosts:{len(pidb.hosts)} services:{len(pidb.services)} vulns:{len(pidb.vulns)} notes:{len(pidb.notes)}"
    )


class Stage(ABC):
    """planner stage base"""

    @abstractmethod
    def run(self):
        """stage main runnable"""


class Schedule(Stage):
    """schedule base"""

    def __init__(self, schedule, lockname):
        self.schedule = schedule
        self.lastrun_path = Path(f"{current_app.config['SNER_VAR']}/lastrun.{lockname}")

    def run(self):
        """run only on configured schedule"""

        if self.lastrun_path.exists():
            lastrun = datetime.fromisoformat(self.lastrun_path.read_text(encoding="utf8"))
            if (datetime.utcnow().timestamp() - lastrun.timestamp()) < timeparse(self.schedule):
                return

        self._run()
        self.lastrun_path.write_text(datetime.utcnow().isoformat(), encoding="utf8")

    @abstractmethod
    def _run(self):
        """stage runnable implementation"""


class QueueHandler(Stage):
    """queue handler base"""

    def __init__(self, queue_name):
        try:
            self.queue = Queue.query.filter(Queue.name == queue_name).one()
        except NoResultFound:
            raise ValueError(f'missing queue "{queue_name}"') from None

    def _drain(self):
        """drain queue and yield PIDBs"""

        for aajob in Job.query.filter(Job.queue_id == self.queue.id, Job.retval == 0).all():
            current_app.logger.info(f"{self.__class__.__name__} drain {aajob.id} ({aajob.queue.name})")
            try:
                parsed = JobManager.parse(aajob)
            except Exception as exc:  # pylint: disable=broad-except
                current_app.logger.error(
                    f"{self.__class__.__name__} failed to drain {aajob.id} ({aajob.queue.name}), {exc}", exc_info=True
                )
                aajob.retval += 1000
                db.session.commit()
                continue
            yield parsed
            JobManager.archive(aajob)
            JobManager.delete(aajob)

    def task(self, data):
        """enqueue data/targets into all configured queues"""

        already_queued = (
            db.session.connection().execute(select(Target.target).filter(Target.queue == self.queue)).scalars().all()
        )
        enqueue = list(set(data) - set(already_queued))
        QueueManager.enqueue(self.queue, enqueue)
        current_app.logger.info(f'{self.__class__.__name__} enqueued {len(enqueue)} targets to "{self.queue.name}"')


class DummyStage(Stage):
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


class StorageLoader(QueueHandler):
    """load queues to storage"""

    def run(self):
        """run"""
        for pidb in self._drain():
            StorageManager.import_parsed(pidb, source=self.queue.name)
            log_parsed(f"{self.__class__.__name__}:{self.queue.name}", pidb)


class Netlist(Schedule):
    """periodic host discovery via list of ipv4 networks"""

    def __init__(self, schedule, lockname, netlist, next_stages):
        super().__init__(schedule, lockname)
        self.netlist = netlist
        self.next_stages = next_stages

    def _run(self):
        """run"""

        hosts = []
        for net in self.netlist:
            hosts += enumerate_network(net)
        current_app.logger.info(f"{self.__class__.__name__} enumerated {len(hosts)} hosts")
        for stage in self.next_stages:
            stage.task(hosts)


class ServiceDisco(QueueHandler):
    """do service discovery on targets"""

    def run(self):
        """run"""
        for pidb in self._drain():
            tmpdb = filter_tarpits(pidb)
            StorageManager.import_parsed(tmpdb, source=self.queue.name)
            log_parsed(f"{self.__class__.__name__}:{self.queue.name}", pidb)


class SixDisco(QueueHandler):
    """cleanup list host ipv6 hosts (drop any outside scope) and pass it to service discovery"""

    def __init__(self, queue_name, next_stage, filternets=None):
        super().__init__(queue_name)
        self.next_stage = next_stage
        self.filternets = filternets or []
        self._whitelist = [ip_network(net) for net in self.filternets]

    def _filter_external_hosts(self, hosts):
        """filter addrs not belonging to filternets"""

        result = []

        for host in hosts:
            ip_obj = ip_address(host)
            for net in self._whitelist:
                if ip_obj in net:
                    result.append(host)
                    break

        return result

    def run(self):
        """run"""

        for pidb in self._drain():
            hosts = [item.address for item in pidb.hosts]
            if self.filternets:
                hosts = self._filter_external_hosts(hosts)
            current_app.logger.info(f"{self.__class__.__name__} tasking {len(hosts)} hosts to {self.next_stage}")
            self.next_stage.task(hosts)


class StorageSixEnumTargetlist(Schedule):
    """generates target for six_enum_discovery module"""

    def __init__(self, schedule, lockname, next_stage, filternets=None):
        super().__init__(schedule, lockname)
        self.next_stage = next_stage
        self.filternets = filternets

    @staticmethod
    def _project_sixenum_targets(hosts):
        """project targets for six_enum_discover agent from list of ipv6 addresses"""

        targets = set()

        for host in hosts:
            exploded = IPv6Address(host).exploded

            # do not enumerate EUI-64 hosts/nets
            if exploded[27:32] == "ff:fe":
                continue

            # generate mask for scan6 tool
            exploded = exploded.split(":")
            exploded[-1] = "0-ffff"
            target = ":".join(exploded)

            targets.add(str(SixenumTarget(target)))

        return list(targets)

    def _run(self):
        """run"""

        all_v6_addresses = StorageManager.get_all_six_address(self.filternets)
        targets = self._project_sixenum_targets(all_v6_addresses)
        current_app.logger.info(f"{self.__class__.__name__} tasking {len(targets)} targets to {self.next_stage}")
        self.next_stage.task(targets)


class StorageServiceScanTargetlist(Schedule):
    """list targets for service scan"""

    def __init__(self, schedule, lockname, service_interval, filternets, servicescan_stages):
        super().__init__(schedule, lockname)
        self.service_interval = service_interval
        self.filternets = filternets
        self.servicescan_stages = servicescan_stages

    def _run(self):
        """run"""

        now = datetime.now(timezone.utc)
        rescan_horizont = now - timedelta(seconds=timeparse(self.service_interval))

        targets, ids = [], []
        for service in StorageManager.get_services(self.filternets, rescan_horizont):
            targets.append(str(ServiceTarget(service.host.address, service.proto, service.port)))
            ids.append(service.id)

        for item in self.servicescan_stages:
            item.task(targets)

        StorageManager.update_services_rescantime(ids, now)


class StorageServiceTargetlist(Schedule):
    """list all services as ServiceTarget in filternets"""

    def __init__(self, schedule, lockname, filternets, next_stage):
        super().__init__(schedule, lockname)
        self.filternets = filternets
        self.next_stage = next_stage

    def _run(self):
        """run"""

        targets = []
        for service in StorageManager.get_services(self.filternets, None):
            targets.append(str(ServiceTarget(service.host.address, service.proto, service.port)))

        self.next_stage.task(targets)


class PruningStorageLoader(QueueHandler):
    """import pidb and prune items on targets scope and source key"""

    def run(self):
        for pidb in self._drain():
            StorageManager.import_parsed(pidb, source=self.queue.name)
            log_parsed(f"{self.__class__.__name__}:{self.queue.name}", pidb)

            count_notes = StorageManager.prune_scoped_notes(pidb, source=self.queue.name)
            count_vulns = StorageManager.prune_scoped_vulns(pidb, source=self.queue.name)
            current_app.logger.info(
                f"{self.__class__.__name__}:{self.queue.name} prunned old items, vulns:{count_vulns} notes:{count_notes}"
            )


class StorageHostRescan(Schedule):
    """storage host rescan"""

    def __init__(
        self,
        schedule,
        lockname,
        filternets,
        host_interval,
        servicedisco_stage,
    ):
        super().__init__(schedule, lockname)
        self.filternets = filternets
        self.host_interval = host_interval
        self.servicedisco_stage = servicedisco_stage

    def _run(self):
        """run"""

        now = datetime.utcnow()
        rescan_horizont = now - timedelta(seconds=timeparse(self.host_interval))

        targets, ids = [], []
        for host in StorageManager.get_hosts(self.filternets, rescan_horizont):
            targets.append(host.address)
            ids.append(host.id)

        current_app.logger.info(f"{self.__class__.__name__} rescaning {len(targets)} hosts")
        self.servicedisco_stage.task(targets)

        StorageManager.update_hosts_rescantime(ids, now)


class StorageSixTargetlist(Schedule):
    """generates filtered ipv6 host addresses for scans"""

    def __init__(self, schedule, lockname, filternets, next_stage):
        super().__init__(schedule, lockname)
        self.filternets = filternets
        self.next_stage = next_stage

    def _run(self):
        """run"""

        targets = [f"[{item}]" for item in StorageManager.get_all_six_address(self.filternets)]
        current_app.logger.info(f"{self.__class__.__name__} enumerated {len(targets)} targets")
        self.next_stage.task(targets)


class SportmapStorageLoader(QueueHandler):
    """load sportmap queue to storage"""

    def run(self):
        """run"""

        for pidb in self._drain():
            current_app.logger.info(
                f"{self.__class__.__name__} loading {len(pidb.hosts)} "
                f"hosts {len(pidb.services)} services {len(pidb.vulns)} vulns {len(pidb.notes)} notes"
            )

            # do not import empty hosts
            all_addrs = set(pidb.hosts.all.address)
            detected_addrs = set(pidb.notes.where(xtype="sportmap").join(pidb.hosts, host_iid="iid").all.address)
            prune_addrs = all_addrs - detected_addrs
            pidb.hosts.remove_many(pidb.hosts.where(address=Table.is_in(prune_addrs)))
            StorageManager.import_parsed(pidb)

            # prune old notes
            affected_rows = Note.query.filter(
                Note.xtype == "sportmap",
                Note.host_id.in_(db.session.query(Host.id).filter(Host.address.in_(prune_addrs))),
            ).delete(synchronize_session=False)
            current_app.logger.info(f"{self.__class__.__name__} prunned {affected_rows} old notes")
            db.session.commit()
            db.session.expire_all()


class AurorHostnamesTrigger(Schedule):
    """emit target to next task"""

    def __init__(self, schedule, lockname, next_stage):
        super().__init__(schedule, lockname)
        self.next_stage = next_stage

    def _run(self):
        """run"""

        current_app.logger.info(f"{self.__class__.__name__} triggered")
        self.next_stage.task(["tick"])


class AurorHostnamesStorageLoader(QueueHandler):
    """load auror.hostnames queue to storage"""

    @dataclass
    class NoteMapItem:
        """helper class"""

        host_id: int
        note_id: int

    def run(self):
        """run"""

        for pidb in self._drain():
            current_app.logger.info(
                f"{self.__class__.__name__} loading {len(pidb.hosts)} "
                f"hosts {len(pidb.services)} services {len(pidb.vulns)} vulns {len(pidb.notes)} notes"
            )

            # Fetch existing host-note mappings
            existing_notes = db.session.execute(
                select(Host.address, Host.id, Note.id).outerjoin(
                    Note, and_(Note.host_id == Host.id, Note.xtype == "auror.hostnames")
                )
            ).all()

            notes_map = {address: self.NoteMapItem(host_id, note_id) for address, host_id, note_id in existing_notes}

            # Prepare and do batch updates and inserts
            updated_host_ids = set()
            note_updates = []
            note_inserts = []

            for note in pidb.notes:
                if host_item := notes_map.get(pidb.hosts[note.host_iid].address):
                    updated_host_ids.add(host_item.host_id)

                    if host_item.note_id:
                        note_updates.append(
                            {"id": host_item.note_id, "data": note.data, "import_time": datetime.utcnow()}
                        )
                    else:
                        note_inserts.append(
                            {
                                "host_id": host_item.host_id,
                                "xtype": "auror.hostnames",
                                "data": note.data,
                                "import_time": datetime.utcnow(),
                            }
                        )

            if note_updates:
                db.session.bulk_update_mappings(Note, note_updates)
            if note_inserts:
                db.session.bulk_insert_mappings(Note, note_inserts)

            # Prune old notes
            affected_rows = (
                db.session.query(Note)
                .filter(Note.xtype == "auror.hostnames", Note.host_id.notin_(updated_host_ids))
                .delete(synchronize_session=False)
            )

            db.session.commit()
            db.session.expire_all()
            current_app.logger.info(
                f"{self.__class__.__name__} updated {len(updated_host_ids)} hosts, pruned {affected_rows} notes"
            )


class RebuildVersioninfoMap(Schedule):
    """recount versioninfo map"""

    def _run(self):
        """run"""

        VersioninfoManager.rebuild()
        current_app.logger.info(f"{self.__class__.__name__} finished")


class StorageCleanup(Stage):
    """cleanup storage"""

    def run(self):
        """cleanup storage"""

        StorageManager.cleanup_storage()
        current_app.logger.debug(f"{self.__class__.__name__} finished")

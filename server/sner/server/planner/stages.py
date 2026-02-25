# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
planner stages
"""

from abc import ABC, abstractmethod
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from ipaddress import ip_address, ip_network, IPv6Address
from pathlib import Path

from flask import current_app
from littletable import Table
from pytimeparse import parse as timeparse
from sqlalchemy import select
from sqlalchemy.orm.exc import NoResultFound

from sner.targets import SixenumTarget, ServiceTarget
from sner.server.extensions import db
from sner.server.scheduler.core import enumerate_network, JobManager, QueueManager
from sner.server.scheduler.models import Queue, Job, Target
from sner.server.storage.core import StorageManager
from sner.server.storage.models import Host, Note
from sner.server.storage.versioninfo import VersioninfoManager
from sner.targets import TargetManager, HostTarget


def pidb_logmesg(pidb):
    """return pidb stats for logging"""
    return f"hosts:{len(pidb.hosts)} services:{len(pidb.services)} vulns:{len(pidb.vulns)} notes:{len(pidb.notes)}"


class Stage(ABC):
    """planner stage base"""

    def __init__(self, name):
        self.name = name

    @abstractmethod
    def run(self):
        """stage main runnable"""


class Schedule(Stage):
    """schedule base"""

    def __init__(self, name, schedule):
        super().__init__(name)
        self.schedule = schedule
        self.lastrun_path = Path(f"{current_app.config['SNER_VAR']}/lastrun.{name}")

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

    def __init__(self, name, queue_name):
        super().__init__(name)
        try:
            self.queue = Queue.query.filter(Queue.name == queue_name).one()
        except NoResultFound:
            raise ValueError(f'queue "{queue_name}" does not exist') from None

    def _drain(self):
        """drain queue and yield PIDBs"""

        for aajob in Job.query.filter(Job.queue_id == self.queue.id, Job.retval == 0).all():
            current_app.logger.info(f"{self.name} drain {aajob.id} ({aajob.queue.name})")
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

    def task(self, targets):
        """enqueue targetsV2 into queue"""

        query = db.session.connection().execute(select(Target.target).filter(Target.queue == self.queue)).scalars()
        already_queued = TargetManager.from_list(query.all())

        enqueue = list(set(targets) - set(already_queued))
        QueueManager.enqueue(self.queue, enqueue)
        current_app.logger.info(f'{self.name} enqueued {len(enqueue)} targets to "{self.queue.name}"')


class DummyStage(Stage):
    """dummy testing stage"""

    def __init__(self, name="dummy"):
        super().__init__(name)
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
            current_app.logger.info(f"{self.name}:{self.queue.name} imported {pidb_logmesg(pidb)}")


class Netlist(Schedule):
    """periodic host discovery via list of ipv4 networks"""

    def __init__(self, name, schedule, netlist, next_stages):
        super().__init__(name, schedule)
        self.netlist = netlist
        self.next_stages = next_stages

    def _run(self):
        """run"""

        hosts = []
        for net in self.netlist:
            hosts += TargetManager.from_list(enumerate_network(net))
        current_app.logger.info(f"{self.name} enumerated {len(hosts)} hosts")
        for stage in self.next_stages:
            stage.task(hosts)


class ServiceDiscoStorageLoader(QueueHandler):
    """do service discovery on targets"""

    @staticmethod
    def _filter_tarpits(pidb, threshold=200):
        """filter filter hosts with too much services detected"""

        host_services_count = defaultdict(int)
        for service in pidb.services:
            host_services_count[service.host_iid] += 1
        hosts_over_threshold = {hostiid: val for hostiid, val in host_services_count.items() if val > threshold}

        if hosts_over_threshold:
            services_to_delete = [svc for svc in pidb.services if svc.host_iid in hosts_over_threshold]
            vulns_to_delete = [vuln for vuln in pidb.vulns if vuln.host_iid in hosts_over_threshold]
            notes_to_delete = [note for note in pidb.notes if note.host_iid in hosts_over_threshold]
            for item in notes_to_delete:
                pidb.notes.remove(item)
            for item in vulns_to_delete:
                pidb.vulns.remove(item)
            for item in services_to_delete:
                pidb.services.remove(item)

            hosts_to_delete = [host for host in pidb.hosts if host.iid in hosts_over_threshold]
            for item in hosts_to_delete:
                pidb.hosts.remove(item)

        return pidb

    @staticmethod
    def _filter_closed_services(pidb):
        """filter closed services, they would be cleaned up anyway"""

        # remove services and coresponding vulns/notes (there should be none)
        services_to_delete = [svc for svc in pidb.services if svc.state.startswith("closed:")]
        services_to_delete_ids = [svc.iid for svc in services_to_delete]
        vulns_to_delete = [vuln for vuln in pidb.vulns if vuln.service_iid in services_to_delete_ids]
        notes_to_delete = [note for note in pidb.notes if note.service_iid in services_to_delete_ids]

        for item in notes_to_delete:
            pidb.notes.remove(item)
        for item in vulns_to_delete:
            pidb.vulns.remove(item)
        for item in services_to_delete:
            pidb.services.remove(item)

        # remove hosts without any related items
        host_item_count = {
            host.iid: (
                len(pidb.services.where(host_iid=host.iid))
                + len(pidb.vulns.where(host_iid=host.iid))
                + len(pidb.notes.where(host_iid=host.iid))
            )
            for host in pidb.hosts
        }
        hosts_to_delete_ids = [hostid for hostid, count in host_item_count.items() if count == 0]
        hosts_to_delete = [host for host in pidb.hosts if host.iid in hosts_to_delete_ids]
        for item in hosts_to_delete:
            pidb.hosts.remove(item)

        return pidb

    def run(self):
        """run"""
        for pidb in self._drain():
            tmpdb = self._filter_tarpits(pidb)
            tmpdb = self._filter_closed_services(pidb)
            StorageManager.import_parsed(tmpdb, source=self.queue.name)
            current_app.logger.info(f"{self.name}:{self.queue.name} imported {pidb_logmesg(pidb)}")


class SixDisco(QueueHandler):
    """cleanup list host ipv6 hosts (drop any outside scope) and pass it to service discovery"""

    def __init__(self, name, queue_name, next_stage, filternets=None):
        super().__init__(name,  queue_name)
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
            current_app.logger.info(f"{self.name} tasking {len(hosts)} hosts to {self.next_stage.name}")
            self.next_stage.task(hosts)


class SixEnumStorageTargetlist(Schedule):
    """generates target for six_enum_discovery module"""

    def __init__(self, name, schedule, next_stage, filternets=None):
        super().__init__(name, schedule)
        self.next_stage = next_stage
        self.filternets = filternets

    @staticmethod
    def _project_sixenum_targets(addresses):
        """project targets for six_enum_discover agent from list of ipv6 addresses"""

        targets = set()

        for addr in addresses:
            exploded = IPv6Address(addr).exploded

            # do not enumerate EUI-64 hosts/nets
            if exploded[27:32] == "ff:fe":
                continue

            # generate mask for scan6 tool
            exploded = exploded.split(":")
            exploded[-1] = "0-ffff"
            target = ":".join(exploded)

            targets.add(SixenumTarget(target))

        return targets

    def _run(self):
        """run"""

        all_v6_addresses = StorageManager.get_six_addresses(self.filternets)
        targets = self._project_sixenum_targets(all_v6_addresses)
        current_app.logger.info(f"{self.name} tasking {len(targets)} targets to {self.next_stage.name}")
        self.next_stage.task(targets)


class ServiceScanStorageTargetlist(Schedule):
    """list and task service-targets for basic service scans accounting rescan_time"""

    def __init__(self, name, schedule, service_interval, filternets, servicescan_stages):
        super().__init__(name, schedule)
        self.service_interval = service_interval
        self.filternets = filternets
        self.servicescan_stages = servicescan_stages

    def _run(self):
        """run"""

        now = datetime.now(timezone.utc)
        rescan_horizont = now - timedelta(seconds=timeparse(self.service_interval))

        targets, ids = [], []
        for service in StorageManager.get_services(self.filternets, rescan_horizont):
            targets.append(ServiceTarget(service.host.address, service.proto, service.port))
            ids.append(service.id)

        for item in self.servicescan_stages:
            item.task(targets)

        StorageManager.update_services_rescantime(ids, now)


class ServiceStorageTargetlist(Schedule):
    """list storage services for advanced(vulnerability) scanning"""

    def __init__(self, name, schedule, filternets, next_stage):
        super().__init__(name, schedule)
        self.filternets = filternets
        self.next_stage = next_stage

    def _run(self):
        """run"""

        targets = []
        for service in StorageManager.get_services(self.filternets, None):
            targets.append(ServiceTarget(service.host.address, service.proto, service.port))

        self.next_stage.task(targets)


class PruningStorageLoader(QueueHandler):
    """import pidb and prune items on targets scope and source key"""

    def run(self):
        for pidb in self._drain():
            StorageManager.import_parsed(pidb, source=self.queue.name)
            current_app.logger.info(f"{self.name}:{self.queue.name} imported {pidb_logmesg(pidb)}")

            count_notes = StorageManager.prune_scoped_notes(pidb, source=self.queue.name)
            count_vulns = StorageManager.prune_scoped_vulns(pidb, source=self.queue.name)
            current_app.logger.info(
                f"{self.name} prunned old items, vulns:{count_vulns} notes:{count_notes}"
            )


class HostRescanStorageTargetlist(Schedule):
    """storage host rescan"""

    def __init__(
        self,
        name,
        schedule,
        filternets,
        host_interval,
        servicedisco_stage,
    ):
        super().__init__(name, schedule)
        self.filternets = filternets
        self.host_interval = host_interval
        self.servicedisco_stage = servicedisco_stage

    def _run(self):
        """run"""

        now = datetime.utcnow()
        rescan_horizont = now - timedelta(seconds=timeparse(self.host_interval))

        targets, ids = [], []
        for host in StorageManager.get_hosts(self.filternets, rescan_horizont):
            targets.append(HostTarget(host.address))
            ids.append(host.id)

        current_app.logger.info(f"{self.name} rescaning {len(targets)} hosts")
        self.servicedisco_stage.task(targets)

        StorageManager.update_hosts_rescantime(ids, now)


class SixStorageTargetlist(Schedule):
    """generates filtered ipv6 host addresses for scans"""

    def __init__(self, name, schedule, filternets, next_stage):
        super().__init__(name, schedule)
        self.filternets = filternets
        self.next_stage = next_stage

    def _run(self):
        """run"""

        targets = [HostTarget(item) for item in StorageManager.get_six_addresses(self.filternets)]
        current_app.logger.info(f"{self.name} enumerated {len(targets)} targets")
        self.next_stage.task(targets)


class SportmapStorageLoader(QueueHandler):
    """load sportmap queue to storage"""

    def run(self):
        """run"""

        for pidb in self._drain():
            current_app.logger.info(f"{self.name}:{self.queue.name} processing {pidb_logmesg(pidb)}")

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
            current_app.logger.info(f"{self.name} prunned {affected_rows} old notes")
            db.session.commit()
            db.session.expire_all()


class VersioninfoRebuild(Schedule):
    """recount versioninfo map"""

    def _run(self):
        """run"""

        VersioninfoManager.rebuild()
        current_app.logger.info(f"{self.name} finished")


class StorageCleanup(Stage):
    """cleanup storage"""

    def __init__(self, name="StorageCleanup"):
        super().__init__(name)

    def run(self):
        """cleanup storage"""

        StorageManager.cleanup_storage()
        current_app.logger.debug(f"{self.name} finished")

# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
planner auror stages

Auror scanner do complex TLS/SSL scanning. It's SNER integration spans several features:

## service scan

auror uses basic_scan for service discovery

## auror_hostnames

agent, parser and planner plugin which fetches hostname informations from external
sources and manages note(xtype=auror.hostnames) in storage.

## auror_testssl

scans all known services for TLS parameters for all known hostnames on respective host.
"""

from collections import namedtuple
from datetime import datetime

from flask import current_app
from sqlalchemy import and_, select

from sner.server.extensions import db
from sner.server.planner.stages import QueueHandler, Schedule
from sner.server.storage.core import StorageManager
from sner.server.storage.models import Host, Note
from sner.targets import AurorTestsslTarget, GenericTarget


class AurorHostnamesTrigger(Schedule):
    """emit target to next task"""

    def __init__(self, name, schedule, next_stage):
        super().__init__(name, schedule)
        self.next_stage = next_stage

    def _run(self):
        """run"""
        current_app.logger.info(f"{self.name} triggered")
        self.next_stage.task([GenericTarget("tick")])


class AurorHostnamesStorageLoader(QueueHandler):
    """
    load auror.hostnames queue to storage

    auror_hostnames extracts hostnames by parsing DNS server configuration
    files. The provided configs may contain resource records for addresses
    outside the sner/auror scope. This handler upserts data only for
    addresses that already exist in storage (e.g., discovered by a basic
    scan and confirmed alive). We import data for all alive hosts, not only
    those in the auror_testssl scope, so it can be used by other
    plugins/pipelines as well.

    Plugin runs daily and returns complete set of data. We update existing
    notes (to keep note.id) and insert new ones. Notes on hosts which has
    not been updated are removed from storage (eg. DNS records been removed for
    such addresses).
    """
    def run(self):
        """run"""

        NoteMapItem = namedtuple("NoteMapItem", ["host_id", "note_id"])

        for pidb in self._drain():
            # map all existing host with corresponding notes
            query = db.session.execute(
                select(Host.address, Host.id, Note.id)
                .select_from(Host)
                .outerjoin(Note, and_(Note.host_id == Host.id, Note.xtype == "auror.hostnames"))
            )
            hosts_map = {address: NoteMapItem(host_id, note_id) for address, host_id, note_id in query}

            updated_host_ids = set()
            updates = []
            inserts = []
            now = datetime.utcnow()

            for note in pidb.notes:
                # for each note, check if host is known by address
                host_item = hosts_map.get(pidb.hosts.by.iid[note.host_iid].address)
                if not host_item:
                    # skip hosts which are not already in storage
                    continue

                # track which hosts had been updated
                updated_host_ids.add(host_item.host_id)

                # prepare upserts
                if host_item.note_id:
                    updates.append(
                        {"id": host_item.note_id, "data": note.data, "import_time": now}
                    )
                else:
                    inserts.append(
                        {
                            "host_id": host_item.host_id,
                            "xtype": "auror.hostnames",
                            "data": note.data,
                            "import_time": now
                        }
                    )

            # perform upserts
            if updates:
                db.session.bulk_update_mappings(Note, updates)
            if inserts:
                db.session.bulk_insert_mappings(Note, inserts)

            # delete all notes from hosts that has not been updated
            affected_rows = 0
            if updated_host_ids:
                affected_rows = (
                    db.session.query(Note)
                    .filter(Note.xtype == "auror.hostnames", Note.host_id.notin_(updated_host_ids))
                    .delete(synchronize_session=False)
                )

            db.session.commit()
            db.session.expire_all()
            current_app.logger.info(
                f"{self.name} updated {len(updated_host_ids)} hosts, pruned {affected_rows} notes"
            )


class AurorTestsslStorageTargetlist(Schedule):
    """enumerates auror_testssl targets from storage data"""

    def __init__(self, name, schedule, filternets, ports_starttls, next_stage):
        super().__init__(name, schedule)
        self.filternets = filternets
        self.ports_starttls = ports_starttls
        self.next_stage = next_stage

    def _run(self):
        """run"""

        targets = []

        services = StorageManager.get_tls_services(self.filternets).all()
        hostnames_map = StorageManager.get_hostnames_map([item.host_id for item in services])

        for service in services:
            host_item = hostnames_map[service.host_id]
            hostnames = host_item.hostnames or [host_item.address]
            for hostname in hostnames:
                targets.append(AurorTestsslTarget(host_item.address, service.port, hostname, "I"))
                if service.name in self.ports_starttls.values():
                    targets.append(AurorTestsslTarget(host_item.address, service.port, hostname, "E"))

        current_app.logger.info(f"{self.name} projected {len(targets)} targets")
        self.next_stage.task(targets)


class AurorTestsslStorageCleanup(Schedule):
    """
    storage cleanup from auror vulns/notes for no-longer assigned hostnames.

    The auror_hostnames upserts hostnames for given host. The auror_testssl (re)scans
    all services and weares-out old findings on scanned scopes service-hostname
    (service * all hostnames on given host/address.)

    This stage cleans out data for via_target/hostnames which are no-longer present
    on given host.
    """

    def _run(self):
        """run"""

        notes_map = StorageManager.get_aurortestssl_notesmap()
        hostnames_map = StorageManager.get_hostnames_map([key.host_id for key in notes_map])

        notes_to_delete = []
        for key, notes_ids in notes_map.items():
            if (
                key.host_id not in hostnames_map
                or key.via_target not in hostnames_map[key.host_id].hostnames
            ):
                notes_to_delete += notes_ids

        affected_rows = 0
        if notes_to_delete:
            affected_rows = (
                db.session.query(Note)
                .filter(Note.id.in_(notes_to_delete))
                .delete(synchronize_session=False)
            )
            db.session.commit()
            db.session.expire_all()

        current_app.logger.info(
            f"{self.name} pruned {affected_rows} notes"
        )

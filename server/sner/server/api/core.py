# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
api functions
"""

from datetime import datetime, timedelta

from flask import current_app
from pytimeparse import parse as timeparse
from sqlalchemy import func

from sner.server.extensions import db

from sner.server.scheduler.models import Heatmap, Job, Queue, Readynet, Target
from sner.server.storage.models import Host, Note, Service, Versioninfo, Vuln


def get_metrics():
    """grab internal metrics"""

    metrics = {}

    metrics['sner_storage_hosts_total'] = Host.query.count()
    metrics['sner_storage_services_total'] = Service.query.count()
    metrics['sner_storage_vulns_total'] = Vuln.query.count()
    metrics['sner_storage_notes_total'] = Note.query.count()
    metrics['sner_storage_versioninfo_total'] = Versioninfo.query.count()

    targets = dict(db.session.query(Target.queue_id, func.count(Target.id)).group_by(Target.queue_id).all())
    for queue in Queue.query.all():
        metrics[f'sner_scheduler_queue_targets_total{{name="{queue.name}"}}'] = targets.get(queue.id, 0)
    metrics['sner_scheduler_targets_total'] = Target.query.count()

    stale_horizont = datetime.utcnow() - timedelta(seconds=timeparse(current_app.config['SNER_METRICS_STALE_HORIZONT']))
    metrics['sner_scheduler_jobs_total{state="running"}'] = Job.query.filter(Job.retval == None, Job.time_start > stale_horizont).count()  # noqa: E501,E711  pylint: disable=singleton-comparison
    metrics['sner_scheduler_jobs_total{state="stale"}'] = Job.query.filter(Job.retval == None, Job.time_start < stale_horizont).count()  # noqa: E501,E711  pylint: disable=singleton-comparison
    metrics['sner_scheduler_jobs_total{state="finished"}'] = Job.query.filter(Job.retval == 0).count()
    metrics['sner_scheduler_jobs_total{state="failed"}'] = Job.query.filter(Job.retval != 0).count()

    metrics['sner_scheduler_heatmap_hashvals_total'] = Heatmap.query.filter(Heatmap.count != 0).count()
    metrics['sner_scheduler_heatmap_targets_total'] = db.session.query(func.coalesce(func.sum(Heatmap.count), 0)).scalar()

    metrics['sner_scheduler_readynets_available_total'] = db.session.query(func.distinct(Readynet.hashval)).count()

    output = '\n'.join(f'{key} {val}' for key, val in metrics.items())
    return output

# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
scheduler commands
"""

import sys
from ipaddress import ip_address, summarize_address_range

import click
from flask import current_app
from flask.cli import with_appcontext

from sner.server.scheduler.core import enumerate_network, QueueManager, SchedulerService
from sner.server.scheduler.models import Queue


@click.group(name='scheduler', help='sner.server scheduler management')
def command():
    """scheduler commands container"""


@command.command(name='enumips', help='enumerate ip address range; uses stdin by default')
@click.argument('targets', nargs=-1)
@click.option('--file', type=click.File('r'))
def enumips_command(targets, **kwargs):
    """enumerate ip address range"""

    targets = list(targets)
    if kwargs['file']:
        targets += kwargs['file'].read().splitlines()
    if not targets:
        targets.extend(sys.stdin.readlines())
    for target in targets:
        print('\n'.join(enumerate_network(target)))


@command.command(name='rangetocidr', help='convert range specified addr space to series of cidr')
@click.argument('start')
@click.argument('end')
def rangetocidr_command(start, end):
    """summarize net rage into cidrs"""

    for tmp in summarize_address_range(ip_address(start), ip_address(end)):
        print(tmp)


@command.command(name='queue-enqueue', help='add targets to queue; uses stdin by default')
@click.argument('queue_name')
@click.argument('targets', nargs=-1)
@click.option('--file', type=click.File('r'))
@with_appcontext
def queue_enqueue_command(queue_name, targets, **kwargs):
    """enqueue targets to queue"""

    queue = Queue.query.filter(Queue.name == queue_name).one_or_none()
    if not queue:
        current_app.logger.error('no such queue')
        sys.exit(1)

    targets = list(targets)
    if kwargs['file']:
        targets.extend(kwargs['file'].read().splitlines())
    if not targets:
        targets.extend(sys.stdin.readlines())
    QueueManager.enqueue(queue, targets)
    sys.exit(0)


@command.command(name='queue-flush', help='flush all targets from queue')
@click.argument('queue_name')
@with_appcontext
def queue_flush_command(queue_name):
    """flush targets from queue"""

    queue = Queue.query.filter(Queue.name == queue_name).one_or_none()
    if not queue:
        current_app.logger.error('no such queue')
        sys.exit(1)

    QueueManager.flush(queue)
    sys.exit(0)


@command.command(name='queue-prune', help='delete all associated jobs')
@click.argument('queue_name')
@with_appcontext
def queue_prune_command(queue_name):
    """delete all jobs associated with queue"""

    queue = Queue.query.filter(Queue.name == queue_name).one_or_none()
    if not queue:
        current_app.logger.error('no such queue')
        sys.exit(1)

    QueueManager.prune(queue)
    sys.exit(0)


@command.command(name='readynet-recount', help='refresh readynets for current heatmap_hot_level')
@with_appcontext
def readynet_recount_command():
    """refresh readynets for current heatmap_hot_level"""

    SchedulerService.readynet_recount()
    sys.exit(0)


@command.command(name='heatmap-check', help='check heatmap if corresponds with running jobs')
@with_appcontext
def heatmap_check_command():
    """check heatmap if corresponds with running jobs"""

    if not SchedulerService.heatmap_check():
        current_app.logger.error('heatmap not correct')
        sys.exit(1)
    sys.exit(0)


@command.command(name='repeat-failed-jobs', help='repeat and prune failed jobs (deployment helper)')
@with_appcontext
def repeat_failed_jobs_command():
    """repeat and prune failed jobs"""

    SchedulerService.repeat_failed_jobs()
    sys.exit(0)


@command.command(name='recover-heatmap', help='recover inconsistent heatmap state (deployment helper)')
@with_appcontext
def recover_heatmap_command():
    """recover heatmap"""

    SchedulerService.recover_heatmap()
    sys.exit(0)

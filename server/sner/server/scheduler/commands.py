# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
scheduler commands
"""

import logging
import sys
from ipaddress import ip_address, summarize_address_range

import click
from flask.cli import with_appcontext

from sner.server.scheduler.core import enumerate_network, QueueManager, SchedulerService
from sner.server.scheduler.models import Queue
from sner.targets import TargetManager


logger = logging.getLogger("sner_command")


def _queue_by_name(name):
    """return queue by name"""
    queue = Queue.query.filter(Queue.name == name).one_or_none()
    if not queue:
        logger.error("no such queue")
    return queue


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

    if not (queue := _queue_by_name(queue_name)):
        sys.exit(1)

    targets = list(targets)
    if kwargs['file']:
        targets.extend(kwargs['file'].read().splitlines())
    if not targets:
        targets.extend(sys.stdin.readlines())
    targets = list(filter(None, map(str.strip, targets)))

    QueueManager.enqueue(queue, TargetManager.from_list(targets))


@command.command(name='queue-flush', help='flush all targets from queue')
@click.argument('queue_name')
@with_appcontext
def queue_flush_command(queue_name):
    """flush targets from queue"""

    if not (queue := _queue_by_name(queue_name)):
        sys.exit(1)
    QueueManager.flush(queue)


@command.command(name='queue-prune', help='delete all associated jobs')
@click.argument('queue_name')
@with_appcontext
def queue_prune_command(queue_name):
    """delete all jobs associated with queue"""

    if not (queue := _queue_by_name(queue_name)):
        sys.exit(1)
    QueueManager.prune(queue)


@command.command(name='readynet-recount', help='refresh readynets for current heatmap_hot_level')
@with_appcontext
def readynet_recount_command():
    """refresh readynets for current heatmap_hot_level"""

    SchedulerService.readynet_recount()


@command.command(name='heatmap-check', help='check heatmap if corresponds with running jobs')
@with_appcontext
def heatmap_check_command():
    """check heatmap if corresponds with running jobs"""

    if not SchedulerService.heatmap_check():
        logger.error("heatmap not correct")
        sys.exit(1)


@command.command(name='repeat-failed-jobs', help='repeat and prune failed jobs (deployment helper)')
@with_appcontext
def repeat_failed_jobs_command():
    """repeat and prune failed jobs"""

    SchedulerService.repeat_failed_jobs()


@command.command(name='recover-heatmap', help='recover inconsistent heatmap state (deployment helper)')
@with_appcontext
def recover_heatmap_command():
    """recover heatmap"""

    SchedulerService.recover_heatmap()

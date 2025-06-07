# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
scheduler.commands tests
"""

from pathlib import Path

from sner.server.extensions import db
from sner.server.scheduler.commands import command
from sner.server.scheduler.core import SchedulerService
from sner.server.scheduler.models import Job, Queue


def test_enumips_command(runner, tmpworkdir):  # pylint: disable=unused-argument
    """basic enumerator test"""

    result = runner.invoke(command, ['enumips', '127.0.0.128/30'])
    assert result.exit_code == 0
    assert len(result.output.splitlines()) == 4

    apath = Path('enumips.txt')
    apath.write_text('127.0.1.123/32', encoding='utf-8')
    result = runner.invoke(command, ['enumips', '--file', apath])
    assert result.exit_code == 0
    assert len(result.output.splitlines()) == 1

    result = runner.invoke(command, ['enumips'], input='127.0.0.3')
    assert result.exit_code == 0
    assert len(result.output.splitlines()) == 1


def test_rangetocidr_command(runner):
    """range to cidr enumerator test"""

    result = runner.invoke(command, ['rangetocidr', '127.0.0.0', '128.0.0.3'])
    assert result.exit_code == 0

    assert '127.0.0.0/8' in result.output
    assert '128.0.0.0/30' in result.output


def test_queue_enqueue_command(runner, tmpworkdir, queue, target_factory):  # pylint: disable=unused-argument
    """queue enqueue command test"""

    atarget = target_factory.build(queue=None)
    apath = Path('ips.txt')
    apath.write_text(f'{atarget.target}\n \n ', encoding='utf-8')

    result = runner.invoke(command, ['queue-enqueue', 'notexist', atarget.target])
    assert result.exit_code == 1

    result = runner.invoke(command, ['queue-enqueue', queue.name, atarget.target])
    assert result.exit_code == 0
    assert db.session.get(Queue, queue.id).targets[0].target == atarget.target

    result = runner.invoke(command, ['queue-enqueue', queue.name, '--file', apath])
    assert result.exit_code == 0
    assert len(db.session.get(Queue, queue.id).targets) == 2

    result = runner.invoke(command, ['queue-enqueue', queue.name], input='dummy\n')
    assert result.exit_code == 0
    assert len(db.session.get(Queue, queue.id).targets) == 3


def test_queue_flush_command(runner, target):
    """queue flush command test"""

    tqueue = db.session.get(Queue, target.queue_id)

    result = runner.invoke(command, ['queue-flush', 'notexist'])
    assert result.exit_code == 1

    result = runner.invoke(command, ['queue-flush', tqueue.name])
    assert result.exit_code == 0

    assert not db.session.get(Queue, tqueue.id).targets


def test_queue_prune_command(runner, job_completed):
    """queue prune command test"""

    result = runner.invoke(command, ['queue-prune', 'notexist'])
    assert result.exit_code == 1

    result = runner.invoke(command, ['queue-prune', job_completed.queue.name])
    assert result.exit_code == 0

    assert not Job.query.filter(Job.queue_id == job_completed.queue_id).all()
    assert not Path(job_completed.output_abspath).exists()


def test_readynet_recount_command(runner):
    """test readynet_recount command"""

    result = runner.invoke(command, ['readynet-recount'])
    assert result.exit_code == 0


def test_heatmap_check_command(runner, target):  # pylint: disable=unused-argument
    """test heatmap-check command"""

    result = runner.invoke(command, ['heatmap-check'])
    assert result.exit_code == 0

    assignment = SchedulerService.job_assign(None, [])
    Job.query.filter(Job.id == assignment['id']).delete()
    db.session.commit()
    result = runner.invoke(command, ['heatmap-check'])
    assert result.exit_code == 1


def test_repeat_failed_jobs_command(runner):
    """test repeat-failed-jobs command"""

    result = runner.invoke(command, ['repeat-failed-jobs'])
    assert result.exit_code == 0


def test_recover_heatmap_command(runner):
    """test recover-heatmap command"""

    result = runner.invoke(command, ['recover-heatmap'])
    assert result.exit_code == 0

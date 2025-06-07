# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
scheduler core tests
"""

from ipaddress import ip_address, ip_network
from pathlib import Path

import pytest
import yaml
from flask import current_app

from sner.server.dbx_command import QueuePrio
from sner.server.extensions import db
from sner.server.scheduler.core import enumerate_network, ExclMatcher, QueueManager, SchedulerService, sixenum_target_boundaries
from sner.server.scheduler.models import Heatmap, Job, Readynet


def test_enumerate_network():
    """check enumerate_network"""

    assert len(enumerate_network('127.0.1.123')) == 1
    assert len(enumerate_network('127.0.1.123/32')) == 1

    output = enumerate_network('127.0.2.0/31')
    assert len(output) == 2
    assert '127.0.2.0' in output
    assert '127.0.2.0' in output

    assert 'fe80::1:3' in enumerate_network('fe80::1:0/126')


def test_sixenum_target_boundaries():
    """check sixenum_target_boundaries"""

    assert sixenum_target_boundaries('sixenum://::1') == ('::1', '::1')
    assert sixenum_target_boundaries('sixenum://::1-ffff') == ('::1', '::ffff')
    with pytest.raises(ValueError):
        sixenum_target_boundaries('dummy')


def test_excl_matcher(app):  # pylint: disable=unused-argument
    """test matcher"""

    test_regex = 'notarget[012]'
    test_network = '127.66.66.0/26'
    test_sixenum1 = '2001:db8:aa:200::/56'
    test_sixenum2 = '2001:db8:aa:400::1/128'

    matcher = ExclMatcher(yaml.safe_load(f"""
        - [regex, '{test_regex}']
        - [network, '{test_network}']
        - [network, '{test_sixenum1}']
        - [network, '{test_sixenum2}']
    """))
    tnetwork = ip_network(test_network)

    assert matcher.match(str(tnetwork.network_address))
    assert matcher.match(str(tnetwork.broadcast_address))
    assert not matcher.match(str(tnetwork.network_address-1))
    assert not matcher.match(str(tnetwork.broadcast_address+1))

    assert matcher.match(f'tcp://{tnetwork.network_address}:12345')
    assert not matcher.match('tcp://notanaddress:12345')

    assert matcher.match('notarget1')
    assert not matcher.match('notarget3')

    # first and last enums for test_sixenum1
    assert matcher.match('sixenum://2001:db8:aa:200::0-ffff')
    assert matcher.match('sixenum://2001:db8:aa:2ff:ffff:ffff:ffff:0-ffff')
    # test very small sixenum excl agains standard enum target
    assert matcher.match('sixenum://2001:db8:aa:400::0-ffff')
    # test value outsite matcher
    assert not matcher.match('sixenum://2001:db8:aa:300::0-ffff')

    for item in matcher.excls:
        repr(item)


def test_queuemanager_errorhandling(app, queue):  # pylint: disable=unused-argument
    """test QueuemaManger error handling"""

    Path(f'{queue.data_abspath}').mkdir(parents=True)
    Path(f'{queue.data_abspath}/extra').touch()
    with pytest.raises(RuntimeError) as pytest_wrapped_e:
        QueueManager.delete(queue)

    assert 'failed to remove queue directory' in str(pytest_wrapped_e)


def test_schedulerservice_hashval():
    """test heatmap hashval computation"""

    assert SchedulerService.hashval('127.0.0.1') == '127.0.0.0/24'
    assert SchedulerService.hashval('2001:db8:aa::1:2:3:4') == '2001:db8:aa::/48'
    assert SchedulerService.hashval('url') == 'url'
    assert SchedulerService.hashval('tcp://127.0.0.3:11') == '127.0.0.0/24'
    assert SchedulerService.hashval('tcp://[::1]:11') == '::/48'
    assert SchedulerService.hashval('sixenum://2001:db8:aa::1:2:3:11') == '2001:db8:aa::/48'
    assert SchedulerService.hashval('sixenum://2001:db8:bb::1:2:3:0-ffff') == '2001:db8:bb::/48'


def test_schedulerservice_readynetupdates(app, queue, target_factory):  # pylint: disable=unused-argument
    """test scheduler service readynet manipulation"""

    queue.group_size = 2
    target_factory.create(queue=queue, target='1', hashval=SchedulerService.hashval('1'))
    target_factory.create(queue=queue, target='2', hashval=SchedulerService.hashval('2'))
    target_factory.create(queue=queue, target='3', hashval=SchedulerService.hashval('3'))
    db.session.commit()

    assignment = SchedulerService.job_assign(None, [])

    assert len(assignment['targets']) == 2
    assert Readynet.query.count() == 1


def test_schedulerservice_morereadynetupdates(app, queue, target_factory):  # pylint: disable=unused-argument
    """
    test scheduler service readynet manipulation

    used to analyze and reason about heatmap_pop readynet sql queries for update readynet lists.
    using readynet updates `if heat < level` provides automatic updates for readynets when hot_level changes
    in runtime, but produces extra queries for every returning job. result: on hot_level change
    readynets map must be manually recounted.
    """

    current_app.config['SNER_HEATMAP_HOT_LEVEL'] = 5
    queue.group_size = 2

    for addr in range(10):
        tmp = str(ip_address(addr))
        target_factory.create(queue=queue, target=tmp, hashval=SchedulerService.hashval(tmp))
    db.session.commit()

    assignment1 = SchedulerService.job_assign(None, [])
    assignment2 = SchedulerService.job_assign(None, [])
    assignment3 = SchedulerService.job_assign(None, [])

    assert len(assignment3['targets']) == 1
    assert Readynet.query.count() == 0

    SchedulerService.job_output(db.session.get(Job, assignment3['id']), 0, b'')
    assert Readynet.query.count() == 1

    SchedulerService.job_output(db.session.get(Job, assignment2['id']), 0, b'')
    SchedulerService.job_output(db.session.get(Job, assignment1['id']), 0, b'')
    assert Readynet.query.count() == 1


def test_schedulerservice_hashvalprocessing(app, queue, target_factory):  # pylint: disable=unused-argument
    """test scheduler service hashvalsreadynet manipulation"""

    target_factory.create(queue=queue, target='tcp://127.0.0.1:23', hashval=SchedulerService.hashval('tcp://127.0.0.1:23'))
    db.session.commit()

    assignment = SchedulerService.job_assign(None, [])

    assert assignment
    assert Heatmap.query.one().hashval == '127.0.0.0/24'


def test_schedulerservice_readynetrecount(app, queue, target_factory):  # pylint: disable=unused-argument
    """test scheduler service readynet_recount"""

    current_app.config['SNER_HEATMAP_HOT_LEVEL'] = 5
    queue.group_size = 2

    for addr in range(10):
        tmp = str(ip_address(addr))
        target_factory.create(queue=queue, target=tmp, hashval=SchedulerService.hashval(tmp))
    db.session.commit()

    SchedulerService.job_assign(None, [])
    SchedulerService.job_assign(None, [])

    assignment3 = SchedulerService.job_assign(None, [])
    assert len(assignment3['targets']) == 1
    assert Readynet.query.count() == 0

    current_app.config['SNER_HEATMAP_HOT_LEVEL'] = 7
    SchedulerService.readynet_recount()
    assert Readynet.query.count() == 1

    assignment4 = SchedulerService.job_assign(None, [])
    assert len(assignment4['targets']) == 2

    current_app.config['SNER_HEATMAP_HOT_LEVEL'] = 3
    SchedulerService.readynet_recount()
    assert Readynet.query.count() == 0


def test_schedulerservice_heatmapcheck(app, target):  # pylint: disable=unused-argument
    """test scheduler service readynet manipulation"""

    assert SchedulerService.heatmap_check()

    assignment = SchedulerService.job_assign(None, [])
    assert SchedulerService.heatmap_check()

    Job.query.filter(Job.id == assignment['id']).delete()
    db.session.commit()
    assert not SchedulerService.heatmap_check()


def test_schedulerservice_capsrouting(app, queue_factory, target_factory):  # pylint: disable=unused-argument
    """
    test scheduler service queue routing for agents with caps

    queue with no reqs can be run on any agent, queue.reqs [] is contained by agent.caps [any]
    agents with no caps can run any queue

    # pool0 (dummy, pentest) = queue.reqs []
    planned to any agent by priority

    # pool1 (sner) = agent.caps [default, testssl], queue.reqs [default], queue.prio normal
    general sner workload, can also work on slow queues

    # pool2 (testssl)= agent.caps [testssl], queue.reqs [testssl], prio low
    dedicated (small pool) for slow workload (ensure throughtput), but must have
    low priority so it will be backfill for default pool
    """

    qsner_pool1_normal = queue_factory.create(name="sner.normal", reqs=['default'], priority=QueuePrio.NORMAL)
    qsner_pool1_prio = queue_factory.create(name="sner.high", reqs=['default'], priority=QueuePrio.HIGH)
    qsner_pool2 = queue_factory.create(name="sner.pooly", reqs=['testssl'], priority=QueuePrio.LOW)

    target_factory.create(queue=qsner_pool1_normal, target='normal')
    target_factory.create(queue=qsner_pool1_prio, target='prio')
    target_factory.create(queue=qsner_pool2, target='pool2')
    target_factory.create(queue=qsner_pool2, target='pool2')

    assignment = SchedulerService.job_assign(None, agent_caps=['default', 'testssl'])
    assert assignment['targets'] == ['prio']

    assignment = SchedulerService.job_assign(None, agent_caps=['testssl'])
    assert assignment['targets'] == ['pool2']

    assignment = SchedulerService.job_assign(None, agent_caps=['default', 'testssl'])
    assert assignment['targets'] == ['normal']

    assignment = SchedulerService.job_assign(None, agent_caps=['default', 'testssl'])
    assert assignment['targets'] == ['pool2']


def test_schedulerservice_morecapsrouting(app, queue_factory, target_factory):  # pylint: disable=unused-argument
    """more test scheduler service queue routing for agents with caps"""

    # deployment check, default client can handle queue with no-reqs
    queue1 = queue_factory.create(name="test1", reqs=[], priority=QueuePrio.NORMAL)
    target_factory.create(queue=queue1, target='dummy1')

    assignment = SchedulerService.job_assign(None, agent_caps=['default'])
    assert assignment['targets'] == ['dummy1']

    # deployment check, all-caps client can handle no-reqs queue
    target_factory.create(queue=queue1, target='dummy2')

    assignment = SchedulerService.job_assign(None, agent_caps=[])
    assert assignment['targets'] == ['dummy2']

    # deployment check, all-caps client can handle queue with reqs
    queue3 = queue_factory.create(name="test3", reqs=['dummy'], priority=QueuePrio.NORMAL)
    target_factory.create(queue=queue3, target='dummy3')

    assignment = SchedulerService.job_assign(None, agent_caps=[])
    assert assignment['targets'] == ['dummy3']


def test_schedulerservice_repeatfailedjobs(app, queue, job_factory):  # pylint: disable=unused-argument
    """test scheduler service repeat_failed_jobs"""

    job_factory.create(queue=queue, retval=None)
    job_factory.create(queue=queue, retval=0)
    job_factory.create(queue=queue, retval=1000)
    job_factory.create(queue=queue, retval=-15)

    SchedulerService.repeat_failed_jobs()
    assert Job.query.filter(Job.retval == None).count() == 1  # noqa: E711  pylint: disable=singleton-comparison
    assert Job.query.filter(Job.retval == 0).count() == 1
    assert Job.query.filter(Job.retval == 1000).count() == 1
    assert Job.query.filter(Job.retval == -15).count() == 0


def test_schedulerservice_recoverheatmap(app, queue, job_factory):  # pylint: disable=unused-argument
    """test scheduler service repeat_failed_jobs"""

    job_factory.create(queue=queue, retval=None)
    job_factory.create(queue=queue, retval=0)
    job_factory.create(queue=queue, retval=1000)
    job_factory.create(queue=queue, retval=-15)

    SchedulerService.recover_heatmap()
    assert Job.query.filter(Job.retval == None).count() == 0  # noqa: E711  pylint: disable=singleton-comparison
    assert Job.query.filter(Job.retval == 0).count() == 1
    assert Job.query.filter(Job.retval == 1000).count() == 1
    assert Job.query.filter(Job.retval == -15).count() == 0
    assert Heatmap.query.count() == 0

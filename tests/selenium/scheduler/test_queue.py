# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
selenium ui tests for scheduler.queue component
"""

from selenium.webdriver.common.by import By

from sner.server.extensions import db
from sner.server.scheduler.models import Queue
from tests.selenium import dt_inrow_delete, dt_rendered, dt_wait_processing, frontend_url, wait_for_js


def test_queue_list_route(live_server, sl_operator, queue):  # pylint: disable=unused-argument
    """simple test ajaxed datatable rendering"""

    sl_operator.get(frontend_url('/scheduler/queue/list'))
    wait_for_js(sl_operator)
    dt_rendered(sl_operator, 'queue_list_table', queue.name)


def test_queue_list_route_inrow_delete(live_server, sl_operator, queue):  # pylint: disable=unused-argument
    """delete queue inrow button"""

    queue_id = queue.id
    db.session.expunge(queue)

    sl_operator.get(frontend_url('/scheduler/queue/list'))
    wait_for_js(sl_operator)
    dt_inrow_delete(sl_operator, 'queue_list_table')
    assert not Queue.query.get(queue_id)


def test_queue_list_route_inrow_flush(live_server, sl_operator, target):  # pylint: disable=unused-argument
    """flush queue inrow button"""

    tqueue_id = target.queue_id

    dt_id = 'queue_list_table'
    sl_operator.get(frontend_url('/scheduler/queue/list'))
    wait_for_js(sl_operator)
    dt_wait_processing(sl_operator, dt_id)
    sl_operator.find_element(By.ID, dt_id).find_element(By.XPATH, '//a[@data-testid="queue-flush"]').click()
    # webdriver_waituntil(sl_operator, EC.alert_is_present())
    # sl_operator.switch_to.alert.accept()
    dt_wait_processing(sl_operator, dt_id)

    assert not Queue.query.get(tqueue_id).targets

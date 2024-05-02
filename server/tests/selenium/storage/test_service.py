# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
selenium ui tests for storage.service component
"""

import string

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from sner.server.extensions import db
from sner.server.storage.models import Service
from tests.selenium import dt_inrow_delete, dt_count_rows, dt_rendered, dt_wait_processing, webdriver_waituntil, frontend_url, wait_for_js
from tests.selenium.storage import (
    check_annotate,
    check_dt_toolbox_freetag,
    check_dt_toolbox_multiactions,
    check_dt_toolbox_select_rows,
    check_dt_toolbox_visibility_toggle,
    check_service_endpoint_dropdown
)


def test_service_list_route(frontend_server, sl_operator, service):  # pylint: disable=unused-argument
    """simple test ajaxed datatable rendering"""

    sl_operator.get(frontend_url('/storage/service/list'))
    wait_for_js(sl_operator)
    dt_rendered(sl_operator, 'service_list_table', service.comment)


def test_service_list_route_inrow_delete(frontend_server, sl_operator, service):  # pylint: disable=unused-argument
    """delete service inrow button"""

    service_id = service.id
    db.session.expunge(service)

    sl_operator.get(frontend_url('/storage/service/list'))
    wait_for_js(sl_operator)
    dt_inrow_delete(sl_operator, 'service_list_table')

    assert not Service.query.get(service_id)


def test_service_list_route_annotate(frontend_server, sl_operator, service):  # pylint: disable=unused-argument
    """test annotation from list route"""

    sl_operator.get(frontend_url('/storage/service/list'))
    wait_for_js(sl_operator)
    dt_rendered(sl_operator, 'service_list_table', service.comment)
    check_annotate(sl_operator, 'service_comment_annotate', service)


def test_service_list_route_service_endpoint_dropdown(frontend_server, sl_operator, service):  # pylint: disable=unused-argument
    """service endpoint uris dropdown test"""

    sl_operator.get(frontend_url('/storage/service/list'))
    wait_for_js(sl_operator)
    dt_rendered(sl_operator, 'service_list_table', service.comment)
    check_service_endpoint_dropdown(sl_operator, sl_operator.find_element(By.ID, 'service_list_table'), service.port)


def test_service_list_route_moredata_dropdown(frontend_server, sl_operator, service):  # pylint: disable=unused-argument
    """test moredata dropdown"""

    sl_operator.get(frontend_url('/storage/service/list'))
    wait_for_js(sl_operator)
    dt_rendered(sl_operator, 'service_list_table', service.comment)
    sl_operator.find_element(By.ID, 'service_list_table').find_element(
        By.XPATH,
        './/div[contains(@class, "dropdown")]/a[@title="Show more data"]'
    ).click()
    webdriver_waituntil(sl_operator, EC.visibility_of_element_located((
        By.XPATH,
        '//table[@id="service_list_table"]//h6[text()="More data"]'
    )))


def test_service_list_route_selectrows(frontend_server, sl_operator, services_multiaction):  # pylint: disable=unused-argument
    """test dt selection and selection buttons"""

    check_dt_toolbox_select_rows(sl_operator, frontend_url('/storage/service/list'), 'service_list_table')


def test_service_list_route_dt_toolbox_visibility_toggle(frontend_server, sl_operator, service_factory):  # pylint: disable=unused-argument
    """test dt selection and selection buttons"""

    check_dt_toolbox_visibility_toggle(sl_operator, frontend_url('/storage/service/list'), 'service_list_table', service_factory)


def test_service_list_route_dt_toolbox_multiactions(frontend_server, sl_operator, services_multiaction):  # pylint: disable=unused-argument
    """test dt selection and selection buttons"""

    check_dt_toolbox_multiactions(sl_operator, frontend_url('/storage/service/list'), 'service_list_table', Service)


def test_service_list_route_dt_toolbox_freetag(frontend_server, sl_operator, services_multiaction):  # pylint: disable=unused-argument
    """test dt freetag buttons"""

    check_dt_toolbox_freetag(sl_operator, frontend_url('/storage/service/list'), 'service_list_table', Service)


def test_service_grouped_route_filter_specialchars(frontend_server, sl_operator, service_factory):  # pylint: disable=unused-argument
    """test grouped service info view and filtering features with specialchars"""

    service_factory.create(info=string.printable)

    sl_operator.get(frontend_url('/storage/service/grouped'))
    wait_for_js(sl_operator)
    elem_xpath = f"//a[contains(text(), '{string.digits}')]"
    webdriver_waituntil(sl_operator, EC.visibility_of_element_located((By.XPATH, elem_xpath)))

    sl_operator.find_element(By.XPATH, elem_xpath).click()
    dt_wait_processing(sl_operator, 'service_list_table')

    assert dt_count_rows(sl_operator, 'service_list_table') == 1

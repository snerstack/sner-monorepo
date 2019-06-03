"""selenium ui tests for storage.vuln component"""

from flask import url_for

from sner.server.model.storage import Vuln
from tests.selenium import dt_inrow_delete, dt_rendered, dt_wait_processing
from tests.selenium.storage import check_select_rows, check_vulns_multiactions


def test_list(live_server, selenium, test_vuln):  # pylint: disable=unused-argument
    """simple test ajaxed datatable rendering"""

    selenium.get(url_for('storage.vuln_list_route', _external=True))
    dt_rendered(selenium, 'vuln_list_table', test_vuln.comment)


def test_list_inrow_delete(live_server, selenium, test_vuln):  # pylint: disable=unused-argument
    """delete vuln inrow button"""

    selenium.get(url_for('storage.vuln_list_route', _external=True))
    dt_inrow_delete(selenium, 'vuln_list_table')
    assert not Vuln.query.filter(Vuln.id == test_vuln.id).one_or_none()


def test_grouped(live_server, selenium, test_vuln):  # pylint: disable=unused-argument
    """test grouped vulns view"""

    selenium.get(url_for('storage.vuln_grouped_route', _external=True))
    dt_wait_processing(selenium, 'vuln_grouped_table')
    assert len(selenium.find_elements_by_xpath('//tbody/tr[@role="row"]')) == 1


def test_list_selectrows(live_server, selenium, test_vulns_multiaction):  # pylint: disable=unused-argument
    """test dt selection and selection buttons"""

    selenium.get(url_for('storage.vuln_list_route', _external=True))
    check_select_rows(selenium, 'vuln_list_table')


def test_list_multiactions(live_server, selenium, test_vulns_multiaction):  # pylint: disable=unused-argument
    """test vulns multiactions"""

    selenium.get(url_for('storage.vuln_list_route', _external=True))
    check_vulns_multiactions(selenium, 'vuln_list_table')


def check_vuln_filtering(selenium, dt_id):
    """test vuln views filtering functions"""

    toolbar_id = '%s_toolbar' % dt_id

    # there should be 4 rows in total
    dt_elem = dt_wait_processing(selenium, dt_id)
    assert len(dt_elem.find_elements_by_xpath('//tbody/tr[@role="row"]')) == 4

    # one not tagged
    selenium.find_element_by_id(toolbar_id).find_element_by_xpath('//a[text()="Not tagged"]').click()
    dt_elem = dt_wait_processing(selenium, dt_id)
    assert len(dt_elem.find_elements_by_xpath('//tbody/tr[@role="row"]')) == 1
    assert dt_elem.find_element_by_xpath('//td/a[text()="vuln 1"]')

    # three tagged
    selenium.find_element_by_id(toolbar_id).find_element_by_xpath('//a[text()="Tagged"]').click()
    dt_elem = dt_wait_processing(selenium, dt_id)
    assert len(dt_elem.find_elements_by_xpath('//tbody/tr[@role="row"]')) == 3
    assert not dt_elem.find_elements_by_xpath('//td/a[text()="vuln 1"]')

    # two already reviewed
    selenium.find_element_by_id(toolbar_id).find_element_by_xpath('//a[text()="Exclude reviewed"]').click()
    dt_elem = dt_wait_processing(selenium, dt_id)
    assert len(dt_elem.find_elements_by_xpath('//tbody/tr[@role="row"]')) == 2
    assert dt_elem.find_element_by_xpath('//td/a[text()="vuln 1"]')
    assert dt_elem.find_element_by_xpath('//td/a[text()="vuln 2"]')

    # one should go directly to report
    selenium.find_element_by_id(toolbar_id).find_element_by_xpath('//a[text()="Only Report"]').click()
    dt_elem = dt_wait_processing(selenium, dt_id)
    assert len(dt_elem.find_elements_by_xpath('//tbody/tr[@role="row"]')) == 1
    assert dt_elem.find_element_by_xpath('//td/a[text()="vuln 4"]')

    # and user must be able to loose the filter
    selenium.find_element_by_xpath('//a[text()="unfilter"]').click()
    dt_elem = dt_wait_processing(selenium, dt_id)
    assert len(dt_elem.find_elements_by_xpath('//tbody/tr[@role="row"]')) == 4


def test_list_filtering(live_server, selenium, test_vulns_filtering):  # pylint: disable=unused-argument
    """test list vulns view filtering features"""

    selenium.get(url_for('storage.vuln_list_route', _external=True))
    check_vuln_filtering(selenium, 'vuln_list_table')


def test_grouped_filtering(live_server, selenium, test_vulns_filtering):  # pylint: disable=unused-argument
    """test grouped vulns view filtering features"""

    selenium.get(url_for('storage.vuln_grouped_route', _external=True))
    check_vuln_filtering(selenium, 'vuln_grouped_table')

# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
selenium ui tests for quickjump
"""

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from tests.selenium import webdriver_waituntil, frontend_url, wait_for_js


def test_quickjump_route_autocomplete(frontend_server, sl_operator, host):  # pylint: disable=unused-argument
    """quickjump test"""

    sl_operator.get(frontend_url('/'))
    wait_for_js(sl_operator)

    sl_operator.find_element(By.XPATH, '//form[@data-testid="quickjump-form"]/input[@name="quickjump"]').send_keys(host.address[:2])
    elem_xpath = f'//ul[@data-testid="quickjump-list"]/li[contains(., "{host.address}")]'
    webdriver_waituntil(sl_operator, EC.visibility_of_element_located((By.XPATH, elem_xpath)))

    sl_operator.find_element(By.XPATH, elem_xpath).click()
    webdriver_waituntil(sl_operator, EC.url_to_be(frontend_url(f'/storage/host/view/{host.id}')))

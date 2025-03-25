# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
selenium ui tests module
"""

import os

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


WEBDRIVER_WAIT = 10
FRONTEND_TESTSERVER_DEFAULT = "http://localhost:18002"
FRONTEND_TESTSERVER_DEV = "http://localhost:18082"


class JsNoAjaxPending():  # pylint: disable=too-few-public-methods
    """custom expected_condition, wait for all ajax calls to finish"""

    def __call__(self, driver):
        return driver.execute_script('return(typeof(window.jQuery) === "function" && jQuery.active === 0)')


def webdriver_waituntil(sclnt, condition):
    """webdriver wait until shortcut"""
    return WebDriverWait(sclnt, WEBDRIVER_WAIT).until(condition)


def dt_wait_processing(sclnt, dt_id):
    """wait until all ajax finished and dt_id processing (hopefully) ended"""

    webdriver_waituntil(sclnt, JsNoAjaxPending())
    webdriver_waituntil(sclnt, EC.invisibility_of_element_located((By.ID, f'{dt_id}_processing')))
    return sclnt.find_element(By.ID, dt_id)


def dt_rendered(sclnt, dt_id, td_data):
    """test for td_data rendered in dt_id, eg. datatable rendered test data"""

    dt_wait_processing(sclnt, dt_id)
    assert sclnt.find_element(By.XPATH, f'//table[@id="{dt_id}"]/tbody/tr/td[contains(.,"{td_data}")]')


def dt_inrow_delete(sclnt, dt_id, index=0):
    """test delete row/item rendered in _buttons by default ajaxed datatables"""

    dt_wait_processing(sclnt, dt_id)
    delete_btn = sclnt.find_element(By.ID, dt_id).find_elements(By.XPATH, '//a[@data-testid="delete-btn"]')[index]
    delete_btn.click()
    webdriver_waituntil(sclnt, EC.alert_is_present())
    sclnt.switch_to.alert.accept()
    webdriver_waituntil(sclnt, EC.invisibility_of_element_located(delete_btn))
    dt_wait_processing(sclnt, dt_id)


def dt_count_rows(sclnt, dt_id):
    """count number of rows in table"""

    return len(sclnt.find_elements(By.XPATH, f'//table[@id="{dt_id}"]/tbody/tr'))


def screenshot(sclnt):
    """
    create screenshot debug helper

    usage:
    ```
    from tests.selenium import screenshot; screenshot(sclnt)
    ```
    """

    sclnt.save_screenshot("screenshot.png")


def wait_for_js(sclnt):
    """wait for javascript to load (CSR)"""

    return webdriver_waituntil(sclnt, EC.presence_of_element_located((By.XPATH, '//main[@id="main"]')))


def toggle_dt_toolboxes(sclnt):
    """toggle datatables toolboxes"""

    sclnt.find_element(By.XPATH, '//a[@id="dropdownUser"]').click()
    sclnt.find_element(By.XPATH, '//a[contains(text(), "UI: toggle DT toolboxes")]').click()


def frontend_url(route_path):
    """create url for frontend"""

    base = (
        FRONTEND_TESTSERVER_DEV
        if os.environ.get("PYTEST_FRONTEND", "dev") == "dev"
        else FRONTEND_TESTSERVER_DEFAULT
    )
    return base + route_path

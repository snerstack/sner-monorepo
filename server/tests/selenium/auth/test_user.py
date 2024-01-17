# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auth.views.user selenium tests
"""

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from sner.server.auth.models import User
from sner.server.extensions import db
from tests.selenium import dt_inrow_delete, dt_rendered, webdriver_waituntil, frontend_url, wait_for_js


def test_user_list_route(live_server, sl_admin, user):  # pylint: disable=unused-argument
    """simple test ajaxed datatable rendering"""

    sl_admin.get(frontend_url('/auth/user/list'))
    wait_for_js(sl_admin)
    dt_rendered(sl_admin, 'user_list_table', user.username)


def test_user_list_route_inrow_delete(live_server, sl_admin, user):  # pylint: disable=unused-argument
    """delete user inrow button"""

    user_id = user.id
    db.session.expunge(user)

    sl_admin.get(frontend_url('/auth/user/list'))
    wait_for_js(sl_admin)
    # in this test-case there are multiple items in the table (current_user, test_user), hence index which to delete has to be used
    dt_inrow_delete(sl_admin, 'user_list_table', 1)
    assert not User.query.get(user_id)


def test_user_apikey_route(live_server, sl_admin, user):  # pylint: disable=unused-argument
    """apikey generation/revoking feature tests"""

    sl_admin.get(frontend_url('/auth/user/list'))
    wait_for_js(sl_admin)
    dt_rendered(sl_admin, 'user_list_table', user.username)

    generate_btn = sl_admin.find_elements(By.XPATH, '//a[@data-testid="apikey-btn"]')[1]
    generate_btn.click()
    webdriver_waituntil(sl_admin, EC.visibility_of_element_located((By.XPATH, '//*[contains(@class,"modal-title") and text()="Apikey"]')))

    sl_admin.find_element(By.XPATH, '//div[contains(@class, "modal show")]').click()
    webdriver_waituntil(sl_admin, EC.invisibility_of_element_located((By.XPATH, '//div[@data-testid="apikey-modal"]')))
    dt_rendered(sl_admin, 'user_list_table', user.username)

    db.session.refresh(user)
    assert user.apikey

    sl_admin.find_elements(By.XPATH, '//a[@data-testid="apikey-btn"]')[1].click()
    webdriver_waituntil(sl_admin, EC.visibility_of_element_located((By.XPATH, '//div[text()="Apikey successfully revoked."]')))
    dt_rendered(sl_admin, 'user_list_table', user.username)

    db.session.refresh(user)
    assert not user.apikey

# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auth.views.login selenium tests
"""

from base64 import b64decode, b64encode

from fido2 import cbor

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from soft_webauthn import SoftWebauthnDevice

from sner.server.extensions import db, webauthn
from tests.selenium import webdriver_waituntil, frontend_url, wait_for_js
from tests.selenium.auth import js_variable_ready


def test_login_webauthn(frontend_server, selenium, webauthn_credential_factory):  # pylint: disable=unused-argument
    """test login by webauthn"""

    device = SoftWebauthnDevice()
    device.cred_init(webauthn.rp.id, b'randomhandle')
    wncred = webauthn_credential_factory.create(initialized_device=device)
    # factory post_generate does not call commit to propagate self.attr changes, that messes the actual db state when
    # accessing from different process such as real browser
    db.session.commit()

    selenium.get(frontend_url('/auth/login'))
    wait_for_js(selenium)
    selenium.find_element(By.XPATH, '//form//input[@name="username"]').send_keys(wncred.user.username)
    selenium.find_element(By.XPATH, '//form//input[@type="submit"]').click()

    # some javascript code must be emulated
    webdriver_waituntil(selenium, js_variable_ready('window.pkcro_raw'))
    pkcro = cbor.decode(b64decode(selenium.execute_script('return window.pkcro_raw;').encode('utf-8')))
    assertion = device.get(pkcro, f'https://{webauthn.rp.id}')
    buf = b64encode(cbor.encode(assertion)).decode('utf-8')
    selenium.execute_script(f'loginWebauthn(cborDecode(base64ToArrayBuffer("{buf}")));')
    # and back to standard test codeflow

    webdriver_waituntil(selenium, EC.presence_of_element_located((By.XPATH, '//a[text()="Logout"]')))

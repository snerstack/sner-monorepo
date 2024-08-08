# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
shared fixtures for selenium tests
"""

import os
import signal
import subprocess

import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.support import expected_conditions as EC

from sner.server.auth.models import User
from sner.server.extensions import db
from sner.server.password_supervisor import PasswordSupervisor as PWS
from tests.selenium import FRONTEND_TESTSERVER_DEV, frontend_url, webdriver_waituntil, wait_for_js


def selenium_in_roles(sclnt, roles):
    """create user role and login selenium to role(s)"""

    tmp_password = PWS.generate()
    tmp_user = User(username='pytest_user', password=PWS.hash(tmp_password), active=True, roles=roles)
    db.session.add(tmp_user)
    db.session.commit()

    # login the instance
    sclnt.get(frontend_url("/auth/login"))
    wait_for_js(sclnt)
    sclnt.find_element(By.XPATH, '//form//input[@name="username"]').send_keys(tmp_user.username)
    sclnt.find_element(By.XPATH, '//form//input[@name="password"]').send_keys(tmp_password)
    sclnt.find_element(By.XPATH, '//form//input[@type="submit"]').click()
    webdriver_waituntil(sclnt, EC.presence_of_element_located((By.XPATH, '//a[text()="Logout"]')))

    return sclnt


@pytest.fixture(scope="session")
def browser_instance():
    """shared browser instance"""

    options = Options()
    options.headless = True

    # Disable automatic updates
    options.set_preference("app.update.auto", False)
    options.set_preference("app.update.enabled", False)
    # Disable add-on updates
    options.set_preference("extensions.update.enabled", False)
    options.set_preference("extensions.getAddons.cache.enabled", False)
    # Disable Enhanced Tracking Protection (ETP)
    options.set_preference("privacy.trackingprotection.enabled", False)
    options.set_preference("privacy.trackingprotection.pbmode.enabled", False)
    options.set_preference("privacy.trackingprotection.socialtracking.enabled", False)
    options.set_preference("privacy.trackingprotection.cryptomining.enabled", False)
    options.set_preference("privacy.trackingprotection.fingerprinting.enabled", False)
    options.set_preference("privacy.trackingprotection.annotate_channels", False)
    options.set_preference("privacy.trackingprotection.origin_telemetry.enabled", False)
    # Disable Safe Browsing (which is part of the protection mechanisms)
    options.set_preference("browser.safebrowsing.enabled", False)
    options.set_preference("browser.safebrowsing.malware.enabled", False)
    options.set_preference("browser.safebrowsing.phishing.enabled", False)
    options.set_preference("browser.safebrowsing.downloads.remote.enabled", False)
    # Disable protection updates
    options.set_preference("browser.safebrowsing.provider.google.updateURL", "")
    options.set_preference("browser.safebrowsing.provider.google.gethashURL", "")
    options.set_preference("browser.safebrowsing.provider.google4.updateURL", "")
    options.set_preference("browser.safebrowsing.provider.google4.gethashURL", "")
    options.set_preference("browser.safebrowsing.provider.mozilla.updateURL", "")
    # # Disable captive portal detection
    options.set_preference("network.captive-portal-service.enabled", False)

    driver = webdriver.Firefox(options=options, log_path="/tmp/geckodriver.log")
    yield driver
    driver.quit()


@pytest.fixture
def shared_browser(browser_instance):  # pylint: disable=redefined-outer-name
    """clean shared browser"""

    browser_instance.delete_all_cookies()
    browser_instance.get(frontend_url("/backend/reset_browser_storage"))
    wait_for_js(browser_instance)
    yield browser_instance


@pytest.fixture
def sl_user(shared_browser):  # pylint: disable=redefined-outer-name
    """yield client authenticated to role user"""

    yield selenium_in_roles(shared_browser, ['user'])


@pytest.fixture
def sl_operator(shared_browser):  # pylint: disable=redefined-outer-name
    """yield client authenticated to role operator"""

    yield selenium_in_roles(shared_browser, ['user', 'operator'])


@pytest.fixture
def sl_admin(shared_browser):  # pylint: disable=redefined-outer-name
    """yield client authenticated to role admin"""

    yield selenium_in_roles(shared_browser, ['user', 'operator', 'admin'])


@pytest.fixture(scope="session")
def built_frontend():
    """build frontend"""

    if os.environ.get("PYTEST_FRONTEND") == "build":
        subprocess.run(
            ["npm", "run", "build"],
            cwd="../frontend",
            check=True
        )
    yield 0


@pytest.fixture
def frontend_server(built_frontend, live_server):  # pylint: disable=redefined-outer-name,unused-argument
    """ensure frontend test server"""

    # PYTEST_FRONTEND=dev     .. devserver (with backend proxy)
    # PYTEST_FRONTEND=build   .. live_server with built assets
    # PYTEST_FRONTENT=nobuild .. live_server without building assets (eg. uses already built assets)

    if os.environ.get("PYTEST_FRONTEND", "dev") == "dev":
        proc = subprocess.Popen(  # pylint: disable=consider-using-with
            ["npm", "run", "dev", "--", "--port", FRONTEND_TESTSERVER_DEV.rsplit(":", maxsplit=1)[-1], "--strictPort"],
            env={
                "PATH": os.environ["PATH"],
                "SNER_BACKEND_URL": f"http://localhost:{live_server.port}",
            },
            cwd="../frontend",
            start_new_session=True
        )
        yield proc
        os.killpg(os.getpgid(proc.pid), signal.SIGTERM)

    else:
        yield live_server

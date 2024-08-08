# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
shared fixtures for selenium tests
"""

import os
import signal
import subprocess

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from sner.server.auth.models import User
from sner.server.extensions import db
from sner.server.password_supervisor import PasswordSupervisor as PWS
from tests.selenium import FRONTEND_TESTSERVER_DEV, frontend_url, webdriver_waituntil, wait_for_js


@pytest.fixture
def firefox_options(firefox_options):  # pylint: disable=redefined-outer-name
    """override firefox options"""

    firefox_options.headless = True

    # Disable automatic updates
    firefox_options.set_preference("app.update.auto", False)
    firefox_options.set_preference("app.update.enabled", False)

    # Disable add-on updates
    firefox_options.set_preference("extensions.update.enabled", False)
    firefox_options.set_preference("extensions.getAddons.cache.enabled", False)

    # Disable Enhanced Tracking Protection (ETP)
    firefox_options.set_preference("privacy.trackingprotection.enabled", False)
    firefox_options.set_preference("privacy.trackingprotection.pbmode.enabled", False)
    firefox_options.set_preference("privacy.trackingprotection.socialtracking.enabled", False)
    firefox_options.set_preference("privacy.trackingprotection.cryptomining.enabled", False)
    firefox_options.set_preference("privacy.trackingprotection.fingerprinting.enabled", False)
    firefox_options.set_preference("privacy.trackingprotection.annotate_channels", False)
    firefox_options.set_preference("privacy.trackingprotection.origin_telemetry.enabled", False)

    # Disable Safe Browsing (which is part of the protection mechanisms)
    firefox_options.set_preference("browser.safebrowsing.enabled", False)
    firefox_options.set_preference("browser.safebrowsing.malware.enabled", False)
    firefox_options.set_preference("browser.safebrowsing.phishing.enabled", False)
    firefox_options.set_preference("browser.safebrowsing.downloads.remote.enabled", False)

    # Disable protection updates
    firefox_options.set_preference("browser.safebrowsing.provider.google.updateURL", "")
    firefox_options.set_preference("browser.safebrowsing.provider.google.gethashURL", "")
    firefox_options.set_preference("browser.safebrowsing.provider.google4.updateURL", "")
    firefox_options.set_preference("browser.safebrowsing.provider.google4.gethashURL", "")
    firefox_options.set_preference("browser.safebrowsing.provider.mozilla.updateURL", "")

    # # Disable captive portal detection
    firefox_options.set_preference("network.captive-portal-service.enabled", False)

    return firefox_options


def selenium_in_roles(sclnt, roles):
    """create user role and login selenium to role(s)"""

    tmp_password = PWS.generate()
    tmp_user = User(username='pytest_user', password=PWS.hash(tmp_password), active=True, roles=roles)
    db.session.add(tmp_user)
    db.session.commit()

    sclnt.get(frontend_url("/auth/login"))
    wait_for_js(sclnt)
    sclnt.find_element(By.XPATH, '//form//input[@name="username"]').send_keys(tmp_user.username)
    sclnt.find_element(By.XPATH, '//form//input[@name="password"]').send_keys(tmp_password)
    sclnt.find_element(By.XPATH, '//form//input[@type="submit"]').click()
    webdriver_waituntil(sclnt, EC.presence_of_element_located((By.XPATH, '//a[text()="Logout"]')))

    return sclnt


@pytest.fixture
def sl_user(selenium):  # pylint: disable=redefined-outer-name
    """yield client authenticated to role user"""

    yield selenium_in_roles(selenium, ['user'])


@pytest.fixture
def sl_operator(selenium):  # pylint: disable=redefined-outer-name
    """yield client authenticated to role operator"""

    yield selenium_in_roles(selenium, ['user', 'operator'])


@pytest.fixture
def sl_admin(selenium):  # pylint: disable=redefined-outer-name
    """yield client authenticated to role admin"""

    yield selenium_in_roles(selenium, ['user', 'operator', 'admin'])


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

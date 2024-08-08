# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
selenium based UI tests
"""

from selenium.webdriver.support import expected_conditions as EC

from tests.selenium import frontend_url, webdriver_waituntil


def test_index_route(frontend_server, shared_browser):  # pylint: disable=unused-argument
    """very basic index hit test"""

    selenium = shared_browser
    selenium.get(frontend_url("/"))
    webdriver_waituntil(selenium, EC.title_is('Homepage - sner4'))

    assert 'Homepage - sner4' in selenium.title

# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
selenium based UI tests
"""

from flask import url_for
from tests.selenium import frontend_url, wait_for_js


def test_index_route(live_server, selenium):  # pylint: disable=unused-argument
    """very basic index hit test"""

    print(frontend_url(url_for('index_route')))

    selenium.get(frontend_url(url_for('index_route')))
    
    wait_for_js(selenium)

    assert 'Homepage - sner4' in selenium.title

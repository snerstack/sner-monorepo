# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
sner.server tests
"""

from flask import url_for


def get_csrf_token(clnt):
    """fetch user/me route and parse csrf token"""

    response = clnt.get(url_for('auth.user_me_route'), expect_errors=True)
    cookie_list = response.headers.getall('Set-Cookie')
    csrf_token = [item.split('=')[1].split(';')[0] for item in cookie_list if item.startswith('tokencsrf=')][0]
    return csrf_token


class DummyPostData(dict):
    """used for testing edge-cases on forms processing"""

    def getlist(self, key):
        """accessor; taken from wtforms testsuite"""

        v = self[key]  # pylint: disable=invalid-name
        if not isinstance(v, (list, tuple)):
            v = [v]  # pylint: disable=invalid-name
        return v

# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
storage.views shared test functions
"""

from http import HTTPStatus

from flask import url_for

from sner.server.extensions import db


def check_annotate(clnt, route_name, test_model):
    """check annotate functionality"""

    data = {'tags': 'tag1\ntag2', 'comment': 'annotated', 'ids-0': test_model.id}
    response = clnt.post(url_for(route_name, model_id=test_model.id), data)
    assert response.status_code == HTTPStatus.OK

    model = db.session.get(test_model.__class__, test_model.id)
    assert model.comment == 'annotated'
    assert 'tag2' in model.tags


def check_tag_multiid(clnt, route_name, test_model):
    """check multiid tagging"""

    data = {'tag': 'testtag', 'action': 'set', 'ids-0': test_model.id}
    response = clnt.post(url_for(route_name), data)
    assert response.status_code == HTTPStatus.OK
    assert 'testtag' in db.session.get(test_model.__class__, test_model.id).tags

    data = {'tag': 'testtag', 'action': 'unset', 'ids-0': test_model.id}
    response = clnt.post(url_for(route_name), data)
    assert response.status_code == HTTPStatus.OK
    assert 'testtag' not in db.session.get(test_model.__class__, test_model.id).tags

    response = clnt.post(url_for(route_name), {}, status='*')
    assert response.status_code == HTTPStatus.BAD_REQUEST


def check_delete_multiid(clnt, route_name, test_model):
    """check multiid delete"""

    test_model_id = test_model.id
    data = {'ids-0': test_model.id}
    response = clnt.post(url_for(route_name), data)
    assert response.status_code == HTTPStatus.OK
    assert not db.session.get(test_model.__class__, test_model_id)

    response = clnt.post(url_for(route_name), {}, status='*')
    assert response.status_code == HTTPStatus.BAD_REQUEST

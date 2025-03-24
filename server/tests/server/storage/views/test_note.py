# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
storage.views.note tests
"""

import json
from http import HTTPStatus

from flask import url_for

from sner.server.extensions import db
from sner.server.storage.models import Note
from tests.server.storage.views import check_annotate, check_delete_multiid, check_tag_multiid


def test_note_list_json_route(cl_operator, note):
    """note list_json route test"""

    response = cl_operator.post(url_for('storage.note_list_json_route'), {'draw': 1, 'start': 0, 'length': 1, 'search[value]': note.data})
    assert response.status_code == HTTPStatus.OK
    response_data = json.loads(response.body.decode('utf-8'))
    assert response_data['data'][0]['data'] == note.data

    response = cl_operator.post(
        url_for('storage.note_list_json_route', filter=f'Note.data=="{note.data}"'),
        {'draw': 1, 'start': 0, 'length': 1}
    )
    assert response.status_code == HTTPStatus.OK
    response_data = json.loads(response.body.decode('utf-8'))
    assert response_data['data'][0]['data'] == note.data


def test_note_add_route(cl_operator, host, service, note_factory):
    """note add route test"""

    anote = note_factory.build(host=host, service=service)

    form_data = [('host_id', anote.host.id), ('service_id', anote.service.id), ('xtype', anote.xtype), ('data', anote.data),
                 ('comment', anote.comment)]
    response = cl_operator.post(url_for('storage.note_add_route', model_name='service', model_id=anote.service.id), params=form_data)
    assert response.status_code == HTTPStatus.OK

    tnote = Note.query.filter(Note.data == anote.data).one()
    assert tnote.xtype == anote.xtype
    assert tnote.data == anote.data
    assert tnote.comment == anote.comment


def test_note_edit_route(cl_operator, note):
    """note edit route test"""

    new_data = f'{note.data}_edited'

    form_data = [('host_id', note.host.id), ('data', new_data)]
    response = cl_operator.post(url_for('storage.note_edit_route', note_id=note.id), params=form_data)

    assert response.status_code == HTTPStatus.OK

    tnote = db.session.get(Note, note.id)
    assert tnote.data == new_data


def test_note_delete_route(cl_operator, note):
    """note delete route test"""

    response = cl_operator.post(url_for('storage.note_delete_route', note_id=note.id))
    assert response.status_code == HTTPStatus.OK

    assert not db.session.get(Note, note.id)


def test_note_view_json_route(cl_operator, note):
    """note view json route test"""

    response = cl_operator.get(url_for('storage.note_view_json_route', note_id=note.id))
    assert response.status_code == HTTPStatus.OK
    assert response.json['id'] == 1
    assert response.json['hostname'] == 'localhost.localdomain'


def test_note_invalid_add_request(cl_operator, host, service, note_factory):
    """note invalid add request"""

    anote = note_factory.build(host=host, service=service)

    response = cl_operator.post(url_for('storage.note_add_route', model_name='service', model_id=anote.service.id), expect_errors=True)
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_note_invalid_edit_request(cl_operator, note):
    """note invalid edit request"""

    response = cl_operator.post(url_for('storage.note_edit_route', note_id=note.id), expect_errors=True)
    assert response.status_code == HTTPStatus.BAD_REQUEST


def test_note_invalid_view_request(cl_operator):
    """note invalid view request"""

    response = cl_operator.get(url_for('storage.note_view_json_route', note_id=-1), expect_errors=True)
    assert response.status_code == HTTPStatus.NOT_FOUND


def test_note_annotate_route(cl_operator, note):
    """note annotate route test"""

    check_annotate(cl_operator, 'storage.note_annotate_route', note)


def test_note_tag_multiid_route(cl_operator, note):
    """note tag_multiid route test"""

    check_tag_multiid(cl_operator, 'storage.note_tag_multiid_route', note)


def test_note_delete_multiid_route(cl_operator, note):
    """note delete_multiid route test"""

    check_delete_multiid(cl_operator, 'storage.note_delete_multiid_route', note)


def test_note_grouped_json_route(cl_operator, note):
    """note grouped json route test"""

    response = cl_operator.post(
        url_for('storage.note_grouped_json_route'),
        {'draw': 1, 'start': 0, 'length': 1, 'search[value]': note.xtype}
    )
    assert response.status_code == HTTPStatus.OK
    response_data = json.loads(response.body.decode('utf-8'))
    assert note.xtype in response_data['data'][0]['xtype']

    response = cl_operator.post(
        url_for('storage.note_grouped_json_route', filter=f'Note.xtype=="{note.xtype}"'),
        {'draw': 1, 'start': 0, 'length': 1}
    )
    assert response.status_code == HTTPStatus.OK
    response_data = json.loads(response.body.decode('utf-8'))
    assert note.xtype in response_data['data'][0]['xtype']

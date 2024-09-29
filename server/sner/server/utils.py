# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
misc utils used in server
"""

import datetime
import json
from http import HTTPStatus

import yaml
from flask import current_app, jsonify
from lark.exceptions import LarkError
from sqlalchemy_filters import apply_filters

from sner.server.scheduler.core import ExclFamily
from sner.server.sqlafilter import FILTER_PARSER
from sner.server.storage.models import SeverityEnum


class SnerJSONEncoder(json.JSONEncoder):
    """Custom encoder to handle serializations of various types used within the project"""

    def default(self, o):  # pylint: disable=method-hidden
        if isinstance(o, (ExclFamily, SeverityEnum, datetime.timedelta)):
            return str(o)

        if isinstance(o, datetime.date):
            return o.strftime('%Y-%m-%dT%H:%M:%S')

        return super().default(o)  # pragma: no cover  ; no such elements


def yaml_dump(data):
    """dump data with style"""
    return yaml.dump(data, sort_keys=False, indent=4, width=80)


def windowed_query(query, column, windowsize=5000):
    """"
    Break a Query into chunks on a given column.
    https://github.com/sqlalchemy/sqlalchemy/wiki/RangeQuery-and-WindowedRangeQuery
    """

    single_entity = query.is_single_entity
    query = query.add_columns(column).order_by(column)
    last_id = None

    while True:
        subq = query
        if last_id is not None:
            subq = subq.filter(column > last_id)
        chunk = subq.limit(windowsize).all()
        if not chunk:
            break
        last_id = chunk[-1][-1]
        for row in chunk:
            if single_entity:
                yield row[0]
            else:
                yield row[0:-1]


class FilterQueryError(Exception):
    """filter query exception"""


def filter_query(query, qfilter):
    """filter sqla query"""

    if not qfilter:
        return query

    try:
        query = apply_filters(query, FILTER_PARSER.parse(qfilter), do_auto_join=False)
    except LarkError as exc:
        mesg = str(exc).split('\n', maxsplit=1)[0]
        current_app.logger.error('failed to parse filter: %s', mesg)
        raise FilterQueryError(mesg) from None

    return query


def error_response(message, errors=None, code=HTTPStatus.BAD_REQUEST):
    """Returns a JSON error response following the Google JSON Style Guide."""
    if errors is not None:
        return jsonify({
            'apiVersion': "2.0",
            'error': {
                'code': code,
                'message': message,
                'errors': errors
            }
        }), code

    return jsonify({
        'apiVersion': "2.0",
        'error': {
            'code': code,
            'message': message
        }
    }), code

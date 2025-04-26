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
from sqlalchemy_filters.exceptions import BadFilterFormat

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
    """filter sqlalchemy query with string filter expression"""

    if not qfilter:
        return query

    try:
        query = apply_filters(query, FILTER_PARSER.parse(qfilter), do_auto_join=False)
    except LarkError as exc:
        mesg = str(exc).split('\n', maxsplit=1)[0]
        current_app.logger.error('failed to parse filter: %s', mesg)
        raise FilterQueryError(mesg) from None

    return query


def transform_to_sqlalchemy_filter(query):
    """convert RBQ to sqlalchemy-filters"""

    # Process RQB RuleType
    if "field" in query:
        model, attr = query["field"].split(".", maxsplit=1)
        return {
            "model": model,
            "field": attr,
            "op": query["operator"],
            "value": query["value"]
        }

    # Process RQB RuleGroupType
    if "combinator" in query:
        if not query["rules"]:
            return {}

        if query.get("not", False) is True:
            return {"not": [
                {query["combinator"]: [transform_to_sqlalchemy_filter(item) for item in query["rules"]]}
            ]}

        return {query["combinator"]: [transform_to_sqlalchemy_filter(item) for item in query["rules"]]}

    raise ValueError("Invalid filter")


def filter_query_jsonfilter(query, jsonfilter):
    """filter sqlalchemy query with sqlalchemy-filters expression"""

    current_app.logger.debug("jsonfilter: %s", jsonfilter)
    if not jsonfilter:  # pragma: nocover  ; won't test
        return query

    try:
        transformed = transform_to_sqlalchemy_filter(json.loads(jsonfilter))
        current_app.logger.debug("jsonfilter transformed: %s", transformed)

        if not transformed:  # pragma: nocover  ; won't test
            return query

        query = apply_filters(query, transformed, do_auto_join=False)

    except (json.JSONDecodeError, ValueError, BadFilterFormat) as exc:
        mesg = str(exc).split('\n', maxsplit=1)[0]
        current_app.logger.error('failed to apply jsonfilter: %s, %s', type(exc).__name__, mesg)
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

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
            return o.strftime("%Y-%m-%dT%H:%M:%S")

        return super().default(o)  # pragma: no cover  ; no such elements


def yaml_dump(data, **kwargs):
    """dump data with style"""
    return yaml.safe_dump(data, sort_keys=False, indent=4, width=80, **kwargs)


def windowed_query(query, column, windowsize=5000):
    """ "
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

    @classmethod
    def with_message(cls, user_message, exc):
        """factory, log exception and return exception for raise"""
        mesg = str(exc).split("\n", maxsplit=1)[0]
        current_app.logger.error("%s: %s, %s", user_message, type(exc).__name__, mesg)
        return cls(mesg)


def filter_query(query, sqlfilter):
    """filter sqlalchemy query with string filter expression"""

    if not sqlfilter:
        return query

    try:
        if isinstance(sqlfilter, str):
            sqlfilter = FILTER_PARSER.parse(sqlfilter)

        query = apply_filters(query, sqlfilter, do_auto_join=False)
    except LarkError as exc:
        raise FilterQueryError.with_message("failed to parse filter", exc) from None

    return query


def transform_to_sqlalchemy_filter(query):
    """convert RBQ to sqlalchemy-filters"""

    # Process RQB RuleType
    if "field" in query:
        model, attr = query["field"].split(".", maxsplit=1)
        return {"model": model, "field": attr, "op": query["operator"], "value": query["value"]}

    # Process RQB RuleGroupType
    if "combinator" in query:
        if not query["rules"]:
            return {}

        if query.get("not", False) is True:
            return {"not": [{query["combinator"]: [transform_to_sqlalchemy_filter(item) for item in query["rules"]]}]}

        return {query["combinator"]: [transform_to_sqlalchemy_filter(item) for item in query["rules"]]}

    raise ValueError("Invalid filter")


def filter_query_jsonfilter(query, jsonfilter):
    """filter sqlalchemy query with sqlalchemy-filters expression"""

    current_app.logger.debug("jsonfilter: %s", jsonfilter)
    if not jsonfilter:  # pragma: nocover  ; won't test
        return query

    try:
        if isinstance(jsonfilter, str):
            jsonfilter = json.loads(jsonfilter)

        transformed = transform_to_sqlalchemy_filter(jsonfilter)
        current_app.logger.debug("jsonfilter transformed: %s", transformed)

        if not transformed:  # pragma: nocover  ; won't test
            return query

        query = apply_filters(query, transformed, do_auto_join=False)

    except (json.JSONDecodeError, ValueError, BadFilterFormat) as exc:
        raise FilterQueryError.with_message("failed to apply jsonfilter", exc) from None

    return query


def error_response(message, code=HTTPStatus.BAD_REQUEST):
    """Returns a JSON error response following the Google JSON Style Guide."""

    return jsonify({"apiVersion": "2.0", "error": {"code": code, "message": message}}), code

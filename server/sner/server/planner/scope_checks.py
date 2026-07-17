# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
planner scope checks and prunnig
"""

import typing
from dataclasses import dataclass

from flask import current_app
from sqlalchemy import delete, func, not_, or_, select

from sner.server.extensions import db
from sner.server.planner.config import PlannerConfig
from sner.server.storage.models import Host, Note, Vuln


@dataclass
class ScopeCounter:
    """counter helper"""

    value: int
    total: int

    @property
    def percent(self):
        """return percent of value from total"""
        return (self.value / self.total) * 100 if self.total else float("NaN")


@dataclass
class ScopeCheck:
    """out-of-scope check DTO"""

    name: str
    model: type
    query: typing.Any
    count: int


def count_subquery(query):
    """count subquery"""
    return db.session.execute(select(func.count()).select_from(query.subquery())).scalar()


def sum_by_model(checks, model):
    """sum counts by model"""
    return sum(check.count for check in checks if check.model == model)


def filter_query_for_scope(query, scope):
    """filter query with host based scope expressions"""

    if not scope:
        return query

    scope_set = set(scope)
    expr = or_(*[Host.address.op("<<=")(net) for net in scope_set])
    return query.filter(not_(expr))


def checklist_any_pipeline(planner_config, all_checks):
    """find hosts which are not in any scan scope"""

    scope = (
        planner_config.basic_nets
        + planner_config.nuclei_nets
        + planner_config.sportmap_nets
        + planner_config.nessus_nets
        + planner_config.auror_testssl_nets
    )

    query = select(Host.id)
    query = filter_query_for_scope(query, scope)
    all_checks.append(ScopeCheck("anypipeline", Host, query, count_subquery(query)))


def checklist_nuclei(planner_config, all_checks):
    """check nuclei/sportmap scope"""

    scope = planner_config.nuclei_nets + planner_config.sportmap_nets

    query = select(Vuln.id).join(Host).filter(Vuln.xtype.ilike("nuclei.%"))
    query = filter_query_for_scope(query, scope)
    all_checks.append(ScopeCheck("nuclei/nuclei", Vuln, query, count_subquery(query)))

    query = select(Note.id).join(Host).filter(Note.xtype == "sportmap")
    query = filter_query_for_scope(query, scope)
    all_checks.append(ScopeCheck("nuclei/sportmap", Note, query, count_subquery(query)))


def checklist_nessus(planner_config, all_checks):
    """check nessus scope"""

    query = select(Vuln.id).join(Host).filter(Vuln.xtype.ilike("nessus.%"))
    query = filter_query_for_scope(query, planner_config.nessus_nets)
    all_checks.append(ScopeCheck("nessus", Vuln, query, count_subquery(query)))


def checklist_auror(planner_config, all_checks):
    """check auror scope"""

    query = select(Note.id).join(Host).filter(Note.xtype.ilike("auror.testssl.%"))
    query = filter_query_for_scope(query, planner_config.auror_testssl_nets)
    all_checks.append(ScopeCheck("auror_testssl", Note, query, count_subquery(query)))


def outofscope_check(prune=False):
    """handles data in storage that is outside the planner"s scanning scope"""

    # does not need to construct pipelines, so only config is used here
    planner_config = PlannerConfig(**current_app.config["SNER_PLANNER"])

    outofscope_checks = []
    checklist_any_pipeline(planner_config, outofscope_checks)
    checklist_nuclei(planner_config, outofscope_checks)
    checklist_nessus(planner_config, outofscope_checks)
    checklist_auror(planner_config, outofscope_checks)

    if current_app.debug:  # pragma: nocover  ; won't test
        for check in outofscope_checks:
            for item in db.session.execute(select(check.model).filter(check.model.id.in_(check.query.scalar_subquery()))).scalars():
                current_app.logger.debug("out-of-scope object: %s", item)

    if any(check.count for check in outofscope_checks) or current_app.debug:
        hosts = ScopeCounter(sum_by_model(outofscope_checks, Host), count_subquery(select(Host)))
        vulns = ScopeCounter(sum_by_model(outofscope_checks, Vuln), count_subquery(select(Vuln)))
        notes = ScopeCounter(sum_by_model(outofscope_checks, Note), count_subquery(select(Note)))
        print(
            "Out-of-scope objects\n"
            f"  Hosts: {hosts.value:-6d} / {hosts.total} ({hosts.percent:.2f})\n"
            f"  Vulns: {vulns.value:-6d} / {vulns.total} ({vulns.percent:.2f})\n"
            f"  Notes: {notes.value:-6d} / {notes.total} ({notes.percent:.2f})\n"
        )

    if prune:
        for check in outofscope_checks:
            db.session.execute(
                delete(check.model).where(check.model.id.in_(check.query.scalar_subquery())),
                execution_options={"synchronize_session": False},
            )
        db.session.commit()
        db.session.expire_all()

    return 0

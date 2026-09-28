# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
agreegate related functions
"""

import itertools
import json
import re
from pathlib import Path

from flask import current_app
from sqlalchemy import func

from sner.agreegate import AgreegateApiError, AgreegateManager
from sner.lib import is_network
from sner.server.auth.models import User
from sner.server.extensions import db

NETLISTS_FILE = "agreegate_netlists.json"


def fetch_agreegate_netlists():
    """fetch networks to be scanned from agreegate API"""

    manager = AgreegateManager.from_app_config()
    try:
        netlists_json = manager.get_networks_aggregated()
    except AgreegateApiError:  # pragma: nocover  ; won't test
        current_app.logger.error("failed to fetch agreegate netlists")
        return 1

    agreegate_netlists_path = Path(f"{current_app.config['SNER_VAR']}/{NETLISTS_FILE}")
    agreegate_netlists_path.write_text(json.dumps(netlists_json, indent=4), encoding="utf-8")
    return 0


def _merge_config(app, merge_to, add_netlist):
    """merge app and AG netlist in planner config"""
    current = app.config["SNER_PLANNER"].get(merge_to, [])
    current = sorted(list(set(current + add_netlist)))
    app.config["SNER_PLANNER"][merge_to] = current


def init_agreegate_netlists(app):
    """
    load and merge netlists from agreegate file into planner config.
    uses extension pattern ext.init_app(app)
    """

    netlists_path = Path(f"{app.config['SNER_VAR']}/{NETLISTS_FILE}")
    if (not app.config["SNER_AGREEGATE_USE_NETLISTS"]) or (not netlists_path.exists()):
        return

    app.logger.debug("merging agreegate netlists")
    netlists = json.loads(netlists_path.read_text(encoding="utf-8"))

    if ag_sner_basic := netlists.get("sner/basic"):
        filtered = list(filter(is_network, ag_sner_basic))
        _merge_config(app, "basic_nets", filtered)

    if ag_sner_nuclei := netlists.get("sner/nuclei"):
        filtered = list(filter(is_network, ag_sner_nuclei))
        _merge_config(app, "nuclei_nets", filtered)
        _merge_config(app, "sportmap_nets", filtered)

    if ag_sner_nessus := netlists.get("sner/nessus"):
        filtered = list(filter(is_network, ag_sner_nessus))
        _merge_config(app, "nessus_nets", filtered)

    if ag_auror := netlists.get("auror"):
        filtered = list(filter(is_network, ag_auror))
        _merge_config(app, "auror_testssl_nets", filtered)


def ensure_user(username, email, full_name):
    """ensure user created with attributes"""

    user = User.query.filter(func.lower(User.username) == username).one_or_none()
    if not user:
        user = User(username=username, email=email, full_name=full_name)
        db.session.add(user)
        db.session.commit()

    # TRANSITION: remove in the future
    if not user.full_name:
        user.full_name = full_name

    ensured_roles = ["user"]
    if not all(role in user.roles for role in ensured_roles):
        user.roles = list(set(user.roles + ensured_roles))

    db.session.commit()
    return user


def sync_agreegate_allowed_networks():
    """
    sync user/groups allowed_networks from agreegate

    * ensure users by EINFRA AAI EPUI (ag > sner), will allow user registration in one system only
      making AgreeGate kind of IDP+authz source

    * set wildcard api_networks for users in ag.roles maintainer, observer

    * set api_network as coresponding groups allowed_networks for ag user roles of user, viewer, editor
    """

    manager = AgreegateManager.from_app_config()
    epui_regexp = re.compile(r"^[a-zA-Z0-9]+@einfra.cesnet.cz$")
    ag_groups = manager.get_groups()
    ag_users = manager.get_usergroups()

    for ag_user in ag_users:
        if not epui_regexp.match(ag_user.username):
            current_app.logger.debug(f"user {ag_user.username}/{ag_user.email}, skipping not einfra aai")
            continue

        sner_user = ensure_user(ag_user.username, ag_user.email, ag_user.full_name)
        sner_user.active = ag_user.enabled

        if ag_user.role in ["maintainer", "observer+editor", "observer"]:
            current_app.logger.debug(f"user {ag_user.username}/{ag_user.email}, synced with all networks")
            sner_user.api_networks = ["0.0.0.0/0", "::/0"]
            continue

        if ag_user.role in ["viewer", "editor"]:
            current_app.logger.debug(f"user {ag_user.username}/{ag_user.email}, synced with groups allowed_networks")
            sync_groups = [group for group in ag_groups if group.name in ag_user.groups]
            groups_networks = itertools.chain.from_iterable(group.allowed_networks for group in sync_groups)
            sner_user.api_networks = groups_networks

    db.session.commit()
    return 0

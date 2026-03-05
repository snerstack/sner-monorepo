# This file is part of sner project governed by MIT license, see the LICENSE.txt file.
"""storage service-list command functions"""

import json

from sner.server.storage.models import Host, Service
from sner.server.utils import filter_query
from sner.targets import NamedServiceTarget, ServiceTarget


def _format_servicetarget(svc):
    return str(ServiceTarget(svc.host.address, svc.proto, svc.port))


def _format_namedservicetarget(svc):
    return str(NamedServiceTarget(svc.host.address, svc.proto, svc.port, svc.host.hostname or svc.host.address))


def _format_address(svc):
    return svc.host.address


def _format_hostname(svc):
    return svc.host.hostname or svc.host.address


def _format_addressport(svc):
    return f"{svc.host.address} {svc.port}"


def _format_hostnameport(svc):
    return f"{svc.host.hostname or svc.host.address} {svc.port}"


def _format_full(svc):
    return f"{svc.host.address} {svc.proto} {svc.port} {svc.name} {svc.state} {json.dumps(svc.info)}"


def _format_fullhostname(svc):
    return (
        f"{svc.host.hostname or svc.host.address} {svc.proto} {svc.port} {svc.name} {svc.state} {json.dumps(svc.info)}"
    )


FORMAT_FUNCTIONS = {
    "servicetarget": _format_servicetarget,
    "namedservicetarget": _format_namedservicetarget,
    "address": _format_address,
    "hostname": _format_hostname,
    "addressport": _format_addressport,
    "hostnameport": _format_hostnameport,
    "full": _format_full,
    "fullhostname": _format_fullhostname,
}


def service_list(filterstr, formatstr):
    """returns formatted list of services"""
    # list can be big, stream the output

    query = Service.query.join(Host)
    query = filter_query(query, filterstr)
    format_func = FORMAT_FUNCTIONS.get(formatstr)
    yield from (format_func(svc) for svc in query.all())

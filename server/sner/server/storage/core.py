# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
scheduler module functions
"""

import json
from csv import DictWriter, QUOTE_ALL
from collections import namedtuple
from http import HTTPStatus
from io import StringIO
from typing import Union

from flask import current_app
from sqlalchemy import and_, case, cast, delete, func, or_, not_, select, update, tuple_
from sqlalchemy.dialects.postgresql import ARRAY as pg_ARRAY
from sqlalchemy.sql.functions import coalesce

from sner.server.extensions import db
from sner.server.storage.forms import AnnotateForm
from sner.server.storage.models import Host, Note, Service, Vuln, SeverityEnum
from sner.server.utils import filter_query, windowed_query, error_response


def get_related_models(model_name, model_id):
    """get related host/service to bind vuln/note"""

    host, service = None, None
    if model_name == 'host':
        host = db.session.get(Host, model_id)
    elif model_name == 'service':
        service = db.session.get(Service, model_id)
        host = service.host
    return host, service


def model_annotate(model, model_id):
    """annotate model route"""

    model = db.session.get(model, model_id)
    form = AnnotateForm(obj=model)

    if form.validate_on_submit():
        form.populate_obj(model)
        db.session.commit()
        return '', HTTPStatus.OK

    return error_response(message='Form is invalid.', errors=form.errors, code=HTTPStatus.BAD_REQUEST)    # pragma: no cover


def tag_add(model, tag: Union[str, list]):
    """add tag to model in sqla trackable way"""

    val = [tag] if isinstance(tag, str) else tag
    model.tags = list(set((model.tags or []) + val))


def tag_remove(model, tag: Union[str, list]):
    """remove tag from model in sqla trackable way"""

    val = [tag] if isinstance(tag, str) else tag
    model.tags = list(set(model.tags or []) - set(val))


def model_tag_multiid(model_class, action, tag, ids):
    """tag model by id"""

    for item in model_class.query.filter(model_class.id.in_(ids)).all():
        # full assignment must be used for sqla to realize the change
        if action == 'set':
            tag_add(item, tag)
        if action == 'unset':
            tag_remove(item, tag)
        db.session.commit()


def model_delete_multiid(model_class, ids):
    """delete models by list of ids"""

    db.session.execute(
        delete(model_class)
        .filter(model_class.id.in_(ids))
        .execution_options(synchronize_session=False)
    )
    db.session.commit()
    db.session.expire_all()


def url_for_ref(ref):
    """generate url for ref; reimplemented js function storage pagepart url_for_ref"""

    refgen = {
        'URL': lambda d: d,
        'CVE': lambda d: 'https://cvedetails.com/cve/CVE-' + d,
        'NSS': lambda d: 'https://www.tenable.com/plugins/nessus/' + d,
        'BID': lambda d: 'https://www.securityfocus.com/bid/' + d,
        'CERT': lambda d: 'https://www.kb.cert.org/vuls/id/' + d,
        'EDB': lambda d: 'https://www.exploit-db.com/exploits/' + d.replace('ID-', ''),
        'MSF': lambda d: 'https://www.rapid7.com/db/?q=' + d,
        'MSFT': lambda d: 'https://technet.microsoft.com/en-us/security/bulletin/' + d,
        'MSKB': lambda d: 'https://support.microsoft.com/en-us/help/' + d,
        'SN': lambda d: 'SN-' + d,
        'SV': lambda d: 'SV-' + d
    }
    try:
        matched = ref.split('-', maxsplit=1)
        return refgen[matched[0]](matched[1])
    except (IndexError, KeyError):
        pass
    return ref


def trim_rdata(rdata):
    """trimdata if requested by app config, spreadsheet processors has issues if cell data is larger than X"""

    content_trimmed = False
    for key, val in rdata.items():
        if current_app.config['SNER_TRIM_REPORT_CELLS'] and val and (len(val) > current_app.config['SNER_TRIM_REPORT_CELLS']):
            rdata[key] = 'TRIMMED'
            content_trimmed = True
    return rdata, content_trimmed


def list_to_lines(data):
    """cast list to lines or empty string"""

    return '\n'.join(data) if data else ''


def filtered_vuln_tags_query(prefix_filter):
    """
    returns sqlalchemy selectable

    # note

    model.tags attributes are postgresql arrays. vuln grouping views and report
    generation aggregates vulns also by tags. some tags (tags ignored by
    configurable prefix) are to be omitted in aggregation. postgresql does
    account array item order (eg [1,2] != [2,1]). to support required function,
    coresponding aggregation sql should:
      * create subquery for each vuln with unnested tags (also sort)
      * filter out "prefixed" values from tags and regroup the data in another subquery
      * use result as outerjoin table/query to actual data query from vuln table
    """

    utags_column = func.unnest(Vuln.tags).label('utags')
    tags_query = (
        select(Vuln.id, utags_column)
        .select_from(Vuln)
        .order_by(Vuln.id, utags_column)
        .subquery()
    )
    filtered_tags_query = (
        select(tags_query.c.id, func.array_agg(tags_query.c.utags).label('utags'))
        .filter(not_(tags_query.c.utags.ilike(f'{prefix_filter}%')))
        .group_by(tags_query.c.id)
        .subquery()
    )
    tags_column = func.coalesce(filtered_tags_query.c.utags, cast([], pg_ARRAY(db.String)))  # pylint: disable=assignment-from-no-return

    return filtered_tags_query, tags_column


def vuln_report(qfilter=None, group_by_host=False):  # pylint: disable=too-many-locals
    """generate report from storage data"""

    vuln_severity = func.text(Vuln.severity)
    vuln_tags_query, vuln_tags_column = filtered_vuln_tags_query(current_app.config["SNER_VULN_GROUP_IGNORE_TAG_PREFIX"])

    host_address_format = case(
        (func.family(Host.address) == 6, func.concat('[', func.host(Host.address), ']')),
        else_=func.host(Host.address)
    )
    host_ident_format = coalesce(Vuln.via_target, Host.hostname, host_address_format)

    host_ident = func.array_agg(func.distinct(host_ident_format))
    endpoint_address = func.array_agg(func.distinct(func.concat_ws(':', host_address_format, Service.port)))
    endpoint_hostname = func.array_agg(func.distinct(func.concat_ws(':', host_ident_format, Service.port)))

    unnested_refs_query = select(Vuln.id, func.unnest(Vuln.refs).label('ref')).subquery()
    unnested_refs_column = func.array_remove(func.array_agg(func.distinct(unnested_refs_query.c.ref)), None)

    vuln_ids = func.array_agg(Vuln.id)
    vuln_xtypes = func.array_remove(func.array_agg(func.distinct(Vuln.xtype)), None)

    query = (
        db.session.query(
            Vuln.name.label('vulnerability'),
            Vuln.descr.label('description'),
            vuln_severity.label('severity'),
            vuln_tags_column.label('tags'),
            host_ident.label('host_ident'),
            endpoint_address.label('endpoint_address'),
            endpoint_hostname.label('endpoint_hostname'),
            unnested_refs_column.label('references'),
            vuln_ids.label('vuln_ids'),
            vuln_xtypes.label('xtype')
        )
        .outerjoin(Host, Vuln.host_id == Host.id)
        .outerjoin(Service, Vuln.service_id == Service.id)
        .outerjoin(vuln_tags_query, Vuln.id == vuln_tags_query.c.id)
        .outerjoin(unnested_refs_query, Vuln.id == unnested_refs_query.c.id)
        .group_by(Vuln.name, Vuln.descr, Vuln.severity, vuln_tags_query.c.utags)
    )

    if group_by_host:
        query = query.group_by(host_ident_format)

    query = filter_query(query, qfilter)

    content_trimmed = False
    fieldnames = [
        'id', 'asset', 'vulnerability', 'severity', 'advisory', 'state',
        'endpoint_address', 'description', 'endpoint_hostname', 'references', 'tags', 'xtype'
    ]
    output_buffer = StringIO()
    output = DictWriter(output_buffer, fieldnames, restval='', extrasaction='ignore', quoting=QUOTE_ALL)

    output.writeheader()
    for row in query.all():
        rdata = row._asdict()

        # must count endpoints, multiple addrs can coline in hostnames
        if group_by_host:
            rdata['asset'] = rdata['host_ident'][0]
        else:
            rdata['asset'] = rdata['host_ident'][0] if len(rdata['endpoint_address']) == 1 else 'misc'

        if 'report:data' in rdata['tags']:
            if not rdata['description']:  # pragma: nocover  ; wont test
                rdata['description'] = ''

            query = Vuln.query.filter(Vuln.id.in_(rdata['vuln_ids']))
            for vdata in query.all():
                idents = [
                    f'IP: {vdata.host.address}',
                    f'Proto: {vdata.service.proto}, Port: {vdata.service.port}' if vdata.service else None,
                    f'Hostname: {vdata.host.hostname}' if vdata.host.hostname else None,
                    f'Via-target: {vdata.via_target}' if vdata.via_target else None
                ]
                data_ident = ', '.join(filter(lambda x: x is not None, idents))
                rdata['description'] += f"\n\n## Data {data_ident}\n{vdata.data}"

        for col in ['endpoint_address', 'endpoint_hostname', 'tags', 'xtype']:
            rdata[col] = list_to_lines(rdata[col])
        rdata['references'] = list_to_lines(map(url_for_ref, rdata['references']))

        rdata, trim_trigger = trim_rdata(rdata)
        content_trimmed |= trim_trigger
        output.writerow(rdata)

    if content_trimmed:
        output.writerow({'asset': 'WARNING: some cells were trimmed'})
    return output_buffer.getvalue()


def vuln_export(qfilter=None):
    """export all vulns in storage without aggregation"""

    host_address_format = case(
        (func.family(Host.address) == 6, func.concat('[', func.host(Host.address), ']')),
        else_=func.host(Host.address)
    )
    host_ident = coalesce(Vuln.via_target, Host.hostname, host_address_format)
    endpoint_address = func.concat_ws(':', host_address_format, Service.port)
    endpoint_hostname = func.concat_ws(':', host_ident, Service.port)

    query = db.session \
        .query(
            host_ident.label('host_ident'),
            Vuln.name.label('vulnerability'),
            Vuln.descr.label('description'),
            Vuln.data,
            func.text(Vuln.severity).label('severity'),
            Vuln.tags,
            endpoint_address.label('endpoint_address'),
            endpoint_hostname.label('endpoint_hostname'),
            Vuln.refs.label('references')
        ) \
        .outerjoin(Host, Vuln.host_id == Host.id) \
        .outerjoin(Service, Vuln.service_id == Service.id)

    query = filter_query(query, qfilter)

    content_trimmed = False
    fieldnames = [
        'id', 'host_ident', 'vulnerability', 'severity', 'description', 'data',
        'tags', 'endpoint_address', 'endpoint_hostname', 'references'
    ]
    output_buffer = StringIO()
    output = DictWriter(output_buffer, fieldnames, restval='', quoting=QUOTE_ALL)

    output.writeheader()
    for row in query.all():
        rdata = row._asdict()

        rdata['tags'] = list_to_lines(rdata['tags'])
        rdata['references'] = list_to_lines(map(url_for_ref, rdata['references']))
        rdata, trim_trigger = trim_rdata(rdata)
        content_trimmed |= trim_trigger
        output.writerow(rdata)

    if content_trimmed:
        output.writerow({'host_ident': 'WARNING: some cells were trimmed'})
    return output_buffer.getvalue()


class StorageManager:
    """storage app logic"""

    @staticmethod
    def get_six_addresses(filternets=None):
        """return all host ipv6 addresses"""

        query = select(Host.address).filter(func.family(Host.address) == 6)
        if filternets:
            restrict = [Host.address.op('<<=')(net) for net in filternets]
            query = query.filter(or_(*restrict))

        return db.session.connection().execute(query).scalars().all()

    @staticmethod
    def get_hosts(filternets, rescan_horizont):
        """query all hosts in filternets and/or with host.rescan_time over rescan_horizont"""

        query = Host.query

        if filternets:
            restrict = [Host.address.op('<<=')(net) for net in filternets]
            query = query.filter(or_(*restrict))

        if rescan_horizont:
            query = query.filter(or_(Host.rescan_time < rescan_horizont, Host.rescan_time == None))  # noqa: E711,E501  pylint: disable=singleton-comparison

        yield from windowed_query(query, Host.id)

    @staticmethod
    def update_hosts_rescantime(ids, value):
        """update rescantime on host objects by ids"""
        # orm is bypassed for performance reasons in case of large rescans
        db.session.connection().execute(update(Host).where(Host.id.in_(ids)).values(rescan_time=value))
        db.session.commit()
        db.session.expire_all()

    @staticmethod
    def get_services(filternets, rescan_horizont):
        """query all services in filternets and/or service.rescan_time rescan_horizont"""

        query = Service.query.filter(Service.state.ilike("open:%"))

        if filternets:
            restrict = [Host.address.op("<<=")(net) for net in filternets]
            query = query.join(Host).filter(or_(*restrict))

        if rescan_horizont:
            query = query.filter(or_(Service.rescan_time < rescan_horizont, Service.rescan_time == None))  # noqa: E711,E501  pylint: disable=singleton-comparison

        yield from windowed_query(query, Service.id)

    @staticmethod
    def update_services_rescantime(ids, value):
        """update rescantime on service objects by ids"""
        # orm is bypassed for performance reasons in case of large rescans
        db.session.connection().execute(update(Service).where(Service.id.in_(ids)).values(rescan_time=value))
        db.session.commit()
        db.session.expire_all()

    @staticmethod
    def cleanup_storage():
        """clean up storage from various import artifacts"""
        # bypassing ORM for performance reasons
        conn = db.session.connection()

        # remove any but open:* state services
        services_to_delete = conn.execute(select(
            Service.id,
            Service.proto,
            Service.port,
            Host.address.label('host_address')
        ).join(Host).filter(not_(Service.state.ilike('open:%')))).all()
        for srow in services_to_delete:
            current_app.logger.info(
                    "storage update delete service "
                    f"<Service {srow.id}: {srow.host_address} {srow.proto}.{srow.port}>"
            )
        conn.execute(delete(Service).filter(Service.id.in_([srow.id for srow in services_to_delete])))

        # remove hosts without any data attribute, service, vuln or note
        hosts_noinfo = conn.execute(
            select(Host.id).filter(or_(Host.os == '', Host.os == None), or_(Host.comment == '', Host.comment == None))  # noqa: E501,E711  pylint: disable=singleton-comparison
        ).scalars().all()
        hosts_noservices = conn.execute(
            select(Host.id).outerjoin(Service).having(func.count(Service.id) == 0).group_by(Host.id)
        ).scalars().all()
        hosts_novulns = conn.execute(select(Host.id).outerjoin(Vuln).having(func.count(Vuln.id) == 0).group_by(Host.id)).scalars().all()
        hosts_nonotes = conn.execute(select(Host.id).outerjoin(Note).having(func.count(Note.id) == 0).group_by(Host.id)).scalars().all()

        hosts_to_delete = list(set(hosts_noinfo) & set(hosts_noservices) & set(hosts_novulns) & set(hosts_nonotes))
        for host in conn.execute(select(Host.id, Host.address, Host.hostname).filter(Host.id.in_(hosts_to_delete))).all():
            current_app.logger.info(f'storage update delete host <Host {host.id}: {host.address} {host.hostname}>')
        conn.execute(delete(Host).filter(Host.id.in_(hosts_to_delete)))

        # TODO: REMOVE, xtype hostnames were dropped
        # also remove all hosts not having any info but one note xtype hostnames
        hosts_only_one_note = conn.execute(select(Host.id).outerjoin(Note).having(func.count(Note.id) == 1).group_by(Host.id)).scalars().all()
        hosts_only_note_hostnames = conn.execute(
            select(Host.id).join(Note).filter(Host.id.in_(hosts_only_one_note), Note.xtype == 'hostnames')
        ).scalars().all()

        hosts_to_delete = list(set(hosts_noinfo) & set(hosts_noservices) & set(hosts_novulns) & set(hosts_only_note_hostnames))
        for host in conn.execute(select(Host.id, Host.address, Host.hostname).filter(Host.id.in_(hosts_to_delete))).all():
            current_app.logger.info(f'storage update delete host <Host {host.id}: {host.address} {host.hostname}>')
        conn.execute(delete(Host).filter(Host.id.in_(hosts_to_delete)))

        db.session.commit()
        db.session.expire_all()

    @staticmethod
    def get_host(address, addtags=None, create=True):
        """get'n'create storage host"""
        host = Host.query.filter(Host.address == address).one_or_none()
        if create and not host:
            host = Host(address=address)
            if addtags:
                tag_add(host, addtags)
            db.session.add(host)
            db.session.commit()
        return host

    @staticmethod
    def get_service(address, proto, port, addtags=None, create=True):
        """get'n'create storage service"""
        service = (
            Service.query.outerjoin(Host)
            .filter(Host.address == address, Service.proto == proto, Service.port == port)
            .one_or_none()
        )
        if create and not service:
            host = StorageManager.get_host(address, addtags=addtags)
            service = Service(host=host, proto=proto, port=port)
            if addtags:
                tag_add(service, addtags)
            db.session.add(service)
            db.session.commit()

        return service

    @staticmethod
    def get_vuln(address, proto, port, xtype, name, via_target, source=None, addtags=None, create=True):  # noqa: E501  pylint: disable=too-many-arguments,too-many-positional-arguments
        """get'n'create storage vuln"""
        query = (
            Vuln.query.outerjoin(Host, Vuln.host_id == Host.id)
            .outerjoin(Service, Vuln.service_id == Service.id)
            .filter(
                Host.address == address,
                Vuln.xtype == xtype,
                Vuln.name == name,
                Vuln.via_target == via_target,
                Vuln.source == source,
            )
        )
        if (proto is not None) and (port is not None):
            query = query.filter(Service.proto == proto, Service.port == port)

        vuln = query.one_or_none()
        if create and not vuln:
            host = StorageManager.get_host(address, addtags=addtags)
            service = (
                StorageManager.get_service(address=address, proto=proto, port=port, addtags=addtags)
                if (proto is not None) and (port is not None)
                else None
            )
            vuln = Vuln(
                host=host,
                service=service,
                xtype=xtype,
                name=name,
                via_target=via_target,
                source=source,
                severity=SeverityEnum.UNKNOWN,
            )
            if addtags:
                tag_add(vuln, addtags)
            db.session.add(vuln)
            db.session.commit()

        return vuln

    @staticmethod
    def get_note(address, proto, port, xtype, via_target, source=None, addtags=None, create=True):  # noqa: E501  pylint: disable=too-many-arguments,too-many-positional-arguments
        """get'n'create storage note"""
        query = (
            Note.query.outerjoin(Host, Note.host_id == Host.id)
            .outerjoin(Service, Note.service_id == Service.id)
            .filter(
                Host.address == address,
                Note.xtype == xtype,
                Note.via_target == via_target,
                Note.source == source,
            )
        )
        if (proto is not None) and (port is not None):
            query = query.filter(Service.proto == proto, Service.port == port)

        note = query.one_or_none()
        if create and not note:
            host = StorageManager.get_host(address, addtags=addtags)
            service = (
                StorageManager.get_service(address=address, proto=proto, port=port, addtags=addtags)
                if (proto is not None) and (port is not None)
                else None
            )
            note = Note(host=host, service=service, xtype=xtype, via_target=via_target, source=source)
            if addtags:
                tag_add(note, addtags)
            db.session.add(note)
            db.session.commit()

        return note

    @staticmethod
    def import_parsed(pidb, source=None, addtags=None):
        """import pidb objects into storage"""

        for item in pidb.hosts:
            dbhost = StorageManager.get_host(*pidb.ident(item), addtags=addtags)
            dbhost.update(item)

        for item in pidb.services:
            dbservice = StorageManager.get_service(*pidb.ident(item), addtags=addtags)
            dbservice.update(item)

        for item in pidb.vulns:
            dbvuln = StorageManager.get_vuln(*pidb.ident(item), source=source, addtags=addtags)
            dbvuln.update(item)

        for item in pidb.notes:
            dbnote = StorageManager.get_note(*pidb.ident(item), source=source, addtags=addtags)
            dbnote.update(item)

        db.session.commit()

    @staticmethod
    def import_parsed_dryrun(pidb):
        """simulate import pidb objects into storage"""

        for item in pidb.hosts:
            if not StorageManager.get_host(*pidb.ident(item), create=False):
                print(f"storage update new host: {item}")

        for item in pidb.services:
            if not StorageManager.get_service(*pidb.ident(item), create=False):
                print(f"storage update new service: {item}")

        for item in pidb.vulns:
            if not StorageManager.get_vuln(*pidb.ident(item), create=False):
                print(f"storage update new vuln: {item}")

        for item in pidb.notes:
            if not StorageManager.get_note(*pidb.ident(item), create=False):
                print(f"storage update new note: {item}")

    @staticmethod
    def prune_service_scoped_items(item_model, pidb, source):
        """prune items from storage based on pidb target scope, queue name and service idents"""

        # select storage items by pidb scanning scope
        target_scopes = pidb.target_scopes()
        items_to_check = (
            item_model.query.outerjoin(Host, item_model.host_id == Host.id)
            .outerjoin(Service, item_model.service_id == Service.id)
            .filter(
                tuple_(Host.address, Service.proto, Service.port, item_model.via_target).in_(target_scopes),
                item_model.source == source,
            )
        )

        # select items to delete, items from target scope not present in pidb
        collection = {Note: "notes", Vuln: "vulns"}
        upsert_map = pidb.idents(getattr(pidb, collection[item_model]))
        items_to_delete = [item.id for item in items_to_check if item.ident() not in upsert_map]

        # prune storage
        if items_to_delete:
            item_model.query.filter(item_model.id.in_(items_to_delete)).delete()
            db.session.commit()

        return len(items_to_delete)

    @staticmethod
    def prune_host_scoped_items(item_model, pidb, source):
        """prune storage items based on pidb target scope, queue name and host idents"""

        # select storage items by pidb scanning scope
        target_scopes = pidb.target_scopes()
        items_to_check = (
            item_model.query.outerjoin(Host, item_model.host_id == Host.id)
            .filter(
                Host.address.in_(target_scopes),
                item_model.source == source,
            )
        )

        # select items to delete, items from target scope not present in pidb
        collection_name = {Note: "notes", Vuln: "vulns"}
        upsert_map = pidb.idents(getattr(pidb, collection_name[item_model]))
        items_to_delete = [item.id for item in items_to_check if item.ident() not in upsert_map]

        # prune storage
        if items_to_delete:
            item_model.query.filter(item_model.id.in_(items_to_delete)).delete()
            db.session.commit()

        return len(items_to_delete)

    @staticmethod
    def get_tls_services(filternets):
        """returns services which are supposedly of TLS/SSL type, resp. having nmap.ssl-cert note"""

        query = (
            select(Service)
            .join(Note, Note.service_id == Service.id)
            .filter(Service.proto == "tcp", Service.state.ilike("open:%"), Note.xtype == "nmap.ssl-cert")
        )
        if filternets:
            restrict = [Host.address.op("<<=")(net) for net in filternets]
            query = query.join(Host, Service.host_id == Host.id).filter(or_(*restrict))

        return db.session.execute(query).scalars()

    @staticmethod
    def get_hostnames_map(host_ids=None):
        """returns host-hostnames map"""

        MapItem = namedtuple("HostnamesMapItem", ["address", "hostnames"])
        hostnames_map = {}

        query = (
            select(Host.id, Host.address, Host.hostname, Note.data)
            .select_from(Host)
            .outerjoin(Note, and_(Note.host_id == Host.id, Note.xtype == "auror.hostnames"))
        )
        if host_ids:
            query = query.filter(Host.id.in_(host_ids))

        for host_id, host_address, host_hostname, data in db.session.execute(query):
            hostnames = set()
            if data:
                hostnames.update(json.loads(data))
            if not hostnames:
                hostnames.add(host_hostname or host_address)
            hostnames_map[host_id] = MapItem(host_address, hostnames)

        return hostnames_map

    @staticmethod
    def get_aurortestssl_notesmap():
        """returns map for auror.testssl.% notes per-host"""

        MapKey = namedtuple("MapKey", ["host_id", "via_target"])
        notes_map = {}

        query = (
            select(Note.host_id, Note.via_target, func.array_agg(Note.id))
            .select_from(Note)
            .filter(Note.xtype.ilike("auror.testssl.%"))
            .group_by(Note.host_id, Note.via_target)
        )

        for host_id, via_target, note_ids in db.session.execute(query):
            notes_map[MapKey(host_id, via_target)] = note_ids

        return notes_map

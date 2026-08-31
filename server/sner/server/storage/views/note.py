# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
storage note views
"""

import json
from http import HTTPStatus

from datatables import ColumnDT, DataTables
from flask import Response, jsonify, request
from sqlalchemy import func, literal_column

from sner.server.auth.core import session_required
from sner.server.extensions import db
from sner.server.storage.core import get_related_models, model_annotate, model_delete_multiid, model_tag_multiid
from sner.server.storage.models import Host, Note, Service
from sner.server.storage.schemas import AnnotateRequest, MultiidRequest, NoteRequest, TagMultiidRequest
from sner.server.storage.views import blueprint
from sner.server.utils import SnerJSONEncoder, error_response, filter_query


@blueprint.route("/note/list.json", methods=["GET", "POST"])
@session_required("operator")
def note_list_json_route():
    """list notes, data endpoint"""

    columns = [
        ColumnDT(literal_column("1"), mData="_select", search_method="none", global_search=False),
        ColumnDT(Note.id, mData="id"),
        ColumnDT(Host.id, mData="host_id"),
        ColumnDT(Host.address, mData="host_address"),
        ColumnDT(Host.hostname, mData="host_hostname"),
        # break pylint duplicate-code
        ColumnDT(Service.proto, mData="service_proto"),
        ColumnDT(Service.port, mData="service_port"),
        ColumnDT(func.concat_ws("/", Service.port, Service.proto), mData="service"),
        ColumnDT(Note.via_target, mData="via_target"),
        ColumnDT(Note.xtype, mData="xtype"),
        ColumnDT(Note.data, mData="data"),
        ColumnDT(Note.tags, mData="tags"),
        ColumnDT(Note.comment, mData="comment"),
        ColumnDT(Note.created, mData="created"),
        ColumnDT(Note.modified, mData="modified"),
        ColumnDT(Note.import_time, mData="import_time"),
        ColumnDT(literal_column("1"), mData="_buttons", search_method="none", global_search=False),
    ]
    query = db.session.query().select_from(Note).outerjoin(Host, Note.host_id == Host.id).outerjoin(Service, Note.service_id == Service.id)
    query = filter_query(query, request.values.get("filter"))

    notes = DataTables(request.values.to_dict(), query, columns).output_result()
    return Response(json.dumps(notes, cls=SnerJSONEncoder), mimetype="application/json")


@blueprint.route("/note/view/<note_id>.json")
@session_required("operator")
def note_view_json_route(note_id):
    """view service"""

    note = db.session.get(Note, note_id)

    if note is None:
        return error_response(message="Note not found.", code=HTTPStatus.NOT_FOUND)

    return jsonify(
        {
            "id": note.id,
            "host_id": note.host.id,
            "address": note.host.address,
            "hostname": note.host.hostname,
            "service_id": getattr(note.service, "id", None),
            "service_port": getattr(note.service, "port", None),
            "service_proto": getattr(note.service, "proto", None),
            "via_target": note.via_target,
            "created": note.created,
            "modified": note.modified,
            "import_time": note.import_time,
            "xtype": note.xtype,
            "data": note.data,
            "tags": note.tags,
            "comment": note.comment,
        }
    )


@blueprint.route("/note/add/<model_name>/<model_id>", methods=["POST"])
@blueprint.arguments(NoteRequest)
@blueprint.response(HTTPStatus.OK)
@session_required("operator")
def note_add_route(args, model_name, model_id):
    """add note to host"""

    host, service = get_related_models(model_name, model_id)

    args["host_id"] = host.id
    args["service_id"] = service.id if service else None

    note = Note(**args)

    db.session.add(note)
    db.session.commit()

    return jsonify({"host_id": host.id})


@blueprint.route("/note/edit/<note_id>", methods=["GET", "POST"])
@blueprint.arguments(NoteRequest)
@blueprint.response(HTTPStatus.OK)
@session_required("operator")
def note_edit_route(args, note_id):
    """edit note"""

    note = db.session.get(Note, note_id)

    if not note:
        return error_response(message="Note not found.", code=HTTPStatus.NOT_FOUND)

    for key, value in args.items():
        setattr(note, key, value)

    db.session.commit()

    return jsonify({"message": "Note has been successfully edited."})


@blueprint.route("/note/delete/<note_id>", methods=["POST"])
@session_required("operator")
def note_delete_route(note_id):
    """delete note"""

    note = db.session.get(Note, note_id)

    if not note:
        return error_response(message="Note not found.", code=HTTPStatus.NOT_FOUND)

    db.session.delete(note)
    db.session.commit()

    return jsonify({"message": "Note has been successfully deleted."})


@blueprint.route("/note/annotate/<model_id>", methods=["POST"])
@blueprint.arguments(AnnotateRequest)
@blueprint.response(HTTPStatus.OK)
@session_required("operator")
def note_annotate_route(args, model_id):
    """annotate note"""
    return model_annotate(Note, model_id, args)


@blueprint.route("/note/delete_multiid", methods=["POST"])
@blueprint.arguments(MultiidRequest)
@blueprint.response(HTTPStatus.OK)
@session_required("operator")
def note_delete_multiid_route(args):
    """delete multiple note route"""

    model_delete_multiid(Note, args["ids"])

    return {}


@blueprint.route("/note/tag_multiid", methods=["POST"])
@blueprint.arguments(TagMultiidRequest)
@blueprint.response(HTTPStatus.OK)
@session_required("operator")
def note_tag_multiid_route(args):
    """tag multiple route"""

    model_tag_multiid(
        model_class=Note,
        action=args["action"],
        tags=args["tags"],
        ids=args["ids"]
    )

    return {}


@blueprint.route("/note/grouped.json", methods=["GET", "POST"])
@session_required("operator")
def note_grouped_json_route():
    """view grouped notes, data endpoint"""

    columns = [
        ColumnDT(Note.xtype, mData="xtype"),
        ColumnDT(func.count(Note.id), mData="cnt_notes", global_search=False),
    ]
    # join allows filter over host attrs
    query = (
        db.session.query()
        .select_from(Note)
        .outerjoin(Host, Note.host_id == Host.id)
        .outerjoin(Service, Note.service_id == Service.id)
        .group_by(Note.xtype)
    )
    query = filter_query(query, request.values.get("filter"))

    notes = DataTables(request.values.to_dict(), query, columns).output_result()
    return jsonify(notes)

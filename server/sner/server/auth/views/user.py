# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auth user views; user management
"""

from http import HTTPStatus

from datatables import ColumnDT, DataTables
from flask import jsonify, request
from flask_login import current_user
from sqlalchemy import literal_column

from sner.server.auth.core import session_required, UserManager
from sner.server.auth.forms import UserForm
from sner.server.auth.models import User
from sner.server.auth.views import blueprint
from sner.server.extensions import db
from sner.server.password_supervisor import PasswordSupervisor as PWS
from sner.server.utils import filter_query, error_response


@blueprint.route('/user/me')
def user_me_route():
    """get current user"""

    if current_user.is_authenticated:
        return jsonify({
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email,
            "roles": current_user.roles
            })

    return error_response(message='Not authenticated.', code=HTTPStatus.UNAUTHORIZED)


@blueprint.route('/user/list.json', methods=['GET', 'POST'])
@session_required('admin')
def user_list_json_route():
    """list users, data endpoint"""

    columns = [
        ColumnDT(User.id, mData='id'),
        ColumnDT(User.username, mData='username'),
        ColumnDT(User.email, mData='email'),
        ColumnDT(User.apikey.isnot(None), mData='apikey'),  # pylint: disable=no-member
        ColumnDT(User.roles, mData='roles'),
        ColumnDT(User.active, mData='active'),
        ColumnDT(literal_column('1'), mData='_buttons', search_method='none', global_search=False)
    ]
    query = db.session.query().select_from(User)
    query = filter_query(query, request.values.get('filter'))

    users = DataTables(request.values.to_dict(), query, columns).output_result()
    return jsonify(users)


@blueprint.route('/user/<user_id>.json', methods=['GET', 'POST'])
@session_required('admin')
def user_json_route(user_id):
    """get user"""

    user = User.query.get(user_id)

    return jsonify({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "roles": user.roles,
        "api_networks": user.api_networks,
        "active": user.active
        })


@blueprint.route('/user/add', methods=['POST'])
@session_required('admin')
def user_add_route():
    """add user"""

    form = UserForm()

    if form.validate_on_submit():
        user = User()
        form.populate_obj(user)
        if form.new_password.data:
            user.password = PWS.hash(form.new_password.data)
        db.session.add(user)
        db.session.commit()
        return jsonify({"message": "Successfully added a new user."})

    return error_response(message='Form is invalid.', errors=form.errors, code=HTTPStatus.BAD_REQUEST)


@blueprint.route('/user/edit/<user_id>', methods=['POST'])
@session_required('admin')
def user_edit_route(user_id):
    """edit task"""

    user = User.query.get(user_id)
    form = UserForm(obj=user)

    if form.validate_on_submit():
        form.populate_obj(user)
        if form.new_password.data:
            user.password = PWS.hash(form.new_password.data)
        db.session.commit()
        return jsonify({"message": "Successfully edited a user."})

    return error_response(message='Form is invalid.', errors=form.errors, code=HTTPStatus.BAD_REQUEST)


@blueprint.route('/user/delete/<user_id>', methods=['POST'])
@session_required('admin')
def user_delete_route(user_id):
    """delete user"""

    db.session.delete(User.query.get(user_id))
    db.session.commit()

    return jsonify({"message": "User has been successfully deleted."})


@blueprint.route('/user/apikey/<user_id>/<action>', methods=['POST'])
@session_required('admin')
def user_apikey_route(user_id, action):
    """manage apikey for user"""

    user = User.query.get(user_id)
    if user:
        if action == 'generate':
            apikey = UserManager.apikey_generate(user)
            return jsonify({'apikey': apikey}), HTTPStatus.OK

        if action == 'revoke':
            UserManager.apikey_revoke(user)
            return jsonify({'message': 'Apikey successfully revoked.'}), HTTPStatus.OK

    return error_response(message='Invalid request.', code=HTTPStatus.BAD_REQUEST)

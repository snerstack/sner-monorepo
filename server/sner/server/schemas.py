# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
shared schema objects
"""

from marshmallow import Schema, fields


class EmptyToNoneMixin:
    """empty string to None mixin for marshmallow fields"""
    def __init__(self, *args, **kwargs):
        """default allow_none, since empty string is cast to None"""
        kwargs.setdefault("allow_none", True)
        super().__init__(*args, **kwargs)

    def deserialize(self, value, attr=None, data=None, **kwargs):
        """cast empty string to None"""
        if value == "":
            value = None

        return super().deserialize(value, attr=attr, data=data, **kwargs)


class StringNoneField(EmptyToNoneMixin, fields.String):
    """string field that casts empty string to none"""


class EmailNoneField(EmptyToNoneMixin, fields.Email):
    """email field that casts empty string to none"""


class MessageResponse(Schema):
    """message schema"""
    message = fields.String()

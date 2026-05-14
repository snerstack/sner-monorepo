# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
shared schema objects
"""

from marshmallow import Schema
from marshmallow.fields import String, Email


class EmptyToNoneMixin:
    """empty string to None mixin for marshmallow fields"""
    def deserialize(self, value, attr=None, data=None, **kwargs):
        """cast empty string to None"""
        if value == "":
            value = None

        return super().deserialize(value, attr=attr, data=data, **kwargs)


class StringNoneField(EmptyToNoneMixin, String):
    """string field that casts empty string to none"""


class EmailNoneField(EmptyToNoneMixin, Email):
    """email field that casts empty string to none"""


class MessageSchema(Schema):
    """message schema"""
    message = String(dump_only=True)

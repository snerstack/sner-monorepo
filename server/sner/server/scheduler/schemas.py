# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
scheduler schema
"""

import yaml
from marshmallow import Schema, validate
from marshmallow import ValidationError as MarshmallowValidationError
from marshmallow.fields import Bool, Int, List, String
from pydantic import ValidationError as PydanticValidationError

from sner.agent.modules import REGISTERED_MODULES


def validate_agent_config(value):
    """validates module config"""
    try:
        config = yaml.safe_load(value)
    except (yaml.YAMLError, AttributeError) as exc:
        raise MarshmallowValidationError(f"Invalid YAML: {str(exc)}") from None

    if (not isinstance(config, dict)) or ("module" not in config) or (config["module"] not in REGISTERED_MODULES):
        raise MarshmallowValidationError("Invalid module specified")

    try:
        module = REGISTERED_MODULES[config["module"]]
        module.CONFIG_SCHEMA.model_validate(config)
    except PydanticValidationError as exc:
        raise MarshmallowValidationError(f"Invalid config: {str(exc)}") from None


class QueueRequest(Schema):
    """queue schema"""

    name = String(required=True, validate=validate.Length(min=1, max=250))
    config = String(required=True, validate=validate_agent_config)
    group_size = Int(required=True, validate=validate.Range(min=1))
    priority = Int(required=True)
    active = Bool(load_default=False)
    reqs = List(String(), allow_none=True)


class QueueEnqueueRequest(Schema):
    """queue enqueue schema"""

    targets = List(String(), required=True, validate=validate.Length(min=1))

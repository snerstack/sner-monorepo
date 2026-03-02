# This file is part of sner project governed by MIT license, see the LICENSE.txt file.
"""
sner config bases
"""

from pydantic import BaseModel, ConfigDict


class ConfigBase(BaseModel):
    """base model for various sner configV2-style"""
    model_config = ConfigDict(extra="forbid")

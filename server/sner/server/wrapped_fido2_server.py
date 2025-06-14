# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
yubico fido2 server wrapped for flask factory pattern delayed configuration
"""

from socket import getfqdn

from fido2.server import Fido2Server
from fido2.webauthn import PublicKeyCredentialRpEntity

import fido2.features
fido2.features.webauthn_json_mapping.enabled = False


class WrappedFido2Server(Fido2Server):
    """yubico fido2 server wrapped for flask factory pattern delayed configuration"""

    def __init__(self):
        """initialize with default rp name"""
        super().__init__(PublicKeyCredentialRpEntity(name=f'{getfqdn()} RP', id=getfqdn()))

    def init_app(self, app):
        """reinitialize on factory pattern config request"""
        ident = app.config['SNER_WEBAUTHN_RP_HOSTNAME'] or app.config['SERVER_NAME'] or getfqdn()
        super().__init__(PublicKeyCredentialRpEntity(name=f'{ident} RP', id=ident))

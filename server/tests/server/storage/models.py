# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
storage test models
"""

from factory import LazyAttribute, SubFactory

from sner.server.storage.models import Host, Note, Service, SeverityEnum, Versioninfo, Vuln, Vulnsearch
from sner.server.storage.versioninfo import versioninfo_docid
from sner.server.storage.vulnsearch import vulndata_docid
from tests import BaseModelFactory


class HostFactory(BaseModelFactory):  # pylint: disable=too-few-public-methods
    """test host model factory"""
    class Meta:  # pylint: disable=too-few-public-methods
        """test host model factory"""
        model = Host

    address = '127.128.129.130'
    hostname = 'localhost.localdomain'
    os = 'some linux'
    comment = 'testing webserver'


class ServiceFactory(BaseModelFactory):  # pylint: disable=too-few-public-methods
    """test service model factory"""
    class Meta:  # pylint: disable=too-few-public-methods
        """test service model factory"""
        model = Service

    host = SubFactory(HostFactory)
    proto = 'tcp'
    port = 22
    state = 'up:syn-ack'
    name = 'ssh'
    info = 'product: OpenSSH version: 7.4p1 Debian 10+deb9u4 extrainfo: protocol 2.0 ostype: Linux'
    comment = 'a test service comment'


class VulnFactory(BaseModelFactory):  # pylint: disable=too-few-public-methods
    """test vuln model factory"""
    class Meta:  # pylint: disable=too-few-public-methods
        """test vuln model factory"""
        model = Vuln

    host = SubFactory(HostFactory)
    service = None
    name = 'some vulnerability'
    xtype = 'scannerx.moduley'
    severity = SeverityEnum.UNKNOWN
    descr = 'a vulnerability description'
    data = 'vuln proof'
    refs = ['URL-http://localhost/ref1', 'ref2']
    tags = ['tag1', 'tag2', 'i:tag3']
    comment = 'some test vuln comment'


class NoteFactory(BaseModelFactory):  # pylint: disable=too-few-public-methods
    """test note model factory"""
    class Meta:  # pylint: disable=too-few-public-methods
        """test note model factory"""
        model = Note

    host = SubFactory(HostFactory)
    service = None
    xtype = 'testnote.xtype'
    data = 'test note data'
    comment = 'some test note comment'


class VersioninfoFactory(BaseModelFactory):  # pylint: disable=too-few-public-methods
    """test versioninfo model factory"""
    class Meta:  # pylint: disable=too-few-public-methods
        """test versioninfo model factory"""
        model = Versioninfo

    id = LazyAttribute(lambda o: versioninfo_docid(
            o.host_id,
            o.host_address,
            o.host_hostname,
            o.service_proto,
            o.service_port,
            o.via_target,
            o.product
    ))
    host_id = 400  # dangling id
    # xTODO service_id = 401  # dangling id
    host_address = '127.2.0.1'
    host_hostname = 'dummy.versioninfo.test'
    service_proto = 'tcp'
    service_port = 10
    via_target = 'virtualhost.versioninfo.test'

    product = 'dummy product'
    version = '1.2.3'
    extra = {'flags': 'dummy_flag'}

    tags = ['dummy']
    comment = ['dummy comment']


class VulnsearchFactory(BaseModelFactory):  # pylint: disable=too-few-public-methods
    """test vulnsearch model factory"""
    class Meta:  # pylint: disable=too-few-public-methods
        """test vulnsearch model factory"""
        model = Vulnsearch

    id = LazyAttribute(lambda o: vulndata_docid(o.host_address, o.service_proto, o.service_port, o.cveid))
    host_id = 400  # dangling id
    service_id = 401  # dangling id
    host_address = '127.2.0.1'
    host_hostname = 'dummy.vulnsearch.test'
    service_proto = 'tcp'
    service_port = 11
    via_target = 'virtualhost.vulnsearch.test'

    cveid = 'CVE-1999-0000'
    name = 'dummy vulnsearch name'
    description = 'dummy description'
    cvss = 3.3
    cvss3 = 3.4
    attack_vector = 'NETWORK'
    data = {"dummy": "data"}
    cpe = {'full': 'cpe:/a:apache:http_server:2.4.38'}
    cpe_full = 'cpe:/a:apache:http_server:2.4.38'

    tags = ['dummy']
    comment = ['dummy comment']

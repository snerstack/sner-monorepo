# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
SNER targets objects

## Target v1 specification
address
svc://[X]:port
sixenum://dshsdhdsahdsah
addr,host,port,tlsXY


## Target v2 specification

### Host

host,192.0.2.10
host,2001:db8::1

### Service (TCP/UDP)

svc,192.0.2.10,proto=udp,port=443
svc,2001:db8::22,proto=tcp,port=22

### NamedService

named,192.0.2.10,proto=udp,port=443,hostname=example.com

## SixEnum

sixenum,2001:db8::0-ffff

### Auror

auror,192.0.2.10,port=25,hostname=mail,enc=E
auror,2001:db8::10,port=995,hostname=mail.example.com,enc=I

"""

import re
from abc import ABC, abstractmethod
from dataclasses import dataclass
from ipaddress import ip_address, ip_network

from sner.lib import is_ipv6_address


def address_hashval(value):
    """return address hashval for scheduling heatmap"""

    prefix = 48 if is_ipv6_address(value) else 24
    return str(ip_network(f"{value}/{prefix}", strict=False))


class TargetBase(ABC):
    """defines common interface for targets"""

    @abstractmethod
    def __str__(self):
        """target-to-text serialization. str-form is used in database and in job assignment protocol"""

    @abstractmethod
    def hashval(self):
        """value used by scheduler heatmap to track destination network scanning throughtput"""

    @abstractmethod
    def scope(self):
        """storage aggregation key (composite key) which is used by storagemanager to upsert/prune data"""

    @abstractmethod
    def is_ipv6_address(self):
        """ipv6 address helper"""


@dataclass(frozen=True)
class GenericTarget(TargetBase):
    """generic/legacy target"""

    value: str

    def __str__(self):
        return self.value

    def hashval(self):
        try:
            return address_hashval(self.value)
        except ValueError:
            return self.value

    def scope(self):
        return (self.value,)

    def is_ipv6_address(self):  # pragma: nocover  ; planned
        try:
            return is_ipv6_address(self.value)
        except ValueError:
            return False


@dataclass(frozen=True)
class HostTarget(TargetBase):
    """address based target"""

    address: str

    def __str__(self):
        return f"host,{self.address}"

    def hashval(self):
        return address_hashval(self.address)

    def scope(self):
        return (self.address,)

    def is_ipv6_address(self):  # pragma: nocover  ; won't test
        return is_ipv6_address(self.address)


@dataclass(frozen=True)
class ServiceTarget(TargetBase):
    """internet tcp/udp endpoint target"""

    REGEXP = re.compile(r"svc,(?P<address>\S+),proto=(?P<proto>\S+),port=(?P<port>\d+)")

    address: str
    proto: str
    port: int

    def __str__(self):
        return f"svc,{self.address},proto={self.proto},port={self.port}"

    def hashval(self):
        return address_hashval(self.address)

    def scope(self):
        return (self.address, self.proto, self.port, self.address)

    def is_ipv6_address(self):
        return is_ipv6_address(self.address)


@dataclass(frozen=True)
class NamedServiceTarget(TargetBase):
    """internet endpoint target using also hostname"""

    REGEXP = re.compile(r"named,(?P<address>\S+),proto=(?P<proto>\S+),port=(?P<port>\d+),hostname=(?P<hostname>\S+)")

    address: str
    proto: str
    port: int
    hostname: str

    def __str__(self):
        return f"named,{self.address},proto={self.proto},port={self.port},hostname={self.hostname}"

    def hashval(self):  # pragma: nocover  ; planned
        return address_hashval(self.address)

    def scope(self):
        return (self.address, self.proto, self.port, self.hostname)

    def is_ipv6_address(self):  # pragma: nocover  ; planned
        return is_ipv6_address(self.address)


@dataclass(frozen=True)
class SixenumTarget(TargetBase):
    """scan6 ipv6 enumeration target"""

    REGEXP = re.compile(r"sixenum,(?P<scan6dst>[0-9a-fA-F:]{3,45}(\-[0-9a-fA-F]{1,4})?)")
    value: str

    def __str__(self):
        return f"sixenum,{self.value}"

    def hashval(self):
        return address_hashval(self.value.split("-")[0])

    def scope(self):  # pragma: nocover
        raise NotImplementedError

    def is_ipv6_address(self):  # pragma: nocover
        raise NotImplementedError

    def boundaries(self):
        """
        return ip_address for first/last addresses of enum;
        only last hextet range supported
        """

        if "-" in self.value:
            first, enumend = self.value.split("-")
            tmp = first.split(":")
            tmp[-1] = enumend
            last = ":".join(tmp)
            return ip_address(first), ip_address(last)

        tmp = ip_network(self.value)
        return tmp.network_address, tmp.broadcast_address


@dataclass(frozen=True)
class AurorTestsslTarget(TargetBase):
    """auror_testssl target"""

    REGEXP = re.compile(r"auror,(?P<address>\S+),port=(?P<port>\d+),hostname=(?P<hostname>\S+),enc=(?P<enc>(I|E))")

    address: str
    port: str
    hostname: str
    enc: str

    def __str__(self):
        return f"auror,{self.address},port={self.port},hostname={self.hostname},enc={self.enc}"

    def hashval(self):
        return address_hashval(self.address)

    def scope(self):
        return (self.address, "tcp", self.port, self.hostname)

    def is_ipv6_address(self):
        return is_ipv6_address(self.address)


class TargetManager:
    """target manager"""

    @classmethod
    def from_str(cls, value):
        """factory function"""

        if value.startswith("host,"):
            return HostTarget(value.split(",", maxsplit=1)[1])

        if value.startswith("svc,") and (match := ServiceTarget.REGEXP.match(value)):
            return ServiceTarget(match.group("address"), match.group("proto"), int(match.group("port")))

        if value.startswith("named,") and (match := NamedServiceTarget.REGEXP.match(value)):
            return NamedServiceTarget(match.group("address"), match.group("proto"), int(match.group("port")), match.group("hostname"))

        if value.startswith("sixenum,") and SixenumTarget.REGEXP.match(value):
            return SixenumTarget(value.split(",", maxsplit=1)[1])

        if value.startswith("auror,") and (match := AurorTestsslTarget.REGEXP.match(value)):
            return AurorTestsslTarget(match.group("address"), int(match.group("port")), match.group("hostname"), match.group("enc"))

        return GenericTarget(value)

    @classmethod
    def from_list(cls, values):
        """return list of targets from string values"""
        return list(map(cls.from_str, values))

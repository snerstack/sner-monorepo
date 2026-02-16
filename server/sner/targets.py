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

auror,192.0.2.10,hostname=mail,port=25,tls=explicit
auror,2001:db8::10,mail.example.com,ip=,port=25,tls=implicit

"""

import re
import ipaddress
from dataclasses import dataclass


def address_hashval(value):
    """return address hashval for scheduling heatmap"""

    addr = ipaddress.ip_address(value)
    if isinstance(addr, ipaddress.IPv4Address):
        prefix = 24
    elif isinstance(addr, ipaddress.IPv6Address):
        prefix = 48
    else:
        raise TypeError("invalid address")
    return str(ipaddress.ip_network(f"{addr}/{prefix}", strict=False))


@dataclass
class GenericTarget:
    """generic/legacy target"""

    value: str

    def scope(self):
        """get target scope"""
        return self.value

    def hashval(self):
        """return address hashval with value fallback"""
        try:
            return address_hashval(self.value)
        except ValueError:
            return self.value


@dataclass
class HostTarget:
    """address based target"""

    address: str

    def scope(self):
        """get target scope"""
        return (self.address,)

    def hashval(self):
        """return address hashval"""
        return address_hashval(self.address)


@dataclass
class ServiceTarget:
    """internet tcp/udp endpoint target"""

    address: str
    proto: str
    port: int

    def scope(self):
        """get target scope"""
        return (self.address, self.proto, self.port, self.address)

    def __str__(self):
        return f"svc,{self.address},proto={self.proto},port={self.port}"

    def hashval(self):
        """return address hashval"""
        return address_hashval(self.address)


@dataclass
class NamedServiceTarget:
    """internet endpoint target using also hostname"""

    address: str
    proto: str
    port: int
    hostname: str

    def scope(self):
        """get target scope"""
        return (self.address, self.proto, self.port, self.hostname)

    def hashval(self):
        """return address hashval"""
        return address_hashval(self.address)


@dataclass
class SixenumTarget:
    """scan6 ipv6 enumeration target"""

    REGEXP = re.compile(r"sixenum,(?P<scan6dst>[0-9a-fA-F:]{3,45}(\-[0-9a-fA-F]{1,4})?)")
    value: str

    def __str__(self):
        return f"sixenum,{self.value}"

    def hashval(self):
        """return address hashval"""
        return address_hashval(self.value.split("-")[0])

    def boundaries(self):
        """
        return ip_address for first/last addresses of enum;
        only last hextet range supported
        """

        if '-' in self.value:
            first, enumend = self.value.split('-')
            tmp = first.split(':')
            tmp[-1] = enumend
            last = ':'.join(tmp)
            return ipaddress.ip_address(first), ipaddress.ip_address(last)

        tmp = ipaddress.ip_network(self.value)
        return tmp.network_address, tmp.broadcast_address


class TargetManager:
    """target manager"""

    @classmethod
    def from_str(cls, value):
        """factory function"""

        if value.startswith("host,"):
            return HostTarget(value.split(",", maxsplit=1)[1])

        if value.startswith("svc,"):
            regex = r"svc,(?P<address>\S+),proto=(?P<proto>\S+),port=(?P<port>\d+)"
            match = re.match(regex, value)
            return ServiceTarget(match.group("address"), match.group("proto"), int(match.group("port")))

        if value.startswith("named,"):
            regex = r"named,(?P<address>\S+),proto=(?P<proto>\S+),port=(?P<port>\d+),hostname=(?P<hostname>\S+)"
            match = re.match(regex, value)
            return NamedServiceTarget(
                match.group("address"), match.group("proto"), int(match.group("port")), match.group("hostname")
            )

        if value.startswith("sixenum,") and SixenumTarget.REGEXP.match(value):
            return SixenumTarget(value.split(",", maxsplit=1)[1])

        return GenericTarget(value)

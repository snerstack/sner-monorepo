# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""axfr related functions for auror_hostnames plugin"""

import logging
import socket
from dataclasses import dataclass
from typing import Optional

import dns.name
import dns.query
import dns.rcode
import dns.rdatatype
import dns.tsigkeyring
import dns.zone

logger = logging.getLogger(__name__)

DEFAULT_TSIG_ALGORITHM = "hmac-sha256"
AXFR_LIFETIME = 30


@dataclass
class TsigConfig:
    """TSIG authentication parameters for zone transfers"""

    key_name: str
    secret: str
    algorithm: str = DEFAULT_TSIG_ALGORITHM

    @property
    def keyring(self):
        """dnspython keyring for this key"""
        return dns.tsigkeyring.from_text({self.key_name: self.secret})


def resolve_nameserver(nameserver, port=53) -> Optional[str]:
    """Resolve a nameserver hostname to an IP address"""
    try:
        addrinfo = socket.getaddrinfo(nameserver, port, family=socket.AF_UNSPEC, type=socket.SOCK_STREAM)
        return addrinfo[0][4][0]
    except socket.gaierror:
        logger.error("Unable to resolve nameserver %s", nameserver)
        return None


def query_zone(nameserver, zone_str, tsig: Optional[TsigConfig] = None, attempts=10, port=53) -> Optional[dns.zone.Zone]:
    """
    Queries the dns server for zone transfer, with optional TSIG authentication.
    Nameserver may be a hostname or an IP address.
    """
    nameserver_ip = resolve_nameserver(nameserver, port)
    if not nameserver_ip:
        return None

    for attempt_num in range(1, attempts + 1):
        log_attempt = logger.debug if attempt_num < attempts / 2 else logger.warning
        log_attempt("Attempt %d/%d to get AXFR for %s", attempt_num, attempts, zone_str)
        try:
            axfr = dns.query.xfr(
                where=nameserver_ip,
                port=port,
                zone=zone_str,
                keyring=tsig.keyring if tsig else None,
                keyname=tsig.key_name if tsig else None,
                keyalgorithm=tsig.algorithm if tsig else None,
                relativize=False,
                lifetime=AXFR_LIFETIME,
            )
            zone = dns.zone.from_xfr(axfr, relativize=False)
            logger.debug("Got the AXFR for %s", zone_str)
            return zone
        except (EOFError, ConnectionError):
            logger.exception("Connection failed while getting zone %s, attempt %d/%d", zone_str, attempt_num, attempts)
        except dns.query.TransferError as exc:
            if exc.rcode == dns.rcode.NOTAUTH:
                logger.error("AXFR refused (NOTAUTH) for zone %s from %s, check server ACLs or TSIG config", zone_str, nameserver)
            else:
                logger.exception("Unable to get zone %s, skipping", zone_str)
            return None

    logger.warning("Unable to get AXFR for %s", zone_str)
    return None


def get_zones_from_catalog(catalog_zone) -> list[str]:
    """
    Extract member zone names from a DNS catalog zone.

    Catalog zones typically store members as PTR records under
    ``*.zones.<catalog-origin>``.
    """
    zones = set()
    zones_subtree = dns.name.from_text("zones", catalog_zone.origin)

    for name, node in catalog_zone.nodes.items():
        if not name.derelativize(catalog_zone.origin).is_subdomain(zones_subtree):
            continue

        # membership name is meaningless to us, we need only the PTR(s)
        ptrs = node.get_rdataset(dns.rdataclass.IN, dns.rdatatype.PTR)
        if not ptrs:
            continue

        for rdata in ptrs:
            zone_name = str(rdata.target).rstrip(".")
            if zone_name:
                zones.add(zone_name)

    return sorted(zones)


def tsig_from_source(source) -> Optional[TsigConfig]:
    """Build TSIG config from a source definition, if a key is configured"""
    key_name = source.get("tsig_key_name") or None
    secret = source.get("tsig_secret") or None
    algorithm = source.get("tsig_algorithm") or None

    if not (key_name and secret):
        return None
    if algorithm:
        return TsigConfig(key_name, secret, algorithm)
    return TsigConfig(key_name, secret)


def run(source) -> list[dns.zone.Zone]:
    """Run auror_hostnames axfr source module"""

    dns_server = source["dns_server"]
    port = source.get("port", 53)
    tsig = tsig_from_source(source)

    zone_names = source.get("list_of_zones", [])
    if catalog_zone_name := source.get("catalog_zone_name"):
        catalog_zone = query_zone(dns_server, catalog_zone_name, tsig, port=port)
        if catalog_zone:
            zone_names = get_zones_from_catalog(catalog_zone)

    zones = []
    for zone_str in zone_names:
        if zone := query_zone(dns_server, zone_str, tsig, port=port):
            zones.append(zone)
    return zones

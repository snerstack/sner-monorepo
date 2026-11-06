# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""axfr related functions for auror_hostnames plugin"""

import logging
import socket

import dns.name
import dns.query
import dns.rcode
import dns.rdatatype
import dns.tsigkeyring
import dns.zone

logger = logging.getLogger(__name__)


def query_zone(  # pylint: disable=too-many-arguments,too-many-positional-arguments
    nameserver, zone_str, tsig_key_name=None, tsig_secret=None, tsig_algorithm=None, attempts=10, port=53
) -> dns.zone.Zone | None:
    """
    Queries the dns server for zone transfer, with optional TSIG authentication.
    Nameserver may be a hostname or an IP address.
    """
    try:
        nameserver_ip = socket.getaddrinfo(nameserver, port, family=socket.AF_UNSPEC, type=socket.SOCK_STREAM)[0][4][0]
    except socket.gaierror:
        logger.error("Unable to resolve nameserver %s", nameserver)
        return None

    for attempt_num in range(1, attempts + 1):
        if attempt_num < attempts / 2:
            logger.debug("Attempt %d/%d to get AXFR for %s", attempt_num, attempts, zone_str)
        else:
            logger.warning("Attempt %d/%d to get AXFR for %s", attempt_num, attempts, zone_str)
        try:
            keyring = None
            algorithm = None
            if tsig_key_name and tsig_secret:
                keyring = dns.tsigkeyring.from_text({tsig_key_name: tsig_secret})
                algorithm = tsig_algorithm if tsig_algorithm else "hmac-sha256"
            axfr = dns.query.xfr(
                where=nameserver_ip,
                port=port,
                zone=zone_str,
                keyring=keyring,
                keyname=tsig_key_name,
                keyalgorithm=algorithm,
                relativize=False,
                lifetime=30,
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
        owner_fqdn = name.derelativize(catalog_zone.origin)
        if not owner_fqdn.is_subdomain(zones_subtree):
            continue

        for rdataset in node.rdatasets:
            if rdataset.rdtype != dns.rdatatype.PTR:
                continue

            for rdata in rdataset:
                zone_name = rdata.target.to_text().rstrip(".")
                if zone_name:
                    zones.add(zone_name)

    return sorted(zones)


def run(axfr_source) -> list[dns.zone.Zone]:
    """Run auror_hostnames module"""
    dns_server = axfr_source["dns_server"]
    port = axfr_source.get("port", 53)
    catalog_zone_name = axfr_source.get("catalog_zone_name")
    list_of_zones = axfr_source.get("list_of_zones", [])
    tsig_key_name = axfr_source.get("tsig_key_name") or None
    tsig_secret = axfr_source.get("tsig_secret") or None
    tsig_algorithm = axfr_source.get("tsig_algorithm") or None
    zones = []

    if catalog_zone_name:
        catalog_zone = query_zone(dns_server, catalog_zone_name, tsig_key_name, tsig_secret, tsig_algorithm, port=port)
        if catalog_zone:
            list_of_zones = get_zones_from_catalog(catalog_zone)

    for zone_str in list_of_zones:
        zone = query_zone(dns_server, zone_str, tsig_key_name, tsig_secret, tsig_algorithm, port=port)
        if zone:
            zones.append(zone)

    return zones

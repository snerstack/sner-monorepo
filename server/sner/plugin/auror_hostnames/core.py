# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""Core functions for auror_hostnames plugin"""

import ipaddress
import json
import logging
import os
import shutil
from pathlib import Path
from socket import getaddrinfo

import dns.rdatatype
import dns.zone

from sner.plugin.auror_hostnames import axfr, git, http
from sner.plugin.auror_hostnames.manager import AgreegateManager

logger = logging.getLogger(__name__)


def process_cnames(cnames, a_aaaa, ip_hostnames) -> dict:
    """Remove chaining of CNAME records, try to resolve IPs for aliases

    Args:
        cnames (dict): { alias: cname }
        a_aaaa (dict): { hostname: [ip1, ip2] }

    Returns:
        dict: { ip: [alias, alias] }
    """
    # perun is good example to test
    dechained_cnames = {}
    for name, target in cnames.items():
        dechained_cnames[name] = target
        while target in cnames:
            target = cnames[target]
            if target in dechained_cnames:
                raise ValueError("CNAME chain loop detected")
            dechained_cnames[name] = target

    # create reversed CNAMEs records
    cnames_rev = {}
    for alias, cname in dechained_cnames.items():
        cnames_rev.setdefault(cname, set()).add(alias)

    #  add IPs from A/AAAA records for aliases if its CNAME is among A/AAAA records
    cnames_in_a_aaaa = 0
    resolved_cnames = 0
    resolve_aliases = 0
    for cname, aliases in cnames_rev.items():
        if cname in a_aaaa:
            for alias in aliases:
                for ip in a_aaaa[cname]:
                    ip_hostnames.setdefault(ip, set()).add(alias)
                    cnames_in_a_aaaa += 1
        else:
            ips = resolve_hostname(cname)
            resolved_cnames += 1
            for ip in ips:
                ip_hostnames.setdefault(ip, set()).add(cname)
            for alias in aliases:
                resolve_aliases += 1
                ips = resolve_hostname(alias)
                for ip in ips:
                    ip_hostnames.setdefault(ip, set()).add(alias)

    logger.info("Found %s CNAMEs in A/AAAA records", cnames_in_a_aaaa)
    logger.info("Resolved %s CNAMEs to IPs", resolved_cnames)
    logger.info("Resolved %s aliases to IPs", resolve_aliases)

    return ip_hostnames


def resolve_hostname(hostname) -> list:
    """Resolve hostname to IP address
    Args:
        hostname (str): hostname
    Returns:
        list: list of IP addresses
    """
    try:
        result = getaddrinfo(hostname, None)
        ips = [ip[4][0] for ip in result]
    except OSError:
        ips = []
        logger.info("Hostname %s cannot be resolved", hostname)
    return ips


def process_ptrs(ptrs, ip_hostnames) -> dict:
    """
    Convert PTR records to IP addresses with hostnames

    Args:
        ptrs (dict): { reverse: hostname }

    Returns:
        dict: { IP: [hostname1, hostname2] }
    """
    for reverse, hostname in ptrs.items():
        if reverse.endswith(".ip6.arpa"):
            ip_int = int("".join(reversed(reverse[:-9].split("."))), 16)
            ip_addr = ipaddress.IPv6Address(ip_int)
            if not ip_addr.is_loopback:
                ip_hostnames.setdefault(format(ip_addr), set()).add(hostname[:-1])

        elif reverse.endswith(".in-addr.arpa"):
            ip_addr = ".".join(reversed(reverse[:-13].split(".")))
            if ipaddress.IPv4Address(ip_addr) and not ipaddress.IPv4Address(ip_addr).is_loopback:
                ip_hostnames.setdefault(ip_addr, set()).add(hostname[:-1])

    return ip_hostnames


def check_if_hostname(hostname) -> bool:
    """Check if hostname is valid

    Args:
        hostname (str): hostname
    Returns:
        bool: True if valid, False otherwise
    """
    symbols = ["@", "/", "*", "_"]
    if any(symbol in hostname for symbol in symbols):
        return False
    return True


def create_fqdn(record_string, origin) -> str:
    """Create FQDN from record

    Args:
        record_string (str): record
        origin (str): origin
    Returns:
        fqdn (str): FQDN
    """
    if record_string.endswith("."):
        fqdn = record_string[:-1]
    else:
        fqdn = f"{record_string}.{origin}"
    return fqdn


def parse_zone(zone, origin) -> list:
    """
    Parse a dns.zone.Zone object and extract CNAME, A/AAAA, PTR, and IP-hostname mappings.
    """
    cnames = {}
    a_aaaa = {}
    ptrs = {}
    ip_hostnames = {}
    for name, node in zone.nodes.items():  # pylint: disable=too-many-nested-blocks
        name_string = name.to_text()
        fqdn = create_fqdn(name_string, origin)
        if check_if_hostname(fqdn):
            for rdataset in node.rdatasets:
                rdatatype = rdataset.rdtype
                for rdata in rdataset:
                    rdata_string = rdata.to_text()
                    if check_if_hostname(rdata_string):
                        if rdatatype == dns.rdatatype.CNAME:
                            if not origin.endswith(".arpa"):
                                cnames[fqdn] = create_fqdn(rdata_string, origin)
                        elif rdatatype in (dns.rdatatype.A, dns.rdatatype.AAAA):
                            ip_hostnames.setdefault(rdata_string, set()).add(fqdn)
                            a_aaaa.setdefault(fqdn, set()).add(rdata_string)
                        elif rdatatype == dns.rdatatype.PTR:
                            ptrs[fqdn] = rdata_string
    return [cnames, a_aaaa, ptrs, ip_hostnames]


def get_records_from_file(zone_file_path) -> list:
    """
    Loads a zone file and parses its records.
    """
    with open(zone_file_path, encoding="utf-8") as zone_file:
        try:
            zone = dns.zone.from_file(zone_file)
            origin = zone.origin.to_text()[:-1]
        except dns.zone.UnknownOrigin:
            zone_file_name = zone_file_path.split("/")[-1]
            origin = os.path.splitext(zone_file_name)[0]
            try:
                zone = dns.zone.from_file(zone_file, origin)
            except Exception as error:  # pylint: disable=broad-exception-caught
                logger.error("Exception occurred during parsing zone file %s: %s}", zone_file_path, error)
                return [{}, {}, {}, {}]
        except Exception as error:  # pylint: disable=broad-exception-caught
            logger.error("Exception occurred during parsing zone file %s: %s}", zone_file_path, error)
            return [{}, {}, {}, {}]
    return parse_zone(zone, origin)


def get_records_from_zone(zone) -> list:
    """
    Parses a dns.zone.Zone object (e.g., from AXFR).
    """
    origin = zone.origin.to_text()[:-1]
    return parse_zone(zone, origin)


def collect_dns_sources(agreegate, groups) -> tuple:
    """Collect DNS sources from groups

    Args:
        agreegate: AgreegateManager instance
        groups: List of groups with DNS sources

    Returns:
        tuple: (dns_sources, axfr_sources, http_sources)
    """
    dns_sources = []
    for group in groups:
        dns_sources.extend(agreegate.get_group_dns_sources(group.id))

    axfr_sources = [source for source in dns_sources if source["type"] == "AXFR"]
    http_sources = [source for source in dns_sources if source["type"] == "HTTPS"]

    return dns_sources, axfr_sources, http_sources


def gather_zone_data(assignment, http_sources, axfr_sources):
    """Gather zone data from all sources

    Args:
        assignment: The assignment configuration
        http_sources: List of HTTP sources
        axfr_sources: List of AXFR sources

    Returns:
        tuple: (zone_file_paths, zones)
    """
    zone_file_paths = []
    if assignment["config"].get("git_server"):
        zone_file_paths = git.run(assignment)

    for http_source in http_sources:
        zone_file_paths += http.run(http_source)

    zones = []
    for axfr_source in axfr_sources:
        zones += axfr.run(axfr_source)

    return zone_file_paths, zones


def write_output(ip_hostnames):
    """Write the final output to JSON file"""
    if Path("dns-zones").exists():
        shutil.rmtree("dns-zones")
    Path("output.json").write_text(json.dumps(ip_hostnames, indent=4), encoding="utf-8")


def build_ip_hostnames(zone_file_paths, zones) -> dict:
    """Process and merge zone files and zones into the final ip -> hostnames mapping.

    Args:
        zone_file_paths: List of zone file paths (from git/https sources)
        zones: List of dns.zone.Zone objects (from AXFR sources)

    Returns:
        dict: { ip: [hostname, ...] }
    """
    cnames = {}
    a_aaaa = {}
    ptrs = {}
    ip_hostnames = {}

    parsed_records = [get_records_from_file(path) for path in zone_file_paths]
    parsed_records += [get_records_from_zone(zone) for zone in zones]
    for records in parsed_records:
        cnames.update(records[0])
        a_aaaa.update(records[1])
        ptrs.update(records[2])
        for ip_addr, hostnames in records[3].items():
            ip_hostnames.setdefault(ip_addr, set()).update(hostnames)

    logger.info("Found %s CNAME records", len(cnames))
    logger.info("Found %s A/AAAA records", len(a_aaaa))
    logger.info("Found %s PTR records", len(ptrs))

    ip_hostnames = process_ptrs(ptrs, ip_hostnames)
    ip_hostnames = process_cnames(cnames, a_aaaa, ip_hostnames)
    return {k: list(v) for k, v in ip_hostnames.items()}


def run(assignment):
    """Run auror_hostnames module"""

    agreegate = AgreegateManager.from_env()
    groups = agreegate.get_all_groups(only_with_dns_source=True)
    _, axfr_sources, http_sources = collect_dns_sources(agreegate, groups)

    zone_file_paths, zones = gather_zone_data(assignment, http_sources, axfr_sources)
    ip_hostnames = build_ip_hostnames(zone_file_paths, zones)

    logger.info("Found hostnames for %s IP addresses", len(ip_hostnames))

    write_output(ip_hostnames)
    return 0

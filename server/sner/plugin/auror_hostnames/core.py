# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""Core functions for auror_hostnames plugin"""

import ipaddress
import json
import os
import shutil
import subprocess
from pathlib import Path
from socket import getaddrinfo

import dns.exception
import dns.zone
import dns.rdataclass
import dns.rdatatype


def get_repos(git_server, git_key_path) -> list:
    """
    Get DNS repositories from git server
    """
    cmd = ["ssh", "-i", git_key_path, f"git@{git_server}", "info"]
    output = subprocess.check_output(cmd, text=True).splitlines()[2:]  # Skip the first line
    repos = [line.split("\t")[-1] for line in output]

    return repos


def clone_dns_repos(git_server, repos, git_key_path):
    """Clone DNS zones from git repository"""
    env = os.environ.copy()
    env["GIT_SSH_COMMAND"] = f"ssh -i {git_key_path}"
    for repo in repos:
        subprocess.run(["git", "clone", f"git@{git_server}:{repo}", f"dns-zones/{repo}"], check=True, env=env)


def get_zone_file_paths() -> set:
    """
    Get DNS zone names from git repos
    """
    repos_folder = Path("dns-zones")
    zone_file_paths = set()
    for zone_file in repos_folder.glob("**/*.zone"):
        zone_file_paths.add(str(zone_file))

    return zone_file_paths


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
    for cname, aliases in cnames_rev.items():

        if cname in a_aaaa:
            for alias in aliases:
                for ip in a_aaaa[cname]:
                    ip_hostnames.setdefault(ip, set()).add(alias)
        else:
            ips = resolve_hostname(cname)
            for ip in ips:
                ip_hostnames.setdefault(ip, set()).add(cname)
            for alias in aliases:
                ips = resolve_hostname(alias)
                for ip in ips:
                    ip_hostnames.setdefault(ip, set()).add(alias)

    return ip_hostnames


def resolve_hostname(hostname):
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


def check_if_hostname(hostname):
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


def create_fqdn(record_string, origin):
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


def get_records(zone_file_path) -> list:
    """
    Gets A and AAAA records and stores them in the format {IP1: [hostname1, hostname2], IP2: [hostname1, hostname3]}
    """
    with open(zone_file_path, "r", encoding="utf-8") as zone_file:
        try:
            zone = dns.zone.from_file(zone_file)
            origin = zone.origin.to_text()[:-1]
        except dns.zone.UnknownOrigin:
            zone_file_name = zone_file_path.split("/")[-1]
            origin = os.path.splitext(zone_file_name)[0]
            try:
                zone = dns.zone.from_file(zone_file, origin)
            except Exception as error:
                print(f"Exception occurred during parsing zone file {zone_file_path}: {error}")
                return [{}, {}, {}, {}]
        except Exception as error:
            print(f"Exception occurred during parsing zone file {zone_file_path}: {error}")
            return [{}, {}, {}, {}]

    cnames = {}
    a_aaaa = {}
    ptrs = {}
    ip_hostnames = {}
    for name, node in zone.nodes.items():
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


def check_git_key_path(git_key_path):
    """Check if git key path exists"""
    if not os.path.exists(git_key_path):
        return False
    return True


def run(assignment, logger):  # pragma: no cover
    """Run auror_hostnames module"""

    git_key_path = assignment["config"]["git_key_path"]
    git_server = assignment["config"]["git_server"]

    if check_git_key_path(git_key_path) is False:
        logger.log.error("Git key file does not exist")
        return 1

    repos = get_repos(git_server, git_key_path)
    clone_dns_repos(git_server, repos, git_key_path)
    zone_file_paths = get_zone_file_paths()

    cnames = {}
    a_aaaa = {}
    ptrs = {}
    ip_hostnames = {}

    for zone_file_path in zone_file_paths:
        result = get_records(zone_file_path)
        cnames.update(result[0])
        a_aaaa.update(result[1])
        ptrs.update(result[2])
        ip_hostnames.update(result[3])

    ip_hostnames = process_ptrs(ptrs, ip_hostnames)
    ip_hostnames = process_cnames(cnames, a_aaaa, ip_hostnames)
    ip_hostnames = {k: list(v) for k, v in ip_hostnames.items()}

    shutil.rmtree("dns-zones")
    Path("output.json").write_text(json.dumps(ip_hostnames), encoding="utf-8")
    return 0

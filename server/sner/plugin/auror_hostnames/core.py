"""Core functions for auror_hostnames plugin"""

from socket import getaddrinfo
import ipaddress
import os
import subprocess

import dns.exception
import dns.zone
import dns.rdataclass
import dns.rdatatype


def get_repos(git_server, key_path) -> list:
    """
    Get DNS repositories from git server
    """
    cmd = ["ssh", "-i", key_path, f"git@{git_server}", "info"]
    output = subprocess.check_output(cmd, text=True).splitlines()[2:]  # Skip the first line
    repos = [line.split("\t")[-1] for line in output]

    return repos


def clone_dns_repo(git_server, repo, key):
    """Clone DNS zones from git repository"""
    env = os.environ.copy()
    env["GIT_SSH_COMMAND"] = f"ssh -i {key}"
    subprocess.run(["git", "clone", f"git@{git_server}:{repo}", f"dns-zones/{repo}"], check=True, env=env)


def get_zone_file_paths() -> set:
    """
    Get DNS zone names from git repos
    """
    repos_folder = "dns-zones"
    zone_file_paths = set()
    for root, _, files in os.walk(repos_folder):
        for file in files:
            if file.endswith(".zone"):
                zone_file_paths.add(f"{root}/{file}")

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
    # count_resolved = 0
    # count_unresolved = 0
    for cname, aliases in cnames_rev.items():
        if cname.endswith(".arpa") or "/" in cname:
            continue

        if cname in a_aaaa:
            for alias in aliases:
                if not alias.endswith(".arpa"):
                    for ip in a_aaaa[cname]:
                        ip_hostnames.setdefault(ip, set()).add(alias)
                        # count_resolved += 1
        else:
            for alias in aliases:
                try:
                    resolve = getaddrinfo(alias, None)
                    ips = [ip[4][0] for ip in resolve]
                    for ip in ips:
                        ip_hostnames.setdefault(ip, set()).add(alias)
                    # count_unresolved += 1
                except OSError:
                    continue

    # print(f"Resolved {count_resolved} CNAMEs from A/AAAA records")
    # print(f"Resolved {count_unresolved} CNAMEs from DNS resolution")
    return ip_hostnames


def process_ptrs(ptrs, ip_hostnames) -> dict:
    """
    Convert PTR records to IP addresses with hostnames

    Args:
        ptrs (dict): { reverse: hostname }

    Returns:
        dict: { IP: [hostname1, hostname2] }
    """
    for reverse, hostname in ptrs.items():
        if "/" not in reverse and "*" not in reverse:
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
        for rdataset in node.rdatasets:
            rdatatype = rdataset.rdtype
            for rdata in rdataset:
                if "@" not in name.to_text() and "*" not in name.to_text():
                    fqdn = f"{name.to_text()}.{origin}"
                else:
                    fqdn = origin
                if rdatatype == dns.rdatatype.CNAME:
                    # what about cnames which are not fqdn? and why? and how to fix it? should I rstrip here?
                    cnames[fqdn] = rdata.to_text().rstrip(".")
                elif rdatatype in (dns.rdatatype.A, dns.rdatatype.AAAA):
                    ip_hostnames.setdefault(rdata.to_text(), set()).add(fqdn)
                    a_aaaa.setdefault(fqdn, set()).add(rdata.to_text())
                elif rdatatype == dns.rdatatype.PTR:
                    ptrs[fqdn] = rdata.to_text()

    return [cnames, a_aaaa, ptrs, ip_hostnames]

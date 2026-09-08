# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auror_hostnames plugin shared fixtures
"""

import os
import socket
import subprocess
import threading
from pathlib import Path

import dns.message
import dns.name
import dns.rcode
import dns.rdatatype
import dns.rrset
import dns.zone
import pytest


class AxfrServer:
    """minimal in-process TCP DNS server answering AXFR queries for configured zones"""

    def __init__(self):
        self.zones = {}
        self.keyring = None
        self.response_rcode = None
        self.fail_connections = 0
        self.sock = socket.socket()
        self.sock.bind(("127.0.0.1", 0))
        self.sock.listen(5)
        self._shutdown = False
        self.thread = threading.Thread(target=self._serve_loop, daemon=True)
        self.thread.start()

    @property
    def port(self):
        """port the server listens on"""
        return self.sock.getsockname()[1]

    def add_zone(self, zone_text, origin):
        """register a zone served for AXFR queries"""
        self.zones[dns.name.from_text(origin)] = dns.zone.from_text(zone_text, origin=origin, relativize=False, check_origin=False)

    def stop(self):
        """shutdown the server, waking up the accept loop with a dummy connection"""
        self._shutdown = True
        socket.create_connection(("127.0.0.1", self.port), timeout=5).close()
        self.sock.close()
        self.thread.join(timeout=5)

    def _serve_loop(self):
        while True:
            conn, _ = self.sock.accept()
            conn.settimeout(5)
            if self._shutdown:
                conn.close()
                return
            try:
                self._handle(conn)
            except Exception:  # pylint: disable=broad-exception-caught  ; queries for unknown zones just drop the connection
                pass
            finally:
                conn.close()

    def _handle(self, conn):
        length = int.from_bytes(self._read(conn, 2), "big")
        wire = self._read(conn, length)

        # closing the connection without a reply drives the client EOFError retry path
        if self.fail_connections > 0:
            self.fail_connections -= 1
            return

        query = dns.message.from_wire(wire, keyring=self.keyring)
        response = dns.message.make_response(query)

        if self.response_rcode is not None:
            response.set_rcode(self.response_rcode)
        else:
            zone = self.zones[query.question[0].name]
            soa_rdataset = zone.find_rdataset(zone.origin, dns.rdatatype.SOA)
            soa_rrset = dns.rrset.from_rdata_list(zone.origin, soa_rdataset.ttl, list(soa_rdataset))
            answer = [soa_rrset]
            for name, rdataset in zone.iterate_rdatasets():
                if rdataset.rdtype != dns.rdatatype.SOA:
                    answer.append(dns.rrset.from_rdata_list(name, rdataset.ttl, list(rdataset)))
            answer.append(soa_rrset)
            response.answer = answer

        if self.keyring:
            response.use_tsig(self.keyring)

        wire = response.to_wire()
        conn.sendall(len(wire).to_bytes(2, "big") + wire)

    @staticmethod
    def _read(conn, size):
        data = b""
        while len(data) < size:
            chunk = conn.recv(size - len(data))
            if not chunk:
                raise ConnectionError("client disconnected")
            data += chunk
        return data


@pytest.fixture
def axfr_server():
    """in-process AXFR-capable DNS server"""

    server = AxfrServer()
    yield server
    server.stop()


GIT_ZONE_TEXT = """
$ORIGIN {origin}.
$TTL 300
@ IN SOA ns1.{origin}. admin.{origin}. 1 3600 900 604800 300
@ IN NS ns1.{origin}.
www IN A {address}
"""

GITOLITE_REPOS = {"zones/repo1": ("git1.example.com", "192.0.2.11"), "zones/repo2": ("git2.example.com", "192.0.2.12")}

SSH_SHIM = """\
#!/bin/sh
# fake gitolite ssh for tests; second-to-last argument is git@<server>, last is the remote command
prev=""
for arg in "$@"; do server="$prev"; prev="$arg"; done
cmd="$prev"

if [ "$server" = "git@fail.example.com" ]; then
    exit 255
fi

if [ "$cmd" = "info" ]; then
    printf 'hello tester, this is gitolite\\nyou have access to:\\n R W\\tzones/repo1\\n R W\\tzones/repo2\\n'
    exit 0
fi

# cmd is "git-upload-pack 'zones/repo1'", delegate to the local bare repository
eval "set -- $cmd"
exec "$1" "GITOLITE_BASE/$2"
"""


def create_bare_repo(base_path, repo_name, origin, address):
    """create local bare git repository with a zone file"""

    src_path = base_path / "src" / repo_name
    src_path.mkdir(parents=True)
    (src_path / f"{origin}.zone").write_text(GIT_ZONE_TEXT.format(origin=origin, address=address), encoding="utf-8")
    subprocess.run(["git", "init", "-q"], cwd=src_path, check=True)
    subprocess.run(["git", "add", "-A"], cwd=src_path, check=True)
    subprocess.run(["git", "-c", "user.email=test@test", "-c", "user.name=test", "commit", "-q", "-m", "initial"], cwd=src_path, check=True)
    subprocess.run(["git", "clone", "-q", "--bare", str(src_path), str(base_path / repo_name)], check=True)


@pytest.fixture
def gitolite_server(tmpworkdir, monkeypatch):
    """fake gitolite server; local bare repositories accessed through an ssh shim placed on PATH"""

    base_path = Path(tmpworkdir) / "gitolite"
    for repo, (origin, address) in GITOLITE_REPOS.items():
        create_bare_repo(base_path, repo, origin, address)

    bin_path = Path(tmpworkdir) / "bin"
    bin_path.mkdir()
    shim_path = bin_path / "ssh"
    shim_path.write_text(SSH_SHIM.replace("GITOLITE_BASE", str(base_path)), encoding="utf-8")
    shim_path.chmod(0o755)
    monkeypatch.setenv("PATH", f"{bin_path}{os.pathsep}{os.environ['PATH']}")

    key_path = Path(tmpworkdir) / "gitkey"
    key_path.write_text("dummy key", encoding="utf-8")
    yield {"git_key_path": str(key_path), "git_server": "git.example.com"}

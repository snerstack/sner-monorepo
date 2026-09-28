# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auror_hostnames plugin shared fixtures
"""

import socket
import threading

import dns.message
import dns.name
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

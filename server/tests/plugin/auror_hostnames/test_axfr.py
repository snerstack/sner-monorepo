# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
auror_hostnames plugin axfr tests
"""

import logging

import dns.name
import dns.rcode
import dns.rdatatype
import dns.tsigkeyring
import dns.zone

from sner.plugin.auror_hostnames.axfr import get_zones_from_catalog, query_zone, run

EXAMPLE_ZONE_TEXT = """
@ 300 IN SOA ns1.example.com. admin.example.com. 1 3600 900 604800 300
@ 300 IN NS ns1.example.com.
ns1 300 IN A 192.0.2.1
www 300 IN A 192.0.2.3
www 300 IN AAAA 2001:db8::3
"""

CATALOG_ZONE_TEXT = """
@ 300 IN SOA invalid. invalid. 1 3600 900 604800 300
@ 300 IN NS invalid.
version 300 IN TXT "2"
unique1.zones 300 IN PTR example.com.
unique2.zones 300 IN PTR beta.example.com.
nonptr.zones 300 IN TXT "not a member"
emptyname.zones 300 IN PTR .
"""

TSIG_KEY_NAME = "tsig-key."
TSIG_SECRET = "MTIzNDU2Nzg5MGFiY2RlZg=="


def test_query_zone(axfr_server):
    """query_zone transfers the zone from the server"""

    axfr_server.add_zone(EXAMPLE_ZONE_TEXT, "example.com.")

    zone = query_zone("127.0.0.1", "example.com", port=axfr_server.port)

    assert zone.origin.to_text() == "example.com."
    assert zone.get_rdataset(dns.name.from_text("www.example.com."), dns.rdatatype.A)


def test_query_zone_with_tsig(axfr_server):
    """query_zone transfers the zone using TSIG authentication, with default and explicit algorithm"""

    axfr_server.add_zone(EXAMPLE_ZONE_TEXT, "example.com.")
    axfr_server.keyring = dns.tsigkeyring.from_text({TSIG_KEY_NAME: TSIG_SECRET})

    zone = query_zone("127.0.0.1", "example.com", TSIG_KEY_NAME, TSIG_SECRET, port=axfr_server.port)
    assert zone.origin.to_text() == "example.com."

    zone = query_zone("127.0.0.1", "example.com", TSIG_KEY_NAME, TSIG_SECRET, "hmac-sha256", port=axfr_server.port)
    assert zone.origin.to_text() == "example.com."


def test_query_zone_unresolvable_nameserver():
    """query_zone returns None when the nameserver hostname cannot be resolved"""

    assert query_zone("unresolvable.invalid", "example.com") is None


def test_query_zone_retries_on_connection_failure(axfr_server):
    """query_zone retries when the server drops the connection and succeeds on a later attempt"""

    axfr_server.add_zone(EXAMPLE_ZONE_TEXT, "example.com.")
    axfr_server.fail_connections = 1

    zone = query_zone("127.0.0.1", "example.com", attempts=2, port=axfr_server.port)

    assert zone.origin.to_text() == "example.com."


def test_query_zone_fails_after_all_attempts(axfr_server):
    """query_zone returns None when all attempts fail"""

    axfr_server.add_zone(EXAMPLE_ZONE_TEXT, "example.com.")
    axfr_server.fail_connections = 2

    assert query_zone("127.0.0.1", "example.com", attempts=2, port=axfr_server.port) is None


def test_query_zone_transfer_refused(axfr_server):
    """query_zone returns None when the server responds with an error rcode"""

    axfr_server.response_rcode = dns.rcode.REFUSED

    assert query_zone("127.0.0.1", "example.com", port=axfr_server.port) is None


def test_query_zone_transfer_notauth(axfr_server, caplog):
    """query_zone returns None and logs a distinct message when the server responds NOTAUTH"""

    axfr_server.response_rcode = dns.rcode.NOTAUTH

    with caplog.at_level(logging.ERROR, logger="sner.plugin.auror_hostnames.axfr"):
        result = query_zone("127.0.0.1", "example.com", port=axfr_server.port)

    assert result is None
    assert any("NOTAUTH" in record.message for record in caplog.records)


def test_get_zones_from_catalog():
    """get_zones_from_catalog returns sorted member zones from PTR records under the zones subtree"""

    catalog_zone = dns.zone.from_text(CATALOG_ZONE_TEXT, origin="catalog.example.", check_origin=False)

    assert get_zones_from_catalog(catalog_zone) == ["beta.example.com", "example.com"]


def test_run_with_list_of_zones(axfr_server):
    """run transfers all configured zones, skipping the failed ones"""

    axfr_server.add_zone(EXAMPLE_ZONE_TEXT, "example.com.")

    zones = run(
        {
            "dns_server": "127.0.0.1",
            "port": axfr_server.port,
            "list_of_zones": ["example.com", "missing.example.com"],
        }
    )

    assert [zone.origin.to_text() for zone in zones] == ["example.com."]


def test_run_with_catalog_zone(axfr_server):
    """run discovers member zones from the catalog zone and transfers them with TSIG"""

    axfr_server.add_zone(CATALOG_ZONE_TEXT, "catalog.example.")
    axfr_server.add_zone(EXAMPLE_ZONE_TEXT, "example.com.")
    axfr_server.add_zone(EXAMPLE_ZONE_TEXT, "beta.example.com.")
    axfr_server.keyring = dns.tsigkeyring.from_text({TSIG_KEY_NAME: TSIG_SECRET})

    zones = run(
        {
            "dns_server": "127.0.0.1",
            "port": axfr_server.port,
            "catalog_zone_name": "catalog.example",
            "tsig_key_name": TSIG_KEY_NAME,
            "tsig_secret": TSIG_SECRET,
            "tsig_algorithm": "hmac-sha256",
        }
    )

    assert sorted(zone.origin.to_text() for zone in zones) == ["beta.example.com.", "example.com."]

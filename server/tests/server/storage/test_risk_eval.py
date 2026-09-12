# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
storage.risk_eval tests
"""

import json
import os
from http import HTTPStatus
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
import requests

from sner.server.storage.commands import command
from sner.server.storage.models import SeverityEnum
from sner.server.storage.risk_eval import (
    HeuristicEvaluator,
    KevCatalog,
    RiskLevel,
    extract_cve_ids,
    extract_ref_cvss_score,
    risk_eval_handler,
)


def mocked_kev_get(cve_list=None):
    """requests.get mock responding with given cve ids"""

    mocked = MagicMock(status_code=HTTPStatus.OK)
    mocked.json.return_value = {"vulnerabilities": [{"cveID": cve} for cve in cve_list or []]}
    return patch("sner.server.storage.risk_eval.requests.get", return_value=mocked)


def test_evaluate_vuln_severity_mapping(app, host_factory, vuln_factory):  # pylint: disable=unused-argument
    """scanner severity baseline mapping"""

    host = host_factory.create(address="93.184.216.34")
    vuln_low = vuln_factory.create(host=host, service=None, name="testvuln1", severity=SeverityEnum.LOW, refs=[], descr="", data="")
    assert HeuristicEvaluator().evaluate(vuln_low) == RiskLevel.LOW

    vuln_medium = vuln_factory.create(host=host, service=None, name="testvuln2", severity=SeverityEnum.MEDIUM, refs=[], descr="", data="")
    assert HeuristicEvaluator().evaluate(vuln_medium) == RiskLevel.MEDIUM

    vuln_critical = vuln_factory.create(host=host, service=None, name="testvuln3", severity=SeverityEnum.CRITICAL, refs=[], descr="", data="")
    assert HeuristicEvaluator().evaluate(vuln_critical) == RiskLevel.HIGH


def test_evaluate_vuln_remote_exploitation(app, host_factory, vuln_factory):  # pylint: disable=unused-argument
    """remote exploitation signals in vuln text"""

    host = host_factory.create(address="192.0.2.1")
    vuln = vuln_factory.create(
        host=host,
        name="testvuln rce",
        severity=SeverityEnum.LOW,
        descr="allows remote code execution via crafted packet",
        data="",
        refs=[],
    )
    assert HeuristicEvaluator().evaluate(vuln) == RiskLevel.HIGH


def test_evaluate_vuln_known_exploit_refs(app, host_factory, vuln_factory):  # pylint: disable=unused-argument
    """known exploit references"""

    host = host_factory.create(address="192.0.2.2")
    vuln_msf = vuln_factory.create(
        host=host,
        name="testvuln msf",
        severity=SeverityEnum.LOW,
        refs=["MSF-exploit/windows/smb/ms17_010_eternalblue"],
        descr="",
        data="",
    )
    assert HeuristicEvaluator().evaluate(vuln_msf) == RiskLevel.HIGH

    vuln_text = vuln_factory.create(
        host=host,
        name="testvuln exploit",
        severity=SeverityEnum.LOW,
        refs=[],
        descr="public exploit is available",
        data="",
    )
    assert HeuristicEvaluator().evaluate(vuln_text) == RiskLevel.HIGH


def test_evaluate_vuln_local_only(app, host_factory, vuln_factory):  # pylint: disable=unused-argument
    """local only vulnerability stays low"""

    host = host_factory.create(address="192.0.2.3")
    vuln = vuln_factory.create(
        host=host,
        name="testvuln local",
        severity=SeverityEnum.LOW,
        refs=[],
        descr="local privilege escalation requires local access",
        data="",
    )
    assert HeuristicEvaluator().evaluate(vuln) == RiskLevel.LOW


def test_evaluate_vuln_public_service(app, host_factory, service_factory, vuln_factory):  # pylint: disable=unused-argument
    """publicly exposed service bumps to at least medium"""

    host_public = host_factory.create(address="203.0.113.10")
    service_public = service_factory.create(host=host_public, proto="tcp", port=443)
    vuln_public = vuln_factory.create(
        host=host_public,
        service=service_public,
        via_target="host.test",
        name="testvuln public info",
        severity=SeverityEnum.INFO,
        refs=[],
        descr="",
        data="",
    )
    assert HeuristicEvaluator().evaluate(vuln_public) == RiskLevel.MEDIUM

    host_loopback = host_factory.create(address="127.0.0.1")
    service_loopback = service_factory.create(host=host_loopback, proto="tcp", port=8080)
    vuln_loopback = vuln_factory.create(
        host=host_loopback,
        service=service_loopback,
        name="testvuln loopback info",
        severity=SeverityEnum.INFO,
        refs=[],
        descr="",
        data="",
    )
    assert HeuristicEvaluator().evaluate(vuln_loopback) == RiskLevel.LOW


def test_extract_cve_ids(app, vuln_factory):  # pylint: disable=unused-argument
    """cve ids normalization from refs"""

    vuln = vuln_factory.create(name="testvuln cve", refs=["CVE-2021-44228", "cve-2014-0160", "URL-http://x.test"])
    assert extract_cve_ids(vuln) == ["CVE-2021-44228", "CVE-2014-0160"]


def test_extract_ref_cvss_score(app, vuln_factory):  # pylint: disable=unused-argument
    """cvss score parsing from `CVSS#vector#score` refs"""

    vuln = vuln_factory.create(
        name="testvuln cvss",
        refs=["CVSS#AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H#9.8", "CVSS#AV:L#3.3"],
    )
    assert extract_ref_cvss_score(vuln) == 9.8

    vuln_noscore = vuln_factory.create(name="testvuln nocvss", refs=["CVE-2021-44228"])
    assert extract_ref_cvss_score(vuln_noscore) is None


def test_evaluate_vuln_ref_cvss(app, host_factory, vuln_factory):  # pylint: disable=unused-argument
    """high cvss score in refs drives high rank"""

    host = host_factory.create(address="192.0.2.4")
    vuln = vuln_factory.create(
        host=host,
        name="testvuln refcvss",
        severity=SeverityEnum.LOW,
        refs=["CVSS#AV:N/AC:L#8.1"],
        descr="",
        data="",
    )
    assert HeuristicEvaluator().evaluate(vuln) == RiskLevel.HIGH


def test_kev_catalog(app):  # pylint: disable=unused-argument
    """kev catalog membership; raises on unresponsive http"""

    with mocked_kev_get(["CVE-2021-44228"]) as mocked_get:
        catalog = KevCatalog.from_url()
        assert catalog.is_listed("CVE-2021-44228")
        assert not catalog.is_listed("CVE-2021-00001")

        mocked_get.side_effect = requests.ConnectionError("unreachable")
        with pytest.raises(requests.ConnectionError):
            KevCatalog.from_url()

    mocked_bad = MagicMock(status_code=HTTPStatus.TOO_MANY_REQUESTS)
    with patch("sner.server.storage.risk_eval.requests.get", return_value=mocked_bad):
        with pytest.raises(ConnectionError):
            KevCatalog.from_url()


def test_kev_catalog_cache(app, tmp_path):  # pylint: disable=unused-argument
    """kev catalog is cached under SNER_VAR for the configured interval"""

    app.config["SNER_VAR"] = str(tmp_path)
    cache_path = Path(tmp_path) / "kev_catalog.json"

    with mocked_kev_get(["CVE-2021-44228"]) as mocked_get:
        first = KevCatalog.from_cache()
    assert first.is_listed("CVE-2021-44228")
    assert mocked_get.called
    assert set(json.loads(cache_path.read_text(encoding="utf-8"))) == {"CVE-2021-44228"}

    # second call within interval reads cache, no fetch
    with mocked_kev_get([]) as mocked_get2:
        second = KevCatalog.from_cache()
    assert second.is_listed("CVE-2021-44228")
    assert not mocked_get2.called

    # stale cache forces refetch
    os.utime(cache_path, (0, 0))  # mtime=epoch 0
    with mocked_kev_get(["CVE-2022-00001"]) as mocked_get3:
        third = KevCatalog.from_cache()
    assert third.is_listed("CVE-2022-00001")
    assert mocked_get3.called


def test_evaluate_vuln_kev_enrichment(app, host_factory, vuln_factory):  # pylint: disable=unused-argument
    """kev listed cve forces high"""

    host = host_factory.create(address="192.0.2.5")
    catalog = KevCatalog({"CVE-2021-44228"})

    vuln_kev = vuln_factory.create(
        host=host, name="testvuln kev", severity=SeverityEnum.LOW, refs=["CVE-2021-44228"], descr="", data=""
    )
    assert HeuristicEvaluator(catalog).evaluate(vuln_kev) == RiskLevel.HIGH


def test_risk_eval_handler(app, tmp_path, host_factory, service_factory, vuln_factory):  # pylint: disable=unused-argument
    """handler evaluates and tags vulns; idempotent re-run replaces old tags"""

    app.config["SNER_VAR"] = str(tmp_path)

    host = host_factory.create(address="203.0.113.20")
    service = service_factory.create(host=host, proto="tcp", port=22)
    vuln_high = vuln_factory.create(
        host=host,
        service=service,
        name="handler vuln high",
        severity=SeverityEnum.CRITICAL,
        refs=["CVE-2021-44228"],
        tags=["report", "erisk:high/low"],
        descr="",
        data="",
    )
    vuln_low = vuln_factory.create(
        host=host,
        name="handler vuln low",
        severity=SeverityEnum.INFO,
        refs=[],
        descr="informational only",
        data="",
    )

    with mocked_kev_get():
        results = risk_eval_handler()
    assert set(results) == {(vuln_high.id, RiskLevel.HIGH), (vuln_low.id, RiskLevel.LOW)}

    # tags set, unrelated tags kept, stale risk tags replaced
    assert sorted(vuln_high.tags) == sorted(["report", "erisk:-/high"])
    assert "erisk:-/low" in vuln_low.tags

    # re-run is idempotent
    with mocked_kev_get():
        risk_eval_handler()
    assert vuln_high.tags.count("erisk:-/high") == 1

    # dry run does not modify tags
    vuln_low.tags = ["erisk:-/low"]
    with mocked_kev_get():
        results_dry = risk_eval_handler(dry=True)
    assert (vuln_low.id, RiskLevel.LOW) in results_dry
    assert vuln_low.tags == ["erisk:-/low"]


def test_vuln_risk_eval_command(app, tmp_path, runner, vuln_factory):
    """test vuln-risk-eval command"""

    app.config["SNER_VAR"] = str(tmp_path)

    vuln = vuln_factory.create(name="cmd vuln", severity=SeverityEnum.CRITICAL, refs=[])

    with mocked_kev_get() as mocked_kev_fetch:
        # kev enabled by default
        result = runner.invoke(command, ["vuln-risk-eval", "--dry"])
        assert result.exit_code == 0
        assert f"{vuln.id},high" in result.output
        assert not any(tag.startswith("erisk:") for tag in vuln.tags)
        assert mocked_kev_fetch.called

        result = runner.invoke(command, ["vuln-risk-eval"])
        assert result.exit_code == 0
        assert "erisk:-/high" in vuln.tags

        # --no-kev skips the enrichment
        result = runner.invoke(command, ["vuln-risk-eval", "--no-kev"])
        assert result.exit_code == 0
        assert mocked_kev_fetch.call_count == 1  # cached second run; --no-kev skips fetch

        result = runner.invoke(command, ["vuln-risk-eval", "--filter", "invalid"])
        assert result.exit_code == 1

        result = runner.invoke(command, ["vuln-risk-eval", "--filter", f'Vuln.id == "{vuln.id}"'])
        assert result.exit_code == 0
        assert f"{vuln.id}," in result.output

# This file is part of sner4 project governed by MIT license, see the LICENSE.txt file.
"""
vulnerability evaluation from external attacker point of view

Rates each vulnerability low/medium/high based on:

* remote exploitability signals in name/description/data (RCE, unauthenticated, ...)
* known exploit references (Metasploit, Exploit-DB, generic exploit mentions)
* public service exposure (tcp/udp service bound to non-loopback host)
* scanner assigned severity and CVSS base score in refs (``CVSS#...#<score>``)

Optionally enriches evaluation with:

* CISA Known Exploited Vulnerabilities (KEV) catalog -- CVEs being actively exploited
* LLM verdict via OpenAI-compatible chat completions API (SNER_LLM_* config)

Each vuln is tagged ``erisk:<llm>/<heur>``; llm part is ``-`` when llm evaluation is not used or fails.
"""

import json
import logging
import re
import time
from enum import StrEnum
from http import HTTPStatus
from ipaddress import ip_address
from pathlib import Path

import requests
from flask import current_app

from sner.server.extensions import db
from sner.server.storage.models import Service, SeverityEnum, Vuln
from sner.server.utils import filter_query, windowed_query

logger = logging.getLogger(__name__)

TAG_PREFIX = "erisk:"


class RiskLevel(StrEnum):
    """external attacker risk level of a vulnerability, values listed from lowest to highest"""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

    @classmethod
    def order(cls):
        """levels sorted from lowest to highest; StrEnum comparisons are lexicographic, not severity-based"""

        return [cls.LOW, cls.MEDIUM, cls.HIGH]


CVE_ID_REGEX = re.compile(r"CVE-(\d{4}-\d+)", re.IGNORECASE)
CVSS_REF_REGEX = re.compile(r"CVSS#[^#]*#(\d+(?:\.\d+)?)$")

# patterns indicating remote exploitability from external attacker pov
RCE_PATTERNS = [
    re.compile(r"remote.{0,20}(code|command).{0,12}execution", re.IGNORECASE),
    re.compile(r"\brce\b", re.IGNORECASE),
    re.compile(r"unauthenticat", re.IGNORECASE),
    re.compile(r"pre-auth", re.IGNORECASE),
    re.compile(r"arbitrary (code|command)", re.IGNORECASE),
    re.compile(r"\b(sql|command|code|os command) injection\b", re.IGNORECASE),
]

# patterns indicating known exploit availability in vuln text
EXPLOIT_TEXT_PATTERNS = [
    re.compile(r"exploit.{0,20}(available|exists|public|in the wild)", re.IGNORECASE),
    re.compile(r"metasploit", re.IGNORECASE),
]

# patterns describing locally-exploitable only issues
LOCAL_ONLY_PATTERNS = [
    re.compile(r"local (privilege escalation|only|attacker)", re.IGNORECASE),
    re.compile(r"requires.{0,20}local (access|account)", re.IGNORECASE),
]

KEV_CATALOG_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
KEV_LOOKUP_TIMEOUT = 10
KEV_CACHE_FILE = "kev_catalog.json"
LLM_LOOKUP_TIMEOUT = 60
LLM_TEXT_MAXLEN = 4000

LLM_SYSTEM_PROMPT = (
    'You are a security analyst. Rate the severity of the described vulnerability from the point of view '
    'of an external attacker (remote exploitation possible, known exploit, exposed service). '
    'Answer with exactly one word: low, medium, or high.'
)


class KevCatalog:
    """cisa known exploited vulnerabilities catalog lookup; cached under SNER_VAR when fresh"""

    def __init__(self, cve_ids):
        self.cve_ids = cve_ids

    @classmethod
    def from_url(cls, url=KEV_CATALOG_URL):
        """factory, download catalog; raises on unresponsive http"""

        response = requests.get(url, timeout=KEV_LOOKUP_TIMEOUT)
        if response.status_code != HTTPStatus.OK:
            raise ConnectionError(f"kev catalog fetch failed, status {response.status_code}")
        cve_ids = {item["cveID"] for item in response.json().get("vulnerabilities", [])}
        logger.info("KEV catalog loaded, %d entries", len(cve_ids))
        return cls(cve_ids)

    @classmethod
    def from_cache(cls):
        """factory, obtain catalog from SNER_VAR cache when fresh or refetch otherwise"""

        cache_path = Path(current_app.config["SNER_VAR"]) / KEV_CACHE_FILE
        max_age = current_app.config["SNER_KEV_CACHE_MAX_AGE"]

        if cache_path.exists() and cache_path.stat().st_mtime + max_age > time.time():
            cve_ids = set(json.loads(cache_path.read_text(encoding="utf-8")))
            logger.info("KEV catalog loaded from cache, %d entries", len(cve_ids))
            return cls(cve_ids)
        catalog = cls.from_url()
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(json.dumps(sorted(catalog.cve_ids)), encoding="utf-8")
        return catalog

    def is_listed(self, cve_id):
        """check whether cve is listed as actively exploited"""

        return cve_id in self.cve_ids


class LLMEvaluator:
    """evaluate vuln via openai-compatible chat completions api; fails soft returning None"""

    def __init__(self, api_url, api_key, model):
        if not api_url or not api_key or not model:
            raise ValueError("llm api url, api key and model must be configured")
        self.api_url = api_url.rstrip("/")
        self.api_key = api_key
        self.model = model

    @classmethod
    def from_app_config(cls):
        """factory, initialize from app config"""

        return cls(
            current_app.config["SNER_LLM_API_URL"],
            current_app.config["SNER_LLM_API_KEY"],
            current_app.config["SNER_LLM_MODEL"],
        )

    def evaluate(self, vuln):
        """obtain llm verdict; returns level name or None on any failure"""

        prompt = f"vulnerability:\n{vuln_prompt_text(vuln)}"
        payload = {
            "model": self.model,
            "temperature": 0,
            "max_tokens": 5,
            "messages": [{"role": "system", "content": LLM_SYSTEM_PROMPT}, {"role": "user", "content": prompt}],
        }

        try:
            # requests sets content-type automatically for json= kwarg
            response = requests.post(
                f"{self.api_url}/chat/completions",
                json=payload,
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=LLM_LOOKUP_TIMEOUT,
            )
            return self._verdict(response)
        except requests.RequestException as exc:
            logger.warning("llm evaluation failed for vuln %s: %s", vuln.id, exc)
            return None

    def _verdict(self, response):
        """parse verdict from response; returns level name or None"""

        if response.status_code != HTTPStatus.OK:
            logger.warning("llm evaluation failed, status %s", response.status_code)
            return None
        try:
            content = response.json()["choices"][0]["message"]["content"] or ""
        except (ValueError, TypeError, IndexError, KeyError) as exc:
            logger.warning("llm evaluation returned unparsable answer: %s", exc)
            return None
        level = parse_level(content)
        if level is None:
            logger.warning("llm evaluation returned invalid level %r", content)
        return level


def parse_level(text):
    """extract `RiskLevel` from free-form text; returns None when invalid"""

    token = re.sub(r"[^a-z]", "", (text or "").lower())
    try:
        return RiskLevel(token)
    except ValueError:
        return None


def vuln_prompt_text(vuln):
    """llm prompt content built from vuln attributes"""

    text = f"name: {vuln.name}\nrefs: {' '.join(vuln.refs or [])}\ndescr: {vuln.descr or ''}\ndata: {vuln.data or ''}"
    return text[:LLM_TEXT_MAXLEN]


class HeuristicEvaluator:
    """evaluate vuln severity from external attacker pov using local knowledge and optional kev catalog"""

    def __init__(self, kev_catalog=None):
        self.kev_catalog = kev_catalog

    def evaluate(self, vuln):
        """
        evaluate vulnerability severity from external attacker point of view.

        returns `RiskLevel`.
        """

        level = RiskLevel.LOW
        for signal in self._signals(vuln):
            if RiskLevel.order().index(signal) > RiskLevel.order().index(level):
                level = signal
        return level

    def _signals(self, vuln):
        """all signals contributing to the final rating"""

        return [
            self._severity_signal(vuln),
            self._remote_exploitability_signal(vuln),
            self._known_exploit_signal(vuln),
            self._exposure_signal(vuln),
            self._cvss_signal(vuln),
            self._kev_signal(vuln),
        ]

    def _severity_signal(self, vuln):
        """base signal from scanner assigned severity"""

        if vuln.severity in (SeverityEnum.HIGH, SeverityEnum.CRITICAL):
            return RiskLevel.HIGH
        if vuln.severity == SeverityEnum.MEDIUM:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW

    def _remote_exploitability_signal(self, vuln):
        """RCE-style signals in vuln text, vetoed by local-only phrases"""

        text = vuln_text(vuln)
        if any(pattern.search(text) for pattern in LOCAL_ONLY_PATTERNS):
            return RiskLevel.LOW
        if any(pattern.search(text) for pattern in RCE_PATTERNS):
            return RiskLevel.HIGH
        return RiskLevel.LOW

    def _known_exploit_signal(self, vuln):
        """refs or text indicate available public exploit"""

        text = vuln_text(vuln)
        if has_known_exploit_ref(vuln) or any(pattern.search(text) for pattern in EXPLOIT_TEXT_PATTERNS):
            return RiskLevel.HIGH
        return RiskLevel.LOW

    def _exposure_signal(self, vuln):
        """publicly exposed service bumps rating to at least medium"""

        if is_public_service_vuln(vuln):
            return RiskLevel.MEDIUM
        return RiskLevel.LOW

    def _cvss_signal(self, vuln):
        """cvss base score in `CVSS#vector#score` refs"""

        score = extract_ref_cvss_score(vuln)
        if score is None:
            return RiskLevel.LOW
        if score >= 7.0:
            return RiskLevel.HIGH
        if score >= 4.0:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW

    def _kev_signal(self, vuln):
        """cve actively exploited in the wild (per CISA KEV)"""

        if self.kev_catalog and any(self.kev_catalog.is_listed(cve_id) for cve_id in extract_cve_ids(vuln)):
            return RiskLevel.HIGH
        return RiskLevel.LOW


def extract_cve_ids(vuln):
    """extract CVE ids from vuln refs"""

    ids = []
    for ref in vuln.refs or []:
        if matched := CVE_ID_REGEX.match(ref):
            ids.append("CVE-" + matched.group(1).upper())
    return ids


def extract_ref_cvss_score(vuln):
    """extract max cvss base score from `CVSS#vector#score` refs"""

    score = None
    for ref in vuln.refs or []:
        if matched := CVSS_REF_REGEX.match(ref):
            score = max(score or 0.0, float(matched.group(1)))
    return score


def has_known_exploit_ref(vuln):
    """check refs for known exploit availability"""

    for ref in vuln.refs or []:
        if ref.startswith(("MSF-", "EDB-")):
            return True
        if "exploit-db" in ref.lower():
            return True
    return False


def vuln_text(vuln):
    """name + description + data joined for pattern matching"""

    return "\n".join(filter(None, [vuln.name, vuln.descr or "", vuln.data or ""]))


def is_public_service_vuln(vuln):
    """vuln is bound to tcp/udp service on externally reachable (non-loopback) address"""

    if not vuln.service:
        return False
    if vuln.service.proto not in ("tcp", "udp"):
        return False
    try:
        return not ip_address(str(vuln.host.address)).is_loopback
    except ValueError:  # unparsable address, consider public to keep on the safe side
        return True


def risk_tag(llm_level, heuristic_level):
    """render tag from evaluation results; llm part is `-` when not evaluated"""

    return f"{TAG_PREFIX}{llm_level or '-'}/{heuristic_level}"


def erisk_tags(tags):
    """filter tag list removing all erisk:-prefixed entries"""

    return [tag for tag in tags if not tag.startswith(TAG_PREFIX)]


def _build_evaluators(use_llm, use_kev):
    """obtain optional enrichers according to command-line switches and app config"""

    llm_evaluator = None
    if use_llm:
        try:
            llm_evaluator = LLMEvaluator.from_app_config()
        except ValueError:
            logger.error("llm evaluation not enabled, SNER_LLM_* is not configured")
    kev_catalog = KevCatalog.from_cache() if use_kev else None
    heuristic_evaluator = HeuristicEvaluator(kev_catalog)
    return llm_evaluator, heuristic_evaluator


def risk_eval_handler(qfilter=None, dry=False, use_llm=True, use_kev=True):
    """
    evaluate all vulns in storage from external attacker pov and tag them with
    `erisk:<llm>/<heur>` tags; llm part is `-` when llm evaluation is not used or fails.

    returns list of ``(vuln.id, llm_level, heuristic_level)`` evaluation results.
    """

    llm_evaluator, heuristic_evaluator = _build_evaluators(use_llm, use_kev)
    query = filter_query(db.session.query(Vuln).outerjoin(Service, Vuln.service_id == Service.id), qfilter)

    results = []
    for vuln in windowed_query(query, Vuln.id):
        llm_level = llm_evaluator.evaluate(vuln) if llm_evaluator else None
        heuristic_level = heuristic_evaluator.evaluate(vuln)
        results.append((vuln.id, llm_level, heuristic_level))

        if not dry:
            vuln.tags = erisk_tags(vuln.tags) + [risk_tag(llm_level, heuristic_level)]
            db.session.add(vuln)

    if not dry:
        db.session.commit()

    return results

"""Pattern-based detection: regex rules and weighted custom dictionaries.

This is the classic DLP layer. FabGuard treats it as one signal among
many — pattern hits raise risk but rarely decide a verdict alone.
"""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class RegexRule:
    name: str
    category: str  # secrets | source_code | design_file | roadmap | pii
    severity: int  # 1 (low) .. 4 (critical)
    pattern: re.Pattern
    description: str


def _r(name, category, severity, pattern, description, flags=re.IGNORECASE):
    return RegexRule(name, category, severity, re.compile(pattern, flags), description)


RULES: list[RegexRule] = [
    # --- Credentials & secrets -------------------------------------------
    _r("aws_access_key", "secrets", 4, r"\bAKIA[0-9A-Z]{16}\b",
       "AWS access key ID", flags=0),
    _r("private_key_block", "secrets", 4,
       r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
       "PEM private key material"),
    _r("generic_api_key", "secrets", 3,
       r"\b(?:api[_-]?key|secret[_-]?key|auth[_-]?token)\b\s*[:=]\s*['\"]?[A-Za-z0-9_\-]{16,}",
       "Hardcoded API key or token assignment"),
    _r("password_assignment", "secrets", 3,
       r"\bpassword\b\s*[:=]\s*['\"][^'\"]{6,}['\"]",
       "Hardcoded password"),

    # --- Source code & HDL (hardware IP) ----------------------------------
    _r("verilog_module", "source_code", 3,
       r"\bmodule\s+\w+\s*(?:#\s*\()?[\s\S]{0,400}?\bendmodule\b",
       "Verilog/SystemVerilog module body"),
    _r("verilog_always_block", "source_code", 3, r"\balways\s*@\s*\(",
       "Verilog sequential/combinational block"),
    _r("vhdl_entity", "source_code", 3,
       r"\bentity\s+\w+\s+is\b[\s\S]{0,200}?\bport\s*\(",
       "VHDL entity declaration"),
    _r("c_include_block", "source_code", 2,
       r"(?:^|\n)\s*#include\s*[<\"][\w./]+[>\"]",
       "C/C++ source code"),
    _r("python_function_def", "source_code", 2,
       r"(?:^|\n)\s*def\s+\w+\s*\([^)]*\)\s*:", "Python source code", flags=0),
    _r("git_clone_internal", "source_code", 3,
       r"\bgit\s+clone\b.{0,60}(?:internal|corp|git\.[\w-]+\.(?:local|lan|corp))",
       "Cloning from an internal code repository"),

    # --- Design files & EDA artifacts --------------------------------------
    _r("layout_file_ref", "design_file", 4,
       r"\b[\w\-/]+\.(?:gds|gdsii|oas|oasis|def|lef|spi|cdl|cir)\b",
       "Chip layout / netlist file reference"),
    _r("hdl_file_ref", "design_file", 3,
       r"\b[\w\-/]+\.(?:v|sv|vhd|vhdl|rtl)\b",
       "HDL design file reference"),
    _r("mask_or_reticle", "design_file", 3,
       r"\b(?:photomask|reticle|mask\s+set|OPC\s+deck)\b",
       "Photomask / reticle artifact"),

    # --- Roadmaps & strategy ------------------------------------------------
    _r("confidential_marking", "roadmap", 2,
       r"\b(?:company\s+confidential|internal\s+only|do\s+not\s+distribute|NDA\s+required)\b",
       "Explicit confidentiality marking"),
    _r("roadmap_language", "roadmap", 3,
       r"\b(?:product|technology|node)\s+roadmap\b",
       "Product/technology roadmap content"),
    _r("node_codename", "roadmap", 3,
       r"\b1-?(?:alpha|beta|gamma|delta)\b|\bN(?:3|2|1[468])\s+node\b",
       "Process node codename"),
    _r("unreleased_quarter_target", "roadmap", 2,
       r"\b(?:tape-?out|ramp|qual(?:ification)?)\b.{0,40}\b(?:Q[1-4]\s*'?\d{2}|20\d{2})\b",
       "Unreleased milestone with target date"),

    # --- PII (mostly for redaction demos) -----------------------------------
    _r("email_address", "pii", 1, r"\b[\w.+-]+@[\w-]+\.[\w.]+\b", "Email address"),
    _r("ssn_like", "pii", 3, r"\b\d{3}-\d{2}-\d{4}\b", "SSN-formatted number", flags=0),
]

# Weighted custom dictionary: domain terms that are individually weak
# signals but meaningful in aggregate (per 100 words of text).
DICTIONARY: dict[str, int] = {
    "tape-out": 3, "tapeout": 3, "wafer yield": 3, "litho recipe": 4,
    "euv dose": 4, "overlay budget": 3, "bitline": 2, "wordline": 2,
    "sense amplifier": 2, "die shrink": 3, "process window": 2,
    "yield ramp": 3, "defect density": 2, "fab utilization": 2,
    "design rule": 2, "drc deck": 3, "sram bitcell": 3, "bank group": 1,
    "refresh interval": 1, "row hammer mitigation": 2, "tsv stack": 2,
}


@dataclass(frozen=True)
class PatternFinding:
    rule: str
    category: str
    severity: int
    description: str
    matches: int
    samples: tuple[str, ...]  # truncated match excerpts
    spans: tuple[tuple[int, int], ...]


def scan_patterns(text: str) -> list[PatternFinding]:
    findings = []
    for rule in RULES:
        spans, samples = [], []
        for m in rule.pattern.finditer(text):
            spans.append(m.span())
            if len(samples) < 3:
                samples.append(m.group()[:60])
        if spans:
            findings.append(PatternFinding(
                rule=rule.name, category=rule.category, severity=rule.severity,
                description=rule.description, matches=len(spans),
                samples=tuple(samples), spans=tuple(spans),
            ))
    return findings


def dictionary_score(text: str) -> tuple[float, list[str]]:
    """Weighted dictionary hits normalized per 100 words. Returns (score, terms)."""
    lower = text.lower()
    words = max(len(lower.split()), 1)
    score, hits = 0.0, []
    for term, weight in DICTIONARY.items():
        count = lower.count(term)
        if count:
            score += weight * count
            hits.append(term)
    return score * 100.0 / words, hits

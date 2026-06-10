"""Surgical redaction: mask only the matched spans of redactable
categories, leaving the rest of the text usable (e.g. a prompt can still
go to a GenAI tool after secrets/PII are stripped)."""

from __future__ import annotations

from .engine import ScanResult


def redact(text: str, result: ScanResult, categories: tuple[str, ...] = ("secrets", "pii")) -> str:
    spans = []
    for f in result.findings:
        if f.signal == "pattern" and f.category in categories:
            spans.extend(f.spans)
    if not spans:
        return text
    spans.sort()
    out, cursor = [], 0
    for start, end in spans:
        if start < cursor:  # overlapping match already masked
            cursor = max(cursor, end)
            continue
        out.append(text[cursor:start])
        out.append("[REDACTED]")
        cursor = end
    out.append(text[cursor:])
    return "".join(out)

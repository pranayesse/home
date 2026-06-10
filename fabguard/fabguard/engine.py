"""Policy engine: fuses detector signals into a risk score and a tiered
verdict (ALLOW / COACH / REDACT / BLOCK).

The point of the design: no single keyword or regex decides anything.
Pattern hits, exact-data matches, document similarity, dictionary density,
and the ML classifier each contribute weighted evidence, and the policy
file — not the code — sets the response thresholds.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from pathlib import Path

from .detectors import patterns as pat
from .detectors.classifier import NaiveBayesClassifier, default_classifier
from .detectors.fingerprint import EDMIndex, IDMIndex

VERDICTS = ("ALLOW", "COACH", "REDACT", "BLOCK")

DEFAULT_POLICY = {
    "name": "default-ip-protection",
    "thresholds": {"COACH": 25, "REDACT": 45, "BLOCK": 70},
    "weights": {
        "secrets": 40, "design_file": 30, "source_code": 20,
        "roadmap": 20, "pii": 5,
        "edm_per_hit": 18, "edm_cap": 45,
        "idm_strong": 40, "idm_partial": 25,
        "classifier_sensitive": 30, "dictionary_unit": 4, "dictionary_cap": 20,
    },
    "idm_thresholds": {"partial": 0.25, "strong": 0.6},
    "classifier_min_confidence": 0.75,
    "redact_categories": ["secrets", "pii"],
}


@dataclass
class Finding:
    signal: str      # pattern | edm | idm | classifier | dictionary
    detail: str
    weight: int
    category: str = ""
    spans: tuple = ()


@dataclass
class ScanResult:
    verdict: str
    risk_score: int
    findings: list[Finding] = field(default_factory=list)
    label: str = "Public"

    def to_dict(self) -> dict:
        d = asdict(self)
        for f in d["findings"]:
            f.pop("spans", None)
        return d


def load_policy(path: str | Path | None = None) -> dict:
    policy = json.loads(json.dumps(DEFAULT_POLICY))  # deep copy
    if path:
        policy.update(json.loads(Path(path).read_text(encoding="utf-8")))
    return policy


# Sensitivity label assigned alongside the verdict, mirroring how a
# classification program (e.g. MIP labels) would auto-label content.
_LABELS = ((70, "Restricted — IP"), (45, "Confidential"), (25, "Internal"), (0, "Public"))


class PolicyEngine:
    def __init__(
        self,
        policy: dict | None = None,
        edm: EDMIndex | None = None,
        idm: IDMIndex | None = None,
        classifier: NaiveBayesClassifier | None = None,
    ):
        self.policy = policy or load_policy()
        self.edm = edm
        self.idm = idm
        self.classifier = classifier

    @classmethod
    def from_data_dir(cls, data_dir: str | Path, policy_path: str | Path | None = None,
                      protected_dir: str | Path | None = None) -> "PolicyEngine":
        data_dir = Path(data_dir)
        edm_csv = data_dir / "edm_records.csv"
        edm = EDMIndex.from_csv(edm_csv) if edm_csv.exists() else None
        idm = None
        if protected_dir and Path(protected_dir).is_dir():
            idm = IDMIndex()
            idm.register_dir(protected_dir)
        corpus = data_dir / "corpus"
        clf = default_classifier(corpus) if corpus.is_dir() else None
        return cls(policy=load_policy(policy_path), edm=edm, idm=idm, classifier=clf)

    def scan(self, text: str) -> ScanResult:
        w = self.policy["weights"]
        findings: list[Finding] = []

        for f in pat.scan_patterns(text):
            weight = min(w.get(f.category, 10) + (f.severity - 1) * 3, 50)
            findings.append(Finding(
                signal="pattern", category=f.category, weight=weight, spans=f.spans,
                detail=f"{f.rule}: {f.description} ({f.matches}x)",
            ))

        dict_score, terms = pat.dictionary_score(text)
        if dict_score >= 1.0:
            weight = min(int(dict_score * w["dictionary_unit"]), w["dictionary_cap"])
            findings.append(Finding(
                signal="dictionary", category="domain_terms", weight=weight,
                detail=f"IP dictionary density {dict_score:.1f}/100w: {', '.join(terms[:5])}",
            ))

        if self.edm:
            hits = self.edm.match(text)
            if hits:
                weight = min(len(hits) * w["edm_per_hit"], w["edm_cap"])
                cols = ", ".join(sorted({h.column for h in hits}))
                findings.append(Finding(
                    signal="edm", category="exact_data", weight=weight,
                    detail=f"{len(hits)} indexed value(s) matched (fields: {cols})",
                ))

        if self.idm:
            matches = self.idm.match(text, self.policy["idm_thresholds"]["partial"])
            if matches:
                top = matches[0]
                strong = top.similarity >= self.policy["idm_thresholds"]["strong"]
                findings.append(Finding(
                    signal="idm", category="protected_document",
                    weight=w["idm_strong"] if strong else w["idm_partial"],
                    detail=f"{'Strong' if strong else 'Partial'} fingerprint match: "
                           f"'{top.document}' (similarity {top.similarity:.0%})",
                ))

        if self.classifier:
            label, conf = self.classifier.predict(text)
            if label == "sensitive" and conf >= self.policy["classifier_min_confidence"]:
                findings.append(Finding(
                    signal="classifier", category="ml",
                    weight=int(w["classifier_sensitive"] * conf),
                    detail=f"ML classifier: sensitive ({conf:.0%} confidence)",
                ))

        score = min(sum(f.weight for f in findings), 100)
        return ScanResult(
            verdict=self._verdict(score), risk_score=score, findings=findings,
            label=next(name for floor, name in _LABELS if score >= floor),
        )

    def _verdict(self, score: int) -> str:
        t = self.policy["thresholds"]
        if score >= t["BLOCK"]:
            return "BLOCK"
        if score >= t["REDACT"]:
            return "REDACT"
        if score >= t["COACH"]:
            return "COACH"
        return "ALLOW"

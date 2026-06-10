"""Exact Data Match (EDM) and Indexed Document Match (IDM).

EDM: sensitive values (employee IDs, lot numbers, project codenames) are
indexed as salted HMAC-SHA256 digests — the index never stores plaintext,
mirroring how commercial DLP products ship EDM hash bundles to scanners.

IDM: protected documents are fingerprinted as sets of hashed word
shingles, and candidate text is scored by *containment* — the fraction
of the candidate's shingles that appear in a protected document. Unlike
Jaccard similarity, containment stays high when only a portion of a long
document is copied or lightly paraphrased, which is exactly the leak
shape regex and keywords miss.
"""

from __future__ import annotations

import csv
import hashlib
import hmac
import re
from dataclasses import dataclass, field
from pathlib import Path

_TOKEN_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+|[A-Za-z0-9][\w-]{2,}")


def _normalize(value: str) -> str:
    return value.strip().lower()


@dataclass
class EDMHit:
    column: str
    digest_prefix: str  # for triage display; never the plaintext


class EDMIndex:
    """Salted-hash index of structured sensitive values."""

    def __init__(self, salt: bytes = b"fabguard-demo-salt"):
        self.salt = salt
        self._index: dict[str, str] = {}  # digest -> column name

    def _digest(self, value: str) -> str:
        return hmac.new(self.salt, _normalize(value).encode(), hashlib.sha256).hexdigest()

    def add(self, column: str, value: str) -> None:
        v = _normalize(value)
        if len(v) >= 4:  # short values hash-collide with everyday words
            self._index[self._digest(v)] = column

    @classmethod
    def from_csv(cls, path: str | Path, salt: bytes = b"fabguard-demo-salt") -> "EDMIndex":
        idx = cls(salt=salt)
        with open(path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                for column, value in row.items():
                    if value:
                        idx.add(column, value)
        return idx

    def match(self, text: str) -> list[EDMHit]:
        hits, seen = [], set()
        for token in _TOKEN_RE.findall(text):
            d = self._digest(token)
            if d in self._index and d not in seen:
                seen.add(d)
                hits.append(EDMHit(column=self._index[d], digest_prefix=d[:12]))
        return hits


def _shingle_hashes(text: str, k: int = 3) -> set[bytes]:
    words = re.findall(r"\w+", text.lower())
    if not words:
        return set()
    if len(words) < k:
        grams = [" ".join(words)]
    else:
        grams = (" ".join(words[i:i + k]) for i in range(len(words) - k + 1))
    return {hashlib.blake2b(g.encode(), digest_size=8).digest() for g in grams}


@dataclass
class IDMMatch:
    document: str
    similarity: float  # containment of candidate shingles in the document, 0..1


@dataclass
class IDMIndex:
    """Hashed-shingle fingerprints of protected documents."""

    shingle_k: int = 3
    _docs: dict[str, set[bytes]] = field(default_factory=dict)

    def register(self, name: str, text: str) -> None:
        self._docs[name] = _shingle_hashes(text, self.shingle_k)

    def register_dir(self, directory: str | Path) -> None:
        for p in sorted(Path(directory).glob("*")):
            if p.is_file():
                self.register(p.name, p.read_text(encoding="utf-8", errors="replace"))

    def match(self, text: str, threshold: float = 0.2) -> list[IDMMatch]:
        candidate = _shingle_hashes(text, self.shingle_k)
        if len(candidate) < 5:  # too short to fingerprint meaningfully
            return []
        out = []
        for name, doc in self._docs.items():
            containment = len(candidate & doc) / len(candidate)
            if containment >= threshold:
                out.append(IDMMatch(document=name, similarity=round(containment, 3)))
        return sorted(out, key=lambda m: -m.similarity)

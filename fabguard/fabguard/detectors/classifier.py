"""ML sensitivity classifier: multinomial Naive Bayes, implemented from
scratch on the stdlib so the math is fully inspectable in an interview.

Trained at startup on a small bundled synthetic corpus (sensitive
semiconductor-IP text vs. benign business text). In production this layer
would be a fine-tuned transformer behind the same interface — the engine
only depends on `predict(text) -> (label, confidence)`.
"""

from __future__ import annotations

import json
import math
import re
from collections import Counter, defaultdict
from pathlib import Path

_WORD_RE = re.compile(r"[a-z][a-z0-9_-]+")


def tokenize(text: str) -> list[str]:
    return _WORD_RE.findall(text.lower())


class NaiveBayesClassifier:
    def __init__(self, alpha: float = 1.0):
        self.alpha = alpha
        self.class_priors: dict[str, float] = {}
        self.token_logprob: dict[str, dict[str, float]] = {}
        self.vocab: set[str] = set()
        self._fallback_logprob: dict[str, float] = {}

    def train(self, samples: list[tuple[str, str]]) -> None:
        """samples: list of (text, label)."""
        class_counts: Counter = Counter()
        token_counts: dict[str, Counter] = defaultdict(Counter)
        for text, label in samples:
            class_counts[label] += 1
            token_counts[label].update(tokenize(text))
            self.vocab.update(token_counts[label])

        total = sum(class_counts.values())
        v = len(self.vocab)
        for label, n in class_counts.items():
            self.class_priors[label] = math.log(n / total)
            denom = sum(token_counts[label].values()) + self.alpha * v
            self.token_logprob[label] = {
                tok: math.log((cnt + self.alpha) / denom)
                for tok, cnt in token_counts[label].items()
            }
            self._fallback_logprob[label] = math.log(self.alpha / denom)

    def predict(self, text: str) -> tuple[str, float]:
        """Returns (label, confidence) where confidence is the posterior."""
        tokens = [t for t in tokenize(text) if t in self.vocab]
        if not tokens:
            return "benign", 0.5
        scores = {}
        for label in self.class_priors:
            lp = self.class_priors[label]
            table = self.token_logprob[label]
            fallback = self._fallback_logprob[label]
            for tok in tokens:
                lp += table.get(tok, fallback)
            scores[label] = lp
        best = max(scores, key=scores.get)
        # softmax over log scores for a calibrated-looking confidence
        m = scores[best]
        z = sum(math.exp(s - m) for s in scores.values())
        return best, math.exp(scores[best] - m) / z


def load_corpus(corpus_dir: str | Path) -> list[tuple[str, str]]:
    """Reads {label}.jsonl files of {"text": ...} lines."""
    samples = []
    for path in sorted(Path(corpus_dir).glob("*.jsonl")):
        label = path.stem
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    samples.append((json.loads(line)["text"], label))
    return samples


def default_classifier(corpus_dir: str | Path) -> NaiveBayesClassifier:
    clf = NaiveBayesClassifier()
    clf.train(load_corpus(corpus_dir))
    return clf

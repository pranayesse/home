"""Behavioral exfiltration analytics.

Instead of alerting on single events, build a per-user behavioral profile
and score deviation against a *leave-one-out* department peer baseline —
the user's own activity is excluded from the baseline so a heavy
exfiltrator can't widen the peer distribution and hide inside it.

Features per user:
  * volume          — total egress KB vs. peer mean (z-score)
  * off_hours       — fraction of activity outside business hours
  * repo mirroring  — off-hours internal repo clones (peers: ~zero)
  * personal egress — KB to personal/removable destinations vs. peers

The composite score surfaces *early indicators* — the repo-mirroring
engineer is flagged for off-hours breadth long before any single clone
would trip a threshold rule.
"""

from __future__ import annotations

import statistics
from collections import defaultdict
from dataclasses import dataclass, field

from .events import Event

_PERSONAL_DESTINATIONS = {"gmail.com", "outlook.com", "box.com", "dropbox.com",
                          "wetransfer.com", "gdrive-personal", "usb-mass-storage"}


@dataclass
class UserProfile:
    user: str
    department: str
    total_kb: int = 0
    events: int = 0
    off_hours_events: int = 0
    repos: set = field(default_factory=set)
    off_hours_repo_clones: int = 0
    personal_dest_kb: int = 0
    genai_events: int = 0


@dataclass
class RiskAssessment:
    user: str
    department: str
    score: float  # 0..100
    reasons: list[str]


def build_profiles(events: list[Event]) -> dict[str, UserProfile]:
    profiles: dict[str, UserProfile] = {}
    for e in events:
        p = profiles.setdefault(e.user, UserProfile(e.user, e.department))
        p.total_kb += e.bytes_kb
        p.events += 1
        p.off_hours_events += e.off_hours
        if e.channel == "repo_clone":
            p.repos.add(e.resource)
            p.off_hours_repo_clones += e.off_hours
        if e.resource in _PERSONAL_DESTINATIONS:
            p.personal_dest_kb += e.bytes_kb
        if e.channel == "genai_paste":
            p.genai_events += 1
    return profiles


def _zscore(value: float, peers: list[float]) -> float:
    """z-score of value against a leave-one-out peer sample."""
    if len(peers) < 2:
        return 0.0
    mean = statistics.fmean(peers)
    stdev = statistics.pstdev(peers)
    floor = max(mean * 0.1, 1.0)  # avoid exploding z when peers are near-identical
    return (value - mean) / max(stdev, floor)


def assess(events: list[Event]) -> list[RiskAssessment]:
    profiles = build_profiles(events)
    by_dept: dict[str, list[UserProfile]] = defaultdict(list)
    for p in profiles.values():
        by_dept[p.department].append(p)

    results = []
    everyone = list(profiles.values())
    for p in profiles.values():
        peers = [q for q in by_dept[p.department] if q.user != p.user]
        baseline = f"{p.department} peers"
        if len(peers) < 3:  # peer group too small — fall back to org baseline
            peers = [q for q in everyone if q.user != p.user]
            baseline = "org-wide baseline"
        score, reasons = 0.0, []

        z_vol = _zscore(p.total_kb, [q.total_kb for q in peers])
        if z_vol > 2.0:
            score += min(z_vol * 10, 35)
            reasons.append(f"egress volume {z_vol:.1f} sigma above {baseline} "
                           f"({p.total_kb / 1024:.0f} MB)")

        off_frac = p.off_hours_events / max(p.events, 1)
        if off_frac > 0.10:
            score += min(off_frac * 120, 30)
            reasons.append(f"{off_frac:.0%} of activity outside business hours")

        if p.off_hours_repo_clones >= 5:
            score += min(5 + p.off_hours_repo_clones, 30)
            reasons.append(f"{p.off_hours_repo_clones} off-hours internal repo clones "
                           f"across {len(p.repos)} repos — possible repo mirroring")

        z_personal = _zscore(p.personal_dest_kb, [q.personal_dest_kb for q in peers])
        if z_personal > 2.0:
            score += min(z_personal * 8, 30)
            reasons.append(f"{p.personal_dest_kb / 1024:.0f} MB to personal/removable "
                           f"destinations ({z_personal:.1f} sigma above peers)")

        results.append(RiskAssessment(p.user, p.department, round(min(score, 100), 1), reasons))

    return sorted(results, key=lambda r: -r.score)

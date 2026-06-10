"""Synthetic egress-event simulator.

Generates 30 days of realistic per-user activity across the egress
vectors a DLP program watches — USB, print, email, SaaS upload, cloud
sync, GenAI paste, and internal repo clones — then injects two insider
scenarios for the anomaly detector to find:

  * "repo_mirror":   an engineer cloning far more repositories than their
                     team baseline, mostly between midnight and 5am.
  * "exit_exfil":    a departing employee staging bulk USB copies and
                     large personal-webmail sends in their final week.
"""

from __future__ import annotations

import json
import random
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from pathlib import Path

CHANNELS = ("usb", "print", "email", "saas_upload", "cloud_sync", "genai_paste", "repo_clone")

_USERS = [
    ("akumar", "design-eng"), ("bchen", "design-eng"), ("cdiaz", "design-eng"),
    ("dpatel", "process-eng"), ("efranklin", "process-eng"),
    ("fgarcia", "finance"), ("gho", "finance"),
    ("hito", "marketing"), ("ijones", "marketing"),
    ("jkim", "it-ops"), ("klee", "it-ops"), ("mnair", "design-eng"),
]

# (events/day mean, typical KB per event) per department per channel
_PROFILES = {
    "design-eng": {"repo_clone": (3, 4000), "genai_paste": (2, 6), "email": (8, 40),
                   "saas_upload": (1, 800), "cloud_sync": (4, 1200), "usb": (0.1, 2000),
                   "print": (0.2, 50)},
    "process-eng": {"repo_clone": (0.5, 2000), "genai_paste": (1, 4), "email": (10, 60),
                    "saas_upload": (2, 1500), "cloud_sync": (3, 900), "usb": (0.3, 3000),
                    "print": (1, 80)},
    "finance": {"repo_clone": (0, 0), "genai_paste": (0.5, 3), "email": (15, 120),
                "saas_upload": (3, 500), "cloud_sync": (2, 400), "usb": (0.1, 500),
                "print": (2, 60)},
    "marketing": {"repo_clone": (0, 0), "genai_paste": (3, 5), "email": (12, 200),
                  "saas_upload": (4, 2500), "cloud_sync": (3, 1800), "usb": (0.1, 800),
                  "print": (1.5, 100)},
    "it-ops": {"repo_clone": (1, 1500), "genai_paste": (1, 4), "email": (6, 30),
               "saas_upload": (1, 300), "cloud_sync": (2, 600), "usb": (0.5, 4000),
               "print": (0.1, 20)},
}


@dataclass
class Event:
    ts: str
    user: str
    department: str
    channel: str
    bytes_kb: int
    resource: str
    off_hours: bool


def _business_hour(rng: random.Random) -> int:
    return rng.choice([9, 10, 10, 11, 11, 12, 13, 14, 14, 15, 15, 16, 17])


def generate(days: int = 30, seed: int = 7, end: datetime | None = None) -> list[Event]:
    rng = random.Random(seed)
    end = end or datetime(2026, 6, 1)
    events: list[Event] = []

    for day in range(days):
        date = end - timedelta(days=days - day)
        if date.weekday() >= 5:
            continue
        for user, dept in _USERS:
            for channel, (rate, kb) in _PROFILES[dept].items():
                for _ in range(_poisson(rng, rate)):
                    hour = _business_hour(rng)
                    events.append(Event(
                        ts=date.replace(hour=hour, minute=rng.randrange(60)).isoformat(),
                        user=user, department=dept, channel=channel,
                        bytes_kb=max(1, int(rng.gauss(kb, kb * 0.4))),
                        resource=_resource(rng, channel),
                        off_hours=False,
                    ))

    events += _inject_repo_mirror(rng, end)
    events += _inject_exit_exfil(rng, end)
    events.sort(key=lambda e: e.ts)
    return events


def _poisson(rng: random.Random, lam: float) -> int:
    if lam <= 0:
        return 0
    # Knuth's method; rates here are small so this is fine
    import math
    l, k, p = math.exp(-lam), 0, 1.0
    while True:
        p *= rng.random()
        if p <= l:
            return k
        k += 1


def _resource(rng: random.Random, channel: str) -> str:
    pools = {
        "repo_clone": ["git/ddr5-phy", "git/hbm4-ctrl", "git/test-bench", "git/build-tools",
                       "git/nand-fw", "git/cache-ctrl", "git/pcie-phy", "git/dfx-scan",
                       "git/yield-ml", "git/euv-opc", "git/sram-compiler", "git/board-support"],
        "genai_paste": ["chatgpt.com", "gemini.google.com", "claude.ai", "copilot"],
        "email": ["corp-mail", "gmail.com", "outlook.com"],
        "saas_upload": ["sharepoint", "box.com", "dropbox.com", "wetransfer.com"],
        "cloud_sync": ["onedrive", "gdrive-personal"],
        "usb": ["usb-mass-storage"],
        "print": ["floor2-printer", "floor5-printer"],
    }
    return rng.choice(pools[channel])


def _inject_repo_mirror(rng: random.Random, end: datetime) -> list[Event]:
    """mnair clones nearly every repo, at 1-4am, over the last 10 days."""
    events = []
    repos = _resource.__defaults__ or None  # noqa: F841  (kept simple below)
    repo_pool = ["git/ddr5-phy", "git/hbm4-ctrl", "git/nand-fw", "git/cache-ctrl",
                 "git/pcie-phy", "git/dfx-scan", "git/yield-ml", "git/euv-opc",
                 "git/sram-compiler", "git/test-bench", "git/build-tools", "git/board-support"]
    for day in range(10):
        date = end - timedelta(days=10 - day)
        for repo in rng.sample(repo_pool, k=rng.randint(5, 9)):
            events.append(Event(
                ts=date.replace(hour=rng.randint(1, 4), minute=rng.randrange(60)).isoformat(),
                user="mnair", department="design-eng", channel="repo_clone",
                bytes_kb=rng.randint(8000, 40000), resource=repo, off_hours=True,
            ))
    return events


def _inject_exit_exfil(rng: random.Random, end: datetime) -> list[Event]:
    """gho stages bulk USB copies and big personal-webmail sends in week 4."""
    events = []
    for day in range(5):
        date = end - timedelta(days=5 - day)
        for _ in range(rng.randint(3, 6)):
            events.append(Event(
                ts=date.replace(hour=rng.choice([19, 20, 21, 22]), minute=rng.randrange(60)).isoformat(),
                user="gho", department="finance", channel="usb",
                bytes_kb=rng.randint(50000, 250000), resource="usb-mass-storage", off_hours=True,
            ))
        for _ in range(rng.randint(2, 4)):
            events.append(Event(
                ts=date.replace(hour=rng.choice([18, 19, 23]), minute=rng.randrange(60)).isoformat(),
                user="gho", department="finance", channel="email",
                bytes_kb=rng.randint(9000, 25000), resource="gmail.com", off_hours=True,
            ))
    return events


def write_jsonl(events: list[Event], path: str | Path) -> None:
    with open(path, "w", encoding="utf-8") as f:
        for e in events:
            f.write(json.dumps(asdict(e)) + "\n")


def read_jsonl(path: str | Path) -> list[Event]:
    out = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                out.append(Event(**json.loads(line)))
    return out

"""KPI/KRI computation for the DLP program.

Reads the gateway/scan alert log and produces the metrics a DLP program
manager actually reports on: alert volume and quality, verdict mix,
mean time to triage, exfil attempts prevented, and classification
coverage. Renders to console text and a standalone HTML report.
"""

from __future__ import annotations

import json
import random
from html import escape
from pathlib import Path


def load_alerts(path: str | Path) -> list[dict]:
    alerts = []
    p = Path(path)
    if not p.exists():
        return alerts
    with open(p, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                alerts.append(json.loads(line))
    return alerts


def compute_kpis(alerts: list[dict], coverage: dict | None = None, seed: int = 7) -> dict:
    rng = random.Random(seed)
    verdicts: dict[str, int] = {}
    multi_signal = 0
    for a in alerts:
        verdicts[a["verdict"]] = verdicts.get(a["verdict"], 0) + 1
        if len(a.get("signals", [])) >= 2:
            multi_signal += 1

    total = len(alerts)
    # Alert-quality proxy: alerts corroborated by >=2 independent detector
    # families are far more likely to be true positives.
    quality = multi_signal / total if total else 0.0
    # Triage time is simulated here; in production this comes from the
    # ticketing system (alert created -> analyst closed).
    triage_minutes = [round(rng.gauss(28 if len(a.get("signals", [])) >= 2 else 47, 9), 1)
                      for a in alerts]
    kpis = {
        "alerts_total": total,
        "verdict_mix": verdicts,
        "alert_quality_pct": round(quality * 100, 1),
        "mean_time_to_triage_min": round(sum(triage_minutes) / total, 1) if total else 0.0,
        "exfil_attempts_prevented": verdicts.get("BLOCK", 0),
        "auto_remediated": verdicts.get("REDACT", 0),
        "coaching_nudges": verdicts.get("COACH", 0),
    }
    if coverage:
        kpis["classification_coverage_pct"] = round(
            100 * coverage["labeled"] / max(coverage["scanned"], 1), 1)
        kpis["files_scanned"] = coverage["scanned"]
    return kpis


def format_console(kpis: dict) -> str:
    lines = ["", "=== FabGuard DLP Program KPIs/KRIs ===", ""]
    rows = [
        ("Total alerts", kpis["alerts_total"]),
        ("Alert quality (multi-signal corroboration)", f"{kpis['alert_quality_pct']}%"),
        ("Mean time to triage", f"{kpis['mean_time_to_triage_min']} min"),
        ("Exfil attempts prevented (BLOCK)", kpis["exfil_attempts_prevented"]),
        ("Auto-remediated (REDACT)", kpis["auto_remediated"]),
        ("Coaching nudges (COACH)", kpis["coaching_nudges"]),
    ]
    if "classification_coverage_pct" in kpis:
        rows.append(("Classification coverage",
                     f"{kpis['classification_coverage_pct']}% of {kpis['files_scanned']} files"))
    width = max(len(label) for label, _ in rows)
    lines += [f"  {label:<{width}}  {value}" for label, value in rows]
    if kpis["verdict_mix"]:
        lines.append("")
        lines.append("  Verdict mix: " + ", ".join(
            f"{v}={n}" for v, n in sorted(kpis["verdict_mix"].items())))
    lines.append("")
    return "\n".join(lines)


def write_html(kpis: dict, top_risks: list, path: str | Path) -> None:
    cards = ""
    for label, value in (
        ("Alerts", kpis["alerts_total"]),
        ("Alert quality", f"{kpis['alert_quality_pct']}%"),
        ("MTTT", f"{kpis['mean_time_to_triage_min']}m"),
        ("Blocked exfil", kpis["exfil_attempts_prevented"]),
        ("Auto-remediated", kpis["auto_remediated"]),
        ("Coverage", f"{kpis.get('classification_coverage_pct', '—')}%"),
    ):
        cards += (f'<div class="card"><div class="num">{escape(str(value))}</div>'
                  f'<div class="lbl">{escape(label)}</div></div>')

    risk_rows = "".join(
        f"<tr><td>{escape(r.user)}</td><td>{escape(r.department)}</td>"
        f"<td><div class='bar' style='width:{r.score}%'></div> {r.score}</td>"
        f"<td>{escape('; '.join(r.reasons) or 'no anomalies')}</td></tr>"
        for r in top_risks[:8])

    html = f"""<!doctype html><html><head><meta charset="utf-8">
<title>FabGuard — DLP Program Report</title>
<style>
 body {{ font-family: -apple-system, 'Segoe UI', sans-serif; margin: 2rem auto; max-width: 960px; color: #1a2233; }}
 h1 {{ font-size: 1.4rem; }} h2 {{ font-size: 1.1rem; margin-top: 2rem; }}
 .cards {{ display: flex; gap: 12px; flex-wrap: wrap; }}
 .card {{ background: #f4f6fb; border-radius: 10px; padding: 14px 20px; min-width: 110px; }}
 .num {{ font-size: 1.6rem; font-weight: 700; }} .lbl {{ color: #5a6680; font-size: .8rem; }}
 table {{ border-collapse: collapse; width: 100%; font-size: .85rem; }}
 td, th {{ padding: 8px 10px; border-bottom: 1px solid #e3e7f0; text-align: left; vertical-align: top; }}
 .bar {{ display: inline-block; height: 9px; background: linear-gradient(90deg,#ffb547,#e5484d); border-radius: 4px; vertical-align: middle; }}
</style></head><body>
<h1>FabGuard — DLP Program Report</h1>
<div class="cards">{cards}</div>
<h2>Insider risk leaderboard (behavioral analytics)</h2>
<table><tr><th>User</th><th>Dept</th><th>Risk score</th><th>Why</th></tr>{risk_rows}</table>
<p style="color:#8a93a8;font-size:.75rem">Synthetic demo data. Generated by FabGuard.</p>
</body></html>"""
    Path(path).write_text(html, encoding="utf-8")

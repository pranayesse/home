"""FabGuard command-line interface.

  fabguard scan <path...>      scan files, print verdicts + auto-labels
  fabguard guard "<prompt>"    run the GenAI guardrail on one prompt
  fabguard serve               start the guardrail HTTP gateway
  fabguard simulate            generate egress events + insider risk report
  fabguard report              compute KPIs and write report.html
  fabguard demo                end-to-end demo (scan + guard + simulate + report)
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

PKG_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PKG_ROOT / "data"
PROTECTED_DIR = PKG_ROOT / "demo" / "protected"
POLICY_PATH = PKG_ROOT / "policies" / "default_policy.json"
ALERT_LOG = PKG_ROOT / "out" / "alerts.jsonl"
EVENTS_PATH = PKG_ROOT / "out" / "events.jsonl"
REPORT_PATH = PKG_ROOT / "out" / "report.html"


def _engine():
    from .engine import PolicyEngine
    policy = POLICY_PATH if POLICY_PATH.exists() else None
    return PolicyEngine.from_data_dir(DATA_DIR, policy_path=policy,
                                      protected_dir=PROTECTED_DIR)


def _log_scan_alert(result, source: str) -> None:
    if result.verdict == "ALLOW":
        return
    ALERT_LOG.parent.mkdir(exist_ok=True)
    import time
    with open(ALERT_LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps({
            "ts": time.time(), "channel": "file_scan", "user": "scanner",
            "destination": source, "verdict": result.verdict,
            "risk_score": result.risk_score,
            "signals": sorted({x.signal for x in result.findings}),
        }) + "\n")


def cmd_scan(args) -> int:
    engine = _engine()
    scanned = labeled = 0
    for raw in args.paths:
        for path in (sorted(Path(raw).rglob("*")) if Path(raw).is_dir() else [Path(raw)]):
            if not path.is_file():
                continue
            text = path.read_text(encoding="utf-8", errors="replace")
            result = engine.scan(text)
            scanned += 1
            labeled += result.label != "Public"
            _log_scan_alert(result, str(path))
            print(f"\n{path}")
            print(f"  verdict={result.verdict}  risk={result.risk_score}  label={result.label!r}")
            for f in result.findings:
                print(f"    [{f.signal:>10}] (+{f.weight}) {f.detail}")
    print(f"\n{scanned} file(s) scanned, {labeled} auto-labeled above Public.")
    return 0


def cmd_guard(args) -> int:
    from .gateway import guard_prompt
    ALERT_LOG.parent.mkdir(exist_ok=True)
    response = guard_prompt(_engine(), args.prompt, user=args.user,
                            destination=args.destination, alert_log=ALERT_LOG)
    print(json.dumps(response, indent=2))
    return 0


def cmd_serve(args) -> int:
    from .gateway import serve
    ALERT_LOG.parent.mkdir(exist_ok=True)
    serve(_engine(), host=args.host, port=args.port, alert_log=ALERT_LOG)
    return 0


def cmd_simulate(args) -> int:
    from .behavior import anomaly, events
    evts = events.generate(days=args.days, seed=args.seed)
    EVENTS_PATH.parent.mkdir(exist_ok=True)
    events.write_jsonl(evts, EVENTS_PATH)
    print(f"Generated {len(evts)} egress events -> {EVENTS_PATH}\n")
    print("=== Insider risk leaderboard (peer-baselined behavioral analytics) ===\n")
    for r in anomaly.assess(evts):
        flag = " <-- INVESTIGATE" if r.score >= 50 else ""
        print(f"  {r.user:<10} {r.department:<12} risk={r.score:>5}{flag}")
        for reason in r.reasons:
            print(f"      - {reason}")
    return 0


def cmd_report(args) -> int:
    from .behavior import anomaly, events
    from .metrics import compute_kpis, format_console, load_alerts, write_html
    alerts = load_alerts(ALERT_LOG)
    if not alerts:
        print("No alerts logged yet — run `fabguard demo` (or scan/guard) first.")
        return 1
    evts = events.read_jsonl(EVENTS_PATH) if EVENTS_PATH.exists() else events.generate()
    coverage = None
    demo_dir = PKG_ROOT / "demo" / "samples"
    if demo_dir.is_dir():
        engine = _engine()
        files = [p for p in sorted(demo_dir.rglob("*")) if p.is_file()]
        labeled = sum(
            engine.scan(p.read_text(encoding="utf-8", errors="replace")).label != "Public"
            for p in files)
        coverage = {"scanned": len(files), "labeled": labeled}
    kpis = compute_kpis(alerts, coverage=coverage)
    print(format_console(kpis))
    write_html(kpis, anomaly.assess(evts), REPORT_PATH)
    print(f"HTML report -> {REPORT_PATH}")
    return 0


def cmd_demo(args) -> int:
    print("[1/4] Scanning demo files (multi-signal detection + auto-labeling)")
    cmd_scan(argparse.Namespace(paths=[str(PKG_ROOT / "demo" / "samples")]))

    print("\n[2/4] GenAI guardrail decisions")
    from .gateway import guard_prompt
    engine = _engine()
    ALERT_LOG.parent.mkdir(exist_ok=True)
    prompts = [
        ("Write a haiku about wafer fabs", "hito"),
        ("Fix this testbench: always @(posedge clk) q <= d; api_key = 'sk_live_9a8b7c6d5e4f3g2h1'", "bchen"),
        ("Summarize our technology roadmap: 1-gamma DRAM tape-out is Q3 '26, "
         "yield ramp depends on the new litho recipe and EUV dose tuning", "mnair"),
    ]
    for prompt, user in prompts:
        r = guard_prompt(engine, prompt, user=user, destination="chatgpt",
                         alert_log=ALERT_LOG)
        print(f"  {user}: \"{prompt[:58]}...\" -> {r['verdict']} (risk {r['risk_score']})")

    print("\n[3/4] Behavioral analytics over simulated egress telemetry")
    cmd_simulate(argparse.Namespace(days=30, seed=7))

    print("[4/4] KPI/KRI report")
    return cmd_report(args)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="fabguard",
                                     description="AI-aware DLP engine for semiconductor IP")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("scan", help="scan files or directories")
    p.add_argument("paths", nargs="+")
    p.set_defaults(func=cmd_scan)

    p = sub.add_parser("guard", help="run the GenAI guardrail on one prompt")
    p.add_argument("prompt")
    p.add_argument("--user", default="cli-user")
    p.add_argument("--destination", default="chatgpt")
    p.set_defaults(func=cmd_guard)

    p = sub.add_parser("serve", help="start the guardrail HTTP gateway")
    p.add_argument("--host", default="127.0.0.1")
    p.add_argument("--port", type=int, default=8787)
    p.set_defaults(func=cmd_serve)

    p = sub.add_parser("simulate", help="generate egress events and rank insider risk")
    p.add_argument("--days", type=int, default=30)
    p.add_argument("--seed", type=int, default=7)
    p.set_defaults(func=cmd_simulate)

    p = sub.add_parser("report", help="compute KPIs and write the HTML report")
    p.set_defaults(func=cmd_report)

    p = sub.add_parser("demo", help="run the full end-to-end demo")
    p.set_defaults(func=cmd_demo)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())

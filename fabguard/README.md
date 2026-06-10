# FabGuard 🛡️

**An AI-aware DLP engine for semiconductor IP** — detection that understands
data sensitivity and context, not just patterns and keywords.

Pure Python, **zero dependencies**, fully runnable demo:

```bash
python3 -m fabguard demo
```

## Why this exists

Classic DLP fails on intellectual property in two directions at once: regex
and keyword rules drown analysts in false positives on benign engineering
chatter, and they miss the leaks that matter — a paraphrased roadmap pasted
into ChatGPT, an engineer quietly mirroring internal repos at 2am. FabGuard
is a working prototype of the alternative: **multiple independent detection
signals fused by a policy engine into tiered, automated responses**, plus
**behavioral analytics** that surface exfiltration *patterns* instead of
single events.

## Architecture

```
                          ┌────────────────────────────────────────────┐
   text / file / prompt   │                Policy Engine               │
  ───────────────────────▶│  weighted signal fusion → risk score 0-100 │
                          │  policy file sets thresholds, not code     │
                          └──────┬─────────────────────────────────────┘
        signals in:              │ verdict + auto-label out:
   ┌──────────────────────┐      │     ┌───────────────────────────────┐
   │ regex rules          │      ├────▶│ ALLOW                         │
   │ custom dictionaries  │      ├────▶│ COACH   (user nudge)          │
   │ EDM  (salted hashes) │      ├────▶│ REDACT  (auto-remediation)    │
   │ IDM  (fingerprints)  │      └────▶│ BLOCK   (exfil prevented)     │
   │ ML classifier        │            └───────────────────────────────┘
   └──────────────────────┘            + sensitivity label (Public →
                                         Internal → Confidential →
                                         Restricted-IP)
```

### Detection layers (no single signal decides)

| Layer | What it catches | Where keywords fail |
|---|---|---|
| **Regex rules** | secrets, Verilog/VHDL, GDSII/netlist refs, roadmap markers | baseline signal only |
| **Custom dictionary** | density of fab-domain terms (litho recipe, tape-out, overlay budget) per 100 words | single terms are weak; aggregate density isn't |
| **EDM** — exact data match | indexed employee IDs, wafer lot numbers, project codenames, as **salted HMAC-SHA256** (index never holds plaintext) | values look like noise to regex |
| **IDM** — document fingerprinting | hashed word-shingle **containment** against protected docs — catches partial copies and light paraphrasing | paraphrased text has zero keyword overlap |
| **ML classifier** | multinomial Naive Bayes (from scratch, stdlib) trained on sensitive-vs-benign corpus | topic-level sensitivity with no markers at all |

### GenAI guardrails

A local HTTP gateway sits between users and AI tools. Prompts are scanned
before forwarding; verdicts are tiered: benign prompts pass untouched,
risky ones get a coaching nudge, secrets/PII are surgically redacted so the
rest of the prompt still works, and protected IP is blocked with a pointer
to the approved internal AI workspace and the exception process.

```bash
python3 -m fabguard serve
curl -s -X POST http://127.0.0.1:8787/v1/guard \
  -d '{"prompt": "fix this: always @(posedge clk) ...", "user": "bchen", "destination": "chatgpt"}'
```

### Behavioral analytics (early indicators, not reactive alerts)

`fabguard simulate` generates ~4,600 realistic egress events (USB, print,
email, SaaS upload, cloud sync, GenAI paste, repo clones) for 12 users in 5
departments, with two injected insider scenarios. The detector builds
**leave-one-out peer baselines** per department (falling back to an
org-wide baseline for small teams) and scores deviation in volume,
off-hours activity, repo-mirroring behavior, and personal-destination
egress:

```
mnair   design-eng  risk=85.0  <-- INVESTIGATE
    - egress volume 48.2 sigma above design-eng peers (2067 MB)
    - 17% of activity outside business hours
    - 72 off-hours internal repo clones across 12 repos — possible repo mirroring
gho     finance     risk=65.0  <-- INVESTIGATE
    - 4160 MB to personal/removable destinations (62.7 sigma above peers)
```

No single event in either scenario would trip a threshold rule.

### KPI/KRI reporting

`fabguard report` computes the metrics a DLP program is actually run on —
alert quality (multi-signal corroboration rate), mean time to triage, exfil
attempts prevented, auto-remediation count, classification coverage — and
renders `out/report.html` with the insider-risk leaderboard.

## Commands

```bash
python3 -m fabguard demo                  # full end-to-end walkthrough
python3 -m fabguard scan demo/samples     # scan files: verdicts + auto-labels
python3 -m fabguard guard "some prompt"   # one-shot GenAI guardrail decision
python3 -m fabguard serve                 # guardrail HTTP gateway on :8787
python3 -m fabguard simulate              # egress telemetry + insider risk ranking
python3 -m fabguard report                # KPIs + HTML report
python3 -m unittest discover -s tests     # 22 tests, stdlib only
```

## Design decisions worth discussing

* **Containment, not Jaccard, for IDM.** A two-paragraph excerpt of a long
  protected document has low Jaccard similarity but high containment.
  Partial-copy leaks are the common case, so the index scores the fraction
  of the *candidate's* shingles found in each protected doc.
* **Leave-one-out baselining.** A heavy exfiltrator inside their own peer
  baseline widens the distribution and hides their own anomaly. Each user
  is scored against peers excluding themselves.
* **Hashes, never plaintext, in detection indexes.** Both EDM values and
  IDM shingles are stored as (salted) digests — the scanner can be deployed
  broadly without the index itself becoming the leak.
* **Policy in data, response in tiers.** Thresholds, redaction categories,
  and classifier confidence floors live in `policies/*.json`. Tuning the
  program is a config change with an audit trail, not a code release.
* **Every layer is replaceable behind a small interface.** The Naive Bayes
  classifier is a stand-in for a fine-tuned transformer; the event
  simulator is a stand-in for real endpoint/SaaS telemetry. The engine
  only sees signals and weights.

## What production would add

SIEM/SOAR forwarding (Sentinel/Splunk HEC) for alerts, real telemetry
connectors instead of the simulator, OCR for screenshots, label
inheritance hooks for repositories and document workflows, exception
workflow integration, and per-rule FP/FN tracking to drive tuning.

---

*All data in this repository — employee records, lot numbers, recipes,
roadmaps — is synthetic and invented for the demo.*

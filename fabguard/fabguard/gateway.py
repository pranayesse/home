"""GenAI guardrail gateway.

A local HTTP service that sits between users and generative-AI tools.
Clients POST the prompt they are about to send; the gateway scans it and
returns a tiered verdict plus a redacted prompt that is safe to forward.
Every decision is appended to an alert log that feeds the KPI report.

  POST /v1/guard   {"prompt": "...", "user": "...", "destination": "chatgpt"}
  GET  /healthz
"""

from __future__ import annotations

import json
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from .engine import PolicyEngine
from .redact import redact

# Coaching text shown to the user in place of a silent block — "nudge"
# style response that DLP programs use to shape behavior, not just stop it.
_COACH_MSG = ("Heads up: this prompt looks like it contains internal IP. "
              "Double-check before sending it to an external AI tool.")
_BLOCK_MSG = ("Blocked: this prompt matches protected intellectual property "
              "(see findings). Use the approved internal AI workspace, or "
              "request an exception via the DLP exception process.")


def guard_prompt(engine: PolicyEngine, prompt: str, user: str = "unknown",
                 destination: str = "unknown", alert_log: str | Path | None = None) -> dict:
    result = engine.scan(prompt)
    response = {
        "verdict": result.verdict,
        "risk_score": result.risk_score,
        "label": result.label,
        "findings": [f"{f.signal}: {f.detail}" for f in result.findings],
        "forwarded_prompt": prompt,
        "message": None,
    }
    if result.verdict == "COACH":
        response["message"] = _COACH_MSG
    elif result.verdict == "REDACT":
        response["forwarded_prompt"] = redact(
            prompt, result, tuple(engine.policy["redact_categories"]))
        response["message"] = "Sensitive values were redacted before forwarding."
    elif result.verdict == "BLOCK":
        response["forwarded_prompt"] = None
        response["message"] = _BLOCK_MSG

    if alert_log and result.verdict != "ALLOW":
        record = {
            "ts": time.time(), "channel": "genai", "user": user,
            "destination": destination, "verdict": result.verdict,
            "risk_score": result.risk_score,
            "signals": sorted({f.signal for f in result.findings}),
        }
        with open(alert_log, "a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")
    return response


def make_handler(engine: PolicyEngine, alert_log: str | Path):
    class GuardHandler(BaseHTTPRequestHandler):
        def log_message(self, fmt, *args):  # quiet default access logging
            pass

        def _send(self, code: int, payload: dict):
            body = json.dumps(payload, indent=2).encode()
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            if self.path == "/healthz":
                self._send(200, {"status": "ok", "service": "fabguard-gateway"})
            else:
                self._send(404, {"error": "unknown path"})

        def do_POST(self):
            if self.path != "/v1/guard":
                self._send(404, {"error": "unknown path"})
                return
            try:
                length = int(self.headers.get("Content-Length", 0))
                payload = json.loads(self.rfile.read(length) or b"{}")
                prompt = payload["prompt"]
            except (json.JSONDecodeError, KeyError):
                self._send(400, {"error": "expected JSON body with a 'prompt' field"})
                return
            self._send(200, guard_prompt(
                engine, prompt,
                user=payload.get("user", "unknown"),
                destination=payload.get("destination", "unknown"),
                alert_log=alert_log,
            ))

    return GuardHandler


def serve(engine: PolicyEngine, host: str = "127.0.0.1", port: int = 8787,
          alert_log: str | Path = "alerts.jsonl") -> None:
    server = ThreadingHTTPServer((host, port), make_handler(engine, alert_log))
    print(f"FabGuard GenAI guardrail listening on http://{host}:{port}")
    print(f'Try: curl -s -X POST http://{host}:{port}/v1/guard '
          f'-d \'{{"prompt": "summarize module ddr5_phy ... endmodule", "user": "jdoe"}}\'')
    server.serve_forever()

import unittest
from pathlib import Path

from fabguard.engine import PolicyEngine
from fabguard.gateway import guard_prompt
from fabguard.redact import redact

ROOT = Path(__file__).resolve().parent.parent


def make_engine():
    return PolicyEngine.from_data_dir(
        ROOT / "data",
        policy_path=ROOT / "policies" / "default_policy.json",
        protected_dir=ROOT / "demo" / "protected",
    )


class TestEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = make_engine()

    def test_benign_text_allowed(self):
        result = self.engine.scan("Lunch is provided at the all-hands on Thursday.")
        self.assertEqual(result.verdict, "ALLOW")
        self.assertEqual(result.label, "Public")

    def test_secrets_file_blocked(self):
        text = (ROOT / "demo" / "samples" / "ci_config_with_secrets.env").read_text()
        result = self.engine.scan(text)
        self.assertEqual(result.verdict, "BLOCK")

    def test_paraphrased_roadmap_escalates(self):
        text = (ROOT / "demo" / "samples" / "roadmap_paraphrased_leak.txt").read_text()
        result = self.engine.scan(text)
        self.assertIn(result.verdict, ("REDACT", "BLOCK"))
        self.assertIn("idm", {f.signal for f in result.findings})

    def test_edm_hits_on_hr_export(self):
        text = (ROOT / "demo" / "samples" / "hr_export_rows.txt").read_text()
        result = self.engine.scan(text)
        self.assertIn("edm", {f.signal for f in result.findings})
        self.assertNotEqual(result.verdict, "ALLOW")

    def test_multiple_signals_fuse(self):
        text = (ROOT / "demo" / "samples" / "ddr_phy_snippet.v").read_text()
        result = self.engine.scan(text)
        self.assertGreaterEqual(len({f.signal for f in result.findings}), 2)


class TestRedaction(unittest.TestCase):
    def test_redacts_only_sensitive_spans(self):
        engine = make_engine()
        text = "ship it with api_key = 'sk_live_4f9a2b7c1d8e6f0a3b5c' before lunch"
        out = redact(text, engine.scan(text))
        self.assertIn("[REDACTED]", out)
        self.assertNotIn("sk_live", out)
        self.assertIn("before lunch", out)


class TestGateway(unittest.TestCase):
    def test_blocked_prompt_not_forwarded(self):
        engine = make_engine()
        prompt = ("Review this: module top(); always @(posedge clk) q<=d; endmodule "
                  "api_key = 'sk_live_4f9a2b7c1d8e6f0a3b5c' "
                  "for the 1-gamma tape-out litho recipe yield ramp")
        response = guard_prompt(engine, prompt)
        self.assertEqual(response["verdict"], "BLOCK")
        self.assertIsNone(response["forwarded_prompt"])

    def test_benign_prompt_passes_through(self):
        engine = make_engine()
        response = guard_prompt(engine, "write a haiku about teamwork")
        self.assertEqual(response["verdict"], "ALLOW")
        self.assertEqual(response["forwarded_prompt"], "write a haiku about teamwork")


if __name__ == "__main__":
    unittest.main()

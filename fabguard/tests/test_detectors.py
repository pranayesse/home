import unittest
from pathlib import Path

from fabguard.detectors.classifier import default_classifier
from fabguard.detectors.fingerprint import EDMIndex, IDMIndex
from fabguard.detectors.patterns import dictionary_score, scan_patterns

ROOT = Path(__file__).resolve().parent.parent


class TestPatterns(unittest.TestCase):
    def test_detects_aws_key_and_password(self):
        text = "AWS_ACCESS_KEY_ID=AKIAQT4EXAMPLE9MN23X\npassword = 'hunter2well'"
        rules = {f.rule for f in scan_patterns(text)}
        self.assertIn("aws_access_key", rules)
        self.assertIn("password_assignment", rules)

    def test_detects_verilog(self):
        text = "module foo(input clk); always @(posedge clk) x <= 1; endmodule"
        cats = {f.category for f in scan_patterns(text)}
        self.assertIn("source_code", cats)

    def test_benign_text_is_quiet(self):
        findings = scan_patterns("Lunch is at noon. The parking lot is closed Saturday.")
        self.assertEqual([f for f in findings if f.severity >= 3], [])

    def test_dictionary_density(self):
        score, terms = dictionary_score("the tape-out and yield ramp need a new litho recipe")
        self.assertGreater(score, 0)
        self.assertIn("litho recipe", terms)


class TestEDM(unittest.TestCase):
    def setUp(self):
        self.idx = EDMIndex.from_csv(ROOT / "data" / "edm_records.csv")

    def test_matches_indexed_values(self):
        hits = self.idx.match("please look up EMP-746218 and lot LOT-81A1-0021")
        self.assertEqual({h.column for h in hits}, {"employee_id", "wafer_lot_id"})

    def test_no_plaintext_in_index(self):
        self.assertNotIn("EMP-746218", str(self.idx._index))

    def test_benign_text_no_hits(self):
        self.assertEqual(self.idx.match("see you at the all-hands on Thursday"), [])


class TestIDM(unittest.TestCase):
    def setUp(self):
        self.idx = IDMIndex()
        self.idx.register_dir(ROOT / "demo" / "protected")

    def test_paraphrased_leak_matches_protected_doc(self):
        leak = (ROOT / "demo" / "samples" / "roadmap_paraphrased_leak.txt").read_text()
        matches = self.idx.match(leak)
        self.assertTrue(matches)
        self.assertEqual(matches[0].document, "roadmap_2026.md")

    def test_unrelated_text_does_not_match(self):
        self.assertEqual(self.idx.match("the cafeteria menu changes next week " * 10), [])


class TestClassifier(unittest.TestCase):
    def test_separates_sensitive_from_benign(self):
        clf = default_classifier(ROOT / "data" / "corpus")
        label, conf = clf.predict(
            "the tape-out slipped because the litho recipe missed the overlay budget")
        self.assertEqual(label, "sensitive")
        self.assertGreater(conf, 0.7)
        label, _ = clf.predict("sign up for the charity run and vote in the lunch poll")
        self.assertEqual(label, "benign")


if __name__ == "__main__":
    unittest.main()

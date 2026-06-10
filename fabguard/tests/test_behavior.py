import unittest

from fabguard.behavior import anomaly, events


class TestBehavioralAnalytics(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.events = events.generate(days=30, seed=7)
        cls.assessments = anomaly.assess(cls.events)

    def test_generates_realistic_volume(self):
        self.assertGreater(len(self.events), 1000)

    def test_injected_insiders_top_the_leaderboard(self):
        top_two = {r.user for r in self.assessments[:2]}
        self.assertEqual(top_two, {"mnair", "gho"})

    def test_repo_mirroring_reason_surfaced(self):
        mnair = next(r for r in self.assessments if r.user == "mnair")
        self.assertGreaterEqual(mnair.score, 50)
        self.assertTrue(any("repo" in reason for reason in mnair.reasons))

    def test_normal_users_score_low(self):
        normal = [r for r in self.assessments if r.user not in ("mnair", "gho")]
        self.assertTrue(all(r.score < 50 for r in normal))


if __name__ == "__main__":
    unittest.main()

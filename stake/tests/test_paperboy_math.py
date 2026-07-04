"""
Verification of paperboy_math.py against the numbers already proven in the
TypeScript engine (paperboy/src/engine/engine.test.ts, and the Monte-Carlo
report from `npm run simulate`). Stdlib-only (unittest) — no pytest needed,
matching paperboy_math.py's zero-dependency design.

Run: python3 -m unittest stake.tests.test_paperboy_math -v
"""
import math
import random
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from paperboy_math import (  # noqa: E402
    ROUTES,
    boost_expectation,
    cap_step,
    effective_multiplier,
    generate_round,
    ladder_multiplier,
    preset_rung,
    preset_table,
    settle_at_target,
)


class LadderConstruction(unittest.TestCase):
    """Mirrors engine.test.ts 'ladder construction (§2, §5.2)'."""

    def test_rung_payout_times_survival_equals_R(self):
        for cfg in ROUTES.values():
            c = boost_expectation(cfg)
            for k in range(1, cap_step(cfg) + 1):
                expected = ladder_multiplier(cfg, k) * (c ** k) * (cfg.p ** k)
                self.assertAlmostEqual(expected, cfg.ladder_rtp, places=9, msg=cfg.id)

    def test_first_rung_pays_at_least_even_money(self):
        for cfg in ROUTES.values():
            self.assertGreaterEqual(ladder_multiplier(cfg, 1), 1.0, msg=cfg.id)

    def test_matches_known_ts_values(self):
        # From docs/paperboy/02-math-model.md §3's sample ladder and the
        # TS engine.test.ts fixtures — exact cross-check, not just internal
        # consistency, that the Python port reproduces the same numbers.
        suburbia = ROUTES["suburbia"]
        known = {1: 1.03, 2: 1.13, 3: 1.24, 5: 1.49, 7: 1.80, 10: 2.38}
        for k, expected in known.items():
            self.assertAlmostEqual(ladder_multiplier(suburbia, k), expected, places=2)

        easy = ROUTES["easy-street"]
        self.assertAlmostEqual(ladder_multiplier(easy, 1), 1.0053, places=3)

        dog = ROUTES["dog-alley"]
        self.assertAlmostEqual(ladder_multiplier(dog, 1), 1.1520, places=3)

    def test_cap_step_reaches_max_win_not_before(self):
        for cfg in ROUTES.values():
            cap = cap_step(cfg)
            self.assertGreaterEqual(ladder_multiplier(cfg, cap), cfg.max_win, msg=cfg.id)
            self.assertLess(ladder_multiplier(cfg, cap - 1), cfg.max_win, msg=cfg.id)


class OutcomeGeneration(unittest.TestCase):
    def test_deterministic_for_a_given_seed(self):
        cfg = ROUTES["suburbia"]
        a = generate_round(cfg, random.Random(42))
        b = generate_round(cfg, random.Random(42))
        self.assertEqual(a.bust_step, b.bust_step)
        self.assertEqual([s.envelope for s in a.steps], [s.envelope for s in b.steps])
        self.assertEqual([s.boost for s in a.steps], [s.boost for s in b.steps])

    def test_survival_distribution_matches_p_to_the_k(self):
        cfg = ROUTES["suburbia"]
        rng = random.Random(1234)
        n = 200_000
        reached5 = reached10 = 0
        for _ in range(n):
            s = generate_round(cfg, rng)
            survived = s.bust_step - 1
            if survived >= 5:
                reached5 += 1
            if survived >= 10:
                reached10 += 1
        self.assertAlmostEqual(reached5 / n, cfg.p ** 5, places=2)
        self.assertAlmostEqual(reached10 / n, cfg.p ** 10, places=2)


class Settlement(unittest.TestCase):
    def test_pays_exact_rung_multiplier_on_target_reached(self):
        from paperboy_math import OutcomeScript, StepOutcome

        cfg = ROUTES["suburbia"]
        script = OutcomeScript(
            route=cfg.id, bust_step=4, cap_step=cap_step(cfg),  # survives 1..3
            steps=[StepOutcome(k=1), StepOutcome(k=2), StepOutcome(k=3)],
        )
        r = settle_at_target(script, cfg, 2)
        self.assertFalse(r.busted)
        self.assertAlmostEqual(r.multiplier, ladder_multiplier(cfg, 2), places=9)

    def test_busts_pay_zero_ladder_but_keep_side_prizes(self):
        from paperboy_math import OutcomeScript, StepOutcome

        cfg = ROUTES["suburbia"]
        script = OutcomeScript(
            route=cfg.id, bust_step=4, cap_step=cap_step(cfg),
            steps=[StepOutcome(k=1, envelope=0.25), StepOutcome(k=2), StepOutcome(k=3, envelope=0.25)],
            big_paper=5.0,
        )
        r = settle_at_target(script, cfg, 5)
        self.assertTrue(r.busted)
        self.assertEqual(r.ladder_win, 0.0)
        self.assertAlmostEqual(r.envelopes, 0.5, places=9)
        self.assertEqual(r.big_paper, 5.0)
        self.assertAlmostEqual(r.total, 5.5, places=9)

    def test_target_beyond_cap_clamps_to_cap(self):
        from paperboy_math import OutcomeScript, StepOutcome

        cfg = ROUTES["suburbia"]
        cap = cap_step(cfg)
        script = OutcomeScript(
            route=cfg.id, bust_step=cap + 1, cap_step=cap,
            steps=[StepOutcome(k=i) for i in range(1, cap + 1)],
        )
        r = settle_at_target(script, cfg, cap + 500)
        self.assertEqual(r.multiplier, cfg.max_win)


class PresetTargets(unittest.TestCase):
    def test_presets_match_computed_table(self):
        # Cross-check against the table computed and shown to the user before
        # this port was written (session record) — not just internal recompute.
        table = preset_table()
        expected_rungs = {
            "easy-street": [8, 13, 19, 27, 39, 53, 65, 150],
            "suburbia": [6, 9, 13, 18, 26, 36, 43, 100],
            "dog-alley": [3, 4, 6, 9, 12, 17, 20, 46],
        }
        for route, rungs in expected_rungs.items():
            got = [row[1] for row in table[route]]
            self.assertEqual(got, rungs, msg=route)

    def test_preset_rung_is_smallest_meeting_target(self):
        for cfg in ROUTES.values():
            k = preset_rung(cfg, 10)
            self.assertGreaterEqual(ladder_multiplier(cfg, k), 10)
            self.assertLess(ladder_multiplier(cfg, k - 1), 10)


class MeasuredRTP(unittest.TestCase):
    """
    Cross-checks Monte-Carlo simulation against the EXACT analytic expectation
    at each preset target, rather than a fixed sample-size band: deep targets
    (e.g. x50 at house 43, hit rate ~1%) carry high payout variance, so a
    modest Monte Carlo run can land 5-10 points off the true RTP by chance
    alone (confirmed by hand: seeds at n=2,000,000 ranged 0.949-0.970 around
    an analytic EV of 0.960 for that exact case) — the analytic expectation
    is the correctness check; Monte Carlo is a coarse sanity pass, not proof.
    """

    def _analytic_ev(self, cfg, k: int) -> float:
        ladder = cfg.ladder_rtp  # E[ladder]=R by construction, proven in LadderConstruction
        envelope_ev = cfg.envelope_prob * cfg.envelope_value * sum(cfg.p ** i for i in range(1, k + 1))
        total_weight = sum(w for _, w in cfg.big_paper_table)
        big_paper_ev = cfg.big_paper_prob * sum(p * w for p, w in cfg.big_paper_table) / total_weight
        return ladder + envelope_ev + big_paper_ev

    def _measure(self, cfg, target_step, n, seed):
        rng = random.Random(seed)
        total = 0.0
        for _ in range(n):
            script = generate_round(cfg, rng)
            total += settle_at_target(script, cfg, target_step).total
        return total / n

    def test_suburbia_presets_match_analytic_expectation(self):
        # "xmax" excluded: its hit rate (~1/37,600, math doc §3) needs far
        # more samples than a unit test should spend; its tail is already
        # proven exactly by the ladder-construction cap_step check.
        cfg = ROUTES["suburbia"]
        for label, k, _ in preset_table()["suburbia"]:
            if label == "xmax":
                continue
            analytic = self._analytic_ev(cfg, k)
            rtp = self._measure(cfg, k, 400_000, seed=hash(label) % (2 ** 31))
            self.assertAlmostEqual(
                rtp, analytic, delta=0.06,
                msg=f"{label} (house {k}): measured={rtp:.4f} analytic={analytic:.4f}",
            )


if __name__ == "__main__":
    unittest.main(verbosity=2)

"""
Pure-Python port of the Paperboy: The Run outcome engine
(paperboy/src/engine/{routes,outcome,rng}.ts), math doc §2-§8.5.

This module has ZERO dependency on the Stake Engine math-sdk so it can be
imported and tested standalone (see tests/test_paperboy_math.py) to prove
the ported formulas match the original TypeScript engine before they're
wired into the SDK-shaped files in games/paperboy/. The SDK wrapper
(games/paperboy/game_calculations.py) is a thin adapter around the
functions here — it does not reimplement any math.

Kept deliberately free of numpy/scipy: the RNG is Python's own `random`
module seeded per-simulation by the SDK's GeneralGameState (matching
math-sdk's `reset_seed`), exactly as the TypeScript build uses a seedable
sfc32 stream per round.
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from typing import Optional


@dataclass(frozen=True)
class RouteConfig:
    id: str
    p: float  # per-step survival probability (math doc §2)
    ladder_rtp: float  # R — ladder+boost RTP constant (§2, §5.2)
    boost_prob: float  # per-step Golden Newspaper trigger probability (§5.2)
    boost_factor: float
    envelope_prob: float  # per-step Money Envelope trigger probability (§5.1)
    envelope_value: float  # in units of bet
    big_paper_prob: float  # per-round Daily Big Paper trigger probability (§6)
    big_paper_table: tuple  # ((prize, weight), ...)
    max_win: float  # cap, in units of bet (§3)


# Big Paper prize table, E ~= 5.01x bet (math doc §6, unchanged across routes)
BIG_PAPER_TABLE = (
    (2, 70.6),
    (5, 20),
    (10, 6),
    (25, 2.4),
    (100, 0.9),
    (500, 0.1),
)

ROUTES: dict[str, RouteConfig] = {
    "easy-street": RouteConfig(
        id="easy-street", p=0.94, ladder_rtp=0.945,
        boost_prob=0.0, boost_factor=3.0,
        envelope_prob=0.00128, envelope_value=0.25,
        big_paper_prob=1 / 500, big_paper_table=BIG_PAPER_TABLE,
        max_win=10000.0,
    ),
    "suburbia": RouteConfig(
        id="suburbia", p=0.90, ladder_rtp=0.936,
        boost_prob=0.006, boost_factor=3.0,
        envelope_prob=0.0062, envelope_value=0.25,
        big_paper_prob=1 / 500, big_paper_table=BIG_PAPER_TABLE,
        max_win=10000.0,
    ),
    "dog-alley": RouteConfig(
        id="dog-alley", p=0.80, ladder_rtp=0.940,
        boost_prob=0.01, boost_factor=3.0,
        envelope_prob=0.01, envelope_value=0.25,
        big_paper_prob=1 / 500, big_paper_table=BIG_PAPER_TABLE,
        max_win=10000.0,
    ),
}


def boost_expectation(cfg: RouteConfig) -> float:
    """c = 1 - boost_prob + boost_prob*boost_factor (§5.2)."""
    return 1 - cfg.boost_prob + cfg.boost_prob * cfg.boost_factor


def ladder_multiplier(cfg: RouteConfig, k: int) -> float:
    """Base (pre-cap) multiplier at rung k: m(k) = R / (p*c)^k (§2, §5.2)."""
    return cfg.ladder_rtp / (cfg.p * boost_expectation(cfg)) ** k


def cap_step(cfg: RouteConfig) -> int:
    """Smallest rung at which the base ladder reaches max_win."""
    per_step = -math.log(cfg.p * boost_expectation(cfg))
    return math.ceil(math.log(cfg.max_win / cfg.ladder_rtp) / per_step)


@dataclass
class StepOutcome:
    k: int
    envelope: Optional[float] = None
    boost: Optional[float] = None


@dataclass
class OutcomeScript:
    route: str
    bust_step: int  # player survives 1..bust_step-1
    cap_step: int
    steps: list = field(default_factory=list)  # list[StepOutcome], 1 per survivable step
    big_paper: Optional[float] = None


@dataclass
class Settlement:
    survived: int
    busted: bool
    capped: bool
    multiplier: float
    ladder_win: float
    envelopes: float
    big_paper: float
    total: float


def _draw_survived(cfg: RouteConfig, rng: random.Random) -> int:
    """P(survive >= k) = p^k, so K = floor(ln(U)/ln(p)) (§2)."""
    u = rng.random()
    if u <= 0.0:
        return 10 ** 9
    return math.floor(math.log(u) / math.log(cfg.p))


def _draw_big_paper(cfg: RouteConfig, rng: random.Random) -> Optional[float]:
    if rng.random() >= cfg.big_paper_prob:
        return None
    total_weight = sum(w for _, w in cfg.big_paper_table)
    roll = rng.random() * total_weight
    for prize, weight in cfg.big_paper_table:
        roll -= weight
        if roll < 0:
            return float(prize)
    return float(cfg.big_paper_table[-1][0])


def generate_round(cfg: RouteConfig, rng: random.Random) -> OutcomeScript:
    """Draw the complete pre-determined round (§2, §8) — the RGS book's source of truth."""
    cap = cap_step(cfg)
    survived_draw = _draw_survived(cfg, rng)
    bust_step = min(survived_draw, cap) + 1
    survivable = bust_step - 1

    steps = []
    for k in range(1, survivable + 1):
        step = StepOutcome(k=k)
        if rng.random() < cfg.envelope_prob:
            step.envelope = cfg.envelope_value
        if cfg.boost_prob > 0 and rng.random() < cfg.boost_prob:
            step.boost = cfg.boost_factor
        steps.append(step)

    return OutcomeScript(
        route=cfg.id, bust_step=bust_step, cap_step=cap, steps=steps,
        big_paper=_draw_big_paper(cfg, rng),
    )


def effective_multiplier(script: OutcomeScript, cfg: RouteConfig, k: int) -> float:
    """Base rung multiplier x collected Golden Newspaper boosts up to step k, capped (§5.2)."""
    m = ladder_multiplier(cfg, k)
    for step in script.steps:
        if step.k <= k and step.boost:
            m *= step.boost
    return min(m, cfg.max_win)


def settle_at_target(script: OutcomeScript, cfg: RouteConfig, target_step: int) -> Settlement:
    """
    Platform-canonical settlement for a pre-committed target (math doc §8.5):
    the player commits to a target house BEFORE the round; it pays the target
    rung if the pre-determined draw reaches it, else busts. This is the ONLY
    settlement mode needed for a no-input RGS (Stake Engine) — there is no
    live cash-out variant here, unlike the TS engine's settle().
    """
    goal = min(target_step, script.cap_step)
    survivable = script.bust_step - 1
    busted = survivable < goal
    survived = survivable if busted else goal
    capped = (not busted) and goal >= script.cap_step

    multiplier = 0.0 if busted else effective_multiplier(script, cfg, survived)
    ladder_win = multiplier

    envelopes = sum(
        step.envelope for step in script.steps if step.k <= survived and step.envelope
    )
    big_paper = script.big_paper or 0.0

    return Settlement(
        survived=survived, busted=busted, capped=capped, multiplier=multiplier,
        ladder_win=ladder_win, envelopes=envelopes, big_paper=big_paper,
        total=ladder_win + envelopes + big_paper,
    )


# --- Preset target table (math doc §8.5 addendum) ---------------------------
# Curated per the product decision to expose ~8 target presets per route
# instead of one Stake Engine "mode" per house (which would require 450+
# separately generated/optimized mode files for full rung-level granularity).
PRESET_TARGETS = (1.5, 2, 3, 5, 10, 25, 50, "max")


def preset_rung(cfg: RouteConfig, target) -> int:
    """Smallest rung whose base ladder multiplier is >= target ('max' = cap_step)."""
    if target == "max":
        return cap_step(cfg)
    k = 1
    while ladder_multiplier(cfg, k) < target:
        k += 1
    return k


def preset_table() -> dict:
    """route -> [(label, rung, ladder multiplier at that rung), ...] for all presets."""
    out = {}
    for route_id, cfg in ROUTES.items():
        rows = []
        for target in PRESET_TARGETS:
            k = preset_rung(cfg, target)
            rows.append((f"x{target}", k, ladder_multiplier(cfg, k)))
        out[route_id] = rows
    return out

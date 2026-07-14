"""
Plug Golf paytables — the single source of truth for the math, framework-free so
both game_config.py (inside the math-sdk) and build_publish.py (standalone) use it.

Each mode is a discrete instant-win: a list of (payout_multiplier, weight) outcomes.
Weights are integers per WEIGHT_SCALE (10,000). Because the game is enumerable
(each row = one outcome), RTP is exact by construction — every mode is 96.50%.
Mirror of the <script id="paytables"> block in ../../../index.html.
"""

WEIGHT_SCALE = 10_000
RTP_TARGET = 0.965

# mode name (RGS/frontend) -> [(multiplier, weight), ...]
PAYTABLES = {
    "wedge":      [(0, 1312), (0.5, 2000), (0.8, 2200), (1, 2350), (1.5, 1200), (2, 650), (5, 288)],
    "short_iron": [(0, 2282), (0.2, 1500), (0.5, 1800), (0.8, 1400), (1, 1350), (2, 900), (3, 500), (10, 268)],
    "long_iron":  [(0, 3334), (0.2, 1400), (0.5, 1500), (0.8, 1100), (1, 1150), (2, 950), (5, 380), (15, 186)],
    "three_wood": [(0, 3889), (0.2, 1300), (0.5, 1300), (0.8, 1000), (1, 1000), (2, 895), (5, 400), (10, 150), (25, 66)],
    "driver":     [(0, 4643), (0.2, 1200), (0.5, 1100), (0.8, 800), (1, 850), (2, 800), (5, 380), (10, 162), (25, 40), (50, 25)],
    "masters":    [(0, 6090), (0.5, 1500), (1, 1050), (2, 800), (5, 350), (10, 150), (25, 40), (100, 20)],
}

# label + volatility (cosmetic, for the config), keyed by mode name
MODE_META = {
    "wedge":      {"label": "Wedge",         "vol": 1},
    "short_iron": {"label": "Short Iron",    "vol": 2},
    "long_iron":  {"label": "Long Iron",     "vol": 3},
    "three_wood": {"label": "3 Wood",        "vol": 4},
    "driver":     {"label": "Driver",        "vol": 5},
    "masters":    {"label": "Sunday Masters", "vol": 6},
}


def tier_for(mult):
    """Multiplier (in x) -> animation tier. Mirrors the frontend's tierFor()."""
    if mult == 0:
        return "lose"
    if mult <= 0.2:
        return "rough"
    if mult <= 0.5:
        return "bunker"
    if mult <= 0.8:
        return "fringe"
    if mult <= 1:
        return "green"
    if mult <= 2:
        return "closePutt"
    if mult <= 5:
        return "tapIn"
    if mult <= 15:
        return "lipOut"
    return "holeIn"


def rtp(mode):
    """Exact RTP for a mode from its integer weights."""
    t = PAYTABLES[mode]
    return sum(m * w for m, w in t) / WEIGHT_SCALE


def max_win(mode):
    return max(m for m, _ in PAYTABLES[mode])

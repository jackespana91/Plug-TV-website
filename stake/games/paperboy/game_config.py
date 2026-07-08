"""
Game-specific configuration for Paperboy: The Run, inherits from src/config/config.py
(StakeEngine/math-sdk). Ported from paperboy/src/engine/routes.ts and the
committed-target settlement model, math doc §8.5.

This file (and the rest of games/paperboy/) has been run end to end against
Stake's real state.py/books.py/win_manager.py/config.py/betmode.py/
distributions.py in a sandbox — see stake/README.md for exactly what that
verified, what it caught and fixed, and what's still untested (the Rust
optimizer, SymbolStorage/OutputFiles/write_data internals, real deployment).

Notes on this file specifically:
  - `Config.__init__` requires `self.paytable` and `self.special_symbols` to
    build a symbol map (src/state/state.py `create_symbol_map`), even though
    this game has no symbols. A trivial one-entry paytable and empty special
    symbols satisfy that without affecting any actual math — nothing here
    reads from self.paytable at settlement time; paperboy_math.py is the
    only source of payout truth.
  - `BetMode.cost` is always 1.0: bet size scaling is the RGS/frontend's job
    (see paperboy/src/game/main.ts's bet stepper), matching how the existing
    engine treats `bet` as a pure multiplier applied after settlement.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from src.config.config import Config
from src.config.distributions import Distribution
from src.config.betmode import BetMode

from paperboy_math import ROUTES, PRESET_TARGETS, preset_rung, ladder_multiplier


def _slug(target) -> str:
    return f"x{str(target).replace('.', '_')}"


class GameConfig(Config):

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        super().__init__()
        self.game_id = "paperboy"
        self.provider_number = 0
        self.working_name = "Paperboy: The Run"
        self.win_type = "ladder"  # not one of the SDK's built-in mechanics (lines/ways/cluster/scatter) — see README
        self.wincap = 10000.0  # math doc §3, all routes share the same cap
        self.rtp = 0.96  # representative figure; each mode's real RTP comes from its own book, math doc §9 variant A
        self.construct_paths()

        # src/state/state.py's reset_book() unconditionally builds a
        # num_reels x num_rows board grid regardless of game type — a 1x1
        # dummy board satisfies that without this game ever reading it.
        self.num_reels = 1
        self.num_rows = [1]

        # Symbol-map plumbing required by src/state/state.py's create_symbol_map,
        # unused by actual settlement (paperboy_math.py is the source of truth).
        self.paytable = {(1, "DELIVER"): 1.0}
        self.special_symbols = {None: []}

        self.bet_modes = []
        for route_id, cfg in ROUTES.items():
            for target in PRESET_TARGETS:
                k = preset_rung(cfg, target)
                mode_name = f"{route_id.replace('-', '_')}_{_slug(target)}"
                self.bet_modes.append(
                    BetMode(
                        name=mode_name,
                        cost=1.0,
                        rtp=min(self.rtp, 0.999),
                        max_win=self.wincap,
                        auto_close_disabled=False,
                        is_feature=False,
                        is_buybonus=False,
                        distributions=[
                            # Paperboy's bust/reach split already follows the exact
                            # closed-form geometric distribution the ladder was
                            # constructed against (math doc §2) — there is no
                            # rare bonus feature to force into a quota bucket the
                            # way slot free-spins are, so a single, unforced
                            # distribution is the correct (not simplified) model:
                            # quota=1.0, no win_criteria, no repeat/rejection loop.
                            Distribution(
                                criteria="standard",
                                quota=1.0,
                                conditions={
                                    "route": route_id,
                                    "target_rung": k,
                                    "target_multiplier": ladder_multiplier(cfg, k),
                                },
                                required_distribution_conditions=[],
                                # left at the class default ({"force_wincap":
                                # False, "force_freegame": False}) rather than
                                # overridden empty — src/state/state.py's
                                # check_repeat() unconditionally reads
                                # conditions["force_freegame"], so it must be
                                # present even though this game never uses it.
                            ),
                        ],
                    )
                )

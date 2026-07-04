"""
Low-level per-round simulation for Paperboy: The Run. This is the only file
that touches paperboy_math.py — everything above it (game_executables.py,
game_override.py, gamestate.py) is SDK plumbing, matching the layering
convention in the SDK's own sample games (game_calculations -> game_executables
-> game_override -> gamestate).

Deliberate deviation from the sample games' base class: their
game_calculations.py extends `src.executables.executables.Executables`,
which is `Executables(Conditions, Tumble)` — `Tumble` is cascading-reel
machinery (tumble_board, tumble win events) with no meaning for a ladder
game. `Conditions` is the thin mixin that actually connects to
`GeneralGameState` (`src/state/state.py`) — Paperboy extends that directly
instead, picking up reset_book/reset_seed/win_manager/book/check_repeat/
run_sims without inheriting reel-cascade helpers it would never call.
"""
import random

from src.state.state import GeneralGameState

from paperboy_math import (
    ROUTES,
    generate_round,
    settle_at_target,
)


class GameCalculations(GeneralGameState):
    """Mixed into GameState via GameExecutables -> GameStateOverride -> GameState."""

    def parse_mode_name(self, mode_name: str) -> tuple:
        """
        '<route>_x<target>' -> (route_id, target_label). Route ids use
        underscores in mode names (BetMode names can't contain hyphens
        safely across all RGS tooling) so they're converted back here.
        """
        for route_id in ROUTES:
            prefix = route_id.replace("-", "_") + "_"
            if mode_name.startswith(prefix):
                return route_id, mode_name[len(prefix):]
        raise RuntimeError(f"could not resolve route from mode name: {mode_name}")

    def simulate_paperboy_round(self) -> None:
        """
        Draw the complete pre-determined round (math doc §1, §8.5) and settle
        it against this mode's fixed target rung — the entire round is
        decided by this single draw, exactly as the TypeScript engine's
        generateRound()+settleAtTarget() pair guarantees. `random` (the
        stdlib module, not an instance) is passed directly as the RNG: the
        SDK's `reset_seed()` reseeds the global `random` module per
        simulation number, and paperboy_math.py's draw functions only ever
        call `rng.random()`, which the module itself provides — using the
        already-reseeded global state keeps this reproducible exactly the
        way the SDK expects, rather than spinning up a disconnected
        `random.Random()` instance.
        """
        route_id, target_label = self.parse_mode_name(self.betmode)
        cfg = ROUTES[route_id]
        conditions = self.get_current_distribution_conditions()
        target_rung = conditions["target_rung"]

        script = generate_round(cfg, random)
        settlement = settle_at_target(script, cfg, target_rung)

        self.book.add_event(
            {
                "type": "reveal",
                "route": route_id,
                "target": target_label,
                "targetRung": target_rung,
                "bustStep": script.bust_step,
                "capStep": script.cap_step,
            }
        )
        for step in script.steps:
            event = {"type": "step", "k": step.k}
            if step.envelope:
                event["envelope"] = step.envelope
            if step.boost:
                event["boost"] = step.boost
            self.book.add_event(event)
        if script.big_paper is not None:
            self.book.add_event({"type": "bigPaper", "prize": script.big_paper})
        self.book.add_event(
            {
                "type": "final",
                "survived": settlement.survived,
                "busted": settlement.busted,
                "capped": settlement.capped,
                "multiplier": settlement.multiplier,
                "total": settlement.total,
            }
        )

        self.win_manager.update_spinwin(settlement.total)

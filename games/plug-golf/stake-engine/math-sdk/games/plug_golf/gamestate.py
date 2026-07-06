"""
Single-round simulation for Plug Golf.

run_spin() draws a weighted outcome from the active club's paytable and emits the
two book events the frontend renders: a `shot` (club + animation tier) and the
standard finalWin. Modeled on the fifty_fifty sample's run_spin().
"""

from game_override import GameStateOverride
from src.calculations.statistics import get_random_outcome
from src.events.events import *  # noqa: F401,F403

from paytables import PAYTABLES, tier_for


class GameState(GameStateOverride):
    """Handle all game-logic and event updates for a given simulation number."""

    def run_spin(self, sim, simulation_seed=None):
        self.reset_seed(sim)
        self.repeat = True
        while self.repeat:
            self.reset_book()

            # The active bet mode is the chosen club; draw from its paytable.
            mode = self.get_current_betmode().get_name()
            table = PAYTABLES[mode]
            idx = get_random_outcome({i: w for i, (_, w) in enumerate(table)})
            mult, _weight = table[idx]
            payout_x100 = int(round(mult * 100))

            # 1) shot event — carries the club and the animation tier for the client
            self.book.add_event({
                "index": len(self.book.events),
                "type": "shot",
                "club": mode,
                "tier": tier_for(mult),
                "payoutMultiplier": payout_x100,
            })

            # 2) record the win and emit the standard finalWin event
            self.win_manager.update_spinwin(mult)
            self.win_manager.update_gametype_wins(self.gametype)
            self.evaluate_finalwin()

        self.imprint_wins()

    def run_freespin(self):
        pass

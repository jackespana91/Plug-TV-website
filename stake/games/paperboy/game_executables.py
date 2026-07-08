from game_calculations import GameCalculations


class GameExecutables(GameCalculations):
    """Higher-level orchestration layer, matching the SDK's own sample-game
    convention (game_executables sits between game_calculations and
    game_override). Paperboy's per-round logic is simple enough that this
    is a thin pass-through today, kept only for structural consistency with
    the rest of the SDK's games."""

    def evaluate_paperboy_round(self):
        self.simulate_paperboy_round()

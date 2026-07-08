from game_executables import GameExecutables


class GameStateOverride(GameExecutables):
    """
    Overrides/extends universal state.py behaviour for this game.

    Deliberately does NOT override `check_repeat()`: several of the SDK's
    sample games override it to force a re-draw whenever a distribution has
    no explicit `win_criteria` and the round paid zero (see
    games/0_0_lines/game_override.py) — that pattern exists to guarantee a
    slot's ordinary "basegame" bucket never accidentally lands in the
    dedicated "0" (zero-win) bucket's territory. Paperboy has no such
    buckets: each mode has a single, unforced "standard" distribution
    (game_config.py), and busting is an expected, high-probability, legitimate
    outcome the ladder was built around (math doc §2) — forcing a re-draw on
    every zero-payout round would silently corrupt the bust probability the
    whole ladder's RTP construction depends on. The base class's default
    `check_repeat()` (only repeats when a distribution's `win_criteria` is
    set and unmet — which never applies here) is exactly what's needed.
    """

    def reset_book(self):
        super().reset_book()

    def assign_special_sym_function(self):
        """No symbols in this game; present only to satisfy GeneralGameState's
        abstract method."""
        self.special_symbol_functions = {}

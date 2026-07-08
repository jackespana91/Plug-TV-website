from game_override import GameStateOverride


class GameState(GameStateOverride):
    """Handles game logic and events for a single simulation number/round."""

    def run_spin(self, sim, simulation_seed=None):
        self.reset_seed(sim, simulation_seed)
        self.repeat = True
        while self.repeat:
            self.reset_book()
            self.evaluate_paperboy_round()
            self.win_manager.update_gametype_wins(self.gametype)
            self.update_final_win()
            self.check_repeat()
        self.imprint_wins()

    def run_freespin(self):
        """
        Paperboy has no free-spin feature — a run either reaches its
        committed target or busts in a single draw (math doc §8.5). Present
        only because GeneralGameState declares it abstract.
        """
        pass

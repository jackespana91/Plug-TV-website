"""
Plug Golf math-sdk game configuration.

A discrete instant-win golf game: six bet modes (the clubs), each a weighted
payout table defined in paytables.py. No reels or symbols. Modeled on the
`fifty_fifty` sample game. Requires the math-sdk `src/` framework to run —
reconcile the imported API against the sample games in your checkout if versions
differ (the framework-free, upload-ready outputs are produced by build_publish.py).
"""

from src.config.config import Config, BetMode
from src.config.distributions import Distribution

from paytables import PAYTABLES, RTP_TARGET, max_win


class GameConfig(Config):
    """Plug Golf configuration."""

    def __init__(self):
        super().__init__()
        self.game_id = "plug_golf"
        self.provider_numer = 0
        self.working_name = "Plug Golf"
        self.wincap = max(max_win(m) for m in PAYTABLES)  # 100x (Sunday Masters)
        self.win_type = "other"
        self.rtp = RTP_TARGET
        self.construct_paths()

        # No board — outcomes come from the paytables, not reelstrips.
        self.num_reels = 0
        self.num_rows = []
        self.paytable = {}
        self.include_padding = False
        self.special_symbols = {"wild": [], "scatter": [], "multiplier": []}

        self.freespin_triggers = {self.basegame_type: {}, self.freegame_type: {}}
        self.anticipation_triggers = {self.basegame_type: 0, self.freegame_type: 0}

        # One bet mode per club. cost 1.0 for all; Sunday Masters can be repriced
        # as a paid feature-buy by raising its cost (the 100x top already exists).
        self.bet_modes = [
            BetMode(
                name=mode,
                cost=1.0,
                rtp=RTP_TARGET,
                max_win=max_win(mode),
                auto_close_disabled=False,
                is_feature=True,
                is_buybonus=False,
                distributions=[
                    Distribution(
                        criteria="basegame",
                        quota=1.0,
                        conditions={"force_wincap": False, "force_freegame": False},
                    ),
                ],
            )
            for mode in PAYTABLES
        ]

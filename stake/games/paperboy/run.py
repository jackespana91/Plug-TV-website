"""
Main file for generating results for Paperboy: The Run.

NOTE — see stake/README.md before running this: it only executes inside a
real clone of github.com/StakeEngine/math-sdk with this `games/paperboy/`
folder dropped into its `games/` directory. The imports below (optimization
program, RGS verification, write_configs, etc.) are the SDK's own modules,
not vendored into this repo.
"""
from gamestate import GameState
from game_config import GameConfig
from utils.rgs_verification import execute_all_tests
from src.state.run_sims import create_books
from src.write_data.write_configs import generate_configs

if __name__ == "__main__":

    num_threads = 10
    batching_size = 5000
    compression = True
    profiling = False

    config = GameConfig()

    # Paperboy's outcome distribution is exact geometric math (doc §2), not
    # bonus-feature-driven, so there's nothing for the SDK's Rust
    # optimization pass to correct — every mode's natural Monte-Carlo
    # frequencies already match the closed-form ladder construction (see
    # stake/tests/test_paperboy_math.py). Unlike the sample slot games,
    # `run_optimization` is intentionally left off by default here.
    num_sim_args = {mode.get_name(): int(2e6) for mode in config.bet_modes}

    run_conditions = {
        "run_sims": True,
        "run_optimization": False,
        "run_analysis": False,
        "run_format_checks": True,
    }

    gamestate = GameState(config)

    if run_conditions["run_sims"]:
        create_books(
            gamestate,
            config,
            num_sim_args,
            batching_size,
            num_threads,
            compression,
            profiling,
        )

    generate_configs(gamestate)

    if run_conditions["run_format_checks"]:
        execute_all_tests(config)

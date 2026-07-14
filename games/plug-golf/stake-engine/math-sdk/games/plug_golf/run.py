"""Generate Plug Golf math results and configs for Stake Engine upload.

Run inside a math-sdk checkout: `python run.py` populates library/ and the
publish files. For the framework-free, exact-RTP upload payload, use
`python build_publish.py` instead (see readme.txt)."""

from gamestate import GameState
from game_config import GameConfig
from src.state.run_sims import create_books
from src.write_data.write_configs import generate_configs

from paytables import PAYTABLES

if __name__ == "__main__":
    num_threads = 4
    batching_size = 50000
    compression = True
    profiling = False

    # One entry per club/mode. The outcome space is tiny and enumerable, so a
    # modest sim count converges; build_publish.py encodes the exact weights.
    num_sim_args = {mode: int(1e5) for mode in PAYTABLES}
    run_conditions = {"run_sims": True}

    config = GameConfig()
    gamestate = GameState(config)

    if run_conditions["run_sims"]:
        create_books(gamestate, config, num_sim_args, batching_size, num_threads, compression, profiling)
    generate_configs(gamestate)

# Plug Golf — Stake Engine math-sdk game

The math game in Stake's math-sdk layout (modeled on the `fifty_fifty` sample), plus
the ready-to-upload **Math** payload.

```
math-sdk/
└── games/plug_golf/
    ├── paytables.py          # single source of truth: the 6 clubs' weighted tables
    ├── game_config.py        # GameConfig — 6 bet modes (clubs), cost 1.0, 96% RTP
    ├── gamestate.py          # run_spin() → draws an outcome, emits shot + finalWin
    ├── game_override.py / game_executables.py / game_calculations.py / game_events.py
    ├── run.py                # create_books() + generate_configs() (needs the framework)
    ├── build_publish.py      # ★ framework-free generator → publish/  (runs anywhere)
    ├── readme.txt
    └── publish/              # ← UPLOAD THIS as the "Math" files
        ├── books_compressed/books_<mode>.jsonl.zst
        ├── books/books_<mode>.jsonl            (uncompressed reference)
        ├── lookup_tables/lookUpTable_<mode>.csv
        ├── lookup_tables/lookUpTableIdToCriteria_<mode>.csv
        └── config.json
```

## Produce the upload files

Plug Golf is a discrete instant-win, so the outcome space is fully enumerable and
RTP is **exact by construction** — no simulation or optimiser needed.

```bash
pip install zstandard
cd games/plug_golf
python build_publish.py     # writes publish/, re-verifies 96.00% per mode
```

Output (verified):

| mode | rows | RTP | max win |
|---|---|---|---|
| wedge | 7 | 96.00% | 5x |
| short_iron | 8 | 96.00% | 10x |
| long_iron | 8 | 96.00% | 15x |
| three_wood | 9 | 96.00% | 25x |
| driver | 10 | 96.00% | 50x |
| masters | 8 | 96.00% | 100x |

Alternatively, drop `games/plug_golf/` into a `StakeEngine/math-sdk` checkout and
run `python run.py` — `create_books()`/`generate_configs()` produce the same payload
by simulation. The `src.*` imports target that framework; reconcile against the
current sample games if the API has moved. `build_publish.py` is the framework-free
path and is what generated the committed `publish/`.

## Contract with the frontend

Each book is one round: `{type:"shot", club, tier, payoutMultiplier}` then
`{type:"finalWin", amount}`, amounts as integers ×100 (`100` = 1.0×). The web-sdk
game (`../../stake-web-sdk/apps/plug-golf`) reads exactly these; the `tier` picks the
animation and never affects the payout. If you change `paytables.py`, re-run
`build_publish.py` and re-verify.

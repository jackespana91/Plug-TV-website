# Paperboy: The Run — Stake Engine Math Port

Ports the already-verified TypeScript outcome engine (`paperboy/src/engine/`) to Stake Engine's public [math-sdk](https://github.com/StakeEngine/math-sdk) (Python 3.12+), per math doc §8.5's committed-target model — the only settlement mode a no-input RGS like theirs can support (see `docs/paperboy/02-math-model.md` §8.5 and the GDD's §20 addendum for why: Stake Engine resolves the whole bet, payout included, at draw time, so there is no live cash-out).

## What's here

```
stake/
  paperboy_math.py          pure-Python port of routes.ts + outcome.ts — zero dependencies
  tests/test_paperboy_math.py   12 tests: ladder construction, cross-checked against known
                                 TS values, settlement, and Monte-Carlo vs. analytic RTP
  games/paperboy/            Stake math-sdk-shaped game — see "How to actually run this" below
    paperboy_math.py           (a copy of the top-level module — see note below)
    game_config.py             defines 24 BetModes: 3 routes x 8 preset cash-out targets
    game_calculations.py       the only file that touches paperboy_math.py
    game_executables.py        thin orchestration layer (SDK convention)
    game_override.py           GameStateOverride — notably does NOT force-repeat on zero-win
    gamestate.py                run_spin()/run_freespin()
    run.py                     entry point (num_sims, run_conditions)
```

## Run the verification (works right now, no external repo needed)

```bash
python3 -m unittest stake.tests.test_paperboy_math -v
```

This is the part that's actually proven: 12 tests confirm the ported ladder formula, bust-distribution, and settlement logic produce the *same numbers* as the TypeScript engine (cross-checked against literal values from `engine.test.ts` and the math doc), not just that the Python is internally consistent.

## The one big architectural decision this port made

Stake's `BetMode` ties one fixed cost + one pre-generated book/lookup file pair to each named mode (e.g. `base`, `bonus` in their sample games) — there's no mechanism for "the player picks a continuous parameter at bet time." The current web prototype lets a player tap *any* house 1–150 as their cash-out flag. Translated literally, that's 150+ modes per route x 3 routes = 450+ separately generated, optimized, and verified mode files.

Instead, this port curates **8 preset targets per route** (×1.5/×2/×3/×5/×10/×25/×50/max), computed with the exact same ladder formula as the TS engine — 24 modes total. This is also closer to how real crash games present cash-out choices on regulated platforms (presets or a bounded field, not infinite granularity). The frontend's rung-tap-any-house UI would need to become a smaller preset picker for a real Stake Engine build; the existing prototype is unaffected and can stay as-is as the concept demo.

Computed preset table (`preset_table()` in `paperboy_math.py`):

| Route | x1.5 | x2 | x3 | x5 | x10 | x25 | x50 | max |
|---|---|---|---|---|---|---|---|---|
| Easy Street | H8 | H13 | H19 | H27 | H39 | H53 | H65 | H150 |
| Suburbia | H6 | H9 | H13 | H18 | H26 | H36 | H43 | H100 |
| Dog Alley | H3 | H4 | H6 | H9 | H12 | H17 | H20 | H46 |

## What's verified vs. assumed — read before trusting this end to end

**Actually executed end to end**, not just read: `games/paperboy/`'s full `GameConfig` → `GameState.run_spin()` → `Book` pipeline was run in a sandbox against Stake's **real, unmodified** `state.py`, `books.py`, `win_manager.py`, `config.py`, `betmode.py`, and `distributions.py` (pulled live from `StakeEngine/math-sdk`, MIT licensed — not vendored into this repo, just used for a one-off verification run), with only the genuinely unrelated leaf dependencies stubbed (`SymbolStorage`, `OutputFiles`, the `write_data.py` file writers, reel-strip paths — none of which this game's math touches). All 24 modes ran for thousands of simulated rounds each; reach-rates and RTPs matched the theoretical values from `paperboy_math.py` closely, and the produced `Book.to_json()` events had the exact `{reveal, step*, bigPaper?, final}` shape described below.

That run caught three real integration problems, since fixed in the files here:
1. The SDK's sample games' `game_calculations.py` extends `Executables(Conditions, Tumble)` — `Tumble` is cascading-reel machinery Paperboy has no use for. Fixed by extending `GeneralGameState` directly instead (see the docstring in `game_calculations.py`).
2. `src/state/state.py`'s `reset_book()` unconditionally builds a `num_reels x num_rows` board grid, even for a non-slot game. Fixed with a harmless dummy `1x1` board in `game_config.py`.
3. Overriding `Distribution`'s `default_distribution_conditions` to `{}` (meant to signal "no special conditions needed") instead silently deleted the `force_freegame`/`force_wincap` keys that `check_repeat()` always reads unconditionally, crashing every round. Fixed by leaving the class default in place.

**Still genuinely untested** — these need Stake's actual toolchain, not just their Python source, so they're out of reach in this sandbox:
- The Rust optimization program — not needed for this game regardless (see `run.py`'s comment: Paperboy's distribution is exact closed-form math, not bonus-feature-driven, so there's no biased quota sampling to reweight the way the sample slot games need).
- The real `SymbolStorage`/`OutputFiles`/`write_data.py` implementations (stubbed above) — everything read about them suggests they operate off `Book`/`WinManager` state alone, consistent with how they're called, but that's inference from the calling code, not from reading their own source.
- Actual RGS deployment/certification — requires a real Stake Engine account and infrastructure this environment doesn't have access to.

## How to actually run this for real

1. Clone `https://github.com/StakeEngine/math-sdk` (Python 3.12+, plus Rust/Cargo only if you turn `run_optimization` back on).
2. Copy `stake/games/paperboy/` into that clone's `games/` directory.
3. `python3 games/paperboy/run.py` — generates books + lookup CSVs + `index.json` for all 24 modes.
4. `execute_all_tests(config)` (already wired into `run.py`) runs the SDK's own format-compliance checks against the generated files.

## Frontend / RGS event bridge

Each book's `events` list is intentionally shaped close to the TS engine's `OutcomeScript` (`reveal` → `step`* → optional `bigPaper` → `final`) — the existing `paperboy/src/game/director.ts` beat sequencer (approach → hazard → deliver → flag/bust) was built to dramatize exactly this shape, so adapting it to consume a real RGS-delivered book instead of a locally-generated `OutcomeScript` should be a mapping exercise, not a rewrite.

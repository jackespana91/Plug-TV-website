# Paperboy: The Run — Design Package

A crash-style instant-win casino game built arcade-first: *Paperboy* as a run you survive, not a slot you spin.

Built studio-style, in phases, so design, math, and art each stay in their lane:

| Phase | Document | Owns |
|---|---|---|
| 1–2 | [`01-game-design-document.md`](01-game-design-document.md) | Player fantasy, core loop, UI, hazards, near misses, character, collectibles, neighborhoods, audio, session flow — **no math** |
| 3 | [`02-math-model.md`](02-math-model.md) | RNG architecture, volatility profiles, multiplier ladders, RTP budget (96% target, 94–97 variants), max win, outcome-script mapping, certification path |
| 4 | [`03-art-direction.md`](03-art-direction.md) | Palettes, typography, lighting, animation timing, VFX, UI transitions, accessibility, art-review checklist |
| — | [`04-character-art-brief.md`](04-character-art-brief.md) | Production brief for replacing the current programmatic rider rig with commissioned/hand-drawn animation: camera constraints, exact palette, required poses & timings, delivery-format options |

Reference concept: [`concept-mockup.png`](concept-mockup.png)

**Core principle threaded through all three:** the player never controls the character — a certified RNG fixes the outcome the instant DELIVER is pressed, and everything on screen is a dramatization of that result. Presentation never changes probability; probability never depends on presentation.

**Reference implementation:** [`../../paperboy/`](../../paperboy/) — the outcome engine (tested + Monte-Carlo-verified against doc 02) and a playable canvas prototype of the presentation layer. Doc 02 is at v1.1: two of its v1.0 figures were corrected after simulation caught them (see the doc's header changelog).

**Stake Engine math port:** [`../../stake/`](../../stake/) — the outcome engine ported to Stake Engine's public math-sdk (committed-target model, math doc §8.5), curated to 24 modes (3 routes × 8 preset cash-out targets) since their platform has no mechanism for a continuously player-chosen bet parameter. Run end to end in a sandbox against Stake's real base classes, not just written against assumptions — see that folder's README for exactly what was verified.

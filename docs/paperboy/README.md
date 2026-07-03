# Paperboy: The Run — Design Package

A crash-style instant-win casino game built arcade-first: *Paperboy* as a run you survive, not a slot you spin.

Built studio-style, in phases, so design, math, and art each stay in their lane:

| Phase | Document | Owns |
|---|---|---|
| 1–2 | [`01-game-design-document.md`](01-game-design-document.md) | Player fantasy, core loop, UI, hazards, near misses, character, collectibles, neighborhoods, audio, session flow — **no math** |
| 3 | [`02-math-model.md`](02-math-model.md) | RNG architecture, volatility profiles, multiplier ladders, RTP budget (96% target, 94–97 variants), max win, outcome-script mapping, certification path |
| 4 | [`03-art-direction.md`](03-art-direction.md) | Palettes, typography, lighting, animation timing, VFX, UI transitions, accessibility, art-review checklist |

Reference concept: [`concept-mockup.png`](concept-mockup.png)

**Core principle threaded through all three:** the player never controls the character — a certified RNG fixes the outcome the instant DELIVER is pressed, and everything on screen is a dramatization of that result. Presentation never changes probability; probability never depends on presentation.

Next step: lock this package, then build — server outcome engine first (verifiable against doc 02 alone), presentation client second.

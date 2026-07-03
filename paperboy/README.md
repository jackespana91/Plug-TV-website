# Paperboy: The Run — Reference Implementation

Playable prototype of the game specified in [`../docs/paperboy/`](../docs/paperboy/). Zero runtime dependencies; all art and sound are generated in code.

```bash
npm install
npm run dev        # play at http://localhost:5173
npm test           # engine verification (15 tests)
npm run simulate   # Monte-Carlo RTP report (default 2M rounds/policy; pass a count to override)
npm run build      # typecheck + production bundle (~10 KB gzipped)
```

## Architecture — the two-layer rule, enforced in code

```
src/engine/    THE MATH (math doc 02) — pure, dependency-free, fully tested
  rng.ts         seedable outcome-stream RNG (server-side CSPRNG in production)
  routes.ts      volatility profiles + constant-RTP ladder construction
  outcome.ts     generateRound() → OutcomeScript · settle() → Settlement
  engine.test.ts ladder constancy, distribution, settlement, measured RTP

src/sim/       lab-style Monte-Carlo verification of the doc's claims

src/game/      THE THEATRE (GDD 01, art doc 03) — dramatizes a finished script
  director.ts    beat sequencer: approach → hazard → deliver → decision window
  scene.ts       canvas street renderer (Golden Hour Suburbia palette)
  audio.ts       synthesized sound design (ladder motif, thwack, near-miss)
  presentation.ts SEPARATE presentation RNG — hazard skins only, never value
  main.ts        HUD, demo wallet, DELIVER ⇄ CASH OUT button
```

The invariant that matters: **`generateRound` fixes the entire outcome the moment the bet is placed; everything the player watches afterward is a replay.** The presentation layer receives the finished script and cannot create, alter, or (in production — see the compliance note in `presentation.ts`) predict value.

## What the prototype demonstrates

- The full core loop: bet → DELIVER → per-house deliveries → 1.2s decision windows (cash-out is only accepted inside them) → cash-out celebration or wipeout, ≤2.5s loss-to-rearm.
- Three routes with live ladders, the rung ribbon, milestone wheelies, near-miss slow-motion on `dramatic` steps, envelopes (banked side pocket), Golden Newspaper rung boosts, Daily Big Paper reveal, Perfect Run celebration, max-win force-cashout.
- Demo wallet (1,000.00, localStorage) — no real money, no server. Production would move `src/engine` behind a game server per math doc §10.

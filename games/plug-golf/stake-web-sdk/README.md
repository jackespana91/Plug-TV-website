# Plug Golf — Stake Engine web-sdk game module

Stake Engine only accepts frontends built on its **web-sdk** (a pnpm/Turbo
monorepo of Svelte 5 + PixiJS 8). This folder is the Plug Golf **game app** that
drops into that monorepo at `apps/plug-golf/`. It is paired with the **math
package** in `../stake-engine/` (the math-sdk output — books + lookup tables),
which is unchanged and remains the source of outcomes.

```
apps/plug-golf/
├── src/
│   ├── game/                     # pure, framework-free game logic (tested here)
│   │   ├── geometry.ts           # 2D helpers
│   │   ├── rng.ts                # seeded PRNG (reproducible stories)
│   │   ├── config.ts             # course geometry, flight feel, tier mapping, modes
│   │   ├── typesBookEvent.ts     # RGS book event contract  ← matches the math package
│   │   ├── emitterEvents.ts      # component-facing events
│   │   ├── shotEngine.ts         # ★ outcome → declarative animation Timeline + sampler
│   │   ├── preShot.ts            # pure aim/power input model (tested)
│   │   └── bookEventHandlerMap.ts# bookEvent → emitterEvents (the SDK pipeline glue)
│   ├── components/               # Svelte 5 + pixi-svelte (builds in the monorepo only)
│   │   ├── Game.svelte           # root: club/aim/power UI → stateBet.playRound(mode)
│   │   ├── GolfScene.svelte      # Pixi stage; walks the Timeline, fires cues
│   │   └── draw.ts               # course Graphics pass
│   ├── stories/                  # Storybook: force any tier's book, watch it play
│   │   ├── books.ts              # one fixture book per tier
│   │   └── PlugGolf.stories.svelte
│   └── test/shotEngine.test.ts   # headless engine tests (node, no browser)
├── tsconfig.json
└── package.json
```

## The architecture in one line

```
RGS → book → bookEvents → bookEventHandlerMap → emitterEvents → Svelte/Pixi components
```

That is the SDK's own pipeline. Plug Golf slots into it cleanly because it was
always outcome-first: the RGS draws a weighted **book** (via the math package),
and the client only renders the story. The `shot` bookEvent carries the outcome
`tier`; `shotEngine.buildShotTimeline()` compiles that into an ordered list of
motion segments + presentation cues; `GolfScene.svelte` plays them back.

## What is verified in this repo vs. in the monorepo

The **pure game logic** (`src/game/*.ts`) has no framework or Pixi imports, so it
is fully typechecked and unit-tested here, standalone:

```bash
cd apps/plug-golf
npm install            # dev-only: typescript + @types/node
npm run check          # tsc --noEmit over game/ + stories/ + test/  → passes
npm run test:engine    # node --experimental-strip-types test  → all tiers pass
node --experimental-strip-types test/preShot.test.ts   # aim/power input model
```

`test:engine` builds a timeline for every tier × club and asserts: it opens at
the tee, runs 2.5–15.5 s, samples without NaNs, hole-in-ones drop in the cup,
lip-outs stay out, distances match their tier, and a given seed reproduces an
identical story (replay-safe).

The **Svelte/Pixi components** (`*.svelte`, `draw.ts`) import SDK packages
(`pixi-svelte`, the `state-*` contexts) and therefore build only inside a
web-sdk checkout — they are written to the documented API and the reference
`lines` game's conventions, and need a `pnpm build` there to compile.

## Dropping it into the web-sdk

1. Clone the SDK: `git clone https://github.com/StakeEngine/web-sdk && cd web-sdk`
2. Copy this app in: `cp -r <this>/apps/plug-golf apps/plug-golf`
3. `pnpm install` at the root (wires the workspace packages).
4. Reconcile the integration seams against the current `apps/lines` reference,
   since exact context keys/APIs can drift between SDK versions:
   - **context keys** in `GolfScene.svelte` (`eventEmitter`, `onTick`, `playSfx`,
     `playFx`) — match them to what `state-shared` actually provides.
   - **`stateBet.playRound({ mode, ctx })`** in `Game.svelte` — match the real
     `state-bet` API for triggering `wallet/play` with a mode, **and thread `ctx`
     (the player's `aim` + swing `quality`) into the `bookEventHandlerMap`
     context** so the shot animation is biased toward the aim. If the SDK doesn't
     pass a per-round ctx, the handler falls back to centre-aim — still correct,
     just less "responsive".
   - Note: source imports use explicit `.ts` extensions (type-strip / Vite
     friendly). If the SDK's shared tsconfig lacks `allowImportingTsExtensions`,
     drop the extensions — the code is otherwise unchanged.
5. Develop / test / build:
   ```bash
   pnpm run storybook --filter=plug-golf   # visually verify every tier
   pnpm run dev       --filter=plug-golf
   pnpm run build     --filter=plug-golf
   ```
6. Upload the built frontend **and** the math package (`../stake-engine/math`,
   books compressed to `.jsonl.zst`) through the Stake Engine dashboard.

## The bookEvent contract (keep both sides in sync)

The math generator (`../stake-engine/generate-math.mjs`) emits, per outcome:

```json
{ "id": 5, "events": [
    { "index": 0, "type": "shot", "club": "driver", "tier": "green", "payoutMultiplier": 100 },
    { "index": 1, "type": "finalWin", "amount": 100 }
  ], "payoutMultiplier": 100 }
```

`payoutMultiplier`/`amount` are integers ×100 (`100` = 1.0×). `typesBookEvent.ts`
is the TypeScript mirror of this shape, and `bookEventHandlerMap.ts` consumes it.
If you add a tier or event, change it in both places.

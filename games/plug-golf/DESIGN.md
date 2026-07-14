# PLUG GOLF — Game Design & Math Model

*RNG skill-fantasy golf for Plug TV. A complete round in 8–15 seconds.*

> **Status:** concept + playable prototype (`index.html`) + verified math (`verify-rtp.mjs`).
> Everything in this doc is implemented in the prototype unless marked **[roadmap]**.

---

## 1. The one-line pitch

The player feels like they're influencing the shot; the RNG decides the outcome.
Players should never feel cheated — they should feel *"I almost landed that one."*

Golf is uniquely suited to this: everyone intuitively accepts that a ball can catch
the wind, spin back, kick off a slope, or lip out. Those beliefs make the animation
layer credible, and the animation layer is what masks the RNG.

## 2. Core loop (8–15 seconds per round)

| Step | Player action | What it really does |
|---|---|---|
| 1. Select club | Wedge / Short Iron / Long Iron / 3 Wood / Driver | **Selects the paytable** (volatility profile). Also sets cosmetic ball flight: arc height, hang time, bounce count. |
| 2. Aim | Drag a target reticle around the green (Golf Clash style) | Cosmetic only. The final resting spot is *biased toward the aim direction* so the shot always feels responsive. |
| 3. Power | Pull the ball back, release. A "PURE" band rewards timing | Cosmetic only. Good timing tightens the angular scatter of the resting spot *within the drawn tier* — it never changes the payout. |
| 4. RNG | — | The multiplier is drawn from the club's paytable **the instant the player releases**. Bet is settled against this draw. |
| 5. Animation | Watch the shot unfold | A story timeline is *generated backwards from the drawn outcome*: flight → gust → bounce → roll → lip → result. |

**The golden rule:** money flows are decided in step 4 only. Steps 2, 3 and 5 are
presentation. This is the same architecture as crash/plinko/mines-style instant-win
games and it's what keeps the game honest and certifiable.

### 2.1 The skill illusion (a hard requirement)

The outcome is RNG (~96.5% RTP), but the player must *feel* they're influencing the
shot. That feel is built from cosmetic-only levers that shape presentation without
ever touching the payout:

- **Aim biases the finish.** The resting spot is drawn in the *direction of the
  player's aim* (within whatever tier the RNG gave), so a shot ends up roughly where
  they aimed — not teleported to a random spot.
- **Timing tightens the shot.** Swing quality (from the pull-back "PURE" band) tightens
  the angular scatter of the finish *and* straightens the ball flight — a pure strike
  flies truer through the wind; a mistimed one bends and scatters more.
- **The story sells it.** Wind, spin, bounce and lip are things players already
  believe can move a golf ball, so the animation that masks the RNG reads as physics,
  not a slot reel.

None of these change the drawn multiplier — verifiable, certifiable, and disclosed as
non-outcome-affecting (§7.4 compliance). The skill is *felt*, the fairness is *fixed*.

## 3. Scoring fiction: Closest to the Pin

Every round is a closest-to-the-pin challenge. The multiplier maps to how close the
ball finishes, so the player reads the result off the course, not off a paytable:

| Final position | Read-out | Multiplier band |
|---|---|---|
| Water / trees / OB | "Out of play" | 0x |
| Deep rough | 14–19 m | 0.2x |
| Bunker | 9–12 m | 0.5x |
| Fringe | 6–8.5 m | 0.8x |
| Safe green | 3.5–5 m | 1x |
| Birdie range | ~2 m | 1.5–2x |
| Tap-in | ~1 m | 3–5x |
| **Lip-out** | 20–40 cm | 10–15x |
| **In the hole** | 0 | 25x / 50x / 100x |

The lip-out tier is deliberate: a ball that circles the cup and stays out *paying 10x*
converts the near-miss into a real win — the "almost" moment pays, which is why it
never feels like a cheat.

## 4. Math model

All modes target **96.50% RTP exactly**. Weights are integers per 10,000 and live in
one place: the `<script id="paytables">` JSON block inside `index.html`. The game
plays from that block and `verify-rtp.mjs` asserts it, so the shipped math and the
documented math cannot drift.

Run the check:

```
node games/plug-golf/verify-rtp.mjs
```

### 4.1 Paytables (weights / 10,000)

| Multiplier | Wedge | Short Iron | Long Iron | 3 Wood | Driver | Sunday Masters |
|---:|---:|---:|---:|---:|---:|---:|
| 0x    | 1312 | 2282 | 3334 | 3889 | 4643 | 6090 |
| 0.2x  | —    | 1500 | 1400 | 1300 | 1200 | —    |
| 0.5x  | 2000 | 1800 | 1500 | 1300 | 1100 | 1500 |
| 0.8x  | 2200 | 1400 | 1100 | 1000 | 800  | —    |
| 1x    | 2350 | 1350 | 1150 | 1000 | 850  | 1050 |
| 1.5x  | 1200 | —    | —    | —    | —    | —    |
| 2x    | 650  | 900  | 950  | 895  | 800  | 800  |
| 3x    | —    | 500  | —    | —    | —    | —    |
| 5x    | 288  | —    | 380  | 400  | 380  | 350  |
| 10x   | —    | 268  | —    | 150  | 162  | 150  |
| 15x   | —    | —    | 186  | —    | —    | —    |
| 25x   | —    | —    | —    | 66   | 40   | 40   |
| 50x   | —    | —    | —    | —    | 25   | —    |
| 100x  | —    | —    | —    | —    | —    | 20   |

### 4.2 Verified profile per mode

| Mode | RTP | Hit rate (any return) | Win rate (≥1x) | Max | Std dev |
|---|---:|---:|---:|---:|---:|
| Wedge | 96.50% | 86.9% | 44.9% | 5x | 0.86 |
| Short Iron | 96.50% | 77.2% | 30.2% | 10x | 1.68 |
| Long Iron | 96.50% | 66.7% | 26.7% | 15x | 2.19 |
| 3 Wood | 96.50% | 61.1% | 25.1% | 25x | 2.50 |
| Driver | 96.50% | 53.6% | 22.6% | 50x | 3.30 |
| Sunday Masters | 96.50% | 39.1% | 24.1% | 100x | 4.94 |

This gives the club-select screen real meaning without touching RTP: the club **is**
the volatility slider. Casual players live on the Wedge; degens live on the Driver.

### 4.3 Production notes

- **Target platform: Stake Engine** (see §7). The game's outcome-first architecture
  maps 1:1 onto Stake's pre-simulated books model: the RGS draws a weighted
  simulation server-side and the client renders theatre. In demo mode (no RGS
  params) the prototype draws the same paytables locally with `Math.random()`.
- **Compliance flags to review per jurisdiction** before certification:
  - *Skill presentation:* aim/power must be disclosed as non-outcome-affecting in the
    rules screen (standard for this genre, but wording matters).
  - *Engineered near-misses:* the "roll past the lip" flourish on losing/low tiers is
    restricted in some regulated markets. Keep it behind a market-config flag.
  - RTP disclosure and max-win cap per market config.

## 5. Animation storytelling (implemented per tier)

The timeline is compiled at swing time from the drawn tier — every beat below exists
in the prototype:

| Tier | Story |
|---|---|
| 0x | Three variants, randomly chosen: **Water** (mid-flight "GUST! 💨", ball bends right, splash rings + droplets), **Tree** ("CLACK! 🌳", deflection, drops into rough), **Slice** (curves off into right rough). |
| 0.5x | Lands nicely on the fringe… huge bounce into the bunker. Crowd: *"Ooooh!"* |
| 1x / 2x | Lands, bounces, rolls — sometimes **past the lip in slow-mo** before settling ("Inches away! Birdie putt."). |
| 3–5x | Lands past the pin, big backspin, sucks back to tap-in range. Crowd swell. |
| 10–15x | Backspin roll at the cup, heartbeat vignette, **circles the lip 0.8 turns, stays out** — "LIPPED OUT!!" + confetti (it still pays 10x, so the near-miss IS the win). |
| 25x | Wind dies… slow motion… lands soft, creeps to the lip, 1.1 turns… drops. |
| 50x/100x | Extra slow-mo, heartbeat pulse, 1.6 lip turns, drop, gold caption "HOOOOLE IN ONE!!!", fanfare, confetti storm + fireworks. Built to be clipped and shared. |

The hole is an **island green** — the putting surface sits on a landmass ringed by a
sandy shore and surrounded by water, with two bunkers on the green's edge. This makes
the 0x outcome read naturally: any miss is a splash, so a losing round never feels
arbitrary — the player can see there was nowhere safe to land but the green itself.

Supporting systems in the prototype: per-round weather (Sunny / Sunset / Night with
glow ball / Rain with particles — pure tint, zero RTP effect), cosmetic wind HUD with
waving flag, synthesized SFX (strike, bounce, splash, crowd, cup-drop, fanfare) with
mute toggle, and a broadcast-style island-green course render.

### 5.1 Broadcast camera & replay (implemented)

TV-coverage presentation on top of the story timeline:

- **Camera cuts.** Virtual cameras with hard cuts and a broadcast "dip": tee cam
  punch-in at address → whip to a tracking cam that follows the ball in the air →
  cut to a tight landing cam for the bounce/roll/lip. Letterbox bars slide in during
  live coverage. The view is identity during club/aim/power, and pointer input is
  un-projected through the camera, so aiming stays pixel-exact.
- **Slow-mo replay.** Every shot is recorded (ball state per frame). Hole-in-ones
  (25x+) automatically get a broadcast replay — 0.45x speed, 2.1x zoom, deep
  letterbox, blinking "● REPLAY · SLO-MO" bug and a PLUG TV watermark — before the
  result card lands. Any 10x+ result carries a 🎬 WATCH REPLAY button for rewatching;
  tap anywhere to skip. This is the shareable-clip surface: a screen-record of the
  replay IS the marketing asset.

## 6. Feature roadmap **[roadmap]**

- **Lucky Bounce** — rare cosmetic deflections (cart path, rock, spectator sign,
  bridge) as extra 0-RTP variants inside existing tiers.
- **Courses** — Vegas night, Dubai, Scotland links, Japan cherry blossom, Hawaii,
  desert, luxury island, mountain. Pure re-skins of the course renderer; weather
  system already proves the pattern.
- **Characters** *(implemented)* — the identity layer that makes it *The Plug
  Golf*: a roster of streetwear golfers (Drip / Ice / Mic / Baller / Boss / Ace),
  each with an accent colour, a coloured ball-trail ("the drip"), their own win
  call-out, **a procedural golfer figure that swings at the tee**, and **a
  signature win celebration** — a distinct pose (Mic raises a mic, Boss throws up
  a crown, Baller slides, Ace flexes…) with a themed emoji burst and their
  call-out, played before the result card. Selectable from a HUD avatar chip,
  persisted in localStorage, plus a branded intro splash. All cosmetic, zero RTP
  effect. Roster data (incl. pose + burst) is shared, typechecked, and tested
  (`src/game/characters.ts`). Still open: fuller per-character swing rigs and
  unlockable skins.
- **Sunday Masters as true feature-buy** — currently a 6th mode at equal stake;
  production version becomes a paid-entry event (e.g. 50x stake buys N shots on an
  exclusive course with the 100x table), mirroring slot bonus-buy economics.
- **Progression** — legendary clubs, ball skins, swing trails, crowd celebrations,
  carts, player intros, course themes. All cosmetic, all 0-RTP, all retention.
- **Share clip export** — the camera cuts and slow-mo replay are in (§5.1); the
  remaining piece is one-tap export of the replay as a video/GIF for socials.

## 7. Stake Engine integration

Plug Golf is built for **Stake Engine** (stake-engine.com). Stake's RGS works on
pre-simulated *books*: at bet time the RGS picks a simulation weighted by a lookup
table and returns its `payoutMultiplier` + `events`; the client only plays back the
story. That is literally this game's architecture, so the integration is thin.

Two separate deliverables, matching Stake's two SDKs:

1. **Math package** (`stake-engine/`) — the math-sdk output: books + lookup tables
   + `index.json`. Covered in §7.1.
2. **Frontend** — Stake requires the game frontend to be built on its **web-sdk**
   (a Svelte 5 + PixiJS 8 monorepo); custom HTML/canvas frontends are not accepted.
   The web-sdk game module lives in `stake-web-sdk/` and is covered in §7.5. The
   canvas prototype (`index.html`) remains the design reference and standalone demo.

### 7.1 Math package (`stake-engine/`)

`node stake-engine/generate-math.mjs` reads the paytable block out of `index.html`
and emits Stake's required files into `stake-engine/math/`:

- `books_<mode>.jsonl` — one line per outcome:
  `{"id":N,"events":[{"type":"shot","tier":…},{"type":"finalWin",…}],"payoutMultiplier":INT}`
  with the multiplier as an integer ×100 (e.g. `1150` = 11.5x) per Stake's spec.
- `lookUpTable_<mode>.csv` — `simulationNumber,weight,payoutMultiplier`, payout
  column matching the books exactly.
- `index.json` — the mode manifest (name, cost, events file, weights file).

Because the game is a discrete instant win, the outcome space is enumerated exactly
(each paytable row = one simulation), so RTP is exact by construction — no Monte
Carlo, no optimizer. The generator re-verifies 96.50% per mode from the emitted
integer tables. Before upload, compress the books: `zstd math/books_*.jsonl`.

Mode names on the wire: `wedge`, `short_iron`, `long_iron`, `three_wood`, `driver`,
`masters`, all `cost: 1.0` (Masters can be repriced as a feature-buy by raising its
mode cost — the table already carries the 100x top).

### 7.2 The bookEvent contract

Each generated book carries two events the frontend consumes:

```json
{ "index": 0, "type": "shot", "club": "driver", "tier": "green", "payoutMultiplier": 100 }
{ "index": 1, "type": "finalWin", "amount": 100 }
```

`payoutMultiplier`/`amount` are integers ×100. The `shot` event's `tier` selects
the animation; `payoutMultiplier` distinguishes the 25x / 50x / 100x hole-in-one
presentations. This shape is mirrored in TypeScript at
`stake-web-sdk/apps/plug-golf/src/game/typesBookEvent.ts`; the two must stay in
sync (the generator and the type are the two ends of one contract).

### 7.3 Reference RGS adapter + local harness (prototype only)

The canvas prototype includes a direct RGS adapter (used when launched with
`?sessionID=…&rgs_url=…`) and a mock RGS (`stake-engine/mock-rgs.mjs`) that serves
the generated math package through the real endpoints. This was the proof that the
outcome-first design settles correctly against a wallet: the automated harness
drives rounds through `wallet/play` → `wallet/end-round` and asserts the rendered
outcome equals the server's drawn book and balances reconcile. In the shipping
game this wallet flow is handled by the web-sdk's `state-bet` machine (§7.5), not
by hand-rolled fetches — the prototype adapter stays as a reference/demo.

### 7.4 Remaining for submission

The full, ordered checklist is in **`stake-engine/SUBMISSION.md`**. In brief:

- Build the web-sdk frontend in a monorepo checkout and reconcile the integration
  seams (§7.5); upload it plus the `zstd`-compressed math package via the Stake
  Engine dashboard, then ACP (Acceptance Criteria Process) checks.
- Decide Masters pricing (`cost` in `index.json` — feature-buy vs equal stake).
- Compliance review per market (skill-presentation disclosure, engineered
  near-miss flag, RTP + max-win statements).
- Operator-facing assets: game tile art, name, description, max-win statement
  (currently 100x in Masters, 50x base game via Driver).

### 7.5 Web-sdk frontend (`stake-web-sdk/`)

The game module that drops into `apps/plug-golf/` of a web-sdk checkout. It plugs
into the SDK pipeline `RGS → book → bookEvents → bookEventHandlerMap →
emitterEvents → components`:

- **Pure game logic** (`src/game/`) — ported out of the prototype into
  framework-free TypeScript: `shotEngine.ts` compiles an outcome into a
  declarative animation `Timeline` (flight/bounce/roll/lip/drop segments +
  caption/sfx/camera/fx cues) with a seeded RNG so a book id always renders the
  same story; `bookEventHandlerMap.ts` is the SDK glue. This layer is typechecked
  and unit-tested standalone in this repo (`npm run check`, `npm run test:engine` —
  every tier × club asserted: opens at the tee, sane duration, hole-in-ones drop,
  lip-outs stay out, replay-deterministic).
- **Pure input model** (`src/game/preShot.ts`) — the aim-clamp, pull→power, and
  cosmetic swing-quality logic, ported out of the prototype and unit-tested
  headless (aim clamps to the green, pull clamps 0–1, quality peaks at the pure
  pull, none of it touches payout).
- **Svelte 5 + PixiJS 8 components** (`src/components/`) — `GolfScene.svelte` walks
  the timeline and fires cues; `Game.svelte` drives the full club → aim → power →
  swing flow on top of `preShot.ts` (SVG reticle + aim line + pull-back power
  meter overlay) and calls `state-bet` to spin, threading the player's aim +
  quality into the handler context. These build only inside the monorepo (they
  import `pixi-svelte` and SDK contexts); written to the reference `lines` game's
  conventions.
- **Storybook** (`src/stories/`) — force any tier's book and watch it play, the
  SDK's standard way to verify book playback.

See `stake-web-sdk/README.md` for the drop-in steps and the two seams to reconcile
against the current SDK version (context keys in `GolfScene.svelte`, the
`state-bet` play API in `Game.svelte`).

## 8. Running the prototype

Open `games/plug-golf/index.html` in any browser — single file, no build, no
dependencies, works on mobile (touch) and desktop (mouse). Fun-credit balance only.

Debug hooks: `window.__plug.autoShot('driver', 10)` plays an automated fast round
and resolves with the outcome; `window.__plug.CFG` exposes the live paytables.

## 9. Visual assets (swap point for production art)

Everything renders procedurally (canvas shapes, gradients, emoji) so the game runs
as a single self-contained file, but the polished/branded pieces now come through
an **asset system** built for drop-in replacement before Stake upload.

**How it works.** `ASSET_SVG` in `index.html` holds an inline vector placeholder
per slot; the renderer uses the loaded image where present and falls back to
procedural drawing if a slot is missing, so nothing can break. To ship production
art, set `ASSET_SRC[id] = 'assets/<file>.png'` (a designer's sprite, or an
AI-generated image) — it overrides that slot with **no other code change**.

**Slots live now** (vector placeholders in place, swap-ready):

| id | used for | render size | spec for production art |
|---|---|---|---|
| `ball` | the golf ball, every frame | ~18 px (scales with height) | 96×96 PNG, transparent, centred, top-left light, soft dimples |
| `logo` | HUD + intro emblem | 22 / 76 px | 256×256, transparent, works on dark, green/`#39ff7a` key |
| `coin` | balance pill | 15 px | 64×64, transparent, gold |
| `trophy` | jackpot result card | 62 px | 256×256, transparent, gold, celebratory |

**Highest-impact slots to add next** (currently procedural; recommend commissioning
or generating, then registering new ids the same way):

- **Golfer sprites** — the mascots are procedurally drawn. Production art wants a
  per-character sprite set with **swing frames** (address → top → impact → follow)
  and **celebration** poses, ~512 px tall, transparent, matching each character's
  accent colour. This is the single biggest visual upgrade.
- **Course / island** — the island green, water, bunkers, shore. Either a painted
  background plate (portrait, ~1080×1920 safe) or a tile/atlas set; keep the pin,
  hole, and green centred on the existing geometry (see `GREEN`, `RADII`).
- **Flag, bunkers rim, lily pads, rocks, trees** — small transparent sprites to
  replace the procedural decorations.
- **UI chrome** — pill/panel frames, button skins, the wind dial.

All art is cosmetic and **must not encode outcome** — the tier the RGS returns
drives which animation plays, never the art. Keep sizes/anchors as above so drops
are 1:1. In the web-sdk build these same slots become Pixi textures/sprite sheets;
the ids and specs carry over.

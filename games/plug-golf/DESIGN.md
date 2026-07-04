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

All modes target **96.00% RTP exactly**. Weights are integers per 10,000 and live in
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
| 0x    | 1362 | 2332 | 3384 | 3939 | 4693 | 6140 |
| 0.2x  | —    | 1500 | 1400 | 1300 | 1200 | —    |
| 0.5x  | 2000 | 1800 | 1500 | 1300 | 1100 | 1500 |
| 0.8x  | 2200 | 1400 | 1100 | 1000 | 800  | —    |
| 1x    | 2300 | 1300 | 1100 | 950  | 800  | 1000 |
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
| Wedge | 96.00% | 86.4% | 44.4% | 5x | 0.87 |
| Short Iron | 96.00% | 76.7% | 29.7% | 10x | 1.68 |
| Long Iron | 96.00% | 66.2% | 26.2% | 15x | 2.19 |
| 3 Wood | 96.00% | 60.6% | 24.6% | 25x | 2.50 |
| Driver | 96.00% | 53.1% | 22.1% | 50x | 3.30 |
| Sunday Masters | 96.00% | 38.6% | 23.6% | 100x | 4.94 |

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

Supporting systems in the prototype: per-round weather (Sunny / Sunset / Night with
glow ball / Rain with particles — pure tint, zero RTP effect), cosmetic wind HUD with
waving flag, synthesized SFX (strike, bounce, splash, crowd, cup-drop, fanfare) with
mute toggle, and a stripes-and-shadows broadcast-style course render.

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
- **Characters** — this is what makes it *The Plug Golf*: streetwear golfers,
  rappers, footballers, influencers. Unique swing intros + celebrations. Cosmetic.
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
Carlo, no optimizer. The generator re-verifies 96.00% per mode from the emitted
integer tables. Before upload, compress the books: `zstd math/books_*.jsonl`.

Mode names on the wire: `wedge`, `short_iron`, `long_iron`, `three_wood`, `driver`,
`masters`, all `cost: 1.0` (Masters can be repriced as a feature-buy by raising its
mode cost — the table already carries the 100x top).

### 7.2 Client RGS adapter (in `index.html`)

When launched with Stake's query params (`?sessionID=…&rgs_url=…&currency=…`) the
game switches from demo credits to the RGS wallet, with amounts in micro-units
(1,000,000 = 1.00):

- boot → `POST /wallet/authenticate` — real balance + operator bet levels
  (`config.betLevels`) replace the demo defaults
- swing release → `POST /wallet/play {amount, mode}` — server draws the book; the
  client stages the animation from the returned tier and `payoutMultiplier/100`
- result → `POST /wallet/end-round` — credits the win; balance re-synced from the
  response. Connection failure at swing time aborts cleanly ("shot not placed").

### 7.3 Local end-to-end harness

`node stake-engine/mock-rgs.mjs` serves the *generated math package* through the
RGS endpoints (weighted draw from the lookup tables, events from the books). Open
`index.html?sessionID=test&rgs_url=http://127.0.0.1:8791` to play against it. The
automated test drives rounds through this stack and asserts the client's rendered
outcome equals the server's drawn book and that balances reconcile after settle.

### 7.4 Remaining for submission

- `zstd` compression of books + upload via the Stake Engine dashboard, then ACP
  (Acceptance Criteria Process) checks on their side.
- Decide Masters pricing (`cost` in `index.json`).
- Operator-facing assets: game tile art, name, description, max-win statement
  (currently 100x in Masters, 50x base game via Driver).

## 8. Running the prototype

Open `games/plug-golf/index.html` in any browser — single file, no build, no
dependencies, works on mobile (touch) and desktop (mouse). Fun-credit balance only.

Debug hooks: `window.__plug.autoShot('driver', 10)` plays an automated fast round
and resolves with the outcome; `window.__plug.CFG` exposes the live paytables.

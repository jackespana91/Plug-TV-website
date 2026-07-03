# PAPERBOY: THE RUN
## Game Design Document — v1.0

> **Phase 1 deliverable.** This document covers the player fantasy, gameplay loop, UI, animation, audio, features and session flow. It deliberately contains **no probabilities, no RTP figures, and no math** — the mathematical model lives in `02-math-model.md` and is designed *after* this document is locked. Art direction lives in `03-art-direction.md`.
>
> Reference concept: `concept-mockup.png`

---

## 1. Vision Statement

**Paperboy: The Run** is a crash-style instant-win casino game that plays like a memory of the greatest arcade game you never owned.

You are not spinning reels. You are a kid on a BMX at golden hour, bag full of newspapers, riding a street that wants to stop you. Every house you hit grows your multiplier. Every hazard you survive is a story. You can bank your winnings after any delivery — or push one house further.

### Design Pillars

1. **Arcade first, casino second.** Nothing on screen says "slot." The button says **DELIVER**, not Spin. The core screen is a living street, not a reel window. If a player screenshots the game, it should look like a premium mobile arcade title.
2. **"I survived."** The emotional core is escape, not reward. The dog lunged and missed. The car swerved and you threaded the gap. The multiplier is the scoreboard of your survival, and the player should *feel* like the escape was skill — even though the outcome was decided the instant they pressed DELIVER.
3. **One more house.** Every design decision serves the cash-out tension: the gap between "bank it now" and "one more house" must be physically felt — leaning forward, thumb hovering over CASH OUT.
4. **$50M polish.** Pixar-quality character animation, cinematic camera, layered audio, zero dead frames. Every state transition is animated. Nothing pops; everything moves.
5. **Fair and certifiable.** The entire visual layer is a *renderer of a pre-determined RNG outcome*. Presentation never changes probability; probability never depends on presentation. (See math doc.)

---

## 2. Game Classification

| | |
|---|---|
| **Genre** | Crash / instant-win ladder ("cash-out" game) |
| **Theme** | Retro-nostalgic suburban newspaper delivery, stylized 3D |
| **Session shape** | Short rounds (6–30 seconds typical), rapid re-bet |
| **Player decisions** | Bet size, difficulty profile, cash-out timing (manual or auto) |
| **Platforms** | Mobile-first (portrait & landscape), desktop web |
| **Comparable titles** | Aviator, Chicken Road, Cash-or-Crash — but with genuine character-driven presentation none of them attempt |

---

## 3. Core Gameplay Loop

### 3.1 The Round, second by second

```
BET SET → [DELIVER] → RIDE-UP → HOUSE 1 → HOUSE 2 → … → CASH OUT  (win)
                                    │          │
                                    └──────────┴──→ WIPEOUT        (loss)
```

1. **Set bet** (and optionally auto-cashout target / difficulty). The street idles in attract mode: sprinklers tick, a dog naps on a porch, the paperboy circles at the kerb doing lazy balance moves.
2. **Press DELIVER.** The button depresses with a heavy mechanical *clunk*. Bag strap tightens (0.3s character animation), the paperboy stands on the pedals, and the run begins. *At this moment the round's outcome is already fixed by the RNG — everything after is theatre.*
3. **The run.** The camera drops into a low chase position behind the rider. Houses approach on both sides. At each house, the paperboy throws a paper — a satisfying arc, a porch *thwack*, and the multiplier ticks up with a rising musical note. Between houses, hazards appear, telegraph, and resolve (survived or fatal — see §8).
4. **The decision.** After every successful delivery there is a **decision window** (~1.2s at base speed) in which CASH OUT is lit, pulsing, and shows the live amount: `CASH OUT · 24.00`. The world subtly slows during this window (95% speed) — enough to feel the door open, not enough to feel paused.
5. **Cash out** → the paperboy skids a 180° stop, win celebration plays scaled to the size of the result (§10), balance counts up, round ends.
6. **Wipeout** → the fatal hazard resolves against the player (§13), loss is presented in ≤ 2.5s, and the DELIVER button is already re-armed. Losses are fast and dignified; wins linger.

### 3.2 What the player actually controls

The player never steers. Player agency is entirely:

- **Bet size** (stepper + quick chips: min / 1 / 5 / 10 / 25 / max).
- **Route (difficulty) selection** — see §4.
- **When to cash out** — the whole game.
- **Auto-cashout** — set a target multiplier; the game banks automatically. Power-user feature, also required for regulatory reality-check compatibility.
- **Turbo mode** — compresses house-to-house travel time for grinders; decision windows keep their full duration (never rush the choice, only the travel).

### 3.3 Why this loop works

The crash genre's proven engine is *visible unrealized winnings + voluntary risk*. Our contribution is wrapping that engine in a body: the multiplier isn't an abstract curve going up, it's **distance survived down a street you can see**, with the danger physically visible ahead. When a player cashes out at x12, they don't think "I stopped the curve at 12" — they think "I got out right before that dog got me."

---

## 4. Routes (Difficulty Profiles)

Selected pre-round via three postcard-style route cards. Difficulty is expressed *diegetically* — the street itself looks more dangerous.

| Route | Fantasy | Feel |
|---|---|---|
| **🌅 Easy Street** | Wide sunny cul-de-sac, big lawns, sleepy dogs behind fences | Slow multiplier growth, long runs, gentle. The "learn the game" and low-volatility choice. |
| **🏘 Suburbia** | Classic dense suburb, parked cars, kids on skateboards | The default. Balanced growth and danger. |
| **🌆 Dog Alley** | Narrow street, broken fences, dogs loose, dusk light | Steep multiplier growth, short brutal runs. High volatility. Everything about its look says "you will not be here long." |

The route card shows a preview strip of the street, its multiplier ladder pace ("multiplier grows FAST"), and its max win. No probabilities shown — the *street tells you* (math doc defines actual values).

---

## 5. Screens & Flow

### 5.1 Screen map

```
LOADING → LOBBY/ATTRACT → GAME (core) ⇄ PAYTABLE / INFO
                              ⇄ SETTINGS
                              ⇄ HISTORY (my runs)
                              ⇄ LEADERBOARD (best runs)
```

### 5.2 Loading screen
Paperboy pedals across the bottom of the screen; the loading bar is a rolled newspaper filling with print. Tips rotate: *"You can cash out after ANY delivery."* Target: interactive in < 5s on 4G.

### 5.3 Attract / idle state
The game screen itself is the lobby. Street lives in the background (ambient loops: birds, distant lawnmower, chain clicks). DELIVER button breathes. After 20s idle, a short "demo ghost run" plays washed-out in the background with a `DEMO` watermark — silent onboarding.

### 5.4 Core game HUD (portrait-first)

```
┌─────────────────────────────┐
│  ⌂ 7 DELIVERED   BEST x36   │   ← top strip: run stats, best-run trophy
│                             │
│                             │
│        THE STREET           │   ← 70% of screen. Sacred. No UI overlap.
│      (chase camera)         │
│         [ x12 ]             │   ← multiplier lives IN the world, floating
│                             │      above the rider, growing with value
│                             │
│  ┌───────────────────────┐  │
│  │  CASH OUT  ·  120.00  │  │   ← the decision button. Huge. Green. Alive.
│  └───────────────────────┘  │
│  BET 1.00  [-][+]  ⚡ AUTO  │   ← bet strip (locked during run)
│  BALANCE 1,000.00      ☰   │
└─────────────────────────────┘
```

Key HUD rules:

- **The multiplier is diegetic.** It floats in the 3D scene above/behind the rider and physically *grows in size and heat* as it climbs (white → gold → ember → on-fire at extreme values). It is the game's face.
- **One primary button.** Pre-run it's DELIVER (blue-collar green, big). Mid-run the same physical button *becomes* CASH OUT with the live amount. The player's thumb never moves.
- **Current win is on the button, not in a corner.** The number the player is protecting must live under their thumb.
- **Everything else recedes mid-run.** Bet strip and menu dim to 40% during the run. The screen is street + button.

### 5.5 Paytable / info
Scrollable, illustrated like the concept mockup's side panels: multiplier ladder per route, collectible values, Perfect Run bonus, Daily Big Paper bonus, hazard gallery ("Meet the neighborhood"), and the fairness statement ("outcomes are determined by a certified RNG before your run begins"). RTP figure displayed as required per jurisdiction.

### 5.6 History
"My Runs" — each past round rendered as a mini street strip: houses delivered, where it ended, cash-out point or wipeout cause ("Caught by dog at house 9"). Turns bet history into war stories.

### 5.7 Leaderboard
Daily/weekly **longest run** (streets survived, not money — keeps it arcade and avoids flaunting stake sizes). Best-run trophy on the HUD ties to it.

---

## 6. Camera & Presentation

- **Chase cam** low behind the rider, slight dutch on turns, gentle handheld sway. FOV widens subtly as the multiplier grows — speed you can feel.
- **Delivery micro-cut:** on each throw, a 200ms overlay flash of the porch hit (picture-in-picture polaroid that stamps the multiplier: `x8!`) without cutting the main camera.
- **Hazard grammar:** every hazard gets a **telegraph** (you see it coming: bark from behind a fence, reversing lights, sprinkler ticking) → **threat** (it enters your lane) → **resolution** (escape or wipeout). The telegraph-to-resolution beat is the game's heartbeat. ~1.5–2.5s per hazard event.
- **Near-miss slow-motion (§9)** is reserved for survived hazards flagged as dramatic — never on wipeouts (losses resolve fast).
- **Speed ramp:** the world scrolls slightly faster every N houses. Late-run streets *feel* like white-knuckle territory even before anything appears.

---

## 7. Neighborhoods (Dynamic Environments)

The street is rebuilt every run from themed tile sets. Environment is **cosmetic variety layered over the same certified math** — a rich neighborhood does not pay differently (unless a themed event explicitly ships as a separate certified configuration).

### Rotating by time / mood
- **Morning** — mist, long shadows, sprinklers, joggers
- **Afternoon** — kids everywhere, ice-cream truck, skateboards
- **Sunset** *(hero look, default)* — golden hour, fireflies, porch lights flicking on
- **Night** — streetlamp pools, raccoons on bins, glowing windows

### Destination themes (unlock by play volume, pure cosmetics)
- **Rich Neighborhood** — gates, fountains, angry poodles, golf carts
- **Trailer Park** — dirt track, loose boards, the *meanest* dogs
- **Beachfront** — boardwalk, seagull dive-bombs, rogue beach balls
- **Downtown** — taxis, delivery vans, alley cats, steam vents

### Seasonal events
- **Halloween** — jack-o'-lanterns, trick-or-treaters, a black cat hazard, papers replaced with candy bags
- **Christmas** — snow trails behind the tires, lights on every eave, snowman hazards, sleigh-bell layer in the music

Each theme swaps hazard *skins* onto the same event slots (a "dog" event in Beachfront is a seagull; downtown's "car" is a taxi). One math model, infinite streets.

---

## 8. Hazards (The Cast of Villains)

Hazards are the visual language of risk. Every hazard has an idle form (telegraphs), an attack form, a survived form, and a fatal form.

| Hazard | Telegraph | Survived looks like | Fatal looks like |
|---|---|---|---|
| 🐕 **Dog** (star villain) | Bark audio, ears over fence line | Lunges, jaws snap on empty air, paperboy tucks legs up | Grabs the bag strap, bike topples |
| 🚗 **Car** | Reversing lights / engine note | Swerve through the gap, horn doppler | Clipped rear wheel, slow tumble |
| 🛹 **Skateboard kid** | Rolling rattle from a driveway | Bunny-hop OVER the board | Wheels tangle |
| 🚧 **Construction** | Cones, jackhammer audio | Plank ramp jump (crowd of workers cheers) | Front wheel in fresh cement |
| 💦 **Sprinkler** | Tick-tick-tick rotation | Ride the water arc, rainbow VFX | Slick patch slide-out |
| 🗑 **Trash cans** | Raccoon eyes glowing inside | Weave between them | Domino crash |

**Hazard = drama, not information.** Which hazard appears and whether it's survived is decided by the RNG outcome; the client picks *skins* for each scripted beat. A player cannot read danger levels from hazard type — they can only read it from the route they chose and how deep they've pushed.

---

## 9. Near Misses — The Signature Moment

The single most important piece of presentation in the game.

When the RNG outcome includes a survival at a step flagged **dramatic** (see math doc: "near-miss dressing on survived steps"), the game escalates:

1. **Time dips to 30%.** Music ducks to heartbeat + chain click.
2. **Camera pushes in.** The dog is airborne. Jaws open. Frame almost touches.
3. **The gap.** Two or three frames where it genuinely looks lost.
4. **Snap back to 100% speed** with a bass hit. Dog tumbles into a hedge. Neighbors on a porch *cheer*. Paperboy looks back over his shoulder, wide-eyed, then grins.
5. The multiplier **slams** to its new value with an oversized stamp animation — near-miss survivals present their multiplier gain 3× louder than routine deliveries.

Frequency discipline: dramatic dressing appears on only a minority of survivals so it never inflates to wallpaper. **Never** use near-miss framing on a loss (no "you almost survived" — that's the classic slot dark pattern and it undermines pillar 5's spirit). Losses are clean; survivals are cinematic.

---

## 10. Character — The Paperboy

The paperboy is the game's mascot and emotional anchor. Working name: **Ace**.

- **Design:** 11-year-old energy, backwards red cap, oversized canvas bag, mismatched socks. Pixar-grade squash-and-stretch. Readable silhouette at 80px.
- **Personality states**, driven by run context:
  - *Idle:* track stands, seat wheelies, flips a paper and catches it
  - *Early run:* relaxed one-handed riding, casual throws
  - *Mid run (multiplier warming):* standing on pedals, focused, quicker throws
  - *Deep run:* white-knuckle, glances over shoulder, bag nearly empty, jacket flapping
  - *After a near miss:* laughs, fist pump, shaky exhale
  - *Milestone deliveries (x5/x10/x25/x50):* wheelie, bunny hop, no-look behind-the-back throw, high-fives a kid at the kerb
  - *Cash-out:* skid-stop 180, arms up; big wins add the bike toss + freeze-frame
  - *Wipeout:* cartoon tumble, sits up dazed, papers fluttering down; picks up the bike, shakes head, half-smile at camera — "again?"
- **Rule:** Ace never looks miserable. Losses read as slapstick, not tragedy. The player's relationship with Ace must survive a hundred wipeouts.

---

## 11. Collectibles & Bonus Features

All bonuses are RNG outcomes visualized as pickups — the pre-determined result includes them; the street just makes them physical. Values/frequencies defined in the math doc.

### On-street collectibles (mid-run instant bonuses)
| Collectible | Presentation | Effect |
|---|---|---|
| ⭐ **VIP Newspaper** | A house with a gold porch light; the throw gets a trick animation | Instant multiplier bump on top of ladder |
| 💰 **Money Envelope** | A neighbor waves you down, hands it off in a rolling high-five | Instant fixed-prize add to current win |
| 🎁 **Subscription Reward** | Mailbox flag pops with a gift box | Grants one **Free Delivery** (a bonus step) |
| 📰 **Golden Newspaper** | Glinting paper in the bag, thrown in slow-mo, trail of light | Multiplies the *current* win — the run's jackpot moment |

### 🗞 Daily Big Paper — Bonus Round
Rare trigger (RNG-selected): the street opens onto **Main Street**, wide and cheering. The paperboy hurls the giant Sunday edition at the town notice board in full slow-mo cinematic; where it hits determines a bonus prize revealed as the board's headline: **"LOCAL KID WINS 250.00!"** One button, pure spectacle, big-value moment.

### 🏆 Perfect Run Bonus
Deliver a threshold number of houses (per mockup: 10+) without any hazard so much as touching you → confetti street parade, marching-band sting, flat bonus added at cash-out. Rewards deep pushes with a *visible* extra goal, giving mid-run milestones beyond the multiplier itself.

### Random street events (cosmetic variety + rare bonus carriers)
- 🚚 Garbage truck blocks the road → detour through an alley (new scenery beat)
- 🚓 Police chase crosses the street → freeze beat, then continue
- 🌧 Rain rolls in → wet asphalt reflections, tire hiss (pure mood)
- 🐕🐕 **Two dogs** → the double-lunge near-miss, the game's most-clipped moment
- 🎉 Block party → crowd density, music from a garage band, high-five gauntlet
- Seasonal: Halloween decorations, Christmas lights (per §7)

Events are *presentation slots*: they dress the same underlying outcome steps, keeping every run visually unique without touching certified math.

---

## 12. Win Celebrations (Tiered)

| Tier | Trigger (indicative) | Celebration |
|---|---|---|
| **Nice** | < 2× bet | Skid stop, coin sprinkle, quick count-up, 1.5s |
| **Great** | 2–10× | 180 skid + arms up, paper confetti, porch neighbors clap, count-up with rising ticks, 3s |
| **Big Win** | 10–50× | Freeze-frame "front page photo" of the skid with headline **"PAPER KID DOES IT AGAIN"**, coin fountain, 5s skippable |
| **Epic** | 50–200× | Sunset turns golden, street crowd rushes in, Ace crowd-surfs, full-screen banner, 8s skippable |
| **Legendary / Max Win** | Max win | Newspaper printing-press montage — the win literally becomes tomorrow's front page, rolled, and thrown at the camera. Screen shatter into headlines. 12s, skippable but nobody will |

Count-ups always **accelerate** and land with a bass thump exactly on the final figure. All celebrations skippable by tap (except the last 0.5s settle) — respect the grinder.

---

## 13. Loss Presentation

- Wipeout animation ≤ 1.5s, slapstick tone (§10).
- A single clean info line: `Caught at house 9 · Run paid 0.00` — no lingering, no mourning music, one soft "aww" crowd note.
- The DELIVER button re-arms *during* the dust settle. Time from wipeout to next possible bet: **≤ 2.5s.**
- **No loss-disguised-as-near-win.** No "SO close!" messaging. (Responsible-design line we hold; also see §16.)

---

## 14. Sound Design

**Mix philosophy:** diegetic street first, UI second, music third. The game must be identifiable by audio alone.

- **The bike is the metronome.** Chain click cadence = current run speed; freewheel ratchet during coasting; spoke *ting* on multiplier milestones.
- **Delivery:** bag rustle → paper whoosh → porch **thwack** (12 randomized variants) → rising pitched note per consecutive house (the "ladder motif" — players will hum it).
- **Hazard telegraphs are audio-first:** the bark arrives before the dog is visible. Headphone players get a genuine edge in *perceived* reaction (it's theatre, but it's great theatre).
- **Decision window:** music thins, a soft clock-tick enters, CASH OUT button hum. The audio literally asks the question.
- **Near miss:** full duck to heartbeat + slowed chain; snap-back bass hit; crowd cheer.
- **Cash-out:** skid, register *cha-ching* re-imagined as a canvas coin-bag catch, count-up ticks accelerating.
- **Music:** warm lo-fi funk/breaks bed (nostalgic, not childish), with intensity layers keyed to run depth — drums enter at house 5, bass at 10, full kit deep. Wipeout cuts music to a needle-scratch beat of silence, then the bed resumes lazily.

---

## 15. Tension Architecture

How the game manufactures suspense without touching outcomes:

1. **Rising stakes made visible** — the number under the player's thumb grows; losing it is losing something you already hold (loss aversion, honestly earned).
2. **Speed ramp + music layers** — deeper always *feels* more dangerous.
3. **Telegraphs** — a bark from a yard ahead creates dread across a full second, then resolves. The certainty gap is where tension lives.
4. **The decision window slow-down** — a felt heartbeat where banking is possible and the street ahead is visible but unread.
5. **Best-run ghost** — a faint kerb marker where your best cash-out happened: *you've been deeper than this before.*
6. **Milestone shadows** — approaching x10/x25/x50 the multiplier begins charging visually before it lands, telegraphing the reward of one more house.

---

## 16. Progression, Retention & Responsible Design

**In regulated real-money play, progression is cosmetic and informational only — never gameplay- or odds-affecting.**

- **Route unlock theming** (§7 destination sets) by cumulative runs — cosmetic streets.
- **Best Run trophy + leaderboards** (§5.7) — distance-based, not money-based.
- **Run history as stories** (§5.6).
- **Sticker album:** first survival of each hazard type, first Golden Paper, first Perfect Run, etc. earn album stickers. Pure collection joy, zero payout linkage.
- **Responsible gaming:** native support for reality checks, session/loss limits, self-exclusion; visible session clock in the menu; celebrations never reference "streaks" or imply due wins; loss presentation per §13. Autoplay/auto-rebet conforms per jurisdiction (cap counts, show cumulative result).

---

## 17. Session Flow

**First 60 seconds (new player):** loading tip → attract street → ghost demo run in background → first bet pre-set to minimum → first DELIVER → the game teaches itself: the button they pressed *becomes* the cash-out button with a growing number on it. One contextual nudge on run 1: "Tap to bank your win — or keep riding." Nothing else. No tutorial screens.

**A typical session (target shape):** 15–40 rounds, 6–30s each. Emotional pacing comes from the math doc's volatility work, but presentation ensures: quick losses (≤2.5s), lingering wins, a near-miss or street event every few runs, and a "story moment" (Golden Paper, Big Paper bonus, double dog escape) rare enough to be told to a friend.

**Session end:** on cash-out-and-idle (30s), the street eases to evening, Ace waves. If the session included a best run, a "front page" recap card is offered (shareable image, no money amounts unless the player toggles them on).

---

## 18. Technical Presentation Notes (bridge to Phase 3)

- **Server-authoritative:** bet → server RNG resolves the complete run (steps survived, collectibles, bonus flags, final multiplier) → client receives the outcome script → client *performs* it. Client can neither create nor alter value.
- The client's job is a **dramatizer**: it maps the outcome script's abstract steps ("survive step 6, dramatic flag on step 6, collectible=golden at step 8, bust at step 11") onto hazard skins, street theme, camera and celebration tiers.
- Disconnect mid-animation = outcome already settled server-side; on reconnect the client fast-forwards to the settled state.
- Every claim in this document must hold under that architecture. Any feature idea that requires the client to decide value is out of scope by definition.

---

## 19. Out of Scope (v1)

Multiplayer shared runs, real skill input, tournaments, jackpot pooling, and themed math variants (Halloween/Christmas as *math* rather than skins). All are natural v2+ candidates once the core is certified and live.

---

*Next: `02-math-model.md` — the mathematical model that this presentation layer will dramatize.*

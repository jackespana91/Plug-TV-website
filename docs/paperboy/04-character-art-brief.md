# PAPERBOY: THE RUN
## Character Art Brief — Ace (rider), for a cleaner animated replacement

> This is a production brief for replacing the current programmatic canvas rig (`paperboy/src/game/scene.ts`, `drawRider`/`drawCrashed`) with cleaner, purpose-made animated art. Every number below is pulled directly from the live renderer, so a character built to this spec drops in without touching the perspective math, timing, or gameplay code.
>
> **v1.1 — style and delivery format confirmed.** A concept reference sheet was produced against this brief and approved: **pixel-art Ace, kept even though the rest of the world is smooth/painterly** (at his ~74×83px on-screen size the pixel grid mostly disappears anyway, so the two styles read as compatible rather than mismatched). Delivery format is **sprite sheets** (§6, option 1) — the confirmed per-pose frame counts from that reference are locked into §4 and §6 below. What's still needed: the actual production files (transparent PNG frame strips) — the reference sheet itself is a flattened concept image with captions baked in, not usable game assets.

---

## 1. The camera Ace lives in — read this first

This is **not** a side-view side-scroller. The camera is a fixed chase view down a vanishing-point road (homage to the 1985 Paperboy arcade cabinet): the street recedes to a single vanishing point on the horizon, houses fan out to both sides as they approach, and **Ace is pinned to one fixed point on screen while the world rushes toward the camera**. He never scales, never moves screen-position (beyond small animated wobble), and he is seen **from behind** — his back, shoulders, and the back of his backwards cap, riding away from the viewer.

This is the single most important constraint: **any art that shows his face/front by default is wrong for this camera.** A brief three-quarter turn of the head to flash a bit of cheek/eye is the only front-facing exception (see Pose 6).

- **Stage:** 960 × 540px canvas, 16:9.
- **Ace's fixed anchor:** x = 388, y = 462 (this is his contact-with-ground point, i.e. where his rear tire touches the road). He sits left-of-center; the road's centerline is at x = 480, and the delivery/throw lane fans out to his right.
- **Current bounding box at that anchor:** roughly 74px wide × 83px tall (top of cap ≈ y 384, bottom of rear tire ≈ y 467, left edge ≈ x 354, right edge ≈ x 428 — wider during the throw swing, out to about x 460).
- **Ground shadow:** a soft flattened ellipse directly under him, ~60×14px, dark violet-tinted (not black — see palette).

## 2. Character identity

**Name:** Ace. **Age read:** ~11. **Vibe:** scrappy, delighted, never actually scared even mid-disaster — GDD rule: *"Ace never looks miserable. Losses read as slapstick, not tragedy."*

- Backwards red baseball cap (always backwards — from behind this reads as the cap's crown with the brim peeking out low, near the neckline).
- Blue jacket/windbreaker, open enough at the hem to flap in the wind.
- Canvas newspaper bag on **his right hip**, diagonal strap crossing his back — this side is deliberate: he's riding in the right-hand lane of the road (from our POV) and throws to houses on the right, so bag placement and throw arm agree with each other. Rolled newspapers visible poking out of the bag opening.
- BMX-style bike, red frame, no dropbar — flat/riser bar. Big canvas school-style pedals.
- Build: oversized head and hands relative to body for readability at small sizes (he renders as small as ~65px tall on a phone screen — silhouette must survive that).

## 3. Palette (exact hex, from the live renderer)

| Element | Color | Notes |
|---|---|---|
| Jacket (main) | `#3A6BC5` | |
| Jacket (shade/hem) | `#2E55A0` | shadow side, hem flap |
| Cap + bike frame | `#D64545` | same red ties cap and frame together |
| Cap shade | `#B23A3A` | |
| Skin | `#F0C49A` | |
| Skin (ear/shade) | `#E0AE85` | |
| Hair (peeking under cap) | `#6E4A2C` | |
| Blush | `rgba(255,138,157,0.5)` | soft, cheek only |
| Canvas bag + papers | `#D9C79E` (bag), `#F4F1E8` / `#EDE8DA` (papers) | |
| Bag strap | `#B8A26E` | |
| Bike tires/frame joints | `#23273A` | |
| Wheel spokes | `#8B90A3` | |
| Sneakers | `#F4F1E8` | |
| Ground shadow | `rgba(74,60,110,0.4)` | **violet, never black/grey** — this is a hard rule from the art direction doc; all contact shadows in this game are warm violet, not neutral |
| Rim/edge light | `rgba(255,233,196,0.85)` | warm light from the low sun, always from the same side (see §5) |

The world around him is a golden-hour palette (peach sky, warm violet shadows everywhere) — his art needs a warm rim/highlight on one side to sit believably in that light. Don't render him under flat/neutral lighting.

## 4. Poses / animation states required

The game drives a `pose` field that the renderer switches on every frame; below is the exact list, in the game's own words from the code, with real timings pulled from the director:

| Pose | When it plays | Duration / loop | Frames (confirmed) | What it must show |
|---|---|---|---|---|
| **idle** | Attract screen, between bets | Loops indefinitely | **1** (static hold) | Relaxed, casual stand-by. Personality beat, not urgent — a static hold is fine; a subtle idle loop is a nice-to-have, not required. |
| **ride** | Default cruising state, most of the run | Loops indefinitely, tempo-linked | **8**, looped | Pedaling cycle, gentle vertical bob, hair/jacket hem responds to speed. **Cadence must be able to sync to a speed value** (the game ramps speed from ~260 to 430 px/s across a run) — the playback rate will be scaled at runtime, so draw one clean neutral-speed loop and I'll retime it, no need for multiple speed variants. |
| **throw** | Every delivery (every ~1.2–1.5s during a run) | 450ms, one-shot, returns to `ride` | **6** (≈13fps) | Right arm reaches back toward the right-hip bag, grabs a paper, swings out and releases to the right side. This is the single most-repeated animation in the whole game — it needs to read instantly and stay charming on repeat viewing hundreds of times per session. |
| **wheelie** | Milestone deliveries (×5/×10/×25/×50) and skateboard-hazard hops | 700ms, one-shot, returns to `ride` | **7** (≈10fps) | Whole rig tips back slightly, a little showoff flourish — not a full stunt, just a beat of "nice." |
| **tuck** | Near-miss slow-motion escape (the game's signature moment) | ~930ms real-time (played back in a 0.3× slow-mo window) | **5** | Braces down/forward, **head turns to show a slice of profile — cheek, eye, a "yikes/thrill" expression** — the one moment we break the always-from-behind rule. This is the emotional peak of the whole game; it should read as "oh no—phew." |
| **skid** | Cashing out / reaching the flag | ~900ms into the win celebration | **6** (≈10fps) | A stop skid, slight lean/rotation, arms could go up in celebration on bigger wins (tiered: modest for small wins, bigger flourish for ×10+, confetti-worthy for ×50+ — see GDD §12 win tiers if you want the full tier table). |
| **tumble** | Wipeout (bust) | ~780ms of an actual tumble, rolling motion | **8** (≈10fps) | Comedic, not painful — a cartoon spill, not a crash-test. |
| **crashed / dazed** | Immediately follows tumble, holds until the loss screen | Holds ~450ms+ | **1** static, or a short **3-frame** loop | **This is the one pose that faces the camera** — Ace sat up on the ground next to the toppled bike, spiral/dizzy eyes, papers fluttering down around him, a "...again?" half-smile. Front-facing is deliberate here: it's the one beat where we want to see his face and confirm he's fine. A static hold is fine; a subtle 3-frame loop (e.g. spinning stars) is a nice-to-have. |

Total: **7 back-view states + 1 front-facing recovery pose, 42 frames.** If budget only allows a subset, priority order is: `ride` (seen constantly) → `throw` (seen constantly) → `crashed` (emotional payoff of every loss) → `tuck` (emotional payoff of every near-miss) → `skid`/`tumble` → `wheelie`/`idle` (nice-to-have polish).

## 5. Lighting & finishing notes

- Constant **warm rim light from one side** (the low sun) on every pose — currently implemented as a light stroke along the top/side of the head and shoulders. Keep it consistent across all poses so he doesn't look like he's lit differently frame to frame.
- Shadows on the character (and his ground contact shadow) should be **warm violet-tinted**, matching the world's "no pure black" rule.
- Secondary motion that sells speed: jacket hem flapping, loose papers in the bag riffling — amplitude should scale with how fast he's going (slow flutter at cruise, more agitated at top speed).
- Silhouette test: he needs to read correctly as a small, back-facing figure at roughly 65–90px tall on a phone screen — check readability at that size, not just at a large working canvas size.

## 6. Delivery spec (confirmed: sprite sheets)

**Format:** one PNG per pose, transparent background, frames laid out as a single horizontal strip, left-to-right in playback order.

**File naming** (drop-in match to the game's internal pose names):

```
ace_idle.png       1 frame
ace_ride.png       8 frames, loop
ace_throw.png      6 frames
ace_wheelie.png    7 frames
ace_tuck.png       5 frames
ace_skid.png       6 frames
ace_tumble.png     8 frames
ace_crashed.png    1 frame (or 3, looped)
```

**Frame cell size:** every frame within a sheet must be the same fixed width × height (a uniform grid — I slice by `sheet width ÷ frame count`, so uneven frame widths within one file will misalign). Work at any resolution comfortably above the ~74×83px display size — draw at whatever native pixel-art resolution feels right for the style, then export at a consistent scale across all 8 files (e.g. all at 3× your working grid) so proportions match from sheet to sheet. Exact pixels don't need to hit 74×83 — I scale to fit at render time — but keep the **aspect ratio close to 74:83 (≈0.89:1)** so nothing looks stretched or squashed once it's placed in the game.

**Rendering note:** I'll default to smooth (bilinear) scaling when drawing these into the canvas, matching how the reference sheet looks (detailed pixel-art *style*, not a raw blown-up low-res grid). If you actually want the harder, blocky "nearest-neighbor" pixel look when it's scaled up in-game, say so — it's a one-line rendering change on my end (`imageSmoothingEnabled = false` / CSS `image-rendering: pixelated`), but it also means the source art should be authored at a genuinely small native pixel grid (e.g. 24–32px tall) rather than the more detailed style in the reference sheet.

**Optional but helpful:** a small manifest (JSON or just plain text) confirming frame count and intended fps per file, in case anything above needs adjusting once you see the real art in motion — I'll match the timings above regardless, but it's a good sanity check both ways.

**Anchor consistency:** whatever the frame canvas size ends up being, Ace's ground-contact point (rear tire touching the road) must sit at the **same relative position within every frame, in every pose file** — e.g. always centered horizontally, always N px up from the bottom edge. If that point drifts between poses or between frames within a pose, he'll visibly jump/slide on screen every time the animation switches, since the game always draws from one fixed anchor regardless of which pose is active.

Once these 8 files exist, hand them over and I'll wire them into `scene.ts` (replacing `drawRider`/`drawCrashed`) and `director.ts` (pose triggers are unchanged — same state names, same timings).

## 7. Frame-by-frame shot list (for the animated poses)

A concept sheet delivered one "hero" key frame per pose — a strong start, and each is called out below as the anchor to build the rest of that pose's sequence around. This is the in-between breakdown needed to hit the confirmed frame counts.

**RIDE — 8 frames, one full pedal-crank rotation, looped (crank advances 45° per frame):**
1. Right pedal at 12 o'clock, left at 6 o'clock — passing position
2. Right pedal ~1:30, power stroke beginning, slight forward torso dip
3. Right pedal ~3 o'clock, full power stroke, torso dip at its deepest
4. Right pedal ~4:30, left leg beginning to rise
5. Right pedal at 6 o'clock, left at 12 — mirror of frame 1
6. Right pedal ~7:30
7. Right pedal ~9 o'clock, right leg rising, torso rebounding upward
8. Right pedal ~10:30, approaching frame 1 again (loop seam — frame 8 → frame 1 must read as continuous)

Jacket hem and bag strap should have a small amount of independent sway rather than moving in lockstep with the body, so the loop doesn't look mechanical.

**THROW — 6 frames, 450ms, reach → wind-up → release → follow-through → settle:**
1. Anticipation: right arm begins reaching back toward the hip bag, torso twists slightly
2. Grab: hand at the bag opening, fingers closing on a rolled paper
3. Wind-up: arm drawn back and up, torso coiled, paper gripped
4. **Release** *(the sheet's key frame — arm swung out to the right, paper leaving the hand)*
5. Follow-through: arm continues past the release point, torso slightly overrotated
6. Return: arm relaxing back down toward the handlebar grip, settling into `ride`

**WHEELIE — 7 frames, 700ms:**
1. Compression: weight shifts back, slight crouch, anticipation before the lift
2. Lift-off: front wheel just leaving the ground
3. Rising: front wheel ~30° up
4. **Peak** *(the sheet's key frame — front wheel at its highest, body leaned back)*
5. Hold: sustained peak, can be a near-duplicate of frame 4 with a small settle
6. Descending: front wheel coming back down
7. Landing: wheel touches down, slight compression/bounce, transitioning back to `ride`

**TUCK — 5 frames, ~930ms played back at 0.3× (so it reads slow on screen even though the source sequence is quick):**
1. Alert: shoulders rise, head begins turning
2. Brace: deeper crouch, head turned further, one eye becoming visible
3. **Peak tension** *(the sheet's key frame — full crouch, eye wide, the "yikes" beat)*
4. Relief: head turning back forward, shoulders starting to relax
5. Recover: back to normal riding posture, transitioning to `ride`

**SKID — 6 frames, ~900ms into the cash-out celebration:**
1. Brake initiated: weight shifts forward, slight forward lean
2. Skid begins: rear wheel sliding, first dust
3. **Skid peak** *(the sheet's key frame — maximum lean/slide angle, biggest dust cloud)*
4. Settling: bike straightening up, dust thinning
5. Stopped: fully settled, upright
6. Celebration flourish: a small arm-up/fist-pump beat — keep this one modest, since bigger wins get their own separate confetti/fanfare treatment already handled elsewhere in the game; this frame just needs to read as "pleased," not carry the whole celebration

**TUMBLE — 8 frames, ~780ms wipeout:**
1. Impact: front wheel catches something, bike jerks under him
2. Launch: rider separating from the bike, both starting to go airborne
3. **Peak chaos** *(the sheet's key frame — rider and bike scattered mid-air, papers flying)*
4. Falling: descending, still tumbling
5. First impact: hits the ground, beginning to bounce/roll
6. Roll: tumbling across the ground
7. Sliding to a stop: momentum bleeding off, debris settling
8. At rest: everything stopped, directly into the `crashed` pose's starting position

**CRASHED/DAZED:** the delivered key frame already works as a static hold. If you want the optional 3-frame loop, the only thing that needs to move is the ring of stars/halo above his head, rotating through 3 positions (e.g. 0°/120°/240°) — body, face, and everything else stays locked in the same pose across all 3 frames.

---

*Reference: the current programmatic version lives in `paperboy/src/game/scene.ts` (`drawRider`, `drawCrashed`) if your artist wants to see exactly what's being replaced — screenshots are in the session's scratchpad, or I can export fresh ones on request.*

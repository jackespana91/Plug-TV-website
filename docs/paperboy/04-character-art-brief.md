# PAPERBOY: THE RUN
## Character Art Brief — Ace (rider), for a cleaner animated replacement

> This is a production brief for replacing the current programmatic canvas rig (`paperboy/src/game/scene.ts`, `drawRider`/`drawCrashed`) with cleaner, purpose-made animated art. Every number below is pulled directly from the live renderer, so a character built to this spec drops in without touching the perspective math, timing, or gameplay code.

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

| Pose | When it plays | Duration / loop | What it must show |
|---|---|---|---|
| **idle** | Attract screen, between bets | Loops indefinitely | Relaxed, casual — balance shifting, maybe a slow head-turn glance around. Personality beat, not urgent. |
| **ride** | Default cruising state, most of the run | Loops indefinitely, tempo-linked | Pedaling cycle, gentle vertical bob, hair/jacket hem responds to speed. **Cadence must be able to sync to a speed value** (the game ramps speed from ~260 to 430 px/s across a run) — either give a base pedal-cycle length that can be time-scaled, or provide a 2–3 speed-tier variant. |
| **throw** | Every delivery (every ~1.2–1.5s during a run) | 450ms, one-shot, returns to `ride` | Right arm reaches back toward the right-hip bag, grabs a paper, swings out and releases to the right side. This is the single most-repeated animation in the whole game — it needs to read instantly and stay charming on repeat viewing hundreds of times per session. |
| **wheelie** | Milestone deliveries (×5/×10/×25/×50) and skateboard-hazard hops | 700ms, one-shot, returns to `ride` | Whole rig tips back slightly, a little showoff flourish — not a full stunt, just a beat of "nice." |
| **tuck** | Near-miss slow-motion escape (the game's signature moment) | ~930ms real-time (played back in a 0.3× slow-mo window) | Braces down/forward, **head turns to show a slice of profile — cheek, eye, a "yikes/thrill" expression** — the one moment we break the always-from-behind rule. This is the emotional peak of the whole game; it should read as "oh no—phew." |
| **skid** | Cashing out / reaching the flag | ~900ms into the win celebration | A stop skid, slight lean/rotation, arms could go up in celebration on bigger wins (tiered: modest for small wins, bigger flourish for ×10+, confetti-worthy for ×50+ — see GDD §12 win tiers if you want the full tier table). |
| **tumble** | Wipeout (bust) | ~780ms of an actual tumble, rolling motion | Comedic, not painful — a cartoon spill, not a crash-test. |
| **crashed / dazed** | Immediately follows tumble, holds until the loss screen | Holds ~450ms+ | **This is the one pose that faces the camera** — Ace sat up on the ground next to the toppled bike, spiral/dizzy eyes, papers fluttering down around him, a "...again?" half-smile. Front-facing is deliberate here: it's the one beat where we want to see his face and confirm he's fine. |

Total: **7 back-view states + 1 front-facing recovery pose.** If budget only allows a subset, priority order is: `ride` (seen constantly) → `throw` (seen constantly) → `crashed` (emotional payoff of every loss) → `tuck` (emotional payoff of every near-miss) → `skid`/`tumble` → `wheelie`/`idle` (nice-to-have polish).

## 5. Lighting & finishing notes

- Constant **warm rim light from one side** (the low sun) on every pose — currently implemented as a light stroke along the top/side of the head and shoulders. Keep it consistent across all poses so he doesn't look like he's lit differently frame to frame.
- Shadows on the character (and his ground contact shadow) should be **warm violet-tinted**, matching the world's "no pure black" rule.
- Secondary motion that sells speed: jacket hem flapping, loose papers in the bag riffling — amplitude should scale with how fast he's going (slow flutter at cruise, more agitated at top speed).
- Silhouette test: he needs to read correctly as a small, back-facing figure at roughly 65–90px tall on a phone screen — check readability at that size, not just at a large working canvas size.

## 6. Delivery format — pick one, tell me and I'll wire it in

The game is plain Canvas 2D (no Pixi/Phaser/game engine), so here are the realistic integration paths, cheapest-to-wire-in first:

1. **Sprite sheets (PNG, transparent background), one strip per pose.** Simplest to integrate — I just `drawImage` the current frame each tick. You/your artist controls frame count and timing per pose; give me the frame size, frames-per-pose, and intended fps and I'll match the director's existing timings to it. Easiest for hand-drawn or frame-by-frame animated work.
2. **Rive (`.riv`) file with a state machine.** Best fit if you want smooth blended animation (not stepped frames) and small file size — I'd add the Rive web runtime and wire each of my 8 states to a state-machine input, and Rive handles the actual blending/easing. Great if your animator already works in Rive or After Effects (Rive imports rigged Lottie/AE-ish workflows reasonably well).
3. **Lottie/Bodymovin JSON (from After Effects).** Works well for 2D vector animation with easing baked in; slightly heavier runtime than Rive but very common pipeline if your artist is AE-based.
4. **Spine.** Excellent for this exact use case (mobile game character rigging) but has a runtime license cost — only worth it if you're already invested in the Spine ecosystem.

If you don't have a preference, my recommendation is **#1 (sprite sheets) for a fast turnaround**, or **#2 (Rive)** if you want the smoothest motion and are open to a bit more integration work on my side. Either way, transparent background, and please deliver at 2× the working size above for crispness on high-DPI screens.

---

*Reference: the current programmatic version lives in `paperboy/src/game/scene.ts` (`drawRider`, `drawCrashed`) if your artist wants to see exactly what's being replaced — screenshots are in the session's scratchpad, or I can export fresh ones on request.*

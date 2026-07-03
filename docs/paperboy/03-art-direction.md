# PAPERBOY: THE RUN
## Visual Direction & Production Polish — v1.0

> **Phase 4 deliverable.** Art direction for the game defined in `01-game-design-document.md`. One sentence brief: **DreamWorks/Pixar-quality stylized 3D warmth in the world, premium contemporary casino UI in the chrome.** The street is nostalgia; the interface is money. They never blend.

---

## 1. The Two-Layer Rule

Everything on screen belongs to exactly one layer:

- **The World** — the street, Ace, hazards, collectibles, weather. Painterly, warm, soft-shadowed, alive. No flat UI colors ever appear in the world.
- **The Chrome** — HUD, buttons, panels, numbers. Dark glass, gold accents, crisp type, subtle depth. No cartoon textures ever appear in the chrome.

The multiplier is the single sanctioned crossover: a chrome-quality number rendered *inside* the world (GDD §5.4), bridging the layers — the scoreboard hanging over the fantasy.

---

## 2. Color

### 2.1 World palette — "Golden Hour Suburbia" (hero look)

| Role | Hex | Notes |
|---|---|---|
| Sky gradient top | `#2E4482` | Dusk indigo |
| Sky gradient horizon | `#FF9E5E` | Peach glow |
| Sun/key warmth | `#FFD98A` | Everything catches this |
| Asphalt | `#5A5566` | Warm violet-grey, never pure grey |
| Lawns | `#7CB56B` | Desaturated toward camera, saturated at horizon |
| House siding range | `#E8D5B5` / `#B7CADB` / `#D89A8E` | Cream, powder blue, brick rose — rotate per lot |
| Shadow color | `#4A3C6E` @ 60% | **Shadows are violet, never black** — the single biggest "Pixar warmth" trick |
| Rim light | `#FFE9C4` | On Ace and hazards, always, from the sun side |

Each neighborhood theme (GDD §7) re-keys this palette (Night: indigo/cyan + sodium-lamp `#FFB25E` pools; Halloween: teal dusk + pumpkin `#FF7A1A`; Christmas: blue-hour snow + tungsten window glow `#FFC46B`), but the violet-shadow and warm-rim rules are invariant — they are the game's visual signature across all themes.

### 2.2 Chrome palette — "Midnight Newsprint"

| Role | Hex | Notes |
|---|---|---|
| Panel base | `#12141C` | Near-black blue, 92% opacity over world |
| Panel edge | `#2A2F42` | 1px inner stroke + soft outer glow |
| Primary text | `#F4F1E8` | Newsprint off-white, never pure white |
| Secondary text | `#8B90A3` | |
| **Money / win** | `#FFC53D` | The only gold in the chrome; reserved exclusively for currency values and win states |
| **CASH OUT / positive action** | `#3DDC6B` on `#0E3320` | The green owns "bank it" and nothing else |
| DELIVER (pre-run) | `#3DA5FF` on `#0D2540` | Action blue — distinct from cash-out green so the button's state change is unmistakable |
| Danger/loss accents | `#FF5A5A` | Used sparingly: wipeout line, error states |
| Multiplier heat ramp | `#F4F1E8 → #FFC53D → #FF8A3D → #FF5A5A` + ember particles | White → gold → ember → on-fire as value climbs (GDD §5.4) |

Contrast: all chrome text meets WCAG AA against its panel at minimum sizes; money values meet AAA.

---

## 3. Typography

| Use | Face (or equal) | Treatment |
|---|---|---|
| Game logo / headlines / win banners | **Fredoka** (bold, rounded) | The mockup's chunky warmth; 3D-extruded gold version for the logo and Big Win headlines only |
| Multiplier & all money values | **Manrope ExtraBold, tabular numerals** | Tabular figures are non-negotiable — counting numbers must not jitter in width |
| UI labels, body, help | **Manrope** Regular/Medium | Uppercase labels at +6% letter-spacing, 11–13px floor |
| Flavor/newsprint moments (front-page recaps, history) | A condensed slab (e.g., **Zilla Slab**) | Used only inside "newspaper" artifacts — never in functional UI |

Numbers rule: money always shows two decimals; multipliers show `×` prefix and up to two decimals below ×10, none above; count-ups ease-out and land exactly (math doc values are truth, display rounds).

---

## 4. Character & World Rendering

- **Style target:** stylized 3D, chunky proportions, hand-tuned — closer to *Lego Movie / Sackboy* material warmth than photoreal. Bakeable to 2.5D sprite sheets if the runtime budget demands (art direction survives either pipeline).
- **Ace:** oversized head/hands (readability at 80px), 4-tone cel-adjacent shading + rim, cloth flap on jacket and bag as the constant "speed" tell.
- **Hazards** are characters, not props: the dog has an expression arc (sleepy → alert → airborne → hedge-tumble shame); the car has eyes-in-headlights energy without literal eyes. Every villain gets a *defeat* pose — comedy on survival is what makes near-misses joyful instead of stressful.
- **Environmental storytelling:** every lot tells a one-glance story — a half-mowed lawn with an abandoned mower, a "LOST CAT" poster (the cat watches from the roof), a garage band, sprinkler rainbows, a kid's chalk hopscotch the tires respect. Ten seconds of any run should contain one discoverable. These live on a rotation deck so streets never repeat exactly (GDD §7's tile system).
- **Depth recipe:** 3 parallax bands (kerb detail / houses / skyline), atmospheric desaturation with distance, and DOF only during near-miss slow-mo and celebrations — never during the decision window (the street ahead must read clearly when the player is choosing).

---

## 5. Lighting

- **Key:** low warm sun (hero look) with long soft shadows raking *toward* camera — motion reads in the shadow play, not just the geometry.
- **Rim:** constant warm rim on Ace from the sun side; on hazards, the rim flips **cool** (`#9FD4FF`) the moment they become an active threat — a subliminal, palette-level telegraph that needs no UI.
- **Event lighting:** near-miss slow-mo drops world exposure ~0.5 stop and adds a vignette; cash-out celebrations bloom warm; wipeouts flash desaturated for 4 frames (never red-flash — losses stay dignified per GDD §13).
- Porch lights, windows, and streetlamps are real light sources in night/dusk themes; the multiplier's ember state casts faint warm light on Ace's back at extreme values — the world acknowledging the number.

---

## 6. Animation Timing (the polish bible)

Global rules:

- **Nothing linear.** UI: `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quint) for entrances, `(0.55, 0, 0.55, 0.2)` for exits. World: hand-keyed squash & stretch, 12-principles throughout.
- **Nothing pops.** Every element that appears scales 0.94→1.0 with 80–140ms ease-out + 4% overshoot; every removal exits in ≤ 100ms (exits are always faster than entrances).
- **The 60fps floor** is sacred on mid-tier mobile; world detail degrades (crowd density, particles, DOF) before frame rate ever does.

Key timings:

| Beat | Duration | Notes |
|---|---|---|
| DELIVER press → run start | 300ms | Button depress 80ms, bag-tighten anticipation 220ms — anticipation *before* speed |
| Paper throw → porch thwack | 450ms | 8-frame anticipation wind-up; arc eases in, impact frame held 2 frames |
| Multiplier tick-up | 180ms | Stamp-scale 1.0→1.18→1.0 with the ladder-motif note |
| Decision window | 1200ms | World at 95% speed; CASH OUT pulse at 72bpm (calm heartbeat) |
| Hazard telegraph → resolution | 1500–2500ms | The heartbeat beat (GDD §6) |
| Near-miss slow-mo | 1400ms total | 200ms ramp to 30%, 900ms hold, 300ms snap-back on bass hit |
| Multiplier stamp after near-miss | 260ms, 1.35× overshoot | 3× louder than a routine tick, per GDD §9 |
| Wipeout → re-armed DELIVER | ≤ 2500ms | Loss speed budget is a hard product requirement |
| Win count-up | 900–2200ms by tier | Accelerating tick, lands with bass thump exactly on final figure |

---

## 7. VFX Inventory

| Effect | Spec |
|---|---|
| Paper trail | Faint page-flutter particles off the bag at speed; density = run depth |
| Porch impact | 6-particle dust puff + rectangular "thwack" shockwave, 200ms |
| Multiplier heat | Ember particles begin at ×10, intensity curve to ×100+; on-fire state adds heat-haze shader behind the number |
| Golden Newspaper | Slow-mo throw with light ribbon trail; screen-space gold glints; landing burst 24 particles |
| Near-miss escape | 3-frame speed lines + single white flash frame ≤ 30ms (flash-safety compliant), hedge-crash leaf burst on the dog |
| Sprinkler survival | Water arc with 2-frame rainbow when crossed |
| Cash-out skid | Tire smoke wisp + arc of kicked-up paper confetti scaled by win tier |
| Big Win "front page" | Halftone-dot transition into the freeze-frame; headline letters slam in per-word |
| Wipeout | Dust cloud + fluttering papers; deliberately the *least* spectacular effect in the game |
| Weather | Rain: streaked droplets on a virtual lens at 8% opacity, asphalt reflection probes; Snow: accumulating tire trails |

Particle budget: ≤ 400 alive on mobile tier 1; all effects author-scaled per device tier.

---

## 8. UI Transitions & Micro-interactions

- **Screen changes are camera moves, not cuts:** paytable slides up as a panel while the street stays live behind at 40% dim; settings is a frosted overlay; history cards deal in like newspapers on a stack (60ms stagger).
- **The button metamorphosis** (DELIVER→CASH OUT) is the game's most important micro-interaction: blue face rolls over like a split-flap sign to green, 240ms, with a mechanical *clack* — the same physical object changing job, under a thumb that never moves.
- Bet stepper: haptic tick per step (light), boundary bump (medium) at min/max.
- Balance changes never teleport: 300ms tabular-numeral roll.
- Panel shadows: two-layer (ambient 24px @ 8% + key 4px @ 24%) — chrome floats over the world, consistently lit from above.
- Haptics map: delivery thwack (light), near-miss snap-back (heavy), cash-out (success pattern), wipeout (soft double) — all respecting the OS mute/accessibility settings.

---

## 9. Iconography & Brand

- Icons: 2px rounded stroke, filled-on-active, drawn on a 24px grid; money icons get the gold, everything else stays neutral — gold scarcity is what keeps wins feeling golden.
- Logo: the mockup's 3D gold "PAPERBOY" treatment, refined: tighter tracking, warmer bevel, the rolled newspaper as the registered mark usable alone at small sizes.
- Loading/empty states stay in-world (Ace, papers, the dog) — no generic spinners anywhere in the product.

## 10. Accessibility

Color-blind safe: win/loss states always pair color with icon + motion; heat ramp reads in luminance alone. Reduced-motion setting: disables slow-mo ramps, screen shake, and parallax while preserving outcome legibility. All text ≥ 11px, all touch targets ≥ 44px. Flash safety per §7.

## 11. Don'ts (art review checklist)

- No pure black, no pure white, anywhere.
- No gold on anything that isn't money or win state.
- No red flash on losses; no "almost won" staging on busts (mirrors math doc §8 compliance).
- No UI element overlapping the street's center third during a run.
- No stock casino glyphs (7s, cherries, chips) — ever. The world is a neighborhood; the chrome is a modern fintech-grade surface.

---

*Prev: `02-math-model.md` · Reference: `concept-mockup.png`*

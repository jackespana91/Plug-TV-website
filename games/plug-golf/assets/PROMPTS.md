# PLUG GOLF — AI Art Prompt Pack

Generate these, save each as the **filename shown** (transparent PNG) into this
`games/plug-golf/assets/` folder, and I'll wire them in (it's one `ASSET_SRC`
line per slot — see the bottom). Works with any image generator (Midjourney,
DALL·E 3, Ideogram, Stable Diffusion / SDXL, Flux, etc.).

Golden rule: **art is cosmetic and must never encode the outcome.** These are
skins over a fixed 96% RTP math model.

---

## 0. How to use

1. Generate each slot with the prompt below. Prepend/append the **Shared style
   block** so everything matches.
2. Export as **PNG with a transparent background** at (at least) the listed size,
   square unless noted, subject centred with a little margin.
3. Save as the exact **filename** (e.g. `assets/ball.png`).
4. Send them back / commit them and I'll register each slot and adjust anchors.

If your tool bakes in a background, ask for "isolated on transparent background,
PNG alpha" and/or remove it after (remove.bg, Photoshop). Avoid a baked-in ground
shadow — the game adds its own.

---

## 1. Shared style block  *(reuse in every prompt)*

> **STYLE:** premium mobile-game illustration, friendly chunky mascot proportions,
> clean cel-shaded vector look with soft gradient shading, bold saturated colours,
> crisp readable silhouette, single soft light from the upper-left with a gentle
> rim light, glossy modern finish, cohesive "streetwear golf on a luxury island"
> art direction, centred composition, isolated on a fully transparent background,
> high detail, 4k.

> **NEGATIVE (avoid):** text, watermark, signature, UI, frame or border, background
> scenery, ground/drop shadow, photorealism, gritty realism, muddy colours, extra
> limbs, deformed hands, clutter, motion blur.

Colour discipline: each character's accent hex is their outfit's hero colour — keep
skin/props natural, but the outfit and vibe read in that colour.

---

## 2. Characters — the streetwear golfers  *(biggest visual upgrade)*

Full-body hero sprite per character, **768 × 1024**, transparent, full body with the
feet ~10% above the bottom edge, facing the camera 3/4, mid-celebration energy.
Filename: `golfer-<id>.png`. (I'll use these for the avatar chip, the character
picker, and the win celebration; the in-swing tee figure can stay procedural or use
an optional second pose — see §2.7.)

### 2.1 Drip — `golfer-drip.png`  ·  accent `#39ff7a` (neon green)
> A confident young streetwear golfer mascot, cool relaxed swagger, wearing an
> oversized neon-green (#39ff7a) golf polo and joggers, black sunglasses, a gold
> chain and a green bucket hat, leaning back mid-celebration doing finger-guns, big
> grin, "too much drip" energy. + Shared style + Negative.

### 2.2 Ice — `golfer-ice.png`  ·  accent `#5db8ff` (icy blue)
> A calm ice-cold streetwear golfer mascot, unbothered chill expression, wearing an
> icy-blue (#5db8ff) puffer vest over a white hoodie, frosted sunglasses, arms
> crossed confidently, faint frosty sparkle accents, "ice cold closer" energy.
> + Shared style + Negative.

### 2.3 Mic — `golfer-mic.png`  ·  accent `#ff5db8` (hot pink)
> A rapper-energy streetwear golfer mascot holding a microphone in one raised hand
> mid "drop the mic", wearing a hot-pink (#ff5db8) varsity jacket and chains, a
> confident grin, dynamic hype pose. + Shared style + Negative.

### 2.4 Baller — `golfer-baller.png`  ·  accent `#ffd34d` (gold-yellow)
> A footballer-crossover golfer mascot mid knee-slide goal celebration, one fist
> pumped, a football/soccer ball beside him, wearing a sporty golden-yellow
> (#ffd34d) kit with a headband, high-energy "golazo" expression.
> + Shared style + Negative.

### 2.5 Boss — `golfer-boss.png`  ·  accent `#c07bff` (purple)
> An influencer "boss" streetwear golfer mascot wearing a purple (#c07bff) luxury
> velour tracksuit and gold jewellery, a small gold crown floating above, both arms
> raised flexing, smug confident smirk, "boss move" energy. + Shared style +
> Negative.

### 2.6 Ace — `golfer-ace.png`  ·  accent `#ff8c42` (orange)
> A cool streetwear-pro golfer mascot wearing a burnt-orange (#ff8c42) bomber
> jacket and a snapback cap worn slightly sideways, flexing one arm with subtle
> fire/spark energy, calm confident look, "ace vibes". + Shared style + Negative.

### 2.7 (Optional) address / swing pose per character — `golfer-<id>-swing.png`
Same character + outfit, **side-on, addressing a golf ball with a driver at the top
of the backswing**, athletic stance, ready to swing. Only if you want art in the
in-swing figure too; otherwise the procedural swing stays and these are unused.

---

## 3. Icons & props  *(placeholders exist — these replace them)*

### 3.1 Golf ball — `ball.png` · **96 × 96**
> A single glossy white golf ball with subtle dimples, soft top-left highlight, a
> hint of cool-grey shading on the lower-right, no shadow. + Shared style + Negative.

### 3.2 Coin — `coin.png` · **128 × 128**
> A shiny gold casino coin viewed head-on, thick bevelled rim, a small embossed
> golf-flag icon on its face, warm gold gradient, glossy. + Shared style + Negative.

### 3.3 Trophy — `trophy.png` · **256 × 256** (jackpot moment — make it hero)
> A gleaming gold champion's trophy cup with two handles on a base, a star emblem
> on the cup, sparkles, celebratory, premium. + Shared style + Negative.

### 3.4 Logo emblem — `logo.png` · **512 × 512**
> A circular emblem badge for a premium golf game, dark-green enamel disc with a
> glowing neon-green (#39ff7a) rim, a clean golf pin-flag and hole icon in the
> centre, modern streetwear crest, no text. + Shared style + Negative.

### 3.5 Flag / pin — `pin.png` · **256 × 384** (portrait)
> A golf pin: a slim white flagstick with a bright red pennant flag waving to the
> right, small cup base, clean, no shadow. + Shared style + Negative.

---

## 4. Course & decorations

### 4.1 Island green background plate — `course.png` · **1080 × 1920** (portrait) — *advanced*
> Top-down slightly-angled view of a luxury island golf green: a round grassy
> putting-green island ringed by a sandy shore, surrounded by bright turquoise
> water, two white sand bunkers on the green's edge, a red pin-flag in the centre,
> lush palms and rocks on the far shore, sunny, clean stylised mobile-game art,
> vertical composition with the island in the upper-middle third and open water
> toward the bottom. + Shared style (skip "transparent background" here) + Negative
> (keep "no text/UI/frame").
>
> *Note:* the game currently draws the course procedurally on fixed geometry.
> A plate needs the green/hole aligned to that — send it and I'll align the render
> (or we keep the procedural course restyled to match these assets). Element
> sprites (below) drop in more precisely than a full plate.

### 4.2 Decorations (small transparent sprites)
- `palm.png` · 256×256 — > a small stylised tropical palm tree, top-down-ish, lush green fronds. + Shared style + Negative.
- `rock.png` · 128×128 — > a small cluster of smooth grey shoreline rocks. + Shared style + Negative.
- `lily.png` · 128×128 — > a single round green lily pad floating, tiny highlight, top-down. + Shared style + Negative.
- `bunker.png` · 256×160 — > an oval patch of pale golden sand (a golf bunker), soft raked texture, top-down, transparent edges. + Shared style + Negative.

---

## 5. Slot → file → wiring map

| Slot id | File | Size | Status |
|---|---|---|---|
| `ball` | `ball.png` | 96² | placeholder live |
| `coin` | `coin.png` | 128² | placeholder live |
| `trophy` | `trophy.png` | 256² | placeholder live |
| `logo` | `logo.png` | 512² | placeholder live |
| `pin` | `pin.png` | 256×384 | new — I'll add (flag keeps its wave) |
| `golfer-<id>` | `golfer-<id>.png` | 768×1024 | new — avatar + picker + celebration |
| `course` | `course.png` | 1080×1920 | new — needs geometry alignment |
| `palm`/`rock`/`lily`/`bunker` | as named | see §4.2 | new decorations |

**Wiring** (what I do when the PNGs land): for each file I set
`ASSET_SRC['<id>'] = 'assets/<file>.png'` in `index.html` — the loader picks it up
and the slot swaps from vector placeholder to your art, with the procedural
fallback still there if a file is missing. Character sprites get hooked into the
avatar chip, picker, and celebration first (and optionally the tee figure).

Priority order for the biggest impact: **characters → trophy → logo → ball/coin →
decorations → course**.

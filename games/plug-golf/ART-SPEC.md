# Plug Golf — Art & Animation Spec

A build sheet for upgrading the golfer and the course from the procedural
prototype into hand-crafted / game-engine-quality art. Everything below is
pulled from the live prototype (`index.html`), so coordinates, rig lengths,
swing angles and palettes are exact — you can match the current layout 1:1,
or use these numbers as the reference the new art must line up to.

The renderer is a 2D canvas. If you rebuild in a game engine (Unity, Godot,
Cocos, Pixi, Spine, etc.), treat this as a **2.5D side-with-depth** scene:
top-down island course, characters drawn as upright 2D sprites/rigs.

---

## 0. Scene coordinate system

- **World canvas:** `430 × 830` logical units (portrait phone). All coordinates
  below are in these units. The renderer scales this to the device.
- **Origin:** top-left `(0,0)`, `+x` right, `+y` down.
- **Camera:** a broadcast camera pans/zooms across the world during a shot
  (tee → ball flight → green). Art must look correct at **1× (whole hole in
  frame)** and at **~2.2× zoom** (close on the golfer at the tee, and close on
  the green at the hole). Design textures to hold up at 2× — i.e. author at
  **~2× resolution** (860 × 1660) or as vector/SD assets.
- **Key anchor points:**
  | Anchor | World pos | Meaning |
  |---|---|---|
  | Green centre / pin (`GC`) | `(210, 214)` | the hole & flag |
  | Tee (`TEE`) | `(210, 690)` | where the golfer stands & the ball starts |

---

## 1. THE GOLFER

### 1.1 What it is
One rig, six skins. A stylised streetwear golfer — cap, polo, shorts,
trainers — that plays a full golf swing and then a character-specific
celebration. Think *Golf Clash* / *Golf Rival* mascot quality, but with
hypebeast/streetwear styling. Clean, readable at small size, expressive.

### 1.2 Rig & proportions (skeleton)
Draw the figure around a root at the **hip/pelvis**. `s` = scale (tee = `s≈1`,
celebration = `s≈2`). All lengths in world units at `s=1`:

```
                 ● head center      (0, -42)   radius 8.5
                 |  neck             (0, -33 → -28)
      shoulderL ●─┬─● shoulderR      (±6.5, -26)   <- shoulder line
       upperarm │ │ │ upperarm       length 10 each
         elbow ●  │  ● elbow          (IK joint)
      forearm  │  │  │ forearm        length 10 each
        hand  ●   │   ● hand          hands grip the club
              torso (polo)            top -30 → bottom -6, width ~20
         hipL ●──┬──● hipR            (±4, -3)      <- hip line
        thigh  │  │  │ thigh          length 11 each
        knee  ●   │   ● knee          (IK joint)
        shin  │   │   │ shin          length 11 each
        foot ●    │    ● foot         shoe ellipse ~13 long
```

- **Total height** ≈ 71 units at `s=1` (head-top ≈ `-52`, feet ≈ `+19`).
- **Arms & legs are 2-bone IK.** The hand/foot is the target; the elbow/knee
  is solved between. This is what makes the swing look articulated rather than
  stick-like — preserve real elbow and knee bends in the new art.
- **Limb taper:** thick at the root (shoulder/hip ~5–6.5 wide), thin at the
  tip (wrist/ankle ~2.8–3.4 wide), rounded caps at every joint.

### 1.3 Costume layers (back-to-front draw order)
1. Back leg (thigh + shin, slightly darker) & back shoe
2. Back arm (upper = sleeve colour, forearm = skin) & glove hand
3. Club (see §1.6) — held between the two hands
4. Pelvis / belted shorts (darkest shade of accent colour)
5. Torso: **polo shirt** in the character accent colour, with a darker side
   shade, a lighter vertical placket, and a lighter **collar** (two points +
   V-notch)
6. Front arm (upper = accent colour sleeve, forearm = skin)
7. Head: neck → skin head → **cap** (crown + brim + button, accent colour) →
   face
8. Optional prop near the raised hand during celebrations (mic, etc.)

### 1.4 Palette
- **Skin:** base `#e6b98f`, shadow `#c99a71`, highlight `#f2cfa6`.
  (Feel free to add 2–3 skin tones across the roster for diversity.)
- **Costume** is derived from each character's single accent colour:
  - sleeve/shirt = accent
  - shading = accent darkened ~40
  - highlight/placket/collar = accent lightened ~44
  - shorts/pants = accent darkened ~70 (near-black tint of the hue)
- **Shoes:** white upper `#f4f6f7`, dark sole/outline `#20242a`, accent tab.

### 1.5 The six characters (skins)
Same rig, swap accent colour + face + celebration. Keep each **instantly
recognisable by colour**.

| id | Name | Vibe | Accent | Face motif | Celebration | Burst emoji |
|----|------|------|--------|-----------|-------------|-------------|
| drip | Drip | Pure drip | `#39ff7a` (green) | 😎 shades | lean-back | 💧 |
| ice | Ice | Ice-cold closer | `#5db8ff` (blue) | 🥶 frost | arms-crossed | ❄️ |
| mic | Mic | Rapper energy | `#ff5db8` (pink) | 🎤 | drop-the-mic | 🎤 |
| baller | Baller | Footballer | `#ffd34d` (gold) | ⚽ | knee-slide | ⚽ |
| boss | Boss | Influencer | `#c07bff` (purple) | 👑 | crown pose | 👑 |
| ace | Ace | Streetwear pro | `#ff8c42` (orange) | 🧢 | flex | 🔥 |

The prototype uses an emoji as the face for identity. In upgraded art,
translate each motif into real design: e.g. Drip wears sunglasses, Ice has a
frosty/cool colourway + beanie, Mic holds a mic, Baller has football styling,
Boss wears a crown/gold chains, Ace is full streetwear with a bucket hat.
Each should still read from its accent colour alone.

### 1.6 The club
- Grip (dark) `~6` long → shaft (metal gradient light→dark) `~48` long → head
  (chrome wedge/iron) at the tip.
- Held at the **midpoint between the two hands**; rotates as one rigid piece by
  `clubAng` (see swing table). The club is the fastest-moving element — it
  should motion-blur/streak on the downswing.

### 1.7 SWING ANIMATION (the money shot)
Four keyframes, interpolated. Angles are in **radians**, measured from the
shoulder for arms and as an absolute rotation for the club. `dx` is a small
horizontal weight-shift of the whole body. Legs stay planted at
`legL≈2.5, legR≈0.7` (a braced stance) but should flex/turn subtly.

| Keyframe | armL | armR | body lean | clubAng | dx (weight) |
|----------|------|------|-----------|---------|-------------|
| **Address** | 1.90 | 1.20 | +0.04 | −0.50 | 0 |
| **Top** (backswing) | −2.50 | −2.10 | −0.15 | −2.60 | −3 |
| **Impact** | 1.70 | 1.05 | +0.07 | −0.30 | +1 |
| **Follow-through** | −0.70 | −1.15 | +0.17 | +2.40 | +4 |

**Timeline / easing:**
- **Wind-up (player-controlled):** Address → Top, driven by how far the player
  pulls back (0→1). Smooth.
- **Downswing:** Top → Impact over the first **13%** of the release — this is
  the *fast* part, ease-in accelerating into the ball. Add club streak +
  a turf/divot puff + small screen shake at Impact.
- **Through-swing:** Impact → Follow over the next **27%** (13%→40%).
- **Finish hold:** hold Follow-through pose for the rest of the shot.
- Total swing action ≈ **0.5–0.7 s**; then the camera follows the ball.

Deliver as either: (a) a jointed rig (Spine/DragonBones/Unity 2D IK) driven by
the four poses above, or (b) a baked sprite sequence at **30 fps** covering
address→top→impact→follow (~20–24 frames) plus a looping idle.

### 1.8 CELEBRATIONS (per character, plays on a win)
Each is a short looping pose with a bob and a themed emoji/particle burst.
Rough pose targets (radians, same rig):

| Pose | armL | armR | legL | legR | lean | Prop |
|------|------|------|------|------|------|------|
| lean (Drip) | −2.30 | −0.80 | 2.5 | 0.6 | bob | — |
| cross (Ice) | −0.30 | −2.80 | 2.5 | 0.6 | 0 | arms crossed |
| mic (Mic) | −1.50 | −2.50 | 2.6 | 0.5 | bob | 🎤 raised |
| slide (Baller) | −2.40 | −0.80 | 2.9 | 2.2 | +0.50 | ⚽ knee-slide |
| crown (Boss) | −2.50 | −0.60 | 2.5 | 0.6 | bob | 👑 floats above |
| flex (Ace) | −2.70 | −0.40 | 2.5 | 0.6 | bob | double-flex |

Each celebration fires ~16 themed particles (the character's burst emoji) and
a call-out banner (e.g. "DROP THE MIC! 🎤"). ~1.5 s, can loop.

### 1.9 Deliverables for the golfer
- 6 character skins on one shared rig.
- Swing animation (rig or 30fps sprite sheet): idle, address, backswing,
  downswing, impact, follow-through.
- 6 celebration animations (loopable).
- Recommended export: **Spine/DragonBones JSON + atlas**, or **PNG sprite
  sheets @2×** (transparent), plus a 1× and 2× preview. Pivot = the hip root.

---

## 2. THE COURSE

### 2.1 Layout — island green, par-3 over water
Top-down hole: a big **lake** fills the frame; a circular **island green**
floats in the middle with the pin; the **tee** sits on a grassy shelf at the
bottom where the golfer stands. Off the island = water, so a miss reads as a
splash. Trees, lily pads and shoreline rocks dress the margins.

### 2.2 Exact geometry (world units)

**Island green** — concentric rings, all centred on `GC (210, 214)`:
| Ring | Radius | Material |
|------|--------|----------|
| hole (cup) | 7 | dark cup + white rim |
| inner scoring | 26 | (gameplay ring) |
| outer scoring | 50 | (gameplay ring) |
| putting green | 82 | lit bentgrass, mow arcs |
| collar | 96 | slightly longer/darker grass |
| island edge | 114 | rough → sandy shore → shoreline foam |

**Water (`LAKE`):** rounded rectangle at `x18 y44`, `384 × 556`, corner radius
`64`. Has a darker deep-edge outline `~7` outside it.

**Bunkers** (sand, on the green's edge), ellipses:
`(150,158) rx26 ry16` and `(272,262) rx28 ry17`.

**Trees** (mainland margin, `x,y,radius`):
`(26,78,15) (58,120,12) (394,84,14) (400,150,11) (22,250,11) (406,300,12)
(30,560,13) (398,540,12)`.

**Lily pads** (floating on the lake, `x,y,radius`):
`(74,150,11) (338,118,9) (360,330,12) (62,432,10) (330,470,9) (96,300,8)
(352,225,10)`.

**Shoreline rocks** (angle around the green, radius from `GC`):
`a−0.5 r112 · a1.9 r114 · a3.5 r112 · a4.9 r113`.

**Tee box:** grassy ellipse centred at `TEE (210, 690)`, ~`104 × 48`, with a
lit top and a soft cast shadow. The golfer stands here; the ball tees up at
`(210, 684)`.

### 2.3 Materials & lighting (what "computer-game" means here)
Light comes from the **upper-left** (all current highlights/shadows assume
this — keep it consistent).

- **Fairway / mainland grass:** rich green, gradient darkening toward the
  bottom. Wants: **diagonal mown stripes** (alternating light/dark, ~46u
  pitch, rotated ~−0.5 rad) + **fine blade grain** speckle. A **vignette**
  darkens the corners so the eye lands on the island. (Prototype pre-renders
  this to a texture once — for a real game, use a tiling grass material +
  stripe overlay + baked AO vignette.)
- **Water:** blue depth gradient (lighter top `#2f8fd0` → deep bottom
  `#134f8a`). Animated: **drifting ripple bands**, **caustic highlights**, and
  a **sun-glint** column. Add subtle refraction/normal-map ripples and a
  reflection of the sky/island edge for game quality. Shoreline gets a soft
  white **foam ring** around the island.
- **Putting green:** brighter lit bentgrass with a radial highlight (upper-
  left), concentric **mow arcs**, and a darker collar inner-shadow. Should read
  as manicured and slightly domed (subtle 3D bulge with rim light).
- **Sand bunkers:** warm lit sand `#f6ecd2→#dcc998` with a rim shadow and a
  soft depression shadow — make them look raked and recessed.
- **Trees:** trunk + layered canopy (dark base, mid, upper) + upper-left
  highlight + cast shadow ellipse. Upgrade to proper foliage clusters with
  dappled light.
- **Flag:** thin pole with a soft cast shadow + a **red pennant that waves**
  with the wind strength.
- **Ball:** dimpled white sphere with an upper-left specular hotspot; casts a
  soft shadow that separates from the ball as it flies (altitude cue).

### 2.4 Weather / time-of-day (4 variants)
The scene tints for mood. Provide lighting variants or a tintable master:
| Mode | Feel | Tint over scene |
|------|------|-----------------|
| Sunny | bright midday | none |
| Sunset | warm orange | `rgba(255,120,40,.13)` |
| Night | cool blue, moody | `rgba(8,16,52,.42)` |
| Rain | overcast grey + falling rain | `rgba(110,130,150,.20)` |

### 2.5 Ball-flight (for camera/VFX timing)
Per club the ball arcs with different apex height & duration (cosmetic only).
Apex heights ~135–220u, durations ~1.45–1.65 s, 1–3 bounces on landing.
The camera tracks the ball tee→green; plan for a **trail/tracer** ribbon in the
character's accent colour behind the ball in flight.

### 2.6 Deliverables for the course
- Island-green hole background at **2× (860×1660)**, layered (PSD/− separate
  layers): water, island rings, bunkers, tee, trees, rocks, lily pads, flag.
- Tiling **grass material** + **mown-stripe overlay** + **vignette/AO**.
- Animated **water** (ripple + caustic + glint), either a looping sprite,
  a shader, or a flipbook.
- **Flag/pennant** wave (rig or sprite loop).
- 4 lighting/time-of-day variants (or one tintable master + LUTs).
- Ball sprite + shadow; splash VFX for a water miss; divot/turf puff at impact.

---

## 3. Asset slot list (drop-in points already wired)
The prototype has an asset-swap system: replace any slot and it renders in with
no code change. Current UI/prop slots:

| Slot | Use | Suggested export |
|------|-----|------------------|
| `ball` | the golf ball | PNG @2× or SVG, ~48px, transparent |
| `coin` | balance / currency icon | 32px |
| `trophy` | win / result screen | 64px |
| `logo` | app mark (flag-in-hole badge) | 40px |

Extend with: `golfer_<id>` sprite sheets, `course_bg`, `water`, `grass`,
`flag`, `splash`, `divot`, `tracer`. Deliver golfers and course as above and
these slots take them directly.

---

## 4. Summary of exact numbers (quick reference)
- Canvas `430×830`; author @2× (`860×1660`).
- Pin `GC (210,214)`; tee `(210,690)`; ball tees at `(210,684)`.
- Green rings r: hole 7 / inner 26 / outer 50 / green 82 / collar 96 / island 114.
- Lake `(18,44) 384×556 r64`.
- Golfer rig: shoulders `±6.5,−26`; hips `±4,−3`; head `(0,−42) r8.5`;
  upper-arm 10, forearm 10, thigh 11, shin 11; club shaft 48. Total height ~71.
- Swing poses & timing: §1.7. Celebrations: §1.8.
- Light from upper-left throughout.

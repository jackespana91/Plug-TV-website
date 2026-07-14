# Course Plate — generation prompt + registration spec

The goal: replace the procedural course with ONE painted background plate
(same workflow as the Drip golfer sheets — you generate, I wire it in with the
procedural course as fallback). The game keeps drawing the dynamic layer on
top: golfer, ball, tracer, flag, particles, water shimmer.

## What to generate

**Canvas:** portrait, **840 × 1520** (or any size at exactly this 21:38 ratio —
bigger is better, I'll scale). PNG.

**Do NOT include** (the game draws these live):
- ❌ no golfer, no people/crowd near the tee (game draws the gallery)
- ❌ no ball, no flag/flagstick (the game's flag is animated by wind)
- ❌ no text, no HUD, no watermarks
- ❌ no target rings on the green

**Must include** (positioned per the map below):
- A blue lake filling most of the frame, with visible depth (darker centre,
  sunlit turquoise shallows along every bank), subtle wave texture, and a
  sandy/wet shoreline rim where water meets grass.
- A circular-ish **island green** in the upper third: manicured bright
  putting surface with mow stripes, a fringe/collar ring, a rough ring, a
  sandy shore, and a **wooden bulkhead** edge (TPC Sawgrass 17 style).
- **Two sand bunkers** cut into the island green's edge — upper-left and
  lower-right.
- A **wooden walkway bridge** from the right shore out to the island.
- A **tee area** at the bottom centre: championship tee pad, with a mown
  **fairway strip** running from the tee up to the water's edge.
- Mainland grass margins around the lake: fairway-quality turf with
  **diagonal mow stripes**, a few trees with painted canopies on the margins,
  flower beds in the corners, a few rocks on the island shoreline.
- Lighting: **sun from the upper-left**, soft shadows lower-right of objects.

**Style:** top-down (bird's-eye, camera looking straight down), stylised
realism — the same rendered-illustration finish as the Drip golfer sprites
(clean edges, painted light, saturated but natural greens/blues). NOT flat
vector, NOT cartoon outlines, NOT photo.

## Layout map (positions in fractions of the canvas)

```
              x: 0 ────────────── 1
        y:0   ┌───────────────────┐
              │ grass margin+trees│
              │   ┌───────────┐   │
              │   │   LAKE    │   │
   pin  ≈     │   │  ◯ island │   │   island centre ≈ (0.50, 0.28)
  (0.50,0.28) │   │    green  │═══│ ← bridge to right shore ≈ y 0.40
              │   │           │   │
              │   │           │   │
              │   └───────────┘   │
              │  shoreline ≈ y 0.78
              │   fairway strip   │
              │   ▭ tee pad       │   tee centre ≈ (0.50, 0.91)
        y:1   └───────────────────┘
```

Sizes (fraction of canvas width):
- island outer edge (bulkhead) diameter ≈ **0.54**
- putting green diameter ≈ **0.39**
- bunkers ≈ 0.12 × 0.07 each, ON the green's edge at upper-left and
  lower-right
- tee pad ≈ 0.23 wide; fairway strip ≈ 0.16 wide

Don't stress pixel-perfection — after you drop the file in, **I calibrate the
game's pin/tee/ring coordinates to match the art** (art leads, constants
follow). Rough adherence to the map is enough.

## Suggested prompt (paste into your generator)

> Top-down bird's-eye view of a par-3 island golf hole, portrait 840x1520.
> A large blue lake fills the frame: darker deep water in the centre,
> sunlit turquoise shallows along the banks, fine wave texture, wet sandy
> shoreline rim. In the upper third, a circular island green ringed by a
> wooden plank bulkhead (TPC Sawgrass style): bright manicured putting
> surface with subtle mow stripes, fringe collar, rough ring, sandy shore,
> two sand bunkers cut into the green's edge at upper-left and lower-right.
> A wooden walkway bridge connects the island to the right shore. At the
> bottom centre, a championship tee pad with a striped mown fairway strip
> running up to the water's edge. Mainland grass margins with diagonal mow
> stripes, painted tree canopies seen from above, corner flower beds, a few
> shoreline rocks. Sunlight from the upper-left with soft shadows. Stylised
> realistic game art, painted light, clean edges, rich natural greens and
> blues. No people, no golfer, no ball, no flag, no text, no UI.

Optional extras (separate generations, same canvas + layout):
- **Sunset variant** — warm orange light, long shadows.
- **Night variant** — floodlit stadium golf, cool blue ambience, light pools.
- **Rain variant** — overcast grey, matte water, darker saturation.

## Drop path

```
games/plug-golf/assets/course/course_plate.png        (day / master)
games/plug-golf/assets/course/course_plate_sunset.png (optional)
games/plug-golf/assets/course/course_plate_night.png  (optional)
games/plug-golf/assets/course/course_plate_rain.png   (optional)
```

Zip the folder and attach it here (zips come through; pasted images don't) —
then I wire it in, calibrate the geometry to the art, and republish.

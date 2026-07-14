# Plug Golf — Drip swing sprites

These are real RGBA PNG assets with transparent backgrounds.

## Drop-in path

Copy this folder into:

`games/plug-golf/assets/golfers/`

## Sprite-sheet layout

- Grid: 4 columns × 2 rows
- Frame order: address, takeaway, backswing, top, downswing, impact,
  follow-through, finish
- No margin and no spacing
- 1× sheets: 1024 × 640; each frame is 256 × 320
- 2× sheets: 2048 × 1280; each frame is 512 × 640

## Files

- `drip_swing.png` — default alias, currently the iron animation
- `drip_iron_swing.png`
- `drip_3wood_swing.png`
- `drip_driver_swing.png`
- Matching `@2x` sheets
- Pre-sliced 2× frames in each `*_frames_2x` directory
- `drip_swing_manifest.json` — frame names, timing and anchor metadata

## Suggested anchors

At 1×:
- Hip pivot: `(150, 188)`
- Ground anchor: `(150, 300)`

At 2×:
- Hip pivot: `(300, 376)`
- Ground anchor: `(300, 600)`

The three animations use the same frame geometry and can be swapped by club.

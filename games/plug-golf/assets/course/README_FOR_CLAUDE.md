# Animated Course Plate — integration notes

## Ready-to-use asset

Use `course_plate_loop.mp4` as the bottom visual layer. It is a 6-second seamless loop at 24 fps and exactly 840×1520. The water movement, shallow-water shimmer and independent tree sway are already baked in. The green, bridge, bunkers, tee and shoreline remain fixed so gameplay coordinates do not drift.

Place the golfer, ball, tracer, flag and UI above the video in the same 840×1520 coordinate space. Use `course_plate_loop_poster.png` as the video's poster and `course_plate.png` as the static fallback.

### Browser/HTML pattern

```html
<div class="course-stage">
  <video class="course-background" autoplay muted loop playsinline
         poster="course_plate_loop_poster.png">
    <source src="course_plate_loop.mp4" type="video/mp4">
  </video>
  <canvas id="game" width="840" height="1520"></canvas>
</div>
```

```css
.course-stage { position: relative; aspect-ratio: 840 / 1520; overflow: hidden; }
.course-background,
#game { position: absolute; inset: 0; width: 100%; height: 100%; }
.course-background { object-fit: fill; pointer-events: none; }
```

Keep the video muted so autoplay is permitted. Start/reset the video with the hole, and do not crop it independently from the gameplay canvas.

## Shader/procedural alternative

The pack also contains masks for rebuilding the effect in-engine:

- `water_mask.png`: full lake coverage for moving light and colour.
- `water_displacement_mask.png`: inset/feathered area for subtle UV displacement without bending shore geometry.
- `tree_motion_mask.png`: soft wind-influence map for leaf shimmer or mesh sway.
- `motion_spec.json`: loop timing and individual tree wind zones in plate coordinates.

Recommended values: water displacement ±1–2 px; tree sway 2–4 px; one shared gust curve plus different phase offsets per tree. Keep the gameplay layers above every course-animation layer.

## Files

- `course_plate_loop.mp4` — finished animated background.
- `course_plate_loop_preview.gif` — smaller visual preview only.
- `course_plate_loop_poster.png` — first frame/poster.
- `course_plate.png` — static fallback.
- `water_mask.png` and `water_displacement_mask.png` — water masks.
- `tree_motion_mask.png` — tree wind influence map.
- `motion_spec.json` — machine-readable setup.

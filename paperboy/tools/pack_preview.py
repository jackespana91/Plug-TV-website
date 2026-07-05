#!/usr/bin/env python3
"""
Packs the Vite production build (dist/) into one self-contained HTML file
for sharing as an Artifact preview — inlines the CSS, the JS bundle, and
all 8 Ace sprite sheets as base64 data URIs (the game is zero-runtime-
dependency and the whole bundle is ~15KB gzipped, so this stays small).

The built JS loads sprites via `o.src = \`/sprites/ace_${t}.png\``; since an
Artifact page can't make network requests, that line is rewritten to read
from a SPRITE_DATA map (pose name -> data URI) injected ahead of the bundle.

Usage:
    npm run build && python3 tools/pack_preview.py
"""
import base64
import io
import json
import re
from pathlib import Path

from PIL import Image

DIST = Path(__file__).parent.parent / "dist"
OUT = Path(__file__).parent / "preview.html"

# pose -> frame count, must match SPRITE_DEFS in src/game/scene.ts exactly
FRAMES = {"idle": 1, "ride": 8, "throw": 6, "wheelie": 7, "tuck": 5, "skid": 6, "tumble": 8, "crashed": 1}
POSES = list(FRAMES)

# On screen these sheets are drawn at ~90px tall (SPRITE_SCALE in scene.ts);
# the source art is full-res (800-1800px tall) for future-proofing, which is
# massive overkill for a shareable preview. Downscale here only — the real
# game assets in public/sprites/ are untouched. Since the bundled JS has the
# *original* per-pose frameW/frameH baked in (from SPRITE_DEFS) to slice each
# sheet, the SPRITE_DEFS object literal in the JS must be rewritten to match
# these resized dimensions exactly, or drawImage reads the wrong source rect.
PREVIEW_FRAME_HEIGHT = 220


def main() -> None:
    css = next(DIST.glob("assets/*.css")).read_text()
    js = next(DIST.glob("assets/*.js")).read_text()

    sprite_data = {}
    new_defs = {}
    for pose in POSES:
        im = Image.open(DIST / "sprites" / f"ace_{pose}.png")
        scale = PREVIEW_FRAME_HEIGHT / im.height
        new_w = max(1, round(im.width * scale))
        im = im.resize((new_w, PREVIEW_FRAME_HEIGHT), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, format="WEBP", quality=85, method=6)
        sprite_data[pose] = "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()
        new_defs[pose] = {"frames": FRAMES[pose], "frameW": new_w // FRAMES[pose], "frameH": PREVIEW_FRAME_HEIGHT}
        print(f"  {pose}: {im.size}, frameW={new_defs[pose]['frameW']}, {len(buf.getvalue())/1024:.0f} KB")

    defs_pattern = "".join(
        rf"{p}:\{{frames:\d+,frameW:\d+,frameH:\d+\}}" + (r"," if i < len(POSES) - 1 else "")
        for i, p in enumerate(POSES)
    )
    defs_re = re.compile(r"\{" + defs_pattern + r"\}")
    if not defs_re.search(js):
        raise SystemExit("SPRITE_DEFS object literal not found in bundle — did scene.ts's shape change?")
    new_defs_literal = "{" + ",".join(
        f'{p}:{{frames:{new_defs[p]["frames"]},frameW:{new_defs[p]["frameW"]},frameH:{new_defs[p]["frameH"]}}}'
        for p in POSES
    ) + "}"
    js = defs_re.sub(new_defs_literal, js)

    pattern = r"\.src=`/sprites/ace_\$\{(\w+)\}\.png`"
    m = re.search(pattern, js)
    if not m:
        raise SystemExit("sprite src pattern not found in bundle — did scene.ts's loader change?")
    var = m.group(1)
    js = re.sub(pattern, f".src=window.__SPRITES__[{var}]", js)

    sprite_json = json.dumps(sprite_data)

    html = f"""<title>Paperboy: The Run — Live Preview</title>
<style>{css}</style>
<div id="app">
  <header class="topstrip">
    <div class="brand">PAPERBOY<span>: THE RUN</span></div>
    <div class="stats">
      <div class="stat"><label>Delivered</label><span id="stat-delivered">–</span></div>
      <div class="stat"><label>Side pocket</label><span id="stat-pocket" class="money">0.00</span></div>
      <div class="stat"><label>Best run</label><span id="stat-best">–</span></div>
      <button id="btn-mute" class="icon" title="Sound">🔊</button>
    </div>
  </header>
  <main class="stage">
    <canvas id="game"></canvas>
    <div id="overlay" class="overlay hidden">
      <div class="card">
        <div id="overlay-kicker" class="kicker"></div>
        <div id="overlay-title" class="title"></div>
        <div id="overlay-amount" class="amount"></div>
        <div id="overlay-sub" class="sub"></div>
      </div>
    </div>
    <div id="routes" class="routes">
      <button class="route" data-route="easy-street"><b>🌅 Easy Street</b><i>Sleepy cul-de-sac · slow &amp; steady</i><em></em></button>
      <button class="route selected" data-route="suburbia"><b>🏘 Suburbia</b><i>The classic paper route</i><em></em></button>
      <button class="route" data-route="dog-alley"><b>🌆 Dog Alley</b><i>Loose dogs · fast money</i><em></em></button>
    </div>
  </main>
  <div id="ribbon" class="ribbon"></div>
  <section class="controls">
    <div class="bet">
      <label>Bet</label>
      <button id="bet-down">−</button>
      <span id="bet-value" class="money">1.00</span>
      <button id="bet-up">+</button>
    </div>
    <button id="btn-main" class="mainbtn deliver">
      <span id="btn-label">DELIVER</span>
      <span id="btn-amount"></span>
    </button>
    <div class="balance">
      <label>Balance</label>
      <span id="balance" class="money">1,000.00</span>
      <a href="#" id="reset">reset demo</a>
    </div>
  </section>
  <footer class="fairness">
    Demo wallet · tap a rung to plant your flag 🚩, then press DELIVER — the whole round,
    payout included, is fixed by the RNG before the run starts; the ride is a replay.
    Target RTP 96%. Packed preview build — not the dev server.
  </footer>
</div>
<script>window.__SPRITES__ = {sprite_json};</script>
<script type="module">{js}</script>
"""
    OUT.write_text(html)
    print(f"written: {OUT} ({OUT.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()

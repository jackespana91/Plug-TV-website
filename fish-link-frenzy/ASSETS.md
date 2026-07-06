# Fish Link Frenzy — Production Asset Spec

Hand this document to the artist / generation tool (Skywork). Every asset below
maps 1:1 to a placeholder currently in the game, so delivered files can be
dropped in without layout changes.

## Global art direction (applies to every asset)

- **Style:** polished cartoon-3D "social casino" render — chunky shapes, bold
  rim light, glossy highlights. Reference: modern fishing-slot games
  (Lotsa/Jackpot-World tier). One consistent style across ALL assets.
- **Theme:** cheerful lakeside fishing — blue lake, mountains, warm gold accents.
- **Lighting:** single key light, top-left, consistent in every render.
- **Palette anchors:** UI purple `#7A1FB8` / dark `#3A0A5E`, gold `#FFD23F` /
  `#E8960C`, CTA green `#4FD932`, water blue `#3F7FC9`.
- **Format:** PNG-24 with transparent background for all sprites/UI;
  high-quality JPG or WebP for full-screen backgrounds. sRGB.
- **Margins:** symbols get ~6% transparent padding on all sides; nothing clipped.
- **No baked-in English text** unless the item IS wordart (marked ⚠️TEXT).
  Numbers/labels are rendered live by the game.
- **Naming:** exactly as given in the `file` column, lowercase, `.png`/`.jpg`.
- Sizes below are @2x retina for a 470 px-wide game viewport. Deliver at the
  stated size (or larger, same aspect).

---

## 1 · Reel symbols — 512×512 PNG, transparent (P0)

Square composition, symbol fills ~85% of canvas, subtle drop shadow baked.

| # | file | description |
|---|------|-------------|
| 1 | `sym_boat.png` | Premium symbol: red-and-gold fishing trawler on small water splash (matches original "boat" premium) |
| 2 | `sym_tackle.png` | Purple/gold tackle box, open lid showing lures |
| 3 | `sym_boots.png` | Pair of blue rubber fishing boots with gold trim |
| 4 | `sym_reel.png` | Green fishing reel with gold crank |
| 5 | `sym_gloves.png` | Teal rubber fishing gloves, gold cuff |
| 6 | `sym_a.png` | Card letter "A" — carved wood style, orange-amber gradient, gold bevel ⚠️TEXT |
| 7 | `sym_k.png` | Card letter "K" — same style, red gradient ⚠️TEXT |
| 8 | `sym_q.png` | Card letter "Q" — same style, pink/magenta gradient ⚠️TEXT |
| 9 | `sym_j.png` | Card letter "J" — same style, blue gradient ⚠️TEXT |
| 10 | `sym_wild.png` | WILD: jolly red-bearded fisherman bust, yellow rain hat & coat, big grin, framed in glowing ice-blue border; small gold "WILD" ribbon at bottom ⚠️TEXT |
| 11 | `fish_red.png` | Cartoon money fish, RED/orange body, happy face, slight left-facing 3/4 view |
| 12 | `fish_pink.png` | Same fish, PINK/magenta body (identical pose to red) |
| 13 | `fish_blue.png` | Same fish, BLUE body (identical pose) |
| 14 | `fish_gold.png` | Golden scatter fish — shiny metallic gold, sparkles, slightly grander fins |
| 15 | `fish_red_double.png` | TWO overlapping red fish (double-bonus form, Extra Symbols perk) |
| 16 | `fish_pink_double.png` | Two overlapping pink fish |
| 17 | `fish_blue_double.png` | Two overlapping blue fish |

Value plaque under fish is drawn by the game — leave the lower 15% of the fish
sprites visually simple so a small gold-bordered plaque can overlap.

## 2 · Fish Link bonus pieces — PNG, transparent (P0)

| # | file | size | description |
|---|------|------|-------------|
| 18 | `fl_coin_silver.png` | 512×512 | Silver coin with embossed fish, slight 3/4 tilt — the sticky "money fish" token on the bonus board (value text rendered live) |
| 19 | `fl_coin_gold.png` | 512×512 | Gold version of the same coin — jackpot fish token |
| 20 | `fl_fish_bonus.png` | 512×512 | Purple "progress" fish (same fish model, purple body, small sparkle) — feeds the fisherman upgrade meter |
| 21 | `fl_coin_plusspin.png` | 512×512 | Gold coin with "+1" and a small green spin arrow ⚠️TEXT ("+1" only) |
| 22 | `fl_fisherman.png` | 1024×1024 | The star: full fisherman (yellow bucket hat with badge, red beard/moustache, yellow raincoat over red-striped shirt, holding a rope net) — front-facing, happy. Must read well scaled from 2 to 8 grid cells |
| 23 | `fl_fisherman_celebrate.png` | 1024×1024 | Same character, arms up cheering (upgrade / jackpot moment) |
| 24 | `fl_frame_ice.png` | 512×512, **9-slice** | Glowing ice-blue frame with frost/net texture — border of the fisherman block (corners 96 px) |
| 25 | `fl_tier_badge.png` | 256×256 | Round gold coin badge with the fisherman's face — sidebar tier marker (tier text "3×3" rendered live) |
| 26 | `fl_board_frame.png` | 1024×1500, 9-slice | Rustic wood board frame with rope & netting corners for the bonus grid (corners 140 px) |
| 27 | `bg_fishlink.jpg` | 1290×2796 | Bonus background: same lake at dramatic red-orange sunset, silhouetted mountains (matches original bonus mood shift) |

## 3 · Backgrounds & scene props (P0)

| # | file | size | description |
|---|------|------|-------------|
| 28 | `bg_main.jpg` | 1290×2796 | Portrait lakeside day scene: turquoise lake, pine shores, snowy mountains, blue sky. Calm center-third (reels sit over it) |
| 29 | `boat_goldfish.png` | 900×600 PNG | Wooden rowboat overflowing with shiny golden fish (Super Pick collection boat) |
| 30 | `sign_superpick.png` | 600×360 PNG | Rustic wooden hanging sign, slight tilt, gold "SUPER PICK" lettering ⚠️TEXT |
| 31 | `bucket_pink.png` | 480×480 PNG | Purple/violet metal bucket filled with water, gold coins and a PINK fish leaping out |
| 32 | `bucket_red.png` | 480×480 PNG | Pink/red bucket, coins + RED fish |
| 33 | `bucket_blue.png` | 480×480 PNG | Blue bucket, coins + BLUE fish |
| 34 | `frame_reels.png` | 1000×900 PNG, 9-slice | Main-game wooden reel frame wrapped in rope/fishing net, leafy corner accents (corners 120 px) |
| 35 | `ticker_bar.png` | 900×64 PNG, 9-slice | Dark wood marquee strip with gold border (corners 24 px) |

## 4 · UI kit (P0)

| # | file | size | description |
|---|------|------|-------------|
| 36 | `btn_spin.png` | 260×190 | Big green glossy rounded-rect button, blank face (SPIN/STOP text live) |
| 37 | `btn_spin_stop.png` | 260×190 | Orange/red pressed variant |
| 38 | `btn_round_purple.png` | 96×96 | Round purple +/- stepper button, blank |
| 39 | `btn_maxbet.png` | 160×160 | Round lavender "MAX BET" chip button, blank face |
| 40 | `btn_info.png` | 140×140 | Round gold button with dark "i" |
| 41 | `btn_green_pill.png` | 600×140, 9-slice | Green CTA pill (BACK TO GAME / COLLECT / START — text live; corners 66 px) |
| 42 | `btn_arrow_green.png` | 160×120 | Green nav arrow (point RIGHT; game mirrors for left) |
| 43 | `panel_console.png` | 940×260, 9-slice | Bottom control console: dark purple, rounded top corners, starfield sparkle (corners 60 px) |
| 44 | `panel_modal.png` | 900×1400, 9-slice | Rules/feature modal: deep purple panel, bright violet border glow, rounded corners (corners 80 px) |
| 45 | `plaque_jackpot_grand.png` | 900×140, 9-slice | GRAND banner: dark plaque, ornate gold border |
| 46 | `plaque_jackpot.png` | 300×110 | Small jackpot plaque, neutral dark center, gold trim — used ×3 with colored glow set in CSS (Major/Minor/Mini) |
| 47 | `pill_balance.png` | 600×90, 9-slice | Dark coin-balance pill with violet border |
| 48 | `btn_buy.png` | 220×110 | Green glossy "BUY" button ⚠️TEXT |
| 49 | `btn_supersale.png` | 220×110 | Pink "SUPER SALE" button ⚠️TEXT |
| 50 | `badge_leveldash.png` | 220×110 | Orange "LEVEL DASH" badge with small meter groove ⚠️TEXT |
| 51 | `icon_coin.png` | 128×128 | Gold dollar coin, 3/4 tilt (balance icon + win counters + particles) |
| 52 | `card_back.png` | 420×500 | Super Pick card back: purple, gold filigree border, big glowing gold "?" |
| 53 | `card_front.png` | 420×500 | Matching blank card front (reward icon + label composited live) |
| 54 | `pill_spins.png` | 360×110 | White/lavender "X OF Y SPINS" counter pill, purple border, blank |
| 55 | `banner_totalwin.png` | 700×160, 9-slice | Dark red "TOTAL WIN" banner with gold frame (label + number live) |

## 5 · Wordart & celebration (P1) — PNG transparent ⚠️TEXT

Chunky gold-outlined casino lettering with inner gradient; slight arc.

| # | file | size | text |
|---|------|------|------|
| 56 | `logo_game.png` | 1024×512 | "FISH LINK FRENZY" game logo w/ fish + hook flourish |
| 57 | `wa_bigwin.png` | 1000×420 | "BIG WIN" |
| 58 | `wa_megawin.png` | 1000×420 | "MEGA WIN" |
| 59 | `wa_epicwin.png` | 1000×420 | "EPIC WIN" |
| 60 | `wa_fishlink.png` | 1000×360 | "FISH LINK" (bonus title, red-gold flame style like original) |
| 61 | `wa_superpick.png` | 1000×360 | "SUPER PICK" |
| 62 | `wa_jackpot_mini.png` | 900×420 | "MINI" green gem letters |
| 63 | `wa_jackpot_minor.png` | 900×420 | "MINOR" blue gem letters |
| 64 | `wa_jackpot_major.png` | 900×420 | "MAJOR" pink gem letters |
| 65 | `wa_jackpot_grand.png` | 900×420 | "GRAND" red-gold letters |
| 66 | `celebrate_fisherman.png` | 1290×1400 | Jackpot-win hero: fisherman bursting through a mountain of gold coins, arms spread, coins flying (like original MINI-win screen) |

## 6 · FX sprite sheets (P2, optional polish)

| # | file | size | description |
|---|------|------|-------------|
| 67 | `fx_coin_flip.png` | 1024×128 (8 frames of 128×128, horizontal strip) | Gold coin tumbling 360° |
| 68 | `fx_splash.png` | 1536×256 (6 frames of 256×256) | Cartoon water splash burst |
| 69 | `fx_sparkle.png` | 512×128 (4 frames of 128×128) | Gold star sparkle twinkle |

---

## Delivery checklist for Skywork

1. All sprites on **fully transparent** backgrounds (no white boxes, no halo).
2. The three money fish (11–13) and purple fish (20) are the **same model,
   recolored** — identical pose/expression so meters read consistently.
3. Fisherman appears in 4 assets (10, 22, 23, 66) — **must be the same
   character** (yellow bucket hat + badge, red beard, yellow coat, striped shirt).
4. 9-slice items: keep corner detail inside the stated corner size; centers
   must stretch cleanly (no pattern seams).
5. Deliver 1x as specced; source/4K masters welcome for future upscaling.
6. Batch order if generating incrementally: §1 → §2 → §3 → §4 → §5 → §6.

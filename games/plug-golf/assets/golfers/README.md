# Golfer swing sprite sheets — drop folder

Drop the rendered swing sheets here and the game wires them in automatically
(with the procedural golfer as fallback for any character whose sheet is
missing).

## Expected files (one sheet per character)
| File | Character | Accent |
|------|-----------|--------|
| `golfer-drip-swing.png`   | Drip   | green `#39ff7a` |
| `golfer-ice-swing.png`    | Ice    | blue `#5db8ff` |
| `golfer-mic-swing.png`    | Mic    | pink `#ff5db8` |
| `golfer-baller-swing.png` | Baller | gold `#ffd34d` |
| `golfer-boss-swing.png`   | Boss   | purple `#c07bff` |
| `golfer-ace-swing.png`    | Ace    | orange `#ff8c42` |

Only `golfer-drip-swing.png` is needed to start — the rest fall back to the
procedural golfer until their sheet is added.

## Sheet format (matches the art already produced)
- **Grid:** 4 columns × 2 rows = **8 frames**, read left→right, top→bottom.
- **Transparent** background (PNG with alpha). No baked-in course/shadow.
- Frame order (the full swing):
  1. Address        5. Downswing
  2. Takeaway       6. Impact
  3. Backswing      7. Follow-through
  4. Top            8. Finish
- Character **feet on a consistent baseline** and the **ball position
  consistent** across frames (or no ball baked in — the game draws its own
  ball; a baked ball will be cropped/hidden at the tee).
- Any resolution; the loader derives cell size from the image
  (`cellW = width/4`, `cellH = height/2`). Higher-res = crisper on zoom —
  ~1400×1050 or larger is ideal.

After dropping the file(s), commit + push (or just tell me the files are in and
I'll wire, verify, and republish the artifact).

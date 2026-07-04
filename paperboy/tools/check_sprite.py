#!/usr/bin/env python3
"""
Fast pre-flight check for a new Ace sprite sheet, against
docs/paperboy/04-character-art-brief.md's spec, before it's wired into
scene.ts. Run this the moment a new PNG lands — it catches everything that
caused slow back-and-forth last time (no real transparency, ambiguous frame
count, an anchor point that drifts between frames) in one command instead
of a manual crop-and-eyeball cycle.

Usage:
    python3 tools/check_sprite.py path/to/ace_ride.png --pose ride
    python3 tools/check_sprite.py path/to/ace_ride.png --frames 8

    --pose <name>   cross-checks frame count against the brief's target
                     table (idle/ride/throw/wheelie/tuck/skid/tumble/crashed)
    --frames N      explicit frame count if not passing --pose, or to
                     override the brief's target while iterating

Requires Pillow (pip install pillow) — not a project dependency, just a
dev-time tool.
"""
import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("Requires Pillow: pip install pillow", file=sys.stderr)
    sys.exit(1)

# Target frame counts per docs/paperboy/04-character-art-brief.md §4/§7.
# (What's actually wired into scene.ts today may be lower for some poses —
# see that doc's v1.2 coverage table — since this checks against the ideal
# spec, not the current shipped fallback.)
BRIEF_FRAME_COUNTS = {
    "idle": 1,
    "ride": 8,
    "throw": 6,
    "wheelie": 7,
    "tuck": 5,
    "skid": 6,
    "tumble": 8,
    "crashed": 1,  # or 3, for the optional dazed-stars loop
}

ASPECT_TARGET = 74 / 83  # brief §1's bounding box, width:height


def check_transparency(im: Image.Image) -> tuple[bool, str]:
    if "A" not in im.mode:
        return False, f"NO ALPHA CHANNEL (mode={im.mode}) — flattened background, not usable as-is"
    alpha = im.getchannel("A")
    w, h = im.size
    corners = [(2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3)]
    corner_alphas = [im.getpixel(c)[3] for c in corners]
    if max(corner_alphas) > 10:
        return False, f"corners are NOT transparent (alpha={corner_alphas}) — looks flattened onto a background"
    hist = alpha.histogram()
    transparent_frac = hist[0] / (w * h)
    return True, f"OK — {transparent_frac*100:.0f}% fully transparent, corners clean"


def detect_frames(im: Image.Image, expected_frames: int | None) -> list[tuple[int, int, int, int]]:
    """Slice into `expected_frames` equal-width columns (uniform grid, per
    the brief's delivery spec) rather than trying to auto-detect boundaries
    — a real sheet should already be a clean uniform strip."""
    w, h = im.size
    n = expected_frames or 1
    if w % n != 0:
        print(
            f"  WARNING: image width {w}px is not evenly divisible by {n} frames "
            f"({w/n:.1f}px/frame) — cells won't be uniform, check the export.",
            file=sys.stderr,
        )
    frame_w = w // n
    return [(i * frame_w, 0, (i + 1) * frame_w, h) for i in range(n)]


def check_frame_alignment(im: Image.Image, frames: list[tuple[int, int, int, int]]) -> None:
    """Flags frames whose tight content bbox drifts noticeably from the others
    — an early warning for the 'Ace jumps when poses/frames switch' failure
    mode the brief's §7 anchor-consistency note exists to prevent."""
    bboxes = []
    for (x0, y0, x1, y1) in frames:
        crop = im.crop((x0, y0, x1, y1))
        bbox = crop.getbbox()
        bboxes.append(bbox)

    bottoms = [b[3] for b in bboxes if b]
    centers_x = [((b[0] + b[2]) / 2) for b in bboxes if b]
    if not bottoms:
        print("  WARNING: at least one frame is fully transparent (empty) — check export.", file=sys.stderr)
        return

    bottom_spread = max(bottoms) - min(bottoms)
    center_spread = max(centers_x) - min(centers_x)
    frame_h = frames[0][3] - frames[0][1]
    frame_w = frames[0][2] - frames[0][0]

    print(f"  ground-contact (bottom edge) drift across frames: {bottom_spread}px "
          f"({'OK' if bottom_spread < frame_h * 0.08 else 'HIGH — Ace will visibly bob/jump'})")
    print(f"  horizontal-center drift across frames: {center_spread}px "
          f"({'OK' if center_spread < frame_w * 0.15 else 'HIGH — Ace will visibly slide sideways'})")


def make_contact_sheet(im: Image.Image, frames: list[tuple[int, int, int, int]], out_path: Path) -> None:
    cell_w = frames[0][2] - frames[0][0]
    cell_h = frames[0][3] - frames[0][1]
    pad, label_h = 6, 16
    sheet = Image.new("RGBA", (len(frames) * (cell_w + pad) + pad, cell_h + label_h + pad), (30, 32, 44, 255))
    draw = ImageDraw.Draw(sheet)
    for i, box in enumerate(frames):
        crop = im.crop(box)
        x = pad + i * (cell_w + pad)
        sheet.paste(crop, (x, label_h), crop)
        draw.text((x, 2), f"{i}", fill=(255, 220, 90, 255))
    sheet.save(out_path)
    print(f"  contact sheet written: {out_path}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("path", type=Path)
    ap.add_argument("--pose", choices=sorted(BRIEF_FRAME_COUNTS), help="cross-check frame count against the brief")
    ap.add_argument("--frames", type=int, help="explicit frame count (overrides --pose)")
    ap.add_argument("--out", type=Path, default=None, help="contact sheet output path (default: alongside input)")
    args = ap.parse_args()

    if not args.path.exists():
        print(f"File not found: {args.path}", file=sys.stderr)
        sys.exit(1)

    im = Image.open(args.path).convert("RGBA")
    w, h = im.size
    print(f"{args.path.name}: {w}x{h}px, mode={im.mode}")

    ok, msg = check_transparency(im)
    print(f"  transparency: {msg}")

    expected = args.frames
    if expected is None and args.pose:
        expected = BRIEF_FRAME_COUNTS[args.pose]
        print(f"  pose '{args.pose}' target frame count (brief §4/§7): {expected}")
    if expected is None:
        print("  no --pose or --frames given — assuming 1 frame. Pass one to slice/check properly.")
        expected = 1

    frames = detect_frames(im, expected)
    frame_w = frames[0][2] - frames[0][0]
    aspect = frame_w / h
    print(f"  frame cell: {frame_w}x{h}px, aspect {aspect:.2f} (target ~{ASPECT_TARGET:.2f} per brief §1)")
    if abs(aspect - ASPECT_TARGET) / ASPECT_TARGET > 0.35:
        print("  WARNING: aspect ratio is well off the brief's target — check for stretching/squashing.")

    check_frame_alignment(im, frames)

    out_path = args.out or args.path.with_name(args.path.stem + "_contact.png")
    make_contact_sheet(im, frames, out_path)

    print("  " + ("READY to wire in" if ok else "NOT READY — fix transparency first"))


if __name__ == "__main__":
    main()

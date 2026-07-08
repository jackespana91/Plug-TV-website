#!/usr/bin/env python3
"""
One-time fix for the raw_2 sprite batch: the source generator flattened every
sheet onto a near-white background (a fake checkerboard baked into the pixels,
not a real alpha channel — see check_sprite.py's "corners are NOT transparent"
failure). Removes it by global color distance from a border-sampled
reference: every pixel within `tol` of that near-white reference goes to
alpha=0, regardless of whether it's reachable from the image edge. (An
earlier border-flood-fill version missed background pockets that got
enclosed by overlapping character silhouettes in tightly packed sheets —
e.g. wheelie's frame-to-frame overlap — leaving opaque white islands.) The
game's actual cream/white (sneakers, papers, #F4F1E8 per the art brief) sits
~42 apart from the background reference in this batch, safely outside the
default tolerance.

Usage:
    python3 tools/debg.py public/sprites/ace_ride_sheet_raw_2.png -o public/sprites/ace_ride.png
"""
import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image


def debg(im: Image.Image, tol: int) -> Image.Image:
    arr = np.array(im.convert("RGBA"))
    rgb = arr[:, :, :3].astype(int)
    h, w = rgb.shape[:2]

    border_pixels = np.concatenate([
        rgb[0, :], rgb[-1, :], rgb[:, 0], rgb[:, -1],
    ])
    bg_ref = np.median(border_pixels, axis=0)

    dist = np.abs(rgb - bg_ref).sum(axis=2)
    bg_like = dist <= tol

    out = arr.copy()
    out[bg_like, 3] = 0
    removed_frac = bg_like.sum() / (h * w)
    print(f"  bg reference {tuple(bg_ref.astype(int))}, tol={tol}: "
          f"removed {removed_frac*100:.1f}% of pixels as background", file=sys.stderr)
    return Image.fromarray(out, "RGBA")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("path", type=Path)
    ap.add_argument("-o", "--out", type=Path, required=True)
    ap.add_argument("--tol", type=int, default=20, help="max per-pixel color distance from the sampled background (default 20)")
    args = ap.parse_args()

    im = Image.open(args.path)
    result = debg(im, args.tol)
    result.save(args.out)
    print(f"  written: {args.out}")


if __name__ == "__main__":
    main()

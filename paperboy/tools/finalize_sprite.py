#!/usr/bin/env python3
"""
Turns a raw_2 sheet (flattened background, huge padding around the character)
into a game-ready sprite: real alpha (via debg's border flood fill), then
cropped to the sheet's overall opaque bounding box so the excess padding
baked in by the generator is gone before it's divided into equal-width
frame cells.

Usage:
    python3 tools/finalize_sprite.py public/sprites/ace_ride_sheet_raw_2.png -o public/sprites/ace_ride.png
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image

from debg import debg


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("path", type=Path)
    ap.add_argument("-o", "--out", type=Path, required=True)
    ap.add_argument("--tol", type=int, default=20)
    ap.add_argument("--margin", type=int, default=4, help="px of padding to keep around the tight content bbox")
    args = ap.parse_args()

    im = debg(Image.open(args.path), args.tol)
    arr = np.array(im)
    alpha = arr[:, :, 3]
    ys, xs = np.where(alpha > 0)
    x0, x1 = max(xs.min() - args.margin, 0), min(xs.max() + args.margin, arr.shape[1])
    y0, y1 = max(ys.min() - args.margin, 0), min(ys.max() + args.margin, arr.shape[0])

    cropped = im.crop((x0, y0, x1, y1))
    cropped.save(args.out)
    print(f"  {args.path.name}: {im.size} -> cropped to {cropped.size} (bbox x[{x0}:{x1}] y[{y0}:{y1}])")
    print(f"  written: {args.out}")


if __name__ == "__main__":
    main()

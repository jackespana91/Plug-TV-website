#!/usr/bin/env python3
"""
build_publish.py — standalone generator for Plug Golf's Stake Engine math upload.

Produces the `publish/` folder in the exact shape Stake ingests as the "Math"
files, WITHOUT needing the math-sdk framework installed — because Plug Golf is a
discrete instant-win, the whole outcome space is enumerable (one book per
paytable row), so no simulation or optimiser is needed and RTP is exact.

If you run the real framework instead (`python run.py` inside a math-sdk
checkout), it produces the same payload via create_books()/generate_configs();
this script is the framework-free path so the folder is upload-ready as-is.

Outputs (per mode):
  publish/books_compressed/books_<mode>.jsonl.zst   zstd-compressed books
  publish/books/books_<mode>.jsonl                  uncompressed (reference)
  publish/lookup_tables/lookUpTable_<mode>.csv       simulation,weight,payout(x100)
  publish/lookup_tables/lookUpTableIdToCriteria_<mode>.csv  simulation,criteria
  publish/config.json                                mode manifest (name,cost,rtp,maxWin)

Usage:  python build_publish.py
"""
import json
import os
import csv
import zstandard as zstd

from paytables import PAYTABLES, MODE_META, WEIGHT_SCALE, RTP_TARGET, tier_for, rtp, max_win

HERE = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(HERE, "publish")


def book_for(mode, sim_id, mult, club):
    """One book = one round outcome, as the frontend's bookEventHandlerMap reads it."""
    pm = round(mult * 100)  # integer x100 per Stake spec (100 = 1.0x)
    return {
        "id": sim_id,
        "events": [
            {"index": 0, "type": "shot", "club": club, "tier": tier_for(mult), "payoutMultiplier": pm},
            {"index": 1, "type": "finalWin", "amount": pm},
        ],
        "payoutMultiplier": pm,
    }


def main():
    os.makedirs(os.path.join(PUB, "books_compressed"), exist_ok=True)
    os.makedirs(os.path.join(PUB, "books"), exist_ok=True)
    os.makedirs(os.path.join(PUB, "lookup_tables"), exist_ok=True)
    cctx = zstd.ZstdCompressor(level=19)
    modes = []
    all_ok = True

    for mode, table in PAYTABLES.items():
        books_lines, lut_rows, crit_rows = [], [], []
        for i, (mult, weight) in enumerate(table):
            sim_id = i + 1
            books_lines.append(json.dumps(book_for(mode, sim_id, mult, mode), separators=(",", ":")))
            lut_rows.append((sim_id, weight, round(mult * 100)))
            crit_rows.append((sim_id, "basegame"))

        jsonl = ("\n".join(books_lines) + "\n").encode("utf-8")
        with open(os.path.join(PUB, "books", f"books_{mode}.jsonl"), "wb") as f:
            f.write(jsonl)
        with open(os.path.join(PUB, "books_compressed", f"books_{mode}.jsonl.zst"), "wb") as f:
            f.write(cctx.compress(jsonl))
        with open(os.path.join(PUB, "lookup_tables", f"lookUpTable_{mode}.csv"), "w", newline="") as f:
            csv.writer(f).writerows(lut_rows)
        with open(os.path.join(PUB, "lookup_tables", f"lookUpTableIdToCriteria_{mode}.csv"), "w", newline="") as f:
            csv.writer(f).writerows(crit_rows)

        r = rtp(mode)
        wsum = sum(w for _, w in table)
        ok = wsum == WEIGHT_SCALE and abs(r - RTP_TARGET) < 1e-12
        all_ok = all_ok and ok
        modes.append({
            "name": mode, "label": MODE_META[mode]["label"], "cost": 1.0,
            "rtp": round(r, 6), "maxWin": max_win(mode), "volatility": MODE_META[mode]["vol"],
            "events": f"books_compressed/books_{mode}.jsonl.zst",
            "weights": f"lookup_tables/lookUpTable_{mode}.csv",
        })
        print(f"{mode:12s} rows={len(table):2d}  RTP={r*100:.2f}%  maxWin={max_win(mode)}x  weights={wsum}  {'OK' if ok else 'FAIL'}")

    with open(os.path.join(PUB, "config.json"), "w") as f:
        json.dump({"gameId": "plug_golf", "rtpTarget": RTP_TARGET, "weightScale": WEIGHT_SCALE, "modes": modes}, f, indent=2)

    print("\nPUBLISH OK — upload games/plug_golf/publish/ as the Math files" if all_ok else "\nRTP MISMATCH")
    raise SystemExit(0 if all_ok else 1)


if __name__ == "__main__":
    main()

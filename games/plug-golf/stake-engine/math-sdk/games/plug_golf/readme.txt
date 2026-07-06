PLUG GOLF — Stake Engine math game
==================================

Discrete instant-win golf. Six bet modes (clubs), each a weighted payout table in
paytables.py. Every mode is exactly 96.00% RTP (enumerable outcomes — no optimiser
needed). Modeled on the math-sdk `fifty_fifty` sample.

WHAT TO UPLOAD
--------------
Upload the contents of  publish/  as the "Math" files on Stake Engine:
  publish/books_compressed/books_<mode>.jsonl.zst
  publish/lookup_tables/lookUpTable_<mode>.csv (+ ...IdToCriteria_<mode>.csv)
  publish/config.json

TWO WAYS TO PRODUCE publish/
----------------------------
1) Framework-free (recommended, exact weights, runs anywhere):
     pip install zstandard
     python build_publish.py
   This enumerates every outcome and writes publish/ directly — RTP is exact by
   construction (re-verified per mode on run).

2) Inside a math-sdk checkout (StakeEngine/math-sdk), place this folder under
   games/plug_golf/ and run:
     python run.py
   create_books()/generate_configs() produce the same payload via simulation.
   The src.* imports in the .py files target the framework; reconcile against the
   sample games if the API has moved.

FRONTEND CONTRACT
-----------------
Each book emits: {type:"shot", club, tier, payoutMultiplier} then
{type:"finalWin", amount}. payoutMultiplier/amount are integers x100 (100 = 1.0x).
The web-sdk frontend (../../stake-web-sdk/apps/plug-golf) reads exactly these.
The `tier` selects the animation; it never affects the payout.

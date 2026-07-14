# Plug Golf — what to upload to Stake Engine

Two deliverables, matching Stake's two SDKs. Full step-by-step is in
`stake-engine/SUBMISSION.md`; this is the "which folder is which" summary.

## 1. Math  →  upload the `publish/` files

**Folder:** `stake-engine/math-sdk/games/plug_golf/publish/`

Contains the Math files Stake ingests: `books_compressed/*.jsonl.zst`,
`lookup_tables/*.csv`, and `config.json`. Already generated and verified at
**96.50% RTP** on all six modes.

To regenerate (after any paytable change):
```bash
pip install zstandard
cd stake-engine/math-sdk/games/plug_golf && python build_publish.py
```
The folder is a full math-sdk game (Python source modeled on the `fifty_fifty`
sample) — see `stake-engine/math-sdk/README.md`.

## 2. Frontend  →  build the web-sdk game, upload the build

**Folder:** `stake-web-sdk/apps/plug-golf/`

This is the game app for Stake's **web-sdk** (Svelte 5 + PixiJS 8). It builds inside
a `StakeEngine/web-sdk` checkout:
```bash
# in a web-sdk clone:
cp -r <this-repo>/games/plug-golf/stake-web-sdk/apps/plug-golf apps/plug-golf
pnpm install
pnpm run build --filter=plug-golf      # → upload this build as the Frontend
```
Reconcile the three integration seams first (see `stake-web-sdk/README.md` §4).
The pure game logic is already typechecked and tested in-repo
(`npm run check`, `npm run test:engine`, `test/preShot.test.ts`).

## Mode ↔ math ↔ frontend

The six modes line up across all three: `wedge, short_iron, long_iron, three_wood,
driver, masters`. Each book emits `{type:"shot", club, tier, payoutMultiplier}` then
`{type:"finalWin", amount}` (integers ×100); the frontend renders the `tier`, which
never affects the payout. Keep the two sides in sync if you edit the paytables.

## Before you upload
- [ ] `python build_publish.py` → all six modes print `96.50% … OK`
- [ ] `node games/plug-golf/verify-rtp.mjs` → `ALL TABLES PASS ✓`
- [ ] web-sdk: `npm run check` + `npm run test:engine` + `preShot.test.ts` pass
- [ ] decide Masters pricing (cost) and confirm max-win / RTP disclosure per market
- [ ] compliance flags in `stake-engine/SUBMISSION.md` §4

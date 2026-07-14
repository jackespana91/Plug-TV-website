# PLUG GOLF — Stake Engine submission checklist

The path from this repo to a live game on Stake Engine. Two artifacts ship: the
**math package** (this folder) and the **web-sdk frontend**
(`../stake-web-sdk/`). Work top to bottom.

---

## 1. Math package

- [ ] **Generate**: `node stake-engine/generate-math.mjs` — writes `math/` (books,
      lookup tables, `index.json`). Re-run after any paytable edit in `index.html`.
- [ ] **Verify RTP**: the generator re-checks 96.50% per mode; also run
      `node games/plug-golf/verify-rtp.mjs` (all six tables must print ✓).
- [ ] **Compress books**: `zstd math/books_*.jsonl` → `.jsonl.zst` (Stake requires
      zstd-compressed books; `index.json` already references the `.zst` names).
- [ ] **Modes / costs** in `index.json`: `wedge, short_iron, long_iron, three_wood,
      driver, masters`. Decide **Masters pricing** — keep `cost: 1.0` (equal stake)
      or raise it to make it a paid feature-buy event round (the table already
      carries the 100x top).
- [ ] **Max win** per mode is bounded by the top multiplier (Wedge 5x … Driver 50x,
      Masters 100x). Confirm these against the operator's max-win cap.
- [ ] **Upload** the math package via the Stake Engine dashboard.

## 2. Frontend (web-sdk)

- [ ] **Drop into a web-sdk checkout**: copy `../stake-web-sdk/apps/plug-golf` into
      `apps/plug-golf` of a `StakeEngine/web-sdk` clone; `pnpm install` at root.
- [ ] **Reconcile the integration seams** against the current `apps/lines`
      reference (see `../stake-web-sdk/README.md` §4). The three to check:
  - `GolfScene.svelte` context keys (`eventEmitter`, `onTick`, `playSfx`, `playFx`).
  - `Game.svelte` → `stateBet.playRound({ mode, ctx })` shape, and that **`ctx`
    (aim + swing quality) is threaded into the `bookEventHandlerMap` context** so
    the shot animation is biased (falls back to centre-aim if not).
  - `.ts` import extensions if the shared tsconfig lacks `allowImportingTsExtensions`.
- [ ] **Verify the pure logic** (already green in-repo): `npm run check`,
      `npm run test:engine`, `node --experimental-strip-types test/preShot.test.ts`.
- [ ] **Storybook pass**: `pnpm run storybook --filter=plug-golf` — play every
      tier's fixture book and confirm the animation + celebration render.
- [ ] **Build**: `pnpm run build --filter=plug-golf`; **upload** the built frontend.

## 3. Game config & economy

- [ ] **Bet levels**: the client reads `config.betLevels` from `wallet/authenticate`;
      confirm the operator config matches the intended stakes.
- [ ] **Currency / min-max bet / step** per operator.
- [ ] **RTP disclosure**: 96.50% (all modes) surfaced in the game's info/rules
      screen as the jurisdiction requires.

## 4. Compliance review (per market — confirm with Stake/legal)

- [ ] **Skill presentation**: the aim + power meter are cosmetic and must be
      disclosed as *not affecting the outcome* in the rules screen (standard for
      this genre; wording matters). The outcome is drawn server-side at release.
- [ ] **Engineered near-miss flag**: the "roll past the lip" flourish on some
      low/losing tiers is restricted in some regulated markets — keep it behind a
      per-market config flag before certifying there.
- [ ] **Max-win statement** and **RTP** per market.
- [ ] **Provably-fair** (if targeting that surface): the outcome-first design takes
      a server seed + client seed + nonce cleanly; slot in at the RGS draw.

## 5. Store / operator assets

- [ ] Game **name**, **description**, **category/tags**.
- [ ] **Tile / thumbnail** art and any promo art (see `../assets/PROMPTS.md` for the
      art slots and specs; art is cosmetic and never encodes outcome).
- [ ] Max-win and RTP shown on the store card per requirements.

## 6. Acceptance (ACP)

- [ ] Submit for Stake's **Acceptance Criteria Process**; expect checks on RTP
      integrity, book/lookup consistency, max win, responsible-gaming text, and
      that the client settles strictly from the RGS book.
- [ ] Address feedback, re-upload, re-verify RTP, resubmit.

---

### Local end-to-end sanity before uploading

`node stake-engine/mock-rgs.mjs` serves the *generated* math package through the
real RGS endpoints; the prototype adapter (or the web-sdk build pointed at it)
plays against it. The automated harness asserts the rendered outcome equals the
server's drawn book and that balances reconcile after settle — run it after any
math change.

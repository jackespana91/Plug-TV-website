#!/usr/bin/env node
/**
 * generate-math.mjs — emits Plug Golf's math package in Stake Engine's
 * required format (https://stakeengine.github.io/math-sdk/rgs_docs/data_format/).
 *
 * Reads the <script id="paytables"> block from ../index.html (the single
 * source of truth) and writes, per game mode, into ./math/:
 *
 *   books_<mode>.jsonl      one line per distinct outcome:
 *                           {"id":N,"events":[...],"payoutMultiplier":INT}
 *                           payoutMultiplier is an integer ×100 (1150 = 11.5x)
 *   lookUpTable_<mode>.csv  simulationNumber,weight,payoutMultiplier
 *                           (payout column matches the books exactly)
 *   index.json              mode manifest: name, cost, events, weights
 *
 * Plug Golf is a discrete instant-win game, so the full outcome space is
 * enumerable: each paytable row IS one simulation, weighted by its per-10000
 * probability. No Monte Carlo needed — RTP is exact by construction.
 *
 * The events array carries what the client needs to stage the round:
 * the outcome tier (which story timeline to compile) and the win amount.
 *
 * Upload note: Stake Engine expects books compressed as .jsonl.zst.
 * Run `zstd math/books_*.jsonl` before upload if zstd isn't found locally.
 *
 * Usage: node games/plug-golf/stake-engine/generate-math.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, '..', 'index.html'), 'utf8');
const m = html.match(/<script id="paytables"[^>]*>([\s\S]*?)<\/script>/);
if (!m) { console.error('FATAL: paytables block not found'); process.exit(1); }
const cfg = JSON.parse(m[1]);

const outDir = join(here, 'math');
mkdirSync(outDir, { recursive: true });

/* mirror of the client's tier mapping — the animation contract */
function tierFor(mult) {
  if (mult === 0)  return 'lose';
  if (mult <= 0.2) return 'rough';
  if (mult <= 0.5) return 'bunker';
  if (mult <= 0.8) return 'fringe';
  if (mult <= 1)   return 'green';
  if (mult <= 2)   return 'closePutt';
  if (mult <= 5)   return 'tapIn';
  if (mult <= 15)  return 'lipOut';
  return 'holeIn';
}

const modes = [];
let allOk = true;

for (const [key, t] of Object.entries(cfg.clubs)) {
  const mode = key.replace(/([A-Z])/g, '_$1').toLowerCase(); // threeWood -> three_wood
  const books = [];
  const lut = [];
  t.outcomes.forEach(([mult, weight], i) => {
    const id = i + 1;
    const pm = Math.round(mult * 100);               // integer ×100 per spec
    books.push(JSON.stringify({
      id,
      events: [
        { index: 0, type: 'shot', club: key, tier: tierFor(mult), payoutMultiplier: pm },
        { index: 1, type: 'finalWin', amount: pm },
      ],
      payoutMultiplier: pm,
    }));
    lut.push(`${id},${weight},${pm}`);
  });

  writeFileSync(join(outDir, `books_${mode}.jsonl`), books.join('\n') + '\n');
  writeFileSync(join(outDir, `lookUpTable_${mode}.csv`), lut.join('\n') + '\n');
  modes.push({ name: mode, cost: 1.0, events: `books_${mode}.jsonl.zst`, weights: `lookUpTable_${mode}.csv` });

  // verify RTP from the emitted lookup table (integer math, exact)
  const wSum = t.outcomes.reduce((s, [, w]) => s + w, 0);
  const rtpX = t.outcomes.reduce((s, [mult, w]) => s + Math.round(mult * 100) * w, 0); // in (x100 · weight)
  const rtp = rtpX / (100 * wSum);
  const ok = wSum === cfg.weightScale && Math.abs(rtp - cfg.rtpTarget) < 1e-12;
  if (!ok) allOk = false;
  console.log(`${mode.padEnd(14)} rows=${String(t.outcomes.length).padStart(2)}  RTP=${(rtp * 100).toFixed(2)}%  ${ok ? '✓' : '✗'}`);
}

writeFileSync(join(outDir, 'index.json'), JSON.stringify({ modes }, null, 2) + '\n');

// compress books if zstd is available (Stake Engine requires .jsonl.zst on upload)
try {
  execSync('zstd -f -q ' + join(outDir, 'books_*.jsonl'), { shell: '/bin/bash' });
  console.log('books compressed to .jsonl.zst');
} catch {
  console.log('NOTE: zstd not found — run `zstd math/books_*.jsonl` before uploading.');
}

console.log(allOk ? '\nMATH PACKAGE OK — files in stake-engine/math/' : '\nRTP MISMATCH ✗');
process.exit(allOk ? 0 : 1);

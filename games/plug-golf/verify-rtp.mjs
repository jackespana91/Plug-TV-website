#!/usr/bin/env node
/**
 * verify-rtp.mjs — asserts the maths of every Plug Golf paytable.
 *
 * Reads the <script id="paytables"> JSON straight out of index.html (the
 * single source of truth the game itself plays from) and checks, for every
 * club/mode:
 *   1. weights sum exactly to weightScale (a complete probability space)
 *   2. RTP equals rtpTarget exactly
 * and prints hit rate, win rate, max multiplier and volatility (std dev).
 *
 * Usage:  node games/plug-golf/verify-rtp.mjs
 * Exit code 0 = all tables pass; 1 = any table off-target.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'index.html'), 'utf8');
const m = html.match(/<script id="paytables"[^>]*>([\s\S]*?)<\/script>/);
if (!m) { console.error('FATAL: paytables block not found in index.html'); process.exit(1); }

const cfg = JSON.parse(m[1]);
const scale = cfg.weightScale;
let ok = true;

const rows = [];
for (const [key, t] of Object.entries(cfg.clubs)) {
  const wSum = t.outcomes.reduce((s, [, w]) => s + w, 0);
  const rtp  = t.outcomes.reduce((s, [mult, w]) => s + mult * w, 0) / scale;
  const hit  = t.outcomes.filter(([mult]) => mult > 0).reduce((s, [, w]) => s + w, 0) / scale;
  const win  = t.outcomes.filter(([mult]) => mult >= 1).reduce((s, [, w]) => s + w, 0) / scale;
  const max  = Math.max(...t.outcomes.map(([mult]) => mult));
  const ev2  = t.outcomes.reduce((s, [mult, w]) => s + mult * mult * w, 0) / scale;
  const sd   = Math.sqrt(ev2 - rtp * rtp);

  const wOk   = wSum === scale;
  const rtpOk = Math.abs(rtp - cfg.rtpTarget) < 1e-12;
  if (!wOk || !rtpOk) ok = false;

  rows.push({
    mode: t.label,
    'RTP %': (rtp * 100).toFixed(2) + (rtpOk ? '' : '  ✗ target ' + cfg.rtpTarget * 100),
    'hit %': (hit * 100).toFixed(2),
    'win ≥1x %': (win * 100).toFixed(2),
    'max': max + 'x',
    'std dev': sd.toFixed(2),
    'weights': wSum + (wOk ? '' : '  ✗ expected ' + scale),
  });
}

console.log(`Plug Golf paytable verification — target RTP ${cfg.rtpTarget * 100}%\n`);
console.table(rows);
console.log(ok ? '\nALL TABLES PASS ✓' : '\nFAILURES FOUND ✗');
process.exit(ok ? 0 : 1);

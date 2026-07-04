#!/usr/bin/env node
/**
 * mock-rgs.mjs — minimal local stand-in for the Stake Engine RGS, for
 * end-to-end testing of the game client's RGS adapter.
 *
 * Serves the real math package from ./math/ (index.json + lookup tables +
 * books): wallet/play draws a simulation weighted by the lookup table and
 * returns that book's events + payoutMultiplier, exactly like the real RGS.
 * Balance is in-memory, amounts in micro-units (1_000_000 = 1.00).
 *
 * Usage:
 *   node games/plug-golf/stake-engine/generate-math.mjs   # build math first
 *   node games/plug-golf/stake-engine/mock-rgs.mjs [port]  # default 8791
 * then open the game with:
 *   index.html?sessionID=test&rgs_url=http://127.0.0.1:8791
 */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const mathDir = join(here, 'math');
const index = JSON.parse(readFileSync(join(mathDir, 'index.json'), 'utf8'));

const modes = {};
for (const m of index.modes) {
  const lut = readFileSync(join(mathDir, m.weights), 'utf8').trim().split('\n')
    .map(l => l.split(',').map(Number));                      // [id, weight, payout]
  const books = {};
  readFileSync(join(mathDir, m.events.replace(/\.zst$/, '')), 'utf8').trim().split('\n')
    .forEach(l => { const b = JSON.parse(l); books[b.id] = b; });
  modes[m.name] = { lut, books, total: lut.reduce((s, r) => s + r[1], 0) };
}

const state = { balance: 1000 * 1e6, currency: 'USD', pendingWin: 0, lastRound: null };
const CONFIG = {
  minBet: 100000, maxBet: 10000000, stepBet: 100000,
  betLevels: [500000, 1000000, 2000000, 5000000, 10000000],
  jurisdiction: { socialCasino: false },
};
const bal = () => ({ amount: state.balance, currency: state.currency });

function play(body) {
  const mode = modes[body.mode];
  if (!mode) return { error: 'unknown mode ' + body.mode };
  const amount = Number(body.amount);
  if (!(amount > 0) || amount > state.balance) return { error: 'invalid amount' };
  state.balance -= amount;
  let r = Math.random() * mode.total;
  let row = mode.lut[mode.lut.length - 1];
  for (const cand of mode.lut) { if ((r -= cand[1]) < 0) { row = cand; break; } }
  const book = mode.books[row[0]];
  state.pendingWin = Math.round(amount * row[2] / 100);
  state.lastRound = { id: book.id, mode: body.mode, payoutMultiplier: book.payoutMultiplier, events: book.events };
  return { balance: bal(), round: state.lastRound };
}

const routes = {
  '/wallet/authenticate': () => ({ balance: bal(), config: CONFIG, round: state.lastRound }),
  '/wallet/balance':      () => ({ balance: bal() }),
  '/wallet/play':         play,
  '/wallet/end-round':    () => { state.balance += state.pendingWin; state.pendingWin = 0; return { balance: bal() }; },
  '/bet/event':           b => ({ event: b.event }),
  '/__debug':             () => ({ ...state }),               // test hook, not part of the RGS spec
};

const port = Number(process.argv[2]) || 8791;
createServer((req, res) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json',
  };
  if (req.method === 'OPTIONS') { res.writeHead(204, headers); return res.end(); }
  let raw = '';
  req.on('data', c => raw += c);
  req.on('end', () => {
    const fn = routes[new URL(req.url, 'http://x').pathname];
    if (!fn) { res.writeHead(404, headers); return res.end('{"error":"not found"}'); }
    let body = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch {}
    const out = fn(body);
    res.writeHead(out.error ? 400 : 200, headers);
    res.end(JSON.stringify(out));
  });
}).listen(port, () => console.log(`mock RGS on http://127.0.0.1:${port} — modes: ${Object.keys(modes).join(', ')}`));

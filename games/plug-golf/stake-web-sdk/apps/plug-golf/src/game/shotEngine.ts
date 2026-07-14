/**
 * shotEngine — the heart of Plug Golf, ported out of the canvas prototype into
 * a pure, renderer-agnostic module.
 *
 * Given the outcome the RGS drew ({ tier, mult }) plus cosmetic context (the
 * player's aim, swing quality, wind, club), it compiles a declarative Timeline:
 * an ordered list of motion segments (flight, bounce, roll, lip, drop, pause)
 * each carrying presentation cues (caption, sfx, fx, camera cut, vignette).
 *
 * The story is generated *backwards from the drawn outcome* and biased toward
 * the player's aim, so it always reads as "I almost had it" — exactly as in the
 * prototype, but with zero DOM/Pixi/audio dependencies. The Pixi layer walks
 * the timeline; the tests assert its shape. Randomness flows through a seeded
 * Rng so a given book id always renders identically (reproducible replays).
 */
import { GREEN as GC, TEE, RADII as R, BUNKERS, FLIGHT } from './config.ts';
import type { ClubKey, Tier } from './config.ts';
import { type Vec, lerp, dist, angTo, polar } from './geometry.ts';
import { type Rng, range, spread, pick } from './rng.ts';

export type CueWhen = 'start' | 'end';
export type Cue =
  | { at: CueWhen; kind: 'caption'; text: string; style: 'pop' | 'small' | 'hold'; gold?: boolean }
  | { at: CueWhen; kind: 'sfx'; id: SfxId }
  | { at: CueWhen; kind: 'fx'; id: 'splash' | 'confetti' | 'fireworks'; big?: boolean }
  | { at: CueWhen; kind: 'camera'; mode: 'tee' | 'track' | 'land' | 'wide' }
  | { at: CueWhen; kind: 'vignette'; on: boolean };

/** Sound palette (IDs the component's playSfx maps to synthesised voices; the
 *  canvas prototype in games/plug-golf/index.html is the reference synth).
 *  'swing' fires on release and 'stinger' on the win celebration — both outside
 *  the timeline — but are part of the same palette. */
export type SfxId =
  | 'swing' | 'hit' | 'bounce' | 'splash' | 'crowdOoh' | 'crowdWin' | 'drop' | 'lip' | 'fanfare' | 'stinger';

export type Segment =
  | { type: 'flight'; from: Vec; to: Vec; height: number; dur: number; curve: number; cues: Cue[] }
  | { type: 'bounce'; from: Vec; to: Vec; height: number; dur: number; slow: number; cues: Cue[] }
  | { type: 'roll'; from: Vec; to: Vec; dur: number; slow: number; cues: Cue[] }
  | { type: 'lip'; center: Vec; startAngle: number; turns: number; r0: number; r1: number; dur: number; slow: number; cues: Cue[] }
  | { type: 'drop'; from: Vec; center: Vec; dur: number; slow: number; cues: Cue[] }
  | { type: 'pause'; at: Vec; dur: number; slow: number; cues: Cue[] };

export type Timeline = {
  tier: Tier;
  mult: number;
  segments: Segment[];
  rest: Vec; // final resting spot (or splash point)
  distanceM: number | null; // reported closest-to-pin distance; null = out of play
  ballOutAtEnd: boolean; // true when the ball is in the hole / in the water
};

export type ShotContext = {
  club: ClubKey;
  aim: Vec; // player's chosen target (cosmetic)
  quality: number; // 0..1 swing timing (cosmetic; tightens scatter only)
  wind: { dir: number; spd: number };
  rng: Rng;
};

/* ---- small builders keep the segment list readable, mirroring the prototype ---- */
const cue = (c: Cue): Cue => c;
function flight(from: Vec, to: Vec, height: number, dur: number, curve: number, cues: Cue[] = []): Segment {
  return { type: 'flight', from, to, height, dur, curve, cues };
}
function bounce(from: Vec, to: Vec, height: number, dur: number, cues: Cue[] = [], slow = 1): Segment {
  return { type: 'bounce', from, to, height, dur, slow, cues: [cue({ at: 'start', kind: 'sfx', id: 'bounce' }), ...cues] };
}
function roll(from: Vec, to: Vec, dur: number, cues: Cue[] = [], slow = 1): Segment {
  return { type: 'roll', from, to, dur, slow, cues };
}
function pause(at: Vec, dur: number, cues: Cue[] = [], slow = 1): Segment {
  return { type: 'pause', at, dur, slow, cues };
}

/** Where the ball finally rests, biased toward the aim direction. */
function restPoint(tier: Tier, ctx: ShotContext): Vec {
  const { aim, quality, rng } = ctx;
  const aimA = angTo(GC, aim.x === GC.x && aim.y === GC.y ? { x: GC.x, y: GC.y + 1 } : aim);
  const jit = spread(rng, 1) * Math.PI * (0.9 - 0.5 * quality);
  const a = aimA + jit;
  switch (tier) {
    case 'green': return polar(GC, range(rng, 32, 47), a);
    case 'closePutt': return polar(GC, range(rng, 15, 23), a);
    case 'tapIn': return polar(GC, range(rng, 9, 13), a);
    case 'lipOut': return polar(GC, range(rng, 8.5, 10.5), a);
    case 'holeIn': return { x: GC.x, y: GC.y };
    case 'fringe': return polar(GC, range(rng, R.green - 4, R.collar), a); // on the collar
    case 'rough': return polar(GC, range(rng, R.collar, R.island - 6), a); // island rough, short of water
    case 'bunker': {
      const b = dist(aim, BUNKERS[0]) < dist(aim, BUNKERS[1]) ? BUNKERS[0] : BUNKERS[1];
      return { x: b.x + spread(rng, b.rx * 0.5), y: b.y + spread(rng, b.ry * 0.5) };
    }
    default:
      return { x: GC.x, y: GC.y };
  }
}

/** Reported "closest to the pin" distance — flavour text per tier. */
function reportDist(tier: Tier, rng: Rng): number | null {
  switch (tier) {
    case 'holeIn': return 0;
    case 'lipOut': return range(rng, 0.2, 0.4);
    case 'tapIn': return range(rng, 0.8, 1.2);
    case 'closePutt': return range(rng, 1.7, 2.4);
    case 'green': return range(rng, 3.5, 5.2);
    case 'fringe': return range(rng, 6, 8.5);
    case 'bunker': return range(rng, 9, 12);
    case 'rough': return range(rng, 14, 19);
    default: return null;
  }
}

/**
 * Compile the full shot timeline. Pure: same inputs (incl. seeded rng) always
 * produce the same output.
 */
export function buildShotTimeline(outcome: { tier: Tier; mult: number }, ctx: ShotContext): Timeline {
  const { tier, mult } = outcome;
  const F = FLIGHT[ctx.club];
  const rng = ctx.rng;
  const from = { ...TEE };
  // wind bend — a PURE strike (high quality) flies truer; cosmetic, RNG already decided
  const windCurve = Math.cos(ctx.wind.dir) * ctx.wind.spd * 2.2 * (1 - ctx.quality * 0.5);
  const segments: Segment[] = [];
  let rest = restPoint(tier, ctx);
  let ballOutAtEnd = false;
  const distanceM = reportDist(tier, rng);

  if (tier === 'lose') {
    // island green: every miss is water. Three ways to find it.
    const aimA = angTo(GC, ctx.aim.x === GC.x && ctx.aim.y === GC.y ? { x: GC.x, y: GC.y + 1 } : ctx.aim);
    const variant = pick(rng, ['short', 'long', 'side'] as const);
    let splash: Vec;
    let cap: string;
    if (variant === 'short') {
      splash = { x: GC.x + spread(rng, 40), y: GC.y + R.island + range(rng, 30, 100) };
      cap = 'Came up short!';
    } else if (variant === 'long') {
      splash = { x: GC.x + spread(rng, 46), y: GC.y - R.island - range(rng, 16, 62) };
      cap = 'GUST! 💨';
    } else {
      const side = rng() < 0.5 ? 1 : -1;
      splash = polar(GC, R.island + range(rng, 10, 36), aimA + side * range(rng, 0.5, 1.0));
      cap = 'Off the bank…';
    }
    const land = { x: lerp(from.x, splash.x, 0.62), y: lerp(from.y, splash.y, 0.6) };
    segments.push(flight(from, land, F.h, F.dur * 0.6, windCurve, [cue({ at: 'end', kind: 'caption', text: cap, style: 'small' })]));
    segments.push(flight(land, splash, F.h * 0.4, F.dur * 0.5, windCurve * 0.5, [
      cue({ at: 'end', kind: 'fx', id: 'splash' }),
      cue({ at: 'end', kind: 'sfx', id: 'splash' }),
      cue({ at: 'end', kind: 'camera', mode: 'land' }),
      cue({ at: 'end', kind: 'caption', text: 'SPLASH!', style: 'pop' }),
    ]));
    segments.push(pause(splash, 1.1, [cue({ at: 'start', kind: 'sfx', id: 'crowdOoh' })]));
    rest = splash;
    ballOutAtEnd = true;
    return { tier, mult, segments, rest, distanceM, ballOutAtEnd };
  }

  if (tier === 'bunker') {
    const land = polar(GC, R.collar - 4, angTo(GC, rest));
    segments.push(flight(from, land, F.h, F.dur, windCurve, [cue({ at: 'end', kind: 'caption', text: 'Big bounce!', style: 'small' })]));
    segments.push(bounce(land, rest, 46, 0.55, [
      cue({ at: 'end', kind: 'sfx', id: 'crowdOoh' }),
      cue({ at: 'end', kind: 'caption', text: 'Ooooh! Bunker.', style: 'pop' }),
    ]));
    segments.push(pause(rest, 0.8));
    return { tier, mult, segments, rest, distanceM, ballOutAtEnd };
  }

  if (tier === 'rough' || tier === 'fringe') {
    const short = { x: lerp(from.x, rest.x, 0.9), y: lerp(from.y, rest.y, 0.9) + 8 };
    segments.push(flight(from, short, F.h, F.dur, windCurve));
    const mid = { x: lerp(short.x, rest.x, 0.6), y: lerp(short.y, rest.y, 0.6) };
    segments.push(bounce(short, mid, 16, 0.3));
    segments.push(roll(mid, rest, 0.7, [
      cue({ at: 'end', kind: 'caption', text: tier === 'rough' ? 'Into the thick stuff.' : 'Caught the fringe.', style: 'small' }),
    ]));
    segments.push(pause(rest, 0.7));
    return { tier, mult, segments, rest, distanceM, ballOutAtEnd };
  }

  if (tier === 'green' || tier === 'closePutt') {
    const land = { x: lerp(GC.x, rest.x, 0.4) + spread(rng, 5), y: lerp(GC.y, rest.y, 0.4) + 12 };
    segments.push(flight(from, land, F.h, F.dur, windCurve));
    let p = land;
    for (let i = 0; i < Math.min(F.b, 2); i++) {
      const nx = { x: lerp(p.x, rest.x, 0.5), y: lerp(p.y, rest.y, 0.5) };
      segments.push(bounce(p, nx, 14 - 6 * i, 0.28));
      p = nx;
    }
    // engineered near-miss: sometimes roll right past the lip before settling
    if (tier === 'closePutt' || rng() < 0.35) {
      const near = polar(GC, R.hole + 4, angTo(rest, GC) + 0.5);
      segments.push(roll(p, near, 0.65, [cue({ at: 'start', kind: 'sfx', id: 'crowdOoh' })], 0.55));
      segments.push(roll(near, rest, 0.8, [
        cue({ at: 'end', kind: 'caption', text: tier === 'closePutt' ? 'Inches away! Birdie putt.' : 'Almost… safe on the green.', style: 'small' }),
      ], 0.6));
    } else {
      segments.push(roll(p, rest, 0.75, [cue({ at: 'end', kind: 'caption', text: 'On the dance floor.', style: 'small' })]));
    }
    segments.push(pause(rest, 0.7, tier === 'closePutt' ? [cue({ at: 'start', kind: 'sfx', id: 'crowdWin' })] : []));
    return { tier, mult, segments, rest, distanceM, ballOutAtEnd };
  }

  if (tier === 'tapIn') {
    const past = polar(GC, 26, angTo(GC, rest));
    const p20 = polar(GC, 20, angTo(GC, rest));
    segments.push(flight(from, past, F.h * 1.05, F.dur, windCurve, [cue({ at: 'end', kind: 'caption', text: 'BIG spin…', style: 'small' })]));
    segments.push(bounce(past, p20, 10, 0.25));
    segments.push(roll(p20, rest, 1.0, [
      cue({ at: 'start', kind: 'sfx', id: 'crowdOoh' }),
      cue({ at: 'end', kind: 'caption', text: 'TAP-IN BIRDIE!', style: 'pop' }),
      cue({ at: 'end', kind: 'sfx', id: 'crowdWin' }),
    ], 0.55));
    segments.push(pause(rest, 0.9));
    return { tier, mult, segments, rest, distanceM, ballOutAtEnd };
  }

  if (tier === 'lipOut') {
    const land = polar(GC, 34, angTo(GC, rest) + 0.3);
    const p22 = polar(GC, 22, angTo(GC, rest));
    const lipIn = polar(GC, R.hole + 1.5, angTo(GC, rest));
    segments.push(flight(from, land, F.h * 1.08, F.dur, windCurve, [cue({ at: 'end', kind: 'caption', text: 'Backspin…', style: 'small' })]));
    segments.push(bounce(land, p22, 9, 0.24));
    segments.push(roll(p22, lipIn, 0.9, [
      cue({ at: 'start', kind: 'vignette', on: true }),
      cue({ at: 'start', kind: 'sfx', id: 'crowdOoh' }),
    ], 0.45));
    segments.push({ type: 'lip', center: GC, startAngle: angTo(GC, lipIn), turns: 0.8, r0: R.hole + 1.5, r1: R.hole + 2.5, dur: 0.8, slow: 0.4, cues: [] });
    segments.push(roll(polar(GC, R.hole + 2.5, angTo(GC, lipIn) + 0.8 * 2 * Math.PI), rest, 0.55, [
      cue({ at: 'end', kind: 'vignette', on: false }),
      cue({ at: 'end', kind: 'caption', text: 'LIPPED OUT!!', style: 'hold' }),
      cue({ at: 'end', kind: 'sfx', id: 'crowdWin' }),
      cue({ at: 'end', kind: 'fx', id: 'confetti' }),
    ], 0.5));
    segments.push(pause(rest, 1.2));
    return { tier, mult, segments, rest, distanceM, ballOutAtEnd };
  }

  // holeIn — 25x / 50x / 100x: the shareable moment
  const mega = mult >= 50;
  const aimA = angTo(GC, ctx.aim);
  const land = polar(GC, 30, aimA + 0.2);
  const p18 = polar(GC, 18, aimA + 0.1);
  const lipIn = polar(GC, R.hole + 1.2, aimA);
  segments.push(flight(from, land, F.h * 1.1, F.dur, windCurve * 0.4, [
    cue({ at: 'start', kind: 'caption', text: 'Wind dies…', style: 'small' }),
    cue({ at: 'end', kind: 'vignette', on: true }),
  ]));
  segments.push(bounce(land, p18, 8, 0.25, [], 0.7));
  segments.push(roll(p18, lipIn, 1.1, [cue({ at: 'start', kind: 'sfx', id: 'crowdOoh' })], mega ? 0.3 : 0.42));
  segments.push({ type: 'lip', center: GC, startAngle: aimA, turns: mega ? 1.6 : 1.1, r0: R.hole + 1.2, r1: R.hole - 1.5, dur: mega ? 1.5 : 1.0, slow: mega ? 0.35 : 0.45, cues: [] });
  segments.push({
    type: 'drop', from: polar(GC, R.hole - 1.5, aimA + (mega ? 1.6 : 1.1) * 2 * Math.PI), center: GC, dur: 0.38, slow: 1,
    cues: [
      cue({ at: 'start', kind: 'sfx', id: 'drop' }),
      cue({ at: 'end', kind: 'vignette', on: false }),
      cue({ at: 'end', kind: 'caption', text: mega ? 'HOOOOLE IN ONE!!!' : 'IT DROPPED!! 🏆', style: 'hold', gold: true }),
      cue({ at: 'end', kind: 'sfx', id: 'crowdWin' }),
      cue({ at: 'end', kind: 'sfx', id: 'fanfare' }),
      cue({ at: 'end', kind: 'fx', id: 'confetti', big: mega }),
      ...(mega ? [cue({ at: 'end', kind: 'fx', id: 'fireworks', big: true })] : []),
    ],
  });
  segments.push(pause(GC, mega ? 2.4 : 1.6));
  ballOutAtEnd = true;
  return { tier, mult, segments, rest, distanceM, ballOutAtEnd };
}

/* ---- sampling: evaluate ball state at real-time t, for renderer + tests ---- */
export type BallState = { x: number; y: number; alt: number; scale: number; on: boolean };

/** Real-time duration of a segment (the `slow` factor stretches wall-clock time). */
export const segDuration = (s: Segment): number => s.dur / ('slow' in s ? s.slow : 1);

export const timelineDuration = (tl: Timeline): number =>
  tl.segments.reduce((sum, s) => sum + segDuration(s), 0);

function sampleSegment(s: Segment, k: number): BallState {
  switch (s.type) {
    case 'flight': {
      const ctrl = { x: (s.from.x + s.to.x) / 2, y: (s.from.y + s.to.y) / 2 };
      const a = angTo(s.from, s.to);
      const c = { x: ctrl.x + Math.cos(a + Math.PI / 2) * s.curve, y: ctrl.y + Math.sin(a + Math.PI / 2) * s.curve };
      const i = 1 - k;
      return { x: i * i * s.from.x + 2 * i * k * c.x + k * k * s.to.x, y: i * i * s.from.y + 2 * i * k * c.y + k * k * s.to.y, alt: Math.sin(Math.PI * k) * s.height, scale: 1, on: true };
    }
    case 'bounce':
      return { x: lerp(s.from.x, s.to.x, k), y: lerp(s.from.y, s.to.y, k), alt: Math.sin(Math.PI * k) * s.height, scale: 1, on: true };
    case 'roll': {
      const e = 1 - Math.pow(1 - k, 3);
      return { x: lerp(s.from.x, s.to.x, e), y: lerp(s.from.y, s.to.y, e), alt: 0, scale: 1, on: true };
    }
    case 'lip': {
      const a = s.startAngle + s.turns * 2 * Math.PI * k;
      const r = lerp(s.r0, s.r1, k);
      return { x: s.center.x + Math.cos(a) * r, y: s.center.y + Math.sin(a) * r, alt: 0, scale: 1, on: true };
    }
    case 'drop':
      return { x: lerp(s.from.x, s.center.x, k * 0.4), y: lerp(s.from.y, s.center.y, k * 0.4), alt: 0, scale: 1 - k * 0.9, on: k < 1 };
    case 'pause':
      return { x: s.at.x, y: s.at.y, alt: 0, scale: 1, on: true };
  }
}

/** Ball state at wall-clock time `t` seconds into the timeline. */
export function sampleTimeline(tl: Timeline, t: number): BallState {
  let acc = 0;
  for (const s of tl.segments) {
    const d = segDuration(s);
    if (t < acc + d || s === tl.segments[tl.segments.length - 1]) {
      const k = Math.max(0, Math.min(1, d > 0 ? (t - acc) / d : 1));
      return sampleSegment(s, k);
    }
    acc += d;
  }
  return sampleSegment(tl.segments[tl.segments.length - 1], 1);
}

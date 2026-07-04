/**
 * Headless tests for the pure shot engine. No browser, no Pixi — runs under
 *   node --experimental-strip-types shotEngine.test.ts
 * (Node 22+). Asserts the compiled timelines are well-formed and faithful to
 * the prototype's behaviour for every tier and club.
 */
import { buildShotTimeline, sampleTimeline, timelineDuration } from '../src/game/shotEngine.ts';
import { CLUBS, TEE, GREEN, RADII, tierFor, type Tier, type ClubKey } from '../src/game/config.ts';
import { mulberry32 } from '../src/game/rng.ts';
import { dist } from '../src/game/geometry.ts';
import { CHARACTERS, DEFAULT_CHARACTER, characterById } from '../src/game/characters.ts';

let failures = 0;
const ok = (cond: boolean, msg: string) => { if (!cond) { console.error('  ✗ ' + msg); failures++; } };

const TIERS: { tier: Tier; mult: number }[] = [
  { tier: 'lose', mult: 0 }, { tier: 'rough', mult: 0.2 }, { tier: 'bunker', mult: 0.5 },
  { tier: 'fringe', mult: 0.8 }, { tier: 'green', mult: 1 }, { tier: 'closePutt', mult: 2 },
  { tier: 'tapIn', mult: 5 }, { tier: 'lipOut', mult: 10 }, { tier: 'holeIn', mult: 25 },
  { tier: 'holeIn', mult: 50 }, { tier: 'holeIn', mult: 100 },
];
const VALID_CUE = new Set(['caption', 'sfx', 'fx', 'camera', 'vignette']);

function makeCtx(seed: number, club: ClubKey) {
  return { club, aim: { x: GREEN.x + 8, y: GREEN.y - 6 }, quality: 0.8, wind: { dir: 1.2, spd: 3.4 }, rng: mulberry32(seed) };
}

console.log('shotEngine: building timelines for every tier x club\n');

for (const club of CLUBS) {
  for (const { tier, mult } of TIERS) {
    const tl = buildShotTimeline({ tier, mult }, makeCtx(12345, club));
    const label = `${club}/${tier}${mult >= 50 ? '(mega ' + mult + 'x)' : ''}`;

    // structural
    ok(tl.segments.length > 0, `${label}: has segments`);
    ok(tl.segments[0].type === 'flight', `${label}: opens with a flight`);
    const first = tl.segments[0];
    if (first.type === 'flight') ok(first.from.x === TEE.x && first.from.y === TEE.y, `${label}: flight starts at the tee`);

    // round length in a believable broadcast window
    const dur = timelineDuration(tl);
    ok(dur >= 2.5 && dur <= 15.5, `${label}: duration ${dur.toFixed(1)}s in 2.5–15.5s (got ${dur.toFixed(2)})`);

    // sampling: t=0 at the tee, no NaNs across the whole timeline
    const s0 = sampleTimeline(tl, 0);
    ok(Math.abs(s0.x - TEE.x) < 1 && Math.abs(s0.y - TEE.y) < 1, `${label}: sample(0) at tee`);
    let clean = true;
    for (let t = 0; t <= dur; t += dur / 60) {
      const s = sampleTimeline(tl, t);
      if (!Number.isFinite(s.x) || !Number.isFinite(s.y) || !Number.isFinite(s.alt)) clean = false;
    }
    ok(clean, `${label}: no NaN/Inf in sampled positions`);

    // cue validity
    for (const seg of tl.segments) for (const c of seg.cues) {
      ok(VALID_CUE.has(c.kind), `${label}: cue kind '${c.kind}' valid`);
      ok(c.at === 'start' || c.at === 'end', `${label}: cue timing valid`);
    }

    // tier-specific truths
    if (tier === 'holeIn') {
      ok(tl.ballOutAtEnd, `${label}: hole-in-one ends with ball in the cup`);
      ok(dist(tl.rest, GREEN) < 1, `${label}: rest is the pin`);
      ok(tl.distanceM === 0, `${label}: distance reads 0m (in the hole)`);
      ok(tl.segments.some((s) => s.type === 'drop'), `${label}: has a drop segment`);
      ok(tl.segments.some((s) => s.type === 'lip'), `${label}: has a lip segment`);
    }
    if (tier === 'lipOut') {
      ok(!tl.ballOutAtEnd, `${label}: lip-out keeps the ball OUT`);
      ok(dist(tl.rest, GREEN) > RADII.hole, `${label}: rest is outside the cup`);
      ok(tl.distanceM !== null && tl.distanceM < 0.5, `${label}: finishes < 0.5m from pin`);
    }
    if (tier === 'lose') {
      ok(tl.distanceM === null, `${label}: out of play (no distance)`);
    }
    if (tier === 'green' || tier === 'closePutt') {
      ok(tl.distanceM !== null && tl.distanceM > 1 && tl.distanceM < 6, `${label}: green distance sane`);
    }
  }
}

// determinism: identical seed -> byte-identical timelines (replay-safe)
const a = JSON.stringify(buildShotTimeline({ tier: 'holeIn', mult: 100 }, makeCtx(999, 'driver')));
const b = JSON.stringify(buildShotTimeline({ tier: 'holeIn', mult: 100 }, makeCtx(999, 'driver')));
ok(a === b, 'same seed reproduces an identical timeline (replay-safe)');
// a tier whose resting spot is randomised must vary with the seed
const g1 = JSON.stringify(buildShotTimeline({ tier: 'green', mult: 1 }, makeCtx(999, 'driver')));
const g2 = JSON.stringify(buildShotTimeline({ tier: 'green', mult: 1 }, makeCtx(1000, 'driver')));
ok(g1 !== g2, 'different seed varies a randomised (green) shot');

// mega vs standard hole-in-one differ (slower, more lip turns)
const mega = buildShotTimeline({ tier: 'holeIn', mult: 100 }, makeCtx(7, 'masters'));
const std = buildShotTimeline({ tier: 'holeIn', mult: 25 }, makeCtx(7, 'threeWood'));
ok(timelineDuration(mega) > timelineDuration(std), 'mega hole-in-one runs longer than a 25x');

// the tier mapping matches the math package
ok(tierFor(0) === 'lose' && tierFor(1) === 'green' && tierFor(10) === 'lipOut' && tierFor(100) === 'holeIn', 'tierFor mapping intact');

// character roster is well-formed (cosmetic identity layer)
const ids = new Set(CHARACTERS.map((c) => c.id));
ok(ids.size === CHARACTERS.length, 'character ids are unique');
ok(CHARACTERS.every((c) => /^#[0-9a-f]{6}$/i.test(c.color) && /^#[0-9a-f]{6}$/i.test(c.trail)), 'character colours are valid hex');
ok(CHARACTERS.every((c) => c.name && c.face && c.cel && c.tag), 'every character has name/face/call-out/tag');
const POSES = new Set(['lean', 'cross', 'mic', 'slide', 'crown', 'flex']);
ok(CHARACTERS.every((c) => POSES.has(c.pose) && c.burst), 'every character has a valid celebration pose + burst emoji');
ok(characterById(DEFAULT_CHARACTER).id === DEFAULT_CHARACTER && characterById('nope').id === CHARACTERS[0].id, 'characterById resolves default + fallback');

console.log(failures === 0 ? '\nALL SHOT-ENGINE TESTS PASS ✓' : `\n${failures} ASSERTION(S) FAILED ✗`);
process.exit(failures === 0 ? 0 : 1);

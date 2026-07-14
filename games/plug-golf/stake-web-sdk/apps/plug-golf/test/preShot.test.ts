/**
 * Headless tests for the pure aim/power input model.
 *   node --experimental-strip-types test/preShot.test.ts
 */
import { clampAim, pullFromDrag, nearTee, qualityFromPull, isPure, shouldSwing, defaultAim, PURE_BAND, MIN_PULL } from '../src/game/preShot.ts';
import { GREEN, TEE, RADII } from '../src/game/config.ts';
import { dist } from '../src/game/geometry.ts';

let failures = 0;
const ok = (c: boolean, m: string) => { if (!c) { console.error('  ✗ ' + m); failures++; } };
const approx = (a: number, b: number, e = 1e-9) => Math.abs(a - b) < e;

// clampAim: inside passes through, outside snaps to the aim radius
const inside = { x: GREEN.x + 10, y: GREEN.y + 8 };
ok(clampAim(inside).x === inside.x && clampAim(inside).y === inside.y, 'aim inside radius is unchanged');
const far = { x: GREEN.x + 500, y: GREEN.y };
ok(approx(dist(clampAim(far), GREEN), RADII.aimMax, 1e-6), 'aim outside radius clamps onto the aim radius');
ok(dist(clampAim({ x: GREEN.x + 9999, y: GREEN.y - 9999 }), GREEN) <= RADII.aimMax + 1e-6, 'any far target ends within aim radius');

// pull: clamps to 0..1, scales with drag distance
ok(pullFromDrag(TEE.y) === 0, 'no drag → pull 0');
ok(pullFromDrag(TEE.y - 50) === 0, 'dragging above the tee → pull 0 (clamped)');
ok(pullFromDrag(TEE.y + 65, 130) === 0.5, 'half the range → pull 0.5');
ok(pullFromDrag(TEE.y + 1000) === 1, 'beyond range → pull 1 (clamped)');

// nearTee
ok(nearTee({ x: TEE.x, y: TEE.y }), 'the tee is near the tee');
ok(!nearTee({ x: TEE.x, y: TEE.y - 400 }), 'the green is not near the tee');

// quality: peaks at the pure pull, falls off, never negative
ok(approx(qualityFromPull(0.85), 1), 'quality peaks (=1) at the pure pull 0.85');
ok(qualityFromPull(0.5) < 1 && qualityFromPull(0.5) >= 0, 'quality below peak is in [0,1)');
ok(qualityFromPull(0) === 0 || qualityFromPull(0) > 0, 'quality never throws at 0');
ok(qualityFromPull(1.0) >= 0, 'quality never negative past the peak');
for (let p = 0; p <= 1.0001; p += 0.05) { const q = qualityFromPull(p); ok(q >= 0 && q <= 1, `quality in range at pull ${p.toFixed(2)}`); }

// pure band + swing threshold
ok(isPure(0.85) && isPure(0.75) && !isPure(0.5) && !isPure(1.0), 'pure band matches the green zone');
ok(!shouldSwing(MIN_PULL - 0.01) && shouldSwing(MIN_PULL) && shouldSwing(0.9), 'swing only past the minimum pull');

// default aim sits on the green near the pin
ok(dist(defaultAim(), GREEN) <= RADII.aimMax, 'default aim is a valid on-green target');

// sanity: PURE_BAND ⊂ [0,1]
ok(PURE_BAND.lo >= 0 && PURE_BAND.hi <= 1 && PURE_BAND.lo < PURE_BAND.hi, 'pure band is a valid sub-range');

console.log(failures === 0 ? 'ALL PRESHOT TESTS PASS ✓' : `\n${failures} ASSERTION(S) FAILED ✗`);
process.exit(failures === 0 ? 0 : 1);

/**
 * Static game configuration: course geometry, per-club ball-flight feel, the
 * multiplier->tier mapping, and the mode list. Kept free of any framework or
 * RGS imports so it typechecks and runs standalone (and is shared by both the
 * Pixi renderer and the headless tests).
 *
 * The paytable weights themselves live in the math package
 * (../../../../stake-engine/math) — the frontend never draws outcomes, it only
 * renders the tier the RGS returns, so only the tier thresholds live here.
 */
import type { Vec } from './geometry.ts';

/**
 * Reference play-field (420x760). The hole is an ISLAND GREEN: the putting
 * surface sits on a landmass ringed by a sandy shore, surrounded by water, with
 * two bunkers on the green's edge. Anything off the island is water, so a 0x
 * "lose" reads naturally as a splash.
 */
export const FIELD = { w: 420, h: 760 } as const;
export const GREEN: Vec = { x: 210, y: 214 }; // the pin (island centre)
export const TEE: Vec = { x: 210, y: 690 };
// green: putting surface · collar: fringe ring · island: land edge (then water)
export const RADII = { hole: 7, inner: 26, outer: 50, green: 82, collar: 96, island: 114, aimMax: 50 } as const;
export const BUNKERS = [
  { x: 150, y: 158, rx: 26, ry: 16 },
  { x: 272, y: 262, rx: 28, ry: 17 },
] as const;
export const LAKE = { x: 18, y: 44, w: 384, h: 556, r: 64 } as const; // the water body

export type ClubKey = 'wedge' | 'shortIron' | 'longIron' | 'threeWood' | 'driver' | 'masters';

/** Cosmetic flight profile per club: arc height, hang time, bounce count. */
export const FLIGHT: Record<ClubKey, { h: number; dur: number; b: number }> = {
  wedge: { h: 220, dur: 1.45, b: 1 },
  shortIron: { h: 195, dur: 1.5, b: 2 },
  longIron: { h: 170, dur: 1.55, b: 2 },
  threeWood: { h: 150, dur: 1.6, b: 3 },
  driver: { h: 135, dur: 1.65, b: 3 },
  masters: { h: 150, dur: 1.6, b: 2 },
};

/** Outcome tiers — the animation contract shared with the math package books. */
export type Tier =
  | 'lose'
  | 'rough'
  | 'bunker'
  | 'fringe'
  | 'green'
  | 'closePutt'
  | 'tapIn'
  | 'lipOut'
  | 'holeIn';

/** Multiplier (in x, not x100) -> tier. Mirrors the math package generator. */
export function tierFor(mult: number): Tier {
  if (mult === 0) return 'lose';
  if (mult <= 0.2) return 'rough';
  if (mult <= 0.5) return 'bunker';
  if (mult <= 0.8) return 'fringe';
  if (mult <= 1) return 'green';
  if (mult <= 2) return 'closePutt';
  if (mult <= 5) return 'tapIn';
  if (mult <= 15) return 'lipOut';
  return 'holeIn';
}

/** Client club key -> math-package / RGS mode name (see stake-engine/math/index.json). */
export const MODE_NAME: Record<ClubKey, string> = {
  wedge: 'wedge',
  shortIron: 'short_iron',
  longIron: 'long_iron',
  threeWood: 'three_wood',
  driver: 'driver',
  masters: 'masters',
};

export const CLUBS: ClubKey[] = ['wedge', 'shortIron', 'longIron', 'threeWood', 'driver', 'masters'];

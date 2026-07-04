/**
 * Deterministic PRNG (mulberry32). The shot animation is seeded from the
 * book id so the same server outcome always renders the identical story —
 * essential for reproducible replays and for Storybook fixtures.
 */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function (): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform in [lo, hi). */
export const range = (rng: Rng, lo: number, hi: number): number => lo + rng() * (hi - lo);
/** Symmetric in (-m, m). */
export const spread = (rng: Rng, m: number): number => (rng() * 2 - 1) * m;
/** Pick one of the options. */
export const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];

/**
 * Presentation-stream randomness — math doc §1, §8.
 *
 * This stream dresses the outcome script (hazard skins, house colors, popup
 * jitter). It is deliberately a SEPARATE RNG instance from the outcome
 * stream and nothing drawn here may create, alter, or predict value.
 *
 * PRODUCTION NOTE (§8 compliance rule 3): in this prototype, hazard-escape
 * beats appear on ~half of survived steps but always on the bust step, so a
 * hazard on screen is a weak statistical hint. A certifiable client must
 * equalize hazard-beat frequency between survived and fatal steps so the
 * telegraph carries zero information. Flagged here rather than hidden.
 */
import { cryptoRng, type Rng } from '../engine/index';

export const prng: Rng = cryptoRng();

export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(prng.next() * items.length)];
}

export function chance(p: number): boolean {
  return prng.next() < p;
}

export function range(min: number, max: number): number {
  return min + prng.next() * (max - min);
}

/** Deterministic per-index hash for procedural street decoration. */
export function hash01(i: number, salt = 0): number {
  let x = (i * 374761393 + salt * 668265263) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

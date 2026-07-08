/**
 * Outcome-stream RNG (math doc §1, §10).
 *
 * In production this is a server-side CSPRNG behind a certified boundary.
 * For the prototype we use sfc32 — a small, statistically strong PRNG —
 * seedable for deterministic tests and Monte-Carlo runs, and seeded from
 * crypto entropy for live demo play.
 *
 * The presentation layer must NEVER draw from this stream (§8): the client
 * receives a finished outcome script and dresses it using its own,
 * non-consequential randomness.
 */

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
}

/** sfc32, seeded with four 32-bit words. */
export function sfc32(a: number, b: number, c: number, d: number): Rng {
  return {
    next(): number {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
      const t = (a + b) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      d = (d + 1) | 0;
      const out = (t + d) | 0;
      c = (c + out) | 0;
      return (out >>> 0) / 4294967296;
    },
  };
}

/** Deterministic RNG from a single integer seed (tests, simulation). */
export function seededRng(seed: number): Rng {
  // splitmix32 to expand one seed into four sfc32 words
  let s = seed >>> 0;
  const split = () => {
    s = (s + 0x9e3779b9) | 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
    return (z ^ (z >>> 15)) >>> 0;
  };
  const rng = sfc32(split(), split(), split(), split());
  for (let i = 0; i < 12; i++) rng.next(); // warm up
  return rng;
}

/** Crypto-entropy RNG for live play. */
export function cryptoRng(): Rng {
  const words = new Uint32Array(4);
  globalThis.crypto.getRandomValues(words);
  return sfc32(words[0], words[1], words[2], words[3]);
}

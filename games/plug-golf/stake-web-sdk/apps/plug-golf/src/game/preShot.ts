/**
 * preShot — the pure input model for the aim + power (pull-back) phase, ported
 * out of the canvas prototype. Frame-free and testable: given pointer positions
 * it produces the clamped aim point, the pull amount, and the cosmetic swing
 * quality. NONE of it affects the payout — the RGS has already decided the
 * outcome; aim and quality only bias the animation (see shotEngine's ShotContext)
 * so the shot feels responsive ("I almost had it").
 */
import { GREEN, TEE, RADII } from './config.ts';
import { type Vec, dist, angTo, polar } from './geometry.ts';

/** Clamp a drag target to within the green's aim radius around the pin. */
export function clampAim(target: Vec): Vec {
  const d = dist(target, GREEN);
  return d <= RADII.aimMax ? { ...target } : polar(GREEN, RADII.aimMax, angTo(GREEN, target));
}

/** Pull amount 0..1 from how far below the tee the pointer has dragged. */
export function pullFromDrag(pointerY: number, range = 130): number {
  return Math.max(0, Math.min(1, (pointerY - TEE.y) / range));
}

/** Is a pointer near the tee — i.e. can it start a power pull? */
export function nearTee(p: Vec, radius = 90): boolean {
  return dist(p, TEE) < radius;
}

/**
 * Cosmetic swing quality 0..1 — peaks at the "pure" pull (~0.85). Only tightens
 * the animation's scatter and triggers the PURE STRIKE flourish; never payout.
 */
export function qualityFromPull(pull: number): number {
  return Math.max(0, 1 - Math.abs(pull - 0.85) / 0.35);
}

/** The green "pure" band on the power meter (matches the prototype's fill). */
export const PURE_BAND = { lo: 0.7, hi: 1.0 } as const;
export const isPure = (pull: number): boolean => pull >= PURE_BAND.lo && pull < PURE_BAND.hi;

/** Whether a released pull is enough to actually take the shot. */
export const MIN_PULL = 0.15;
export const shouldSwing = (pull: number): boolean => pull >= MIN_PULL;

/** Default aim: just above the pin, so a fresh round starts centred on the green. */
export const defaultAim = (): Vec => ({ x: GREEN.x, y: GREEN.y - 6 });

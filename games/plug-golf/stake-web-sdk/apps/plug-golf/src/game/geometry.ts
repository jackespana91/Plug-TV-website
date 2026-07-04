/** Pure 2D geometry helpers used by the shot engine. No DOM, no Pixi. */
export type Vec = { x: number; y: number };

export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
export const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);
export const angTo = (a: Vec, b: Vec): number => Math.atan2(b.y - a.y, b.x - a.x);
export const polar = (c: Vec, r: number, a: number): Vec => ({
  x: c.x + Math.cos(a) * r,
  y: c.y + Math.sin(a) * r,
});
export const easeOut = (k: number): number => 1 - Math.pow(1 - k, 3);

/** Point on a quadratic bezier at parameter k. */
export function bezier(from: Vec, ctrl: Vec, to: Vec, k: number): Vec {
  const i = 1 - k;
  return {
    x: i * i * from.x + 2 * i * k * ctrl.x + k * k * to.x,
    y: i * i * from.y + 2 * i * k * ctrl.y + k * k * to.y,
  };
}

/** Control point offset perpendicular to a->b by `curve` at the midpoint. */
export function control(from: Vec, to: Vec, curve: number): Vec {
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const a = angTo(from, to);
  return { x: mid.x + Math.cos(a + Math.PI / 2) * curve, y: mid.y + Math.sin(a + Math.PI / 2) * curve };
}

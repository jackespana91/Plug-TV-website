/**
 * Course drawing helper for the Pixi Graphics pass. Kept as a plain function so
 * the scene component stays declarative. Typed against a minimal GraphicsLike
 * interface (the subset of PixiJS 8's Graphics API used here) so it carries no
 * hard pixi import — the monorepo passes the real Graphics instance.
 */
import type { Vec } from '../game/geometry.ts';

export interface GraphicsLike {
  clear(): GraphicsLike;
  rect(x: number, y: number, w: number, h: number): GraphicsLike;
  circle(x: number, y: number, r: number): GraphicsLike;
  ellipse(x: number, y: number, rx: number, ry: number): GraphicsLike;
  fill(style: number | { color: number; alpha?: number }): GraphicsLike;
  stroke(style: { color: number; width: number; alpha?: number }): GraphicsLike;
  moveTo(x: number, y: number): GraphicsLike;
  lineTo(x: number, y: number): GraphicsLike;
}

type CourseRefs = {
  GREEN: Vec;
  TEE: Vec;
  RADII: { hole: number; inner: number; outer: number; fringe: number; green: number; aimMax: number };
  BUNKERS: readonly { x: number; y: number; rx: number; ry: number }[];
  FIELD: { w: number; h: number };
};

export function drawCourse(g: GraphicsLike, r: CourseRefs): void {
  const { GREEN: GC, TEE, RADII: R, BUNKERS, FIELD } = r;
  g.clear();
  // rough base
  g.rect(0, 0, FIELD.w, FIELD.h).fill(0x1c4a24);
  // water (right side)
  g.rect(300, 40, FIELD.w - 300, 300).fill({ color: 0x1f6fb8, alpha: 0.95 });
  // green + fringe
  g.circle(GC.x, GC.y, R.fringe).fill(0x6ec25e);
  g.circle(GC.x, GC.y, R.green).fill({ color: 0x5fae52, alpha: 0.9 });
  // bunkers
  for (const b of BUNKERS) g.ellipse(b.x, b.y, b.rx, b.ry).fill(0xe8d9a8);
  // scoring rings
  g.circle(GC.x, GC.y, R.outer).fill({ color: 0xff8c28, alpha: 0.28 });
  g.circle(GC.x, GC.y, R.inner).fill({ color: 0xffdc3c, alpha: 0.32 });
  // hole + flag
  g.circle(GC.x, GC.y, R.hole).fill(0x0c2410);
  g.moveTo(GC.x, GC.y).lineTo(GC.x, GC.y - 34).stroke({ color: 0xffffff, width: 2 });
  // tee shadow
  g.ellipse(TEE.x, TEE.y + 4, 40, 16).fill({ color: 0x000000, alpha: 0.18 });
}

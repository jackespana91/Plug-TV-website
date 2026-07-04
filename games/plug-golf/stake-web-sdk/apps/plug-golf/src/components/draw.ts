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
  roundRect(x: number, y: number, w: number, h: number, r: number): GraphicsLike;
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
  RADII: { hole: number; inner: number; outer: number; green: number; collar: number; island: number; aimMax: number };
  BUNKERS: readonly { x: number; y: number; rx: number; ry: number }[];
  LAKE: { x: number; y: number; w: number; h: number; r: number };
  FIELD: { w: number; h: number };
};

/** Island green: mainland → lake → sandy shore → island rough → collar → green. */
export function drawCourse(g: GraphicsLike, r: CourseRefs): void {
  const { GREEN: GC, TEE, RADII: R, BUNKERS, LAKE, FIELD } = r;
  g.clear();
  // mainland grass
  g.rect(0, 0, FIELD.w, FIELD.h).fill(0x245a2b);
  // lake
  g.roundRect(LAKE.x - 6, LAKE.y - 4, LAKE.w + 12, LAKE.h + 8, LAKE.r + 6).fill(0x17568f);
  g.roundRect(LAKE.x, LAKE.y, LAKE.w, LAKE.h, LAKE.r).fill(0x1f6fb8);
  // island: sand rim, rough, collar, putting surface
  g.circle(GC.x, GC.y, R.island).fill(0xd9c188);
  g.circle(GC.x, GC.y, R.island - 7).fill(0x3a8342);
  g.circle(GC.x, GC.y, R.collar).fill(0x54a049);
  g.circle(GC.x, GC.y, R.green).fill(0x74c85f);
  // bunkers on the green edge
  for (const b of BUNKERS) g.ellipse(b.x, b.y, b.rx, b.ry).fill(0xece0b4);
  // scoring rings
  g.circle(GC.x, GC.y, R.outer).fill({ color: 0xff8c28, alpha: 0.28 });
  g.circle(GC.x, GC.y, R.inner).fill({ color: 0xffdc3c, alpha: 0.32 });
  // hole + flag
  g.circle(GC.x, GC.y, R.hole).fill(0x0c2410);
  g.moveTo(GC.x, GC.y).lineTo(GC.x, GC.y - 34).stroke({ color: 0xffffff, width: 2 });
  // tee box on the mainland
  g.ellipse(TEE.x, TEE.y, 52, 24).fill(0x3f8f47);
  g.ellipse(TEE.x, TEE.y + 7, 38, 13).fill({ color: 0x000000, alpha: 0.16 });
}

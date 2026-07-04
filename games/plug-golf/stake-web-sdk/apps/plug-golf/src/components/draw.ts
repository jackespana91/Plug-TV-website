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

/**
 * Island green: mainland → lake → island drop-shadow → shoreline → sandy shore
 * → rough → collar → lit putting surface → dimensional bunkers.
 * Solid-fill approximation of the canvas prototype's lighting (a full Pixi build
 * can swap in FillGradient for the water/green radial gradients + shimmer).
 * Decorative sprites the prototype also draws — margin trees, floating lily pads,
 * shoreline rocks, and the procedural golfer figure — belong in their own Pixi
 * layers/sprites in the full build and are omitted from this base course pass.
 */
export function drawCourse(g: GraphicsLike, r: CourseRefs): void {
  const { GREEN: GC, TEE, RADII: R, BUNKERS, LAKE, FIELD } = r;
  g.clear();
  // mainland grass
  g.rect(0, 0, FIELD.w, FIELD.h).fill(0x245a2b);
  // lake (deep edge + body)
  g.roundRect(LAKE.x - 7, LAKE.y - 5, LAKE.w + 14, LAKE.h + 10, LAKE.r + 7).fill(0x0f4a80);
  g.roundRect(LAKE.x, LAKE.y, LAKE.w, LAKE.h, LAKE.r).fill(0x1f6fb8);
  // island depth: drop shadow on the water, then shoreline foam ring
  g.ellipse(GC.x + 5, GC.y + 11, R.island + 3, R.island - 1).fill({ color: 0x031222, alpha: 0.3 });
  g.circle(GC.x, GC.y, R.island + 2).stroke({ color: 0xffffff, width: 4, alpha: 0.22 });
  // island: sand rim, rough, collar, lit putting surface (lighter inner disc = top light)
  g.circle(GC.x, GC.y, R.island).fill(0xd6bd82);
  g.circle(GC.x, GC.y, R.island - 8).fill(0x357c3e);
  g.circle(GC.x, GC.y, R.collar).fill(0x4f9a45);
  g.circle(GC.x, GC.y, R.green).fill(0x5faf4d);
  g.circle(GC.x - 10, GC.y - 12, R.green * 0.72).fill({ color: 0x8fe271, alpha: 0.55 });
  // bunkers on the green edge, rim shadow + lit sand
  for (const b of BUNKERS) {
    g.ellipse(b.x, b.y + 2, b.rx + 1.5, b.ry + 1.5).fill({ color: 0x6e582a, alpha: 0.45 });
    g.ellipse(b.x, b.y, b.rx, b.ry).fill(0xf1e4c6);
  }
  // scoring rings
  g.circle(GC.x, GC.y, R.outer).fill({ color: 0xff8c28, alpha: 0.28 });
  g.circle(GC.x, GC.y, R.inner).fill({ color: 0xffdc3c, alpha: 0.32 });
  // hole (lit rim) + flag
  g.circle(GC.x, GC.y, R.hole + 1.5).fill({ color: 0xffffff, alpha: 0.5 });
  g.circle(GC.x, GC.y, R.hole).fill(0x0c2410);
  g.moveTo(GC.x, GC.y).lineTo(GC.x, GC.y - 35).stroke({ color: 0xeef3f0, width: 2.2 });
  // tee box on the mainland
  g.ellipse(TEE.x, TEE.y, 52, 24).fill(0x3f8f47);
  g.ellipse(TEE.x, TEE.y + 7, 38, 13).fill({ color: 0x000000, alpha: 0.16 });
}

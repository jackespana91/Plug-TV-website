/**
 * Canvas street renderer — art direction doc §2 (Golden Hour Suburbia) with
 * a retro-arcade homage (GDD/art doc addendum): a tilted, receding
 * vanishing-point road quoting the original 1985 Paperboy cabinet's
 * signature camera, rendered with richer color/lighting and smooth
 * animation rather than literal low-res pixel art. Everything is drawn
 * programmatically: no image assets.
 *
 * The scene is a dumb dramatizer: it renders whatever `World` state the
 * director has set. It contains no game or money logic.
 */
import { hash01 } from './presentation';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export const VIEW_W = 960;
export const VIEW_H = 540;

/* ---------------- perspective camera ----------------
 * A single vanishing point with linear scale-vs-depth falloff, in the
 * tradition of pseudo-3D road games: the road/sidewalk/lawn are trapezoids
 * with their apex at (VP_X, VP_Y), and every world object is projected by
 * `project()` into a screen (x, y, scale) triple. Sprites are then drawn in
 * small local-coordinate shapes and simply scaled via ctx.scale(), so a
 * distant house or hazard is literally the same drawing code, smaller.
 */
const VP_X = VIEW_W / 2;
const VP_Y = 175;
const FOCAL = 260;
const NEAR_Z = 40;

const ROAD_NEAR = 210;
const SIDEWALK_NEAR = 262;
const CURB_NEAR = 275;
const HOUSE_LANE_NEAR = 350;
const HAZARD_LANE_NEAR = 300;
const POLE_LANE_NEAR = 400;
const LAMP_LANE_NEAR = 300;
const PARKED_CAR_NEAR = 240;

/** Ace's fixed screen anchor — left of the road centre; deliveries fan out to the right lane. */
export const RIDER_X = VP_X - 92;
export const GROUND_Y = 462;
/** World units between houses (unchanged from the flat-view build — keeps run pacing identical). */
export const HOUSE_SPACING = 460;
/** World units still ahead of scrollX at the moment of throw (a depth, not a screen pixel). */
export const DELIVER_X = 260;

function depthScale(distAhead: number): number {
  const z = Math.max(distAhead + NEAR_Z, 12);
  return FOCAL / (FOCAL + z);
}
function projY(scale: number): number {
  return VP_Y + (VIEW_H - VP_Y) * scale;
}
function projX(scale: number, lane: number, nearHalf: number): number {
  return VP_X + lane * nearHalf * scale;
}

const _deliverScale = depthScale(DELIVER_X);
/** Screen point where a thrown paper lands — the delivery-lane house's porch, at throw time. */
export const DELIVER_POINT = {
  x: projX(_deliverScale, 1, HOUSE_LANE_NEAR),
  y: projY(_deliverScale) - 90 * _deliverScale,
};

export type RiderPose = 'idle' | 'ride' | 'throw' | 'wheelie' | 'tuck' | 'skid' | 'tumble';
export type HazardKind = 'dog' | 'car' | 'skateboard' | 'sprinkler' | 'trash';
export type HazardPhase = 'telegraph' | 'threat' | 'escaped' | 'fatal' | 'gone';

export interface Hazard {
  kind: HazardKind;
  phase: HazardPhase;
  /** 0..1 progress within the current phase (director-driven). */
  t: number;
  /** World x the hazard is anchored to. */
  worldX: number;
}

export interface Popup {
  text: string;
  x: number;
  y: number;
  age: number;
  life: number;
  size: number;
  color: string;
  /** Rises if true. */
  float: boolean;
}

type ParticleShape = 'rect' | 'glow' | 'ring' | 'star';
interface Particle {
  x: number; y: number; vx: number; vy: number;
  age: number; life: number; size: number; color: string; gravity: number;
  shape: ParticleShape; spin: number;
}

export interface World {
  scrollX: number;
  /** px/s — the director sets this; the scene only reads it for wheel spin. */
  speed: number;
  pose: RiderPose;
  poseT: number;
  bob: number;
  hazard: Hazard | null;
  multiplier: number | null;
  /** 0..1 vignette strength (near-miss slow-mo). */
  vignette: number;
  /** Camera zoom, 1 = neutral. */
  zoom: number;
  /** Screen-shake energy, decays in Director.update. */
  shake: number;
  paperArc: { t: number; targetX: number; targetY: number; golden: boolean } | null;
  popups: Popup[];
  /** House index the player committed to before the run (the flag), or null. */
  targetHouse: number | null;
}

export function newWorld(): World {
  return {
    scrollX: 0, speed: 0, pose: 'idle', poseT: 0, bob: 0,
    hazard: null, multiplier: null, vignette: 0, zoom: 1, shake: 0,
    paperArc: null, popups: [], targetHouse: null,
  };
}

/* palette — art doc §2.1 */
const SIDINGS = ['#E8D5B5', '#B7CADB', '#D89A8E', '#CBBBE0', '#BFD8BE', '#E4C9A4'];
const SIDING_DARK = ['#CDB68F', '#93AAC2', '#BD7A6E', '#AC98C8', '#9FBE9E', '#C8A87E'];
const ROOFS = ['#7A5C50', '#5C5470', '#8A6A55', '#6E5A66'];
const DOORS = ['#7A5C50', '#5C4A6E', '#9E4B3E', '#3E5A6E'];
const VIOLET = (a: number) => `rgba(74,60,110,${a})`;

const LANE_ACE = -0.22;
const HAZARD_START_LANE: Record<HazardKind, number> = {
  dog: -0.95,
  car: 0.05,
  skateboard: 0.55,
  sprinkler: -0.65,
  trash: -0.75,
};

interface Firefly { wx: number; y: number; phase: number; }

export class Scene {
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private wheelAngle = 0;
  private t = 0;
  private noise: HTMLCanvasElement;
  private fireflies: Firefly[] = [];

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    this.ctx = canvas.getContext('2d')!;
    // pre-rendered asphalt noise tile
    this.noise = document.createElement('canvas');
    this.noise.width = 256;
    this.noise.height = 256;
    const ng = this.noise.getContext('2d')!;
    for (let i = 0; i < 2600; i++) {
      ng.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.06)';
      ng.fillRect(Math.random() * 256, Math.random() * 256, 1.6, 1.2);
    }
  }

  burst(x: number, y: number, colors: string[], count: number, speed = 220, gravity = 500): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.6);
      this.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.4,
        age: 0, life: 0.7 + Math.random() * 0.9,
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        gravity, shape: 'rect', spin: (Math.random() - 0.5) * 8,
      });
    }
  }

  ring(x: number, y: number, color: string): void {
    this.particles.push({
      x, y, vx: 0, vy: 0, age: 0, life: 0.32, size: 6, color, gravity: 0, shape: 'ring', spin: 0,
    });
  }

  stars(x: number, y: number, count = 5): void {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      this.particles.push({
        x, y, vx: Math.cos(a) * 46, vy: Math.sin(a) * 30 - 40,
        age: 0, life: 1.1, size: 6, color: '#FFC53D', gravity: 40, shape: 'star', spin: 4,
      });
    }
  }

  confettiRain(count: number): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * VIEW_W, y: -20 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 60, vy: 120 + Math.random() * 120,
        age: 0, life: 2.5 + Math.random() * 1.5, size: 4 + Math.random() * 5,
        color: ['#FFC53D', '#3DDC6B', '#3DA5FF', '#FF8A3D', '#F4F1E8'][Math.floor(Math.random() * 5)],
        gravity: 40, shape: 'rect', spin: (Math.random() - 0.5) * 10,
      });
    }
  }

  render(w: World, dt: number): void {
    const g = this.ctx;
    this.t += dt;
    this.wheelAngle += (w.speed / 26) * dt;

    g.save();
    g.clearRect(0, 0, VIEW_W, VIEW_H);
    // handheld sway + shake (art doc §6: gentle handheld)
    const sway = w.speed > 10 ? Math.sin(this.t * 1.7) * 2 + Math.sin(this.t * 3.1) * 1 : 0;
    const shx = (Math.random() - 0.5) * w.shake;
    const shy = (Math.random() - 0.5) * w.shake;
    g.translate(shx, sway * 0.4 + shy);
    if (w.zoom !== 1) {
      g.translate(RIDER_X + 80, GROUND_Y - 60);
      g.scale(w.zoom, w.zoom);
      g.translate(-(RIDER_X + 80), -(GROUND_Y - 60));
    }

    this.drawSky(g, w);
    this.drawHills(g, w.scrollX * 0.12);
    this.drawTreeline(g, w.scrollX * 0.3);
    this.drawStreet(g, w);
    if (w.hazard) this.drawHazard(g, w, w.hazard);
    this.drawRider(g, w);
    if (w.paperArc) this.drawPaper(g, w);
    this.drawSpeedLines(g, w);
    this.drawParticles(g, dt);
    this.drawPopups(g, w, dt);
    if (w.multiplier !== null) this.drawMultiplier(g, w, dt);
    g.restore();

    // dusk grade + vignette (always a whisper, strong in slow-mo)
    const base = 0.22 + 0.45 * w.vignette;
    const grad = g.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * (0.45 - 0.1 * w.vignette), VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.82);
    grad.addColorStop(0, 'rgba(20,10,40,0)');
    grad.addColorStop(1, `rgba(20,10,40,${base})`);
    g.fillStyle = grad;
    g.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  /* ---------------- environment ---------------- */

  private drawSky(g: CanvasRenderingContext2D, w: World): void {
    const grad = g.createLinearGradient(0, 0, 0, VP_Y);
    grad.addColorStop(0, '#273A75');
    grad.addColorStop(0.4, '#6F5490');
    grad.addColorStop(0.72, '#C76B85');
    grad.addColorStop(0.92, '#FF9E5E');
    grad.addColorStop(1, '#FFD98A');
    g.fillStyle = grad;
    g.fillRect(0, 0, VIEW_W, VP_Y);

    // sun with layered glow, sitting right at the vanishing point (art doc: the horizon owns the drama)
    const sx = VP_X + 210, sy = VP_Y - 40;
    for (const [r, a] of [[110, 0.16], [72, 0.2], [38, 0.5]] as const) {
      const sun = g.createRadialGradient(sx, sy, 6, sx, sy, r);
      sun.addColorStop(0, `rgba(255,236,190,${a})`);
      sun.addColorStop(1, 'rgba(255,217,138,0)');
      g.fillStyle = sun;
      g.beginPath(); g.arc(sx, sy, r, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#FFEFC9';
    g.beginPath(); g.arc(sx, sy, 20, 0, Math.PI * 2); g.fill();

    // drifting clouds, lit from below
    const drift = this.t * 6 + w.scrollX * 0.05;
    for (let i = 0; i < 5; i++) {
      const span = VIEW_W + 360;
      const cx = ((hash01(i, 21) * span - drift) % span + span) % span - 180;
      const cy = 22 + hash01(i, 22) * 88;
      const s = 0.55 + hash01(i, 23) * 0.7;
      g.save();
      g.translate(cx, cy);
      g.scale(s, s);
      g.fillStyle = 'rgba(96,80,140,0.55)';
      this.cloudPath(g, 0, 3);
      g.fill();
      g.fillStyle = 'rgba(255,170,130,0.5)';
      this.cloudPath(g, 0, 6);
      g.fill();
      g.restore();
    }

    // a lazy flock of birds
    const bt = (this.t % 26) / 26;
    if (bt < 0.55) {
      const bx = VIEW_W + 60 - bt * (VIEW_W + 260) * 1.9;
      g.strokeStyle = 'rgba(40,30,70,0.75)';
      g.lineWidth = 2;
      for (let b = 0; b < 3; b++) {
        const wing = Math.sin(this.t * 9 + b) * 4;
        const x = bx + b * 26, y = 50 + b * 10 + Math.sin(this.t * 2 + b) * 3;
        g.beginPath();
        g.moveTo(x - 7, y - wing); g.quadraticCurveTo(x, y + 2, x + 7, y - wing);
        g.stroke();
      }
    }
  }

  private cloudPath(g: CanvasRenderingContext2D, x: number, y: number): void {
    g.beginPath();
    g.arc(x - 34, y + 6, 16, 0, Math.PI * 2);
    g.arc(x - 8, y - 4, 22, 0, Math.PI * 2);
    g.arc(x + 24, y + 4, 17, 0, Math.PI * 2);
    g.arc(x + 2, y + 10, 20, 0, Math.PI * 2);
  }

  private drawHills(g: CanvasRenderingContext2D, offset: number): void {
    g.fillStyle = 'rgba(88,70,130,0.5)';
    g.beginPath();
    g.moveTo(0, VP_Y + 6);
    for (let x = 0; x <= VIEW_W; x += 16) {
      const wx = x + offset;
      const y = VP_Y - 14 - Math.sin(wx * 0.004) * 12 - Math.sin(wx * 0.0013 + 2) * 9;
      g.lineTo(x, y);
    }
    g.lineTo(VIEW_W, VP_Y + 6);
    g.closePath();
    g.fill();
    // tiny distant rooftops on the ridge
    g.fillStyle = 'rgba(74,60,110,0.55)';
    const span = 150;
    for (let i = Math.floor(offset / span) - 1; i < (offset + VIEW_W) / span + 1; i++) {
      const x = i * span - offset + hash01(i, 31) * 60;
      const y = VP_Y - 16 - Math.sin((x + offset) * 0.004) * 12 - Math.sin((x + offset) * 0.0013 + 2) * 9;
      g.beginPath();
      g.moveTo(x - 7, y + 3); g.lineTo(x, y - 5); g.lineTo(x + 7, y + 3);
      g.closePath(); g.fill();
    }
  }

  private drawTreeline(g: CanvasRenderingContext2D, offset: number): void {
    const span = 64;
    for (let i = Math.floor(offset / span) - 1; i < (offset + VIEW_W) / span + 1; i++) {
      const x = i * span - offset;
      const r = 15 + hash01(i, 13) * 13;
      g.fillStyle = `rgba(56,74,72,${0.55 + hash01(i, 14) * 0.2})`;
      g.beginPath();
      g.arc(x, VP_Y - r * 0.5 + 2, r, 0, Math.PI * 2);
      g.arc(x + 20, VP_Y - r * 0.3 + 4, r * 0.7, 0, Math.PI * 2);
      g.fill();
    }
    // warm top light on the canopy
    g.fillStyle = 'rgba(255,158,94,0.12)';
    g.fillRect(0, VP_Y - 20, VIEW_W, 20);
  }

  private drawStreet(g: CanvasRenderingContext2D, w: World): void {
    // full-bleed lawn below the horizon
    g.fillStyle = '#6EA75D';
    g.fillRect(0, VP_Y, VIEW_W, VIEW_H - VP_Y);
    g.fillStyle = 'rgba(255,217,138,0.14)';
    g.fillRect(0, VP_Y, VIEW_W, 8);

    // sidewalk + curb + road trapezoids, apex at the vanishing point (the signature receding street)
    this.trapezoid(g, SIDEWALK_NEAR, '#B8AFA4');
    g.fillStyle = 'rgba(255,233,196,0.15)';
    this.trapezoidPath(g, SIDEWALK_NEAR);
    g.fill();
    this.sidewalkSeams(g, w);
    this.trapezoid(g, CURB_NEAR, '#8E8578');
    this.trapezoid(g, ROAD_NEAR, '#5A5566');
    this.roadTexture(g, w);

    // poles+lamps+wires, parked cars, and houses — far-to-near so nearer objects overlap farther ones
    const first = Math.floor(w.scrollX / HOUSE_SPACING) - 1;
    const last = Math.floor((w.scrollX + 2400) / HOUSE_SPACING) + 1;
    const depths: number[] = [];
    for (let i = first; i <= last; i++) depths.push(i);
    depths.sort((a, b) => b - a); // far (large index) first

    for (const i of depths) {
      this.drawPole(g, i * HOUSE_SPACING - w.scrollX);
      this.drawLamp(g, i * HOUSE_SPACING - w.scrollX + HOUSE_SPACING * 0.5);
    }
    this.updateFireflies(g, w);
    for (const i of depths) this.drawParkedCar(g, i * HOUSE_SPACING - w.scrollX + HOUSE_SPACING * 0.32, i);
    for (const i of depths) this.drawLot(g, i * HOUSE_SPACING - w.scrollX, i, i === w.targetHouse);
  }

  /** Perspective-consistent expansion joints, so the sidewalk band doesn't read as a flat slab. */
  private sidewalkSeams(g: CanvasRenderingContext2D, w: World): void {
    const spacing = 130;
    const phase = ((w.scrollX % spacing) + spacing) % spacing;
    g.strokeStyle = 'rgba(74,60,110,0.18)';
    for (let n = 0; n < 12; n++) {
      const distAhead = n * spacing - phase + 20;
      if (distAhead < -20) continue;
      const scale = depthScale(distAhead);
      const y = projY(scale);
      if (y > VIEW_H + 4) continue;
      g.lineWidth = Math.max(0.6, 1.4 * scale);
      g.beginPath();
      g.moveTo(VP_X - ROAD_NEAR * scale, y);
      g.lineTo(VP_X - SIDEWALK_NEAR * scale, y);
      g.moveTo(VP_X + ROAD_NEAR * scale, y);
      g.lineTo(VP_X + SIDEWALK_NEAR * scale, y);
      g.stroke();
    }
  }

  private trapezoidPath(g: CanvasRenderingContext2D, nearHalf: number): void {
    g.beginPath();
    g.moveTo(VP_X, VP_Y);
    g.lineTo(VP_X - nearHalf, VIEW_H);
    g.lineTo(VP_X + nearHalf, VIEW_H);
    g.closePath();
  }

  private trapezoid(g: CanvasRenderingContext2D, nearHalf: number, color: string): void {
    g.fillStyle = color;
    this.trapezoidPath(g, nearHalf);
    g.fill();
  }

  private roadTexture(g: CanvasRenderingContext2D, w: World): void {
    g.save();
    this.trapezoidPath(g, ROAD_NEAR);
    g.clip();
    const nOff = ((w.scrollX * 0.4) % 256 + 256) % 256;
    for (let x = -nOff; x < VIEW_W; x += 256) {
      g.drawImage(this.noise, x, VP_Y, 256, VIEW_H - VP_Y);
    }
    g.fillStyle = 'rgba(255,158,94,0.07)';
    g.fillRect(0, VP_Y, VIEW_W, 16);
    g.restore();

    // dashed centreline, tapering toward the vanishing point, animated by scrollX
    const dashSpacing = 90;
    const phase = ((w.scrollX % dashSpacing) + dashSpacing) % dashSpacing;
    for (let n = 0; n < 16; n++) {
      const distAhead = n * dashSpacing - phase + 30;
      if (distAhead < -30) continue;
      const scale = depthScale(distAhead);
      const y = projY(scale);
      if (y > VIEW_H + 4) continue;
      const dashLen = 24 * scale;
      const dashW = Math.max(1, 6 * scale);
      g.fillStyle = `rgba(255,217,138,${0.3 + 0.35 * scale})`;
      g.fillRect(VP_X - dashW / 2, y, dashW, dashLen);
    }
  }

  private drawPole(g: CanvasRenderingContext2D, depth: number): void {
    const scale = depthScale(depth);
    if (scale < 0.05) return;
    const y = projY(scale);
    if (y > VIEW_H + 10 || y < VP_Y - 4) return;
    const x = projX(scale, -1.05, POLE_LANE_NEAR);
    if (x < -60 || x > VIEW_W + 60) return;
    const poleH = 128 * scale;

    g.strokeStyle = '#4E4258';
    g.lineWidth = Math.max(1, 5.5 * scale);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - poleH); g.stroke();
    g.lineWidth = Math.max(1, 3.5 * scale);
    g.beginPath(); g.moveTo(x - 20 * scale, y - poleH * 0.82); g.lineTo(x + 20 * scale, y - poleH * 0.82); g.stroke();

    const nextDepth = depth - HOUSE_SPACING;
    if (nextDepth < -200) return;
    const nScale = depthScale(nextDepth);
    const nx = projX(nScale, -1.05, POLE_LANE_NEAR);
    const ny = projY(nScale);
    const nPoleH = 128 * nScale;
    g.strokeStyle = 'rgba(40,32,60,0.65)';
    g.lineWidth = Math.max(0.6, 1.6 * Math.min(scale, nScale));
    g.beginPath();
    g.moveTo(x, y - poleH * 0.78);
    g.quadraticCurveTo((x + nx) / 2, Math.max(y, ny) - Math.min(poleH, nPoleH) * 0.55, nx, ny - nPoleH * 0.78);
    g.stroke();
  }

  /** Streetlamp on the opposite side from the telephone poles — dusk glow, rhythmic depth cue. */
  private drawLamp(g: CanvasRenderingContext2D, depth: number): void {
    const scale = depthScale(depth);
    if (scale < 0.05) return;
    const y = projY(scale);
    if (y > VIEW_H + 10 || y < VP_Y - 4) return;
    const x = projX(scale, 1.02, LAMP_LANE_NEAR);
    if (x < -60 || x > VIEW_W + 60) return;
    const postH = 96 * scale;
    const headY = y - postH - 4 * scale;

    g.strokeStyle = '#3E4658';
    g.lineWidth = Math.max(1, 4.5 * scale);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x, headY); g.stroke();

    const glow = g.createRadialGradient(x, headY, 1, x, headY, Math.max(2, 32 * scale));
    glow.addColorStop(0, 'rgba(255,225,150,0.55)');
    glow.addColorStop(1, 'rgba(255,225,150,0)');
    g.fillStyle = glow;
    g.beginPath(); g.arc(x, headY, Math.max(2, 32 * scale), 0, Math.PI * 2); g.fill();

    g.strokeStyle = '#3E4658';
    g.lineWidth = Math.max(1, 3 * scale);
    g.beginPath(); g.arc(x, headY, Math.max(2, 7 * scale), Math.PI * 0.9, Math.PI * 2.1); g.stroke();
    g.fillStyle = '#FFE9B0';
    g.beginPath(); g.arc(x, headY, Math.max(1.5, 5 * scale), 0, Math.PI * 2); g.fill();
  }

  /** Cars parked along the curb — street texture, purely decorative. */
  private drawParkedCar(g: CanvasRenderingContext2D, depth: number, i: number): void {
    if (hash01(i, 70) > 0.5) return;
    const scale = depthScale(depth);
    if (scale < 0.08) return;
    const y = projY(scale);
    if (y > VIEW_H + 20 || y < VP_Y) return;
    const lane = hash01(i, 71) < 0.5 ? -1 : 1;
    const x = projX(scale, lane * 1.05, PARKED_CAR_NEAR);
    if (x < -100 || x > VIEW_W + 100) return;
    const colors = ['#4A6FA5', '#8A9A6E', '#B0B0B8', '#7A5048'];
    const color = colors[Math.floor(hash01(i, 72) * colors.length)];

    g.save();
    g.translate(x, y);
    g.scale(scale, scale);
    g.fillStyle = VIOLET(0.3);
    g.beginPath(); g.ellipse(0, 10, 34, 5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(-32, 6); g.quadraticCurveTo(-34, -6, -24, -8);
    g.lineTo(-14, -8); g.quadraticCurveTo(-8, -20, 6, -20);
    g.lineTo(24, -8); g.quadraticCurveTo(34, -6, 32, 6);
    g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,233,196,0.3)';
    g.beginPath();
    g.moveTo(-12, -19); g.quadraticCurveTo(6, -22, 20, -18);
    g.lineTo(18, -14); g.quadraticCurveTo(4, -17, -10, -14);
    g.closePath(); g.fill();
    g.fillStyle = '#23273A';
    g.beginPath(); g.arc(-18, 8, 7, 0, Math.PI * 2); g.arc(18, 8, 7, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  private updateFireflies(g: CanvasRenderingContext2D, w: World): void {
    while (this.fireflies.length < 10) {
      this.fireflies.push({
        wx: w.scrollX + Math.random() * 1400,
        y: VP_Y + 6 + Math.random() * 30,
        phase: Math.random() * 10,
      });
    }
    for (const f of this.fireflies) {
      const depth = f.wx - w.scrollX;
      if (depth < -80) { f.wx = w.scrollX + 900 + Math.random() * 500; continue; }
      const scale = depthScale(depth);
      const x = projX(scale, (hash01(Math.floor(f.phase * 100), 61) - 0.5) * 1.3, HAZARD_LANE_NEAR);
      const y = projY(scale) - f.y * 0 - 10 * scale;
      const a = Math.max(0, Math.sin(this.t * 1.6 + f.phase)) * 0.7 * scale;
      if (a < 0.03) continue;
      const glow = g.createRadialGradient(x, y, 0, x, y, 6 * scale + 1);
      glow.addColorStop(0, `rgba(255,236,150,${a})`);
      glow.addColorStop(1, 'rgba(255,236,150,0)');
      g.fillStyle = glow;
      g.beginPath(); g.arc(x, y, 6 * scale + 1, 0, Math.PI * 2); g.fill();
    }
  }

  /* ---------------- houses ---------------- */

  private drawLot(g: CanvasRenderingContext2D, depth: number, i: number, isTarget: boolean): void {
    const scale = depthScale(depth);
    if (scale < 0.05) return;
    const y = projY(scale);
    if (y > VIEW_H + 60 || y < VP_Y - 10) return;

    const x = projX(scale, 1, HOUSE_LANE_NEAR);
    if (x > -220 && x < VIEW_W + 220) {
      g.save();
      g.translate(x, y);
      g.scale(scale, scale);
      this.houseBody(g, i, isTarget, 1);
      g.restore();
    }

    // decorative mirrored house on the opposite side of the street (no target flag, no house number)
    const x2 = projX(scale, -1, HOUSE_LANE_NEAR);
    if (x2 > -220 && x2 < VIEW_W + 220) {
      g.save();
      g.translate(x2, y);
      g.scale(-scale, scale);
      this.houseBody(g, i, false, 2);
      g.restore();
    }
  }

  private houseBody(g: CanvasRenderingContext2D, i: number, isTarget: boolean, seed: number): void {
    const ci = Math.floor(hash01(i, 1 + seed) * SIDINGS.length);
    const siding = SIDINGS[ci];
    const sidingDark = SIDING_DARK[ci];
    const roof = ROOFS[Math.floor(hash01(i, 2 + seed) * ROOFS.length)];
    const door = DOORS[Math.floor(hash01(i, 8 + seed) * DOORS.length)];
    const style = Math.floor(hash01(i, 4 + seed) * 3); // 0 gable · 1 hip+dormer · 2 porch
    const hw = 190;
    const hh = 116 + hash01(i, 3 + seed) * 30;
    const hL = -hw / 2, hR = hw / 2;
    const baseY = 0, topY = -hh;

    // driveway on some lots
    if (hash01(i, 16 + seed) < 0.4) {
      g.fillStyle = '#A79D90';
      g.beginPath();
      g.moveTo(hR + 6, baseY);
      g.lineTo(hR + 44, baseY);
      g.lineTo(hR + 58, 46);
      g.lineTo(hR - 4, 46);
      g.closePath();
      g.fill();
    }

    // long violet shadow raking toward camera (art doc §5)
    g.fillStyle = VIOLET(0.3);
    g.beginPath();
    g.moveTo(hL, baseY);
    g.lineTo(hL - 58, 46);
    g.lineTo(hR - 40, 46);
    g.lineTo(hR, baseY);
    g.closePath();
    g.fill();

    // body + siding lines
    g.fillStyle = siding;
    g.fillRect(hL, topY, hw, hh);
    g.strokeStyle = 'rgba(74,60,110,0.12)';
    g.lineWidth = 1;
    for (let sy = topY + 10; sy < baseY; sy += 9) {
      g.beginPath(); g.moveTo(hL, sy); g.lineTo(hR, sy); g.stroke();
    }
    g.fillStyle = sidingDark;
    g.fillRect(hL, topY, 26, hh);
    g.fillStyle = 'rgba(255,233,196,0.5)';
    g.fillRect(hR - 4, topY, 4, hh);

    // roof
    g.fillStyle = roof;
    if (style === 1) {
      g.beginPath();
      g.moveTo(hL - 18, topY);
      g.lineTo(hL + 48, topY - 46);
      g.lineTo(hR - 48, topY - 46);
      g.lineTo(hR + 18, topY);
      g.closePath();
      g.fill();
      g.fillStyle = siding;
      g.fillRect(-17, topY - 36, 34, 30);
      g.fillStyle = roof;
      g.beginPath();
      g.moveTo(-23, topY - 36);
      g.lineTo(0, topY - 52);
      g.lineTo(23, topY - 36);
      g.closePath();
      g.fill();
      this.window(g, -11, topY - 32, 22, 20);
    } else {
      g.beginPath();
      g.moveTo(hL - 18, topY);
      g.lineTo(0, topY - 54);
      g.lineTo(hR + 18, topY);
      g.closePath();
      g.fill();
    }
    g.strokeStyle = 'rgba(255,217,138,0.35)';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, topY - (style === 1 ? 46 : 54) + 2);
    g.lineTo(hR + 14, topY + 1);
    g.stroke();
    g.fillStyle = VIOLET(0.28);
    g.fillRect(hL, topY, hw, 7);

    // chimney
    if (hash01(i, 5 + seed) < 0.5) {
      g.fillStyle = '#8A5A4E';
      g.fillRect(hR - 58, topY - 42, 16, 34);
      g.fillStyle = '#6E463C';
      g.fillRect(hR - 60, topY - 46, 20, 6);
    }

    // door with steps + house number (only the legible, non-mirrored delivery row)
    const doorX = hL + hw * 0.42;
    g.fillStyle = door;
    g.fillRect(doorX, baseY - 54, 34, 54);
    g.fillStyle = 'rgba(255,217,138,0.85)';
    g.fillRect(doorX + 6, baseY - 48, 22, 10);
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(doorX + 4, baseY - 34, 26, 26);
    g.fillStyle = '#FFD98A';
    g.beginPath(); g.arc(doorX + 29, baseY - 26, 2, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#9A9184';
    g.fillRect(doorX - 6, baseY, 46, 5);
    if (seed < 2) {
      g.fillStyle = '#F4F1E8';
      g.font = '700 9px system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillText(String(100 + (i % 80)), doorX + 17, baseY - 58);
    }

    // porch (style 2)
    if (style === 2) {
      g.fillStyle = roof;
      g.fillRect(doorX - 26, baseY - 66, 86, 8);
      g.fillStyle = sidingDark;
      g.fillRect(doorX - 22, baseY - 58, 5, 58);
      g.fillRect(doorX + 52, baseY - 58, 5, 58);
      g.strokeStyle = sidingDark;
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(doorX - 24, baseY - 22); g.lineTo(doorX + 58, baseY - 22); g.stroke();
      if (hash01(i, 17 + seed) < 0.45) this.neighbor(g, doorX - 12, baseY, i + seed);
    }

    // windows with frames, mullions, warm interior gradient
    this.window(g, hL + 22, topY + 34, 38, 32);
    this.window(g, hR - 62, topY + 34, 38, 32);
    if (hh > 130) this.window(g, hL + 22, topY + 78, 38, 26);

    // foundation planting: bushes + flowers
    for (let b = 0; b < 3; b++) {
      const bx = hL + 12 + b * 34 + hash01(i, 40 + b + seed) * 10;
      const br = 10 + hash01(i, 44 + b + seed) * 7;
      g.fillStyle = '#5C8A4E';
      g.beginPath(); g.arc(bx, baseY - 2, br, Math.PI, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,217,138,0.25)';
      g.beginPath(); g.arc(bx + br * 0.35, baseY - br * 0.7, br * 0.4, 0, Math.PI * 2); g.fill();
    }
    if (hash01(i, 9 + seed) < 0.5) {
      for (let f = 0; f < 5; f++) {
        g.fillStyle = ['#FF8A9D', '#FFC53D', '#C9A0FF'][f % 3];
        g.fillRect(hL + 118 + f * 9, baseY - 4 - hash01(i, 50 + f + seed) * 5, 3, 3);
      }
    }

    // big front-yard tree between lots
    this.tree(g, hR + 96, i + seed);

    // kerb furniture rotation: mailbox / hydrant / flamingo / bin
    const item = Math.floor(hash01(i, 6 + seed) * 4);
    const kx = hR + 34;
    if (item === 0) {
      g.fillStyle = '#4A5568';
      g.fillRect(kx, baseY - 66, 4, 26);
      g.fillStyle = '#718096';
      g.fillRect(kx - 8, baseY - 76, 22, 13);
      g.fillStyle = '#D64545';
      g.fillRect(kx + 12, baseY - 82, 2, 8);
    } else if (item === 1) {
      g.fillStyle = '#C0392B';
      g.fillRect(kx - 5, baseY - 58, 12, 18);
      g.beginPath(); g.arc(kx + 1, baseY - 58, 7, Math.PI, Math.PI * 2); g.fill();
      g.fillStyle = '#E8B4A8';
      g.fillRect(kx - 8, baseY - 52, 4, 5);
      g.fillRect(kx + 6, baseY - 52, 4, 5);
    } else if (item === 2) {
      g.strokeStyle = '#2A2F42';
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(kx, baseY - 42); g.lineTo(kx, baseY - 58); g.stroke();
      g.fillStyle = '#FF8A9D';
      g.beginPath(); g.ellipse(kx + 4, baseY - 62, 8, 5, -0.3, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(kx + 12, baseY - 68, 3, 0, Math.PI * 2); g.fill();
    } else {
      g.fillStyle = '#5E6B52';
      g.fillRect(kx - 7, baseY - 62, 18, 22);
      g.fillStyle = '#4C573F';
      g.fillRect(kx - 9, baseY - 66, 22, 6);
    }

    // picket fence between lots
    g.fillStyle = 'rgba(244,241,232,0.9)';
    for (let f = 0; f < 5; f++) {
      const fx = hR + 58 + f * 14;
      g.beginPath();
      g.moveTo(fx, baseY - 64); g.lineTo(fx + 3, baseY - 68); g.lineTo(fx + 6, baseY - 64);
      g.lineTo(fx + 6, baseY - 44); g.lineTo(fx, baseY - 44);
      g.closePath(); g.fill();
    }
    g.fillRect(hR + 56, baseY - 58, 74, 3);

    // the flag — the player's pre-committed target house (GDD §20)
    if (isTarget) {
      const glow = g.createRadialGradient(0, topY + hh / 2 - 20, 8, 0, topY + hh / 2, hw * 0.9);
      glow.addColorStop(0, 'rgba(255,197,61,0.3)');
      glow.addColorStop(1, 'rgba(255,197,61,0)');
      g.fillStyle = glow;
      g.fillRect(-hw, topY - 90, hw * 2, hh + 120);
      const wave = Math.sin(this.t * 5) * 4;
      const fx = 0, fy = topY - (style === 1 ? 46 : 54);
      g.strokeStyle = '#F4F1E8';
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx, fy - 44); g.stroke();
      g.fillStyle = '#FFC53D';
      g.beginPath();
      g.moveTo(fx, fy - 44);
      g.quadraticCurveTo(fx + 18, fy - 40 + wave * 0.4, fx + 36, fy - 35 + wave);
      g.quadraticCurveTo(fx + 18, fy - 31 + wave * 0.4, fx, fy - 26);
      g.closePath();
      g.fill();
    }
  }

  private window(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    g.fillStyle = '#F4F1E8';
    g.fillRect(x - 3, y - 3, w + 6, h + 6);
    const glow = g.createLinearGradient(x, y, x, y + h);
    glow.addColorStop(0, '#FFE9B0');
    glow.addColorStop(1, '#FFB25E');
    g.fillStyle = glow;
    g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(74,60,110,0.5)';
    g.lineWidth = 2;
    g.strokeRect(x, y, w, h);
    g.beginPath();
    g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h);
    g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2);
    g.stroke();
    g.fillStyle = VIOLET(0.2);
    g.fillRect(x - 3, y + h + 3, w + 6, 3);
  }

  private tree(g: CanvasRenderingContext2D, x: number, i: number): void {
    const s = 0.8 + hash01(i, 11) * 0.5;
    const sway = Math.sin(this.t * 0.8 + i) * 3;
    const gy = 0; // local ground
    g.fillStyle = '#6E522C';
    g.beginPath();
    g.moveTo(x - 5 * s, gy - 42);
    g.quadraticCurveTo(x - 2 * s + sway * 0.3, gy - 90 * s, x + sway * 0.5, gy - 108 * s);
    g.lineTo(x + 5 * s + sway * 0.5, gy - 104 * s);
    g.quadraticCurveTo(x + 4 * s, gy - 80 * s, x + 6 * s, gy - 42);
    g.closePath();
    g.fill();
    const cy = gy - 118 * s;
    g.fillStyle = '#4E7A44';
    g.beginPath();
    g.arc(x - 20 * s + sway, cy + 12 * s, 22 * s, 0, Math.PI * 2);
    g.arc(x + 18 * s + sway, cy + 10 * s, 24 * s, 0, Math.PI * 2);
    g.arc(x + sway, cy - 8 * s, 26 * s, 0, Math.PI * 2);
    g.fill();
    // sun-side highlight
    g.fillStyle = 'rgba(255,217,138,0.3)';
    g.beginPath();
    g.arc(x + 14 * s + sway, cy - 10 * s, 15 * s, 0, Math.PI * 2);
    g.fill();
  }

  private neighbor(g: CanvasRenderingContext2D, x: number, baseY: number, i: number): void {
    const wave = Math.sin(this.t * 3 + i) * 0.4;
    const shirt = ['#C97B4A', '#5A8AA8', '#8A5A88'][Math.floor(hash01(i, 18) * 3)];
    g.fillStyle = shirt;
    g.fillRect(x - 6, baseY - 40, 13, 24); // torso
    g.fillStyle = '#3E4658';
    g.fillRect(x - 6, baseY - 17, 5, 17);
    g.fillRect(x + 2, baseY - 17, 5, 17);
    g.fillStyle = '#E8B48A';
    g.beginPath(); g.arc(x, baseY - 46, 6, 0, Math.PI * 2); g.fill();
    g.strokeStyle = shirt;
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(x + 5, baseY - 36);
    g.lineTo(x + 12, baseY - 48 - wave * 8);
    g.stroke();
  }

  /* ---------------- Ace ---------------- */

  /**
   * Ace, seen from behind — the chase-cam view: he rides away from camera
   * down the vanishing-point road, so the rig shows his back, shoulders and
   * the back of his (backwards) cap, not a side profile. The delivery bag
   * sits on his right hip so the throwing arm and the delivery lane (which
   * fans right, per DELIVER_POINT) agree with each other.
   */
  private drawRider(g: CanvasRenderingContext2D, w: World): void {
    w.bob += (w.speed > 10 ? 0.11 : 0.035);
    const bobY = w.pose === 'ride' ? Math.sin(w.bob) * 2.5 : 0;
    const sway = w.pose === 'ride' ? Math.sin(w.bob * 0.5) * 3 : 0;
    const x = RIDER_X;
    const y = GROUND_Y - 18 + bobY;
    const spin = this.wheelAngle;
    const fast = w.speed > 340;

    g.save();
    g.translate(x, y);

    if (w.pose === 'tumble') {
      const t = Math.min(1, w.poseT);
      if (t < 0.65) {
        g.rotate(t * Math.PI * 1.6);
        g.translate(0, -t * 10);
      } else {
        // sat up, dazed, facing camera — stars handled by director
        g.restore();
        this.drawCrashed(g, x, y, w.poseT);
        return;
      }
    } else if (w.pose === 'wheelie') {
      g.translate(0, 4);
      g.rotate(-0.14 * Math.min(1, w.poseT * 3));
      g.translate(0, -4);
    } else if (w.pose === 'skid') {
      g.rotate(-0.06);
    } else if (w.pose === 'tuck') {
      g.translate(0, 6);
    }

    // ground shadow
    g.fillStyle = VIOLET(0.4);
    g.beginPath();
    g.ellipse(sway * 0.4, 20, 30, 7, 0, 0, Math.PI * 2);
    g.fill();

    // rear wheel, dead-on from behind — the bike's whole visible wheel silhouette
    g.save();
    g.translate(sway * 0.5, 6);
    g.strokeStyle = '#23273A';
    g.lineWidth = 6;
    g.beginPath(); g.arc(0, 0, 17, 0, Math.PI * 2); g.stroke();
    if (fast) {
      g.strokeStyle = 'rgba(139,144,163,0.5)';
      g.lineWidth = 7;
      g.beginPath(); g.arc(0, 0, 10, 0, Math.PI * 2); g.stroke();
    } else {
      g.strokeStyle = '#8B90A3';
      g.lineWidth = 1.6;
      for (let s = 0; s < 6; s++) {
        const a = spin + (s * Math.PI * 2) / 6;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 15, Math.sin(a) * 15); g.stroke();
      }
    }
    g.fillStyle = '#8B90A3';
    g.beginPath(); g.arc(0, 0, 3.4, 0, Math.PI * 2); g.fill();
    g.restore();

    // seat post + seat
    g.strokeStyle = '#D64545';
    g.lineWidth = 4.5;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(sway * 0.5, -6); g.lineTo(sway * 0.5, -20); g.stroke();
    g.fillStyle = '#23273A';
    g.fillRect(sway * 0.5 - 7, -24, 14, 5);

    // pedalling legs, both visible side by side (behind view), alternating height
    const crank = spin * 0.55;
    const throwT = w.pose === 'throw' ? Math.min(1, w.poseT * 2.5) : 0;
    const lean = Math.min(1, w.speed / 430);
    for (const [lx, ph, color] of [[-11, 0, '#3E4658'], [11, Math.PI, '#4A5568']] as const) {
      const bob = Math.sin(crank + ph);
      const hipX = lx * 0.4 + sway * 0.4, hipY = -18;
      const footX = lx * 0.9 + sway * 0.3, footY = 14 + bob * 8;
      const kneeX = lx * 1.1, kneeY = -2 - bob * 3;
      g.strokeStyle = color;
      g.lineWidth = 5;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(hipX, hipY);
      g.quadraticCurveTo(kneeX, kneeY, footX, footY);
      g.stroke();
      g.fillStyle = '#F4F1E8';
      g.fillRect(footX - 4, footY - 2, 8, 4);
    }

    // torso — jacket back, shoulders, diagonal bag strap to a right-hip bag
    g.save();
    g.translate(sway * 0.6, -30);
    g.rotate(lean * 0.05);
    g.fillStyle = '#3A6BC5';
    this.rr(g, -13, -16, 26, 28, 9);
    g.fill();
    g.fillStyle = '#2E55A0';
    this.rr(g, -13, 4, 26, 10, 5);
    g.fill();
    // jacket hem fluttering (the constant speed tell — art doc §4)
    const flap = Math.sin(this.t * 16) * (2 + lean * 4);
    g.fillStyle = '#2E55A0';
    g.beginPath();
    g.moveTo(-13, 12);
    g.quadraticCurveTo(-17 - lean * 5, 16 + flap * 0.4, -13 - lean * 7, 21 + flap);
    g.lineTo(-8, 19);
    g.closePath();
    g.fill();
    // diagonal bag strap across the back
    g.strokeStyle = '#B8A26E';
    g.lineWidth = 4;
    g.beginPath(); g.moveTo(-10, -14); g.lineTo(11, 11); g.stroke();
    // canvas bag at the right hip, rolled papers peeking out
    g.fillStyle = '#D9C79E';
    g.beginPath(); g.ellipse(13, 13, 9, 11, 0.2, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#B8A26E';
    g.lineWidth = 2;
    g.stroke();
    for (let p = 0; p < 3; p++) {
      g.fillStyle = p === 1 ? '#EDE8DA' : '#F4F1E8';
      g.save();
      g.translate(9 + p * 3, 4);
      g.rotate(-0.4 + p * 0.16);
      g.fillRect(-2, -4, 4.5, 9);
      g.restore();
    }
    g.restore();

    // left arm — steady on the grip
    g.strokeStyle = '#3A6BC5';
    g.lineWidth = 5;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(sway * 0.6 - 10, -40);
    g.quadraticCurveTo(sway * 0.6 - 17, -34, sway * 0.6 - 20, -25);
    g.stroke();
    g.fillStyle = '#F0C49A';
    g.beginPath(); g.arc(sway * 0.6 - 20, -25, 3.5, 0, Math.PI * 2); g.fill();

    // right arm — on the grip, or reaching to the bag then swinging the throw out to the right
    g.strokeStyle = '#3A6BC5';
    g.beginPath();
    let handX: number, handY: number;
    if (throwT > 0 && throwT < 0.4) {
      const p = throwT / 0.4;
      handX = lerp(sway * 0.6 + 10, 12, p);
      handY = lerp(-40, 6, p);
      g.moveTo(sway * 0.6 + 10, -40);
      g.quadraticCurveTo(sway * 0.6 + 20, -18, handX, handY);
    } else if (throwT >= 0.4) {
      const p = (throwT - 0.4) / 0.6;
      const aa = -1.7 + p * 2.3;
      handX = 14 + Math.cos(aa) * 28;
      handY = 4 + Math.sin(aa) * 28 - p * 14;
      g.moveTo(sway * 0.6 + 10, -34);
      g.quadraticCurveTo(24, -8, handX, handY);
    } else {
      handX = sway * 0.6 + 20;
      handY = -25;
      g.moveTo(sway * 0.6 + 10, -40);
      g.quadraticCurveTo(sway * 0.6 + 17, -34, handX, handY);
    }
    g.stroke();
    g.fillStyle = '#F0C49A';
    g.beginPath(); g.arc(handX, handY, 3.5, 0, Math.PI * 2); g.fill();

    // head — backwards cap seen from behind; glances back over the shoulder during a near-miss tuck
    const turn = w.pose === 'tuck' ? 0.85 : 0;
    g.save();
    g.translate(sway * 0.7, -46);
    g.fillStyle = '#F0C49A';
    g.fillRect(-5, 2, 10, 8); // neck
    g.fillStyle = '#6E4A2C';
    g.fillRect(-7, -2, 14, 6); // hair peeking below the cap
    g.fillStyle = '#F0C49A';
    g.beginPath(); g.ellipse(turn * 4, -6, 9 - turn * 1.5, 9, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#E0AE85';
    g.beginPath(); g.arc(-7 + turn * 10, -4, 2.2, 0, Math.PI * 2); g.fill(); // ear
    if (turn > 0.2) {
      g.fillStyle = '#F0C49A';
      g.beginPath(); g.arc(6 * turn, -5, 5 * turn, -0.6, 0.9); g.fill(); // cheek peeking
      g.fillStyle = '#23273A';
      g.beginPath(); g.arc(7 * turn, -6, 1.4, 0, Math.PI * 2); g.fill(); // eye
      g.fillStyle = 'rgba(255,138,157,0.5)';
      g.beginPath(); g.arc(8 * turn, -2, 2, 0, Math.PI * 2); g.fill(); // blush
    }
    // backwards cap: crown wraps the back/top of the head, brim peeks out low at the neck
    g.fillStyle = '#D64545';
    g.beginPath(); g.arc(turn * 3, -9, 9.5, Math.PI * 0.05, Math.PI * 1.5); g.fill();
    g.beginPath(); g.ellipse(turn * 3, -1, 8, 3, 0, 0, Math.PI); g.fill();
    g.fillStyle = '#F4F1E8';
    g.beginPath(); g.arc(turn * 3, -14, 2, 0, Math.PI * 2); g.fill(); // cap button
    // warm rim light from the sun side (art doc §5)
    g.strokeStyle = 'rgba(255,233,196,0.85)';
    g.lineWidth = 2;
    g.beginPath(); g.arc(turn * 3 - 2, -9, 9.5, Math.PI * 1.05, Math.PI * 1.5); g.stroke();
    g.restore();

    g.restore();

    // tire dust when moving hard
    if (w.speed > 300 && Math.random() < 0.3) {
      this.particles.push({
        x: x - 20, y: GROUND_Y + 12, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 30,
        age: 0, life: 0.5, size: 3 + Math.random() * 3, color: 'rgba(184,175,164,0.5)',
        gravity: -40, shape: 'glow', spin: 0,
      });
    }
  }

  private drawCrashed(g: CanvasRenderingContext2D, x: number, y: number, t: number): void {
    // bike on the ground
    g.save();
    g.translate(x - 34, y + 10);
    g.rotate(-0.4);
    g.strokeStyle = '#D64545';
    g.lineWidth = 4;
    g.beginPath(); g.moveTo(-18, 0); g.lineTo(8, -8); g.lineTo(18, 2); g.stroke();
    g.strokeStyle = '#23273A';
    g.lineWidth = 4;
    g.beginPath(); g.arc(-18, 2, 12, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(18, 4, 12, 0, Math.PI * 2); g.stroke();
    g.restore();
    // Ace sitting up, dazed but okay (losses are slapstick — GDD §10)
    g.save();
    g.translate(x + 16, y + 6);
    g.fillStyle = VIOLET(0.4);
    g.beginPath(); g.ellipse(0, 14, 24, 5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#4A5568';
    this.rr(g, -12, 2, 26, 8, 4); g.fill(); // legs out flat
    g.fillStyle = '#3A6BC5';
    this.rr(g, -9, -18, 18, 22, 7); g.fill();
    g.fillStyle = '#F0C49A';
    g.beginPath(); g.arc(0, -26, 9, 0, Math.PI * 2); g.fill();
    const wob = Math.sin(t * 6) * 0.15;
    g.fillStyle = '#D64545';
    g.beginPath(); g.arc(-1, -29 + wob, 9, Math.PI * 0.95, Math.PI * 2.05); g.fill();
    // spiral eyes
    g.strokeStyle = '#23273A';
    g.lineWidth = 1.4;
    for (const ex of [-3, 4]) {
      g.beginPath(); g.arc(ex, -26, 2.4, 0, Math.PI * 1.6 + t); g.stroke();
    }
    g.restore();
  }

  private drawPaper(g: CanvasRenderingContext2D, w: World): void {
    const arc = w.paperArc!;
    const t = Math.min(1, arc.t);
    const sx = RIDER_X + 8, sy = GROUND_Y - 62;
    const x = sx + (arc.targetX - sx) * t;
    const y = sy + (arc.targetY - sy) * t - Math.sin(t * Math.PI) * 92;
    if (arc.golden) {
      g.strokeStyle = 'rgba(255,197,61,0.7)';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(sx, sy);
      g.quadraticCurveTo((sx + x) / 2, Math.min(sy, y) - 60, x, y);
      g.stroke();
    }
    g.save();
    g.translate(x, y);
    g.rotate(t * 9);
    g.fillStyle = arc.golden ? '#FFC53D' : '#F4F1E8';
    this.rr(g, -8, -4.5, 16, 9, 3);
    g.fill();
    g.strokeStyle = 'rgba(42,47,66,0.6)';
    g.lineWidth = 1;
    g.stroke();
    g.beginPath();
    g.moveTo(-4, -2); g.lineTo(4, -2); g.moveTo(-4, 1); g.lineTo(2, 1);
    g.stroke();
    g.restore();
  }

  private drawSpeedLines(g: CanvasRenderingContext2D, w: World): void {
    if (w.speed < 360) return;
    const n = Math.floor((w.speed - 360) / 24);
    g.strokeStyle = 'rgba(244,241,232,0.16)';
    g.lineWidth = 2;
    for (let i = 0; i < n; i++) {
      const y = 90 + ((i * 97 + Math.floor(this.t * 30) * 31) % 300);
      const x = (i * 173 + Math.floor(this.t * 60) * 89) % VIEW_W;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - 60 - (w.speed - 360) * 0.2, y);
      g.stroke();
    }
  }

  /* ---------------- hazards ---------------- */

  private drawHazard(g: CanvasRenderingContext2D, w: World, h: Hazard): void {
    const depth = h.worldX - w.scrollX;
    const scale = depthScale(depth);
    if (scale < 0.05) return;
    const y = projY(scale);
    if (y > VIEW_H + 80 || y < VP_Y - 10) return;

    const startLane = HAZARD_START_LANE[h.kind];
    const t = Math.min(1, h.t);
    let lane = startLane;
    if (h.phase === 'threat') lane = startLane + (LANE_ACE - startLane) * t;
    else if (h.phase === 'fatal') lane = LANE_ACE;
    else if (h.phase === 'escaped') lane = LANE_ACE + (-startLane * 0.7 - LANE_ACE) * t;

    const x = projX(scale, lane, HAZARD_LANE_NEAR);
    if (x < -220 || x > VIEW_W + 220) return;

    g.save();
    g.translate(x, y);
    g.scale(scale, scale);
    switch (h.kind) {
      case 'dog': this.dogBody(g, h, x, y, scale); break;
      case 'car': this.carBody(g, h, x, y, scale); break;
      case 'skateboard': this.skateboardBody(g, h); break;
      case 'sprinkler': this.sprinklerBody(g, h, x, y, scale); break;
      case 'trash': this.trashBody(g, h); break;
    }
    g.restore();
  }

  private dogBody(g: CanvasRenderingContext2D, h: Hazard, ox: number, oy: number, s: number): void {
    const t = Math.min(1, h.t);
    let rot = 0, liftY = 0;
    if (h.phase === 'escaped') { liftY = -Math.sin(t * Math.PI) * 40; rot = t * 2.2; }
    else if (h.phase === 'fatal') { liftY = -Math.sin(t * Math.PI) * 26; }

    g.save();
    g.translate(0, liftY);
    g.rotate(rot);

    if (h.phase === 'telegraph') {
      g.fillStyle = '#8A6A3B';
      g.beginPath(); g.moveTo(-10, -4); g.lineTo(-5, -19); g.lineTo(0, -4); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(6, -4); g.lineTo(11, -19); g.lineTo(16, -4); g.closePath(); g.fill();
      g.beginPath(); g.arc(3, 0, 12, Math.PI, Math.PI * 2); g.fill();
      g.fillStyle = '#23273A';
      g.beginPath(); g.arc(-2, -4, 2, 0, Math.PI * 2); g.arc(8, -4, 2, 0, Math.PI * 2); g.fill();
    } else {
      g.fillStyle = VIOLET(0.35);
      g.beginPath(); g.ellipse(0, 12, 25, 5, 0, 0, Math.PI * 2); g.fill();
      // body with deep chest
      g.fillStyle = '#8A6A3B';
      g.beginPath();
      g.moveTo(-22, 4);
      g.quadraticCurveTo(-24, -6, -12, -5);
      g.quadraticCurveTo(4, -8, 16, -4);
      g.quadraticCurveTo(24, 0, 20, 10);
      g.quadraticCurveTo(6, 17, -10, 14);
      g.quadraticCurveTo(-22, 13, -22, 4);
      g.closePath();
      g.fill();
      // spot
      g.fillStyle = '#6E522C';
      g.beginPath(); g.ellipse(-8, 2, 7, 5, 0.3, 0, Math.PI * 2); g.fill();
      // tail
      const wag = Math.sin(h.t * 18) * 6;
      g.strokeStyle = '#8A6A3B';
      g.lineWidth = 4;
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(-21, 0); g.quadraticCurveTo(-30, -8, -32, -12 + wag); g.stroke();
      // head
      g.fillStyle = '#8A6A3B';
      g.beginPath(); g.arc(20, -5, 9, 0, Math.PI * 2); g.fill();
      // snout + open jaws
      g.beginPath(); g.moveTo(26, -7); g.lineTo(35, -4); g.lineTo(26, -2); g.closePath(); g.fill();
      g.fillStyle = '#F4F1E8';
      g.beginPath(); g.moveTo(27, -6); g.lineTo(33, -5); g.lineTo(27, -4); g.closePath(); g.fill();
      if (h.phase === 'threat' || h.phase === 'fatal') {
        g.fillStyle = '#FF8A9D';
        g.beginPath(); g.ellipse(30, 0, 4, 2.2, 0.5, 0, Math.PI * 2); g.fill();
      }
      // floppy ear
      g.fillStyle = '#6E522C';
      g.beginPath();
      g.moveTo(16, -12);
      g.quadraticCurveTo(13, -20, 19, -18);
      g.quadraticCurveTo(23, -16, 21, -10);
      g.closePath();
      g.fill();
      // eye
      g.fillStyle = '#23273A';
      g.beginPath(); g.arc(21, -8, 1.8, 0, Math.PI * 2); g.fill();
      // galloping legs, phase-offset
      g.strokeStyle = '#6E522C';
      g.lineWidth = 4.5;
      for (const [lx, ph] of [[-15, 0], [-9, 2.2], [10, 1.1], [16, 3.3]] as const) {
        const swingA = Math.sin(h.t * 20 + ph) * 8;
        g.beginPath();
        g.moveTo(lx, 11);
        g.lineTo(lx + swingA * 0.6, 21);
        g.stroke();
      }
      // cool rim when threatening (art doc §5)
      if (h.phase === 'threat') {
        g.strokeStyle = 'rgba(159,212,255,0.8)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-20, -2);
        g.quadraticCurveTo(0, -10, 18, -6);
        g.stroke();
      }
      // dust kicked up behind while chasing
      if ((h.phase === 'threat' || h.phase === 'fatal') && Math.random() < 0.4) {
        this.particles.push({
          x: ox - 26 * s, y: oy + 8 * s, vx: -50, vy: -18,
          age: 0, life: 0.4, size: 3, color: 'rgba(184,175,164,0.45)',
          gravity: -30, shape: 'glow', spin: 0,
        });
      }
    }
    g.restore();
  }

  private carBody(g: CanvasRenderingContext2D, h: Hazard, ox: number, oy: number, s: number): void {
    const bounce = Math.sin(h.t * 14) * 1;
    g.save();
    g.translate(0, bounce);
    g.fillStyle = VIOLET(0.35);
    g.beginPath(); g.ellipse(0, 23 - bounce, 54, 6, 0, 0, Math.PI * 2); g.fill();
    // body
    g.fillStyle = '#C0392B';
    g.beginPath();
    g.moveTo(-52, 16);
    g.quadraticCurveTo(-54, 2, -44, 0);
    g.lineTo(-26, -2);
    g.quadraticCurveTo(-18, -17, 0, -18);
    g.quadraticCurveTo(20, -17, 27, -3);
    g.lineTo(44, 0);
    g.quadraticCurveTo(54, 2, 52, 16);
    g.closePath();
    g.fill();
    // roof highlight
    g.fillStyle = 'rgba(255,233,196,0.35)';
    g.beginPath();
    g.moveTo(-20, -16); g.quadraticCurveTo(0, -20, 22, -15);
    g.lineTo(20, -12); g.quadraticCurveTo(0, -16, -18, -12);
    g.closePath();
    g.fill();
    // windows
    g.fillStyle = '#9ED4EA';
    g.beginPath();
    g.moveTo(-16, -14); g.lineTo(-3, -14); g.lineTo(-3, -3); g.lineTo(-21, -3);
    g.closePath(); g.fill();
    g.beginPath();
    g.moveTo(2, -14); g.lineTo(15, -14); g.lineTo(21, -3); g.lineTo(2, -3);
    g.closePath(); g.fill();
    // mirror + handle
    g.fillStyle = '#C0392B';
    g.fillRect(-26, -6, 5, 4);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(-14, 2, 10, 2.5);
    // wheels with hubcaps
    for (const wx of [-30, 30]) {
      g.fillStyle = '#23273A';
      g.beginPath(); g.arc(wx, 16, 10, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#8B90A3';
      g.beginPath(); g.arc(wx, 16, 4.5, 0, Math.PI * 2); g.fill();
    }
    // headlight cones toward the rider
    if (h.phase === 'telegraph' || h.phase === 'threat') {
      g.fillStyle = 'rgba(255,217,138,0.4)';
      g.beginPath();
      g.moveTo(-52, 6); g.lineTo(-118, -6); g.lineTo(-118, 18);
      g.closePath(); g.fill();
      g.fillStyle = '#FFE9C4';
      g.beginPath(); g.arc(-49, 6, 3.4, 0, Math.PI * 2); g.fill();
    }
    g.restore();
    void ox; void oy; void s;
  }

  private skateboardBody(g: CanvasRenderingContext2D, h: Hazard): void {
    g.fillStyle = VIOLET(0.3);
    g.beginPath(); g.ellipse(0, 14, 26, 4, 0, 0, Math.PI * 2); g.fill();
    // deck with kicked tail
    g.fillStyle = '#E0A030';
    g.beginPath();
    g.moveTo(-24, 3);
    g.quadraticCurveTo(-28, -2, -24, -4);
    g.lineTo(22, 3);
    g.quadraticCurveTo(28, 4, 24, 7);
    g.closePath();
    g.fill();
    g.fillStyle = '#23273A';
    g.beginPath(); g.arc(-14, 10, 5, 0, Math.PI * 2); g.arc(14, 10, 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#8B90A3';
    g.beginPath(); g.arc(-14, 10, 2, 0, Math.PI * 2); g.arc(14, 10, 2, 0, Math.PI * 2); g.fill();
    // crouching kid with helmet
    if (h.phase !== 'escaped' || h.t < 0.4) {
      const wob = Math.sin(h.t * 12) * 1.5;
      g.fillStyle = '#5A8AA8';
      this.rr(g, -8, -18 + wob, 15, 18, 6);
      g.fill();
      g.fillStyle = '#F0C49A';
      g.beginPath(); g.arc(0, -24 + wob, 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#3DDC6B';
      g.beginPath(); g.arc(-1, -26 + wob, 7.4, Math.PI * 0.9, Math.PI * 2.05); g.fill();
      g.fillStyle = '#23273A';
      g.beginPath(); g.arc(-4, -24 + wob, 1.6, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#4A5568';
      g.lineWidth = 4;
      g.beginPath(); g.moveTo(-4, -2 + wob); g.lineTo(-10, 5); g.moveTo(3, -2 + wob); g.lineTo(9, 5); g.stroke();
    }
  }

  private sprinklerBody(g: CanvasRenderingContext2D, h: Hazard, ox: number, oy: number, s: number): void {
    g.fillStyle = '#4A5568';
    g.fillRect(-3, 0, 6, 10);
    g.fillStyle = '#8B90A3';
    g.fillRect(-5, -2, 10, 3);
    const sweep = Math.sin(h.t * 10);
    g.strokeStyle = 'rgba(160,215,245,0.75)';
    g.lineWidth = 2.2;
    for (let j = 0; j < 7; j++) {
      const a = -Math.PI / 2 + sweep * 0.7 + (j - 3) * 0.12;
      const ex = Math.cos(a) * 58, ey = Math.sin(a) * 58;
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(Math.cos(a) * 30, Math.sin(a) * 30, ex, ey);
      g.stroke();
      if (Math.random() < 0.2) {
        this.particles.push({
          x: ox + ex * s, y: oy + ey * s, vx: (Math.random() - 0.5) * 30, vy: 30,
          age: 0, life: 0.35, size: 2, color: 'rgba(160,215,245,0.8)',
          gravity: 300, shape: 'glow', spin: 0,
        });
      }
    }
    if (h.phase === 'escaped' && h.t > 0.3) {
      const grad = g.createLinearGradient(-40, -32, 40, -32);
      grad.addColorStop(0, 'rgba(255,90,90,0.5)');
      grad.addColorStop(0.5, 'rgba(255,217,138,0.5)');
      grad.addColorStop(1, 'rgba(61,220,107,0.5)');
      g.strokeStyle = grad;
      g.lineWidth = 5;
      g.beginPath();
      g.arc(0, 8, 40, Math.PI, Math.PI * 2);
      g.stroke();
    }
  }

  private trashBody(g: CanvasRenderingContext2D, h: Hazard): void {
    for (const [dx, tip] of [[-20, h.phase === 'fatal'], [8, false]] as [number, boolean][]) {
      g.save();
      g.translate(dx, 0);
      if (tip) g.rotate(0.9 * Math.min(1, h.t));
      g.fillStyle = '#6B7280';
      this.rr(g, -10, -30, 20, 30, 3);
      g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.2)';
      g.lineWidth = 1.5;
      for (const ry of [-22, -14, -6]) {
        g.beginPath(); g.moveTo(-9, ry); g.lineTo(9, ry); g.stroke();
      }
      g.fillStyle = '#4A5568';
      this.rr(g, -12, -35, 24, 7, 3);
      g.fill();
      g.restore();
    }
    if (h.phase === 'telegraph') {
      g.fillStyle = '#3E4658';
      g.beginPath(); g.arc(-20, -37, 6, Math.PI, Math.PI * 2); g.fill();
      g.fillStyle = '#F4F1E8';
      g.beginPath(); g.arc(-23, -38, 2, 0, Math.PI * 2); g.arc(-17, -38, 2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#FFD98A';
      g.beginPath(); g.arc(-23, -38, 1, 0, Math.PI * 2); g.arc(-17, -38, 1, 0, Math.PI * 2); g.fill();
    }
  }

  /* ---------------- fx ---------------- */

  private drawParticles(g: CanvasRenderingContext2D, dt: number): void {
    this.particles = this.particles.filter((p) => (p.age += dt) < p.life);
    for (const p of this.particles) {
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const lifeT = p.age / p.life;
      g.globalAlpha = Math.max(0, 1 - lifeT);
      if (p.shape === 'ring') {
        g.strokeStyle = p.color;
        g.lineWidth = 3 * (1 - lifeT);
        g.beginPath();
        g.arc(p.x, p.y, p.size + lifeT * 46, 0, Math.PI * 2);
        g.stroke();
      } else if (p.shape === 'glow') {
        g.fillStyle = p.color;
        g.beginPath(); g.arc(p.x, p.y, p.size * (1 + lifeT), 0, Math.PI * 2); g.fill();
      } else if (p.shape === 'star') {
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.age * p.spin);
        g.fillStyle = p.color;
        g.beginPath();
        for (let s = 0; s < 5; s++) {
          const a = (s * Math.PI * 2) / 5 - Math.PI / 2;
          const b = a + Math.PI / 5;
          g.lineTo(Math.cos(a) * p.size, Math.sin(a) * p.size);
          g.lineTo(Math.cos(b) * p.size * 0.45, Math.sin(b) * p.size * 0.45);
        }
        g.closePath();
        g.fill();
        g.restore();
      } else {
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.age * p.spin);
        g.fillStyle = p.color;
        g.fillRect(-p.size / 2, -p.size * 0.35, p.size, p.size * 0.7);
        g.restore();
      }
    }
    g.globalAlpha = 1;
  }

  private drawPopups(g: CanvasRenderingContext2D, w: World, dt: number): void {
    w.popups = w.popups.filter((p) => (p.age += dt) < p.life);
    for (const p of w.popups) {
      const t = p.age / p.life;
      const scale = t < 0.12 ? 0.94 + (t / 0.12) * 0.1 : 1.04 - Math.min(0.04, (t - 0.12) * 0.2);
      g.save();
      g.translate(p.x, p.y - (p.float ? t * 46 : 0));
      g.scale(scale, scale);
      g.globalAlpha = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
      g.font = `900 ${p.size}px system-ui, sans-serif`;
      g.textAlign = 'center';
      g.lineWidth = p.size / 6;
      g.lineJoin = 'round';
      g.strokeStyle = 'rgba(18,20,28,0.85)';
      g.strokeText(p.text, 0, 0);
      g.fillStyle = p.color;
      g.fillText(p.text, 0, 0);
      g.restore();
    }
    g.globalAlpha = 1;
  }

  /** Multiplier heat ramp — art doc §2.2. */
  private drawMultiplier(g: CanvasRenderingContext2D, w: World, dt: number): void {
    const v = w.multiplier!;
    const hot = v >= 100 ? '#FF5A5A' : v >= 25 ? '#FF8A3D' : v >= 5 ? '#FFC53D' : '#FFE9B0';
    const size = Math.min(58, 30 + Math.log10(Math.max(1, v)) * 14);
    const text = `×${v >= 10 ? v.toFixed(1) : v.toFixed(2)}`;
    g.save();
    g.translate(RIDER_X + 6, GROUND_Y - 132 + Math.sin(this.t * 2.4) * 3);
    g.font = `900 ${size}px system-ui, sans-serif`;
    g.textAlign = 'center';
    if (v >= 10) {
      g.shadowColor = hot;
      g.shadowBlur = 20;
    }
    g.lineWidth = size / 6.5;
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(18,20,28,0.92)';
    g.strokeText(text, 0, 0);
    const grad = g.createLinearGradient(0, -size, 0, 4);
    grad.addColorStop(0, '#FFFDF6');
    grad.addColorStop(1, hot);
    g.fillStyle = grad;
    g.fillText(text, 0, 0);
    g.restore();
    // embers off the number at ×10+ (art doc §7)
    if (v >= 10 && Math.random() < dt * 22) {
      this.particles.push({
        x: RIDER_X + 6 + (Math.random() - 0.5) * 70, y: GROUND_Y - 140,
        vx: (Math.random() - 0.5) * 24, vy: -40 - Math.random() * 40,
        age: 0, life: 0.9, size: 2.4, color: hot,
        gravity: -30, shape: 'glow', spin: 0,
      });
    }
  }

  private rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
}

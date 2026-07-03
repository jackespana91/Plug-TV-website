/**
 * Canvas street renderer — art direction doc §2 (Golden Hour Suburbia),
 * §4–§7. Everything is drawn programmatically: no image assets.
 *
 * The scene is a dumb dramatizer: it renders whatever `World` state the
 * director has set. It contains no game or money logic.
 */
import { hash01 } from './presentation';

export const VIEW_W = 960;
export const VIEW_H = 540;
export const GROUND_Y = 430;
export const RIDER_X = 250;
export const HOUSE_SPACING = 460;
/** Screen x at which a house is "delivered to". */
export const DELIVER_X = RIDER_X + 150;

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

interface Particle {
  x: number; y: number; vx: number; vy: number;
  age: number; life: number; size: number; color: string; gravity: number;
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
  paperArc: { t: number; targetX: number; targetY: number; golden: boolean } | null;
  popups: Popup[];
}

export function newWorld(): World {
  return {
    scrollX: 0, speed: 0, pose: 'idle', poseT: 0, bob: 0,
    hazard: null, multiplier: null, vignette: 0, zoom: 1,
    paperArc: null, popups: [],
  };
}

const SIDINGS = ['#E8D5B5', '#B7CADB', '#D89A8E', '#CBBBE0', '#BFD8BE'];
const ROOFS = ['#7A5C50', '#5C5470', '#8A6A55'];

export class Scene {
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private wheelAngle = 0;

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    this.ctx = canvas.getContext('2d')!;
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
        gravity,
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
        gravity: 40,
      });
    }
  }

  render(w: World, dt: number): void {
    const g = this.ctx;
    this.wheelAngle += (w.speed / 26) * dt;

    g.save();
    g.clearRect(0, 0, VIEW_W, VIEW_H);
    if (w.zoom !== 1) {
      g.translate(RIDER_X + 80, GROUND_Y - 60);
      g.scale(w.zoom, w.zoom);
      g.translate(-(RIDER_X + 80), -(GROUND_Y - 60));
    }

    this.drawSky(g);
    this.drawSkyline(g, w.scrollX * 0.25);
    this.drawStreet(g, w);
    if (w.hazard) this.drawHazard(g, w, w.hazard);
    this.drawRider(g, w, dt);
    if (w.paperArc) this.drawPaper(g, w);
    this.drawParticles(g, dt);
    this.drawPopups(g, w, dt);
    if (w.multiplier !== null) this.drawMultiplier(g, w);
    g.restore();

    if (w.vignette > 0) {
      const grad = g.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.75);
      grad.addColorStop(0, 'rgba(20,10,40,0)');
      grad.addColorStop(1, `rgba(20,10,40,${0.65 * w.vignette})`);
      g.fillStyle = grad;
      g.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  private drawSky(g: CanvasRenderingContext2D): void {
    const grad = g.createLinearGradient(0, 0, 0, GROUND_Y);
    grad.addColorStop(0, '#2E4482');
    grad.addColorStop(0.62, '#B06A8C');
    grad.addColorStop(0.88, '#FF9E5E');
    grad.addColorStop(1, '#FFD98A');
    g.fillStyle = grad;
    g.fillRect(0, 0, VIEW_W, GROUND_Y);
    // sun
    const sun = g.createRadialGradient(720, 300, 10, 720, 300, 120);
    sun.addColorStop(0, 'rgba(255,233,196,0.95)');
    sun.addColorStop(1, 'rgba(255,217,138,0)');
    g.fillStyle = sun;
    g.fillRect(560, 160, 320, 280);
  }

  private drawSkyline(g: CanvasRenderingContext2D, offset: number): void {
    g.fillStyle = 'rgba(74,60,110,0.45)';
    const w = 90;
    for (let i = Math.floor(offset / w) - 1; i < Math.floor((offset + VIEW_W) / w) + 1; i++) {
      const h = 30 + hash01(i, 7) * 55;
      const x = i * w - offset;
      g.beginPath();
      g.moveTo(x, 330);
      g.lineTo(x + w * 0.5, 330 - h);
      g.lineTo(x + w, 330);
      g.closePath();
      g.fill();
      g.fillRect(x + w * 0.2, 330 - h * 0.55, w * 0.6, h * 0.55 + 2);
    }
    // tree line
    g.fillStyle = 'rgba(60,80,70,0.5)';
    for (let i = Math.floor(offset / 60) - 1; i < Math.floor((offset + VIEW_W) / 60) + 1; i++) {
      const x = i * 60 - offset;
      const r = 18 + hash01(i, 13) * 16;
      g.beginPath();
      g.arc(x, 332 - r * 0.4, r, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = 'rgba(90,85,102,0.35)';
    g.fillRect(0, 328, VIEW_W, 8);
  }

  private drawStreet(g: CanvasRenderingContext2D, w: World): void {
    // lawns behind sidewalk
    g.fillStyle = '#7CB56B';
    g.fillRect(0, 336, VIEW_W, GROUND_Y - 336 - 40);
    // houses (parallax 1.0)
    const first = Math.floor(w.scrollX / HOUSE_SPACING) - 1;
    const last = Math.floor((w.scrollX + VIEW_W) / HOUSE_SPACING) + 1;
    for (let i = first; i <= last; i++) this.drawHouse(g, i, i * HOUSE_SPACING - w.scrollX);
    // sidewalk
    g.fillStyle = '#B8AFA4';
    g.fillRect(0, GROUND_Y - 40, VIEW_W, 14);
    g.strokeStyle = 'rgba(74,60,110,0.25)';
    g.lineWidth = 2;
    for (let x = -(w.scrollX % 80); x < VIEW_W; x += 80) {
      g.beginPath(); g.moveTo(x, GROUND_Y - 40); g.lineTo(x, GROUND_Y - 26); g.stroke();
    }
    // road
    g.fillStyle = '#5A5566';
    g.fillRect(0, GROUND_Y - 26, VIEW_W, VIEW_H - GROUND_Y + 26);
    g.fillStyle = 'rgba(255,217,138,0.5)';
    for (let x = -(w.scrollX % 120); x < VIEW_W; x += 120) {
      g.fillRect(x, GROUND_Y + 42, 56, 6);
    }
  }

  private drawHouse(g: CanvasRenderingContext2D, i: number, x: number): void {
    const siding = SIDINGS[Math.floor(hash01(i, 1) * SIDINGS.length)];
    const roof = ROOFS[Math.floor(hash01(i, 2) * ROOFS.length)];
    const hw = 190, hh = 120 + hash01(i, 3) * 30;
    const baseY = GROUND_Y - 46;
    // violet shadow toward camera (art doc §2.1)
    g.fillStyle = 'rgba(74,60,110,0.35)';
    g.fillRect(x - 14, baseY - 6, hw + 14, 8);
    // body
    g.fillStyle = siding;
    g.fillRect(x, baseY - hh, hw, hh);
    // roof
    g.fillStyle = roof;
    g.beginPath();
    g.moveTo(x - 16, baseY - hh);
    g.lineTo(x + hw / 2, baseY - hh - 52);
    g.lineTo(x + hw + 16, baseY - hh);
    g.closePath();
    g.fill();
    // door + porch
    g.fillStyle = '#7A5C50';
    g.fillRect(x + hw * 0.42, baseY - 52, 34, 52);
    g.fillStyle = '#8B8378';
    g.fillRect(x + hw * 0.3, baseY - 4, hw * 0.5, 6);
    // warm windows
    g.fillStyle = '#FFD98A';
    g.fillRect(x + 22, baseY - hh + 30, 34, 28);
    g.fillRect(x + hw - 58, baseY - hh + 30, 34, 28);
    g.strokeStyle = 'rgba(74,60,110,0.4)';
    g.lineWidth = 2;
    g.strokeRect(x + 22, baseY - hh + 30, 34, 28);
    g.strokeRect(x + hw - 58, baseY - hh + 30, 34, 28);
    // mailbox at kerb
    g.fillStyle = '#4A5568';
    g.fillRect(x + hw + 34, GROUND_Y - 66, 4, 26);
    g.fillStyle = '#718096';
    g.fillRect(x + hw + 26, GROUND_Y - 74, 20, 12);
    // picket fence between lots
    g.fillStyle = 'rgba(244,241,232,0.85)';
    for (let f = 0; f < 5; f++) g.fillRect(x + hw + 60 + f * 14, GROUND_Y - 62, 6, 20);
  }

  private drawRider(g: CanvasRenderingContext2D, w: World, dt: number): void {
    w.bob += dt * 7;
    const bobY = w.pose === 'ride' ? Math.sin(w.bob) * 2.5 : 0;
    const x = RIDER_X;
    const y = GROUND_Y - 18 + bobY;
    g.save();
    g.translate(x, y);

    if (w.pose === 'tumble') {
      const t = Math.min(1, w.poseT);
      g.rotate(t * Math.PI * 1.5);
      g.translate(0, -t * 8);
    } else if (w.pose === 'wheelie') {
      g.rotate(-0.28 * Math.min(1, w.poseT * 3));
    } else if (w.pose === 'skid') {
      g.rotate(0.18);
    } else if (w.pose === 'tuck') {
      g.translate(0, 4);
    }

    // shadow
    g.fillStyle = 'rgba(74,60,110,0.4)';
    g.beginPath();
    g.ellipse(2, 20, 42, 7, 0, 0, Math.PI * 2);
    g.fill();

    // wheels
    const spin = this.wheelAngle;
    for (const wx of [-26, 26]) {
      g.strokeStyle = '#2A2F42';
      g.lineWidth = 5;
      g.beginPath(); g.arc(wx, 4, 15, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#8B90A3';
      g.lineWidth = 1.5;
      for (let s = 0; s < 4; s++) {
        const a = spin + (s * Math.PI) / 4;
        g.beginPath();
        g.moveTo(wx - Math.cos(a) * 13, 4 - Math.sin(a) * 13);
        g.lineTo(wx + Math.cos(a) * 13, 4 + Math.sin(a) * 13);
        g.stroke();
      }
    }
    // frame
    g.strokeStyle = '#D64545';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(-26, 4); g.lineTo(-6, -14); g.lineTo(18, -14); g.lineTo(26, 4);
    g.moveTo(-6, -14); g.lineTo(2, 2); g.lineTo(-26, 4);
    g.moveTo(22, -20); g.lineTo(18, -14);
    g.stroke();

    const throwT = w.pose === 'throw' ? Math.min(1, w.poseT * 2.5) : 0;
    // body (jacket)
    g.fillStyle = '#3A6BC5';
    g.beginPath();
    g.ellipse(-2, -30, 11, 16, 0.15, 0, Math.PI * 2);
    g.fill();
    // paper bag
    g.fillStyle = '#D9C79E';
    g.beginPath();
    g.ellipse(-14, -22, 9, 11, -0.3, 0, Math.PI * 2);
    g.fill();
    // legs
    g.strokeStyle = '#4A5568';
    g.lineWidth = 5;
    const legA = Math.sin(spin * 0.5);
    g.beginPath();
    g.moveTo(-2, -18); g.lineTo(2 + legA * 6, -2);
    g.moveTo(-2, -18); g.lineTo(-4 - legA * 6, 0);
    g.stroke();
    // arm: on handlebar, or throwing
    g.strokeStyle = '#3A6BC5';
    g.lineWidth = 4.5;
    g.beginPath();
    if (throwT > 0) {
      const aa = -1.9 + throwT * 2.2;
      g.moveTo(0, -36);
      g.lineTo(Math.cos(aa) * 20, -36 + Math.sin(aa) * 20);
    } else {
      g.moveTo(0, -34); g.lineTo(20, -22);
    }
    g.stroke();
    // head + backwards cap
    g.fillStyle = '#F0C49A';
    g.beginPath(); g.arc(4, -48, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#D64545';
    g.beginPath(); g.arc(4, -51, 9, Math.PI * 0.95, Math.PI * 2.02); g.fill();
    g.fillRect(-9, -54, 8, 5);
    // eye
    g.fillStyle = '#2A2F42';
    g.beginPath(); g.arc(8, -48, 1.6, 0, Math.PI * 2); g.fill();

    g.restore();
  }

  private drawPaper(g: CanvasRenderingContext2D, w: World): void {
    const arc = w.paperArc!;
    const t = Math.min(1, arc.t);
    const sx = RIDER_X + 8, sy = GROUND_Y - 62;
    const x = sx + (arc.targetX - sx) * t;
    const y = sy + (arc.targetY - sy) * t - Math.sin(t * Math.PI) * 90;
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
    g.fillRect(-7, -4, 14, 8);
    g.strokeStyle = 'rgba(42,47,66,0.6)';
    g.lineWidth = 1;
    g.strokeRect(-7, -4, 14, 8);
    g.restore();
  }

  private drawHazard(g: CanvasRenderingContext2D, w: World, h: Hazard): void {
    const x = h.worldX - w.scrollX;
    if (x < -150 || x > VIEW_W + 150) return;
    switch (h.kind) {
      case 'dog': this.drawDog(g, h, x); break;
      case 'car': this.drawCar(g, h, x); break;
      case 'skateboard': this.drawSkateboard(g, h, x); break;
      case 'sprinkler': this.drawSprinkler(g, h, x); break;
      case 'trash': this.drawTrash(g, h, x); break;
    }
  }

  private drawDog(g: CanvasRenderingContext2D, h: Hazard, x: number): void {
    let dx = x, dy = GROUND_Y - 8, rot = 0;
    if (h.phase === 'telegraph') {
      // ears over the fence line
      dy = GROUND_Y - 58 + (1 - h.t) * 12;
    } else if (h.phase === 'threat') {
      // closing on the rider from behind
      dx = x - (x - (RIDER_X - 70)) * h.t;
      dy = GROUND_Y - 8;
    } else if (h.phase === 'escaped') {
      // airborne lunge that misses, tumbling behind
      dx = RIDER_X - 70 + h.t * 30 - h.t * h.t * 90;
      dy = GROUND_Y - 8 - Math.sin(Math.min(1, h.t) * Math.PI) * 46;
      rot = h.t * 2.2;
    } else if (h.phase === 'fatal') {
      dx = RIDER_X - 70 + h.t * 60;
      dy = GROUND_Y - 8 - Math.sin(Math.min(1, h.t) * Math.PI) * 30;
    } else return;

    g.save();
    g.translate(dx, dy);
    g.rotate(rot);
    if (h.phase === 'telegraph') {
      g.fillStyle = '#8A6A3B';
      g.beginPath(); g.moveTo(-8, 0); g.lineTo(-4, -12); g.lineTo(0, 0); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(4, 0); g.lineTo(8, -12); g.lineTo(12, 0); g.closePath(); g.fill();
    } else {
      g.fillStyle = 'rgba(74,60,110,0.35)';
      g.beginPath(); g.ellipse(0, dy > GROUND_Y - 20 ? 8 : GROUND_Y - 8 - dy + 8, 24, 5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#8A6A3B';
      g.beginPath(); g.ellipse(0, 0, 20, 11, 0, 0, Math.PI * 2); g.fill(); // body
      g.beginPath(); g.arc(18, -8, 8, 0, Math.PI * 2); g.fill(); // head
      g.beginPath(); g.moveTo(14, -14); g.lineTo(17, -22); g.lineTo(21, -14); g.closePath(); g.fill(); // ear
      // legs galloping
      g.strokeStyle = '#6E522C';
      g.lineWidth = 4;
      const l = Math.sin(h.t * 22) * 6;
      g.beginPath();
      g.moveTo(-12, 8); g.lineTo(-14 - l, 18);
      g.moveTo(10, 8); g.lineTo(12 + l, 18);
      g.stroke();
      // open jaws when lunging
      g.fillStyle = '#F4F1E8';
      g.beginPath(); g.moveTo(24, -8); g.lineTo(30, -11); g.lineTo(30, -5); g.closePath(); g.fill();
      // cool rim when threatening (art doc §5)
      if (h.phase === 'threat') {
        g.strokeStyle = 'rgba(159,212,255,0.8)';
        g.lineWidth = 2;
        g.beginPath(); g.ellipse(0, 0, 21, 12, 0, -2.4, -0.6); g.stroke();
      }
    }
    g.restore();
  }

  private drawCar(g: CanvasRenderingContext2D, h: Hazard, x: number): void {
    let cx = x;
    if (h.phase === 'telegraph') cx = x;
    else if (h.phase === 'threat') cx = x - (x - (RIDER_X + 140)) * h.t;
    else if (h.phase === 'escaped') cx = RIDER_X + 140 - h.t * 480;
    else if (h.phase === 'fatal') cx = RIDER_X + 140 - h.t * 120;
    else return;
    g.save();
    g.translate(cx, GROUND_Y + 6);
    g.fillStyle = 'rgba(74,60,110,0.35)';
    g.beginPath(); g.ellipse(0, 14, 52, 6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#C0392B';
    g.beginPath();
    g.moveTo(-50, 8); g.lineTo(-46, -8); g.lineTo(-24, -10); g.lineTo(-14, -24);
    g.lineTo(22, -24); g.lineTo(34, -10); g.lineTo(50, -8); g.lineTo(50, 8);
    g.closePath(); g.fill();
    g.fillStyle = '#AEE3F5';
    g.fillRect(-12, -21, 30, 12);
    g.fillStyle = '#2A2F42';
    g.beginPath(); g.arc(-30, 8, 10, 0, Math.PI * 2); g.arc(30, 8, 10, 0, Math.PI * 2); g.fill();
    // headlights toward rider
    if (h.phase === 'telegraph' || h.phase === 'threat') {
      g.fillStyle = 'rgba(255,217,138,0.5)';
      g.beginPath();
      g.moveTo(-50, -4); g.lineTo(-110, -14); g.lineTo(-110, 8); g.closePath();
      g.fill();
    }
    g.restore();
  }

  private drawSkateboard(g: CanvasRenderingContext2D, h: Hazard, x: number): void {
    let sx = x;
    if (h.phase === 'threat') sx = x - (x - (RIDER_X + 60)) * h.t;
    else if (h.phase === 'escaped') sx = RIDER_X + 60 - h.t * 260;
    else if (h.phase === 'fatal') sx = RIDER_X + 60 - h.t * 60;
    else if (h.phase === 'gone') return;
    g.save();
    g.translate(sx, GROUND_Y + 12);
    g.fillStyle = '#E0A030';
    g.fillRect(-22, -6, 44, 5);
    g.fillStyle = '#2A2F42';
    g.beginPath(); g.arc(-14, 2, 5, 0, Math.PI * 2); g.arc(14, 2, 5, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  private drawSprinkler(g: CanvasRenderingContext2D, h: Hazard, x: number): void {
    if (h.phase === 'gone') return;
    g.save();
    g.translate(x, GROUND_Y - 44);
    g.fillStyle = '#4A5568';
    g.fillRect(-3, -8, 6, 10);
    const sweep = Math.sin(h.t * 10);
    g.strokeStyle = 'rgba(160,215,245,0.8)';
    g.lineWidth = 2.5;
    for (let j = 0; j < 7; j++) {
      const a = -Math.PI / 2 + sweep * 0.7 + (j - 3) * 0.12;
      g.beginPath();
      g.moveTo(0, -8);
      g.quadraticCurveTo(Math.cos(a) * 30, -8 + Math.sin(a) * 30, Math.cos(a) * 58, -8 + Math.sin(a) * 58 + 26);
      g.stroke();
    }
    if (h.phase === 'escaped' && h.t > 0.3) {
      // 2-frame rainbow (art doc §7)
      const grad = g.createLinearGradient(-30, -40, 30, -40);
      grad.addColorStop(0, 'rgba(255,90,90,0.5)');
      grad.addColorStop(0.5, 'rgba(255,217,138,0.5)');
      grad.addColorStop(1, 'rgba(61,220,107,0.5)');
      g.strokeStyle = grad;
      g.lineWidth = 5;
      g.beginPath();
      g.arc(0, 0, 40, Math.PI, Math.PI * 2);
      g.stroke();
    }
    g.restore();
  }

  private drawTrash(g: CanvasRenderingContext2D, h: Hazard, x: number): void {
    if (h.phase === 'gone') return;
    g.save();
    g.translate(x, GROUND_Y - 32);
    for (const [dx, tip] of [[-20, h.phase === 'fatal'], [8, false]] as [number, boolean][]) {
      g.save();
      g.translate(dx, 0);
      if (tip) g.rotate(0.9 * h.t);
      g.fillStyle = '#6B7280';
      g.fillRect(-10, -22, 20, 30);
      g.fillStyle = '#4A5568';
      g.fillRect(-12, -26, 24, 6);
      g.restore();
    }
    // raccoon eyes (telegraph)
    if (h.phase === 'telegraph') {
      g.fillStyle = '#FFD98A';
      g.beginPath(); g.arc(-24, -12, 2, 0, Math.PI * 2); g.arc(-17, -12, 2, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  private drawParticles(g: CanvasRenderingContext2D, dt: number): void {
    this.particles = this.particles.filter((p) => (p.age += dt) < p.life);
    for (const p of this.particles) {
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      g.globalAlpha = Math.max(0, 1 - p.age / p.life);
      g.fillStyle = p.color;
      g.fillRect(p.x, p.y, p.size, p.size * 0.7);
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
      g.font = `800 ${p.size}px system-ui, sans-serif`;
      g.textAlign = 'center';
      g.lineWidth = p.size / 6;
      g.strokeStyle = 'rgba(18,20,28,0.85)';
      g.strokeText(p.text, 0, 0);
      g.fillStyle = p.color;
      g.fillText(p.text, 0, 0);
      g.restore();
    }
    g.globalAlpha = 1;
  }

  /** Multiplier heat ramp — art doc §2.2. */
  private drawMultiplier(g: CanvasRenderingContext2D, w: World): void {
    const v = w.multiplier!;
    const color = v >= 100 ? '#FF5A5A' : v >= 25 ? '#FF8A3D' : v >= 5 ? '#FFC53D' : '#F4F1E8';
    const size = Math.min(58, 30 + Math.log10(Math.max(1, v)) * 14);
    const text = `×${v >= 10 ? v.toFixed(1) : v.toFixed(2)}`;
    g.save();
    g.translate(RIDER_X + 6, GROUND_Y - 128);
    g.font = `900 ${size}px system-ui, sans-serif`;
    g.textAlign = 'center';
    if (v >= 10) {
      g.shadowColor = color;
      g.shadowBlur = 18;
    }
    g.lineWidth = size / 7;
    g.strokeStyle = 'rgba(18,20,28,0.9)';
    g.strokeText(text, 0, 0);
    g.fillStyle = color;
    g.fillText(text, 0, 0);
    g.restore();
  }
}

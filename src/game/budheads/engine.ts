import { GameAudio } from "./audio";

/**
 * BUDHEADS — a juiced-up arcade catcher.
 * Fixed virtual resolution, letterboxed onto any screen. Everything is drawn
 * procedurally on canvas; no image or audio assets.
 */

export const VIRTUAL_W = 480;
export const VIRTUAL_H = 720;

type GameState = "menu" | "countdown" | "playing" | "paused" | "gameover";

type ItemKind =
  | "bud"
  | "purp"
  | "golden"
  | "rotten"
  | "beetle"
  | "magnet"
  | "clock"
  | "heart";

interface Item {
  kind: ItemKind;
  x: number;
  y: number;
  r: number;
  vy: number;
  wobblePhase: number;
  wobbleAmp: number;
  spin: number;
  spinSpeed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
}

interface Floater {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
  size: number;
}

interface SmokeBlob {
  x: number;
  y: number;
  r: number;
  speed: number;
  alpha: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  twinkle: number;
}

interface HitZone {
  x: number;
  y: number;
  w: number;
  h: number;
  action: () => void;
}

const GOOD_KINDS: ReadonlySet<ItemKind> = new Set([
  "bud",
  "purp",
  "golden",
  "magnet",
  "clock",
  "heart",
]);

const BASE_SCORE: Record<string, number> = { bud: 10, purp: 25, golden: 50 };

export class BudheadsGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audio = new GameAudio();
  private raf = 0;
  private lastTime = 0;
  private elapsed = 0;
  private destroyed = false;

  private state: GameState = "menu";
  private countdownT = 0;

  // Player
  private playerX = VIRTUAL_W / 2;
  private targetX = VIRTUAL_W / 2;
  private keyDir = 0;
  private playerTilt = 0;
  private invincibleT = 0;
  private squashT = 0;

  // Run stats
  private score = 0;
  private best = 0;
  private lives = 3;
  private combo = 0;
  private bestComboThisRun = 0;
  private level = 1;
  private newHighScore = false;

  // Timers / effects
  private spawnT = 0;
  private frenzyT = 0;
  private magnetT = 0;
  private slowmoT = 0;
  private shakeT = 0;
  private shakeMag = 0;
  private flashT = 0;
  private flashColor = "255,255,255";
  private levelUpT = 0;

  private items: Item[] = [];
  private particles: Particle[] = [];
  private floaters: Floater[] = [];
  private smoke: SmokeBlob[] = [];
  private stars: Star[] = [];
  private hitZones: HitZone[] = [];

  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;

  private cleanupFns: Array<() => void> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D unavailable");
    this.ctx = ctx;
    this.best = Number(localStorage.getItem("budheads.best") ?? 0);

    for (let i = 0; i < 7; i++) {
      this.smoke.push({
        x: Math.random() * VIRTUAL_W,
        y: Math.random() * VIRTUAL_H,
        r: 60 + Math.random() * 90,
        speed: 4 + Math.random() * 8,
        alpha: 0.03 + Math.random() * 0.05,
      });
    }
    for (let i = 0; i < 40; i++) {
      this.stars.push({
        x: Math.random() * VIRTUAL_W,
        y: Math.random() * VIRTUAL_H * 0.8,
        size: 0.5 + Math.random() * 1.5,
        twinkle: Math.random() * Math.PI * 2,
      });
    }

    this.bindEvents();
    this.resize();
    this.lastTime = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.cleanupFns.forEach((fn) => fn());
  }

  // ---------------------------------------------------------------- events

  private on<K extends keyof WindowEventMap>(
    target: Window,
    type: K,
    fn: (ev: WindowEventMap[K]) => void
  ): void;
  private on<K extends keyof HTMLElementEventMap>(
    target: HTMLElement,
    type: K,
    fn: (ev: HTMLElementEventMap[K]) => void
  ): void;
  private on(
    target: Window | HTMLElement,
    type: string,
    fn: (ev: Event) => void
  ) {
    target.addEventListener(type, fn as EventListener);
    this.cleanupFns.push(() => target.removeEventListener(type, fn as EventListener));
  }

  private bindEvents() {
    this.on(window, "resize", () => this.resize());

    this.on(this.canvas, "pointerdown", (e) => {
      e.preventDefault();
      this.audio.unlock();
      const { x, y } = this.toVirtual(e.clientX, e.clientY);
      for (const zone of this.hitZones) {
        if (x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h) {
          zone.action();
          return;
        }
      }
      if (this.state === "menu" || this.state === "gameover") this.startRun();
      else if (this.state === "paused") this.state = "playing";
      else if (this.state === "playing") this.targetX = x;
    });

    this.on(this.canvas, "pointermove", (e) => {
      if (this.state !== "playing") return;
      if (e.pointerType === "mouse" && e.buttons === 0) return;
      const { x } = this.toVirtual(e.clientX, e.clientY);
      this.targetX = x;
    });

    // Mouse players steer without holding the button — feels better.
    this.on(this.canvas, "mousemove", (e) => {
      if (this.state !== "playing") return;
      const { x } = this.toVirtual(e.clientX, e.clientY);
      this.targetX = x;
    });

    this.on(window, "keydown", (e) => {
      if (e.repeat) return;
      this.audio.unlock();
      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          this.keyDir = -1;
          break;
        case "ArrowRight":
        case "d":
        case "D":
          this.keyDir = 1;
          break;
        case " ":
        case "Enter":
          e.preventDefault();
          if (this.state === "menu" || this.state === "gameover") this.startRun();
          else if (this.state === "paused") this.state = "playing";
          break;
        case "p":
        case "P":
        case "Escape":
          if (this.state === "playing") this.state = "paused";
          else if (this.state === "paused") this.state = "playing";
          break;
        case "m":
        case "M":
          this.audio.toggleMute();
          break;
      }
    });

    this.on(window, "keyup", (e) => {
      if (
        ((e.key === "ArrowLeft" || e.key === "a" || e.key === "A") && this.keyDir === -1) ||
        ((e.key === "ArrowRight" || e.key === "d" || e.key === "D") && this.keyDir === 1)
      ) {
        this.keyDir = 0;
      }
    });

    this.on(window, "blur", () => {
      if (this.state === "playing") this.state = "paused";
    });
  }

  private toVirtual(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - this.offsetX / (window.devicePixelRatio || 1)) / (this.scale / (window.devicePixelRatio || 1)),
      y: (clientY - rect.top - this.offsetY / (window.devicePixelRatio || 1)) / (this.scale / (window.devicePixelRatio || 1)),
    };
  }

  private resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const cssW = parent.clientWidth;
    const cssH = parent.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = cssW * dpr;
    this.canvas.height = cssH * dpr;
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.scale = Math.min((cssW * dpr) / VIRTUAL_W, (cssH * dpr) / VIRTUAL_H);
    this.offsetX = (cssW * dpr - VIRTUAL_W * this.scale) / 2;
    this.offsetY = (cssH * dpr - VIRTUAL_H * this.scale) / 2;
  }

  // ------------------------------------------------------------- run state

  private startRun() {
    this.audio.click();
    this.score = 0;
    this.lives = 3;
    this.combo = 0;
    this.bestComboThisRun = 0;
    this.level = 1;
    this.newHighScore = false;
    this.items = [];
    this.particles = [];
    this.floaters = [];
    this.frenzyT = 0;
    this.magnetT = 0;
    this.slowmoT = 0;
    this.invincibleT = 0;
    this.spawnT = 0;
    this.playerX = VIRTUAL_W / 2;
    this.targetX = VIRTUAL_W / 2;
    this.state = "countdown";
    this.countdownT = 3;
    this.audio.countdown(false);
  }

  private endRun() {
    this.state = "gameover";
    if (this.score > this.best) {
      this.best = this.score;
      this.newHighScore = true;
      localStorage.setItem("budheads.best", String(this.best));
      this.audio.highScore();
      this.burstConfetti();
    } else {
      this.audio.gameOver();
    }
  }

  private get multiplier() {
    return Math.min(10, 1 + Math.floor(this.combo / 8));
  }

  // --------------------------------------------------------------- spawning

  private pickKind(): ItemKind {
    if (this.frenzyT > 0) return Math.random() < 0.9 ? "bud" : "purp";
    const lvl = this.level;
    const table: Array<[ItemKind, number]> = [
      ["bud", 58],
      ["purp", 10 + Math.min(6, lvl)],
      ["golden", 2.5],
      ["rotten", 8 + Math.min(10, lvl * 1.5)],
      ["beetle", lvl >= 3 ? 4 + Math.min(8, lvl) : 0],
      ["magnet", 2.5],
      ["clock", 2.5],
      ["heart", this.lives < 3 ? 1.6 : 0.7],
    ];
    const total = table.reduce((sum, [, w]) => sum + w, 0);
    let roll = Math.random() * total;
    for (const [kind, w] of table) {
      roll -= w;
      if (roll <= 0) return kind;
    }
    return "bud";
  }

  private spawnItem() {
    const kind = this.pickKind();
    const r = kind === "golden" ? 20 : kind === "heart" ? 15 : 17;
    const speedBase = 130 + this.level * 16;
    const speedJitter = 0.8 + Math.random() * 0.5;
    const kindSpeed = kind === "beetle" ? 1.25 : kind === "golden" ? 1.15 : 1;
    this.items.push({
      kind,
      x: 30 + Math.random() * (VIRTUAL_W - 60),
      y: -30,
      r,
      vy: speedBase * speedJitter * kindSpeed * (this.frenzyT > 0 ? 1.3 : 1),
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleAmp: kind === "beetle" ? 80 : 6 + Math.random() * 10,
      spin: Math.random() * Math.PI * 2,
      spinSpeed: (Math.random() - 0.5) * 3,
    });
  }

  // ----------------------------------------------------------------- update

  private loop = (now: number) => {
    if (this.destroyed) return;
    const dt = Math.min(0.033, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.elapsed += dt;
    this.update(dt);
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    // Ambient background always animates.
    for (const blob of this.smoke) {
      blob.y -= blob.speed * dt;
      if (blob.y < -blob.r) {
        blob.y = VIRTUAL_H + blob.r;
        blob.x = Math.random() * VIRTUAL_W;
      }
    }

    if (this.state === "countdown") {
      const prev = Math.ceil(this.countdownT);
      this.countdownT -= dt;
      const cur = Math.ceil(this.countdownT);
      if (cur !== prev && cur > 0) this.audio.countdown(false);
      if (this.countdownT <= 0) {
        this.state = "playing";
        this.audio.countdown(true);
      }
    }

    if (this.state !== "playing") {
      this.updateEffects(dt);
      return;
    }

    const timeScale = this.slowmoT > 0 ? 0.55 : 1;

    // Player movement: keyboard leads the target ahead of the player so the
    // easing below produces a steady ~600px/s glide; pointer sets it directly.
    if (this.keyDir !== 0) {
      this.targetX = this.playerX + this.keyDir * 44;
    }
    this.targetX = Math.max(40, Math.min(VIRTUAL_W - 40, this.targetX));
    const prevX = this.playerX;
    this.playerX += (this.targetX - this.playerX) * Math.min(1, dt * 14);
    this.playerTilt = Math.max(-0.35, Math.min(0.35, (this.playerX - prevX) * 0.02));

    // Timers
    this.frenzyT = Math.max(0, this.frenzyT - dt);
    this.magnetT = Math.max(0, this.magnetT - dt);
    this.slowmoT = Math.max(0, this.slowmoT - dt);
    this.invincibleT = Math.max(0, this.invincibleT - dt);
    this.squashT = Math.max(0, this.squashT - dt);

    // Spawning
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnItem();
      const interval =
        this.frenzyT > 0 ? 0.09 : Math.max(0.32, 0.85 - this.level * 0.045);
      this.spawnT = interval * (0.7 + Math.random() * 0.6);
    }

    // Items
    const catchY = VIRTUAL_H - 92;
    const halfCatch = 46;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.wobblePhase += dt * (item.kind === "beetle" ? 3.2 : 2);
      item.spin += item.spinSpeed * dt;
      item.y += item.vy * timeScale * dt;
      if (item.kind === "beetle") {
        item.x += Math.sin(item.wobblePhase) * item.wobbleAmp * dt;
        item.x = Math.max(20, Math.min(VIRTUAL_W - 20, item.x));
      } else {
        item.x += Math.sin(item.wobblePhase) * item.wobbleAmp * dt * 0.4;
      }

      // Magnet pull on good items
      if (this.magnetT > 0 && GOOD_KINDS.has(item.kind)) {
        const dx = this.playerX - item.x;
        const dy = catchY - item.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 190) {
          item.x += (dx / dist) * 340 * dt;
          item.y += (dy / dist) * 200 * dt;
        }
      }

      // Catch check
      const inX = Math.abs(item.x - this.playerX) < halfCatch + item.r * 0.4;
      const inY = item.y > catchY - 18 && item.y < catchY + 34;
      if (inX && inY) {
        this.items.splice(i, 1);
        this.onCatch(item);
        continue;
      }

      // Fell off screen
      if (item.y > VIRTUAL_H + 40) {
        this.items.splice(i, 1);
        if (GOOD_KINDS.has(item.kind) && item.kind !== "heart") {
          if (this.combo >= 8) this.audio.miss();
          this.combo = 0;
        }
      }
    }

    // Level from score
    const newLevel = Math.floor(this.score / 400) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      this.levelUpT = 1.6;
      this.audio.levelUp();
      this.addFloater(VIRTUAL_W / 2, VIRTUAL_H * 0.4, `LEVEL ${this.level}`, "#facc15", 30);
    }

    this.updateEffects(dt);
  }

  private updateEffects(dt: number) {
    this.shakeT = Math.max(0, this.shakeT - dt);
    this.flashT = Math.max(0, this.flashT - dt);
    this.levelUpT = Math.max(0, this.levelUpT - dt);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life -= dt;
      f.y -= 46 * dt;
      if (f.life <= 0) this.floaters.splice(i, 1);
    }
  }

  private onCatch(item: Item) {
    switch (item.kind) {
      case "bud":
      case "purp":
      case "golden": {
        this.combo++;
        this.bestComboThisRun = Math.max(this.bestComboThisRun, this.combo);
        const frenzyBonus = this.frenzyT > 0 ? 2 : 1;
        const points = BASE_SCORE[item.kind] * this.multiplier * frenzyBonus;
        this.score += points;
        this.squashT = 0.18;
        this.audio.catch(this.combo);
        const color =
          item.kind === "golden" ? "#facc15" : item.kind === "purp" ? "#c084fc" : "#4ade80";
        this.addFloater(item.x, item.y - 10, `+${points}`, color, item.kind === "golden" ? 26 : 20);
        this.burst(item.x, item.y, color, item.kind === "golden" ? 26 : 12);
        if (item.kind === "golden") {
          this.frenzyT = 5;
          this.audio.golden();
          this.flash("250,204,21", 0.35);
          this.addFloater(VIRTUAL_W / 2, VIRTUAL_H * 0.35, "FRENZY!", "#facc15", 34);
        }
        break;
      }
      case "magnet":
        this.magnetT = 6;
        this.audio.powerup();
        this.addFloater(item.x, item.y - 10, "MAGNET", "#38bdf8", 22);
        this.burst(item.x, item.y, "#38bdf8", 14);
        break;
      case "clock":
        this.slowmoT = 5;
        this.audio.powerup();
        this.addFloater(item.x, item.y - 10, "SLOW-MO", "#a5b4fc", 22);
        this.burst(item.x, item.y, "#a5b4fc", 14);
        break;
      case "heart":
        if (this.lives < 5) this.lives++;
        this.audio.powerup();
        this.addFloater(item.x, item.y - 10, "+1 LIFE", "#fb7185", 22);
        this.burst(item.x, item.y, "#fb7185", 14);
        break;
      case "rotten":
      case "beetle":
        this.onHit();
        break;
    }
  }

  private onHit() {
    if (this.invincibleT > 0) return;
    this.lives--;
    this.combo = 0;
    this.invincibleT = 1.2;
    this.shakeT = 0.4;
    this.shakeMag = 10;
    this.flash("248,113,113", 0.3);
    this.audio.hurt();
    navigator.vibrate?.(90);
    this.burst(this.playerX, VIRTUAL_H - 92, "#f87171", 18);
    if (this.lives <= 0) this.endRun();
  }

  // ---------------------------------------------------------------- effects

  private burst(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 200;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        life: 0.4 + Math.random() * 0.5,
        maxLife: 0.9,
        size: 2 + Math.random() * 4,
        color,
        gravity: 300,
      });
    }
  }

  private burstConfetti() {
    const colors = ["#4ade80", "#c084fc", "#facc15", "#38bdf8", "#fb7185"];
    for (let i = 0; i < 120; i++) {
      this.particles.push({
        x: Math.random() * VIRTUAL_W,
        y: -10 - Math.random() * 200,
        vx: (Math.random() - 0.5) * 80,
        vy: 80 + Math.random() * 160,
        life: 1.6 + Math.random() * 1.6,
        maxLife: 3,
        size: 3 + Math.random() * 5,
        color: colors[i % colors.length],
        gravity: 40,
      });
    }
  }

  private addFloater(x: number, y: number, text: string, color: string, size: number) {
    this.floaters.push({ x, y, text, life: 1, color, size });
  }

  private flash(rgb: string, duration: number) {
    this.flashColor = rgb;
    this.flashT = duration;
  }

  // ---------------------------------------------------------------- drawing

  private render() {
    const { ctx } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#08080c";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeT > 0) {
      shakeX = (Math.random() - 0.5) * this.shakeMag * (this.shakeT / 0.4) * this.scale;
      shakeY = (Math.random() - 0.5) * this.shakeMag * (this.shakeT / 0.4) * this.scale;
    }
    ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX + shakeX, this.offsetY + shakeY);

    this.hitZones = [];
    this.drawBackground();

    if (this.state === "menu") {
      this.drawMenu();
    } else {
      this.drawItems();
      this.drawPlayer();
      this.drawParticles();
      this.drawFloaters();
      this.drawHud();
      if (this.state === "countdown") this.drawCountdown();
      if (this.state === "paused") this.drawPaused();
      if (this.state === "gameover") this.drawGameOver();
    }

    // Full-screen flash
    if (this.flashT > 0) {
      ctx.fillStyle = `rgba(${this.flashColor},${(this.flashT * 0.9).toFixed(3)})`;
      ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    }
  }

  private drawBackground() {
    const { ctx } = this;
    const frenzy = this.frenzyT > 0;
    const grad = ctx.createLinearGradient(0, 0, 0, VIRTUAL_H);
    if (frenzy) {
      const hue = (this.elapsed * 120) % 360;
      grad.addColorStop(0, `hsl(${hue} 45% 12%)`);
      grad.addColorStop(1, "hsl(240 20% 6%)");
    } else {
      grad.addColorStop(0, "hsl(258 40% 10%)");
      grad.addColorStop(1, "hsl(240 25% 5%)");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);

    for (const star of this.stars) {
      const a = 0.25 + 0.5 * Math.abs(Math.sin(this.elapsed * 1.4 + star.twinkle));
      ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }

    for (const blob of this.smoke) {
      const g = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.r);
      g.addColorStop(0, `rgba(120,200,140,${blob.alpha})`);
      g.addColorStop(1, "rgba(120,200,140,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(blob.x, blob.y, blob.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ground
    ctx.fillStyle = "hsl(250 25% 9%)";
    ctx.fillRect(0, VIRTUAL_H - 56, VIRTUAL_W, 56);
    ctx.fillStyle = "hsl(142 60% 30% / 0.35)";
    ctx.fillRect(0, VIRTUAL_H - 56, VIRTUAL_W, 3);

    if (this.slowmoT > 0) {
      ctx.fillStyle = `rgba(165,180,252,${(0.05 + 0.03 * Math.sin(this.elapsed * 6)).toFixed(3)})`;
      ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    }
  }

  private drawBud(x: number, y: number, r: number, spin: number, palette: [string, string, string]) {
    const { ctx } = this;
    const [dark, mid, light] = palette;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spin * 0.3);
    // cluster
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = mid;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(-r * 0.2, -r * 0.25, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
    // pistil hairs
    ctx.strokeStyle = "rgba(255,160,60,0.85)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5);
      ctx.lineTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95);
      ctx.stroke();
    }
    // leaf on top
    ctx.fillStyle = mid;
    ctx.beginPath();
    ctx.ellipse(0, -r * 1.05, r * 0.18, r * 0.45, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawItems() {
    const { ctx } = this;
    for (const item of this.items) {
      switch (item.kind) {
        case "bud":
          this.drawBud(item.x, item.y, item.r, item.spin, ["#166534", "#22c55e", "#4ade80"]);
          break;
        case "purp":
          this.drawBud(item.x, item.y, item.r, item.spin, ["#581c87", "#9333ea", "#c084fc"]);
          break;
        case "golden": {
          const glow = ctx.createRadialGradient(item.x, item.y, 0, item.x, item.y, item.r * 2.2);
          glow.addColorStop(0, "rgba(250,204,21,0.5)");
          glow.addColorStop(1, "rgba(250,204,21,0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(item.x, item.y, item.r * 2.2, 0, Math.PI * 2);
          ctx.fill();
          this.drawBud(item.x, item.y, item.r, item.spin, ["#a16207", "#eab308", "#fde047"]);
          // sparkle
          const s = 3 + 2 * Math.sin(this.elapsed * 8 + item.wobblePhase);
          ctx.fillStyle = "#fff";
          ctx.save();
          ctx.translate(item.x + item.r, item.y - item.r);
          ctx.rotate(this.elapsed * 2);
          ctx.fillRect(-s / 2, -1, s, 2);
          ctx.fillRect(-1, -s / 2, 2, s);
          ctx.restore();
          break;
        }
        case "rotten": {
          this.drawBud(item.x, item.y, item.r, item.spin, ["#3f3f2e", "#57534e", "#78716c"]);
          // X eyes + stink lines
          ctx.strokeStyle = "#facc15";
          ctx.lineWidth = 2;
          for (const side of [-1, 1]) {
            const ex = item.x + side * 6;
            const ey = item.y - 2;
            ctx.beginPath();
            ctx.moveTo(ex - 3, ey - 3);
            ctx.lineTo(ex + 3, ey + 3);
            ctx.moveTo(ex + 3, ey - 3);
            ctx.lineTo(ex - 3, ey + 3);
            ctx.stroke();
          }
          ctx.strokeStyle = "rgba(163,230,53,0.5)";
          ctx.lineWidth = 1.5;
          for (const side of [-1, 0, 1]) {
            const wx = item.x + side * 8;
            const wave = Math.sin(this.elapsed * 6 + side) * 3;
            ctx.beginPath();
            ctx.moveTo(wx, item.y - item.r - 4);
            ctx.quadraticCurveTo(wx + wave, item.y - item.r - 12, wx, item.y - item.r - 20);
            ctx.stroke();
          }
          break;
        }
        case "beetle": {
          ctx.save();
          ctx.translate(item.x, item.y);
          ctx.rotate(Math.sin(item.wobblePhase) * 0.3);
          ctx.fillStyle = "#7f1d1d";
          ctx.beginPath();
          ctx.ellipse(0, 0, item.r * 0.8, item.r, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#dc2626";
          ctx.beginPath();
          ctx.ellipse(0, 2, item.r * 0.65, item.r * 0.8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#450a0a";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -item.r * 0.8);
          ctx.lineTo(0, item.r);
          ctx.stroke();
          ctx.fillStyle = "#450a0a";
          for (const [sx, sy] of [[-5, -2], [4, 3], [-3, 7], [6, -5]] as const) {
            ctx.beginPath();
            ctx.arc(sx, sy, 2, 0, Math.PI * 2);
            ctx.fill();
          }
          // wings flutter
          const flap = Math.abs(Math.sin(this.elapsed * 20));
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.ellipse(side * item.r * 0.7, -item.r * 0.5, item.r * 0.5, item.r * 0.28 * (0.4 + flap), side * 0.6, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          break;
        }
        case "magnet": {
          ctx.save();
          ctx.translate(item.x, item.y);
          ctx.rotate(Math.sin(item.spin) * 0.4);
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 8;
          ctx.lineCap = "butt";
          ctx.beginPath();
          ctx.arc(0, -2, 11, Math.PI, 0, false);
          ctx.stroke();
          ctx.strokeStyle = "#e0f2fe";
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.moveTo(-11, -2);
          ctx.lineTo(-11, 8);
          ctx.moveTo(11, -2);
          ctx.lineTo(11, 8);
          ctx.stroke();
          ctx.restore();
          break;
        }
        case "clock": {
          ctx.fillStyle = "#e0e7ff";
          ctx.beginPath();
          ctx.arc(item.x, item.y, item.r * 0.9, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#6366f1";
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.strokeStyle = "#312e81";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(item.x, item.y);
          ctx.lineTo(item.x, item.y - item.r * 0.55);
          ctx.moveTo(item.x, item.y);
          ctx.lineTo(item.x + item.r * 0.45 * Math.cos(this.elapsed * 4), item.y + item.r * 0.45 * Math.sin(this.elapsed * 4));
          ctx.stroke();
          break;
        }
        case "heart": {
          const pulse = 1 + 0.12 * Math.sin(this.elapsed * 6);
          ctx.save();
          ctx.translate(item.x, item.y);
          ctx.scale(pulse, pulse);
          this.pathHeart(0, 0, item.r);
          ctx.fillStyle = "#fb7185";
          ctx.fill();
          ctx.restore();
          break;
        }
      }
    }
  }

  private pathHeart(x: number, y: number, size: number) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.35);
    ctx.bezierCurveTo(x - size, y - size * 0.55, x - size * 0.5, y - size * 1.1, x, y - size * 0.35);
    ctx.bezierCurveTo(x + size * 0.5, y - size * 1.1, x + size, y - size * 0.55, x, y + size * 0.35);
    ctx.closePath();
  }

  /** Buddy: a grinning bud-head carrying a glass stash jar. */
  private drawPlayer() {
    const { ctx } = this;
    if (this.state === "gameover") return;
    if (this.invincibleT > 0 && Math.floor(this.elapsed * 12) % 2 === 0) return;

    const x = this.playerX;
    const groundY = VIRTUAL_H - 56;
    const squash = this.squashT > 0 ? 1 + this.squashT * 0.9 : 1;

    ctx.save();
    ctx.translate(x, groundY);
    ctx.rotate(this.playerTilt);
    ctx.scale(squash, 1 / squash);

    // Magnet aura
    if (this.magnetT > 0) {
      const a = 0.12 + 0.06 * Math.sin(this.elapsed * 8);
      ctx.fillStyle = `rgba(56,189,248,${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(0, -36, 88, 0, Math.PI * 2);
      ctx.fill();
    }

    // Jar (catch basket)
    const jarW = 92;
    const jarH = 46;
    ctx.fillStyle = "rgba(190,242,255,0.16)";
    ctx.strokeStyle = "rgba(190,242,255,0.75)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-jarW / 2, -jarH, jarW, jarH, [4, 4, 12, 12]);
    ctx.fill();
    ctx.stroke();
    // Combo fill level inside the jar
    const fill = Math.min(1, this.combo / 24);
    if (fill > 0) {
      ctx.fillStyle = "rgba(74,222,128,0.45)";
      ctx.beginPath();
      ctx.roundRect(-jarW / 2 + 3, -jarH * fill * 0.9 - 3, jarW - 6, jarH * fill * 0.9, [2, 2, 9, 9]);
      ctx.fill();
    }
    // Jar mouth highlight
    ctx.strokeStyle = this.frenzyT > 0 ? "#facc15" : "#4ade80";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-jarW / 2, -jarH);
    ctx.lineTo(jarW / 2, -jarH);
    ctx.stroke();

    // Bud head above the jar
    const headY = -jarH - 26;
    ctx.fillStyle = "#166534";
    ctx.beginPath();
    ctx.arc(0, headY, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#22c55e";
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + this.elapsed * 0.4;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 13, headY + Math.sin(a) * 13, 11, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#4ade80";
    ctx.beginPath();
    ctx.arc(-5, headY - 6, 12, 0, Math.PI * 2);
    ctx.fill();
    // Leaf sprout
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.ellipse(-4, headY - 28, 4, 10, -0.5, 0, Math.PI * 2);
    ctx.ellipse(4, headY - 28, 4, 10, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Shades + grin
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.roundRect(-16, headY - 6, 13, 9, 3);
    ctx.roundRect(3, headY - 6, 13, 9, 3);
    ctx.fill();
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-3, headY - 2);
    ctx.lineTo(3, headY - 2);
    ctx.stroke();
    ctx.strokeStyle = "#052e16";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, headY + 8, 9, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    ctx.restore();
  }

  private drawParticles() {
    const { ctx } = this;
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  private drawFloaters() {
    const { ctx } = this;
    for (const f of this.floaters) {
      ctx.globalAlpha = Math.min(1, f.life * 2);
      ctx.font = `700 ${f.size}px 'Bungee', sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = f.color;
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 4;
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  private drawHud() {
    const { ctx } = this;

    // Score
    ctx.textAlign = "center";
    ctx.font = "700 36px 'Bungee', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.lineWidth = 5;
    ctx.strokeText(String(this.score), VIRTUAL_W / 2, 52);
    ctx.fillText(String(this.score), VIRTUAL_W / 2, 52);
    ctx.font = "500 12px 'Space Grotesk', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillText(`BEST ${Math.max(this.best, this.score)}`, VIRTUAL_W / 2, 70);

    // Lives
    for (let i = 0; i < this.lives; i++) {
      this.pathHeart(26 + i * 26, 34, 10);
      ctx.fillStyle = "#fb7185";
      ctx.fill();
    }

    // Level chip
    ctx.textAlign = "right";
    ctx.font = "700 16px 'Bungee', sans-serif";
    ctx.fillStyle = this.levelUpT > 0 ? "#facc15" : "rgba(255,255,255,0.85)";
    ctx.fillText(`LV ${this.level}`, VIRTUAL_W - 18, 38);

    // Combo meter
    if (this.combo > 1) {
      const mult = this.multiplier;
      const progress = (this.combo % 8) / 8;
      const barW = 150;
      const bx = VIRTUAL_W / 2 - barW / 2;
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath();
      ctx.roundRect(bx, 82, barW, 8, 4);
      ctx.fill();
      ctx.fillStyle = mult >= 10 ? "#facc15" : "#4ade80";
      ctx.beginPath();
      ctx.roundRect(bx, 82, barW * (mult >= 10 ? 1 : progress), 8, 4);
      ctx.fill();
      ctx.textAlign = "center";
      ctx.font = "700 15px 'Bungee', sans-serif";
      ctx.fillStyle = mult >= 10 ? "#facc15" : "#4ade80";
      ctx.fillText(`x${mult} COMBO ${this.combo}`, VIRTUAL_W / 2, 110);
    }

    // Active power-up chips
    let chipY = 132;
    const chip = (label: string, t: number, max: number, color: string) => {
      const w = 118;
      const x = VIRTUAL_W - w - 14;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.beginPath();
      ctx.roundRect(x, chipY, w, 22, 11);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, chipY, w * Math.min(1, t / max), 22, 11);
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.textAlign = "center";
      ctx.font = "700 11px 'Bungee', sans-serif";
      ctx.fillStyle = color;
      ctx.fillText(label, x + w / 2, chipY + 15);
      chipY += 28;
    };
    if (this.frenzyT > 0) chip(`FRENZY ${this.frenzyT.toFixed(1)}`, this.frenzyT, 5, "#facc15");
    if (this.magnetT > 0) chip(`MAGNET ${this.magnetT.toFixed(1)}`, this.magnetT, 6, "#38bdf8");
    if (this.slowmoT > 0) chip(`SLOW-MO ${this.slowmoT.toFixed(1)}`, this.slowmoT, 5, "#a5b4fc");

    // Pause + mute buttons
    this.drawIconButton(VIRTUAL_W - 40, 66, "pause");
    this.drawIconButton(VIRTUAL_W - 78, 66, "mute");
  }

  private drawIconButton(cx: number, cy: number, kind: "pause" | "mute") {
    const { ctx } = this;
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.arc(cx, cy, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    if (kind === "pause") {
      if (this.state === "paused") {
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy - 6);
        ctx.lineTo(cx + 7, cy);
        ctx.lineTo(cx - 4, cy + 6);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(cx - 5, cy - 6, 4, 12);
        ctx.fillRect(cx + 1, cy - 6, 4, 12);
      }
      this.hitZones.push({
        x: cx - 20,
        y: cy - 20,
        w: 40,
        h: 40,
        action: () => {
          if (this.state === "playing") this.state = "paused";
          else if (this.state === "paused") this.state = "playing";
        },
      });
    } else {
      // speaker
      ctx.beginPath();
      ctx.moveTo(cx - 7, cy - 3);
      ctx.lineTo(cx - 3, cy - 3);
      ctx.lineTo(cx + 2, cy - 7);
      ctx.lineTo(cx + 2, cy + 7);
      ctx.lineTo(cx - 3, cy + 3);
      ctx.lineTo(cx - 7, cy + 3);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 2;
      if (this.audio.muted) {
        ctx.beginPath();
        ctx.moveTo(cx + 5, cy - 5);
        ctx.lineTo(cx + 10, cy + 5);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(cx + 4, cy, 5, -0.7, 0.7);
        ctx.stroke();
      }
      this.hitZones.push({
        x: cx - 20,
        y: cy - 20,
        w: 40,
        h: 40,
        action: () => this.audio.toggleMute(),
      });
    }
  }

  private drawTitle(y: number) {
    const { ctx } = this;
    const title = "BUDHEADS";
    ctx.textAlign = "center";
    const letterW = 42;
    const startX = VIRTUAL_W / 2 - ((title.length - 1) * letterW) / 2;
    for (let i = 0; i < title.length; i++) {
      const bounce = Math.sin(this.elapsed * 3 + i * 0.55) * 7;
      const hue = 130 + Math.sin(this.elapsed * 1.2 + i * 0.7) * 18;
      ctx.font = "700 52px 'Bungee', sans-serif";
      ctx.fillStyle = `hsl(${hue} 75% 55%)`;
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 8;
      ctx.strokeText(title[i], startX + i * letterW, y + bounce);
      ctx.fillText(title[i], startX + i * letterW, y + bounce);
    }
  }

  private drawMenu() {
    const { ctx } = this;

    // Ambient buds drifting down behind the menu text.
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 6; i++) {
      const speed = 26 + (i % 3) * 14;
      const y = ((this.elapsed * speed + i * 137) % (VIRTUAL_H + 80)) - 40;
      const x = 60 + ((i * 173) % (VIRTUAL_W - 120)) + Math.sin(this.elapsed + i * 2) * 16;
      const palette: [string, string, string] =
        i % 3 === 2 ? ["#581c87", "#9333ea", "#c084fc"] : ["#166534", "#22c55e", "#4ade80"];
      this.drawBud(x, y, 12, this.elapsed * 0.6 + i, palette);
    }
    ctx.globalAlpha = 1;

    this.drawTitle(200);

    ctx.textAlign = "center";
    ctx.font = "500 15px 'Space Grotesk', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("Catch the harvest · Stack the combo · Dodge the rot", VIRTUAL_W / 2, 240);

    // Buddy idles center stage
    this.playerX = VIRTUAL_W / 2 + Math.sin(this.elapsed * 1.5) * 30;
    this.drawPlayer();

    // Pulsing start prompt
    const pulse = 0.65 + 0.35 * Math.sin(this.elapsed * 4);
    ctx.font = "700 26px 'Bungee', sans-serif";
    ctx.fillStyle = `rgba(74,222,128,${pulse.toFixed(3)})`;
    ctx.fillText("TAP TO START", VIRTUAL_W / 2, 380);

    if (this.best > 0) {
      ctx.font = "700 17px 'Bungee', sans-serif";
      ctx.fillStyle = "#facc15";
      ctx.fillText(`BEST SCORE  ${this.best}`, VIRTUAL_W / 2, 425);
    }

    ctx.font = "500 13px 'Space Grotesk', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText("Move: drag / mouse / ← → · Pause: P · Mute: M", VIRTUAL_W / 2, 470);

    this.drawIconButton(VIRTUAL_W - 40, 40, "mute");
  }

  private drawCountdown() {
    const { ctx } = this;
    const n = Math.ceil(this.countdownT);
    const frac = 1 - (this.countdownT - Math.floor(this.countdownT));
    ctx.save();
    ctx.translate(VIRTUAL_W / 2, VIRTUAL_H / 2 - 40);
    ctx.scale(0.6 + frac * 0.8, 0.6 + frac * 0.8);
    ctx.globalAlpha = 1 - frac * 0.4;
    ctx.textAlign = "center";
    ctx.font = "700 96px 'Bungee', sans-serif";
    ctx.fillStyle = "#4ade80";
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.lineWidth = 10;
    ctx.strokeText(String(n), 0, 0);
    ctx.fillText(String(n), 0, 0);
    ctx.restore();
  }

  private drawPaused() {
    const { ctx } = this;
    ctx.fillStyle = "rgba(5,5,10,0.72)";
    ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);
    ctx.textAlign = "center";
    ctx.font = "700 44px 'Bungee', sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText("PAUSED", VIRTUAL_W / 2, VIRTUAL_H / 2 - 20);
    ctx.font = "500 15px 'Space Grotesk', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillText("Tap or press P to resume", VIRTUAL_W / 2, VIRTUAL_H / 2 + 20);
    this.drawIconButton(VIRTUAL_W - 40, 66, "pause");
    this.drawIconButton(VIRTUAL_W - 78, 66, "mute");
  }

  private drawGameOver() {
    const { ctx } = this;
    ctx.fillStyle = "rgba(5,5,10,0.78)";
    ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);

    ctx.textAlign = "center";
    ctx.font = "700 40px 'Bungee', sans-serif";
    ctx.fillStyle = "#f87171";
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.lineWidth = 7;
    ctx.strokeText("GAME OVER", VIRTUAL_W / 2, 220);
    ctx.fillText("GAME OVER", VIRTUAL_W / 2, 220);

    if (this.newHighScore) {
      const pulse = 0.7 + 0.3 * Math.sin(this.elapsed * 6);
      ctx.font = "700 22px 'Bungee', sans-serif";
      ctx.fillStyle = `rgba(250,204,21,${pulse.toFixed(3)})`;
      ctx.fillText("★ NEW HIGH SCORE ★", VIRTUAL_W / 2, 262);
    }

    ctx.font = "700 58px 'Bungee', sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText(String(this.score), VIRTUAL_W / 2, 340);

    ctx.font = "500 15px 'Space Grotesk', sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fillText(`Best ${this.best}   ·   Top combo x${this.multiplierFor(this.bestComboThisRun)} (${this.bestComboThisRun})   ·   Level ${this.level}`, VIRTUAL_W / 2, 378);

    const pulse = 0.65 + 0.35 * Math.sin(this.elapsed * 4);
    ctx.font = "700 24px 'Bungee', sans-serif";
    ctx.fillStyle = `rgba(74,222,128,${pulse.toFixed(3)})`;
    ctx.fillText("TAP TO PLAY AGAIN", VIRTUAL_W / 2, 450);

    this.drawParticles();
  }

  private multiplierFor(combo: number) {
    return Math.min(10, 1 + Math.floor(combo / 8));
  }
}

/**
 * The run director — GDD §3/§20, §6, §9; math doc §8/§8.5.
 *
 * Performs a pre-determined OutcomeScript as a timed sequence of beats.
 * Committed-target mode (Stake-Engine-style RGS): the player plants a flag
 * at a target house BEFORE betting; the whole round — including the payout —
 * is resolved at draw time and the run is pure playback to the flag or the
 * bust, with no in-round input. The director reads the script; it never
 * draws from the outcome RNG and never computes value beyond the engine's
 * settleAtTarget().
 */
import {
  effectiveMultiplier,
  settleAtTarget,
  type OutcomeScript,
  type RouteConfig,
  type Settlement,
} from '../engine/index';
import * as sfx from './audio';
import { chance, pick, range } from './presentation';
import {
  DELIVER_X,
  GROUND_Y,
  HOUSE_SPACING,
  RIDER_X,
  type HazardKind,
  type Scene,
  type World,
} from './scene';

/** Scaled-time clock: waits resolve in *performed* time, so slow-mo stretches them. */
export class Clock {
  scale = 1;
  private waiters: { remaining: number; res: () => void }[] = [];

  tick(scaledMs: number): void {
    for (const w of this.waiters) w.remaining -= scaledMs;
    const due = this.waiters.filter((w) => w.remaining <= 0);
    this.waiters = this.waiters.filter((w) => w.remaining > 0);
    for (const w of due) w.res();
  }

  wait(ms: number): Promise<void> {
    return new Promise((res) => this.waiters.push({ remaining: ms, res }));
  }
}

export interface DirectorUi {
  onDelivered(k: number, multiplier: number, previewTotal: number): void;
  onSidePocket(total: number): void;
  onBigPaper(amount: number): Promise<void>;
  onGolden(factor: number): void;
  onResult(s: Settlement, opts: { perfectRun: boolean }): void;
}

const HAZARDS: HazardKind[] = ['dog', 'car', 'skateboard', 'sprinkler', 'trash'];
const HAZARD_SOUND: Record<HazardKind, () => void> = {
  dog: sfx.bark,
  car: sfx.carHorn,
  skateboard: () => sfx.chainTick(),
  sprinkler: () => sfx.decisionTick(),
  trash: () => sfx.chainTick(),
};

export class Director {
  readonly clock = new Clock();
  running = false;

  constructor(
    private world: World,
    private scene: Scene,
    private ui: DirectorUi,
  ) {}

  /** Advance continuous world state each frame (scaled dt, seconds). */
  update(dt: number): void {
    const w = this.world;
    w.scrollX += w.speed * dt;
    w.poseT += dt;
    if (w.hazard) w.hazard.t += dt * 1.6;
    if (w.paperArc) {
      w.paperArc.t += dt / 0.45;
      if (w.paperArc.t >= 1) w.paperArc = null;
    }
    // ambient chain tick keyed to speed (GDD §14: the bike is the metronome)
    if (w.speed > 0 && Math.random() < dt * (w.speed / 90)) sfx.chainTick();
  }

  async perform(script: OutcomeScript, cfg: RouteConfig, targetStep: number): Promise<void> {
    const w = this.world;
    this.running = true;
    w.pose = 'ride';
    w.poseT = 0;
    w.multiplier = null;
    w.scrollX = HOUSE_SPACING - DELIVER_X - 520;
    const goal = Math.min(targetStep, script.capStep);
    w.targetHouse = goal;
    let sidePocket = 0;
    let bigPaperShown = 0;

    const survivable = script.bustStep - 1;
    const reached = survivable >= goal;
    const preview = (k: number) =>
      effectiveMultiplier(script, cfg, k) * script.bet + sidePocket + bigPaperShown;

    try {
      const lastDelivered = Math.min(goal, survivable);
      for (let k = 1; k <= lastDelivered; k++) {
        const isFlagHouse = k === goal;
        await this.approach(script, k, /*fatal*/ false, isFlagHouse);
        const step = script.steps[k - 1];

        // — deliver —
        const golden = !!step.boost;
        w.pose = 'throw';
        w.poseT = 0;
        w.paperArc = {
          t: 0,
          targetX: DELIVER_X + range(-14, 14),
          targetY: GROUND_Y - 150,
          golden,
        };
        await this.clock.wait(450);
        sfx.thwack();
        sfx.deliveryNote(k);
        this.scene.burst(DELIVER_X, GROUND_Y - 150, ['#D9C79E', '#F4F1E8'], 6, 120);
        const mult = effectiveMultiplier(script, cfg, k);
        w.multiplier = mult;
        w.pose = 'ride';

        if (golden) {
          sfx.goldenShimmer();
          this.popup(`GOLDEN PAPER ×${step.boost}!`, 34, '#FFC53D');
          this.scene.burst(DELIVER_X, GROUND_Y - 150, ['#FFC53D', '#FF8A3D'], 26, 260);
          this.ui.onGolden(step.boost!);
          await this.clock.wait(500);
        }
        if (step.envelope) {
          sidePocket += step.envelope * script.bet;
          sfx.envelopeChime();
          this.popup(`💰 +${(step.envelope * script.bet).toFixed(2)}`, 24, '#FFC53D', GROUND_Y - 80);
          this.ui.onSidePocket(sidePocket);
        }
        if (step.freeDelivery) {
          sfx.thwack();
          this.popup('FREE DELIVERY!', 20, '#3DA5FF', GROUND_Y - 190);
        }
        // milestone flourish (GDD §10)
        if ([5, 10, 25, 50].some((m) => mult >= m && effectiveMultiplier(script, cfg, k - 1) < m)) {
          w.pose = 'wheelie';
          w.poseT = 0;
          setTimeoutPose(w, 'ride', 700, this.clock);
        }
        this.ui.onDelivered(k, mult, preview(k));

        // — Daily Big Paper reveal (awarded regardless of what follows, §6) —
        if (script.bigPaper !== null && k === 1) {
          bigPaperShown = script.bigPaper * script.bet;
          await this.ui.onBigPaper(bigPaperShown);
        }
        // brief breath between houses (replaces the decision window: no input)
        if (!isFlagHouse) await this.clock.wait(250);
      }

      if (reached) {
        // — the flag —
        const s = settleAtTarget(script, cfg, goal);
        await this.celebrate(s, cfg);
        return;
      }

      // — the bust —
      await this.approach(script, script.bustStep, /*fatal*/ true, false);
      const s = settleAtTarget(script, cfg, goal);
      w.multiplier = null;
      w.pose = 'tumble';
      w.poseT = 0;
      w.speed = 0;
      sfx.wipeout();
      this.scene.burst(RIDER_X, GROUND_Y - 20, ['#8B90A3', '#D9C79E', '#F4F1E8'], 22, 180);
      await this.clock.wait(1200);
      this.ui.onResult(s, { perfectRun: false });
    } finally {
      this.running = false;
      this.clock.scale = 1;
      w.hazard = null;
      w.vignette = 0;
      w.zoom = 1;
    }
  }

  /**
   * Ride to house k. On survived steps a hazard-escape beat plays ~half the
   * time (always with `dramatic` slow-mo when the script flags it, and always
   * on the approach to the flag house — the last-gasp beat); the bust
   * approach uses the identical telegraph grammar resolved fatally.
   * (See presentation.ts header for the §8-rule-3 production note.)
   */
  private async approach(
    script: OutcomeScript,
    k: number,
    fatal: boolean,
    flagHouse: boolean,
  ): Promise<void> {
    const w = this.world;
    const target = k * HOUSE_SPACING - DELIVER_X;
    const cruise = Math.min(430, 260 + k * 6); // speed ramp, GDD §6
    const durMs = Math.max(500, ((target - w.scrollX) / cruise) * 1000);
    w.speed = ((target - w.scrollX) / durMs) * 1000;

    const step = fatal ? undefined : script.steps[k - 1];
    const dramatic = !!step?.dramatic || flagHouse;
    const beat = fatal || dramatic || chance(0.45);
    if (!beat) {
      await this.clock.wait(durMs);
      w.speed = 0;
      return;
    }

    const kind = pick(HAZARDS);
    // telegraph (audio-first, GDD §14)
    await this.clock.wait(durMs * 0.35);
    w.hazard = { kind, phase: 'telegraph', t: 0, worldX: w.scrollX + (kind === 'dog' ? 60 : 620) };
    HAZARD_SOUND[kind]();
    await this.clock.wait(durMs * 0.3);
    // threat
    w.hazard.phase = 'threat';
    w.hazard.t = 0;
    w.hazard.worldX = w.scrollX + (kind === 'dog' ? 40 : 560);
    if (kind === 'dog') sfx.bark();
    await this.clock.wait(durMs * 0.25);

    if (fatal) {
      w.hazard.phase = 'fatal';
      w.hazard.t = 0;
      await this.clock.wait(400);
      w.hazard = null;
      return;
    }

    // escape — dramatic steps get the near-miss treatment (GDD §9)
    if (dramatic) {
      this.clock.scale = 0.3;
      w.vignette = 1;
      w.zoom = 1.22;
      w.pose = 'tuck';
      sfx.heartbeat();
      w.hazard.phase = 'escaped';
      w.hazard.t = 0;
      await this.clock.wait(280); // ~930ms real time at 0.3×
      this.clock.scale = 1;
      w.vignette = 0;
      w.zoom = 1;
      w.pose = 'ride';
      sfx.bassHit();
      this.popup(pick(['SO CLOSE!', 'ESCAPED!', 'NOT TODAY!']), 30, '#3DDC6B');
      this.scene.burst(RIDER_X - 60, GROUND_Y - 30, ['#7CB56B', '#5C8A4E'], 14, 200);
    } else {
      w.hazard.phase = 'escaped';
      w.hazard.t = 0;
      w.pose = kind === 'skateboard' ? 'wheelie' : 'ride';
      await this.clock.wait(durMs * 0.1);
      w.pose = 'ride';
    }
    await this.clock.wait(300);
    w.hazard = null;
    w.speed = 0;
  }

  private async celebrate(s: Settlement, cfg: RouteConfig): Promise<void> {
    const w = this.world;
    w.speed = 0;
    w.pose = 'skid';
    w.poseT = 0;
    const big = s.multiplier >= 10;
    sfx.cashOutFanfare(big);
    this.scene.burst(RIDER_X, GROUND_Y - 40, ['#FFC53D', '#3DDC6B', '#F4F1E8'], big ? 40 : 18, 260);
    if (big) this.scene.confettiRain(s.multiplier >= 50 ? 140 : 70);
    const perfectRun = s.survived >= cfg.perfectRunThreshold;
    if (perfectRun) {
      this.popup('PERFECT RUN!', 36, '#FFC53D');
      this.scene.confettiRain(60);
    }
    await this.clock.wait(900);
    this.ui.onResult(s, { perfectRun });
  }

  private popup(text: string, size: number, color: string, y = GROUND_Y - 170): void {
    this.world.popups.push({
      text, x: RIDER_X + 40 + range(-10, 10), y, age: 0, life: 1.3, size, color, float: true,
    });
  }
}

function setTimeoutPose(w: World, pose: World['pose'], ms: number, clock: Clock): void {
  void clock.wait(ms).then(() => {
    if (w.pose === 'wheelie') {
      w.pose = pose;
      w.poseT = 0;
    }
  });
}

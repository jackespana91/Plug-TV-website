/**
 * Engine verification against the math model (docs/paperboy/02-math-model.md).
 * Heavier statistical verification lives in `npm run simulate`.
 */
import { describe, expect, it } from 'vitest';
import {
  ROUTES,
  boostExpectation,
  capStep,
  effectiveMultiplier,
  generateRound,
  ladderMultiplier,
  seededRng,
  settle,
} from './index';
import type { OutcomeStep, RouteConfig } from './types';

const routes = Object.values(ROUTES);

describe('ladder construction (§2, §5.2)', () => {
  it('holds E[rung k payout]·P(survive ≥ k) = R at every rung, for every route', () => {
    for (const cfg of routes) {
      const c = boostExpectation(cfg);
      for (let k = 1; k <= capStep(cfg); k++) {
        const expected =
          ladderMultiplier(cfg, k) * Math.pow(c, k) * Math.pow(cfg.p, k);
        expect(expected).toBeCloseTo(cfg.ladderRtp, 10);
      }
    }
  });

  it('first rung pays at least even money on every route', () => {
    for (const cfg of routes) {
      expect(ladderMultiplier(cfg, 1)).toBeGreaterThanOrEqual(1.0);
    }
  });

  it('reaches the max-win cap at the computed cap step and not before', () => {
    for (const cfg of routes) {
      const cap = capStep(cfg);
      expect(ladderMultiplier(cfg, cap)).toBeGreaterThanOrEqual(cfg.maxWin);
      expect(ladderMultiplier(cfg, cap - 1)).toBeLessThan(cfg.maxWin);
    }
  });

  it('theoretical P(reach cap) ≈ R / maxWin (§3)', () => {
    for (const cfg of routes) {
      const c = boostExpectation(cfg);
      // P(survive ≥ capStep)·E[boost product] against R/maxWin — same identity
      // as the ladder construction, so equality holds up to the cap rounding.
      const pCap = Math.pow(cfg.p * c, capStep(cfg));
      expect(pCap * cfg.maxWin).toBeGreaterThan(cfg.ladderRtp * 0.8);
      expect(pCap * cfg.maxWin).toBeLessThanOrEqual(cfg.ladderRtp * 1.001);
    }
  });
});

describe('outcome generation (§2, §8)', () => {
  it('is deterministic for a given seed', () => {
    const cfg = ROUTES.suburbia;
    const a = generateRound(cfg, 1, seededRng(42));
    const b = generateRound(cfg, 1, seededRng(42));
    expect(a).toEqual(b);
  });

  it('produces scripts with exactly bustStep−1 survivable steps, capped at capStep', () => {
    const cfg = ROUTES['dog-alley'];
    const rng = seededRng(7);
    for (let i = 0; i < 5000; i++) {
      const s = generateRound(cfg, 1, rng);
      expect(s.steps.length).toBe(s.bustStep - 1);
      expect(s.bustStep).toBeLessThanOrEqual(s.capStep + 1);
      expect(s.steps.every((st, idx) => st.k === idx + 1)).toBe(true);
    }
  });

  it('draws survival counts matching P(survive ≥ k) = p^k', () => {
    const cfg = ROUTES.suburbia;
    const rng = seededRng(1234);
    const n = 200_000;
    let reached5 = 0;
    let reached10 = 0;
    for (let i = 0; i < n; i++) {
      const s = generateRound(cfg, 1, rng);
      const survived = s.bustStep - 1;
      if (survived >= 5) reached5++;
      if (survived >= 10) reached10++;
    }
    expect(reached5 / n).toBeCloseTo(Math.pow(cfg.p, 5), 2); // 0.590
    expect(reached10 / n).toBeCloseTo(Math.pow(cfg.p, 10), 2); // 0.349
  });
});

describe('settlement (§5–§8)', () => {
  const cfg = ROUTES.suburbia;

  function scriptWith(overrides: Partial<ReturnType<typeof base>>) {
    return { ...base(), ...overrides };
  }
  function base() {
    return {
      route: cfg.id,
      bet: 2,
      bustStep: 4,
      capStep: capStep(cfg),
      steps: [{ k: 1 }, { k: 2 }, { k: 3 }] as OutcomeStep[],
      bigPaper: null as number | null,
    };
  }

  it('pays the exact rung multiplier on cash-out', () => {
    const s = scriptWith({});
    const r = settle(s, cfg, 2);
    expect(r.busted).toBe(false);
    expect(r.multiplier).toBeCloseTo(ladderMultiplier(cfg, 2), 10);
    expect(r.total).toBeCloseTo(ladderMultiplier(cfg, 2) * 2, 10);
  });

  it('pays zero ladder but keeps envelopes and big paper on a bust', () => {
    const s = scriptWith({
      steps: [{ k: 1, envelope: 0.25 }, { k: 2 }, { k: 3, envelope: 0.25 }],
      bigPaper: 5,
    });
    const r = settle(s, cfg, null);
    expect(r.busted).toBe(true);
    expect(r.ladderWin).toBe(0);
    expect(r.envelopes).toBeCloseTo(0.25 * 2 + 0.25 * 2, 10);
    expect(r.bigPaper).toBe(10);
    expect(r.total).toBeCloseTo(11, 10);
  });

  it('applies boosts to the cashed rung and all later rungs only', () => {
    const s = scriptWith({ steps: [{ k: 1 }, { k: 2, boost: 3 }, { k: 3 }] });
    expect(effectiveMultiplier(s, cfg, 1)).toBeCloseTo(ladderMultiplier(cfg, 1), 10);
    expect(effectiveMultiplier(s, cfg, 2)).toBeCloseTo(ladderMultiplier(cfg, 2) * 3, 10);
    expect(effectiveMultiplier(s, cfg, 3)).toBeCloseTo(ladderMultiplier(cfg, 3) * 3, 10);
  });

  it('awards Perfect Run only on cash-out at/after the threshold (when funded)', () => {
    // v1 ships perfectRunBonus = 0 (celebration-only, §7 fallback) — verify
    // the settlement mechanism with an explicitly funded config.
    const funded = { ...cfg, perfectRunBonus: 1 };
    const deep = {
      ...base(),
      bustStep: cfg.perfectRunThreshold + 2,
      steps: Array.from({ length: cfg.perfectRunThreshold + 1 }, (_, i) => ({ k: i + 1 })),
    };
    expect(settle(deep, funded, cfg.perfectRunThreshold).perfectRun).toBe(2);
    expect(settle(deep, funded, cfg.perfectRunThreshold - 1).perfectRun).toBe(0);
    expect(settle(deep, funded, null).perfectRun).toBe(0); // busted at threshold+1
    expect(settle(deep, cfg, cfg.perfectRunThreshold).perfectRun).toBe(0); // launch config
  });

  it('force-cashes at the capped max win when the draw exceeds the cap', () => {
    const cap = capStep(cfg);
    const s = scriptWith({
      bustStep: cap + 1,
      steps: Array.from({ length: cap }, (_, i) => ({ k: i + 1 })),
    });
    const r = settle(s, cfg, null);
    expect(r.busted).toBe(false);
    expect(r.capped).toBe(true);
    expect(r.multiplier).toBe(cfg.maxWin);
  });

  it('rejects illegal cash-out steps', () => {
    const s = scriptWith({});
    expect(() => settle(s, cfg, 0)).toThrow();
    expect(() => settle(s, cfg, 4)).toThrow(); // bust step is not survivable
    expect(() => settle(s, cfg, 1.5)).toThrow();
  });
});

describe('measured RTP (statistical, seeded — full sweep in `npm run simulate`)', () => {
  function measure(cfg: RouteConfig, cashAt: number | null, n: number, seed: number) {
    const rng = seededRng(seed);
    let staked = 0;
    let returned = 0;
    for (let i = 0; i < n; i++) {
      const s = generateRound(cfg, 1, rng);
      staked += 1;
      const step = cashAt !== null && s.bustStep - 1 >= cashAt ? cashAt : null;
      returned += settle(s, cfg, step).total;
    }
    return returned / staked;
  }

  it('Suburbia at auto-cashout rung 1 sits near ladder R + per-step extras', () => {
    // Expected: R (0.9325) + envelopes over 1 step (~0.14%·p) + big paper (1.0%)
    const rtp = measure(ROUTES.suburbia, 1, 400_000, 99);
    expect(rtp).toBeGreaterThan(0.93);
    expect(rtp).toBeLessThan(0.96);
  });

  it('Suburbia at auto-cashout rung 5 remains within the disclosed band (§7)', () => {
    const rtp = measure(ROUTES.suburbia, 5, 400_000, 100);
    expect(rtp).toBeGreaterThan(0.925);
    expect(rtp).toBeLessThan(0.965);
  });
});

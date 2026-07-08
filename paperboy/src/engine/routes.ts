/**
 * Route (volatility profile) configurations — math doc §3–§7.
 *
 * Per-route RTP budget (× bet, at launch targets):
 *
 *                    ladder+boost   envelopes   big paper    total
 *   Easy Street         94.50%        0.50%       1.00%     ~96.0%
 *   Suburbia            93.60%        1.40%       1.00%     ~96.0%
 *   Dog Alley           94.00%        1.00%       1.00%     ~96.0%
 *
 * Perfect Run ships celebration-only (bonus 0) per the §7 fallback: with a
 * ~21–40% threshold reach probability, any meaningful flat bonus explodes
 * RTP for threshold riders (simulation measured +35% at 1× bet). Its budget
 * is folded into the ladder constant. Envelopes are only fully realized by
 * players who ride deep (§5.1) — `npm run simulate` reports the measured
 * RTP band across cash-out strategies.
 */

import type { BigPaperPrize, RouteConfig, RouteId } from './types';

/** Weighted prize table, E ≈ 5.01× bet (§6). */
const BIG_PAPER_TABLE: BigPaperPrize[] = [
  { prize: 2, weight: 70.6 },
  { prize: 5, weight: 20 },
  { prize: 10, weight: 6 },
  { prize: 25, weight: 2.4 },
  { prize: 100, weight: 0.9 },
  { prize: 500, weight: 0.1 },
];

export const ROUTES: Record<RouteId, RouteConfig> = {
  'easy-street': {
    id: 'easy-street',
    name: 'Easy Street',
    p: 0.94,
    ladderRtp: 0.945,
    boostProb: 0,
    boostFactor: 3,
    envelopeProb: 0.00128,
    envelopeValue: 0.25,
    bigPaperProb: 1 / 500,
    bigPaperTable: BIG_PAPER_TABLE,
    perfectRunThreshold: 15,
    perfectRunBonus: 0,
    maxWin: 10000,
    dramaticProb: 0.18,
    freeDeliveryProb: 0.03,
  },
  suburbia: {
    id: 'suburbia',
    name: 'Suburbia',
    p: 0.9,
    ladderRtp: 0.936,
    boostProb: 0.006,
    boostFactor: 3,
    envelopeProb: 0.0062,
    envelopeValue: 0.25,
    bigPaperProb: 1 / 500,
    bigPaperTable: BIG_PAPER_TABLE,
    perfectRunThreshold: 10,
    perfectRunBonus: 0,
    maxWin: 10000,
    dramaticProb: 0.18,
    freeDeliveryProb: 0.03,
  },
  'dog-alley': {
    id: 'dog-alley',
    name: 'Dog Alley',
    p: 0.8,
    ladderRtp: 0.94,
    boostProb: 0.01,
    boostFactor: 3,
    envelopeProb: 0.01,
    envelopeValue: 0.25,
    bigPaperProb: 1 / 500,
    bigPaperTable: BIG_PAPER_TABLE,
    perfectRunThreshold: 7,
    perfectRunBonus: 0,
    maxWin: 10000,
    dramaticProb: 0.18,
    freeDeliveryProb: 0.03,
  },
};

/** Per-step boost expectation c = 1 − π_g + π_g·g (§5.2). */
export function boostExpectation(cfg: RouteConfig): number {
  return 1 - cfg.boostProb + cfg.boostProb * cfg.boostFactor;
}

/**
 * Base (pre-boost) ladder multiplier at rung k: m(k) = R / (p·c)^k, so that
 * E[payout at k]·P(survive ≥ k) = R at every rung (§2, §5.2). Uncapped.
 */
export function ladderMultiplier(cfg: RouteConfig, k: number): number {
  return cfg.ladderRtp / Math.pow(cfg.p * boostExpectation(cfg), k);
}

/** Smallest rung at which the base ladder reaches the max-win cap. */
export function capStep(cfg: RouteConfig): number {
  const perStep = -Math.log(cfg.p * boostExpectation(cfg));
  return Math.ceil(Math.log(cfg.maxWin / cfg.ladderRtp) / perStep);
}

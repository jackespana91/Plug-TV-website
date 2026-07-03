/**
 * Round generation and settlement — math doc §2, §5–§8.
 *
 * `generateRound` consumes the outcome RNG stream exactly once per monetary
 * decision and returns the complete pre-determined round. `settle` computes
 * the credit for any legal cash-out decision against that script. Nothing in
 * the presentation layer can create or alter value.
 */

import type { Rng } from './rng';
import type { OutcomeScript, OutcomeStep, RouteConfig, Settlement } from './types';
import { capStep, ladderMultiplier } from './routes';

/**
 * Draw the number of survived steps: P(survive ≥ k) = p^k, so
 * K = floor(ln U / ln p) and the bust lands on step K+1 (§2).
 */
function drawSurvived(cfg: RouteConfig, rng: Rng): number {
  const u = rng.next();
  if (u === 0) return Number.MAX_SAFE_INTEGER; // beyond any cap
  return Math.floor(Math.log(u) / Math.log(cfg.p));
}

function drawBigPaper(cfg: RouteConfig, rng: Rng): number | null {
  if (rng.next() >= cfg.bigPaperProb) return null;
  const totalWeight = cfg.bigPaperTable.reduce((s, e) => s + e.weight, 0);
  let roll = rng.next() * totalWeight;
  for (const entry of cfg.bigPaperTable) {
    roll -= entry.weight;
    if (roll < 0) return entry.prize;
  }
  return cfg.bigPaperTable[cfg.bigPaperTable.length - 1].prize;
}

export function generateRound(cfg: RouteConfig, bet: number, rng: Rng): OutcomeScript {
  const cap = capStep(cfg);
  const survivedDraw = drawSurvived(cfg, rng);
  const bustStep = Math.min(survivedDraw, cap) + 1; // bustStep = cap+1 encodes "reached cap"
  const survivable = bustStep - 1;

  const steps: OutcomeStep[] = [];
  for (let k = 1; k <= survivable; k++) {
    const step: OutcomeStep = { k };
    if (rng.next() < cfg.envelopeProb) step.envelope = cfg.envelopeValue;
    if (cfg.boostProb > 0 && rng.next() < cfg.boostProb) step.boost = cfg.boostFactor;
    if (rng.next() < cfg.dramaticProb) step.dramatic = true;
    if (rng.next() < cfg.freeDeliveryProb) step.freeDelivery = true;
    steps.push(step);
  }

  return {
    route: cfg.id,
    bet,
    bustStep,
    capStep: cap,
    steps,
    bigPaper: drawBigPaper(cfg, rng),
  };
}

/** Effective ladder multiplier at rung k: base rung × collected boosts, capped (§5.2). */
export function effectiveMultiplier(script: OutcomeScript, cfg: RouteConfig, k: number): number {
  let m = ladderMultiplier(cfg, k);
  for (const step of script.steps) {
    if (step.k <= k && step.boost) m *= step.boost;
  }
  return Math.min(m, cfg.maxWin);
}

/**
 * Settle the round for a cash-out decision.
 *
 * @param cashoutStep step after which the player banked, or null if they rode
 *   until the run ended (bust, or forced cash-out at the cap).
 */
export function settle(
  script: OutcomeScript,
  cfg: RouteConfig,
  cashoutStep: number | null,
): Settlement {
  const survivable = script.bustStep - 1;
  const reachedCap = survivable >= script.capStep;

  let survived: number;
  let busted: boolean;
  let capped = false;

  if (cashoutStep !== null) {
    if (!Number.isInteger(cashoutStep) || cashoutStep < 1 || cashoutStep > survivable) {
      throw new Error(`illegal cash-out at step ${cashoutStep} (survivable: ${survivable})`);
    }
    survived = cashoutStep;
    busted = false;
  } else if (reachedCap) {
    survived = script.capStep;
    busted = false;
    capped = true;
  } else {
    survived = survivable;
    busted = true;
  }

  const multiplier = busted ? 0 : effectiveMultiplier(script, cfg, survived);
  const ladderWin = multiplier * script.bet;

  let envelopes = 0;
  for (const step of script.steps) {
    if (step.k <= survived && step.envelope) envelopes += step.envelope * script.bet;
  }

  const bigPaper = (script.bigPaper ?? 0) * script.bet;
  const perfectRun =
    !busted && survived >= cfg.perfectRunThreshold
      ? cfg.perfectRunBonus * script.bet
      : 0;

  return {
    survived,
    busted,
    capped,
    multiplier,
    ladderWin,
    envelopes,
    bigPaper,
    perfectRun,
    total: ladderWin + envelopes + bigPaper + perfectRun,
  };
}

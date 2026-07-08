/** Types for the outcome engine — mirrors math doc §8's outcome script. */

export type RouteId = 'easy-street' | 'suburbia' | 'dog-alley';

export interface BigPaperPrize {
  /** Prize in × bet. */
  prize: number;
  /** Selection weight (weights need not sum to 1). */
  weight: number;
}

export interface RouteConfig {
  id: RouteId;
  name: string;
  /** Per-step survival probability p (§2). */
  p: number;
  /**
   * Combined ladder RTP constant R (§2, §5.2): the expected ladder+boost
   * return at every cash-out rung. The displayed base ladder is deflated by
   * the per-step boost expectation c = 1 − boostProb + boostProb·boostFactor,
   * so m_base(k) = R / (p·c)^k and E[rung k payout]·P(survive ≥ k) = R for
   * all k — strategy-independence by construction.
   */
  ladderRtp: number;
  /** Per-step probability a ×boostFactor rung enhancement attaches (§5.2). */
  boostProb: number;
  boostFactor: number;
  /** Per-step probability of a banked side prize, and its value in × bet (§5.1). */
  envelopeProb: number;
  envelopeValue: number;
  /** Per-round bonus trigger probability and prize table (§6). */
  bigPaperProb: number;
  bigPaperTable: BigPaperPrize[];
  /** Perfect Run: deliveries required and flat bonus in × bet (§7). 0 bonus = cosmetic. */
  perfectRunThreshold: number;
  perfectRunBonus: number;
  /** Max win cap in × bet (§3). */
  maxWin: number;
  /** Per-step probability a survived step is flagged for dramatic dressing (§8, no EV). */
  dramaticProb: number;
  /** Per-step probability of a cosmetic free-delivery step (§4, no EV). */
  freeDeliveryProb: number;
}

export interface OutcomeStep {
  /** 1-based step index. */
  k: number;
  /** Banked side prize in × bet, if an envelope attached. */
  envelope?: number;
  /** Rung enhancement factor applied to this and all later rungs. */
  boost?: number;
  /** Eligible for near-miss slow-mo dressing (survived steps only). */
  dramatic?: boolean;
  /** Cosmetic survival-probability-1 pacing step (no rung value of its own). */
  freeDelivery?: boolean;
}

/** The complete pre-determined round (§8). Client-side code only dramatizes this. */
export interface OutcomeScript {
  route: RouteId;
  bet: number;
  /**
   * The step at which the run ends in a wipeout. The player survives steps
   * 1 … bustStep−1. If bustStep > capStep the run force-ends at capStep with
   * an automatic cash-out at the capped multiplier instead of a bust.
   */
  bustStep: number;
  /** Rung index at which the ladder reaches maxWin. */
  capStep: number;
  /** Script entries for survivable steps 1 … min(bustStep−1, capStep). */
  steps: OutcomeStep[];
  /** Daily Big Paper prize in × bet, or null. Awarded regardless of bust (§6). */
  bigPaper: number | null;
}

export interface Settlement {
  /** Deliveries actually completed (cash-out step, cap step, or bustStep−1). */
  survived: number;
  /** True if the round ended in a wipeout (no cash-out, no cap rescue). */
  busted: boolean;
  /** True if the run hit the max-win cap and was force-cashed. */
  capped: boolean;
  /** Effective ladder multiplier at settlement (0 if busted). */
  multiplier: number;
  /** Ladder payout in currency. */
  ladderWin: number;
  /** Banked envelopes in currency (kept even on bust). */
  envelopes: number;
  /** Daily Big Paper award in currency (kept even on bust). */
  bigPaper: number;
  /** Perfect Run bonus in currency (cash-out at/after threshold only). */
  perfectRun: number;
  /** Total credited for the round. */
  total: number;
}

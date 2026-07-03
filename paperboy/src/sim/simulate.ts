/**
 * Monte-Carlo verification of the certified-math claims in
 * docs/paperboy/02-math-model.md — the lab-style simulation report.
 *
 * Usage: npm run simulate [-- rounds-per-config]   (default 2,000,000)
 *
 * For each route it simulates a grid of cash-out policies and reports RTP
 * decomposed by component, hit frequency, and run-length stats, so the
 * strategy-(in)dependence claims (§2 constancy, §5.1/§7 disclosed band) are
 * measured rather than asserted.
 */
import {
  ROUTES,
  capStep,
  generateRound,
  ladderMultiplier,
  seededRng,
  settle,
} from '../engine/index';
import type { RouteConfig } from '../engine/types';

const N = Number(process.argv[2] ?? 2_000_000);

interface PolicyResult {
  label: string;
  rtp: number;
  ladder: number;
  envelopes: number;
  bigPaper: number;
  perfectRun: number;
  hitRate: number;
  sd: number;
}

/** Smallest rung whose base multiplier is ≥ target. */
function rungFor(cfg: RouteConfig, target: number): number {
  let k = 1;
  while (ladderMultiplier(cfg, k) < target) k++;
  return k;
}

function runPolicy(cfg: RouteConfig, label: string, cashAt: number | null, seed: number): PolicyResult {
  const rng = seededRng(seed);
  let ladder = 0, envelopes = 0, bigPaper = 0, perfectRun = 0;
  let hits = 0, sum = 0, sumSq = 0;
  for (let i = 0; i < N; i++) {
    const s = generateRound(cfg, 1, rng);
    const step = cashAt !== null && s.bustStep - 1 >= cashAt ? cashAt : null;
    const r = settle(s, cfg, step);
    ladder += r.ladderWin;
    envelopes += r.envelopes;
    bigPaper += r.bigPaper;
    perfectRun += r.perfectRun;
    if (r.total > 0) hits++;
    sum += r.total;
    sumSq += r.total * r.total;
  }
  const mean = sum / N;
  return {
    label,
    rtp: mean,
    ladder: ladder / N,
    envelopes: envelopes / N,
    bigPaper: bigPaper / N,
    perfectRun: perfectRun / N,
    hitRate: hits / N,
    sd: Math.sqrt(Math.max(0, sumSq / N - mean * mean)),
  };
}

function runLengthStats(cfg: RouteConfig, seed: number) {
  const rng = seededRng(seed);
  let sum = 0, capped = 0, maxSeen = 0;
  const n = Math.min(N, 1_000_000);
  for (let i = 0; i < n; i++) {
    const s = generateRound(cfg, 1, rng);
    const survived = s.bustStep - 1;
    sum += survived;
    if (survived >= s.capStep) capped++;
    if (survived > maxSeen) maxSeen = survived;
  }
  return { mean: sum / n, capRate: capped / n, maxSeen, n };
}

const pct = (x: number) => (100 * x).toFixed(2).padStart(6) + '%';

console.log(`Paperboy: The Run — Monte-Carlo verification (${N.toLocaleString()} rounds per policy)\n`);

for (const cfg of Object.values(ROUTES)) {
  const cap = capStep(cfg);
  console.log(`━━━ ${cfg.name}  (p=${cfg.p}, R=${cfg.ladderRtp}, cap ×${cfg.maxWin} @ house ${cap}) ━━━`);
  console.log(
    `    theory: mean run ${(cfg.p / (1 - cfg.p)).toFixed(1)} houses · ` +
    `m(1)=${ladderMultiplier(cfg, 1).toFixed(4)} · ×2 @ house ${rungFor(cfg, 2)} · ×10 @ house ${rungFor(cfg, 10)}`,
  );

  const lengths = runLengthStats(cfg, 11);
  console.log(
    `    measured: mean run ${lengths.mean.toFixed(2)} houses · deepest ${lengths.maxSeen} · ` +
    `cap rate ${(lengths.capRate * 100).toFixed(4)}% (theory p^cap = ${(100 * Math.pow(cfg.p, cap)).toFixed(4)}%)\n`,
  );

  const policies: Array<[string, number | null]> = [
    ['cash at rung 1', 1],
    [`cash at ×2 (rung ${rungFor(cfg, 2)})`, rungFor(cfg, 2)],
    [`cash at ×5 (rung ${rungFor(cfg, 5)})`, rungFor(cfg, 5)],
    [`cash at ×10 (rung ${rungFor(cfg, 10)})`, rungFor(cfg, 10)],
    [`cash at threshold (rung ${cfg.perfectRunThreshold})`, cfg.perfectRunThreshold],
    ['ride to bust/cap', null],
  ];

  console.log('    policy                       RTP     ladder   envlp   bigPpr  perfRun  hit%     SD');
  let seed = 1000;
  for (const [label, cashAt] of policies) {
    const r = runPolicy(cfg, label, cashAt, seed++);
    console.log(
      `    ${label.padEnd(26)}${pct(r.rtp)}  ${pct(r.ladder)} ${pct(r.envelopes)} ${pct(r.bigPaper)} ` +
      `${pct(r.perfectRun)}  ${(100 * r.hitRate).toFixed(1).padStart(5)}%  ${r.sd.toFixed(2).padStart(6)}`,
    );
  }
  console.log();
}

console.log('Claims under test:');
console.log('  • ladder column ≈ R at every fixed rung (strategy-independence, §2/§5.2)');
console.log('  • big paper ≈ 1.00% everywhere (bet-time draw, §6)');
console.log('  • envelopes/perfect-run grow with ride depth — the disclosed RTP band (§5.1/§7)');
console.log('  • cap rate ≈ R / maxWin (§3)');

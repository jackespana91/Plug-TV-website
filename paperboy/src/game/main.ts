/**
 * UI shell + demo wallet. All value math lives in the engine; this file
 * moves DOM around and forwards button presses to the director.
 */
import './style.css';
import {
  ROUTES,
  capStep,
  cryptoRng,
  generateRound,
  ladderMultiplier,
  type RouteConfig,
  type RouteId,
  type Settlement,
} from '../engine/index';
import * as sfx from './audio';
import { Director, type DirectorUi } from './director';
import { Scene, newWorld } from './scene';

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

const BET_STEPS = [0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100];
const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

let balance = Number(localStorage.getItem('pb_balance') ?? 1000);
let best = Number(localStorage.getItem('pb_best') ?? 0);
let betIndex = 3; // 1.00
let routeId: RouteId = 'suburbia';
let boostSoFar = 1;
let deliveredNow = 0;

const canvas = $<HTMLCanvasElement>('#game');
const scene = new Scene(canvas);
const world = newWorld();

function save(): void {
  localStorage.setItem('pb_balance', String(balance));
  localStorage.setItem('pb_best', String(best));
}

function renderStatics(): void {
  $('#balance').textContent = fmt(balance);
  $('#bet-value').textContent = fmt(BET_STEPS[betIndex]);
  $('#stat-best').textContent = best > 0 ? `×${best.toFixed(2)}` : '–';
  $('#stat-delivered').textContent = deliveredNow > 0 ? String(deliveredNow) : '–';
}

function routeCfg(): RouteConfig {
  return ROUTES[routeId];
}

/* ---- route cards ---- */
for (const card of document.querySelectorAll<HTMLButtonElement>('.route')) {
  const cfg = ROUTES[card.dataset.route as RouteId];
  card.querySelector('em')!.textContent =
    `×2 @ house ${rungFor(cfg, 2)} · ×10 @ house ${rungFor(cfg, 10)} · max ×${cfg.maxWin.toLocaleString()}`;
  card.addEventListener('click', () => {
    routeId = cfg.id;
    document.querySelectorAll('.route').forEach((c) => c.classList.toggle('selected', c === card));
    buildRibbon();
  });
}
function rungFor(cfg: RouteConfig, target: number): number {
  let k = 1;
  while (ladderMultiplier(cfg, k) < target) k++;
  return k;
}

/* ---- rung ribbon ---- */
function buildRibbon(): void {
  const cfg = routeCfg();
  const ribbon = $('#ribbon');
  ribbon.innerHTML = '';
  const n = Math.min(capStep(cfg), 60);
  for (let k = 1; k <= n; k++) {
    const div = document.createElement('div');
    div.className = 'rung';
    div.dataset.k = String(k);
    ribbon.appendChild(div);
  }
  paintRibbon(0);
}
function paintRibbon(current: number): void {
  const cfg = routeCfg();
  for (const el of document.querySelectorAll<HTMLElement>('.rung')) {
    const k = Number(el.dataset.k);
    const mult = Math.min(ladderMultiplier(cfg, k) * boostSoFar, cfg.maxWin);
    el.innerHTML = `×${mult >= 100 ? mult.toFixed(0) : mult.toFixed(2)}<small>H${k}</small>`;
    el.classList.toggle('done', k < current);
    el.classList.toggle('current', k === current);
    el.classList.toggle('boosted', boostSoFar > 1 && k >= current);
    if (k === current) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
}

/* ---- primary button ---- */
type BtnState = 'deliver' | 'cashout' | 'locked';
function setBtn(state: BtnState, label: string, amount = ''): void {
  const btn = $('#btn-main');
  btn.className = `mainbtn ${state}`;
  $('#btn-label').textContent = label;
  $('#btn-amount').textContent = amount;
}

/* ---- overlay ---- */
function showOverlay(kicker: string, title: string, opts: { amount?: string; sub?: string; loss?: boolean } = {}): void {
  $('#overlay-kicker').textContent = kicker;
  const title$ = $('#overlay-title');
  title$.textContent = title;
  title$.classList.toggle('loss', !!opts.loss);
  $('#overlay-amount').textContent = opts.amount ?? '';
  $('#overlay-sub').textContent = opts.sub ?? '';
  $('#overlay').classList.remove('hidden');
}
function hideOverlay(): void {
  $('#overlay').classList.add('hidden');
}

function countUp(total: number, ms: number): Promise<void> {
  return new Promise((res) => {
    const start = performance.now();
    let lastTick = 0;
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const value = total * t * t; // accelerating count — art doc §6
      $('#overlay-amount').textContent = fmt(value);
      if (now - lastTick > 60) {
        sfx.countTick(Math.floor(t * 10));
        lastTick = now;
      }
      if (t < 1) requestAnimationFrame(frame);
      else {
        sfx.bassHit();
        res();
      }
    };
    requestAnimationFrame(frame);
  });
}

/* ---- director wiring ---- */
const ui: DirectorUi = {
  onDecision(_k, preview) {
    setBtn('cashout', 'CASH OUT', fmt(preview));
    sfx.decisionTick();
  },
  onDecisionEnd() {
    if (director.running) setBtn('locked', 'RIDING…');
  },
  onDelivered(k, _mult, _preview) {
    deliveredNow = k;
    $('#stat-delivered').textContent = String(k);
    paintRibbon(k);
  },
  onSidePocket(total) {
    $('#stat-pocket').textContent = fmt(total);
  },
  onGolden(factor) {
    boostSoFar *= factor;
    paintRibbon(deliveredNow);
  },
  async onBigPaper(amount) {
    showOverlay('BONUS', '🗞 DAILY BIG PAPER!', {
      amount: fmt(amount),
      sub: `LOCAL KID WINS ${fmt(amount)} — story on page one. Awarded whatever happens next.`,
    });
    await new Promise((r) => setTimeout(r, 2300));
    hideOverlay();
  },
  onResult(s, { perfectRun }) {
    void finishRound(s, perfectRun);
  },
};

const director = new Director(world, scene, ui);

async function finishRound(s: Settlement, perfectRun: boolean): Promise<void> {
  balance += s.total;
  if (!s.busted && s.multiplier > best) best = s.multiplier;
  save();

  if (s.busted) {
    const consolation = s.total > 0 ? ` · kept ${fmt(s.total)} in side prizes` : '';
    showOverlay('WIPED OUT', 'CAUGHT!', {
      loss: true,
      sub: `Caught at house ${s.survived + 1} · run paid ${fmt(s.ladderWin)}${consolation}`,
    });
    await new Promise((r) => setTimeout(r, 1400)); // losses are fast — GDD §13
  } else {
    const tier =
      s.capped ? 'LEGENDARY — MAX WIN' :
      s.multiplier >= 200 ? 'EPIC WIN' :
      s.multiplier >= 50 ? 'HUGE WIN' :
      s.multiplier >= 10 ? 'BIG WIN' :
      s.multiplier >= 2 ? 'GREAT RUN' : 'BANKED';
    showOverlay(
      perfectRun ? 'PERFECT RUN' : 'CASHED OUT',
      tier,
      { amount: '0.00', sub: `×${s.multiplier.toFixed(2)} after ${s.survived} deliveries` },
    );
    await countUp(s.total, s.multiplier >= 10 ? 2000 : 1000);
    await new Promise((r) => setTimeout(r, s.multiplier >= 10 ? 1400 : 700));
  }

  hideOverlay();
  deliveredNow = 0;
  boostSoFar = 1;
  $('#stat-pocket').textContent = '0.00';
  renderStatics();
  paintRibbon(0);
  world.pose = 'idle';
  world.multiplier = null;
  $('.controls').classList.remove('running');
  $('#routes').classList.remove('hidden');
  setBtn('deliver', 'DELIVER', fmt(BET_STEPS[betIndex]));
}

async function startRound(): Promise<void> {
  const bet = BET_STEPS[betIndex];
  if (director.running || balance < bet) return;
  balance -= bet;
  save();
  renderStatics();
  $('.controls').classList.add('running');
  $('#routes').classList.add('hidden');
  setBtn('locked', 'RIDING…');
  // The outcome is fixed HERE. Everything after is theatre. (math doc §1)
  const script = generateRound(routeCfg(), bet, cryptoRng());
  await director.perform(script, routeCfg());
}

/* ---- controls ---- */
$('#btn-main').addEventListener('click', () => {
  if (director.running) director.requestCashOut();
  else void startRound();
});
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (director.running) director.requestCashOut();
    else void startRound();
  }
});
$('#bet-down').addEventListener('click', () => {
  betIndex = Math.max(0, betIndex - 1);
  renderStatics();
  setBtn('deliver', 'DELIVER', fmt(BET_STEPS[betIndex]));
});
$('#bet-up').addEventListener('click', () => {
  betIndex = Math.min(BET_STEPS.length - 1, betIndex + 1);
  renderStatics();
  setBtn('deliver', 'DELIVER', fmt(BET_STEPS[betIndex]));
});
$('#btn-mute').addEventListener('click', () => {
  sfx.setMuted(!sfx.isMuted());
  $('#btn-mute').textContent = sfx.isMuted() ? '🔇' : '🔊';
});
$('#reset').addEventListener('click', (e) => {
  e.preventDefault();
  balance = 1000;
  save();
  renderStatics();
});

/* ---- frame loop ---- */
let last = performance.now();
function frame(now: number): void {
  const dtReal = Math.min(0.05, (now - last) / 1000);
  last = now;
  const dt = dtReal * director.clock.scale;
  director.clock.tick(dt * 1000);
  director.update(dt);
  scene.render(world, dt);
  requestAnimationFrame(frame);
}

buildRibbon();
renderStatics();
setBtn('deliver', 'DELIVER', fmt(BET_STEPS[betIndex]));
requestAnimationFrame(frame);

<!--
  Game.svelte — root game component for the Stake Engine web-sdk app.

  Owns the pre-shot flow (club → aim → power → swing) on top of the pure input
  model in ../game/preShot.ts, then hands off to the SDK's bet machine. The
  outcome is the RGS's; aim + swing quality are cosmetic and only bias the
  animation the returned book plays (via the handler context).

  Flow:
    club   — pick a club (= the RGS mode / volatility profile)
    aim    — drag the reticle over the green (clamped to the aim radius)
    power  — pull back from the tee; release past the minimum to swing
    swing  — stateBet.playRound({ mode }) draws the book; GolfScene plays it

  The reticle, aim line and power meter are an SVG overlay in FIELD (420×760)
  space — the course view is identity (un-zoomed) during aim/power, so field
  coords map straight to the overlay with a single scale factor.

  Wire-up specifics (context keys, <App>, the exact state-bet API, and threading
  aim/quality into the handler context) follow the reference `lines` game; see
  README.md §4 for the two seams to reconcile against the current SDK version.
-->
<script lang="ts">
  import GolfScene from './GolfScene.svelte';
  import { CLUBS, MODE_NAME, FIELD, GREEN, TEE, RADII, type ClubKey } from '../game/config.ts';
  import { clampAim, pullFromDrag, nearTee, qualityFromPull, isPure, shouldSwing, defaultAim } from '../game/preShot.ts';
  import type { Vec } from '../game/geometry.ts';
  import { getContext } from 'svelte';

  // state-bet exposes the bet lifecycle; playRound triggers wallet/play with the
  // mode, then plays the returned book. `ctx` is what the bookEventHandlerMap
  // receives — thread the player's aim + quality through so the shot is biased.
  const stateBet = getContext<{
    playRound: (args: { mode: string; ctx: { aim: Vec; quality: number } }) => Promise<void>;
    canBet: () => boolean;
  }>('stateBet');

  type Phase = 'club' | 'aim' | 'power' | 'flight';
  let phase = $state<Phase>('club');
  let club = $state<ClubKey>('driver');
  let aim = $state<Vec>(defaultAim());
  let pull = $state(0);
  let drag: 'aim' | 'power' | null = null;

  let overlay: SVGSVGElement;
  // pointer → FIELD coords via the overlay's rendered box (view is un-zoomed here)
  function toField(e: PointerEvent): Vec {
    const r = overlay.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * FIELD.w, y: ((e.clientY - r.top) / r.height) * FIELD.h };
  }

  function pickClub(c: ClubKey) { club = c; aim = defaultAim(); phase = 'aim'; }

  function onDown(e: PointerEvent) {
    const p = toField(e);
    overlay.setPointerCapture(e.pointerId);
    if (phase === 'aim') { drag = 'aim'; aim = clampAim(p); }
    else if (phase === 'power' && nearTee(p)) { drag = 'power'; pull = 0; }
  }
  function onMove(e: PointerEvent) {
    const p = toField(e);
    if (drag === 'aim') aim = clampAim(p);
    else if (drag === 'power') pull = pullFromDrag(p.y);
  }
  async function onUp() {
    if (drag === 'power') { if (shouldSwing(pull)) await swing(); else pull = 0; }
    drag = null;
  }

  async function swing() {
    if (!stateBet.canBet()) { phase = 'club'; return; }
    const quality = qualityFromPull(pull);
    phase = 'flight';
    // RGS draws the book; the handler stages the animation biased by aim+quality
    await stateBet.playRound({ mode: MODE_NAME[club], ctx: { aim: { ...aim }, quality } });
    pull = 0; phase = 'club';
  }

  // SVG helpers (FIELD space)
  const teeToAim = $derived(`M ${TEE.x} ${TEE.y - 10} Q 186 430 ${aim.x} ${aim.y}`);
  const meterR = 58, A0 = Math.PI * 0.75, SPAN = Math.PI * 1.5;
  function arc(r: number, a0: number, a1: number) {
    const p = (a: number) => `${TEE.x + Math.cos(a) * r} ${TEE.y - 4 + Math.sin(a) * r}`;
    return `M ${p(a0)} A ${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)}`;
  }
</script>

<GolfScene />

<svg
  bind:this={overlay}
  class="overlay"
  viewBox="0 0 {FIELD.w} {FIELD.h}"
  preserveAspectRatio="xMidYMid meet"
  onpointerdown={onDown}
  onpointermove={onMove}
  onpointerup={onUp}
>
  {#if phase === 'aim' || phase === 'power'}
    <!-- aim line + reticle -->
    <path d={teeToAim} class="aimline" />
    <circle cx={GREEN.x} cy={GREEN.y} r={RADII.aimMax} class="aimzone" />
    <circle cx={aim.x} cy={aim.y} r="15" class="reticle" />
    <line x1={aim.x - 20} y1={aim.y} x2={aim.x + 20} y2={aim.y} class="reticle" />
    <line x1={aim.x} y1={aim.y - 20} x2={aim.x} y2={aim.y + 20} class="reticle" />
  {/if}
  {#if phase === 'power'}
    <!-- power meter arc: track, pure band, fill -->
    <path d={arc(meterR, A0, A0 + SPAN)} class="track" />
    <path d={arc(meterR, A0 + SPAN * 0.75, A0 + SPAN * 0.95)} class="pure" />
    <path d={arc(meterR, A0, A0 + SPAN * Math.min(1, pull))} class:hot={isPure(pull)} class="fill" />
    <circle cx={TEE.x} cy={TEE.y + pull * 110} r="9" class="ghost" />
  {/if}
</svg>

<!-- HTML control layer (club select / lock-aim), above the SVG -->
<div class="ui">
  {#if phase === 'club'}
    <div class="panel">
      <h2>Pick your club</h2>
      <div class="clubs">
        {#each CLUBS as c}
          <button class:sel={c === club} onclick={() => pickClub(c)}>{c.replace(/([A-Z])/g, ' $1')}</button>
        {/each}
      </div>
    </div>
  {:else if phase === 'aim'}
    <button class="lock" onclick={() => (phase = 'power')}>LOCK AIM ✓</button>
  {:else if phase === 'power'}
    <p class="hint">Pull back &amp; release — hit the green band for a PURE strike</p>
  {/if}
</div>

<style>
  .overlay { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; z-index: 2; }
  .aimline { fill: none; stroke: rgba(255,120,240,.85); stroke-width: 2.5; stroke-dasharray: 7 9; }
  .aimzone { fill: rgba(255,255,255,.04); stroke: rgba(255,255,255,.12); stroke-width: 1; }
  .reticle { fill: none; stroke: #fff; stroke-width: 2.5; }
  .track { fill: none; stroke: rgba(255,255,255,.18); stroke-width: 9; stroke-linecap: round; }
  .pure { fill: none; stroke: rgba(57,255,122,.9); stroke-width: 9; stroke-linecap: round; }
  .fill { fill: none; stroke: #ffd34d; stroke-width: 9; stroke-linecap: round; }
  .fill.hot { stroke: #39ff7a; }
  .ghost { fill: rgba(255,255,255,.9); }
  .ui { position: absolute; inset: 0; display: flex; align-items: flex-end; justify-content: center; padding: 18px 18px 40px; pointer-events: none; z-index: 3; }
  .panel { pointer-events: auto; width: 100%; max-width: 360px; text-align: center; }
  .panel h2 { color: #eaf2ec; font-weight: 900; margin: 0 0 10px; font-size: 18px; }
  .clubs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  button { pointer-events: auto; border: none; border-radius: 12px; padding: 12px 8px; font-weight: 800; font-size: 13px; text-transform: capitalize; background: linear-gradient(180deg,#1b231d,#12180f); color: #eaf2ec; cursor: pointer; }
  button.sel { outline: 2px solid #39ff7a; }
  .lock { pointer-events: auto; background: linear-gradient(180deg,#5bff96,#2fe873); color: #04140a; padding: 13px 34px; border-radius: 999px; font-weight: 900; }
  .hint { pointer-events: none; color: #cfe3d5; font-size: 12px; font-weight: 600; text-shadow: 0 2px 8px rgba(0,0,0,.8); }
</style>

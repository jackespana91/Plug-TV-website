<!--
  Game.svelte — root game component for the Stake Engine web-sdk app.

  Responsibilities (thin — the SDK does the heavy lifting):
    - render the Pixi stage (GolfScene) inside the SDK's <App> canvas context
    - drive the club/aim/power pre-shot UI, then request a spin via the SDK's
      bet state machine (state-bet), passing the chosen club as the RGS `mode`
    - let the SDK's playBookEvents() + bookEventHandlerMap turn the returned book
      into the emitterEvents that GolfScene renders

  Wire-up specifics (context keys, <App>, stateBet API) follow the reference
  `lines` game in the web-sdk monorepo; see README.md for the drop-in steps.
-->
<script lang="ts">
  import GolfScene from './GolfScene.svelte';
  import { CLUBS, MODE_NAME, type ClubKey } from '../game/config.ts';
  import { getContext } from 'svelte';

  // state-bet exposes the bet lifecycle FSM; playRound triggers wallet/play with
  // the given mode and then plays the returned book through the handler map.
  const stateBet = getContext<{
    playRound: (args: { mode: string }) => Promise<void>;
    canBet: () => boolean;
  }>('stateBet');

  let club = $state<ClubKey>('driver');
  let phase = $state<'club' | 'aim' | 'ready'>('club');

  async function takeShot() {
    if (!stateBet.canBet()) return;
    await stateBet.playRound({ mode: MODE_NAME[club] });
    phase = 'club';
  }
</script>

<GolfScene />

<!--
  HTML overlay UI (club select / aim / power). Rendered as a Svelte HTML layer
  above the Pixi canvas, exactly as the SDK's components-ui-html layer does.
  Kept minimal here; the full aim reticle + pull-back meter port from the
  prototype's pointer handling.
-->
<div class="ui">
  {#if phase === 'club'}
    <div class="clubs">
      {#each CLUBS as c}
        <button class:selected={c === club} onclick={() => { club = c; phase = 'aim'; }}>{c}</button>
      {/each}
    </div>
  {:else}
    <button class="swing" onclick={takeShot}>SWING</button>
  {/if}
</div>

<style>
  .ui { position: absolute; inset: 0; display: flex; align-items: flex-end; justify-content: center; padding: 18px; pointer-events: none; }
  .clubs, .swing { pointer-events: auto; }
  .clubs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: 100%; max-width: 360px; }
  button { border: none; border-radius: 12px; padding: 12px; font-weight: 800; background: #141a16; color: #eaf2ec; cursor: pointer; }
  button.selected { outline: 2px solid #39ff7a; }
  .swing { background: #39ff7a; color: #04140a; padding: 14px 34px; border-radius: 999px; }
</style>

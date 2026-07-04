<!--
  GolfScene.svelte — the Pixi rendering surface, driven entirely by the tested
  pure shot engine. It subscribes to the `playShot` emitter event, then walks
  the compiled Timeline with sampleTimeline() on each tick, updating the ball
  and firing presentation cues (caption / sfx / camera / fx) as it crosses them.

  NOTE: This file builds inside the Stake Engine web-sdk monorepo (it imports
  pixi-svelte + the SDK ticker/emitter contexts). It cannot be compiled in the
  standalone `games/plug-golf` folder — the logic it depends on
  (src/game/shotEngine.ts) is what carries the test coverage.
-->
<script lang="ts">
  import { Container, Graphics, Text } from 'pixi-svelte';
  import { getContext } from 'svelte';
  import {
    sampleTimeline,
    timelineDuration,
    segDuration,
    type Timeline,
    type Cue,
  } from '../game/shotEngine.ts';
  import type { EmitterEvent, EventEmitter } from '../game/emitterEvents.ts';
  import { GREEN, TEE, RADII, BUNKERS, FIELD } from '../game/config.ts';
  import { drawCourse } from './draw.ts';

  // SDK-provided contexts (state-shared). Typed loosely here; the monorepo
  // supplies the real shapes.
  const emitter = getContext<EventEmitter<EmitterEvent>>('eventEmitter');
  const onTick = getContext<(cb: (dtMs: number) => void) => void>('onTick');
  const playSfx = getContext<(id: string) => void>('playSfx');
  // particle bus (confetti / fireworks / splash). Provided by a sibling FX layer.
  const playFx = getContext<(id: string, opts?: { big?: boolean }) => void>('playFx');

  // reactive ball + presentation state (Svelte 5 runes)
  let ball = $state({ x: TEE.x, y: TEE.y, alt: 0, scale: 1, on: true });
  let caption = $state<{ text: string; style: string; gold: boolean } | null>(null);
  let cameraMode = $state<'wide' | 'tee' | 'track' | 'land'>('wide');
  let vignette = $state(false);

  let active: Timeline | null = null;
  let clock = 0;
  let total = 0;
  let firedStart = new WeakSet<object>();
  let firedEnd = new WeakSet<object>();
  let resolveShot: (() => void) | null = null;

  function fireCue(c: Cue) {
    switch (c.kind) {
      case 'caption': caption = { text: c.text, style: c.style, gold: !!c.gold }; break;
      case 'sfx': playSfx?.(c.id); break;
      case 'camera': cameraMode = c.mode; break;
      case 'vignette': vignette = c.on; break;
      case 'fx': playFx?.(c.id, { big: c.big }); break;
    }
  }

  // main playback tick: sample the timeline and cross cues
  onTick?.((dtMs: number) => {
    if (!active) return;
    clock += dtMs / 1000;
    const s = sampleTimeline(active, clock);
    ball = { x: s.x, y: s.y, alt: s.alt, scale: s.scale, on: s.on };

    // cross start/end cues as the clock passes each segment boundary
    let acc = 0;
    for (const seg of active.segments) {
      const d = segDuration(seg);
      if (clock >= acc && !firedStart.has(seg)) { firedStart.add(seg); seg.cues.filter((c) => c.at === 'start').forEach(fireCue); }
      if (clock >= acc + d && !firedEnd.has(seg)) { firedEnd.add(seg); seg.cues.filter((c) => c.at === 'end').forEach(fireCue); }
      acc += d;
    }

    if (clock >= total) { active = null; cameraMode = 'wide'; resolveShot?.(); resolveShot = null; }
  });

  emitter?.subscribeOnMount({
    playShot: (e) =>
      new Promise<void>((resolve) => {
        active = e.timeline;
        clock = 0;
        total = timelineDuration(e.timeline);
        firedStart = new WeakSet();
        firedEnd = new WeakSet();
        caption = null;
        vignette = false;
        cameraMode = 'tee';
        resolveShot = resolve;
      }),
  });

  // simple broadcast-camera transform (matches the prototype's cut behaviour)
  const zoomFor = (m: string) => (m === 'land' ? 1.7 : m === 'tee' ? 1.5 : m === 'track' ? 1.18 : 1);
  let camX = $derived(cameraMode === 'wide' ? FIELD.w / 2 : ball.x);
  let camY = $derived(cameraMode === 'wide' ? 342 : ball.y - ball.alt * 0.45);
  let camZ = $derived(zoomFor(cameraMode));
</script>

<Container
  x={FIELD.w / 2}
  y={342}
  scale={camZ}
  pivot={{ x: camX, y: camY }}
>
  <Graphics draw={(g) => drawCourse(g, { GREEN, TEE, RADII, BUNKERS, FIELD })} />

  {#if ball.on}
    <!-- shadow -->
    <Graphics
      draw={(g) => {
        g.clear();
        g.ellipse(ball.x, ball.y + 5, 8 * ball.scale, 4.4 * ball.scale).fill({ color: 0x000000, alpha: 0.3 });
      }}
    />
    <!-- ball -->
    <Graphics
      draw={(g) => {
        g.clear();
        g.circle(ball.x, ball.y - ball.alt * 0.55, 8.4 * ball.scale).fill(0xffffff);
      }}
    />
  {/if}
</Container>

{#if vignette}
  <Graphics draw={(g) => { g.clear(); g.rect(0, 0, FIELD.w, FIELD.h).fill({ color: 0xff3c3c, alpha: 0.12 }); }} />
{/if}

{#if caption}
  <Text
    text={caption.text}
    x={FIELD.w / 2}
    y={FIELD.h * 0.34}
    anchor={{ x: 0.5, y: 0.5 }}
    style={{ fill: caption.gold ? 0xffd34d : 0xffffff, fontWeight: '900', fontSize: caption.style === 'small' ? 19 : 30, fontStyle: 'italic' }}
  />
{/if}

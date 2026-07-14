<!--
  Storybook: play any tier's book through the real bookEventHandlerMap into the
  GolfScene, so every animation branch can be visually verified in isolation
  (the SDK's standard way of testing book playback). Pick a book from the
  Controls panel; "Play" pipes its events through the handler map.

  Runs inside the web-sdk monorepo Storybook (config-storybook). See README.md.
-->
<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  export const { Story } = defineMeta({ title: 'PlugGolf/Shots', component: undefined });
</script>

<script lang="ts">
  import { setContext } from 'svelte';
  import GolfScene from '../components/GolfScene.svelte';
  import { bookEventHandlerMap } from '../game/bookEventHandlerMap.ts';
  import type { EmitterEvent } from '../game/emitterEvents.ts';
  import { FIXTURE_BOOKS } from './books.ts';

  let { bookName = 'hole-in-one (100x)' }: { bookName?: keyof typeof FIXTURE_BOOKS } = $props();

  // minimal emitter that fans out to GolfScene's subscription
  const subs: Partial<Record<EmitterEvent['type'], (e: never) => unknown>> = {};
  const emitter = {
    async broadcast(e: EmitterEvent) { await (subs as Record<string, (e: EmitterEvent) => unknown>)[e.type]?.(e); },
    subscribeOnMount(h: Record<string, (e: never) => unknown>) { Object.assign(subs, h); },
  };
  setContext('eventEmitter', emitter);
  setContext('playSfx', (_id: string) => {});
  setContext('playFx', (_id: string) => {});
  let tickCbs: ((dt: number) => void)[] = [];
  setContext('onTick', (cb: (dt: number) => void) => tickCbs.push(cb));
  // drive a ~60fps clock for playback
  setInterval(() => tickCbs.forEach((cb) => cb(16.7)), 16);

  async function play() {
    const b = FIXTURE_BOOKS[bookName];
    for (const ev of b.events) {
      const handler = (bookEventHandlerMap as Record<string, (e: unknown, ctx: unknown) => Promise<void>>)[ev.type];
      await handler(ev, {
        emitter,
        bookId: b.id,
        aim: { x: 218, y: 179 },
        quality: 0.85,
        wind: { dir: 1.1, spd: 3.2 },
      });
    }
  }
</script>

<Story name="Shot player" args={{ bookName: 'hole-in-one (100x)' }}>
  <button onclick={play}>Play “{bookName}”</button>
  <GolfScene />
</Story>

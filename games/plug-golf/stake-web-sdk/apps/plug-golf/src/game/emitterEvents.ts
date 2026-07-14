/**
 * emitterEvents — the higher-level events the bookEventHandlerMap broadcasts to
 * the Svelte/Pixi components. This is the second half of the SDK pipeline:
 *
 *   RGS -> book -> bookEvents -> bookEventHandlerMap -> emitterEvents -> components
 *
 * Components subscribe with eventEmitter.subscribeOnMount(). Handlers that
 * animate return a Promise the emitter awaits, so book playback stays ordered.
 */
import type { Timeline } from './shotEngine.ts';

export type EmitterEvent =
  // Play the whole compiled shot; the Ball/Scene component resolves when the
  // ball has come to rest (or dropped). Awaited, so the round can't settle early.
  | { type: 'playShot'; timeline: Timeline }
  // Reported closest-to-pin distance for the on-screen read-out.
  | { type: 'shotDistance'; meters: number | null }
  // The round's total win (integer x100). Drives the win meter / big-win banner.
  | { type: 'finalWin'; amount: number }
  // Offer a re-watchable slow-mo replay (10x+ results). The result UI shows a button.
  | { type: 'replayAvailable'; timeline: Timeline };

/**
 * Minimal shape of the SDK event emitter (state-shared `eventEmitter`). Declared
 * locally so this module and the handler typecheck without the monorepo present;
 * in the app it is the real emitter, whose broadcast awaits async subscribers.
 */
export interface EventEmitter<E extends { type: string }> {
  broadcast(event: E): Promise<void> | void;
  subscribeOnMount(handlers: Partial<{ [K in E['type']]: (e: Extract<E, { type: K }>) => Promise<void> | void }>): void;
}

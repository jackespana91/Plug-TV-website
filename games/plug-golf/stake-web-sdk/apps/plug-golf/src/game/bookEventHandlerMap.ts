/**
 * bookEventHandlerMap — the SDK's per-event handlers. `playBookEvents()` walks
 * the RGS book and calls the handler matching each event's `type`, in order.
 * Each handler broadcasts emitterEvents to the components and (when animating)
 * returns a Promise so the next book event waits for it.
 *
 * Follows the Stake Engine web-sdk pattern (apps/lines/src/game/
 * bookEventHandlerMap.ts): a record keyed by bookEvent `type`.
 */
import type { BookEvent, BookEventShot, BookEventFinalWin } from './typesBookEvent.ts';
import type { EmitterEvent, EventEmitter } from './emitterEvents.ts';
import { buildShotTimeline } from './shotEngine.ts';
import { mulberry32 } from './rng.ts';

export type ShotAim = { x: number; y: number };

export type HandlerContext = {
  emitter: EventEmitter<EmitterEvent>;
  bookId: number; // seeds the animation RNG -> reproducible story per outcome
  aim: ShotAim; // the player's chosen target (cosmetic)
  quality: number; // swing timing 0..1 (cosmetic)
  wind: { dir: number; spd: number };
};

export type BookEventHandlerMap = {
  [K in BookEvent['type']]: (event: Extract<BookEvent, { type: K }>, ctx: HandlerContext) => Promise<void>;
};

export const bookEventHandlerMap: BookEventHandlerMap = {
  async shot(event: BookEventShot, ctx: HandlerContext): Promise<void> {
    // The tier selects the story; the exact multiplier (x) only distinguishes
    // the 25x vs 50x/100x "mega" hole-in-one presentation.
    const timeline = buildShotTimeline(
      { tier: event.tier, mult: event.payoutMultiplier / 100 },
      {
        club: event.club,
        aim: ctx.aim,
        quality: ctx.quality,
        wind: ctx.wind,
        rng: mulberry32(ctx.bookId * 2654435761),
      },
    );
    await ctx.emitter.broadcast({ type: 'shotDistance', meters: timeline.distanceM });
    await ctx.emitter.broadcast({ type: 'playShot', timeline });
    if (timeline.mult >= 10) {
      await ctx.emitter.broadcast({ type: 'replayAvailable', timeline });
    }
  },

  async finalWin(event: BookEventFinalWin, ctx: HandlerContext): Promise<void> {
    await ctx.emitter.broadcast({ type: 'finalWin', amount: event.amount });
  },
};

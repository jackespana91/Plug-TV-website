/**
 * BookEvent types — the contract between the math package and the frontend.
 *
 * The RGS returns a `book` whose `events` array is a sequence of these. They
 * are produced by ../../../../stake-engine/generate-math.mjs (one book per
 * paytable row) and consumed by ./bookEventHandlerMap. Keep the two in sync.
 *
 * This mirrors the Stake Engine web-sdk pattern (see apps/lines/src/game/
 * typesBookEvent.ts in the SDK): a discriminated union keyed on `type`.
 */
import type { ClubKey, Tier } from './config.ts';

/** Emitted first: describes the shot the player just took and its outcome tier. */
export type BookEventShot = {
  index: number;
  type: 'shot';
  club: ClubKey;
  tier: Tier;
  payoutMultiplier: number; // integer x100 (1150 = 11.5x); distinguishes 25x/50x/100x holeIn
};

/** Emitted last: the total win for the round, as an integer x100 (1150 = 11.5x). */
export type BookEventFinalWin = {
  index: number;
  type: 'finalWin';
  amount: number;
};

export type BookEvent = BookEventShot | BookEventFinalWin;

/** A full book as returned by wallet/play. */
export type Book = {
  id: number;
  events: BookEvent[];
  payoutMultiplier: number; // integer x100
};

export const isShot = (e: BookEvent): e is BookEventShot => e.type === 'shot';
export const isFinalWin = (e: BookEvent): e is BookEventFinalWin => e.type === 'finalWin';

/**
 * Fixture books for Storybook / visual QA — one forced outcome per tier, in the
 * exact shape the RGS returns (and the math package emits). Lets a developer
 * scrub every animation branch without hitting a server. These mirror the rows
 * in ../../../../stake-engine/math/books_*.jsonl.
 */
import type { Book } from '../game/typesBookEvent.ts';
import type { ClubKey, Tier } from '../game/config.ts';

const book = (id: number, club: ClubKey, tier: Tier, pm: number): Book => ({
  id,
  events: [
    { index: 0, type: 'shot', club, tier, payoutMultiplier: pm },
    { index: 1, type: 'finalWin', amount: pm },
  ],
  payoutMultiplier: pm,
});

export const FIXTURE_BOOKS: Record<string, Book> = {
  'lose (0x)': book(1, 'driver', 'lose', 0),
  'deep rough (0.2x)': book(2, 'driver', 'rough', 20),
  'bunker (0.5x)': book(3, 'driver', 'bunker', 50),
  'fringe (0.8x)': book(4, 'driver', 'fringe', 80),
  'safe green (1x)': book(5, 'driver', 'green', 100),
  'birdie putt (2x)': book(6, 'wedge', 'closePutt', 200),
  'tap-in (5x)': book(7, 'wedge', 'tapIn', 500),
  'lip-out (10x)': book(8, 'shortIron', 'lipOut', 1000),
  'hole-in-one (25x)': book(9, 'threeWood', 'holeIn', 2500),
  'hole-in-one (50x)': book(10, 'driver', 'holeIn', 5000),
  'JACKPOT hole-in-one (100x)': book(11, 'masters', 'holeIn', 10000),
};

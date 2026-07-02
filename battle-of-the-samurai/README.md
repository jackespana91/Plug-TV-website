# Battle of the Samurai

A one-on-one katana duel in the browser. Best of 3 rounds against an AI
opponent that gets more aggressive every round.

## Play it

Open `index.html` in any modern browser — that's it. The whole game
(code, art, and synthesized sound) lives in that single file with no
dependencies, no build step, and no external assets.

## Controls

| Action  | Keyboard              | Touch |
|---------|-----------------------|-------|
| Move    | A / D or arrow keys   | ◀ ▶  |
| Attack  | J or Space            | 斬    |
| Block   | K or Shift            | 守    |
| Dash    | L (forward), W (back) | 躍    |

Attacks and dashes cost stamina (blue bar). Blocking a strike staggers
the attacker and opens them up for a counter. If the 60-second timer
runs out, the fighter with more health takes the round.

## Uploading / hosting

Because the game is a self-contained static bundle, you can host it
anywhere that serves files: GitHub Pages, Netlify, itch.io, or embedded
in the Plug TV site via an `<iframe src="battle-of-the-samurai/index.html">`.

**Note on Stake Engine:** Stake's platform requires games to be built
against their Web SDK and Math SDK, with all outcomes driven by their
remote game server (RGS) — a skill-based bundle like this can't be
submitted as-is. This build is ready for any standard web host; wiring
it into Stake's RGS would be a separate integration on their developer
portal.

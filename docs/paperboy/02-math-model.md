# PAPERBOY: THE RUN
## Mathematical Model & RNG Specification — v1.0

> **Phase 3 deliverable.** This document defines the underlying math for the game specified in `01-game-design-document.md`. Guiding constraint: **the player never controls the character; the animation visualizes a pre-determined RNG result.** Every number here is a launch-candidate default, structured so a certification lab can verify it and an operator can configure it.

---

## 1. Architecture Principles

1. **Server-authoritative, pre-determined.** On bet acceptance, the game server draws the complete round outcome — bust point, boost events, bonus trigger — from a certified RNG. The client receives an **outcome script** and performs it. The client holds no value logic.
2. **Two random streams, strictly separated:**
   - **Outcome stream** (certified RNG): everything with monetary consequence.
   - **Presentation stream** (client-side, uncertified, non-consequential): hazard skins, street theme, camera flourishes, which survived steps get "dramatic" near-miss dressing. This stream can never alter a payout, and no outcome information leaks into it beyond the script itself.
3. **Strategy-transparent RTP.** The player's only monetary decision is *when to cash out*. The model is constructed so the expected return is (near-)identical at every legal cash-out point — no hidden optimal strategy, no trap rungs. The one deliberate exception (Perfect Run, §7) is bounded and disclosed.
4. **Presentation never implies odds.** Hazard type, neighborhood theme, and near-miss drama carry zero information about probabilities. The only true risk signals are the route selected and the published ladder.

---

## 2. Core Model — Discrete Crash Ladder

A round is a sequence of **steps** (houses). Step *k* is survived independently with probability **p** (per route). Let the survival curve be:

```
S(k) = p^k        (probability the run reaches at least k successful deliveries)
```

The multiplier ladder is constructed for **constant RTP at every rung**:

```
m(k) = R_L / p^k
```

where **R_L** is the ladder RTP constant (the share of the total RTP budget carried by the ladder). Then for a player who cashes out after *k* deliveries:

```
E[return] = m(k) · S(k) = R_L        for every k — by construction.
```

Auto-cashout, early cash-out, deep riding: all yield the same expected return. This is the industry-standard crash construction and is trivially verifiable by a lab.

**Bust sampling.** The server draws U ~ Uniform[0,1) and computes the bust step as the smallest K with U ≥ p^K (equivalently, K ~ Geometric(p)). One draw fixes the entire run's survival outcome. Boost events (§5) and the bonus trigger (§6) are drawn from the same certified stream at bet time.

---

## 3. Route Parameters (Volatility Profiles)

Three routes, per the GDD. Total target RTP **96.0%** per route (configurable, §9), split between ladder and feature budget:

| | 🌅 Easy Street | 🏘 Suburbia (default) | 🌆 Dog Alley |
|---|---|---|---|
| Per-step survival **p** | 0.94 | 0.90 | 0.80 |
| Ladder constant **R_L** | 94.5% | 92.0% | 93.0% |
| Feature budget | 1.5% | 4.0% | 3.0% |
| **Total RTP** | **96.0%** | **96.0%** | **96.0%** |
| Ladder growth per house | +6.4% | +11.1% | +25.0% |
| First-rung multiplier m(1) | 1.005× | 1.02× | 1.16× |
| Mean run length (houses) | 15.7 | 9.0 | 4.0 |
| Median run length | 11 | 7 | 3 |
| Hit frequency (cash at rung 1) | 94.0% | 90.0% | 80.0% |
| Houses to reach ×2 | ~12 | ~8 | ~4 |
| Houses to reach ×10 | ~38 | ~23 | ~10 |
| Houses to reach ×100 | ~74 | ~45 | ~19 |
| Max win (cap) | 10,000× | 10,000× | 10,000× |
| Houses at cap | ~148 | ~88 | ~42 |
| P(reach cap) | ≈ 1 / 10,600 | ≈ 1 / 10,900 | ≈ 1 / 10,800 |

Feature budgets differ deliberately: Easy Street players cash early and rarely see deep-run features, so its RTP sits mostly in the ladder; Suburbia carries the full feature set.

**Sample ladder — Suburbia** (m(k) = 0.92 / 0.9^k, rounded to 2 dp for display):

| House | 1 | 2 | 3 | 5 | 7 | 10 | 15 | 20 | 25 | 30 | 45 | 88 (cap) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Multiplier | 1.02 | 1.14 | 1.26 | 1.56 | 1.92 | 2.64 | 4.47 | 7.57 | 12.81 | 21.68 | ~105 | 10,000 |

Displayed rungs are rounded; settlement uses exact values. The final rung is clamped to the max-win cap (the cap clamp's RTP effect is < 0.01% and is included in the certified simulation report).

**Volatility characterization** (single-round return, Suburbia, by auto-cashout target):

| Strategy | Hit rate | Std. dev. (× bet) |
|---|---|---|
| Cash at ×1.5 | ~61% | ~0.75 |
| Cash at ×3 | ~30% | ~1.7 |
| Cash at ×10 | ~9% | ~3.0 |
| Cash at ×100 | ~0.9% | ~9.6 |

(For a binary outcome at multiplier m with success probability s = R_L/m: SD = √(m·R_L·(1−s)).) The game's *effective* volatility is player-chosen — the defining property of the genre. Marketing volatility label: Easy Street "low–medium", Suburbia "medium–high", Dog Alley "high", with the above tables in the certification pack.

---

## 4. RTP Budget Allocation (Suburbia reference)

| Component | Mechanism | Contribution |
|---|---|---|
| Multiplier ladder | §2 | 92.0% |
| 💰 Money Envelopes | §5.1 | 1.4% |
| 📰 Golden Newspaper boosts | §5.2 | 1.2% |
| 🗞 Daily Big Paper bonus | §6 | 1.0% |
| 🏆 Perfect Run bonus | §7 | ≤ 0.4% |
| **Total** | | **96.0%** |

⭐ VIP Newspaper and 🎁 Free Delivery are **presentation slots with zero independent EV**: a VIP house dresses a normal (or boosted) rung; a Free Delivery dresses a scripted step with survival probability 1 inserted purely for pacing (it adds no rung value and consumes no risk, so it is RTP-neutral by construction).

---

## 5. Collectible Math

### 5.1 Money Envelopes (banked side prizes)
On each survived step, independently with probability **π_e = 0.8%**, the outcome script attaches an envelope worth **v_e = 0.25× bet**, credited *immediately and kept even if the run later busts* (the "side pocket" — a consolation mechanic that also softens deep-run losses).

```
EV = π_e · v_e · Σ p^k = π_e · v_e · p/(1−p) = 0.008 · 0.25 · 9 = 1.8%  → tuned to 1.4% via π_e = 0.62%
```

### 5.2 Golden Newspaper (multiplicative boost)
Each step independently carries, with probability **π_g**, a **×g boost applied to all subsequent rungs** of that run's ladder. To keep RTP identical at every cash-out point, the base ladder is deflated by the per-step boost expectation:

```
c = (1 − π_g + π_g·g)          m(k) = R_L · c^(−k) / p^k … presented net of deflation
E[rung k payout] · S(k) = R_L  for all k — strategy-independence preserved.
```

Defaults: **π_g = 0.6%, g = ×3** → c = 1.012, contributing 1.2% of budget. The visual: the golden paper is thrown at the boost step and the multiplier visibly jumps — the outsized rung is *explained* by the pickup, but its expectation was funded in the ladder from step 1.

### 5.3 Presentation-only pickups
VIP Newspaper and Subscription Reward per §4 — zero EV, dressing only. This must be stated plainly in the game rules ("some pickups are visual events") to satisfy fairness review.

---

## 6. Daily Big Paper — Bonus Round

- **Trigger:** drawn at bet time, probability **t = 1/500** per round, independent of bust point. Because it is independent, it is awarded even if the run subsequently busts (the street event interrupts the run; the run then resumes/settles as scripted).
- **Prize:** drawn from a certified discrete table, `E[P] = 5.0× bet` → EV = t·E[P] = **1.0%**.

| Prize (× bet) | 2 | 5 | 10 | 25 | 100 | 500 |
|---|---|---|---|---|---|---|
| Weight | 55% | 30% | 10% | 4% | 0.9% | 0.1% |

(Table E = 5.03×; final weights tuned in simulation.)

---

## 7. Perfect Run Bonus

Pays **b = 1.0× bet**, added at cash-out, if the run reaches **10+ deliveries** and is cashed out (Suburbia; thresholds 15/7 for Easy Street/Dog Alley to equalize reach probability ≈ 35/39/21%).

This is the model's one strategy-dependent component: only players who ride to the threshold can realize it. Maximum EV = b·p^10 = 0.35% (Suburbia); a player who always cashes at rung 1 forgoes it. Consequences, handled explicitly:

- Published RTP is disclosed as a range: **95.6% – 96.0%** (jurisdictions requiring a single figure display the maximum with the range in the help file — standard practice for strategy-dependent games).
- If an operator or regulator objects, the v1 fallback is pre-approved: Perfect Run becomes a celebration + sticker with no payout, and its 0.4% budget moves into the ladder constant. The GDD supports either without redesign.

---

## 8. The Outcome Script (RNG → Visuals Mapping)

The server resolves the round into a compact script; the client dramatizes it. Example:

```json
{
  "roundId": "…", "route": "suburbia", "bet": 1.00,
  "bustStep": 11,
  "steps": [
    {"k":1}, {"k":2}, {"k":3},
    {"k":4, "envelope": 0.25},
    {"k":5}, {"k":6, "dramatic": true},
    {"k":7, "boost": {"g":3}},
    {"k":8}, {"k":9, "freeDelivery": true}, {"k":10}
  ],
  "bigPaper": null,
  "perfectRunEligibleAt": 10,
  "ladder": [1.02, 1.14, "…exact values…"]
}
```

| Visual event (GDD) | Script source | Monetary? |
|---|---|---|
| House delivered, multiplier tick | survived step k < bustStep | Yes — rung value |
| Dog/car/skateboard/etc. appears & is escaped | presentation stream dressing on a survived step | No |
| Near-miss slow-motion | `dramatic` flag (outcome stream marks eligible steps; client may also self-select from presentation stream on unflagged survived steps) | No |
| Fatal hazard / wipeout | step k = bustStep | Yes — ends run |
| Money envelope handoff | `envelope` | Yes — banked side prize |
| Golden newspaper slow-mo throw | `boost` | Yes — rung enhancement (§5.2) |
| VIP house / gold porch light | presentation dressing | No |
| Free Delivery mailbox | `freeDelivery` (survival-prob-1 step) | No |
| Main Street / Daily Big Paper cinematic | `bigPaper` trigger + prize | Yes |
| Street events (garbage truck, rain, block party…) | presentation stream | No |

**Compliance rules for the presentation layer:**

1. Dramatic near-miss dressing may appear **only on survived steps**. A bust is never presented as "almost survived" (no fake photo-finishes on losses).
2. Hazard skins must be uniformly assigned across step indices so no skin becomes a folk predictor of danger.
3. The decision-window slow-down is constant-duration and identical whether the next step is a survival or the bust — the client *knows* the future and must not leak it (audio, timing, and animation ahead of the current step must be drawn only from information available as if the future were unknown). This is a hard review item for the presentation code.

---

## 9. Configurability

RTP variants are produced by scaling the ladder constant only (feature parameters fixed):

| Variant | Total RTP | R_L (Suburbia) |
|---|---|---|
| A (default) | 96.0% | 92.0% |
| B | 95.0% | 91.0% |
| C | 94.0% | 90.0% |
| D (premium/regulated-max) | 97.0% | 93.0% |

Each variant is a separately certified configuration; the client renders ladders from server-provided tables, so no client change is required.

Bet limits: 0.10 – 100.00 (operator-configurable); max exposure per round = bet × 10,000 (cap) + side prizes, bounded for treasury sign-off in the simulation report.

---

## 10. RNG & Certification Path

- **RNG:** CSPRNG (e.g., ChaCha20 or Fortuna) seeded from hardware entropy, on the game server, compliant with **GLI-19** (interactive gaming systems) / **GLI-11** RNG requirements; statistical suite: NIST SP 800-22 + Diehard/TestU01 as required by the lab.
- **Optional provably-fair layer:** commit `HMAC(serverSeed, roundId)` before bet; reveal after settlement. Not a substitute for lab certification in regulated markets, but a strong trust feature for crash-genre audiences.
- **Lab scope:** RNG certificate; math verification of §2–§7 formulas; Monte-Carlo simulation ≥ 10⁹ rounds per route/variant confirming RTP within tolerance; max-win and cap-clamp verification; strategy-independence check (RTP measured across a grid of auto-cashout policies); presentation-leak review per §8.
- **Operational compliance:** full round replay from stored outcome scripts; interrupted-round handling (outcome settled at draw time — reconnect fast-forwards, per GDD §18); malfunction-voids-play statement; per-jurisdiction RTP display; reality checks and limit tooling per GDD §16.

---

## 11. Tuning Levers (post-certification lives here, pre-certification only)

| Feel problem | Lever | Guardrail |
|---|---|---|
| Runs feel too short | ↑ p with matching ladder recompute | Keep m(1) ≥ 1.0; re-certify |
| Big wins too rare to market | ↑ Dog Alley share of promotion; ↑ π_g / g | Budget-neutral shuffle within §4 |
| Sessions too swingy | Nudge default route to Easy Street for new players | Cosmetic default only — never per-player math |
| Bonus feels absent | ↑ t with ↓ E[P] | Constant t·E[P] |

**Never** vary math per player, per session history, or per balance. One config per certified variant, full stop.

---

*Prev: `01-game-design-document.md` · Next: `03-art-direction.md`*

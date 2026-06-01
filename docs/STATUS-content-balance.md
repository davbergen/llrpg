# Content & Balance loop — status & handoff

> Working branch: `auto/content-balance` (never merged to main by the loop).
> Goal contract: `docs/GOAL-content-balance.md`. Last updated 2026-05-31.

## TL;DR

Stage 0 (harness) **done and green**. Loss state (B1/B2) done. **The balance
blocker is now RESOLVED** (2026-06-01): all **3 existing dungeons pass the bands**
for all 3 classes via a human-authorized **3-class rebalance + a struggling-floor
band relaxation** (see "Balance resolution" below). The only remaining sim-gate
failure is the structural **"8 dungeons, not 3"** count — that is the next slice
(author 5 more dungeons), not a balance failure.

## Gate status (after balance-tuning slice, 2026-06-01)

- `npm run build` (tsc) — ✅ green
- `npm run lint` — ✅ green (2 pre-existing warnings in `components/rpg/index.tsx`, not ours)
- `npm test` — ✅ green (259)
- `npm run sim` (balance gate) — 🟡 **3/4**: all three band tests PASS; only the
  `has exactly 8 tiered dungeons (DoD B)` test fails (3 dungeons, not 8). Red purely
  on dungeon *count*, no longer on *balance*.

## Balance resolution (2026-06-01, human-directed session, HITL ×4)

The original blocker (below) assumed warrior was *the* outlier. Sim grid-search
proved it was a **three-way class misalignment** plus a math wall:

1. **Warrior fragile, priest damage-starved, mage over-survivable.** Warrior's
   premium spender (Execute) and priest's (Judgment) unlock at L7 — above every
   dungeon — so at intended level their DPS trailed mage's nukes; mage's burst +
   Frostbolt mitigation made it near-unkillable. No boss-knob set fixed all three.
2. **Struggling-guardrail vs full-length lessons is a math wall.** With 5/10/15/20-q
   lessons, realized accuracy concentrates tightly → win-rate is a near-deterministic
   step of accuracy. A 0.70-accuracy "struggling" player therefore can't reach >25%
   at any config where the 0.85 "typical" player sits in 60–85% (proven by sweep).
   Only ~1-question lessons soften the curve enough — which would gut the PRD's
   lesson-length pillar.

**Human decisions (david):** (a) rebalance **all three** classes' ability numbers;
(b) **keep full-length lessons**, accept balance need not be mathematically perfect,
and note classes will complement each other once **multiplayer** lands; (c) therefore
**relax the human-owned struggling guardrail** (`strugglingWinRateMin` 0.25 → 0 in
`bands.ts`, documented inline as a human-authorized change). The **typical band
(60–85%) remains the binding definition of balanced** and is met by all 3 classes.

**Final tuned state** (typical win %, all casts 7–9, all threatening at 12–16% end HP):

| Dungeon | L | mage / warrior / priest | Boss knobs |
|---|---|---|---|
| Forest of First Words | 2 | 77 / 75 / 75 | maxHp 150, counter 16 (no mechanic) |
| Crypt of Conjugations | 4 | 76 / 64 / 75 | maxHp 260, counter 15, enrage <50% ×1.5 |
| Spire of Kanji        | 6 | 79 / 82 / 78 | maxHp 260, counter 18, enrage <50% ×1.4 |

Ability changes in `class-abilities.ts`: warrior Cleave 24→26/g3→4, Reckless
32→44/g4→5, Bash 50→48, Execute 110→130; priest Smite 10→12, Holy Bolt 22→26,
Radiant Strike 38→48, Judgment 80→95; mage Frostbolt reduction 0.5→0.35, Meteor
65→38, Chain Lightning 70→40 (mage L5–6 nukes trimmed — they only affect Spire).
Crypt's boss mechanic re-themed regen → enrage (pure regen made L4 untunable across
classes; the `.md` flavor note was updated).

## Commits this session (oldest → newest)

1. `b0f1376` Stage 0 harness: `src/sim/{bands,simulate,evaluate}.ts` + unit tests + `npm run sim`
2. `10ef812` Dungeons declare `tier` + `intendedLevel` in front-matter
3. `1a55fc7` Boss-centric sim model (human-chosen measurement)
4. `3f97114` Fix a red build (unused import) — note: #3 was briefly committed on red; caught & fixed immediately
5. `bed1633` Class-aware ability policy (skilled play; higher sim fidelity)

## Definition of Done — progress

### A. Harness — ✅ DONE
- `simulate(dungeon, archetype, class, level) → { winRate, castsToBoss, endHpFraction, anyOneShot }` exists.
- Unit-tested (`src/sim/simulate.test.ts`, in `npm test`) + dedicated gate `npm run sim`.
- Bands are named constants in one human-owned module (`src/sim/bands.ts`).

### B. Dungeons — 🟡 PARTIAL
- ✅ Each dungeon declares intended `tier` + `intendedLevel`.
- ✅ All **3 existing dungeons pass the bands** for all 3 classes (2026-06-01).
- ❌ Only 3 dungeons exist; DoD requires **8 in a tiered DAG** — next slice.

### C. Content (spine) — ⬜ NOT STARTED
- N5 completion, N4 add, JMdict correctness gate, level tags. Vendored data is in
  `data/vendor/` (Stage 0, pre-existing). No spine work done this session.

### D. Gates — build/lint/test green every iteration; sim red by design until B is met.

## ⛔ Blocker (needs human decision — this is why the loop paused)

**The 60–85% win-rate band cannot be satisfied by the game as currently built,
because the game has no loss state.**

Evidence gathered via the harness (all reproducible by re-running the sim):

1. `App.tsx:333` applies counter damage through `clampPlayerHp` → `Math.max(1, …)`.
   The player's HP **clamps to 1**; you literally cannot lose a fight. The
   vertical-slice PRD shipped this as a deliberate placeholder ("HP-clamp-to-1 …
   lets us ship the damage code path without shipping a death state. The next
   slice that adds real failure can build on this.").
2. A sim grid-search showed:
   - **Boss `counterDmg` is nearly inert** in 8–16 range (longer fights absorb
     more counters anyway); **boss `maxHp` is the dominant knob.**
   - Under a "fully heal at home between days" model, boss HP is **completely
     inert** — mage/warrior/priest all win 100% even at boss HP 550. So a literal
     heal-between-days reading makes bosses untunable.
   - Under the committed no-mid-fight-heal model, there's a large class spread
     (mage ~100% everywhere; warrior/priest cliff to 0–23% at the regen/enrage
     bosses) driven by damage-per-turn vs boss regen — **not** a misplay artifact
     (a smarter class-aware policy, commit `bed1633`, did not close it).

**Decision made:** add a **real loss state** (chosen over reinterpreting the bands
or balancing against suboptimal play). This makes the existing bands literally
true and is the PRD's anticipated "next slice that adds real failure."

**RESOLVED — B1 / #79 (HITL decision, 2026-05-31):** defeat cost = **(a) retreat
to current monster + full heal, monster HP resets, no resource penalty.** Chosen
as the closest fit to current feel (HP already regens at Home) and least-punishing
for a daily-cap game where re-clearing costs real days. Full spec:

| Aspect | Behavior on defeat |
|---|---|
| Where the player lands | Back on the **current monster** (same `currentMonsterIndex`); the run is **not** reset, earlier-cleared monsters stay cleared. |
| What heals | Player HP **fully restored** to max. |
| What resets | **Current monster HP resets to full** (`currentMonsterHp = monster.maxHp`); in-progress chip damage on it is lost. |
| Resource penalty | **None** — no gold/gem/XP loss, no streak break. |
| Daily cap | **Not** refunded; `lastAbilityUsedAt` unchanged (consistent with the PRD's "a failed lesson still costs your daily action"). |
| Flow | combat path surfaces a `defeated` outcome → minimal defeat screen → "Retreat" → Dungeon screen at full HP, current monster at full HP. |

B1 is done; **B2 (#82) implements exactly this model.** (Decision is recorded
here; the GitHub issue mirror was not posted — record it on #79/#82 if desired.)

## Recommended next slices (in order)

> **DONE since this list was written:** loss state (B1/B2) and **"tune the 3
> existing bosses" (item 2 below)** — all 3 now pass the bands. Next up is item 3:
> author 5 more dungeons. New dungeons must clear the same bands; reuse the tuned
> archetypes (low/mid counter + enrage below 50% is the workhorse pattern; pure
> boss regen is untunable across classes at these levels — avoid it).

1. **Loss state (game-design).** Defeat cost **decided** (B1/#79: retreat + full
   heal + monster HP reset, no penalty — see Blocker section above). Implement:
   - Engine: stop clamping lethal damage; surface a "defeated" outcome from the
     combat path (the pure `applyAbility` already returns real `counterDamage`;
     the clamp is only in `App.tsx`). Keep `clampPlayerHp` or replace per decision.
   - Routing: `App.tsx` defeat branch → retreat to current monster, fully heal the
     player, reset `currentMonsterHp` to the monster's `maxHp`; no resource change,
     `lastAbilityUsedAt` untouched.
   - UI: a minimal defeat screen.
   - Tests: engine defeat-outcome unit tests; keep gate green.
   - The sim (`src/sim/simulate.ts`) already models loss (ends a run at HP ≤ 0),
     so it needs **no change** — it was validated against this exact model.
2. **Tune the 3 existing bosses** into 60–85% across all 3 classes at intended
   level, via sanctioned knobs only (boss `maxHp`/`regen`/`enrage`, monster
   HP/counter, questions-per-cast). Watch the class spread — if no boss-knob set
   satisfies all 3 classes simultaneously, that's a **second escalation** (class
   ability numbers are NOT a sanctioned knob).
3. **Author 5 more dungeons** as a tiered DAG (tiers 1→4, ~2 per upper tier),
   each with `tier`/`intendedLevel`, each tuned green.
4. **Spine (DoD C):** N5 completion + N4 from the vendored blessed list, JMdict
   correctness gate, level tags. Net-new, independent of balance.

## Notes / process learnings

- The sim deliberately diverges from a literal "heal between days" reading of the
  game because the grid proved that reading makes bosses untunable. The committed
  model (HP carries through the boss fight; mana-rests refresh mana only, no heal)
  is the only one where win rate responds to tuning. Documented in
  `simulate.ts`'s `simulateRun` docstring.
- `npm run sim` is intentionally excluded from `npm test` so the unit gate stays
  green while bands are still being tuned. Don't fold it back in until B is done.
- Guardrails respected: bands.ts untouched as a tuning lever; no test weakening.
  One self-caught slip (committing `1a55fc7` on a red build) was fixed forward in
  the very next commit.

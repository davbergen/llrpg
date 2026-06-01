# Content & Balance loop — status & handoff

> Working branch: `auto/content-balance` (never merged to main by the loop).
> Goal contract: `docs/GOAL-content-balance.md`. Last updated 2026-06-01.

## TL;DR

Stage 0 (harness) **done and green**. Loss state (B1/B2) done. Balance blocker
resolved (2026-06-01). **DoD B is now COMPLETE** (2026-06-01): **8 dungeons** exist
as a tiered DAG and **all 8 pass the bands** for all 3 classes. The sim gate is
fully green. **DoD C (spine) is now IN PROGRESS:** slice **C1 (correctness gate
+ blessed-list reader) is done and green** (2026-06-01). Remaining: **C2**
(regenerate the vocab spine from the blessed N5/N4 lists, gated) and any
kanji/grammar follow-up.

## DoD C — spine (in progress)

### C1 — correctness gate + blessed reader ✅ (commit `eee86ea`)

Build/test-time-only foundation (neither module is imported by client code, so
nothing lands in the bundle):

- `src/content/spine/jmdict.ts` — decompresses the vendored
  `jmdict-eng-common` zip (PK/deflate via `zlib.inflateRawSync`), indexes words
  by written form (kanji + kana), maps all 52 fine JMdict POS codes → coarse
  spine categories (`categoryOf`), and exposes `validateVocabEntry()` (form +
  kana reading + POS + optional meaning-overlap) and `lookupVocab()`.
- `src/content/spine/blessed.ts` — quote-aware CSV reader for the blessed N5/N4
  membership lists; throws on malformed rows.
- `jmdict.test.ts` — 16 tests (POS map, meaning overlap, index, gate
  accept/reject paths, list reader). `npm test` now 277 (was 261).

**Actual vendored list sizes: N5 = 718, N4 = 668 data rows** (the MANIFEST's
723/667 reflect the older full-width source shape; the committed CSVs are the
standard `expression,reading,meaning,tags,guid` shape).

### C2 — regenerate vocab spine from the blessed lists ⬜ NEXT

Plan + measured findings (re-run with a vite-node script over `lookupVocab`):

- **Exact `(expression, reading)` JMdict match rate before normalization:**
  N5 **648/718 (90%)**, N4 **586/668 (88%)**. Every miss is a *mechanical*
  normalization, not bad data:
  1. **Multi-form rows** packed with `; ` — `足; 脚` / `あし`, `いい; よい`,
     `川; 河`. → split expression *and* reading on `;`/`；`, try each combo.
  2. **Prefix/suffix markers `～`** — `～円`, `～回`, `～区`, `～月`. → strip `～`
     and look up the bare form (these become counter/suffix POS).
  3. **Suru-verbs** — `運動`/`うんどうする`, `心配`/`しんぱいする`. The bare form
     already matches (`formOnly`); → strip trailing `する` from the reading
     (POS becomes noun-with-`vs`).
  4. **Honorific お/ご** — `お酒`/`おさけ`, `お皿`. → try with and without the
     honorific prefix.
  5. **Parentheticals** — `パート (タイム)`, `～ございます`. → strip `(...)`.
- **POS derivation:** pick the *primary* sense's first POS code
  (`words[].sense[0].partOfSpeech[0]`) → most accurate (`運動`→noun not verb,
  `元気`→adjective). Add `primaryPos` to the JMdict index in C2.
- **Build a residual allowlist** of any rows that *still* don't resolve after
  normalization, characterize them, and decide per the contract (100%-present
  is human-owned — a stubborn residue is an escalation, not a silent drop).
- **id strategy:** the current spine uses english slugs; 1.4k entries need
  unique, *stable* ids (they key persisted FSRS cards via `cardKey`). Candidate:
  `${jp}:${reading}` (the unique lookup key). Verify the `cardKey` separator
  won't collide first.
- **Reading format change (flag for human review):** the current 200 entries
  store **romaji** readings (`reading: mizu`); the blessed source + JMdict are
  **kana** (`みず`). The gate validates against kana, and the contract mandates
  membership from the blessed list, so C2 regenerates with **kana** readings,
  replacing the hand-authored romaji prototype set. This is a visible product
  change (the `recall` face subtitle under the kanji becomes kana, not romaji) —
  pedagogically standard, but call it out at merge.
- **Consumer migration to check before C2 lands green:** `card-renderer`
  (`recall` subtitle, kanji `reading` face), placement test, lesson-composer,
  and any test asserting on the current 200 entries or romaji readings.
- After C2, fold the vocab spine-coverage assertion (every entry passes
  `validateVocabEntry`; N5/N4 lists 100% present) into `npm test`.

## Gate status (after the 5-dungeon slice, 2026-06-01)

- `npm run build` (tsc) — ✅ green
- `npm run lint` — ✅ green (2 pre-existing warnings in `components/rpg/index.tsx`, not ours)
- `npm test` — ✅ green (261)
- `npm run sim` (balance gate) — ✅ **green (9/9)**: all 8 dungeons pass the bands
  at their intended level, and the `has exactly 8 tiered dungeons` count test passes.

## Dungeon DAG (8 dungeons, after the 5-dungeon slice)

```
                 forest-of-first-words  (T1, L2)        ← root
                  /                       \
   crypt-of-conjugations (T2,L4)   garden-of-particles (T2,L4)
            |                                |
     spire-of-kanji (T3,L6)          hall-of-counters (T3,L6)
        /         \                          |
citadel-of-keigo  labyrinth-of-loanwords   sanctum-of-idioms
   (T4,L6)            (T4,L6)                  (T4,L6)
```

Tiers 1→4 with branching (forest unlocks two tier-2 dungeons; the two tier-3
dungeons fan out into three tier-4 dungeons), so several dungeons are "available"
at once — matching DoD B.

**Why tier 4 is intended-level 6, not higher.** The endgame tier is *harder via
tankier/late-enrage bosses, not a higher intended level.* This is forced by the
class-balance math, not laziness:

- The three classes only stay mutually in-band **below level 7**. At L7 the premium
  spenders unlock (mage Cataclysm 100 / warrior Execute 130 / priest Judgment 95)
  and break class symmetry: mage's no-ramp burst kills the boss in ~6 casts while
  warrior/priest gate their nuke behind a rage/faith ramp (~10–12 casts), absorbing
  far more counter. Sim sweep at L8 confirmed the wall — e.g. boss HP 500/counter 20
  gives **mage 100% / warrior 0% / priest 0%**, and no boss-knob set closes it
  (the survival-counter thresholds for 6-cast vs 12-cast classes do not overlap).
  Fixing it would require editing class ability numbers — **not a sanctioned knob**
  for this loop (guardrail #4). So the loop keeps all dungeons at L≤6.
- At L6 the passing window is itself a needle around the Spire's config
  (~260 HP / 18 counter / enrage 0.5×1.4): below it, the priest's Greater Heal
  makes it immortal (100%); above it, mage/warrior cliff to 0%. The three tier-4
  bosses were tuned to three distinct in-band points within that needle (see table).

| Dungeon | Tier/L | Boss | HP / counter / enrage | typical m/w/p |
|---|---|---|---|---|
| garden-of-particles | 2 / L4 | Particle Sovereign | 260 / 15 / 0.5×1.5 | 82 / 62 / 74 |
| hall-of-counters    | 3 / L6 | Counter Colossus   | 260 / 18 / 0.5×1.4 | 79 / 84 / 77 |
| citadel-of-keigo    | 4 / L6 | Keigo Emperor      | 262 / 18 / 0.5×1.4 | 72 / 80 / 70 |
| sanctum-of-idioms   | 4 / L6 | Idiom Sphinx       | 264 / 19 / 0.5×1.35 | 68 / 81 / 65 |
| labyrinth-of-loanwords | 4 / L6 | Loanword Leviathan | 264 / 18 / 0.45×1.5 | 68 / 76 / 61 |

(The sim seed is keyed on dungeon id, so identical boss numbers under different ids
give slightly different win rates — each dungeon was tuned under its own id.)

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

### B. Dungeons — ✅ DONE (2026-06-01)
- ✅ Each dungeon declares intended `tier` + `intendedLevel`.
- ✅ **8 dungeons** exist as a tiered DAG (tiers 1→4 with branching) — see the
  Dungeon DAG section above.
- ✅ Every dungeon **passes the bands** for all 3 classes at its intended level.

### C. Content (spine) — 🟡 IN PROGRESS
- **C1 done** (commit `eee86ea`): the JMdict correctness gate + blessed-list
  reader exist and are unit-tested (`src/content/spine/jmdict.ts`, `blessed.ts`,
  `jmdict.test.ts`). See the "DoD C — spine" section above for the full C2 plan
  and measured match rates.
- **C2 remaining:** regenerate the vocab spine from the blessed N5/N4 lists
  (100% present, all gate-passing, level-tagged); kanji/grammar follow-up TBD.
  Vendored data is in `data/vendor/` (Stage 0).

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

> **DONE since this list was written:** loss state (B1/B2), **"tune the 3 existing
> bosses" (item 2)**, and **"author 5 more dungeons" (item 3)** — all 8 dungeons now
> exist as a tiered DAG and pass the bands. **DoD A and B are complete.** The only
> remaining work is **item 4: the spine (DoD C)** — net-new, independent of balance.
>
> Tuning lessons banked for any future dungeon work: low/mid counter + enrage below
> 50% is the workhorse pattern; pure boss regen is untunable across classes; keep
> intended level ≤6 (premium spenders at L7 break class symmetry past any boss knob);
> and the L6 passing window is a needle around 260 HP / 18 counter / enrage 0.5×1.4.

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

# GOAL: Content & Balance — Autonomous Build

> Source of truth for an **unattended, runs-until-done** development loop.
> Created 2026-05-31. Invoked via `/loop` pointed at this file.
> Every iteration re-reads this contract. The loop may not edit this file's
> targets, bands, or guardrails — only a human may.

---

## Mission

Bring LinguaQuest from "blocked on content" to a state where it has:

1. an automated **fight-balance simulation harness**,
2. **multiple available dungeons** (8, tiered) that all pass the balance bands, and
3. a **deepened learning spine** (N5 completed + N4 added) sourced from a blessed
   external list, never invented.

The loop works in **slice-sized iterations** on the `auto/content-balance` branch,
gates hard on green every iteration, checks the Definition of Done, and **stops**
when all of it is true.

---

## Bedrock principle (do not violate)

**Game progression and learning progression are decoupled.**

- *Game progression* — which dungeon you're on, monster difficulty, hero level —
  is **identical for every player**. Two players who install on the same day start
  at Dungeon 1 and advance through the same sequence regardless of Japanese level.
  This is the axis multiplayer will eventually share.
- *Learning progression* — which spine items appear in a player's lesson MCQs — is
  **per-player**, set by the placement test and driven by FSRS. An N4 learner and
  an N5 learner get different cards **in the same fight**.
- The two axes meet **only** through `accuracy → damage`. Combat balance is a
  game-side concern and is independent of a player's JLPT level, because a
  well-matched learner sits near the "typical" accuracy band whether their cards
  are N5 or N4.

Consequence: **dungeons are never bound to JLPT level or content tags.** Dungeon
theme is flavor only, never a content selector.

---

## Definition of Done

The loop is finished when **all** of the following hold simultaneously on the
`auto/content-balance` branch:

### A. Harness (Stage 0 — must land first)
- [ ] A headless balance simulation exists over the pure `game/` engines:
      `simulate(dungeon, playerArchetype, class, level) → { winRate, castsToBoss, endHpFraction, anyOneShot }`.
- [ ] It is unit-tested and runnable as part of `npm test` (or a dedicated
      `npm run sim` that CI/the gate invokes).
- [ ] All band thresholds live as **named constants in a single config module**
      (see Bands). Changing them is a human-only action.

### B. Dungeons
- [ ] **8 dungeons** exist, organized as a **tiered DAG**: clearing a tier-N
      dungeon unlocks the (typically 2) tier-N+1 dungeons, so several dungeons are
      "available" at once. Same topology for every player.
- [ ] Each dungeon declares an **intended hero level + tier**.
- [ ] Every dungeon **passes the Bands** (below) at its intended level **for all
      three classes** (mage / warrior / priest), using game-side knobs only.

### C. Content (spine)
- [ ] The vendored, blessed **JLPT N5 list is 100% present** in the spine.
- [ ] The vendored, blessed **JLPT N4 list is 100% present** in the spine.
- [ ] **Every** spine entry (existing and new) passes the **JMdict correctness
      gate**: its reading, meaning, and part-of-speech validate against the
      vendored dictionary. A mistranscription fails the build.
- [ ] Every new entry is **deterministically gradable MCQ** (recall / reverse /
      cloze faces as already supported). No free-text, no AI grading.
- [ ] Entries are tagged by level (`N5` / `N4`) so placement/FSRS can scope them
      per-player. (Level tags drive *personalization*, never dungeon gating.)

### D. Gates (every iteration, and at finish)
- [ ] `npm run build` (tsc) green
- [ ] `npm run lint` green
- [ ] `npm test` green
- [ ] balance sim green (all 8 dungeons pass bands)

When A–D are all checked, write a final summary and stop.

---

## Balance Bands (the definition of "balanced")

Evaluated per dungeon, at its **intended hero level**, across **all 3 classes**.

**Player archetypes** (lesson-accuracy assumption):
- struggling ≈ **70%**
- typical ≈ **85%**  ← balance is judged against this one
- strong ≈ **95%**

**Pass bands (typical player, intended level):**
- Win rate **60–85%** — not unwinnable, not trivial.
- Boss dies in **≥3 and ≤12** ability-casts — fights have shape, don't drag.
- On at least one class, the player ends the boss fight with **>0 and <60% HP** —
  it should feel threatening.
- **No single monster one-shots** a typical player at intended level.

**Guardrail bands:**
- struggling player win rate **> 25%** — not hopeless.
- strong player is **not 100%-trivial** — still loses some HP.

These numbers are **config constants**, not hardcoded logic. Retuning them is a
**human-only** action; the loop must treat them as fixed.

---

## Content sourcing (rule B + correctness gate)

**Rule B — AI is a renderer, not a curriculum designer.** The loop never decides
*what* Japanese to teach.

- **Membership** (which words/kanji/grammar belong in N5/N4) comes from a **single
  blessed community list** (JLPT lists are community reconstructions since 2010;
  pin one — e.g. Tanos/jlptstudy — and do not blend sources).
- **Correctness** of each entry is verified against **vendored JMdict** committed
  in the repo.
- **Vendor-once, then offline:** the JMdict data and the blessed list are
  downloaded **once, with a human present (Stage 0)** and committed. Every
  unattended iteration thereafter runs **fully offline** against the committed
  copies. The loop does not hit the network during a run, and cannot swap the
  authoritative list underneath itself.
- Rendering sentences/distractors stays within the existing API-renderer role and
  must remain deterministically gradable.

---

## Iteration protocol

1. Pick the next slice (Stage 0 harness/vendoring first; then dungeons and content
   batches). Keep it small and shippable — matches the repo's slice culture.
2. Implement on `auto/content-balance`.
3. Run the **four-part gate** (build / lint / test / sim).
4. If **red**: fix within the iteration, or revert the iteration. **Never advance
   on red.**
5. If **green**: commit the slice with a clear message, evaluate the Definition of
   Done.
6. If DoD fully met → write final summary, stop. Else → next iteration.

Integration: the loop commits to `auto/content-balance` only. **A human reviews
the branch and merges to `main`.** The loop never commits to `main`.

---

## Guardrails (hard "do not cross")

1. **Decoupling** — never bind dungeon/game progression to JLPT/learning level.
2. **No invented curriculum** — new spine only by structuring the blessed list;
   every entry passes the JMdict gate or the build fails.
3. **Deterministic grading** — MCQ only; no AI grading, no free-text answers.
4. **No balance-by-cheating** — tune only via sanctioned game-side knobs (monster
   HP/counter, questions-per-cast, dungeon tier/level). Must **not** pass bands by
   editing the sim, loosening band constants, or weakening/skipping/`xfail`-ing
   tests.
5. **Ethics** — learning is never paywalled; only pace/cosmetics/convenience may
   be. No content locked behind money/gems.
6. **Stack/scope lock** — don't relitigate the locked stack; don't pull in
   deferred-to-v1.5 features (parties, TTS, AI grading, IAP, etc.); don't touch
   `.obsidian/`, Android release config, or Supabase release config.
7. **Green-gate integrity** — never advance on red; never weaken the gate.

#4 and #7 carry the teeth: they are the classic ways an autonomous optimizer
"succeeds" dishonestly. The band constants (Q2) and the gate are human-owned.

---

## Sanctioned tuning knobs (game-side only)

- Monster `baseHp` / `hpMultiplier`
- Monster `counterDmg` / `counterMultiplier`
- Boss `maxHp`, `regenPerTurn`, `enrageBelowPct`, `enrageCounterMultiplier`
- Dungeon intended **tier / hero level**
- **Questions-per-cast** (ability lesson size) — identical for all players, never
  JLPT-specific

Never a tuning knob: anything that changes *which content* a player sees as a
function of *which dungeon* they're in.

---

## Out of scope for this loop

Telemetry/PostHog, report-question/quarantine, onboarding polish, Android OAuth /
notifications / rebrand / Play Store, and everything under STATUS.md "Known cuts."
This loop is content + dungeons + balance only.

## Problem Statement

The first hands-on playtest (2026-06-02) of LinguaQuest surfaced seven issues. A follow-up commit claimed to fix six of them, but on inspection several are still live and one was never the real problem. As a player I currently experience: XP that accrues from answering questions rather than winning fights (so I out-level content by grinding); a Mage kit where one cost-2 ability strictly beats the other and big abilities are simply better than small ones (so most of the ability list is dead); inventory items like the Mana Elixir that I can collect but never use; lessons that silently vanish — with the Mana already spent — if I tap a nav tab by accident; kanji-vs-vocab prompts that ask "What does this mean?" for a bare kanji noun like 赤 in a way that misleads me; and a phone notification reading "3 cards due" that means nothing to me because I have never seen the word "card" in this game.

## Solution

A single playtest-fix pass on the `playtest-fixes` branch addressing five of the seven issues, with the sixth (kanji/vocab disambiguation) flagged as a separate content task. Concretely:

- **XP comes only from monster and boss kills**, not per answered question (per ADR-0001).
- **The Mage (and all class) ability tables are rebalanced** so no ability strictly dominates another, and the damage-per-Mana curve is inverted so small **Efficiency** abilities and large **Burst** abilities each have a real role (per ADR-0002).
- **Consumable items become usable** via a general handler, with the Mana Elixir wired first (restore Mana to full, capped).
- **Lessons can no longer be lost by accident**: the nav bar is hidden during an active lesson, and the Mana charge is deferred from ability-pick to lesson-commit so backing out is free.
- **Review notifications speak the player's language** ("Your training awaits") instead of leaking the internal "card" term.

## User Stories

1. As a player, I want XP to come only from defeating monsters and the boss, so that my level reflects how well I fight rather than how many questions I have ground through.
2. As a player, I do not want answering individual lesson questions to grant XP, so that I cannot out-level content without engaging combat.
3. As a returning player who studied via FSRS reviews and kept a streak, I want that effort to feel rewarded through review scheduling and streak buffs, so that removing per-question XP does not make studying feel pointless.
4. As a Mage, I want each ability that costs the same Mana to be a genuine choice, so that I am never picking a strictly worse button.
5. As a Mage, I want Fireball to be a pure-damage option and Frostbolt to be a lower-damage option that weakens the enemy Counter, so that the two cost-2 abilities trade damage against utility instead of one dominating.
6. As a Mage, I do not want a higher-Mana ability (e.g. Meteor) to deal less damage than a cheaper one, so that spending more Mana is never a trap.
7. As a player choosing an ability, I want low-Mana **Efficiency** abilities to deliver more total damage per point of Mana, so that casting cheap abilities is a deliberate trade of HP and time for Mana-efficiency.
8. As a player choosing an ability, I want high-Mana **Burst** abilities to kill in fewer turns and therefore absorb fewer Counters, so that spending big buys tempo and HP-safety at a Mana premium.
9. As a player managing a daily Mana budget, I want the choice between a few Burst casts and many Efficiency casts to matter, so that combat has a real economy.
10. As a Warrior and as a Priest, I want the same "no strict domination, inverted damage-per-Mana curve" balance applied to my kit, so that all three classes share a coherent design.
11. As a player who picked up a Mana Elixir, I want to use it to restore my Mana, so that the item is not dead inventory.
12. As a player out of Mana mid-dungeon, I want a shortcut to use a Mana Elixir from the Dungeon screen, so that I can refill at the moment I actually need it.
13. As a player browsing my inventory on the Hero screen, I want a "USE" action on consumable items, so that I can consume them without leaving the screen.
14. As a player using a Mana Elixir, I want my Mana restored to full (capped at the maximum), so that the effect is meaningful rather than overflowing a small Mana pool.
15. As a player who uses a consumable, I want it removed from my inventory afterward, so that consumption is honest.
16. As a player who collects a Vocab Scroll or Kanji Crystal, I want them to show the same "USE" affordance, so that the inventory feels consistent even before their effects are wired.
17. As a player who has started a lesson, I do not want the nav bar visible, so that I cannot accidentally leave the lesson and lose my progress.
18. As a player who picks an ability and begins its lesson, I do not want my Mana charged until I commit the lesson, so that abandoning a lesson costs me nothing.
19. As a player who deliberately backs out of a lesson, I want my Mana intact, so that experimentation is not punished.
20. As a player, I do not want to see notifications mentioning "cards", so that I am not confused by internal terminology I have never encountered in-game.
21. As a player with reviews waiting, I want a notification like "Your training awaits — N reviews ready", so that the reminder is meaningful and on-theme.
22. As a developer, I want the notification to keep the count of due reviews, so that the reminder still communicates urgency.
23. As a developer, I want XP to flow from a single source (the combat engine's kill rewards), so that there is no second hidden XP path to reason about.
24. As a developer, I want a static test proving no ability strictly dominates another, so that future tuning cannot silently reintroduce a dead button.
25. As a developer, I want the rebalanced ability tables to keep every dungeon within its balance bands in the simulation, so that the inverted curve is proven against real encounters rather than asserted by hand-picked numbers.

## Implementation Decisions

### #1 — XP from kills only (ADR-0001)
- Remove the per-correct-answer XP contribution in the App-level lesson-completion handler. The combat engine's `xpGained` (driven by `KILL_XP_REGULAR` / `KILL_XP_BOSS`) becomes the **sole** XP source feeding progression.
- No new module. The "studying is rewarded" intent is carried by the existing FSRS scheduler and streak buff, not by raw XP.

### #2 + #7 — Ability rebalance (ADR-0002)
- Treated as **one** problem: "Frostbolt dominates Fireball" and "no reason to use low-Mana abilities" are the same tuning curve seen from two ends.
- **No strict domination:** for any two abilities in a class, one must not have greater-or-equal damage AND greater-or-equal utility at less-or-equal Mana. Cost-2 Mage becomes Fireball = pure damage, Frostbolt = lower damage + Counter-debuff. Fix Meteor so its damage is not below a cheaper ability's.
- **Inverted damage-per-Mana curve:** damage-per-Mana is non-increasing as Mana cost rises. Low-Mana **Efficiency** abilities yield more damage per Mana but, because the **Counter** is a fixed per-turn hit, cost more Counters over a kill; high-Mana **Burst** abilities cost a Mana premium per damage but kill in fewer turns. Applied to all three classes (Mage, Warrior, Priest).
- The fixed per-turn Counter is the lever that makes both ends viable; it is not changed.

### #3 — Consumables
- New pure module (working name **`consumables`**) exposing a function of the shape `applyConsumable(item, resources) -> { resources, consumed }`, where `resources` carries the current/maximum Mana (and is open to other consumable effects later). Pure, React/DOM-free, in the `game/` style.
- Wire **only the Mana Elixir** this pass: restore Mana to the maximum (`MANA_MAX`), capped. This reconciles the existing data bug where the Elixir advertised "Restores 40 MP" against a Mana cap of 10 — the advertised copy is corrected to match.
- The App layer gains a `useItem` handler (parallel to the existing `equipItem`) that calls `applyConsumable`, applies the returned resources, and removes the item from inventory on `consumed`.
- Two entry points: a "USE" affordance in the Hero-screen inventory for consumable item types, and a Mana-Elixir shortcut on the Dungeon screen surfaced when Mana is short. Vocab Scroll / Kanji Crystal show the same "USE" affordance; their effects are a fast-follow, not in this pass.

### #4 — Lesson abandonment (Guard + Defer)
- **Guard:** hide the nav bar while a lesson is active, so a lesson cannot be accidentally exited mid-flow.
- **Defer:** move the Mana spend from ability-pick time to lesson-commit time. The `spendMana` logic itself is unchanged; only the call site moves. Abandoning a lesson therefore costs no Mana and burns no daily action.
- True mid-lesson resume (serializing question order / answers / FSRS snapshot) is explicitly **not** built.

### #6 — Notification copy
- Change only the strings produced by the notification schedule builder. Title/body become RPG-themed and player-facing (e.g. title "Your training awaits", body referencing "N reviews ready" and LinguaQuest). The due-review **count** is retained. No change to scheduling, batching, or frequency.

### Documentation already in place
- `CONTEXT.md` — domain glossary (Spine, Face, **Card** as engineering-only vs **Review** player-facing, Counter, Burst vs Efficiency ability, Daily mana budget).
- `docs/adr/0001-xp-from-kills-only.md`, `docs/adr/0002-inverted-damage-per-mp-curve.md`.
- `docs/PRD-vertical-slice.md` story #32 annotated "Superseded by ADR-0001".

## Testing Decisions

A good test in this codebase exercises a module's external interface as a black box: given inputs, assert outputs. It does not import internal helpers, assert on intermediate state, or couple to the React tree. The `game/` and `notifications/` modules are pure, so tests are `expect(fn(input)).toEqual(output)`. Tests that break under a behavior-preserving refactor are bad tests. Prefer the highest existing seam; only add a seam when none exists.

- **#1 (combat-engine, existing seam):** existing `combat-engine.test.ts` already asserts `xpGained` from kills (`KILL_XP_REGULAR` / `KILL_XP_BOSS`). The change is the removal of a second, App-level XP path; the regression guarantee is that the combat engine remains the only XP source. No new module-level test is required.
- **#2 + #7 (class-abilities static + sim dynamic):**
  - Add a static invariant test to `class-abilities.test.ts` (which already validates the 21-ability table): for each class, assert **no ability strictly dominates another** and **damage-per-Mana is non-increasing as Mana cost rises**.
  - The existing **balance gate** `src/sim/dungeons.sim.test.ts` (run via the dedicated sim vitest config) is the dynamic proof: the rebalanced tables must keep all 8 dungeons within their bands. We assert the gate stays green rather than asserting specific damage numbers.
- **#3 (new `consumables` module):** unit-test `applyConsumable` like its `game/` peers — Mana Elixir restores Mana to the cap, never exceeds `MANA_MAX`, returns `consumed: true` and leaves unrelated resources untouched; a non-consumable or unknown item returns `consumed: false` and unchanged resources.
- **#4 (mana.spendMana, existing seam):** `mana.test.ts` already covers `spendMana`; its behavior is unchanged, only its call site moves. The nav-guard and deferred-charge wiring live in React and are verified through the manual acceptance flow below, not a unit test — an acknowledged gap.
- **#6 (buildNotificationSchedule, existing seam):** update `fsrsScheduler.test.ts` title/body assertions to the new copy, keeping the existing structure (count, fireAt, batching) intact.

### Prior art
Every `game/` module has a sibling `*.test.ts` of the black-box form; `combat-engine.test.ts`, `mana.test.ts`, and `class-abilities.test.ts` are the closest models for the new and modified tests. `src/sim/dungeons.sim.test.ts` is the prior art for property/band testing over the ability and dungeon data.

### Acceptance flow (manual)
A player can: complete a lesson and gain XP only when a monster dies; in the Mage kit, find a real reason to cast both cost-2 abilities and at least one low-Mana ability; collect and use a Mana Elixir from both the Hero inventory and the Dungeon to refill Mana; start a lesson, see no nav bar, and (via a back-out path) lose no Mana; and receive a review notification with no occurrence of the word "card".

## Out of Scope

- **#5 kanji/vocab disambiguation** — the bare-kanji vocab prompt confusion (e.g. 赤 the noun vs 赤い the adjective) is flagged as a **separate content task**, not part of this pass. Likely fix is a part-of-speech hint on vocab prompts, decided there.
- **True mid-lesson resume** — preserving in-progress lesson state across navigation is not built; the Guard + Defer approach makes it unnecessary for this pass.
- **Scroll / Gem consumable effects** — the Vocab Scroll and Kanji Crystal get the "USE" affordance but their effects are deferred to a fast-follow.
- **Notification throttling / quiet hours** — only the copy changes; frequency and scheduling are untouched.
- **Per-question study reward replacement mechanics** — no new XP-substitute system is designed beyond relying on existing FSRS and streak.
- **Re-deriving the balance bands** — the human-owned bands in the sim are taken as given; only game-side ability numbers are tuned to fit them.
- **The `NextSteps.md` fight-screen visual overhaul** — unrelated to these playtest issues.

## Further Notes

- The fixes are independent and best landed in the order **#6 -> #1 -> #3 -> #4 -> #2+#7**: copy and single-source-XP first, the `consumables` module and lesson wiring next, and the ability rebalance last because it is the one that needs sim iteration against the bands.
- The "fix six playtest issues" commit (`f5608c0`) reworked the XP *curve* and added ability *descriptions* but did **not** remove per-question XP, did **not** break the Frostbolt > Fireball domination, and did **not** make any item consumable — which is why those reappear here.
- ADR-0001 and ADR-0002 exist specifically so a future contributor does not "fix" these decisions back: lessons granting no XP and an expensive ability being less Mana-efficient both look like bugs but are deliberate.

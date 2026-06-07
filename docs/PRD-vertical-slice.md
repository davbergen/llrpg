# PRD: First Vertical Slice — Dungeon Loop

## Problem Statement

I have a working visual prototype of LinguaQuest with onboarding, a dashboard, a placeholder lesson, a loot screen, and a profile — but none of it is connected to the actual gameplay loop the product is built around. There is no dungeon, no fight, no ability tier system, no equipment, no XP/level progression that means anything, and nothing persists across page refreshes. As a result, I cannot playtest the central design hypothesis: *does gating combat abilities behind lessons of varying length actually feel good?* Until I can answer that question, every other feature decision (party play, training dojo, multiple dungeons, SRS, content scale) is built on a guess.

## Solution

A first vertical slice that ships the entire core loop — pick ability → complete lesson → damage applied to monster → loot drop → next monster → boss → dungeon cleared — for one hardcoded dungeon, in single-player, with localStorage persistence. Everything outside this loop is cut or stubbed. The slice is intentionally narrow enough to ship quickly and complete enough to actually play across multiple sessions.

## User Stories

1. As a new player, I want to choose a name and class during onboarding, so that I have a character that feels like mine.
2. As a returning player, I want to skip onboarding when I already have a character, so that I can jump straight into the dungeon.
3. As a player, I want my character, gold, XP, level, equipment, and dungeon progress to persist across page refreshes, so that I can play across multiple sessions.
4. As a player, I want a single button on the home screen labelled "Enter Dungeon" or "Continue Dungeon", so that I always know what the next action is.
5. As a player viewing the home screen, I want to see my current HP, XP, level, and gold at a glance, so that I understand my character's state.
6. As a player viewing the home screen, I want to see the current dungeon's name and my progress through it (e.g. "2/4 cleared"), so that I know how far I've gotten.
7. As a player entering the dungeon, I want to see the current monster I'm facing with its HP bar, so that I know who I'm fighting.
8. As a player in the dungeon, I want to see three ability options labelled with their damage and lesson length (5q / 10q / 20q), so that I can choose how much I'm willing to study for how much damage.
9. As a player picking an ability, I want tapping it to immediately launch the corresponding lesson, so that the cost-to-power tradeoff is one tap and one decision.
10. As a player in a lesson, I want to see one multiple-choice question at a time (Japanese word, four English options), so that the lesson is easy on a phone.
11. As a player answering a question, I want immediate feedback on whether my answer was correct, so that I learn as I play.
12. As a player at the end of a lesson, I want my accuracy to translate proportionally into ability damage, so that getting questions right matters but a single wrong answer isn't catastrophic.
13. As a player completing a lesson, I want to be returned to the dungeon screen with the damage applied to the monster, so that the lesson and the fight feel like one action.
14. As a player who attacked a monster, I want the monster to counter-attack me for a fixed amount of damage, so that the fight feels like a fight.
15. As a player whose HP would drop to zero, I want my HP clamped to 1 instead, so that the slice has no death state.
16. As a player whose monster has been defeated, I want to see a loot screen showing XP gained, gold gained, and any item dropped, so that the reward feels celebratory.
17. As a player after a regular monster, I want a chance at gold and a cosmetic item drop, so that there's variability in monster rewards.
18. As a player after a boss, I want a guaranteed equippable item drop, so that boss kills feel meaningful.
19. As a player who just leveled up, I want a brief celebratory overlay, so that I notice the progression milestone.
20. As a player who just leveled up, I want my max HP to increase by 10 and my HP fully restored, so that the level-up feels like a tangible upgrade.
21. As a player after defeating a monster, I want to be returned to the dungeon view with the next monster loaded, so that the loop continues without friction.
22. As a player after defeating the final boss, I want the dungeon to flip to a "cleared" state and offer a return to home, so that I see closure on the run.
23. As a player who has used my one ability for the day, I want the ability buttons disabled with a "come back tomorrow" message, so that the daily-cap rule is visible and predictable.
24. As a playtester, I want a debug toggle in the tweaks panel to reset the daily ability cap, so that I can iterate on gameplay without waiting wall-clock days.
25. As a playtester, I want a "Wipe save" button in the tweaks panel, so that I can reset to a fresh state at will.
26. As a player, I want my HP to fully regenerate when I return to the home screen, so that I'm not punished for taking damage.
27. As a player, I want to view my character profile with three equipment slots (head, chest, legs) and an inventory, so that I can see what I've collected.
28. As a player, I want to tap an item in my inventory to equip it to its slot, so that I can apply its bonuses.
29. As a player, I want equipping an item to add its damage bonus to every ability I use, so that gear meaningfully strengthens my character.
30. As a player whose slot is already filled, I want equipping a new item to swap the previous occupant back to inventory, so that I can change gear freely.
31. As a player, I want item rarity (common, uncommon, rare, epic) to scale the damage bonus, so that rare drops feel better than common drops.
32. As a player, I want each correctly-answered question to grant a small XP reward (5 XP), so that studying inside the lesson feels rewarded on its own.
    > **Superseded by [ADR-0001](adr/0001-xp-from-kills-only.md)** — per-question XP was removed after playtest #1; XP now comes only from monster kills.
33. As a player, I want defeating a monster to grant a meaningful XP and gold chunk (50 XP for monsters, 200 XP for the boss), so that combat is the primary progression.
34. As a player who closes the tab mid-fight, I want to return to the same monster with the same HP when I reopen, so that no progress is lost.
35. As a developer, I want the lesson, combat, progression, and persistence logic to live in pure modules outside of React, so that the core game can be tested without rendering.
36. As a developer, I want the localStorage save key to be versioned (e.g. `llrpg:save:v1`), so that breaking schema changes naturally orphan old saves rather than requiring migration code.
37. As a player who failed to complete a lesson with full accuracy, I still want my partial-damage ability to count as my one daily action, so that the daily-cap is honest about its constraint.

## Implementation Decisions

### Modules to build

- **`save` module.** A small persistence wrapper. Exposes `loadSave()`, `saveSave(state)`, `wipeSave()`. Reads/writes a single versioned localStorage key (`llrpg:save:v1`). Returns a typed snapshot or `null` when no save exists or parsing fails. No migration logic — schema breaks are handled by bumping the key suffix, which orphans old saves.

- **`lesson-engine` module.** Pure logic. Given a vocab pool and a question count, produces an ordered list of multiple-choice questions (one Japanese prompt + four English options, three of which are random distractors from the same pool). Tracks answers as the player makes them. Returns final accuracy as a number in `[0, 1]`. No React, no DOM, no I/O.

- **`combat-engine` module.** Pure state machine for the dungeon/fight loop. Inputs: current dungeon state, ability tier, lesson accuracy, equipment-derived damage bonus. Outputs: next dungeon state (monster HP after damage, current monster index, dungeon-cleared flag), counter-damage to apply to the player, loot drops if the monster died, XP gained. Single source of truth for `lastAbilityUsedAt`. Knows the boss's identity but treats it as "monster + bigger HP + guaranteed equippable drop" — no unique mechanics.

- **`progression` module.** Pure function. Given current `{ xp, level, maxXp }` and an XP delta, returns `{ xp, level, maxXp, leveledUp }`. Encapsulates the "+10 max HP and full heal on level up" rule. Caller applies the HP change to the hero.

- **`stats` module.** Pure function. Given a hero, equipped items, and level, returns derived `{ damageBonus, maxHp }`. Read-only by every other module. Rarity-to-bonus mapping (common +1, uncommon +2, rare +5, epic +10) lives here.

- **`daily-cap` module.** `canUseAbility(now, lastUsedAt)` returns boolean using same-calendar-day comparison. Trivial, but isolated so the debug-reset toggle is one call.

### Screens

The slice has six screens. Some are new, some are rewrites of existing prototype screens, some are refactors.

- **Onboarding** — kept as-is. Name + class picker. Class is cosmetic.
- **Home** — refactored. Replaces the existing daily-quests / party-quest UI with: hero summary (HP, XP, level, gold), the single dungeon card with current progress, and a single primary CTA ("Enter Dungeon" or "Continue Dungeon"). Existing quest/party UI is removed from this slice.
- **Dungeon** — new. Merges what the pitch calls "Dungeon View" and "Fight View" into one screen, since they show the same content in a 1-vs-1 turn-based fight. Shows current monster art (emoji), monster HP bar, and three ability buttons. When the dungeon is cleared, shows a cleared state and a "Return to Home" button.
- **Lesson** — rewritten. Existing prototype's mixed question types and lives system are removed. New version is question-count-parameterized, MCQ-only, with proportional accuracy returned to the caller.
- **Loot** — repurposed. Shown after every monster death. Shows XP gained, gold gained, item dropped (if any), and a level-up overlay if the player dinged. "Continue" returns to the dungeon (next monster) or home (dungeon cleared).
- **Profile** — refactored. Existing tabs/achievements/study-history UI is simplified. Shows hero, level, XP bar, the three equipment slots (head, chest, legs), and the inventory. Tap an item to equip; equipped items swap with the slot's current occupant.

### Schema changes

Existing types in `src/types.ts` are extended:

- New `DungeonState`: `{ dungeonId, currentMonsterIndex, currentMonsterHp, lastAbilityUsedAt }`.
- New `Monster`: `{ id, name, maxHp, isBoss, lootTable }`.
- New `Ability`: `{ id, tier: 'weak' | 'medium' | 'strong', baseDamage, lessonQuestions }`.
- New equipment shape on `Hero`: `{ head, chest, legs }`, each holding an `InventoryItem | null`.
- `GameState` gains `dungeonState`. `partyMembers` and `questProgress` are still typed but unused by the slice and may be removed in a later cleanup.

### Hardcoded data

- One dungeon with 3 regular monsters + 1 boss, fixed sequence.
- Three abilities: Weak (5q lesson, low base damage), Medium (10q, medium), Strong (20q, high). Class-based renaming/recoloring is cosmetic.
- ~100-word JLPT N5 vocab pool in a TS file. Each entry: `{ jp, romaji, en }`. Distractors pulled randomly from the rest of the pool.

### Persistence flow

- One key: `llrpg:save:v1`. JSON value contains hero, gameState (including dungeonState), and equipment slots.
- Load on mount; if absent or unparseable, start at Onboarding with `INITIAL_STATE`.
- Save via a `useEffect` that watches the persisted slices and writes JSON on every change. No debouncing.
- `tweaks` are not persisted.

### Daily-cap behavior

- `combat-engine` records `lastAbilityUsedAt` whenever an ability fires. Ability buttons in the Dungeon screen are disabled when `daily-cap.canUseAbility` returns false, with a "come back tomorrow" message.
- A button in the tweaks panel ("Reset daily cap") clears `lastAbilityUsedAt`.

### Combat numeric rules

- Damage applied = `(ability.baseDamage + stats.damageBonus) * lessonAccuracy`, rounded.
- Monster counter-attack = fixed flat damage per monster (configured per-monster in the dungeon table).
- Player HP clamped to a minimum of 1; no death state.
- HP fully restored on returning to the Home screen.
- XP rewards: 5 per correct question, 50 per regular monster kill, 200 per boss kill.
- Level-up grants +10 max HP and full heal. Tuned so a fresh dungeon clear yields ~1 level-up.

### Build order

1. Persistence skeleton — `save` module + load/save wiring + tweaks "Wipe save" button.
2. Types and hardcoded data — dungeon, monsters, abilities, vocab pool.
3. Static Dungeon screen — renders current monster, ability buttons inert.
4. Lesson rewrite — uses `lesson-engine`, returns accuracy.
5. Connect lesson → ability → damage — `combat-engine` integrated; daily cap enforced; tweaks reset button added.
6. Death-and-loot routing — Loot screen consumes drops, returns to Dungeon for next monster.
7. Boss + dungeon-cleared state — boss fight, guaranteed drop, return-to-home flow.
8. Profile equipment — slots, tap-to-equip, derived damage bonus consumed by `combat-engine`.
9. Polish — level-up overlay, daily-cap copy, HP regen on home-return.

## Testing Decisions

### What makes a good test (in this codebase)

A good test exercises a module's external interface only. It treats the module as a black box: given inputs, assert outputs. It does not import internal helpers, does not assert on intermediate state, and does not couple to the React tree. Because the deep modules above are pure functions or pure state machines, every meaningful test is `expect(fn(input)).toEqual(expectedOutput)` or `expect(machine.step(state, input)).toEqual(expectedNextState)`. A test that breaks during a refactor that doesn't change behavior is a bad test.

### Modules to test

- **`lesson-engine`** — generated questions all draw from the pool, distractors are unique and don't include the correct answer, accuracy reflects the proportion of correct answers, question count is honored.
- **`combat-engine`** — damage applied = `(base + bonus) * accuracy`, monster HP clamps at 0 and triggers death routing, dungeon-cleared flag flips after the boss only, daily-cap blocks repeat ability use within the same day, drops are emitted with the correct rarity rules (boss always equippable).
- **`progression`** — XP rolls over correctly into a level, `leveledUp` flag is set on the transition only, max-HP increment compounds across multiple level-ups within one delta.
- **`save`** — round-trips a known state through `saveSave` + `loadSave`, returns `null` when the key is absent, returns `null` on JSON parse failure (does not throw), `wipeSave` clears the key.

### Modules NOT tested

- **`stats`** — single-line lookup, not worth a test.
- **`daily-cap`** — trivial and a wrapped date comparison.
- **All React screens** — no test runner configured in the repo (no Vitest, no Jest). Adding a test runner is itself a task; the pure-module tests above can be run with a minimal Vitest setup as a single follow-up. Screen testing (RTL or Playwright) is out of scope for this slice.

### Prior art

There is no prior testing infrastructure in the codebase. The slice will introduce Vitest as the test runner (zero-config with Vite, native TypeScript) and the four module test files listed above will be the first tests.

## Out of Scope

- **Party play.** No multiplayer, no party UI, no party-only dungeons, no role mechanics (tank/dps/healer). The pitch's class roles are purely cosmetic in the slice.
- **Training Dojo.** No separate study-only screen. Lessons happen exclusively as the cost of using an ability. The "I want to study but already used my daily ability" case is handled in the slice by the debug-reset button, not by a designed feature.
- **Multiple dungeons.** Exactly one hardcoded dungeon. No dungeon selection screen, no recommended-level system, no dungeon types.
- **Spaced repetition.** No SRS algorithm, no per-word review state, no "due today" surfacing. Vocab is pulled at random from a flat pool.
- **Audio, listening, sentence construction, type-the-answer.** Only multiple choice. No IME, no audio assets, no grammar engine.
- **Real failure state.** Dungeons cannot be failed. Player HP cannot reach 0. No retreat flow, no potion economy, no rest timer.
- **Streak/daily-quest economy beyond the cap itself.** No "missed a day" penalty, no streak rewards tied to dungeon progress, no daily quest reset.
- **Save migration.** Schema changes during slice development handled by bumping the key version (orphaning old saves), not by a migration framework.
- **Equipment depth.** Only damage-bonus stat. No HP slots, no crit, no defense, no resistances, no set bonuses, no comparison tooltips, no equip confirmation dialogs.
- **Multiple save slots.** Single slot.
- **Class differentiation in mechanics.** Classes share the same three abilities with cosmetic renaming; no class-specific damage scaling, no class-locked equipment.
- **Screen-level tests.** No React Testing Library or Playwright work.

## Further Notes

- **Acceptance test (single sentence):** A new player can open the app, complete onboarding, enter the dungeon, defeat 3 monsters and 1 boss across multiple sessions (closing and reopening the tab between fights), see their character level up at least once, equip a boss drop in the Profile, return to Home with the dungeon marked cleared, and have all of that survive a page refresh.
- **The slice's job is to answer one design question:** does lesson-as-ability-cost feel good? Anything not in service of that question is scope creep. In particular, the daily-cap is shipped as a real check (with a debug bypass) because its *plumbing* is what we're proving — its emotional weight will be tested in a later slice when real users feel real days pass.
- **Vocab pool size of ~100 words** was chosen so a 20-question Strong-tier lesson does not feel repetitive within a single play session. A pool of 50 worked logically but produced too many in-lesson repeats.
- **HP-clamp-to-1** is a deliberate trick that lets us ship the *visual and code path* of taking damage without shipping a death state. The next slice that adds real failure can build on this without rewriting the Fight screen.
- **The existing prototype's quest, party, achievement, and study-history UI** is being removed in this slice's refactor of Home and Profile. It can be re-added later if those features come back, but keeping it around as dead UI during slice development invites confusion.

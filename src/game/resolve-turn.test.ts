import { describe, expect, it } from 'vitest';
import { resolveTurn } from './resolve-turn';
import { DUNGEONS } from './dungeon';
import { findAbilityById } from './class-abilities';
import { emptySecondaryResources } from './secondary-resources';
import { initialManaState } from './mana';
import { initialStreakState, dayKey } from './streak';
import { initialGemLedger, GEMS_PER_BOSS, GEMS_PER_STREAK_MILESTONE } from './gem-ledger';
import { KILL_XP_BOSS, KILL_XP_REGULAR } from './combat-engine';
import { STREAK_MILESTONE_GOLD } from './streak-milestones';
import { EMPTY_EQUIPMENT, INITIAL_STATE } from '../constants';
import type { GameState, Hero, InventoryItem } from '../types';

const D1 = DUNGEONS[0];
const D1_ID = D1.meta.id;
const D1_MONSTERS = D1.monsters;
const BOSS_INDEX = D1_MONSTERS.findIndex((m) => m.isBoss);

// Noon (after the 4am day boundary) on a fixed date, so streak day-keys are stable.
const NOW = Date.UTC(2026, 0, 15, 12, 0, 0);
const DAY_MS = 86_400_000;

const HERO: Hero = { name: 'Tester', classType: 'mage', equipment: EMPTY_EQUIPMENT };

const mageSpark = findAbilityById('mage_spark')!;
const mageMeteor = findAbilityById('mage_meteor')!;

/** A GameState parked on D1 with the active monster at `index` and a chosen HP. */
function stateAt(index: number, hp: number, overrides: Partial<GameState> = {}): GameState {
  return {
    ...INITIAL_STATE,
    mana: initialManaState(NOW),
    secondaryResources: emptySecondaryResources(),
    streakState: initialStreakState(),
    gems: initialGemLedger(),
    dungeonState: {
      activeDungeonId: D1_ID,
      progress: {
        [D1_ID]: {
          currentMonsterIndex: index,
          currentMonsterHp: hp,
          lastActionAt: 0,
          cleared: false,
        },
      },
    },
    ...overrides,
  };
}

const fakeLoot: InventoryItem[] = [
  { id: 'drop-1', name: 'Test Drop', type: 'potion', rarity: 'common', jp: 'x', bonus: '' },
];
const rollLoot = () => fakeLoot;
const rollGold = () => 7;

describe('resolveTurn', () => {
  it('regular kill: grants regular XP, loot and gold, no gems', () => {
    const turn = resolveTurn({
      ability: mageSpark,
      lessonAccuracy: 1,
      gameState: stateAt(0, 1),
      hero: HERO,
      now: NOW,
      debugMode: false,
      rollLoot,
      rollGold,
    });

    expect(turn.monsterDefeated).toBe(true);
    expect(turn.dungeonCleared).toBe(false);
    expect(turn.xpGained).toBe(KILL_XP_REGULAR);
    expect(turn.nextState.xp).toBe(KILL_XP_REGULAR);
    expect(turn.goldGained).toBe(7);
    expect(turn.nextState.gold).toBe(7);
    expect(turn.loot).toEqual(fakeLoot);
    expect(turn.nextState.inventory).toEqual(fakeLoot);
    expect(turn.monsterName).toBe(D1_MONSTERS[0].name);
    // A regular kill credits no gems.
    expect(turn.nextState.gems.balance).toBe(0);
  });

  it('boss kill: grants boss XP and credits boss gems', () => {
    const turn = resolveTurn({
      ability: mageMeteor,
      lessonAccuracy: 1,
      gameState: stateAt(BOSS_INDEX, 1),
      hero: HERO,
      now: NOW,
      debugMode: false,
      rollLoot,
      rollGold,
    });

    expect(turn.monsterDefeated).toBe(true);
    expect(turn.xpGained).toBe(KILL_XP_BOSS);
    expect(turn.nextState.gems.balance).toBe(GEMS_PER_BOSS);
  });

  it('dungeon clear: flips dungeonCleared, empties resources, clears queued buff', () => {
    const turn = resolveTurn({
      ability: mageMeteor,
      lessonAccuracy: 1,
      gameState: stateAt(BOSS_INDEX, 1, {
        secondaryResources: { rage: 0, faith: 5 },
        dungeonState: {
          activeDungeonId: D1_ID,
          progress: {
            [D1_ID]: {
              currentMonsterIndex: BOSS_INDEX,
              currentMonsterHp: 1,
              lastActionAt: 0,
              cleared: false,
            },
          },
          pendingDamageMultiplier: 1.6,
        },
      }),
      hero: HERO,
      now: NOW,
      debugMode: false,
      rollLoot,
      rollGold,
    });

    expect(turn.dungeonCleared).toBe(true);
    expect(turn.nextState.secondaryResources).toEqual(emptySecondaryResources());
    expect(turn.nextState.dungeonState.pendingDamageMultiplier).toBeUndefined();
  });

  it('lethal counter: player is defeated, retreats fully healed to a full-HP monster', () => {
    const monster = D1_MONSTERS[2];
    const turn = resolveTurn({
      ability: mageSpark,
      lessonAccuracy: 1,
      // Monster well out of one-shot range, player on 1 HP → a survivable hit but a lethal counter.
      gameState: stateAt(2, 9999, { hp: 1, maxHp: 100 }),
      hero: HERO,
      now: NOW,
      debugMode: false,
    });

    expect(turn.monsterDefeated).toBe(false);
    expect(turn.playerDefeated).toBe(true);
    // Retreat: fully healed and the monster restored to full HP.
    expect(turn.nextState.hp).toBe(turn.nextState.maxHp);
    expect(turn.nextState.hp).toBe(100);
    expect(turn.nextState.dungeonState.progress[D1_ID].currentMonsterHp).toBe(monster.maxHp);
    expect(turn.nextState.secondaryResources).toEqual(emptySecondaryResources());
  });

  it('level-up adds +10 maxHp and grants +10 current HP (not a full heal)', () => {
    // xp 60 + a 50-XP kill crosses the level-1 threshold (100) → level 2.
    // Kill turn has no counter, so HP only moves by the maxHp delta.
    const turn = resolveTurn({
      ability: mageSpark,
      lessonAccuracy: 1,
      gameState: stateAt(0, 1, { hp: 30, maxHp: 100, xp: 60, level: 1, maxXp: 100 }),
      hero: HERO,
      now: NOW,
      debugMode: false,
      rollLoot,
      rollGold,
    });

    expect(turn.monsterDefeated).toBe(true);
    expect(turn.leveledUp).toBe(true);
    expect(turn.newLevel).toBe(2);
    expect(turn.playerDefeated).toBe(false);
    expect(turn.nextState.maxHp).toBe(110);
    // +10 max HP delta applied to current HP, clamped to new max — not a full refill.
    expect(turn.nextState.hp).toBe(40);
  });

  it('level-up clamps current HP to the new max when already near full', () => {
    const turn = resolveTurn({
      ability: mageSpark,
      lessonAccuracy: 1,
      gameState: stateAt(0, 1, { hp: 100, maxHp: 100, xp: 60, level: 1, maxXp: 100 }),
      hero: HERO,
      now: NOW,
      debugMode: false,
      rollLoot,
      rollGold,
    });

    expect(turn.leveledUp).toBe(true);
    expect(turn.nextState.maxHp).toBe(110);
    expect(turn.nextState.hp).toBe(110);
  });

  it('streak milestone: crossing a 7-day mark credits milestone gems and gold', () => {
    // Use the module's own day-key (local 4am boundary) so "yesterday" matches
    // tickStreak's reckoning regardless of the test machine's timezone.
    const yesterday = dayKey(NOW - DAY_MS);
    const turn = resolveTurn({
      ability: mageSpark,
      lessonAccuracy: 1,
      // Monster survives (no kill gold/gems), so only streak credit shows up.
      gameState: stateAt(0, 9999, {
        hp: 100,
        maxHp: 100,
        gold: 0,
        streakState: {
          count: 6,
          lastTickDay: yesterday,
          freezes: 0,
          lastFreezeMilestone: 0,
        },
      }),
      hero: HERO,
      now: NOW,
      debugMode: false,
    });

    expect(turn.monsterDefeated).toBe(false);
    expect(turn.nextState.streakState.count).toBe(7);
    expect(turn.nextState.gems.balance).toBe(GEMS_PER_STREAK_MILESTONE);
    expect(turn.nextState.gold).toBe(STREAK_MILESTONE_GOLD);
  });
});

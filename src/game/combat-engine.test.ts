import { describe, expect, it } from 'vitest';
import { applyAbility, clampPlayerHp, KILL_XP_BOSS, KILL_XP_REGULAR } from './combat-engine';
import { DUNGEON_MONSTERS, initialDungeonState } from './dungeon';
import type { DungeonState } from '../types';

function stateAt(index: number, hpOverride?: number): DungeonState {
  return {
    dungeonId: 'forest-of-first-words',
    currentMonsterIndex: index,
    currentMonsterHp: hpOverride ?? DUNGEON_MONSTERS[index].maxHp,
  };
}

describe('combat-engine', () => {
  describe('damage formula', () => {
    it('rounds (baseDamage + bonus) * accuracy', () => {
      // weak ability baseDamage = 12, bonus 3, accuracy 0.5 → round(15 * 0.5) = 8
      const result = applyAbility({
        dungeonState: stateAt(0),
        abilityTier: 'weak',
        lessonAccuracy: 0.5,
        equipmentDamageBonus: 3,
      });
      expect(result.damageDealt).toBe(8);
    });

    it('deals zero damage on zero accuracy', () => {
      const result = applyAbility({
        dungeonState: stateAt(0),
        abilityTier: 'strong',
        lessonAccuracy: 0,
        equipmentDamageBonus: 0,
      });
      expect(result.damageDealt).toBe(0);
    });

    it('clamps accuracy above 1', () => {
      // medium baseDamage = 28, accuracy clamped to 1 → 28
      const result = applyAbility({
        dungeonState: stateAt(0),
        abilityTier: 'medium',
        lessonAccuracy: 5,
        equipmentDamageBonus: 0,
      });
      expect(result.damageDealt).toBe(28);
    });
  });

  describe('monster HP clamping', () => {
    it('clamps monster HP at 0 (no negatives)', () => {
      const result = applyAbility({
        dungeonState: stateAt(0, 5),
        abilityTier: 'strong', // baseDamage 60
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      expect(result.monsterDefeated).toBe(true);
      // After defeating monster 0, advances to monster 1 with full HP
      expect(result.nextDungeonState.currentMonsterIndex).toBe(1);
      expect(result.nextDungeonState.currentMonsterHp).toBe(DUNGEON_MONSTERS[1].maxHp);
    });

    it('keeps monster alive with reduced HP if not lethal', () => {
      const result = applyAbility({
        dungeonState: stateAt(0),
        abilityTier: 'weak', // 12 dmg vs 30 HP
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      expect(result.monsterDefeated).toBe(false);
      expect(result.nextDungeonState.currentMonsterIndex).toBe(0);
      expect(result.nextDungeonState.currentMonsterHp).toBe(18);
      expect(result.counterDamage).toBe(DUNGEON_MONSTERS[0].counterDamage);
    });
  });

  describe('counter-attack', () => {
    it('uses the per-monster fixed value when monster survives', () => {
      const result = applyAbility({
        dungeonState: stateAt(2), // kanji-wolf, counterDamage 10
        abilityTier: 'weak',
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      expect(result.counterDamage).toBe(10);
    });

    it('skips counter when monster dies', () => {
      const result = applyAbility({
        dungeonState: stateAt(0, 5),
        abilityTier: 'medium',
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      expect(result.counterDamage).toBe(0);
    });
  });

  describe('dungeon cleared flag', () => {
    it('does not flip when defeating non-boss monsters', () => {
      for (let i = 0; i < DUNGEON_MONSTERS.length - 1; i++) {
        const result = applyAbility({
          dungeonState: stateAt(i, 1),
          abilityTier: 'strong',
          lessonAccuracy: 1,
          equipmentDamageBonus: 0,
        });
        expect(result.monsterDefeated).toBe(true);
        expect(result.dungeonCleared).toBe(false);
      }
    });

    it('flips after defeating the boss', () => {
      const bossIndex = DUNGEON_MONSTERS.findIndex((m) => m.isBoss);
      const result = applyAbility({
        dungeonState: stateAt(bossIndex, 1),
        abilityTier: 'strong',
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      expect(result.monsterDefeated).toBe(true);
      expect(result.dungeonCleared).toBe(true);
      expect(result.nextDungeonState.currentMonsterIndex).toBe(DUNGEON_MONSTERS.length);
    });
  });

  describe('xp on kill', () => {
    it('grants regular XP for non-boss kills', () => {
      const result = applyAbility({
        dungeonState: stateAt(0, 1),
        abilityTier: 'weak',
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      expect(result.monsterDefeated).toBe(true);
      expect(result.xpGained).toBe(KILL_XP_REGULAR);
    });

    it('grants boss XP only for boss kills', () => {
      const bossIndex = DUNGEON_MONSTERS.findIndex((m) => m.isBoss);
      const result = applyAbility({
        dungeonState: stateAt(bossIndex, 1),
        abilityTier: 'strong',
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      expect(result.xpGained).toBe(KILL_XP_BOSS);
      expect(KILL_XP_BOSS).toBeGreaterThan(KILL_XP_REGULAR);
    });
  });

  describe('loot hook', () => {
    it('invokes rollLoot only when a monster is defeated', () => {
      let calls = 0;
      applyAbility({
        dungeonState: stateAt(0),
        abilityTier: 'weak',
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
        rollLoot: () => {
          calls += 1;
          return [];
        },
      });
      expect(calls).toBe(0);

      applyAbility({
        dungeonState: stateAt(0, 1),
        abilityTier: 'weak',
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
        rollLoot: () => {
          calls += 1;
          return [];
        },
      });
      expect(calls).toBe(1);
    });

    it('returns an empty drops array when no rollLoot is supplied', () => {
      const result = applyAbility({
        dungeonState: stateAt(0, 1),
        abilityTier: 'weak',
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      expect(result.lootDrops).toEqual([]);
    });
  });

  describe('guards', () => {
    it('throws when applying to a cleared dungeon', () => {
      const cleared: DungeonState = {
        ...initialDungeonState(),
        currentMonsterIndex: DUNGEON_MONSTERS.length,
        currentMonsterHp: 0,
      };
      expect(() =>
        applyAbility({
          dungeonState: cleared,
          abilityTier: 'weak',
          lessonAccuracy: 1,
          equipmentDamageBonus: 0,
        }),
      ).toThrow();
    });
  });

  describe('clampPlayerHp', () => {
    it('clamps to a minimum of 1', () => {
      expect(clampPlayerHp(0)).toBe(1);
      expect(clampPlayerHp(-50)).toBe(1);
      expect(clampPlayerHp(20)).toBe(20);
    });
  });
});

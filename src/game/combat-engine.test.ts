import { describe, expect, it } from 'vitest';
import { applyAbility, clampPlayerHp, KILL_XP_BOSS, KILL_XP_REGULAR } from './combat-engine';
import { DUNGEON_MONSTERS, initialDungeonState } from './dungeon';
import { findAbilityById } from './class-abilities';
import { emptySecondaryResources } from './secondary-resources';
import type { DungeonState, SecondaryResources } from '../types';

function stateAt(index: number, hpOverride?: number): DungeonState {
  return {
    dungeonId: 'forest-of-first-words',
    currentMonsterIndex: index,
    currentMonsterHp: hpOverride ?? DUNGEON_MONSTERS[index].maxHp,
  };
}

const mageSpark = findAbilityById('mage_spark')!; // mp 1, dmg 12
const mageFireball = findAbilityById('mage_fireball')!; // mp 2, dmg 26
const mageFrostbolt = findAbilityById('mage_frostbolt')!; // dmg 30, counter_reduction 0.5
const mageMeteor = findAbilityById('mage_meteor')!; // mp 4, dmg 65
const mageCataclysm = findAbilityById('mage_cataclysm')!; // dmg 100
const warriorSlash = findAbilityById('warrior_slash')!; // gain rage 2
const warriorIronStance = findAbilityById('warrior_iron_stance')!; // cost 4 rage, counter_reduction 0.6
const warriorRoar = findAbilityById('warrior_berserker_roar')!; // damage_buff_next 1.6, cost 8 rage
const warriorBash = findAbilityById('warrior_bash')!; // dmg 50, cost 5 rage
const priestSmite = findAbilityById('priest_smite')!; // dmg 10, gain faith 2
const priestHeal = findAbilityById('priest_heal')!; // self_heal 25, cost 4 faith

const noResources = emptySecondaryResources();

describe('combat-engine', () => {
  describe('damage formula', () => {
    it('rounds (baseDamage + bonus) * accuracy', () => {
      // spark baseDamage=12, bonus 3, accuracy 0.5 → round(15 * 0.5) = 8
      const result = applyAbility({
        dungeonState: stateAt(0),
        ability: mageSpark,
        secondaryResources: noResources,
        lessonAccuracy: 0.5,
        equipmentDamageBonus: 3,
      });
      expect(result.damageDealt).toBe(8);
    });

    it('deals zero damage on zero accuracy', () => {
      const result = applyAbility({
        dungeonState: stateAt(0),
        ability: mageCataclysm,
        secondaryResources: noResources,
        lessonAccuracy: 0,
        equipmentDamageBonus: 0,
      });
      expect(result.damageDealt).toBe(0);
    });

    it('clamps accuracy above 1', () => {
      // fireball=26
      const result = applyAbility({
        dungeonState: stateAt(0),
        ability: mageFireball,
        secondaryResources: noResources,
        lessonAccuracy: 5,
        equipmentDamageBonus: 0,
      });
      expect(result.damageDealt).toBe(26);
    });
  });

  describe('counter-attack', () => {
    it('uses the per-monster fixed value when monster survives', () => {
      const result = applyAbility({
        dungeonState: stateAt(2), // counterDamage 10
        ability: mageSpark,
        secondaryResources: noResources,
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      expect(result.counterDamage).toBe(10);
    });

    it('skips counter when monster dies', () => {
      const result = applyAbility({
        dungeonState: stateAt(0, 5),
        ability: mageFireball,
        secondaryResources: noResources,
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      expect(result.counterDamage).toBe(0);
    });

    it('reduces counter by counter_reduction effect', () => {
      // frostbolt has counter_reduction 0.5; counter on monster 2 is 10 → 5
      const result = applyAbility({
        dungeonState: stateAt(2),
        ability: mageFrostbolt,
        secondaryResources: noResources,
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      expect(result.counterDamage).toBe(5);
    });
  });

  describe('dungeon cleared', () => {
    it('flips after defeating the boss', () => {
      const bossIndex = DUNGEON_MONSTERS.findIndex((m) => m.isBoss);
      const result = applyAbility({
        dungeonState: stateAt(bossIndex, 1),
        ability: mageMeteor,
        secondaryResources: noResources,
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      expect(result.dungeonCleared).toBe(true);
      expect(result.nextDungeonState.currentMonsterIndex).toBe(DUNGEON_MONSTERS.length);
    });
  });

  describe('xp on kill', () => {
    it('grants regular XP for non-boss kills', () => {
      const result = applyAbility({
        dungeonState: stateAt(0, 1),
        ability: mageSpark,
        secondaryResources: noResources,
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      expect(result.xpGained).toBe(KILL_XP_REGULAR);
    });

    it('grants boss XP only for boss kills', () => {
      const bossIndex = DUNGEON_MONSTERS.findIndex((m) => m.isBoss);
      const result = applyAbility({
        dungeonState: stateAt(bossIndex, 1),
        ability: mageMeteor,
        secondaryResources: noResources,
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      expect(result.xpGained).toBe(KILL_XP_BOSS);
    });
  });

  describe('secondary resources', () => {
    it('warriors gain rage on damaging hits', () => {
      const result = applyAbility({
        dungeonState: stateAt(0),
        ability: warriorSlash,
        secondaryResources: noResources,
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      expect(result.nextSecondaryResources.rage).toBe(2);
    });

    it('does not generate rage when accuracy is zero (whiff)', () => {
      const result = applyAbility({
        dungeonState: stateAt(0),
        ability: warriorSlash,
        secondaryResources: noResources,
        lessonAccuracy: 0,
        equipmentDamageBonus: 0,
      });
      expect(result.nextSecondaryResources.rage).toBe(0);
    });

    it('priests gain faith on damaging hits', () => {
      const result = applyAbility({
        dungeonState: stateAt(0),
        ability: priestSmite,
        secondaryResources: noResources,
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      expect(result.nextSecondaryResources.faith).toBe(2);
    });

    it('throws when secondary cost is unaffordable', () => {
      expect(() =>
        applyAbility({
          dungeonState: stateAt(0),
          ability: warriorBash, // cost 5 rage
          secondaryResources: { rage: 1, faith: 0 },
          lessonAccuracy: 1,
          equipmentDamageBonus: 0,
        }),
      ).toThrow();
    });

    it('spends secondary cost on use', () => {
      const before: SecondaryResources = { rage: 6, faith: 0 };
      const result = applyAbility({
        dungeonState: stateAt(0),
        ability: warriorBash, // cost 5
        secondaryResources: before,
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      expect(result.nextSecondaryResources.rage).toBe(1);
    });
  });

  describe('effects', () => {
    it('self_heal is reported in result', () => {
      const result = applyAbility({
        dungeonState: stateAt(0),
        ability: priestHeal, // self_heal 25
        secondaryResources: { rage: 0, faith: 4 },
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      expect(result.selfHeal).toBe(25);
      // Heal abilities have baseDamage 0 → no monster damage, but the monster
      // still counter-swings (using a turn on a heal isn't free).
      expect(result.damageDealt).toBe(0);
      expect(result.counterDamage).toBe(DUNGEON_MONSTERS[0].counterDamage);
    });

    it('damage_buff_next queues a multiplier on dungeon state', () => {
      const result = applyAbility({
        dungeonState: stateAt(0),
        ability: warriorRoar, // queues 1.6× next hit
        secondaryResources: { rage: 8, faith: 0 },
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      expect(result.nextDungeonState.pendingDamageMultiplier).toBe(1.6);
    });

    it('consumes pendingDamageMultiplier on the next damaging ability', () => {
      // spark base 12, multiplier 1.6 → round(12 * 1 * 1.6) = 19
      const result = applyAbility({
        dungeonState: { ...stateAt(0), pendingDamageMultiplier: 1.6 },
        ability: mageSpark,
        secondaryResources: noResources,
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      expect(result.damageDealt).toBe(19);
      expect(result.nextDungeonState.pendingDamageMultiplier).toBeUndefined();
    });

    it('iron_stance applies counter_reduction 0.6', () => {
      // monster 0 counter = 4, reduce 0.6 → round(4 * 0.4) = 2
      const result = applyAbility({
        dungeonState: stateAt(0),
        ability: warriorIronStance,
        secondaryResources: { rage: 4, faith: 0 },
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      expect(result.counterDamage).toBe(2);
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
          ability: mageSpark,
          secondaryResources: noResources,
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

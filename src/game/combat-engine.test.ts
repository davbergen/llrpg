import { describe, expect, it } from 'vitest';
import { applyAbility, resolvePlayerHp, KILL_XP_BOSS, KILL_XP_REGULAR } from './combat-engine';
import { DUNGEONS, initialDungeonState } from './dungeon';
import { findAbilityById } from './class-abilities';
import { emptySecondaryResources } from './secondary-resources';
import type { DungeonState, SecondaryResources } from '../types';

const D1 = DUNGEONS[0];
const D1_MONSTERS = D1.monsters;

function stateAt(index: number, hpOverride?: number): DungeonState {
  return {
    activeDungeonId: D1.meta.id,
    progress: {
      [D1.meta.id]: {
        currentMonsterIndex: index,
        currentMonsterHp: hpOverride ?? D1_MONSTERS[index].maxHp,
        lastActionAt: 0,
        cleared: false,
      },
    },
  };
}

function activeProgress(state: DungeonState) {
  return state.progress[state.activeDungeonId];
}

const mageSpark = findAbilityById('mage_spark')!;
const mageFireball = findAbilityById('mage_fireball')!;
const mageFrostbolt = findAbilityById('mage_frostbolt')!;
const mageMeteor = findAbilityById('mage_meteor')!;
const mageCataclysm = findAbilityById('mage_cataclysm')!;
const warriorSlash = findAbilityById('warrior_slash')!;
const warriorIronStance = findAbilityById('warrior_iron_stance')!;
const warriorRoar = findAbilityById('warrior_berserker_roar')!;
const warriorBash = findAbilityById('warrior_bash')!;
const priestSmite = findAbilityById('priest_smite')!;
const priestHeal = findAbilityById('priest_heal')!;

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
      const targetIndex = 2;
      const monster = D1_MONSTERS[targetIndex];
      const result = applyAbility({
        dungeonState: stateAt(targetIndex),
        ability: mageSpark,
        secondaryResources: noResources,
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      expect(result.counterDamage).toBe(monster.counterDamage);
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
      const targetIndex = 2;
      const monster = D1_MONSTERS[targetIndex];
      // Derive the expected reduction from the ability itself so the test tracks
      // balance tuning of frostbolt's counter_reduction fraction.
      const reduction = mageFrostbolt.effects
        .filter((e): e is { kind: 'counter_reduction'; fraction: number } => e.kind === 'counter_reduction')
        .reduce((acc, e) => acc + e.fraction, 0);
      const result = applyAbility({
        dungeonState: stateAt(targetIndex),
        ability: mageFrostbolt,
        secondaryResources: noResources,
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      expect(result.counterDamage).toBe(Math.round(monster.counterDamage * (1 - reduction)));
    });
  });

  describe('dungeon cleared', () => {
    it('flips after defeating the boss', () => {
      const bossIndex = D1_MONSTERS.findIndex((m) => m.isBoss);
      const result = applyAbility({
        dungeonState: stateAt(bossIndex, 1),
        ability: mageMeteor,
        secondaryResources: noResources,
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      expect(result.dungeonCleared).toBe(true);
      const next = activeProgress(result.nextDungeonState);
      expect(next.currentMonsterIndex).toBe(D1_MONSTERS.length);
      expect(next.cleared).toBe(true);
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
      const bossIndex = D1_MONSTERS.findIndex((m) => m.isBoss);
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
          ability: warriorBash,
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
        ability: warriorBash,
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
        ability: priestHeal,
        secondaryResources: { rage: 0, faith: 4 },
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      expect(result.selfHeal).toBe(25);
      expect(result.damageDealt).toBe(0);
      expect(result.counterDamage).toBe(D1_MONSTERS[0].counterDamage);
    });

    it('damage_buff_next queues a multiplier on dungeon state', () => {
      const result = applyAbility({
        dungeonState: stateAt(0),
        ability: warriorRoar,
        secondaryResources: { rage: 8, faith: 0 },
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      expect(result.nextDungeonState.pendingDamageMultiplier).toBe(1.6);
    });

    it('consumes pendingDamageMultiplier on the next damaging ability', () => {
      // spark base 12, multiplier 1.6 → round(12 * 1 * 1.6) = 19
      const base = stateAt(0);
      const result = applyAbility({
        dungeonState: { ...base, pendingDamageMultiplier: 1.6 },
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
      const monster = D1_MONSTERS[0];
      const result = applyAbility({
        dungeonState: stateAt(0),
        ability: warriorIronStance,
        secondaryResources: { rage: 4, faith: 0 },
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      expect(result.counterDamage).toBe(Math.round(monster.counterDamage * 0.4));
    });
  });

  describe('boss mechanics', () => {
    it('regen heals the boss after surviving a hit (Tense Lich)', () => {
      const d2 = DUNGEONS[1];
      const bossIdx = d2.monsters.findIndex((m) => m.isBoss);
      const boss = d2.monsters[bossIdx];
      const state: DungeonState = {
        activeDungeonId: d2.meta.id,
        progress: {
          [d2.meta.id]: {
            currentMonsterIndex: bossIdx,
            currentMonsterHp: 100,
            lastActionAt: 0,
            cleared: false,
          },
        },
      };
      const result = applyAbility({
        dungeonState: state,
        ability: mageSpark, // 12 dmg
        secondaryResources: noResources,
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      const expected = Math.min(boss.maxHp, 100 - 12 + (boss.regenPerTurn ?? 0));
      expect(result.nextDungeonState.progress[d2.meta.id].currentMonsterHp).toBe(expected);
    });

    it('enrage scales counter when boss HP drops below threshold (Radical Titan)', () => {
      const d3 = DUNGEONS[2];
      const bossIdx = d3.monsters.findIndex((m) => m.isBoss);
      const boss = d3.monsters[bossIdx];
      // Set HP just above 50% so a 12-dmg spark drops below threshold.
      const startHp = Math.round(boss.maxHp * 0.51);
      const state: DungeonState = {
        activeDungeonId: d3.meta.id,
        progress: {
          [d3.meta.id]: {
            currentMonsterIndex: bossIdx,
            currentMonsterHp: startHp,
            lastActionAt: 0,
            cleared: false,
          },
        },
      };
      const result = applyAbility({
        dungeonState: state,
        ability: mageMeteor, // big damage drops well below 50%
        secondaryResources: noResources,
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
      });
      const expectedCounter = Math.round(
        boss.counterDamage * (boss.enrageCounterMultiplier ?? 1),
      );
      expect(result.counterDamage).toBe(expectedCounter);
    });
  });

  describe('lastActionAt', () => {
    it('records the action timestamp on the active dungeon', () => {
      const result = applyAbility({
        dungeonState: stateAt(0),
        ability: mageSpark,
        secondaryResources: noResources,
        lessonAccuracy: 1,
        equipmentDamageBonus: 0,
        now: 12345,
      });
      expect(result.nextDungeonState.progress[D1.meta.id].lastActionAt).toBe(12345);
    });
  });

  describe('guards', () => {
    it('throws when applying to a cleared dungeon', () => {
      const cleared: DungeonState = {
        ...initialDungeonState(),
        progress: {
          [D1.meta.id]: {
            currentMonsterIndex: D1_MONSTERS.length,
            currentMonsterHp: 0,
            lastActionAt: 0,
            cleared: true,
          },
        },
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

  describe('resolvePlayerHp', () => {
    it('subtracts counter damage when survivable', () => {
      const out = resolvePlayerHp({ hp: 50, counterDamage: 20, selfHeal: 0, maxHp: 100 });
      expect(out).toEqual({ hp: 30, defeated: false });
    });

    it('marks defeat when a counter is lethal (HP would reach 0)', () => {
      const out = resolvePlayerHp({ hp: 20, counterDamage: 20, selfHeal: 0, maxHp: 100 });
      expect(out).toEqual({ hp: 0, defeated: true });
    });

    it('marks defeat when a counter exceeds remaining HP', () => {
      const out = resolvePlayerHp({ hp: 10, counterDamage: 50, selfHeal: 0, maxHp: 100 });
      expect(out).toEqual({ hp: 0, defeated: true });
    });

    it('applies self-heal that offsets the counter', () => {
      const out = resolvePlayerHp({ hp: 10, counterDamage: 20, selfHeal: 30, maxHp: 100 });
      expect(out).toEqual({ hp: 20, defeated: false });
    });

    it('lets a big heal rescue from an otherwise-lethal counter', () => {
      const out = resolvePlayerHp({ hp: 5, counterDamage: 40, selfHeal: 50, maxHp: 100 });
      expect(out).toEqual({ hp: 15, defeated: false });
    });

    it('caps HP at maxHp', () => {
      const out = resolvePlayerHp({ hp: 90, counterDamage: 0, selfHeal: 50, maxHp: 100 });
      expect(out).toEqual({ hp: 100, defeated: false });
    });
  });
});

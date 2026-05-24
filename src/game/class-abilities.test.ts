import { describe, expect, it } from 'vitest';
import type { ClassType } from '../types';
import {
  CLASS_ABILITIES,
  abilitiesForClass,
  unlockedAbilities,
  findAbilityById,
  secondaryResourceForClass,
  lessonQuestionsForMp,
} from './class-abilities';

const CLASSES: ClassType[] = ['mage', 'warrior', 'priest'];

describe('class-abilities table', () => {
  it('defines exactly 21 abilities (3 classes × 7 levels)', () => {
    expect(CLASS_ABILITIES).toHaveLength(21);
  });

  it('every ability has a unique id', () => {
    const ids = CLASS_ABILITIES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const cls of CLASSES) {
    it(`${cls} has 7 abilities, one per level 1..7`, () => {
      const abs = abilitiesForClass(cls);
      expect(abs).toHaveLength(7);
      expect(abs.map((a) => a.levelRequirement)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });
  }

  it('all required fields are present and well-typed', () => {
    for (const ab of CLASS_ABILITIES) {
      expect(typeof ab.id).toBe('string');
      expect(typeof ab.label).toBe('string');
      expect(ab.mpCost).toBeGreaterThanOrEqual(1);
      expect(ab.baseDamage).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(ab.effects)).toBe(true);
      expect(ab.lessonQuestions).toBeGreaterThanOrEqual(1);
      expect(['mage', 'warrior', 'priest']).toContain(ab.classType);
      expect(ab.levelRequirement).toBeGreaterThanOrEqual(1);
      expect(ab.levelRequirement).toBeLessThanOrEqual(7);
    }
  });

  it('mage abilities never declare a secondary cost or gain', () => {
    for (const ab of abilitiesForClass('mage')) {
      expect(ab.secondaryCost).toBeUndefined();
      expect(ab.secondaryGain).toBeUndefined();
    }
  });

  it('warrior abilities only use rage; priest abilities only use faith (via mapping)', () => {
    expect(secondaryResourceForClass('warrior')).toBe('rage');
    expect(secondaryResourceForClass('priest')).toBe('faith');
    expect(secondaryResourceForClass('mage')).toBeNull();
  });

  it('lessonQuestionsForMp follows the tiered mapping (5/10/15/20)', () => {
    expect(lessonQuestionsForMp(1)).toBe(5);
    expect(lessonQuestionsForMp(2)).toBe(10);
    expect(lessonQuestionsForMp(3)).toBe(15);
    expect(lessonQuestionsForMp(4)).toBe(15);
    expect(lessonQuestionsForMp(5)).toBe(20);
  });

  describe('unlockedAbilities', () => {
    it('returns nothing for level 0', () => {
      expect(unlockedAbilities('mage', 0)).toHaveLength(0);
    });

    it('returns 1 ability at level 1', () => {
      expect(unlockedAbilities('warrior', 1)).toHaveLength(1);
    });

    it('returns all 7 at level 7+', () => {
      expect(unlockedAbilities('priest', 7)).toHaveLength(7);
      expect(unlockedAbilities('priest', 10)).toHaveLength(7);
    });
  });

  describe('solo-adjustment notes', () => {
    it('every priest heal/shield carries a soloAdjustmentNote', () => {
      const pr = abilitiesForClass('priest');
      expect(pr.find((a) => a.id === 'priest_heal')?.soloAdjustmentNote).toBeTruthy();
      expect(pr.find((a) => a.id === 'priest_greater_heal')?.soloAdjustmentNote).toBeTruthy();
      expect(pr.find((a) => a.id === 'priest_divine_shield')?.soloAdjustmentNote).toBeTruthy();
    });

    it('warrior taunt and roar carry soloAdjustmentNotes', () => {
      const wr = abilitiesForClass('warrior');
      expect(wr.find((a) => a.id === 'warrior_iron_stance')?.soloAdjustmentNote).toBeTruthy();
      expect(wr.find((a) => a.id === 'warrior_berserker_roar')?.soloAdjustmentNote).toBeTruthy();
    });
  });

  describe('findAbilityById', () => {
    it('returns the matching ability', () => {
      expect(findAbilityById('mage_spark')?.classType).toBe('mage');
    });
    it('returns undefined for unknown ids', () => {
      expect(findAbilityById('nonexistent')).toBeUndefined();
    });
  });
});

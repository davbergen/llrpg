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

  // ── ADR-0002: inverted damage-per-MP curve + no strict domination ──────────
  //
  // These two invariants encode docs/adr/0002-inverted-damage-per-mp-curve.md so
  // future tuning can't silently reintroduce a dead button or re-invert the curve.
  describe('ADR-0002 balance invariants', () => {
    /** Strength of a given effect kind on an ability (0 if absent). */
    const effectStrength = (ab: (typeof CLASS_ABILITIES)[number], kind: string): number => {
      const e = ab.effects.find((x) => x.kind === kind);
      if (!e) return 0;
      if (e.kind === 'counter_reduction') return e.fraction;
      if (e.kind === 'self_heal') return e.amount;
      if (e.kind === 'damage_buff_next') return e.multiplier;
      return 0;
    };
    const EFFECT_KINDS = ['counter_reduction', 'self_heal', 'damage_buff_next'];

    /**
     * Does A weakly beat B on every axis (cheaper-or-equal MP & secondary cost,
     * more-or-equal damage, secondary gain, and every utility effect)?
     */
    const weaklyBeats = (a: (typeof CLASS_ABILITIES)[number], b: typeof a): boolean =>
      a.mpCost <= b.mpCost &&
      (a.secondaryCost ?? 0) <= (b.secondaryCost ?? 0) &&
      a.baseDamage >= b.baseDamage &&
      (a.secondaryGain ?? 0) >= (b.secondaryGain ?? 0) &&
      EFFECT_KINDS.every((k) => effectStrength(a, k) >= effectStrength(b, k));

    const strictlyBetterSomewhere = (a: (typeof CLASS_ABILITIES)[number], b: typeof a): boolean =>
      a.mpCost < b.mpCost ||
      (a.secondaryCost ?? 0) < (b.secondaryCost ?? 0) ||
      a.baseDamage > b.baseDamage ||
      (a.secondaryGain ?? 0) > (b.secondaryGain ?? 0) ||
      EFFECT_KINDS.some((k) => effectStrength(a, k) > effectStrength(b, k));

    for (const cls of CLASSES) {
      it(`${cls}: no ability strictly dominates another`, () => {
        const abs = abilitiesForClass(cls);
        for (const a of abs) {
          for (const b of abs) {
            if (a.id === b.id) continue;
            // A strictly dominates B iff A is weakly-better on every axis AND
            // strictly better on at least one. That must never happen.
            const dominates = weaklyBeats(a, b) && strictlyBetterSomewhere(a, b);
            expect(dominates, `${a.id} strictly dominates ${b.id}`).toBe(false);
          }
        }
      });

      it(`${cls}: max damage-per-MP is non-increasing as MP cost rises`, () => {
        // The most MP-efficient damaging option at each MP tier must not get more
        // efficient as MP rises — low-MP = Efficiency, high-MP = Burst (ADR-0002).
        // Utility-trade variants (lower-damage + an effect) sit below their tier's
        // max and are not what this curve measures.
        const byMp = new Map<number, number>();
        for (const ab of abilitiesForClass(cls)) {
          if (ab.baseDamage <= 0) continue; // pure-support abilities have no curve point
          const ratio = ab.baseDamage / ab.mpCost;
          byMp.set(ab.mpCost, Math.max(byMp.get(ab.mpCost) ?? 0, ratio));
        }
        const mps = [...byMp.keys()].sort((x, y) => x - y);
        for (let i = 1; i < mps.length; i++) {
          expect(byMp.get(mps[i])!, `mp ${mps[i]} more efficient than mp ${mps[i - 1]}`).toBeLessThanOrEqual(
            byMp.get(mps[i - 1])!,
          );
        }
      });
    }
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

import { describe, expect, it } from 'vitest';
import {
  MANA_MAX,
  FIRST_LESSON_BONUS,
  nextResetIso,
  initialManaState,
  shouldReset,
  applyReset,
  resolveMana,
  canAffordAbility,
  spendMana,
  applyFirstLessonBonus,
  questionsForMpCost,
} from './mana';
import { CLASS_ABILITIES } from './class-abilities';

describe('nextResetIso', () => {
  it('returns next 4am when current time is before 4am', () => {
    // 2am local — next 4am is today
    const now = new Date(2026, 4, 6, 2, 0, 0).getTime(); // May 6 2026 02:00 local
    const reset = new Date(nextResetIso(now)).getTime();
    const expected = new Date(2026, 4, 6, 4, 0, 0).getTime();
    expect(reset).toBe(expected);
  });

  it('returns next-day 4am when current time is after 4am', () => {
    const now = new Date(2026, 4, 6, 10, 0, 0).getTime(); // May 6 2026 10:00 local
    const reset = new Date(nextResetIso(now)).getTime();
    const expected = new Date(2026, 4, 7, 4, 0, 0).getTime();
    expect(reset).toBe(expected);
  });

  it('returns next-day 4am when current time is exactly 4am', () => {
    const now = new Date(2026, 4, 6, 4, 0, 0).getTime();
    const reset = new Date(nextResetIso(now)).getTime();
    const expected = new Date(2026, 4, 7, 4, 0, 0).getTime();
    expect(reset).toBe(expected);
  });

  it('handles month boundary correctly', () => {
    const now = new Date(2026, 4, 31, 10, 0, 0).getTime(); // May 31
    const reset = new Date(nextResetIso(now)).getTime();
    const expected = new Date(2026, 5, 1, 4, 0, 0).getTime(); // June 1
    expect(reset).toBe(expected);
  });

  it('handles year boundary correctly', () => {
    const now = new Date(2026, 11, 31, 10, 0, 0).getTime(); // Dec 31
    const reset = new Date(nextResetIso(now)).getTime();
    const expected = new Date(2027, 0, 1, 4, 0, 0).getTime(); // Jan 1 2027
    expect(reset).toBe(expected);
  });
});

describe('shouldReset / applyReset', () => {
  it('returns false before resetsAt', () => {
    const mana = initialManaState(new Date(2026, 4, 6, 2, 0, 0).getTime());
    const before = new Date(2026, 4, 6, 3, 59, 59).getTime();
    expect(shouldReset(mana, before)).toBe(false);
  });

  it('returns true at and after resetsAt', () => {
    const now = new Date(2026, 4, 6, 2, 0, 0).getTime();
    const mana = initialManaState(now);
    const atReset = new Date(2026, 4, 6, 4, 0, 0).getTime();
    expect(shouldReset(mana, atReset)).toBe(true);
    expect(shouldReset(mana, atReset + 1000)).toBe(true);
  });

  it('applyReset refills mana to max and clears bonus flag', () => {
    const spent: ReturnType<typeof initialManaState> = {
      current: 2,
      resetsAt: new Date(2026, 4, 6, 4, 0, 0).toISOString(),
      firstLessonBonusUsedToday: true,
    };
    const resetTime = new Date(2026, 4, 6, 5, 0, 0).getTime();
    const result = applyReset(spent, resetTime);
    expect(result.current).toBe(MANA_MAX);
    expect(result.firstLessonBonusUsedToday).toBe(false);
    // Next reset should be tomorrow 4am
    const nextReset = new Date(result.resetsAt).getTime();
    expect(nextReset).toBe(new Date(2026, 4, 7, 4, 0, 0).getTime());
  });
});

describe('resolveMana', () => {
  it('applies reset when resetsAt has passed', () => {
    const init = new Date(2026, 4, 6, 2, 0, 0).getTime();
    const mana = { ...initialManaState(init), current: 3 };
    const after = new Date(2026, 4, 6, 5, 0, 0).getTime();
    const resolved = resolveMana(mana, after);
    expect(resolved.current).toBe(MANA_MAX);
  });

  it('leaves mana unchanged before resetsAt', () => {
    const init = new Date(2026, 4, 6, 5, 0, 0).getTime();
    const mana = { ...initialManaState(init), current: 3 };
    const before = new Date(2026, 4, 6, 10, 0, 0).getTime();
    const resolved = resolveMana(mana, before);
    expect(resolved.current).toBe(3);
  });
});

describe('canAffordAbility / spendMana', () => {
  it('allows ability when current >= mpCost', () => {
    const mana = initialManaState(Date.now()); // current = 10
    expect(canAffordAbility(mana, 4)).toBe(true);
    expect(canAffordAbility(mana, 10)).toBe(true);
  });

  it('blocks ability when current < mpCost', () => {
    const mana = { ...initialManaState(Date.now()), current: 3 };
    expect(canAffordAbility(mana, 4)).toBe(false);
  });

  it('spendMana deducts cost correctly', () => {
    const mana = { ...initialManaState(Date.now()), current: 8 };
    expect(spendMana(mana, 4).current).toBe(4);
    expect(spendMana(mana, 2).current).toBe(6);
    expect(spendMana(mana, 1).current).toBe(7);
  });
});

describe('applyFirstLessonBonus', () => {
  it('adds FIRST_LESSON_BONUS and sets flag', () => {
    const mana = { ...initialManaState(Date.now()), current: 6 };
    const after = applyFirstLessonBonus(mana);
    expect(after.current).toBe(6 + FIRST_LESSON_BONUS);
    expect(after.firstLessonBonusUsedToday).toBe(true);
  });

  it('can exceed MANA_MAX (by design)', () => {
    const mana = initialManaState(Date.now()); // current = 10
    const after = applyFirstLessonBonus(mana);
    expect(after.current).toBe(MANA_MAX + FIRST_LESSON_BONUS);
  });
});

describe('questionsForMpCost (cost→questions mapping)', () => {
  it('maps 1→1, 2→2, 4→3', () => {
    expect(questionsForMpCost(1)).toBe(1);
    expect(questionsForMpCost(2)).toBe(2);
    expect(questionsForMpCost(4)).toBe(3);
  });

  it('throws on unknown cost', () => {
    expect(() => questionsForMpCost(3)).toThrow();
  });
});

describe('CLASS_ABILITIES question counts', () => {
  it('every ability declares a sane lesson question count (5..20)', () => {
    for (const ab of CLASS_ABILITIES) {
      expect(ab.lessonQuestions).toBeGreaterThanOrEqual(5);
      expect(ab.lessonQuestions).toBeLessThanOrEqual(20);
    }
  });
});

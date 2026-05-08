export const MANA_MAX = 10;
export const FIRST_LESSON_BONUS = 2;

export interface ManaState {
  current: number;
  resetsAt: string;
  firstLessonBonusUsedToday: boolean;
}

/** Next 4am in user-local time after `now`. Handles DST correctly via local Date API. */
export function nextResetIso(now: number): string {
  const d = new Date(now);
  const reset = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 4, 0, 0, 0);
  if (reset.getTime() <= now) {
    reset.setDate(reset.getDate() + 1);
  }
  return reset.toISOString();
}

export function initialManaState(now: number): ManaState {
  return {
    current: MANA_MAX,
    resetsAt: nextResetIso(now),
    firstLessonBonusUsedToday: false,
  };
}

export function shouldReset(mana: ManaState, now: number): boolean {
  return now >= new Date(mana.resetsAt).getTime();
}

export function applyReset(_mana: ManaState, now: number): ManaState {
  return {
    current: MANA_MAX,
    resetsAt: nextResetIso(now),
    firstLessonBonusUsedToday: false,
  };
}

/** Apply reset if the reset time has passed. */
export function resolveMana(mana: ManaState, now: number): ManaState {
  return shouldReset(mana, now) ? applyReset(mana, now) : mana;
}

export function canAffordAbility(mana: ManaState, mpCost: number): boolean {
  return mana.current >= mpCost;
}

/** Spend mana for an ability. Caller must have checked canAffordAbility. */
export function spendMana(mana: ManaState, mpCost: number): ManaState {
  return { ...mana, current: mana.current - mpCost };
}

/** Grant +2 MP on first lesson completion. Can exceed MANA_MAX (12 max that day). */
export function applyFirstLessonBonus(mana: ManaState): ManaState {
  return {
    ...mana,
    current: mana.current + FIRST_LESSON_BONUS,
    firstLessonBonusUsedToday: true,
  };
}

/** Map mpCost to lesson question count: 1→1, 2→2, 4→3. */
export function questionsForMpCost(mpCost: number): number {
  if (mpCost === 1) return 1;
  if (mpCost === 2) return 2;
  if (mpCost === 4) return 3;
  throw new Error(`Unknown mpCost: ${mpCost}`);
}

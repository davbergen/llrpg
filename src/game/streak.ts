export const STREAK_BUFF_PER_DAY = 0.01;
export const STREAK_BUFF_CAP_DAYS = 25;
export const FREEZE_GRANT_INTERVAL = 7;
export const FREEZE_MAX = 3;

export interface StreakState {
  count: number;
  /** Day-key string (YYYY-MM-DD) of the most recent ticked day, or null if never ticked. */
  lastTickDay: string | null;
  freezes: number;
  /** Highest streak count at which a freeze was granted; prevents double-granting. */
  lastFreezeMilestone: number;
}

export function initialStreakState(): StreakState {
  return { count: 0, lastTickDay: null, freezes: 0, lastFreezeMilestone: 0 };
}

/** The "lesson day" key for `now`, with day boundary at 4am user-local. */
export function dayKey(now: number): string {
  const d = new Date(now);
  if (d.getHours() < 4) d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

export function dayDiff(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round(
    (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000,
  );
}

/** Streak buff multiplier additive (0..0.25). */
export function streakBuff(count: number): number {
  return Math.min(count, STREAK_BUFF_CAP_DAYS) * STREAK_BUFF_PER_DAY;
}

/** Damage multiplier including streak (1 + buff). */
export function streakDamageMultiplier(count: number): number {
  return 1 + streakBuff(count);
}

export interface TickStreakResult {
  state: StreakState;
  freezesGranted: number;
  freezesConsumed: number;
  /** Number of 7-day milestones crossed by this tick (typically 0 or 1). */
  milestonesCrossed: number;
  countDelta: number;
}

function advanceCount(state: StreakState): {
  state: StreakState;
  freezesGranted: number;
  milestonesCrossed: number;
} {
  const newCount = state.count + 1;
  const newMilestone = Math.floor(newCount / FREEZE_GRANT_INTERVAL) * FREEZE_GRANT_INTERVAL;
  let freezes = state.freezes;
  let freezesGranted = 0;
  let lastFreezeMilestone = state.lastFreezeMilestone;
  let milestonesCrossed = 0;
  if (newMilestone > state.lastFreezeMilestone) {
    milestonesCrossed = 1;
    if (freezes < FREEZE_MAX) {
      freezes += 1;
      freezesGranted = 1;
    }
    lastFreezeMilestone = newMilestone;
  }
  return {
    state: { ...state, count: newCount, freezes, lastFreezeMilestone },
    freezesGranted,
    milestonesCrossed,
  };
}

/** Auto-consume freezes for any missed days. Resets count to 0 if freezes exhausted. */
export function resolvePendingFreezes(
  state: StreakState,
  now: number,
): { state: StreakState; freezesConsumed: number } {
  if (state.lastTickDay == null) return { state, freezesConsumed: 0 };
  const today = dayKey(now);
  const diff = dayDiff(state.lastTickDay, today);
  if (diff <= 1) return { state, freezesConsumed: 0 };
  const missed = diff - 1;
  let freezes = state.freezes;
  let consumed = 0;
  let count = state.count;
  let lastFreezeMilestone = state.lastFreezeMilestone;
  for (let i = 0; i < missed; i++) {
    if (freezes > 0) {
      freezes -= 1;
      consumed += 1;
    } else {
      count = 0;
      lastFreezeMilestone = 0;
      break;
    }
  }
  return {
    state: { ...state, freezes, count, lastFreezeMilestone },
    freezesConsumed: consumed,
  };
}

/**
 * Tick the streak for a completed lesson session.
 * Same-day calls are a no-op. Multi-day gaps consume banked freezes silently.
 */
export function tickStreak(state: StreakState, now: number): TickStreakResult {
  const today = dayKey(now);
  if (state.lastTickDay === today) {
    return {
      state,
      freezesGranted: 0,
      freezesConsumed: 0,
      milestonesCrossed: 0,
      countDelta: 0,
    };
  }
  const resolved = resolvePendingFreezes(state, now);
  const startCount = resolved.state.count;
  const advanced = advanceCount(resolved.state);
  return {
    state: { ...advanced.state, lastTickDay: today },
    freezesGranted: advanced.freezesGranted,
    freezesConsumed: resolved.freezesConsumed,
    milestonesCrossed: advanced.milestonesCrossed,
    countDelta: advanced.state.count - startCount,
  };
}

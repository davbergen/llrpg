import { describe, expect, it } from 'vitest';
import {
  STREAK_BUFF_CAP_DAYS,
  FREEZE_MAX,
  initialStreakState,
  dayKey,
  streakBuff,
  streakDamageMultiplier,
  tickStreak,
  resolvePendingFreezes,
} from './streak';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h, 0, 0).getTime();

describe('dayKey', () => {
  it('returns local date for times after 4am', () => {
    expect(dayKey(at(2026, 5, 9, 5))).toBe('2026-05-09');
    expect(dayKey(at(2026, 5, 9, 23))).toBe('2026-05-09');
  });

  it('rolls back to previous day for times before 4am', () => {
    expect(dayKey(at(2026, 5, 9, 3))).toBe('2026-05-08');
    expect(dayKey(at(2026, 5, 9, 0))).toBe('2026-05-08');
  });
});

describe('streakBuff', () => {
  it('grants +1% per day', () => {
    expect(streakBuff(0)).toBe(0);
    expect(streakBuff(1)).toBeCloseTo(0.01);
    expect(streakBuff(10)).toBeCloseTo(0.1);
  });

  it('caps at +25%', () => {
    expect(streakBuff(STREAK_BUFF_CAP_DAYS)).toBeCloseTo(0.25);
    expect(streakBuff(STREAK_BUFF_CAP_DAYS + 50)).toBeCloseTo(0.25);
    expect(streakDamageMultiplier(100)).toBeCloseTo(1.25);
  });
});

describe('tickStreak', () => {
  it('first tick goes 0 → 1', () => {
    const r = tickStreak(initialStreakState(), at(2026, 5, 9));
    expect(r.state.count).toBe(1);
    expect(r.state.lastTickDay).toBe('2026-05-09');
    expect(r.countDelta).toBe(1);
  });

  it('same-day tick is a no-op', () => {
    const a = tickStreak(initialStreakState(), at(2026, 5, 9, 10));
    const b = tickStreak(a.state, at(2026, 5, 9, 22));
    expect(b.state).toBe(a.state);
    expect(b.countDelta).toBe(0);
  });

  it('consecutive day tick increments count', () => {
    const a = tickStreak(initialStreakState(), at(2026, 5, 9));
    const b = tickStreak(a.state, at(2026, 5, 10));
    expect(b.state.count).toBe(2);
  });

  it('grants 1 freeze on every 7-day milestone', () => {
    let s = initialStreakState();
    for (let i = 0; i < 6; i++) {
      s = tickStreak(s, at(2026, 5, 1 + i)).state;
    }
    expect(s.freezes).toBe(0);
    s = tickStreak(s, at(2026, 5, 7)).state;
    expect(s.count).toBe(7);
    expect(s.freezes).toBe(1);
    for (let i = 0; i < 7; i++) {
      s = tickStreak(s, at(2026, 5, 8 + i)).state;
    }
    expect(s.count).toBe(14);
    expect(s.freezes).toBe(2);
  });

  it('caps freezes at 3 banked', () => {
    let s = initialStreakState();
    for (let i = 0; i < 35; i++) {
      s = tickStreak(s, at(2026, 5, 1 + i)).state;
    }
    expect(s.count).toBe(35);
    expect(s.freezes).toBe(FREEZE_MAX);
  });

  it('auto-consumes one freeze per missed day, preserving count', () => {
    let s = initialStreakState();
    for (let i = 0; i < 7; i++) {
      s = tickStreak(s, at(2026, 5, 1 + i)).state;
    }
    expect(s.count).toBe(7);
    expect(s.freezes).toBe(1);
    // Skip May 8, tick on May 9 — 1 freeze consumed
    const r = tickStreak(s, at(2026, 5, 9));
    expect(r.freezesConsumed).toBe(1);
    expect(r.state.freezes).toBe(0);
    expect(r.state.count).toBe(8);
  });

  it('resets count when freezes exhausted', () => {
    let s = initialStreakState();
    for (let i = 0; i < 7; i++) {
      s = tickStreak(s, at(2026, 5, 1 + i)).state;
    }
    expect(s.freezes).toBe(1);
    // Skip May 8 + 9 (2 missed days), only 1 freeze available → reset
    const r = tickStreak(s, at(2026, 5, 10));
    expect(r.freezesConsumed).toBe(1);
    expect(r.state.count).toBe(1);
    expect(r.state.freezes).toBe(0);
    expect(r.state.lastTickDay).toBe('2026-05-10');
  });

  it('does not double-grant freezes when ticking past previously-milestoned counts', () => {
    let s = initialStreakState();
    for (let i = 0; i < 7; i++) {
      s = tickStreak(s, at(2026, 5, 1 + i)).state;
    }
    // count=7, 1 freeze. Tick day 8 — should not grant again at count=7.
    const r = tickStreak(s, at(2026, 5, 8));
    expect(r.state.count).toBe(8);
    expect(r.freezesGranted).toBe(0);
  });
});

describe('resolvePendingFreezes', () => {
  it('does nothing if no last tick', () => {
    const r = resolvePendingFreezes(initialStreakState(), at(2026, 5, 9));
    expect(r.freezesConsumed).toBe(0);
  });

  it('does nothing for same/next day', () => {
    const a = tickStreak(initialStreakState(), at(2026, 5, 9));
    expect(resolvePendingFreezes(a.state, at(2026, 5, 9, 22)).freezesConsumed).toBe(0);
    expect(resolvePendingFreezes(a.state, at(2026, 5, 10)).freezesConsumed).toBe(0);
  });
});

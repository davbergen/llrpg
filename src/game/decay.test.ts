import { describe, expect, it } from 'vitest';
import { calculateDecay, DAY_MS } from './decay';

const T0 = 1_700_000_000_000;

describe('decay', () => {
  it('returns 0 within the 2-day grace period', () => {
    expect(
      calculateDecay(
        { lastActionAt: T0, currentHp: 50, maxHp: 100, isBoss: false },
        T0 + 1.9 * DAY_MS,
      ),
    ).toBe(0);
  });

  it('regens 20% of missing HP for each day past the grace period', () => {
    // missing 50, 1 day past grace → 20% of 50 = 10
    expect(
      calculateDecay(
        { lastActionAt: T0, currentHp: 50, maxHp: 100, isBoss: false },
        T0 + 3 * DAY_MS,
      ),
    ).toBe(10);
    // 3 days past grace → 60% of 50 = 30
    expect(
      calculateDecay(
        { lastActionAt: T0, currentHp: 50, maxHp: 100, isBoss: false },
        T0 + 5 * DAY_MS,
      ),
    ).toBe(30);
  });

  it('clamps regen at the missing-HP cap (cannot exceed maxHp)', () => {
    // missing 20, 30 days past grace → would be 120, clamps to 20
    expect(
      calculateDecay(
        { lastActionAt: T0, currentHp: 80, maxHp: 100, isBoss: false },
        T0 + 30 * DAY_MS,
      ),
    ).toBe(20);
  });

  it('is a no-op for bosses', () => {
    expect(
      calculateDecay(
        { lastActionAt: T0, currentHp: 1, maxHp: 200, isBoss: true },
        T0 + 100 * DAY_MS,
      ),
    ).toBe(0);
  });

  it('is a no-op when monster is already at full HP', () => {
    expect(
      calculateDecay(
        { lastActionAt: T0, currentHp: 100, maxHp: 100, isBoss: false },
        T0 + 100 * DAY_MS,
      ),
    ).toBe(0);
  });

  it('is a no-op when never visited', () => {
    expect(
      calculateDecay(
        { lastActionAt: 0, currentHp: 50, maxHp: 100, isBoss: false },
        T0,
      ),
    ).toBe(0);
  });
});

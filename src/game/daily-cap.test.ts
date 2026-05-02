import { describe, expect, it } from 'vitest';
import { canUseAbility } from './daily-cap';

const at = (iso: string) => new Date(iso).getTime();

describe('daily-cap', () => {
  it('allows use when no ability has ever been used', () => {
    expect(canUseAbility(at('2026-05-02T10:00:00'), null)).toBe(true);
  });

  it('blocks a second use later the same calendar day', () => {
    const morning = at('2026-05-02T08:00:00');
    const evening = at('2026-05-02T22:30:00');
    expect(canUseAbility(evening, morning)).toBe(false);
  });

  it('blocks even one minute after the previous use (same day)', () => {
    const t0 = at('2026-05-02T12:00:00');
    const t1 = at('2026-05-02T12:01:00');
    expect(canUseAbility(t1, t0)).toBe(false);
  });

  it('allows use after midnight rolls over to a new day', () => {
    const lateNight = at('2026-05-02T23:59:00');
    const earlyMorning = at('2026-05-03T00:01:00');
    expect(canUseAbility(earlyMorning, lateNight)).toBe(true);
  });

  it('allows use across month and year boundaries', () => {
    expect(canUseAbility(at('2026-06-01T00:00:01'), at('2026-05-31T23:59:59'))).toBe(true);
    expect(canUseAbility(at('2027-01-01T00:00:01'), at('2026-12-31T23:59:59'))).toBe(true);
  });
});

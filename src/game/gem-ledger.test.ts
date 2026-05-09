import { describe, expect, it } from 'vitest';
import {
  initialGemLedger,
  creditGems,
  debitGems,
  canAffordGems,
  GEMS_PER_BOSS,
  GEMS_RETRY_COST,
} from './gem-ledger';

describe('gem-ledger', () => {
  it('starts at zero balance with no entries', () => {
    const l = initialGemLedger();
    expect(l.balance).toBe(0);
    expect(l.entries).toEqual([]);
  });

  it('credits update balance and append entry', () => {
    const a = creditGems(initialGemLedger(), GEMS_PER_BOSS, 'boss_kill', 1000);
    expect(a.balance).toBe(GEMS_PER_BOSS);
    expect(a.entries).toHaveLength(1);
    expect(a.entries[0]).toMatchObject({ delta: GEMS_PER_BOSS, source: 'boss_kill', at: 1000 });
  });

  it('balance is correct over mixed deltas', () => {
    let l = initialGemLedger();
    l = creditGems(l, 5, 'boss_kill', 1);
    l = creditGems(l, 1, 'streak_milestone', 2);
    l = debitGems(l, 5, 'lesson_retry', 3);
    l = creditGems(l, 5, 'boss_kill', 4);
    expect(l.balance).toBe(6);
    expect(l.entries).toHaveLength(4);
  });

  it('refuses to debit below zero', () => {
    const l = creditGems(initialGemLedger(), 3, 'boss_kill', 1);
    expect(() => debitGems(l, GEMS_RETRY_COST, 'lesson_retry', 2)).toThrow(/Insufficient/);
  });

  it('canAffordGems gates debits', () => {
    const l = creditGems(initialGemLedger(), 5, 'boss_kill', 1);
    expect(canAffordGems(l, 5)).toBe(true);
    expect(canAffordGems(l, 6)).toBe(false);
  });

  it('rejects non-positive credits/debits', () => {
    expect(() => creditGems(initialGemLedger(), 0, 'boss_kill', 1)).toThrow();
    expect(() => debitGems(initialGemLedger(), -1, 'lesson_retry', 1)).toThrow();
  });
});

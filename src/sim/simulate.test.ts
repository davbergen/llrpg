import { describe, it, expect } from 'vitest';
import type { Monster } from '../types';
import type { ParsedDungeon } from '../content/dungeons';
import { DUNGEONS } from '../content/dungeons';
import {
  simulate,
  maxEffectiveCounter,
  dungeonOneShots,
} from './simulate';
import { evaluateDungeon } from './evaluate';
import { ARCHETYPES } from './bands';

const D1 = DUNGEONS[0];

function fakeMonster(overrides: Partial<Monster>): Monster {
  return {
    id: 'm',
    name: 'm',
    emoji: '👾',
    maxHp: 50,
    isBoss: false,
    counterDamage: 10,
    loot: { goldMin: 0, goldMax: 0, itemDropChance: 0 },
    ...overrides,
  };
}

describe('maxEffectiveCounter', () => {
  it('applies the enrage multiplier for bosses (worst case)', () => {
    expect(
      maxEffectiveCounter(fakeMonster({ isBoss: true, counterDamage: 30, enrageCounterMultiplier: 1.8 })),
    ).toBe(54);
  });

  it('ignores enrage multiplier for non-boss monsters', () => {
    expect(
      maxEffectiveCounter(fakeMonster({ isBoss: false, counterDamage: 30, enrageCounterMultiplier: 1.8 })),
    ).toBe(30);
  });
});

describe('dungeonOneShots', () => {
  const oneShot: ParsedDungeon = {
    meta: { id: 'os', name: 'os', sprite: '💀', order: 99, unlocksFrom: null },
    monsters: [fakeMonster({ counterDamage: 999 })],
  };
  const safe: ParsedDungeon = {
    meta: { id: 'safe', name: 'safe', sprite: '🛡️', order: 99, unlocksFrom: null },
    monsters: [fakeMonster({ counterDamage: 5 })],
  };

  it('flags a monster whose counter exceeds player maxHp', () => {
    expect(dungeonOneShots(oneShot, 1)).toBe(true);
  });

  it('does not flag survivable counters', () => {
    expect(dungeonOneShots(safe, 1)).toBe(false);
  });
});

describe('simulate', () => {
  const opts = { trials: 80, seed: 42 };

  it('returns metrics within their natural ranges', () => {
    const r = simulate(D1, ARCHETYPES.typical, 'mage', 3, opts);
    expect(r.winRate).toBeGreaterThanOrEqual(0);
    expect(r.winRate).toBeLessThanOrEqual(1);
    expect(r.endHpFraction).toBeGreaterThanOrEqual(0);
    expect(r.endHpFraction).toBeLessThanOrEqual(1);
    expect(r.castsToBoss).toBeGreaterThanOrEqual(0);
    expect(typeof r.anyOneShot).toBe('boolean');
  });

  it('is deterministic for a fixed seed', () => {
    const a = simulate(D1, ARCHETYPES.typical, 'warrior', 4, opts);
    const b = simulate(D1, ARCHETYPES.typical, 'warrior', 4, opts);
    expect(a).toEqual(b);
  });

  it('a stronger player never wins less often than a struggling one', () => {
    const big = { trials: 300, seed: 7 };
    const struggling = simulate(D1, ARCHETYPES.struggling, 'mage', 5, big);
    const strong = simulate(D1, ARCHETYPES.strong, 'mage', 5, big);
    expect(strong.winRate).toBeGreaterThanOrEqual(struggling.winRate);
  });

  it('records boss casts within the run when the player can win', () => {
    const r = simulate(D1, ARCHETYPES.strong, 'mage', 6, opts);
    if (r.winRate > 0) {
      expect(r.castsToBoss).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('evaluateDungeon', () => {
  it('returns a structured evaluation for all three classes', () => {
    const evalResult = evaluateDungeon(D1, 4, { trials: 60, seed: 1 });
    expect(evalResult.dungeonId).toBe(D1.meta.id);
    expect(evalResult.classes).toHaveLength(3);
    expect(Array.isArray(evalResult.failures)).toBe(true);
    expect(typeof evalResult.pass).toBe('boolean');
    // pass must be consistent with the failures list.
    expect(evalResult.pass).toBe(evalResult.failures.length === 0);
  });
});

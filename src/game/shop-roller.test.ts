import { describe, expect, it } from 'vitest';
import { BOSS_LOOT_POOL } from './loot-tables-v2';
import { rollShop, SHOP_POOL, SHOP_SLOT_COUNT } from './shop-roller';

describe('SHOP_POOL invariants', () => {
  it('contains no epics', () => {
    for (const item of SHOP_POOL) {
      expect(item.rarity).not.toBe('epic');
    }
  });

  it('contains no boss-only drops', () => {
    const bossIds = new Set(BOSS_LOOT_POOL.map((i) => i.id));
    for (const item of SHOP_POOL) {
      expect(bossIds.has(item.id)).toBe(false);
    }
  });

  it('has at least SHOP_SLOT_COUNT items so the shop can be filled', () => {
    expect(SHOP_POOL.length).toBeGreaterThanOrEqual(SHOP_SLOT_COUNT);
  });
});

describe('rollShop determinism', () => {
  it('same (date, userId) produces the same 4 items every time', () => {
    const a = rollShop('2026-05-09', 'user-1');
    const b = rollShop('2026-05-09', 'user-1');
    expect(a.map((i) => i.id)).toEqual(b.map((i) => i.id));
    expect(a).toHaveLength(SHOP_SLOT_COUNT);
  });

  it('different days produce different rolls (almost always)', () => {
    const a = rollShop('2026-05-09', 'user-1').map((i) => i.id);
    const b = rollShop('2026-05-10', 'user-1').map((i) => i.id);
    expect(a).not.toEqual(b);
  });

  it('different users produce different rolls (almost always)', () => {
    const a = rollShop('2026-05-09', 'user-1').map((i) => i.id);
    const b = rollShop('2026-05-09', 'user-2').map((i) => i.id);
    expect(a).not.toEqual(b);
  });

  it('a reroll produces a different roll from the original', () => {
    const original = rollShop('2026-05-09', 'user-1', 0).map((i) => i.id);
    const rerolled = rollShop('2026-05-09', 'user-1', 1).map((i) => i.id);
    expect(rerolled).not.toEqual(original);
  });

  it('all items in a roll are distinct', () => {
    const items = rollShop('2026-05-09', 'user-distinct');
    const ids = new Set(items.map((i) => i.id));
    expect(ids.size).toBe(items.length);
  });

  it('never includes an epic across many seeds', () => {
    for (let day = 1; day <= 60; day++) {
      const date = `2026-05-${String(day).padStart(2, '0')}`;
      for (let u = 0; u < 10; u++) {
        const items = rollShop(date, `user-${u}`);
        for (const item of items) {
          expect(item.rarity).not.toBe('epic');
        }
      }
    }
  });

  it('never includes a boss-only item across many seeds', () => {
    const bossIds = new Set(BOSS_LOOT_POOL.map((i) => i.id));
    for (let day = 1; day <= 60; day++) {
      const date = `2026-05-${String(day).padStart(2, '0')}`;
      for (let u = 0; u < 10; u++) {
        const items = rollShop(date, `user-${u}`);
        for (const item of items) {
          expect(bossIds.has(item.id)).toBe(false);
        }
      }
    }
  });
});

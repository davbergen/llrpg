import { describe, expect, it } from 'vitest';
import { BOSS_LOOT_POOL, rollBossLoot } from './loot';

describe('rollBossLoot', () => {
  it('always drops exactly one item', () => {
    for (let i = 0; i < 50; i++) {
      const drops = rollBossLoot(BOSS_LOOT_POOL, () => i / 50);
      expect(drops).toHaveLength(1);
    }
  });

  it('every drop is equippable (has a slot)', () => {
    for (let i = 0; i < 50; i++) {
      const [item] = rollBossLoot(BOSS_LOOT_POOL, () => i / 50);
      expect(item.slot).toBeDefined();
      expect(['head', 'chest', 'legs']).toContain(item.slot);
    }
  });

  it('every drop has a rarity from the allowed set', () => {
    const allowed = ['common', 'uncommon', 'rare', 'epic'];
    for (let i = 0; i < 50; i++) {
      const [item] = rollBossLoot(BOSS_LOOT_POOL, () => i / 50);
      expect(allowed).toContain(item.rarity);
    }
  });

  it('throws if no equippable items in the pool', () => {
    expect(() => rollBossLoot([], () => 0)).toThrow();
    expect(() =>
      rollBossLoot(
        [
          {
            id: 'x',
            name: 'x',
            type: 'gem',
            rarity: 'common',
            jp: 'x',
            bonus: 'x',
          },
        ],
        () => 0,
      ),
    ).toThrow();
  });

  it('the default BOSS_LOOT_POOL has only equippable items', () => {
    expect(BOSS_LOOT_POOL.length).toBeGreaterThan(0);
    for (const item of BOSS_LOOT_POOL) {
      expect(item.slot).toBeDefined();
    }
  });
});

import { describe, expect, it } from 'vitest';
import type { Monster } from '../types';
import {
  BOSS_LOOT_POOL,
  COSMETIC_LOOT_POOL,
  REGULAR_EQUIPPABLE_POOL,
  REGULAR_EQUIP_DROP_RATE,
  REGULAR_COSMETIC_BRANCH_END,
  MONSTER_GOLD_MIN,
  MONSTER_GOLD_MAX,
  BOSS_GOLD_MIN,
  BOSS_GOLD_MAX,
  rollBossLoot,
  rollMonsterGold,
  rollMonsterLoot,
  sellValue,
} from './loot-tables-v2';

const baseMonster: Monster = {
  id: 'test',
  name: 'Test Slime',
  emoji: '🟢',
  maxHp: 30,
  isBoss: false,
  counterDamage: 4,
  loot: { goldMin: 5, goldMax: 15, itemDropChance: 0.5 },
};

const bossMonster: Monster = {
  ...baseMonster,
  id: 'boss',
  isBoss: true,
};

function seededRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('REGULAR_EQUIPPABLE_POOL', () => {
  it('contains only common/uncommon items', () => {
    for (const item of REGULAR_EQUIPPABLE_POOL) {
      expect(['common', 'uncommon']).toContain(item.rarity);
    }
  });

  it('every item has an equipment slot', () => {
    for (const item of REGULAR_EQUIPPABLE_POOL) {
      expect(item.slot).toBeDefined();
    }
  });
});

describe('rollMonsterGold', () => {
  it('regular monster gold falls in [5,15]', () => {
    for (let i = 0; i < 200; i++) {
      const g = rollMonsterGold(baseMonster, () => i / 200);
      expect(g).toBeGreaterThanOrEqual(MONSTER_GOLD_MIN);
      expect(g).toBeLessThanOrEqual(MONSTER_GOLD_MAX);
    }
  });

  it('boss gold falls in [50,100]', () => {
    for (let i = 0; i < 200; i++) {
      const g = rollMonsterGold(bossMonster, () => i / 200);
      expect(g).toBeGreaterThanOrEqual(BOSS_GOLD_MIN);
      expect(g).toBeLessThanOrEqual(BOSS_GOLD_MAX);
    }
  });
});

describe('rollMonsterLoot distribution', () => {
  it('drops a common/uncommon equippable ~15% of the time', () => {
    const N = 5000;
    let equipCount = 0;
    let cosmeticCount = 0;
    let nothingCount = 0;
    // Use an unseeded Math.random for statistical sampling.
    for (let i = 0; i < N; i++) {
      const drops = rollMonsterLoot(baseMonster);
      if (drops.length === 0) {
        nothingCount += 1;
      } else if (REGULAR_EQUIPPABLE_POOL.some((p) => p.id === drops[0].id)) {
        equipCount += 1;
      } else {
        cosmeticCount += 1;
      }
    }
    const equipRate = equipCount / N;
    // Expected 0.15, allow ±0.025 for statistical noise.
    expect(equipRate).toBeGreaterThan(0.12);
    expect(equipRate).toBeLessThan(0.18);
    // Sanity: cosmetic + nothing + equip = N
    expect(cosmeticCount + nothingCount + equipCount).toBe(N);
  });

  it('every equippable drop is from REGULAR_EQUIPPABLE_POOL (common/uncommon)', () => {
    // Force the equip branch by always returning 0 from the rng's first call.
    const rng = seededRng([0, 0, 0]);
    const drops = rollMonsterLoot(baseMonster, { rng });
    expect(drops).toHaveLength(1);
    expect(['common', 'uncommon']).toContain(drops[0].rarity);
    expect(drops[0].slot).toBeDefined();
  });

  it('drops nothing when branchRoll is in the empty range', () => {
    const rng = seededRng([0.99]);
    const drops = rollMonsterLoot(baseMonster, { rng });
    expect(drops).toHaveLength(0);
  });

  it('drops a cosmetic when branchRoll is in the cosmetic range', () => {
    // branchRoll = 0.5 → cosmetic branch; itemDropChance gate uses next rng = 0.0 (drops)
    const rng = seededRng([0.5, 0.0, 0.0]);
    const drops = rollMonsterLoot(baseMonster, { rng });
    expect(drops).toHaveLength(1);
    expect(COSMETIC_LOOT_POOL.some((p) => p.id === drops[0].id)).toBe(true);
  });

  it('honors guaranteedItem flag (skips gating, drops a cosmetic)', () => {
    const m: Monster = { ...baseMonster, loot: { ...baseMonster.loot, guaranteedItem: true } };
    const rng = seededRng([0.99, 0.0]);
    const drops = rollMonsterLoot(m, { rng });
    expect(drops).toHaveLength(1);
    expect(COSMETIC_LOOT_POOL.some((p) => p.id === drops[0].id)).toBe(true);
  });

  it('boundary constants line up: equip + cosmetic = 0.75', () => {
    expect(REGULAR_COSMETIC_BRANCH_END - REGULAR_EQUIP_DROP_RATE).toBeCloseTo(0.6, 5);
  });
});

describe('rollBossLoot', () => {
  it('always drops exactly one equippable item', () => {
    for (let i = 0; i < 50; i++) {
      const drops = rollBossLoot(BOSS_LOOT_POOL, () => i / 50);
      expect(drops).toHaveLength(1);
      expect(drops[0].slot).toBeDefined();
    }
  });

  it('throws if no equippable items are in the pool', () => {
    expect(() => rollBossLoot([], () => 0)).toThrow();
  });

  it('default boss pool only contains rare/epic items', () => {
    for (const item of BOSS_LOOT_POOL) {
      expect(['rare', 'epic']).toContain(item.rarity);
    }
  });
});

describe('sellValue', () => {
  it('matches the spec table', () => {
    expect(sellValue({ ...REGULAR_EQUIPPABLE_POOL[0], rarity: 'common' })).toBe(5);
    expect(sellValue({ ...REGULAR_EQUIPPABLE_POOL[0], rarity: 'uncommon' })).toBe(15);
    expect(sellValue({ ...REGULAR_EQUIPPABLE_POOL[0], rarity: 'rare' })).toBe(50);
    expect(sellValue({ ...REGULAR_EQUIPPABLE_POOL[0], rarity: 'epic' })).toBe(150);
  });
});

import type { InventoryItem } from '../types';
import {
  COSMETIC_LOOT_POOL,
  REGULAR_EQUIPPABLE_POOL,
  BOSS_LOOT_POOL,
} from './loot-tables-v2';

export const SHOP_REROLL_COST = 50;
export const SHOP_SLOT_COUNT = 4;

/**
 * Items eligible to appear in the shop. Excludes:
 * - epics (only obtainable from boss kills)
 * - boss-only drops (rare gear)
 *
 * Common, uncommon, and rare cosmetics are eligible if not in BOSS_LOOT_POOL.
 */
export const SHOP_POOL: InventoryItem[] = [
  ...COSMETIC_LOOT_POOL,
  ...REGULAR_EQUIPPABLE_POOL,
].filter(
  (item) =>
    item.rarity !== 'epic' && !BOSS_LOOT_POOL.some((boss) => boss.id === item.id),
);

/** djb2-style 32-bit string hash. Deterministic and platform-independent. */
function hashString(s: string): number {
  let h = 5381 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
}

/** Mulberry32 PRNG. Stable, fast, and deterministic per seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shopSeed(date: string, userId: string, rerollCount = 0): number {
  return hashString(`${date}|${userId}|r${rerollCount}`);
}

/**
 * Deterministically pick `count` distinct items from `pool` using a seeded RNG.
 * If pool.length <= count, returns the pool unchanged.
 */
function pickDistinct(pool: InventoryItem[], count: number, rng: () => number): InventoryItem[] {
  if (pool.length <= count) return pool.slice();
  const indices: number[] = [];
  const used = new Set<number>();
  while (indices.length < count) {
    const idx = Math.floor(rng() * pool.length);
    if (!used.has(idx)) {
      used.add(idx);
      indices.push(idx);
    }
  }
  return indices.map((i) => pool[i]);
}

/**
 * Roll the shop's daily inventory.
 * Same `(date, userId, rerollCount)` produces the same items every time.
 */
export function rollShop(
  date: string,
  userId: string,
  rerollCount = 0,
  pool: InventoryItem[] = SHOP_POOL,
): InventoryItem[] {
  const seed = shopSeed(date, userId, rerollCount);
  const rng = mulberry32(seed);
  return pickDistinct(pool, SHOP_SLOT_COUNT, rng);
}

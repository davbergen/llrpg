import type { InventoryItem, Monster } from '../types';

export const COSMETIC_LOOT_POOL: InventoryItem[] = [
  {
    id: 'iron_sword',
    name: 'Iron Katana',
    type: 'sword',
    rarity: 'common',
    jp: '鉄の刀',
    desc: '+5 ATK. The blade of a diligent student.',
    bonus: 'ATK +5',
  },
  {
    id: 'vocab_scroll',
    name: 'Vocab Scroll',
    type: 'scroll',
    rarity: 'common',
    jp: '語彙の巻物',
    desc: 'Unlock 3 bonus vocab words today.',
    bonus: 'Vocab +3',
  },
  {
    id: 'mana_potion',
    name: 'Mana Elixir',
    type: 'potion',
    rarity: 'uncommon',
    jp: 'マナ薬',
    desc: 'Restores 40 MP. Tastes like matcha.',
    bonus: 'MP +40',
  },
  {
    id: 'kanji_gem',
    name: 'Kanji Crystal',
    type: 'gem',
    rarity: 'rare',
    jp: '漢字の宝石',
    desc: 'A rare gem that glows with ancient meaning.',
    bonus: 'XP x1.5',
  },
  {
    id: 'ward_shield',
    name: "Scholar's Ward",
    type: 'shield',
    rarity: 'uncommon',
    jp: '盾',
    desc: '+8 DEF. Wards off forgotten vocab.',
    bonus: 'DEF +8',
  },
  {
    id: 'swift_bow',
    name: 'Swift Bow',
    type: 'bow',
    rarity: 'uncommon',
    jp: '速弓',
    desc: 'Earn gold faster on timed questions.',
    bonus: 'Gold +15%',
  },
];

export type Rng = () => number;

export function rollMonsterGold(monster: Monster, rng: Rng = Math.random): number {
  const { goldMin, goldMax } = monster.loot;
  if (goldMax <= goldMin) return goldMin;
  return goldMin + Math.floor(rng() * (goldMax - goldMin + 1));
}

export function rollMonsterLoot(
  monster: Monster,
  pool: InventoryItem[] = COSMETIC_LOOT_POOL,
  rng: Rng = Math.random,
): InventoryItem[] {
  if (pool.length === 0) return [];
  const dropped = monster.loot.guaranteedItem || rng() < monster.loot.itemDropChance;
  if (!dropped) return [];
  const item = pool[Math.floor(rng() * pool.length)];
  return [item];
}

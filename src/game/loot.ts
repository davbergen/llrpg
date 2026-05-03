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

export const BOSS_LOOT_POOL: InventoryItem[] = [
  {
    id: 'dragonbone_helm',
    name: 'Dragonbone Helm',
    type: 'helmet',
    rarity: 'rare',
    jp: '竜骨の兜',
    desc: 'Carved from the Grammar Dragon. Sharpens recall.',
    bonus: 'INT +6',
    slot: 'head',
  },
  {
    id: 'scaleweave_robe',
    name: 'Scaleweave Robe',
    type: 'shield',
    rarity: 'epic',
    jp: '鱗織の衣',
    desc: 'Woven from boss scales. Shrugs off forgotten kanji.',
    bonus: 'DEF +12',
    slot: 'chest',
  },
  {
    id: 'kanji_greaves',
    name: 'Kanji Greaves',
    type: 'shield',
    rarity: 'uncommon',
    jp: '漢字の脛当て',
    desc: 'Etched leg guards. Grants steady footing on review days.',
    bonus: 'SPD +5',
    slot: 'legs',
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

export function rollBossLoot(
  pool: InventoryItem[] = BOSS_LOOT_POOL,
  rng: Rng = Math.random,
): InventoryItem[] {
  const equippable = pool.filter((item) => item.slot != null);
  if (equippable.length === 0) {
    throw new Error('Boss loot pool must contain at least one equippable item');
  }
  const item = equippable[Math.floor(rng() * equippable.length)];
  return [item];
}

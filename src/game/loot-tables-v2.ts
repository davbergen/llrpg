import type { InventoryItem, ItemRarity, Monster } from '../types';

export type Rng = () => number;

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

/** Common + uncommon equippables that drop from regular monsters. */
export const REGULAR_EQUIPPABLE_POOL: InventoryItem[] = [
  {
    id: 'leather_cap',
    name: 'Leather Cap',
    type: 'helmet',
    rarity: 'common',
    jp: '革の帽子',
    desc: 'A plain student cap. +1 DMG.',
    bonus: 'DMG +1',
    slot: 'head',
  },
  {
    id: 'cloth_tunic',
    name: 'Cloth Tunic',
    type: 'shield',
    rarity: 'common',
    jp: '布の上着',
    desc: 'Modest robes. +1 DMG.',
    bonus: 'DMG +1',
    slot: 'chest',
  },
  {
    id: 'cloth_pants',
    name: 'Cloth Pants',
    type: 'shield',
    rarity: 'common',
    jp: '布のズボン',
    desc: 'Light leg wraps. +1 DMG.',
    bonus: 'DMG +1',
    slot: 'legs',
  },
  {
    id: 'studded_helm',
    name: 'Studded Helm',
    type: 'helmet',
    rarity: 'uncommon',
    jp: '鋲の兜',
    desc: 'Reinforced cap. +2 DMG.',
    bonus: 'DMG +2',
    slot: 'head',
  },
  {
    id: 'chain_vest',
    name: 'Chain Vest',
    type: 'shield',
    rarity: 'uncommon',
    jp: '鎖の胴着',
    desc: 'Linked rings of practice. +2 DMG.',
    bonus: 'DMG +2',
    slot: 'chest',
  },
  {
    id: 'reinforced_boots',
    name: 'Reinforced Boots',
    type: 'shield',
    rarity: 'uncommon',
    jp: '補強の靴',
    desc: 'Sturdy footing. +2 DMG.',
    bonus: 'DMG +2',
    slot: 'legs',
  },
];

/** Rare/epic equippables; only bosses drop these. */
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
    rarity: 'rare',
    jp: '漢字の脛当て',
    desc: 'Etched leg guards. Grants steady footing on review days.',
    bonus: 'SPD +5',
    slot: 'legs',
  },
];

export const MONSTER_GOLD_MIN = 5;
export const MONSTER_GOLD_MAX = 15;
export const BOSS_GOLD_MIN = 50;
export const BOSS_GOLD_MAX = 100;

/** Distribution: 15% common/uncommon equippable, 60% cosmetic-or-nothing, 25% nothing. */
export const REGULAR_EQUIP_DROP_RATE = 0.15;
export const REGULAR_COSMETIC_BRANCH_END = 0.75; // 0.15 + 0.60

export const SELL_VALUE: Record<ItemRarity, number> = {
  common: 5,
  uncommon: 15,
  rare: 50,
  epic: 150,
};

function rollIntInRange(min: number, max: number, rng: Rng): number {
  if (max <= min) return min;
  return min + Math.floor(rng() * (max - min + 1));
}

export function rollMonsterGold(monster: Monster, rng: Rng = Math.random): number {
  if (monster.isBoss) {
    return rollIntInRange(BOSS_GOLD_MIN, BOSS_GOLD_MAX, rng);
  }
  return rollIntInRange(MONSTER_GOLD_MIN, MONSTER_GOLD_MAX, rng);
}

/**
 * Regular monster loot drop.
 * - 15% chance: a common/uncommon equippable from REGULAR_EQUIPPABLE_POOL
 * - 60% chance: a cosmetic from COSMETIC_LOOT_POOL (may roll to nothing per monster.itemDropChance)
 * - 25% chance: nothing
 *
 * `monster.loot.guaranteedItem` skips the gating roll and forces a cosmetic drop.
 */
export function rollMonsterLoot(
  monster: Monster,
  options?: { cosmeticPool?: InventoryItem[]; equipPool?: InventoryItem[]; rng?: Rng },
): InventoryItem[] {
  const cosmeticPool = options?.cosmeticPool ?? COSMETIC_LOOT_POOL;
  const equipPool = options?.equipPool ?? REGULAR_EQUIPPABLE_POOL;
  const rng = options?.rng ?? Math.random;

  if (monster.loot.guaranteedItem) {
    if (cosmeticPool.length === 0) return [];
    return [cosmeticPool[Math.floor(rng() * cosmeticPool.length)]];
  }

  const branchRoll = rng();
  if (branchRoll < REGULAR_EQUIP_DROP_RATE) {
    if (equipPool.length === 0) return [];
    const item = equipPool[Math.floor(rng() * equipPool.length)];
    return [item];
  }
  if (branchRoll < REGULAR_COSMETIC_BRANCH_END) {
    if (cosmeticPool.length === 0) return [];
    const dropped = rng() < monster.loot.itemDropChance;
    if (!dropped) return [];
    return [cosmeticPool[Math.floor(rng() * cosmeticPool.length)]];
  }
  return [];
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

export function sellValue(item: InventoryItem): number {
  return SELL_VALUE[item.rarity] ?? 0;
}

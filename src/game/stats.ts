import type { Equipment, Hero, InventoryItem, ItemRarity } from '../types';

export const RARITY_DAMAGE_BONUS: Record<ItemRarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 5,
  epic: 10,
};

const BASE_MAX_HP = 100;
const HP_PER_LEVEL = 10;

export function calcStats(
  _hero: Hero,
  equipment: Equipment,
  level: number,
): { damageBonus: number; maxHp: number } {
  const slots = [equipment.head, equipment.chest, equipment.legs].filter(
    (item): item is InventoryItem => item !== null,
  );
  const damageBonus = slots.reduce((sum, item) => sum + (RARITY_DAMAGE_BONUS[item.rarity] ?? 0), 0);
  const maxHp = BASE_MAX_HP + (level - 1) * HP_PER_LEVEL + damageBonus;
  return { damageBonus, maxHp };
}

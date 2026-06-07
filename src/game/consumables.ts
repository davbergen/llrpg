/**
 * Consumable items — the in-inventory "USE" effects.
 *
 * Pure, React/DOM-free, in the `game/` style: given an item and the current
 * resource pool, return the next resource pool plus whether the item was
 * actually consumed. The App layer owns removing the item from inventory when
 * `consumed` is true; this module never mutates inventory itself.
 *
 * `ConsumableResources` is intentionally a small open bag (just Mana today) so
 * future consumable effects — HP potions, Faith/Rage tonics — can widen it
 * without changing the call shape.
 */
import type { InventoryItem } from '../types';
import { MANA_MAX, type ManaState } from './mana';

/** The pool of resources a consumable may read or modify. */
export interface ConsumableResources {
  mana: ManaState;
}

export interface ConsumableResult {
  resources: ConsumableResources;
  /** True when the item had an effect and should be removed from inventory. */
  consumed: boolean;
}

/**
 * Item types that surface a "USE" affordance. The Vocab Scroll and Kanji
 * Crystal show the affordance for consistency even though their effects are a
 * fast-follow — `applyConsumable` returns `consumed: false` for them for now.
 */
const CONSUMABLE_TYPES: ReadonlySet<InventoryItem['type']> = new Set([
  'potion',
  'scroll',
  'gem',
]);

export function isConsumable(item: InventoryItem): boolean {
  return CONSUMABLE_TYPES.has(item.type);
}

/**
 * Apply a consumable's effect to the resource pool.
 *
 * Wired effects:
 * - Mana Elixir (`mana_potion`): restores Mana to full (`MANA_MAX`), never
 *   exceeding the cap and never reducing a pool already above it.
 *
 * Any other item — including consumable-typed items whose effect isn't wired
 * yet, and all equipment — returns the resources untouched and `consumed: false`.
 */
export function applyConsumable(
  item: InventoryItem,
  resources: ConsumableResources,
): ConsumableResult {
  if (item.id === 'mana_potion') {
    return {
      resources: {
        ...resources,
        mana: { ...resources.mana, current: Math.max(resources.mana.current, MANA_MAX) },
      },
      consumed: true,
    };
  }
  return { resources, consumed: false };
}

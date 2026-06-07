import { describe, expect, it } from 'vitest';
import { applyConsumable, isConsumable, type ConsumableResources } from './consumables';
import { MANA_MAX, type ManaState } from './mana';
import type { InventoryItem } from '../types';

const manaAt = (current: number): ManaState => ({
  current,
  resetsAt: new Date(2026, 5, 2, 4, 0, 0, 0).toISOString(),
  firstLessonBonusUsedToday: false,
});

const resources = (current: number): ConsumableResources => ({ mana: manaAt(current) });

const item = (over: Partial<InventoryItem>): InventoryItem => ({
  id: 'x',
  name: 'X',
  type: 'sword',
  rarity: 'common',
  jp: '',
  bonus: '',
  ...over,
});

const MANA_ELIXIR = item({ id: 'mana_potion', name: 'Mana Elixir', type: 'potion' });

describe('isConsumable', () => {
  it('flags potion / scroll / gem item types', () => {
    expect(isConsumable(item({ type: 'potion' }))).toBe(true);
    expect(isConsumable(item({ type: 'scroll' }))).toBe(true);
    expect(isConsumable(item({ type: 'gem' }))).toBe(true);
  });

  it('does not flag equipment', () => {
    expect(isConsumable(item({ type: 'sword' }))).toBe(false);
    expect(isConsumable(item({ type: 'shield' }))).toBe(false);
    expect(isConsumable(item({ type: 'helmet' }))).toBe(false);
  });
});

describe('applyConsumable — Mana Elixir', () => {
  it('restores Mana to the cap', () => {
    const { resources: next, consumed } = applyConsumable(MANA_ELIXIR, resources(2));
    expect(consumed).toBe(true);
    expect(next.mana.current).toBe(MANA_MAX);
  });

  it('never exceeds MANA_MAX when already at full', () => {
    const { resources: next } = applyConsumable(MANA_ELIXIR, resources(MANA_MAX));
    expect(next.mana.current).toBe(MANA_MAX);
  });

  it('does not reduce Mana inflated above the cap (first-lesson bonus)', () => {
    const { resources: next } = applyConsumable(MANA_ELIXIR, resources(MANA_MAX + 2));
    expect(next.mana.current).toBe(MANA_MAX + 2);
  });

  it('leaves unrelated Mana fields untouched', () => {
    const before = resources(0);
    const { resources: next } = applyConsumable(MANA_ELIXIR, before);
    expect(next.mana.resetsAt).toBe(before.mana.resetsAt);
    expect(next.mana.firstLessonBonusUsedToday).toBe(false);
  });
});

describe('applyConsumable — unwired / non-consumable items', () => {
  it('returns consumed:false and unchanged resources for an unwired consumable', () => {
    const scroll = item({ id: 'vocab_scroll', type: 'scroll' });
    const before = resources(3);
    const result = applyConsumable(scroll, before);
    expect(result.consumed).toBe(false);
    expect(result.resources).toEqual(before);
  });

  it('returns consumed:false for equipment', () => {
    const sword = item({ id: 'iron_sword', type: 'sword' });
    const result = applyConsumable(sword, resources(3));
    expect(result.consumed).toBe(false);
  });
});

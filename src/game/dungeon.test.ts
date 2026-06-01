import { describe, expect, it } from 'vitest';
import {
  DUNGEONS,
  freshProgress,
  getDungeon,
  initialDungeonState,
  isDungeonUnlocked,
  unlockedDungeons,
} from './dungeon';
import type { DungeonProgress } from '../types';

describe('dungeons registry', () => {
  it('loads eight dungeons in contiguous order', () => {
    expect(DUNGEONS).toHaveLength(8);
    expect(DUNGEONS.map((d) => d.meta.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('each dungeon has 6 monsters + 1 boss in fixed sequence', () => {
    for (const d of DUNGEONS) {
      expect(d.monsters).toHaveLength(7);
      expect(d.monsters.slice(0, 6).every((m) => !m.isBoss)).toBe(true);
      expect(d.monsters[6].isBoss).toBe(true);
    }
  });

  it('forms a tiered DAG: exactly one tier-1 root, every other unlock points at a real lower dungeon', () => {
    const byId = new Map(DUNGEONS.map((d) => [d.meta.id, d]));
    const roots = DUNGEONS.filter((d) => d.meta.unlocksFrom == null);
    expect(roots).toHaveLength(1);
    expect(roots[0].meta.tier).toBe(1);
    for (const d of DUNGEONS) {
      if (d.meta.unlocksFrom == null) continue;
      const parent = byId.get(d.meta.unlocksFrom);
      expect(parent, `${d.meta.id} unlocksFrom unknown ${d.meta.unlocksFrom}`).toBeDefined();
      // A tier-N dungeon is unlocked by a tier-(N-1) dungeon.
      expect(parent!.meta.tier).toBe(d.meta.tier - 1);
    }
  });

  it('has tiers 1..4 with branching (several dungeons available at once)', () => {
    const tiers = DUNGEONS.map((d) => d.meta.tier).sort((a, b) => a - b);
    expect(tiers).toEqual([1, 2, 2, 3, 3, 4, 4, 4]);
  });

  it('initial state activates the first dungeon and seeds its progress', () => {
    const state = initialDungeonState();
    expect(state.activeDungeonId).toBe(DUNGEONS[0].meta.id);
    const p = state.progress[state.activeDungeonId];
    expect(p.currentMonsterIndex).toBe(0);
    expect(p.currentMonsterHp).toBe(DUNGEONS[0].monsters[0].maxHp);
    expect(p.cleared).toBe(false);
  });
});

describe('DAG gating', () => {
  const ROOT = DUNGEONS.find((d) => d.meta.unlocksFrom == null)!;

  it('the tier-1 root is always unlocked; everything else starts locked', () => {
    const progress: Record<string, DungeonProgress> = {};
    for (const d of DUNGEONS) {
      expect(isDungeonUnlocked(d.meta.id, progress)).toBe(d.meta.unlocksFrom == null);
    }
  });

  it('clearing a dungeon unlocks all of its direct children at once', () => {
    const progress: Record<string, DungeonProgress> = {
      [ROOT.meta.id]: { ...freshProgress(ROOT.monsters), cleared: true },
    };
    const children = DUNGEONS.filter((d) => d.meta.unlocksFrom === ROOT.meta.id);
    expect(children.length).toBeGreaterThan(1); // the root branches
    for (const c of children) {
      expect(isDungeonUnlocked(c.meta.id, progress)).toBe(true);
    }
    // Grandchildren (tier 3) remain locked until a tier-2 dungeon is cleared.
    const grandchildren = DUNGEONS.filter((d) =>
      children.some((c) => c.meta.id === d.meta.unlocksFrom),
    );
    for (const g of grandchildren) {
      expect(isDungeonUnlocked(g.meta.id, progress)).toBe(false);
    }
  });

  it('unlockedDungeons returns the root plus every cleared dungeon’s children, in order', () => {
    const progress: Record<string, DungeonProgress> = {
      [ROOT.meta.id]: { ...freshProgress(ROOT.monsters), cleared: true },
    };
    const expected = DUNGEONS.filter(
      (d) => d.meta.unlocksFrom == null || d.meta.unlocksFrom === ROOT.meta.id,
    ).map((d) => d.meta.id);
    expect(unlockedDungeons(progress).map((d) => d.meta.id)).toEqual(expected);
  });

  it('getDungeon throws on unknown id', () => {
    expect(() => getDungeon('does-not-exist')).toThrow();
  });
});

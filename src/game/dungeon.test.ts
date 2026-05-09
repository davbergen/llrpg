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
  it('loads three dungeons in order', () => {
    expect(DUNGEONS).toHaveLength(3);
    expect(DUNGEONS.map((d) => d.meta.order)).toEqual([1, 2, 3]);
  });

  it('each dungeon has 6 monsters + 1 boss in fixed sequence', () => {
    for (const d of DUNGEONS) {
      expect(d.monsters).toHaveLength(7);
      expect(d.monsters.slice(0, 6).every((m) => !m.isBoss)).toBe(true);
      expect(d.monsters[6].isBoss).toBe(true);
    }
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

describe('linear gating', () => {
  it('Dungeon 1 is always unlocked; Dungeon 2 and 3 start locked', () => {
    const progress: Record<string, DungeonProgress> = {};
    expect(isDungeonUnlocked(DUNGEONS[0].meta.id, progress)).toBe(true);
    expect(isDungeonUnlocked(DUNGEONS[1].meta.id, progress)).toBe(false);
    expect(isDungeonUnlocked(DUNGEONS[2].meta.id, progress)).toBe(false);
  });

  it('clearing Dungeon N unlocks Dungeon N+1, but not N+2', () => {
    const d1 = DUNGEONS[0];
    const progress: Record<string, DungeonProgress> = {
      [d1.meta.id]: { ...freshProgress(d1.monsters), cleared: true },
    };
    expect(isDungeonUnlocked(DUNGEONS[1].meta.id, progress)).toBe(true);
    expect(isDungeonUnlocked(DUNGEONS[2].meta.id, progress)).toBe(false);
  });

  it('unlockedDungeons returns dungeons in order based on cleared chain', () => {
    const d1 = DUNGEONS[0];
    const progress: Record<string, DungeonProgress> = {
      [d1.meta.id]: { ...freshProgress(d1.monsters), cleared: true },
    };
    const list = unlockedDungeons(progress);
    expect(list.map((d) => d.meta.id)).toEqual([DUNGEONS[0].meta.id, DUNGEONS[1].meta.id]);
  });

  it('getDungeon throws on unknown id', () => {
    expect(() => getDungeon('does-not-exist')).toThrow();
  });
});

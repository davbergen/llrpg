import { describe, expect, it } from 'vitest';
import {
  DUNGEONS,
  freshProgress,
  getDungeon,
  initialDungeonState,
  isDungeonUnlocked,
  resetActiveDungeon,
  sanitizeDungeonState,
  unlockedDungeons,
} from './dungeon';
import type { DungeonProgress, DungeonState } from '../types';

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

describe('resetActiveDungeon (run-reset on death)', () => {
  it('resets the active dungeon to fresh progress', () => {
    const d1 = DUNGEONS[0];
    const state: DungeonState = {
      activeDungeonId: d1.meta.id,
      progress: {
        [d1.meta.id]: {
          currentMonsterIndex: 4,
          currentMonsterHp: 12,
          lastActionAt: 9999,
          cleared: false,
        },
      },
      pendingDamageMultiplier: 1.6,
    };
    const next = resetActiveDungeon(state);
    expect(next.progress[d1.meta.id]).toEqual(freshProgress(d1.monsters));
    expect(next.pendingDamageMultiplier).toBeUndefined();
  });

  it('leaves other dungeons untouched', () => {
    const [d1, d2] = DUNGEONS;
    const d2Progress: DungeonProgress = {
      ...freshProgress(d2.monsters),
      cleared: true,
    };
    const state: DungeonState = {
      activeDungeonId: d1.meta.id,
      progress: {
        [d1.meta.id]: { currentMonsterIndex: 3, currentMonsterHp: 5, lastActionAt: 1, cleared: false },
        [d2.meta.id]: d2Progress,
      },
    };
    const next = resetActiveDungeon(state);
    expect(next.progress[d2.meta.id]).toEqual(d2Progress);
  });
});

describe('sanitizeDungeonState (stale-id repair)', () => {
  it('falls back to the first dungeon when the active id is unknown', () => {
    const [d1] = DUNGEONS;
    const d1Cleared: DungeonProgress = { ...freshProgress(d1.monsters), cleared: true };
    const stale: DungeonState = {
      // "garden-of-particles" was a former id for Dungeon 2.
      activeDungeonId: 'garden-of-particles',
      progress: {
        [d1.meta.id]: d1Cleared,
        'garden-of-particles': {
          currentMonsterIndex: 1,
          currentMonsterHp: 70,
          lastActionAt: 123,
          cleared: false,
        },
      },
    };
    const next = sanitizeDungeonState(stale);
    expect(next.activeDungeonId).toBe(d1.meta.id);
    // Unknown progress key dropped; known one preserved.
    expect(next.progress['garden-of-particles']).toBeUndefined();
    expect(next.progress[d1.meta.id]).toEqual(d1Cleared);
  });

  it('seeds fresh progress for the active dungeon if missing', () => {
    const [d1, d2] = DUNGEONS;
    const next = sanitizeDungeonState({ activeDungeonId: d2.meta.id, progress: {} });
    expect(next.activeDungeonId).toBe(d2.meta.id);
    expect(next.progress[d2.meta.id]).toEqual(freshProgress(d2.monsters));
    expect(next.progress[d1.meta.id]).toBeUndefined();
  });

  it('leaves a valid state intact', () => {
    const valid = initialDungeonState();
    expect(sanitizeDungeonState(valid)).toEqual(valid);
  });

  it('returns a fresh initial state for undefined input', () => {
    expect(sanitizeDungeonState(undefined)).toEqual(initialDungeonState());
  });
});

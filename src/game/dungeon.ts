import type { DungeonProgress, DungeonState, Monster } from '../types';
import { DUNGEONS, getDungeon } from '../content/dungeons';

export { DUNGEONS, getDungeon };

export function freshProgress(monsters: Monster[]): DungeonProgress {
  return {
    currentMonsterIndex: 0,
    currentMonsterHp: monsters[0]?.maxHp ?? 0,
    lastActionAt: 0,
    cleared: false,
  };
}

export function initialDungeonState(): DungeonState {
  const first = DUNGEONS[0];
  return {
    activeDungeonId: first.meta.id,
    progress: { [first.meta.id]: freshProgress(first.monsters) },
  };
}

export function getActiveProgress(state: DungeonState): DungeonProgress {
  const p = state.progress[state.activeDungeonId];
  if (p) return p;
  // Lazy-init progress for an unlocked dungeon being entered for the first time.
  const dungeon = getDungeon(state.activeDungeonId);
  return freshProgress(dungeon.monsters);
}

export function getActiveMonsters(state: DungeonState): Monster[] {
  return getDungeon(state.activeDungeonId).monsters;
}

/** Returns true if the dungeon is unlocked given the current progress map. */
export function isDungeonUnlocked(
  dungeonId: string,
  progress: Record<string, DungeonProgress>,
): boolean {
  const d = getDungeon(dungeonId);
  if (d.meta.unlocksFrom == null) return true;
  return progress[d.meta.unlocksFrom]?.cleared === true;
}

export function unlockedDungeons(progress: Record<string, DungeonProgress>): typeof DUNGEONS {
  return DUNGEONS.filter((d) => isDungeonUnlocked(d.meta.id, progress));
}

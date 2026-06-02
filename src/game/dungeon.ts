import type { DungeonProgress, DungeonState, Monster } from '../types';
import { DUNGEONS, DUNGEONS_BY_ID, getDungeon } from '../content/dungeons';

export { DUNGEONS, getDungeon };

/** True if `id` resolves to a dungeon in the current content. */
export function dungeonExists(id: string): boolean {
  return DUNGEONS_BY_ID.has(id);
}

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

/**
 * Run-reset on death: returns a dungeon state whose *active* dungeon's monster
 * progress is reset to the start (reusing `freshProgress`), leaving every other
 * dungeon's progress — and any earned XP/loot/gold, which live outside this
 * state — untouched. The queued damage multiplier is dropped, since the run ends.
 */
export function resetActiveDungeon(state: DungeonState): DungeonState {
  const id = state.activeDungeonId;
  const dungeon = getDungeon(id);
  return {
    ...state,
    progress: {
      ...state.progress,
      [id]: freshProgress(dungeon.monsters),
    },
    pendingDamageMultiplier: undefined,
  };
}

/** Full-heal helper for entering a dungeon / re-entering after a failed run. */
export function fullHeal(maxHp: number): number {
  return maxHp;
}

/**
 * Repairs a persisted dungeon state whose ids may be stale — e.g. a dungeon was
 * renamed between app versions (a save from when Dungeon 2 was "garden-of-particles"
 * loaded against content that now calls it "crypt-of-conjugations"). Drops progress
 * for unknown dungeons and falls back to the first dungeon when the active id no
 * longer resolves, so a stale save can't hard-crash boot via {@link getDungeon}.
 */
export function sanitizeDungeonState(state: DungeonState | undefined): DungeonState {
  if (!state || typeof state.activeDungeonId !== 'string') return initialDungeonState();

  const progress: Record<string, DungeonProgress> = {};
  for (const [id, p] of Object.entries(state.progress ?? {})) {
    if (DUNGEONS_BY_ID.has(id)) progress[id] = p;
  }

  const activeDungeonId = DUNGEONS_BY_ID.has(state.activeDungeonId)
    ? state.activeDungeonId
    : DUNGEONS[0].meta.id;

  if (!progress[activeDungeonId]) {
    progress[activeDungeonId] = freshProgress(getDungeon(activeDungeonId).monsters);
  }

  return { ...state, activeDungeonId, progress };
}

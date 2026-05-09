import type { DungeonState, GameState, Hero } from './types';
import { initialManaState } from './game/mana';
import { emptySecondaryResources } from './game/secondary-resources';
import { initialDungeonState } from './game/dungeon';
import { initialStreakState } from './game/streak';
import { initialGemLedger } from './game/gem-ledger';

export const SAVE_KEY = 'llrpg:save:v2';

function migrateDungeonState(raw: unknown): DungeonState {
  // Slice 17 introduced multi-dungeon progress. Migrate v1 dungeon shape on load.
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    if (typeof r.activeDungeonId === 'string' && r.progress && typeof r.progress === 'object') {
      return raw as DungeonState;
    }
  }
  return initialDungeonState();
}

export interface PersistedState {
  hero: Hero | null;
  gameState: GameState;
  /** True once the Awakening placement probe has been completed. */
  placementDone?: boolean;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getStorage(): StorageLike | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function loadSave(storage: StorageLike | null = getStorage()): PersistedState | null {
  if (!storage) return null;
  let raw: string | null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed || typeof parsed !== 'object' || !('gameState' in parsed) || !('hero' in parsed)) {
      return null;
    }
    const gameState: GameState = {
      ...parsed.gameState,
      mana: parsed.gameState.mana ?? initialManaState(Date.now()),
      secondaryResources: parsed.gameState.secondaryResources ?? emptySecondaryResources(),
      dungeonState: migrateDungeonState(parsed.gameState.dungeonState),
      streakState: parsed.gameState.streakState ?? initialStreakState(),
      gems: parsed.gameState.gems ?? initialGemLedger(),
      shop: parsed.gameState.shop ?? { date: null, rerollCount: 0, purchasedIds: [] },
    };
    return { ...parsed, gameState, placementDone: parsed.placementDone ?? false };
  } catch {
    return null;
  }
}

export function saveSave(state: PersistedState, storage: StorageLike | null = getStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // storage full or unavailable — drop silently; persistence is best-effort
  }
}

export function wipeSave(storage: StorageLike | null = getStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}

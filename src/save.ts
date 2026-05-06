import type { GameState, Hero } from './types';

export const SAVE_KEY = 'llrpg:save:v3';

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
    return { ...parsed, placementDone: parsed.placementDone ?? false };
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

import type { Repo, PersistedState } from './types';
import { hydratePersisted, isPersistedShape } from './types';

export const SAVE_KEY = 'llrpg:save:v2';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStorage(): StorageLike | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

export class LocalAdapter implements Repo {
  constructor(
    private readonly key: string = SAVE_KEY,
    private readonly storage: StorageLike | null = defaultStorage(),
  ) {}

  async load(): Promise<PersistedState | null> {
    if (!this.storage) return null;
    let raw: string | null;
    try {
      raw = this.storage.getItem(this.key);
    } catch {
      return null;
    }
    if (raw === null) return null;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!isPersistedShape(parsed)) return null;
      return hydratePersisted(parsed);
    } catch {
      return null;
    }
  }

  async save(state: PersistedState): Promise<void> {
    if (!this.storage) return;
    try {
      this.storage.setItem(this.key, JSON.stringify(state));
    } catch {
      // storage full or unavailable — best-effort
    }
  }

  async wipe(): Promise<void> {
    if (!this.storage) return;
    try {
      this.storage.removeItem(this.key);
    } catch {
      // ignore
    }
  }
}

/** Synchronous read of the local cache, used only at boot for the initial render. */
export function loadLocalSync(
  storage: StorageLike | null = defaultStorage(),
  key: string = SAVE_KEY,
): PersistedState | null {
  if (!storage) return null;
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return null;
  }
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isPersistedShape(parsed)) return null;
    return hydratePersisted(parsed);
  } catch {
    return null;
  }
}

import type { CardStoreStorage } from '../game/fsrs-scheduler';
import { gameStorage } from './preferencesStorage';

/**
 * Storage adapter for the FSRS card store. Lives in the repo layer so the rest of
 * the codebase doesn't reach into `localStorage` directly. Backed by the
 * Preferences cache on native, `localStorage` on web (see {@link gameStorage}).
 */
const noopStorage: CardStoreStorage = {
  getItem: () => null,
  setItem: () => {},
};

export function getCardStorage(): CardStoreStorage {
  const storage = gameStorage();
  if (!storage) return noopStorage;
  return {
    getItem: (k) => {
      try {
        return storage.getItem(k);
      } catch {
        return null;
      }
    },
    setItem: (k, v) => {
      try {
        storage.setItem(k, v);
      } catch {
        // quota / unavailable — drop
      }
    },
  };
}

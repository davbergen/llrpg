import type { CardStoreStorage } from '../game/fsrs-scheduler';

/**
 * Storage adapter for the FSRS card store. Lives in the repo layer so the rest of
 * the codebase doesn't reach into `localStorage` directly.
 */
const noopStorage: CardStoreStorage = {
  getItem: () => null,
  setItem: () => {},
};

export function getCardStorage(): CardStoreStorage {
  try {
    if (typeof localStorage === 'undefined') return noopStorage;
    return {
      getItem: (k) => localStorage.getItem(k),
      setItem: (k, v) => {
        try {
          localStorage.setItem(k, v);
        } catch {
          // quota / unavailable — drop
        }
      },
    };
  } catch {
    return noopStorage;
  }
}

import { Preferences } from '@capacitor/preferences';
import { isNative } from '../platform';
import type { StorageLike } from './localAdapter';

/**
 * Native durable storage backed by Capacitor Preferences.
 *
 * The rest of the app reads/writes through the synchronous `StorageLike`
 * interface (`localStorage` semantics), but the Preferences plugin is
 * async-only. We bridge the two with an in-memory cache: `hydrate()` loads every
 * key once at boot (before first render), reads then serve from the cache
 * synchronously, and writes update the cache immediately while persisting to
 * Preferences in the background. This is what makes `loadLocalSync` and the
 * FSRS card store keep working unchanged on native.
 *
 * Supabase sessions use {@link preferencesSessionStorage} instead — Supabase's
 * storage API is async-friendly, so it reads Preferences directly and doesn't
 * depend on the cache being hydrated first.
 */

/** The subset of the Capacitor Preferences plugin this module needs. Injectable for tests. */
export interface KeyValueBackend {
  keys(): Promise<{ keys: string[] }>;
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  remove(options: { key: string }): Promise<void>;
}

export class PreferencesStorage implements StorageLike {
  private readonly cache = new Map<string, string>();
  private hydrated = false;
  /** Serialises background writes so `flush()` can await durability. */
  private pending: Promise<void> = Promise.resolve();

  constructor(private readonly backend: KeyValueBackend = Preferences) {}

  /** Load every persisted key into the in-memory cache. Call once before first render. */
  async hydrate(): Promise<void> {
    if (this.hydrated) return;
    const { keys } = await this.backend.keys();
    await Promise.all(
      keys.map(async (key) => {
        const { value } = await this.backend.get({ key });
        if (value !== null) this.cache.set(key, value);
      }),
    );
    this.hydrated = true;
  }

  getItem(key: string): string | null {
    return this.cache.has(key) ? (this.cache.get(key) as string) : null;
  }

  setItem(key: string, value: string): void {
    this.cache.set(key, value);
    this.enqueue(() => this.backend.set({ key, value }));
  }

  removeItem(key: string): void {
    this.cache.delete(key);
    this.enqueue(() => this.backend.remove({ key }));
  }

  /** Resolve once all background writes issued so far have been persisted. */
  flush(): Promise<void> {
    return this.pending;
  }

  private enqueue(op: () => Promise<void>): void {
    this.pending = this.pending.then(op).catch(() => {
      // Best-effort: a failed write must not wedge the queue for later writes.
    });
  }
}

/** Process-wide native storage singleton. Inert (never hydrated) on web. */
export const preferencesStorage = new PreferencesStorage();

/**
 * Async storage adapter for Supabase's auth session on native. Reads/writes
 * Preferences directly so the session survives Android storage reclamation,
 * independent of {@link preferencesStorage}'s cache-hydration timing.
 */
export const preferencesSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value;
  },
  async setItem(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  },
  async removeItem(key: string): Promise<void> {
    await Preferences.remove({ key });
  },
};

/** Sync storage for game/guest/card data: Preferences cache on native, `localStorage` on web. */
export function gameStorage(): StorageLike | null {
  if (isNative()) return preferencesStorage;
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

const MIGRATION_FLAG = 'llrpg:prefs:migrated:v1';

/**
 * One-time copy of pre-Preferences data into Preferences on first native launch.
 *
 * Slices 1–2 ran the WebView on `localStorage`; this lifts that data (game save,
 * guest id, FSRS cards, and any Supabase session) into Preferences exactly once.
 * Each key is copied only when Preferences doesn't already have it, so a real
 * Preferences value never gets clobbered. Guarded by a flag so it runs once.
 *
 * `prefs` must already be hydrated. Returns once the migrated writes are durable.
 */
export async function runOneTimeMigration(
  prefs: PreferencesStorage,
  source: Pick<Storage, 'length' | 'key' | 'getItem'> | null = safeLocalStorage(),
): Promise<void> {
  if (prefs.getItem(MIGRATION_FLAG) !== null) return;
  if (source) {
    for (let i = 0; i < source.length; i++) {
      const key = source.key(i);
      if (!key || key === MIGRATION_FLAG) continue;
      if (prefs.getItem(key) !== null) continue; // Preferences already owns this key
      const value = source.getItem(key);
      if (value !== null) prefs.setItem(key, value);
    }
  }
  prefs.setItem(MIGRATION_FLAG, '1');
  await prefs.flush();
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

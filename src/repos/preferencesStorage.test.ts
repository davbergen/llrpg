import { describe, expect, it } from 'vitest';
import { PreferencesStorage, runOneTimeMigration, type KeyValueBackend } from './preferencesStorage';

/** In-memory stand-in for the Capacitor Preferences plugin. */
function fakeBackend(seed: Record<string, string> = {}): KeyValueBackend & { _store: Map<string, string> } {
  const store = new Map<string, string>(Object.entries(seed));
  return {
    _store: store,
    keys: async () => ({ keys: [...store.keys()] }),
    get: async ({ key }) => ({ value: store.has(key) ? (store.get(key) as string) : null }),
    set: async ({ key, value }) => {
      store.set(key, value);
    },
    remove: async ({ key }) => {
      store.delete(key);
    },
  };
}

/** Minimal synchronous localStorage stand-in for migration tests. */
function fakeLocalStorage(seed: Record<string, string> = {}) {
  const entries = Object.entries(seed);
  return {
    get length() {
      return entries.length;
    },
    key: (i: number) => entries[i]?.[0] ?? null,
    getItem: (k: string) => entries.find(([key]) => key === k)?.[1] ?? null,
  };
}

describe('PreferencesStorage', () => {
  it('hydrates the cache from the backend so reads are synchronous', async () => {
    const store = new PreferencesStorage(fakeBackend({ 'llrpg:save:v2': '{"hero":null}' }));
    await store.hydrate();
    expect(store.getItem('llrpg:save:v2')).toBe('{"hero":null}');
  });

  it('returns null for unknown keys', async () => {
    const store = new PreferencesStorage(fakeBackend());
    await store.hydrate();
    expect(store.getItem('missing')).toBeNull();
  });

  it('writes are readable synchronously and persist to the backend', async () => {
    const backend = fakeBackend();
    const store = new PreferencesStorage(backend);
    await store.hydrate();

    store.setItem('k', 'v');
    expect(store.getItem('k')).toBe('v'); // cache updated immediately
    await store.flush();
    expect(backend._store.get('k')).toBe('v'); // and durably persisted
  });

  it('removeItem clears cache and backend', async () => {
    const backend = fakeBackend({ k: 'v' });
    const store = new PreferencesStorage(backend);
    await store.hydrate();

    store.removeItem('k');
    expect(store.getItem('k')).toBeNull();
    await store.flush();
    expect(backend._store.has('k')).toBe(false);
  });

  it('hydrate is idempotent', async () => {
    const backend = fakeBackend({ k: 'v' });
    const store = new PreferencesStorage(backend);
    await store.hydrate();
    backend._store.set('k', 'changed-out-of-band');
    await store.hydrate(); // no-op: does not re-read
    expect(store.getItem('k')).toBe('v');
  });
});

describe('runOneTimeMigration', () => {
  it('copies localStorage data into an empty Preferences store, then flags done', async () => {
    const backend = fakeBackend();
    const prefs = new PreferencesStorage(backend);
    await prefs.hydrate();

    await runOneTimeMigration(prefs, fakeLocalStorage({ 'llrpg:guestId': 'guest-abc', 'sb-x-auth': 'tok' }));

    expect(prefs.getItem('llrpg:guestId')).toBe('guest-abc');
    expect(prefs.getItem('sb-x-auth')).toBe('tok');
    expect(backend._store.get('llrpg:guestId')).toBe('guest-abc');
    expect(prefs.getItem('llrpg:prefs:migrated:v1')).toBe('1');
  });

  it('never clobbers a key Preferences already owns', async () => {
    const backend = fakeBackend({ 'llrpg:guestId': 'guest-native' });
    const prefs = new PreferencesStorage(backend);
    await prefs.hydrate();

    await runOneTimeMigration(prefs, fakeLocalStorage({ 'llrpg:guestId': 'guest-web' }));

    expect(prefs.getItem('llrpg:guestId')).toBe('guest-native');
  });

  it('is a no-op once the migration flag is set', async () => {
    const backend = fakeBackend({ 'llrpg:prefs:migrated:v1': '1' });
    const prefs = new PreferencesStorage(backend);
    await prefs.hydrate();

    await runOneTimeMigration(prefs, fakeLocalStorage({ 'llrpg:guestId': 'guest-web' }));

    expect(prefs.getItem('llrpg:guestId')).toBeNull();
  });

  it('handles a missing localStorage source gracefully', async () => {
    const prefs = new PreferencesStorage(fakeBackend());
    await prefs.hydrate();
    await runOneTimeMigration(prefs, null);
    expect(prefs.getItem('llrpg:prefs:migrated:v1')).toBe('1');
  });
});

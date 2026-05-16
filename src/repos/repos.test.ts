import { describe, expect, it, vi } from 'vitest';
import { LocalAdapter, SAVE_KEY, loadLocalSync } from './localAdapter';
import { WriteThroughRepo } from './writeThrough';
import type { Repo, PersistedState } from './types';
import { EMPTY_EQUIPMENT, INITIAL_STATE } from '../constants';

function makeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    _map: map,
  };
}

const sampleState: PersistedState = {
  hero: { name: 'Aiko', classType: 'mage', equipment: EMPTY_EQUIPMENT },
  gameState: INITIAL_STATE,
  placementDone: false,
  telemetryConsent: null,
};

class FakeRemote implements Repo {
  public store: PersistedState | null = null;
  public failNext = false;
  public failTimes = 0;
  async load(): Promise<PersistedState | null> {
    return this.store;
  }
  async save(state: PersistedState): Promise<void> {
    if (this.failNext || this.failTimes > 0) {
      if (this.failTimes > 0) this.failTimes--;
      this.failNext = false;
      throw new Error('remote unavailable');
    }
    this.store = state;
  }
  async wipe(): Promise<void> {
    this.store = null;
  }
}

describe('LocalAdapter', () => {
  it('round-trips state through save + load', async () => {
    const storage = makeStorage();
    const repo = new LocalAdapter(SAVE_KEY, storage);
    await repo.save(sampleState);
    expect(await repo.load()).toEqual(sampleState);
  });

  it('returns null when nothing is stored', async () => {
    const repo = new LocalAdapter(SAVE_KEY, makeStorage());
    expect(await repo.load()).toBeNull();
  });

  it('returns null on parse failure', async () => {
    const storage = makeStorage();
    storage.setItem(SAVE_KEY, '{not json');
    const repo = new LocalAdapter(SAVE_KEY, storage);
    expect(await repo.load()).toBeNull();
  });

  it('wipe clears the key', async () => {
    const storage = makeStorage();
    const repo = new LocalAdapter(SAVE_KEY, storage);
    await repo.save(sampleState);
    await repo.wipe();
    expect(await repo.load()).toBeNull();
  });

  it('round-trips telemetryConsent (true / false / null)', async () => {
    const storage = makeStorage();
    const repo = new LocalAdapter(SAVE_KEY, storage);

    await repo.save({ ...sampleState, telemetryConsent: true });
    expect((await repo.load())?.telemetryConsent).toBe(true);

    await repo.save({ ...sampleState, telemetryConsent: false });
    expect((await repo.load())?.telemetryConsent).toBe(false);

    await repo.save({ ...sampleState, telemetryConsent: null });
    expect((await repo.load())?.telemetryConsent).toBeNull();
  });

  it('backfills telemetryConsent to null for pre-slice-23 saves', async () => {
    const storage = makeStorage();
    // Simulate an older save written before the field existed.
    storage.setItem(
      SAVE_KEY,
      JSON.stringify({ hero: sampleState.hero, gameState: sampleState.gameState }),
    );
    const repo = new LocalAdapter(SAVE_KEY, storage);
    const loaded = await repo.load();
    expect(loaded?.telemetryConsent).toBeNull();
  });

  it('loadLocalSync reads the same payload synchronously', async () => {
    const storage = makeStorage();
    const repo = new LocalAdapter(SAVE_KEY, storage);
    await repo.save(sampleState);
    expect(loadLocalSync(storage, SAVE_KEY)).toEqual(sampleState);
  });
});

describe('WriteThroughRepo', () => {
  it('writes to local first, then to remote', async () => {
    const storage = makeStorage();
    const local = new LocalAdapter(SAVE_KEY, storage);
    const remote = new FakeRemote();
    const repo = new WriteThroughRepo(local, remote);

    await repo.save(sampleState);
    expect(await local.load()).toEqual(sampleState);
    expect(remote.store).toEqual(sampleState);
    expect(repo.hasPendingWrite()).toBe(false);
  });

  it('queues the write when remote fails, then flushes on retry', async () => {
    const storage = makeStorage();
    const local = new LocalAdapter(SAVE_KEY, storage);
    const remote = new FakeRemote();
    const onErr = vi.fn();
    const repo = new WriteThroughRepo(local, remote, onErr);

    remote.failNext = true;
    await repo.save(sampleState);
    expect(await local.load()).toEqual(sampleState);
    expect(remote.store).toBeNull();
    expect(repo.hasPendingWrite()).toBe(true);
    expect(onErr).toHaveBeenCalledTimes(1);

    await repo.flush();
    expect(remote.store).toEqual(sampleState);
    expect(repo.hasPendingWrite()).toBe(false);
  });

  it('hydrateFromRemote prefers server state and writes it to local (server-wins)', async () => {
    const storage = makeStorage();
    const local = new LocalAdapter(SAVE_KEY, storage);
    const remote = new FakeRemote();
    remote.store = { ...sampleState, gameState: { ...sampleState.gameState, gold: 999 } };
    const repo = new WriteThroughRepo(local, remote);

    const result = await repo.hydrateFromRemote();
    expect(result?.gameState.gold).toBe(999);
    expect((await local.load())?.gameState.gold).toBe(999);
  });

  it('pushLocalToRemote uploads the local cache (first sign-in migration)', async () => {
    const storage = makeStorage();
    const local = new LocalAdapter(SAVE_KEY, storage);
    await local.save(sampleState);
    const remote = new FakeRemote();
    const repo = new WriteThroughRepo(local, remote);

    await repo.pushLocalToRemote();
    expect(remote.store).toEqual(sampleState);
  });

  it('offline fallback: load returns local even when remote is unreachable', async () => {
    const storage = makeStorage();
    const local = new LocalAdapter(SAVE_KEY, storage);
    await local.save(sampleState);
    const remote: Repo = {
      load: async () => {
        throw new Error('offline');
      },
      save: async () => {
        throw new Error('offline');
      },
      wipe: async () => {},
    };
    const repo = new WriteThroughRepo(local, remote);
    expect(await repo.load()).toEqual(sampleState);
  });
});

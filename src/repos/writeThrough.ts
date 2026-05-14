import type { Repo, PersistedState } from './types';

/**
 * Combines a local cache with a remote repo. Reads prefer local; writes go to
 * local first (synchronously durable) then to remote. If the remote write fails
 * (offline / transient), the latest state is held in `pending` and re-flushed
 * on the next successful write. Server-wins is handled at hydration time by
 * `hydrateFromRemote`, not here.
 */
export class WriteThroughRepo implements Repo {
  private pending: PersistedState | null = null;
  private flushing = false;

  constructor(
    private readonly local: Repo,
    private readonly remote: Repo,
    private readonly onRemoteError: (e: unknown) => void = () => {},
  ) {}

  async load(): Promise<PersistedState | null> {
    return this.local.load();
  }

  async save(state: PersistedState): Promise<void> {
    await this.local.save(state);
    this.pending = state;
    await this.flush();
  }

  async wipe(): Promise<void> {
    this.pending = null;
    await this.local.wipe();
    try {
      await this.remote.wipe();
    } catch (e) {
      this.onRemoteError(e);
    }
  }

  /** Push the local cache up to remote. Used on sign-in to migrate guest state. */
  async pushLocalToRemote(): Promise<void> {
    const local = await this.local.load();
    if (!local) return;
    await this.remote.save(local);
  }

  /** Pull remote into local (server-wins). Used on sign-in after migration check. */
  async hydrateFromRemote(): Promise<PersistedState | null> {
    const remote = await this.remote.load();
    if (remote) {
      await this.local.save(remote);
      return remote;
    }
    return null;
  }

  /** Retry a queued remote write (e.g. after a reconnect). */
  async flush(): Promise<void> {
    if (!this.pending || this.flushing) return;
    this.flushing = true;
    const snapshot = this.pending;
    try {
      await this.remote.save(snapshot);
      // Only clear pending if it hasn't been overwritten while we were awaiting.
      if (this.pending === snapshot) this.pending = null;
    } catch (e) {
      this.onRemoteError(e);
    } finally {
      this.flushing = false;
    }
  }

  hasPendingWrite(): boolean {
    return this.pending !== null;
  }
}

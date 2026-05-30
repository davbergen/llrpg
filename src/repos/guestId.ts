import { gameStorage } from './preferencesStorage';

const GUEST_KEY = 'llrpg:guestId';

/** Stable per-device id used when a player is not signed in. */
export function getOrCreateGuestId(): string {
  const storage = gameStorage();
  if (!storage) return 'guest';
  try {
    const existing = storage.getItem(GUEST_KEY);
    if (existing) return existing;
    const id = `guest-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
    storage.setItem(GUEST_KEY, id);
    return id;
  } catch {
    return 'guest';
  }
}

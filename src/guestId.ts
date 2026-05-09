const GUEST_KEY = 'llrpg:guestId';

/** Stable per-device id used when a player is not signed in. */
export function getOrCreateGuestId(): string {
  try {
    if (typeof localStorage === 'undefined') return 'guest';
    const existing = localStorage.getItem(GUEST_KEY);
    if (existing) return existing;
    const id = `guest-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
    localStorage.setItem(GUEST_KEY, id);
    return id;
  } catch {
    return 'guest';
  }
}

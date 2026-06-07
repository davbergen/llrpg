/**
 * Native integration for FSRS review reminders.
 *
 * The "which cards, when" math lives in the pure {@link buildNotificationSchedule}
 * module; this file is the thin, device-only glue around it: gather the due
 * cards from the store, ask the OS for permission lazily, and hand the computed
 * payloads to `@capacitor/local-notifications`. Everything here is gated by
 * {@link isNative} and is a no-op on the web build, where the pure module is
 * still importable but the plugin is never loaded.
 */
import { isNative } from '../platform';
import type { CardStore } from '../game/fsrs-scheduler';
import { gameStorage } from '../repos/preferencesStorage';
import { buildNotificationSchedule, type DueCard } from './fsrsScheduler';

/** Set once we've asked for notification permission, so we only ever ask once. */
const PERMISSION_REQUESTED_KEY = 'llrpg:notif:permission-requested:v1';

/**
 * Cards eligible for a reminder: only those the user has actually reviewed at
 * least once (`lastReview != null`). Brand-new cards are due "now" by FSRS
 * convention but aren't review reminders — surfacing them would spam a fresh
 * user with a giant "N cards due" notification on day one.
 */
function gatherDueCards(store: CardStore): DueCard[] {
  return store
    .entries()
    .filter(([, state]) => state.lastReview != null)
    .map(([cardId, state]) => ({ cardId, dueAt: state.nextDue }));
}

/**
 * Request notification permission once, lazily.
 *
 * Called after the user completes their first review session — not on first
 * launch — so the prompt lands after they've seen value. The persisted flag
 * guarantees we never prompt twice, even if they decline.
 */
export async function maybeRequestNotificationPermission(): Promise<void> {
  if (!isNative()) return;
  const storage = gameStorage();
  if (storage?.getItem(PERMISSION_REQUESTED_KEY)) return;
  storage?.setItem(PERMISSION_REQUESTED_KEY, '1');
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.requestPermissions();
  } catch (e) {
    console.error('Notification permission request failed:', e);
  }
}

/**
 * Recompute and re-arm the next horizon of FSRS reminders.
 *
 * Cancels the previously scheduled batch and schedules a fresh one from the
 * current card store. Silently no-ops if permission was never granted (Android
 * 13+ denial path) so it can be called unconditionally on app background.
 */
export async function scheduleFsrsReminders(
  store: CardStore,
  now: number = Date.now(),
): Promise<void> {
  if (!isNative()) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') return;

    // Clear the previous batch so counts/titles never go stale or duplicate.
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      });
    }

    const payloads = buildNotificationSchedule(gatherDueCards(store), { now });
    if (payloads.length === 0) return;

    await LocalNotifications.schedule({
      notifications: payloads.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        schedule: { at: new Date(p.fireAt) },
      })),
    });
  } catch (e) {
    console.error('Scheduling FSRS reminders failed:', e);
  }
}

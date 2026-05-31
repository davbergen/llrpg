/**
 * Pure FSRS reminder scheduler.
 *
 * Turns the list of cards the user has in flight into an ordered set of local
 * notification payloads: one "now" reminder for anything already past due, plus
 * one batched reminder per upcoming day within the horizon. No Capacitor, no
 * device, no clock of its own — everything (the current time, the per-OS cap,
 * the horizon, the reminder hour) is passed in, so the "which cards, when, how
 * to batch" logic is unit-testable in isolation. The integration layer
 * (`src/notifications/index.ts`) feeds it the card store and hands the result
 * to `LocalNotifications.schedule`.
 */

export interface DueCard {
  /** Stable identifier for the card (the FSRS card key). */
  cardId: string;
  /** When the card becomes due, epoch milliseconds. */
  dueAt: number;
}

export interface NotificationPayload {
  /** Stable, contiguous id so a re-schedule can cancel the previous batch. */
  id: number;
  title: string;
  body: string;
  /** When to fire the notification, epoch milliseconds. */
  fireAt: number;
  /** How many distinct cards this reminder covers. */
  cardCount: number;
}

export interface ScheduleOptions {
  /** Current time, epoch ms. */
  now: number;
  /** Per-OS cap on simultaneously scheduled notifications. iOS caps at 64. */
  maxNotifications?: number;
  /** Only cards due within this many days from `now` get a reminder. */
  horizonDays?: number;
  /** Local hour-of-day (0–23) at which a day's batch fires. */
  reminderHour?: number;
}

/** First id in the contiguous range this module assigns. */
export const NOTIFICATION_ID_BASE = 4200;

const DAY_MS = 86_400_000;
const DEFAULT_MAX = 64;
const DEFAULT_HORIZON_DAYS = 7;
const DEFAULT_REMINDER_HOUR = 9;

/** Reminder time for a card due at `dueAt`: `reminderHour` on that local calendar day. */
function reminderTimeFor(dueAt: number, reminderHour: number): number {
  const d = new Date(dueAt);
  d.setHours(reminderHour, 0, 0, 0);
  return d.getTime();
}

function titleFor(count: number, fireAt: number, now: number): string {
  const noun = count === 1 ? 'card' : 'cards';
  const when = fireAt <= now ? ' now' : '';
  return `${count} ${noun} due${when}`;
}

/**
 * Build the ordered notification schedule for a set of due cards.
 *
 * - Cards are deduped by `cardId` (the earliest `dueAt` wins).
 * - Cards due after `now + horizonDays` are dropped — too far out to remind about.
 * - Anything already past due, or whose reminder hour today has already passed,
 *   collapses into a single "now" reminder fired at `now`.
 * - Every other card is bucketed by the calendar day of its reminder time, one
 *   reminder per day.
 * - Buckets are ordered by fire time and clamped to `maxNotifications`, keeping
 *   the most imminent.
 */
export function buildNotificationSchedule(
  cards: DueCard[],
  options: ScheduleOptions,
): NotificationPayload[] {
  const {
    now,
    maxNotifications = DEFAULT_MAX,
    horizonDays = DEFAULT_HORIZON_DAYS,
    reminderHour = DEFAULT_REMINDER_HOUR,
  } = options;

  // Dedupe by cardId, keeping the earliest due time (the most urgent occurrence).
  const earliest = new Map<string, number>();
  for (const { cardId, dueAt } of cards) {
    const prev = earliest.get(cardId);
    if (prev === undefined || dueAt < prev) earliest.set(cardId, dueAt);
  }

  const horizonEnd = now + horizonDays * DAY_MS;

  // Group cards by fire time. Past-due (and today-after-reminder-hour) cards all
  // share fireAt === now, so they naturally collapse into one bucket.
  const buckets = new Map<number, number>(); // fireAt -> card count
  for (const dueAt of earliest.values()) {
    if (dueAt > horizonEnd) continue;
    const reminderAt = reminderTimeFor(dueAt, reminderHour);
    const fireAt = dueAt <= now || reminderAt <= now ? now : reminderAt;
    buckets.set(fireAt, (buckets.get(fireAt) ?? 0) + 1);
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .slice(0, Math.max(0, maxNotifications))
    .map(([fireAt, cardCount], i) => ({
      id: NOTIFICATION_ID_BASE + i,
      title: titleFor(cardCount, fireAt, now),
      body: 'Open LinguaQuest to keep your streak alive.',
      fireAt,
      cardCount,
    }));
}

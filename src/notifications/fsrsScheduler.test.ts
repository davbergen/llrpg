import { describe, expect, it } from 'vitest';
import {
  buildNotificationSchedule,
  NOTIFICATION_ID_BASE,
  type DueCard,
} from './fsrsScheduler';

// Build times via the local Date constructor so expectations match the
// scheduler's local-time `reminderHour` logic regardless of the machine's TZ.
const NOON = new Date(2026, 5, 1, 12, 0, 0, 0).getTime(); // 2026-06-01 12:00 local
const DAY = 86_400_000;
const at = (y: number, mo: number, d: number, h: number) => new Date(y, mo, d, h, 0, 0, 0).getTime();

describe('buildNotificationSchedule', () => {
  it('returns nothing for no cards', () => {
    expect(buildNotificationSchedule([], { now: NOON })).toEqual([]);
  });

  it('schedules a single future card at the reminder hour of its due day', () => {
    const cards: DueCard[] = [{ cardId: 'a', dueAt: at(2026, 5, 4, 15) }]; // due 3 days out, 3pm
    const [payload] = buildNotificationSchedule(cards, { now: NOON, reminderHour: 9 });
    expect(payload).toMatchObject({
      id: NOTIFICATION_ID_BASE,
      cardCount: 1,
      title: 'Your training awaits',
      fireAt: at(2026, 5, 4, 9), // 9am on the due day, not the 3pm due time
    });
    expect(payload.body).toContain('LinguaQuest');
    expect(payload.body).toContain('1 review');
    // The internal "card" term must never leak into player-facing copy.
    expect(payload.title.toLowerCase()).not.toContain('card');
    expect(payload.body.toLowerCase()).not.toContain('card');
  });

  it('dedupes repeated cardIds, keeping the earliest due time', () => {
    const cards: DueCard[] = [
      { cardId: 'a', dueAt: at(2026, 5, 4, 10) },
      { cardId: 'a', dueAt: at(2026, 5, 6, 10) }, // later occurrence ignored
    ];
    const result = buildNotificationSchedule(cards, { now: NOON });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ cardCount: 1, fireAt: at(2026, 5, 4, 9) });
  });

  it('batches cards by day and orders reminders soonest-first', () => {
    const cards: DueCard[] = [
      { cardId: 'a', dueAt: at(2026, 5, 3, 8) },
      { cardId: 'b', dueAt: at(2026, 5, 3, 20) }, // same day as a
      { cardId: 'c', dueAt: at(2026, 5, 2, 11) }, // earlier day
    ];
    const result = buildNotificationSchedule(cards, { now: NOON, reminderHour: 9 });
    expect(result.map((p) => [p.fireAt, p.cardCount, p.title])).toEqual([
      [at(2026, 5, 2, 9), 1, 'Your training awaits'],
      [at(2026, 5, 3, 9), 2, 'Your training awaits'],
    ]);
    expect(result.map((p) => p.body)).toEqual([
      '1 review ready — open LinguaQuest to keep your streak alive.',
      '2 reviews ready — open LinguaQuest to keep your streak alive.',
    ]);
    expect(result.map((p) => p.id)).toEqual([NOTIFICATION_ID_BASE, NOTIFICATION_ID_BASE + 1]);
  });

  it('clamps to the per-OS cap, keeping the most imminent reminders', () => {
    const cards: DueCard[] = Array.from({ length: 5 }, (_, i) => ({
      cardId: `c${i}`,
      dueAt: at(2026, 5, 2 + i, 10),
    }));
    const result = buildNotificationSchedule(cards, { now: NOON, maxNotifications: 2 });
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.fireAt)).toEqual([at(2026, 5, 2, 9), at(2026, 5, 3, 9)]);
  });

  it('collapses past-due cards (and today after the reminder hour) into one "now" reminder', () => {
    const cards: DueCard[] = [
      { cardId: 'overdue', dueAt: NOON - DAY }, // genuinely past due
      { cardId: 'earlier-today', dueAt: at(2026, 5, 1, 6) }, // due 6am, also past
      { cardId: 'later-today', dueAt: at(2026, 5, 1, 18) }, // due 6pm but reminder hour (9am) passed
    ];
    const result = buildNotificationSchedule(cards, { now: NOON, reminderHour: 9 });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      fireAt: NOON,
      cardCount: 3,
      title: 'Your training awaits',
    });
    expect(result[0].body).toBe(
      '3 reviews ready now — open LinguaQuest to keep your streak alive.',
    );
  });

  it('drops cards due beyond the horizon', () => {
    const cards: DueCard[] = [
      { cardId: 'soon', dueAt: at(2026, 5, 3, 10) },
      { cardId: 'far', dueAt: NOON + 30 * DAY },
    ];
    const result = buildNotificationSchedule(cards, { now: NOON, horizonDays: 7 });
    expect(result).toHaveLength(1);
    expect(result[0].cardCount).toBe(1);
  });
});

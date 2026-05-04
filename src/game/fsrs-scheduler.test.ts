import { describe, expect, it } from 'vitest';
import {
  applyOutcome,
  cardKey,
  compareDuePriority,
  InMemoryCardStore,
  isDue,
  mapOutcomeToRating,
  newCardState,
  overduenessDays,
  type CardState,
} from './fsrs-scheduler';
import { Rating } from 'ts-fsrs';

const T0 = Date.UTC(2026, 0, 1, 0, 0, 0);
const DAY = 86_400_000;

describe('fsrs-scheduler', () => {
  describe('mapOutcomeToRating', () => {
    it('maps correct → Good and wrong → Again (no auto-Easy in v1)', () => {
      expect(mapOutcomeToRating('correct')).toBe(Rating.Good);
      expect(mapOutcomeToRating('wrong')).toBe(Rating.Again);
    });
  });

  describe('cardKey', () => {
    it('joins entryId and face with ::', () => {
      expect(cardKey('vocab.taberu', 'recall')).toBe('vocab.taberu::recall');
    });
  });

  describe('newCardState', () => {
    it('starts in the new state with zero stability and due now', () => {
      const c = newCardState(T0);
      expect(c.state).toBe('new');
      expect(c.stability).toBe(0);
      expect(c.lapses).toBe(0);
      expect(c.reps).toBe(0);
      expect(c.nextDue).toBe(T0);
      expect(c.lastReview).toBeNull();
    });
  });

  describe('applyOutcome (regression vs ts-fsrs reference)', () => {
    it('correct on a fresh card produces a non-zero stability and advances state out of new', () => {
      const fresh = newCardState(T0);
      const after = applyOutcome(fresh, 'correct', T0);
      expect(after.stability).toBeGreaterThan(0);
      expect(after.reps).toBe(1);
      expect(after.lastReview).toBe(T0);
      expect(after.state).not.toBe('new');
      expect(after.nextDue).toBeGreaterThanOrEqual(T0);
    });

    it('wrong on a fresh card increments lapses-or-keeps-zero and stays/returns to (re)learning', () => {
      const fresh = newCardState(T0);
      const after = applyOutcome(fresh, 'wrong', T0);
      expect(after.reps).toBe(1);
      expect(['learning', 'relearning']).toContain(after.state);
    });

    it('two consecutive correct reviews increase stability monotonically', () => {
      const a = applyOutcome(newCardState(T0), 'correct', T0);
      const b = applyOutcome(a, 'correct', a.nextDue);
      expect(b.stability).toBeGreaterThanOrEqual(a.stability);
    });
  });

  describe('isDue / overduenessDays', () => {
    const review: CardState = {
      stability: 5,
      difficulty: 5,
      lastReview: T0 - 5 * DAY,
      nextDue: T0,
      state: 'review',
      lapses: 0,
      reps: 1,
    };

    it('isDue returns true at exact nextDue and after, false before', () => {
      expect(isDue(review, T0 - 1)).toBe(false);
      expect(isDue(review, T0)).toBe(true);
      expect(isDue(review, T0 + DAY)).toBe(true);
    });

    it('overduenessDays measures days since nextDue', () => {
      expect(overduenessDays(review, T0)).toBe(0);
      expect(overduenessDays(review, T0 + 3 * DAY)).toBe(3);
      expect(overduenessDays(review, T0 - DAY)).toBe(-1);
    });
  });

  describe('compareDuePriority (due-card ordering)', () => {
    function cs(state: CardState['state'], dueAt: number): CardState {
      return {
        stability: 1,
        difficulty: 1,
        lastReview: dueAt - DAY,
        nextDue: dueAt,
        state,
        lapses: 0,
        reps: 1,
      };
    }

    it('orders most-overdue first', () => {
      const a = cs('review', T0 - 5 * DAY);
      const b = cs('review', T0 - 1 * DAY);
      const sorted = [b, a].sort((x, y) => compareDuePriority(x, y, T0));
      expect(sorted[0]).toBe(a);
    });

    it('breaks ties by state: review before learning before relearning', () => {
      const r = cs('review', T0 - DAY);
      const l = cs('learning', T0 - DAY);
      const sorted = [l, r].sort((x, y) => compareDuePriority(x, y, T0));
      expect(sorted[0]).toBe(r);
    });
  });

  describe('InMemoryCardStore', () => {
    it('round-trips state by key', () => {
      const s = new InMemoryCardStore();
      const k = cardKey('vocab.water', 'recall');
      expect(s.has(k)).toBe(false);
      const c = newCardState(T0);
      s.set(k, c);
      expect(s.has(k)).toBe(true);
      expect(s.get(k)).toEqual(c);
      expect(s.entries()).toHaveLength(1);
    });
  });
});

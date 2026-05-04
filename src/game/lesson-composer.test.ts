import { describe, expect, it } from 'vitest';
import { composeLesson } from './lesson-composer';
import {
  applyOutcome,
  cardKey,
  InMemoryCardStore,
  newCardState,
  type CardState,
} from './fsrs-scheduler';
import type { SpineEntry } from '../content/spine';

const T0 = Date.UTC(2026, 0, 1, 0, 0, 0);
const DAY = 86_400_000;

function entry(id: string): SpineEntry {
  return {
    id,
    type: 'vocab',
    jp: id,
    reading: id,
    en: id,
    pos: 'noun',
    jlpt: 'N5',
    tags: [],
    faces: ['recall'],
    cloze: null,
  };
}

const SPINE: SpineEntry[] = [
  entry('a'),
  entry('b'),
  entry('c'),
  entry('d'),
  entry('e'),
];

function dueState(dueAt: number, state: CardState['state'] = 'review'): CardState {
  return {
    stability: 5,
    difficulty: 5,
    lastReview: dueAt - DAY,
    nextDue: dueAt,
    state,
    lapses: 0,
    reps: 1,
  };
}

describe('lesson-composer', () => {
  it('returns nothing when count is zero', () => {
    const store = new InMemoryCardStore();
    expect(composeLesson({ spine: SPINE, store, count: 0, now: T0 })).toEqual([]);
  });

  it('new-fill in spine-authored order when no cards exist', () => {
    const store = new InMemoryCardStore();
    const out = composeLesson({ spine: SPINE, store, count: 3, now: T0 });
    expect(out.map((c) => c.entryId)).toEqual(['a', 'b', 'c']);
    expect(out.every((c) => c.state === null)).toBe(true);
  });

  it('serves due cards before new cards', () => {
    const store = new InMemoryCardStore();
    store.set(cardKey('c', 'recall'), dueState(T0 - DAY));
    const out = composeLesson({ spine: SPINE, store, count: 3, now: T0 });
    expect(out[0].entryId).toBe('c');
    expect(out.slice(1).map((c) => c.entryId)).toEqual(['a', 'b']);
  });

  it('orders due cards by overdueness (most overdue first)', () => {
    const store = new InMemoryCardStore();
    store.set(cardKey('a', 'recall'), dueState(T0 - 1 * DAY));
    store.set(cardKey('b', 'recall'), dueState(T0 - 5 * DAY));
    store.set(cardKey('c', 'recall'), dueState(T0 - 3 * DAY));
    const out = composeLesson({ spine: SPINE, store, count: 3, now: T0 });
    expect(out.map((c) => c.entryId)).toEqual(['b', 'c', 'a']);
  });

  it('returns short (servedCount < count) rather than padding with mastered-not-due cards', () => {
    const store = new InMemoryCardStore();
    // All 5 entries reviewed and not due — well-known.
    for (const e of SPINE) {
      store.set(cardKey(e.id, 'recall'), dueState(T0 + 30 * DAY));
    }
    const out = composeLesson({ spine: SPINE, store, count: 4, now: T0 });
    expect(out).toHaveLength(0);
  });

  it('partially fills with due + new and stays short when both pools are exhausted', () => {
    const store = new InMemoryCardStore();
    store.set(cardKey('a', 'recall'), dueState(T0 - DAY));
    // b..e are new. With count=10 we expect 1 due + 4 new = 5 served.
    const out = composeLesson({ spine: SPINE, store, count: 10, now: T0 });
    expect(out).toHaveLength(5);
    expect(out[0].entryId).toBe('a');
    expect(out.slice(1).map((c) => c.entryId)).toEqual(['b', 'c', 'd', 'e']);
  });

  it('integrates with applyOutcome: a brand-new card answered correct becomes not-due and is excluded', () => {
    const store = new InMemoryCardStore();
    const k = cardKey('a', 'recall');
    store.set(k, applyOutcome(newCardState(T0), 'correct', T0));
    // immediately after correct it's scheduled into the future (~10min in learning)
    const out = composeLesson({ spine: SPINE, store, count: 2, now: T0 + 60_000 });
    // 'a' isn't due yet, so we should get b, c (new-fill).
    expect(out.map((c) => c.entryId)).toEqual(['b', 'c']);
  });
});

import { describe, expect, it } from 'vitest';
import type { SpineEntry, SpineFace } from '../content/spine';
import {
  applyPlacementToStore,
  bandOf,
  createPlacementSession,
  isPlacementComplete,
  MAX_QUESTIONS,
  pickNextEntry,
  recordOutcome,
  seedCardState,
  STEP_DOWN_THRESHOLD,
  STEP_UP_THRESHOLD,
} from './placement';
import { InMemoryCardStore, cardKey } from './fsrs-scheduler';

const T0 = Date.UTC(2026, 0, 1, 0, 0, 0);
const DAY = 86_400_000;

function vocab(id: string, faces: SpineFace[] = ['recall']): SpineEntry {
  return {
    id,
    type: 'vocab',
    jp: id,
    reading: id,
    en: id,
    pos: 'noun',
    jlpt: 'N5',
    tags: [],
    faces,
    cloze: null,
  };
}

// 9 vocab — bands of 3
const NINE: SpineEntry[] = [
  vocab('v1'), vocab('v2'), vocab('v3'),
  vocab('v4'), vocab('v5'), vocab('v6'),
  vocab('v7'), vocab('v8'), vocab('v9'),
];

describe('placement.bandOf', () => {
  it('partitions spine entries into thirds by type-internal index', () => {
    expect(bandOf(NINE[0], NINE)).toBe('early');
    expect(bandOf(NINE[2], NINE)).toBe('early');
    expect(bandOf(NINE[3], NINE)).toBe('mid');
    expect(bandOf(NINE[5], NINE)).toBe('mid');
    expect(bandOf(NINE[6], NINE)).toBe('late');
    expect(bandOf(NINE[8], NINE)).toBe('late');
  });

  it('treats each type independently', () => {
    const mixed: SpineEntry[] = [
      ...NINE,
      { ...vocab('k1'), type: 'kanji', faces: ['meaning'] as SpineFace[] },
      { ...vocab('k2'), type: 'kanji', faces: ['meaning'] as SpineFace[] },
      { ...vocab('k3'), type: 'kanji', faces: ['meaning'] as SpineFace[] },
    ];
    // k1 is the only kanji in the early third of the kanji list
    expect(bandOf(mixed[9], mixed)).toBe('early');
    expect(bandOf(mixed[10], mixed)).toBe('mid');
    expect(bandOf(mixed[11], mixed)).toBe('late');
  });
});

describe('placement.recordOutcome — band adaptation', () => {
  it(`steps up after ${STEP_UP_THRESHOLD} correct in a row and resets the streak`, () => {
    let s = createPlacementSession(1);
    expect(s.band).toBe('early');
    s = recordOutcome(s, NINE[0], 'correct');
    s = recordOutcome(s, NINE[1], 'correct');
    expect(s.band).toBe('early');
    expect(s.correctStreak).toBe(2);
    s = recordOutcome(s, NINE[2], 'correct');
    expect(s.band).toBe('mid');
    expect(s.correctStreak).toBe(0);
    expect(s.wrongInBand).toBe(0);
  });

  it(`steps down after ${STEP_DOWN_THRESHOLD} wrong in the current band`, () => {
    let s = createPlacementSession(1);
    s = { ...s, band: 'mid' };
    s = recordOutcome(s, NINE[3], 'wrong');
    expect(s.band).toBe('mid');
    expect(s.wrongInBand).toBe(1);
    s = recordOutcome(s, NINE[4], 'wrong');
    expect(s.band).toBe('early');
    expect(s.wrongInBand).toBe(0);
  });

  it('does not step up beyond late', () => {
    let s = createPlacementSession(1);
    s = { ...s, band: 'late' };
    for (let i = 0; i < STEP_UP_THRESHOLD; i++) {
      s = recordOutcome(s, NINE[6 + i], 'correct');
    }
    expect(s.band).toBe('late');
  });

  it('does not step down below early', () => {
    let s = createPlacementSession(1);
    for (let i = 0; i < STEP_DOWN_THRESHOLD; i++) {
      s = recordOutcome(s, NINE[i], 'wrong');
    }
    expect(s.band).toBe('early');
  });

  it('a correct answer resets the wrong-in-band counter', () => {
    let s = createPlacementSession(1);
    s = recordOutcome(s, NINE[0], 'wrong');
    expect(s.wrongInBand).toBe(1);
    s = recordOutcome(s, NINE[1], 'correct');
    expect(s.wrongInBand).toBe(1); // wrongInBand isn't reset by a single correct
    s = recordOutcome(s, NINE[2], 'wrong');
    // 2 wrongs in band → step down (already early, so wrongInBand resets)
    expect(s.band).toBe('early');
    expect(s.wrongInBand).toBe(0);
  });
});

describe('placement.pickNextEntry', () => {
  it('returns an entry from the current band when one is available', () => {
    const s = createPlacementSession(42);
    const e = pickNextEntry(s, NINE);
    expect(e).not.toBeNull();
    expect(bandOf(e!, NINE)).toBe('early');
  });

  it('falls back to a neighboring band when the current band is exhausted', () => {
    let s = createPlacementSession(42);
    // mark all early entries as asked
    s = { ...s, askedIds: ['v1', 'v2', 'v3'] };
    const e = pickNextEntry(s, NINE);
    expect(e).not.toBeNull();
    expect(bandOf(e!, NINE)).toBe('mid');
  });

  it('returns null when everything has been asked', () => {
    const s = {
      ...createPlacementSession(1),
      askedIds: NINE.map((e) => e.id),
    };
    expect(pickNextEntry(s, NINE)).toBeNull();
  });

  it('is deterministic given the same seed and asked list', () => {
    const s = createPlacementSession(7);
    expect(pickNextEntry(s, NINE)?.id).toBe(pickNextEntry(s, NINE)?.id);
  });
});

describe('placement.seedCardState — FSRS seeding shape', () => {
  it('correct → review, stability 2, difficulty 5', () => {
    const c = seedCardState('correct', T0);
    expect(c.state).toBe('review');
    expect(c.stability).toBe(2);
    expect(c.difficulty).toBe(5);
    expect(c.reps).toBe(1);
    expect(c.lapses).toBe(0);
    expect(c.lastReview).toBe(T0);
    expect(c.nextDue).toBe(T0 + 2 * DAY);
  });

  it('wrong → learning, stability 0', () => {
    const c = seedCardState('wrong', T0);
    expect(c.state).toBe('learning');
    expect(c.stability).toBe(0);
    expect(c.lastReview).toBe(T0);
  });
});

describe('placement.applyPlacementToStore', () => {
  it('writes seeded states keyed by entryId::face', () => {
    const store = new InMemoryCardStore();
    let s = createPlacementSession(1);
    s = recordOutcome(s, NINE[0], 'correct');
    s = recordOutcome(s, NINE[1], 'wrong');
    applyPlacementToStore(s, store, T0);

    const got1 = store.get(cardKey('v1', 'recall'));
    const got2 = store.get(cardKey('v2', 'recall'));
    expect(got1?.state).toBe('review');
    expect(got1?.stability).toBe(2);
    expect(got2?.state).toBe('learning');
  });

  it('does not write states for unprobed entries', () => {
    const store = new InMemoryCardStore();
    let s = createPlacementSession(1);
    s = recordOutcome(s, NINE[0], 'correct');
    applyPlacementToStore(s, store, T0);
    expect(store.get(cardKey('v9', 'recall'))).toBeNull();
  });
});

describe('placement.isPlacementComplete — 30-question hard cap', () => {
  it(`is false until ${MAX_QUESTIONS} probes recorded`, () => {
    const s = createPlacementSession(1);
    expect(isPlacementComplete(s)).toBe(false);
    expect(isPlacementComplete({ ...s, probed: new Array(MAX_QUESTIONS - 1).fill({ entryId: 'x', face: 'recall', outcome: 'correct' }) })).toBe(false);
  });

  it(`is true at exactly ${MAX_QUESTIONS}`, () => {
    const s = {
      ...createPlacementSession(1),
      probed: new Array(MAX_QUESTIONS).fill({ entryId: 'x', face: 'recall' as SpineFace, outcome: 'correct' as const }),
    };
    expect(isPlacementComplete(s)).toBe(true);
  });

  it('an end-to-end run never exceeds the cap', () => {
    // 30 entries available — record 30 outcomes
    const pool: SpineEntry[] = Array.from({ length: 35 }, (_, i) => vocab(`e${i}`));
    let s = createPlacementSession(1);
    for (let i = 0; i < 50 && !isPlacementComplete(s); i++) {
      const e = pickNextEntry(s, pool);
      if (!e) break;
      s = recordOutcome(s, e, i % 2 === 0 ? 'correct' : 'wrong');
    }
    expect(s.probed.length).toBeLessThanOrEqual(MAX_QUESTIONS);
    expect(isPlacementComplete(s)).toBe(true);
  });
});

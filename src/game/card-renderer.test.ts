import { describe, expect, it } from 'vitest';
import type { SpineEntry, SpineFace } from '../content/spine';
import { dayNumber, deriveSeed, renderCard } from './card-renderer';

function vocab(
  id: string,
  jp: string,
  reading: string,
  en: string,
  pos = 'noun',
  jlpt = 'N5',
  faces: SpineFace[] = ['recall'],
): SpineEntry {
  return { id, type: 'vocab', jp, reading, en, pos, jlpt, tags: [], faces, cloze: null };
}

function kanji(
  id: string,
  jp: string,
  reading: string,
  en: string,
  jlpt = 'N5',
): SpineEntry {
  return {
    id,
    type: 'kanji',
    jp,
    reading,
    en,
    pos: 'kanji',
    jlpt,
    tags: [],
    faces: ['meaning', 'reading'],
    cloze: null,
  };
}

const VOCAB: SpineEntry[] = [
  vocab('water', '水', 'mizu', 'water'),
  vocab('fire', '火', 'hi', 'fire'),
  vocab('tree', '木', 'ki', 'tree'),
  vocab('mountain', '山', 'yama', 'mountain'),
  vocab('river', '川', 'kawa', 'river'),
  vocab('sky', '空', 'sora', 'sky'),
  vocab('to-eat', '食べる', 'taberu', 'to eat', 'verb'),
  vocab('to-drink', '飲む', 'nomu', 'to drink', 'verb'),
  vocab('to-go', '行く', 'iku', 'to go', 'verb'),
  vocab('to-come', '来る', 'kuru', 'to come', 'verb'),
];

const KANJI: SpineEntry[] = [
  kanji('k-water', '水', 'みず', 'water'),
  kanji('k-fire', '火', 'ひ', 'fire'),
  kanji('k-tree', '木', 'き', 'tree'),
  kanji('k-mountain', '山', 'やま', 'mountain'),
  kanji('k-sun', '日', 'ひ', 'sun'),
];

const ALL = [...VOCAB, ...KANJI];

describe('renderCard', () => {
  describe('determinism', () => {
    it('returns the same options for the same seed', () => {
      const a = renderCard(VOCAB[0], 'recall', VOCAB, 12345);
      const b = renderCard(VOCAB[0], 'recall', VOCAB, 12345);
      expect(a.options).toEqual(b.options);
      expect(a.correct).toBe(b.correct);
    });

    it('returns different option ordering for different seeds', () => {
      const seeds = [1, 2, 3, 4, 5].map((s) => renderCard(VOCAB[0], 'recall', VOCAB, s).options.join('|'));
      // At least two distinct orderings across the seeds.
      expect(new Set(seeds).size).toBeGreaterThan(1);
    });

    it('deriveSeed varies with cardId and day', () => {
      const a = deriveSeed('water::recall', 100);
      const b = deriveSeed('water::recall', 101);
      const c = deriveSeed('fire::recall', 100);
      expect(a).not.toBe(b);
      expect(a).not.toBe(c);
    });
  });

  describe('well-formedness', () => {
    const cases: Array<{ face: SpineFace; entry: SpineEntry; spine: SpineEntry[]; expectCorrect: string }> = [
      { face: 'recall', entry: VOCAB[0], spine: VOCAB, expectCorrect: 'water' },
      { face: 'reverse', entry: VOCAB[0], spine: VOCAB, expectCorrect: '水' },
      { face: 'meaning', entry: KANJI[0], spine: ALL, expectCorrect: 'water' },
      { face: 'reading', entry: KANJI[0], spine: ALL, expectCorrect: 'みず' },
    ];

    for (const { face, entry, spine, expectCorrect } of cases) {
      it(`face ${face}: 4 unique options including correct`, () => {
        const q = renderCard(entry, face, spine, 42);
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.correct).toBe(expectCorrect);
        expect(q.options).toContain(q.correct);
      });

      it(`face ${face}: distractors never collide with the correct answer`, () => {
        for (const seed of [1, 2, 3, 4, 5, 100, 999]) {
          const q = renderCard(entry, face, spine, seed);
          const distractors = q.options.filter((o) => o !== q.correct);
          expect(distractors).toHaveLength(3);
          for (const d of distractors) expect(d).not.toBe(q.correct);
        }
      });
    }

    it('cloze: respects the authored sentence and target', () => {
      const verbA: SpineEntry = {
        ...vocab('eats', '食べる', 'taberu', 'to eat', 'verb'),
        faces: ['cloze'],
        cloze: { sentence: '私はりんごを{}。', target: '食べる' },
      };
      const spine: SpineEntry[] = [
        verbA,
        vocab('drinks', '飲む', 'nomu', 'to drink', 'verb'),
        vocab('goes', '行く', 'iku', 'to go', 'verb'),
        vocab('comes', '来る', 'kuru', 'to come', 'verb'),
        vocab('sees', '見る', 'miru', 'to see', 'verb'),
      ];
      const q = renderCard(verbA, 'cloze', spine, 7);
      expect(q.face).toBe('cloze');
      expect(q.correct).toBe('食べる');
      expect(q.clozeSentence).toContain('私はりんごを');
      expect(q.clozeSentence).not.toContain('{}');
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options).toContain('食べる');
    });
  });

  describe('plausibility', () => {
    it('prefers same-pos distractors when available', () => {
      // The verb pool is large enough that same-pos verbs should fill all 3 distractor slots.
      const verbEntry = VOCAB.find((e) => e.id === 'to-eat')!;
      const verbAnswers = new Set(VOCAB.filter((e) => e.pos === 'verb').map((e) => e.en));
      // Try several seeds; same-pos pool has exactly 3 non-self verbs, so all distractors must come from it.
      for (const seed of [1, 7, 42, 99, 1234]) {
        const q = renderCard(verbEntry, 'recall', VOCAB, seed);
        const distractors = q.options.filter((o) => o !== q.correct);
        for (const d of distractors) {
          expect(verbAnswers.has(d)).toBe(true);
        }
      }
    });
  });

  describe('cardId', () => {
    it('uses entryId::face format', () => {
      const q = renderCard(VOCAB[0], 'recall', VOCAB, 1);
      expect(q.cardId).toBe('water::recall');
    });
  });
});

describe('dayNumber', () => {
  it('changes at UTC midnight boundaries', () => {
    const t0 = Date.UTC(2026, 0, 1, 0, 0, 0);
    const t1 = Date.UTC(2026, 0, 1, 23, 59, 59);
    const t2 = Date.UTC(2026, 0, 2, 0, 0, 0);
    expect(dayNumber(t0)).toBe(dayNumber(t1));
    expect(dayNumber(t2)).toBe(dayNumber(t0) + 1);
  });

  it('renderCard returns same distractors across the same UTC day', () => {
    const t0 = Date.UTC(2026, 0, 1, 4, 0, 0);
    const t1 = Date.UTC(2026, 0, 1, 22, 0, 0);
    const seed0 = deriveSeed('water::recall', dayNumber(t0));
    const seed1 = deriveSeed('water::recall', dayNumber(t1));
    expect(seed0).toBe(seed1);
    const q0 = renderCard(VOCAB[0], 'recall', VOCAB, seed0);
    const q1 = renderCard(VOCAB[0], 'recall', VOCAB, seed1);
    expect(q0.options).toEqual(q1.options);
  });
});

import { describe, expect, it } from 'vitest';
import {
  accuracy,
  answer,
  createLesson,
  currentQuestion,
  isComplete,
  type LessonState,
} from './lesson-engine';
import type { SpineEntry } from '../content/spine';

function entry(jp: string, reading: string, en: string): SpineEntry {
  return {
    id: en,
    type: 'vocab',
    jp,
    reading,
    en,
    pos: 'noun',
    jlpt: 'N5',
    tags: [],
    faces: ['recall'],
    cloze: null,
  };
}

const POOL: SpineEntry[] = [
  entry('水', 'mizu', 'water'),
  entry('火', 'hi', 'fire'),
  entry('木', 'ki', 'tree'),
  entry('山', 'yama', 'mountain'),
  entry('川', 'kawa', 'river'),
  entry('空', 'sora', 'sky'),
  entry('海', 'umi', 'sea'),
  entry('雨', 'ame', 'rain'),
];

// Deterministic mulberry32 PRNG so tests don't depend on Math.random
function seededRng(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function answerAll(state: LessonState, pickCorrect: (i: number) => boolean): LessonState {
  let s = state;
  while (!isComplete(s)) {
    const q = currentQuestion(s);
    if (!q) break;
    const choice = pickCorrect(s.currentIndex)
      ? q.correct
      : (q.options.find((o) => o !== q.correct) as string);
    s = answer(s, choice);
  }
  return s;
}

describe('lesson-engine', () => {
  it('honors the requested question count', () => {
    const lesson = createLesson({ pool: POOL, questionCount: 5, rng: seededRng(1) });
    expect(lesson.questions).toHaveLength(5);
  });

  it('draws every question prompt from the supplied pool', () => {
    const lesson = createLesson({ pool: POOL, questionCount: 5, rng: seededRng(2) });
    for (const q of lesson.questions) {
      expect(
        POOL.some((e) => e.jp === q.prompt && e.reading === q.promptSubtitle && e.en === q.correct),
      ).toBe(true);
    }
  });

  it('builds four unique options per question with three distractors from the pool', () => {
    const lesson = createLesson({ pool: POOL, questionCount: 5, rng: seededRng(3) });
    const allEn = new Set(POOL.map((e) => e.en));
    for (const q of lesson.questions) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options).toContain(q.correct);
      const distractors = q.options.filter((o) => o !== q.correct);
      expect(distractors).toHaveLength(3);
      for (const d of distractors) {
        expect(d).not.toBe(q.correct);
        expect(allEn.has(d)).toBe(true);
      }
    }
  });

  it('returns accuracy proportional to correct answers', () => {
    const lesson = createLesson({ pool: POOL, questionCount: 4, rng: seededRng(4) });
    const allCorrect = answerAll(lesson, () => true);
    expect(accuracy(allCorrect)).toBe(1);

    const allWrong = answerAll(lesson, () => false);
    expect(accuracy(allWrong)).toBe(0);

    const half = answerAll(lesson, (i) => i % 2 === 0);
    expect(accuracy(half)).toBe(0.5);
  });

  it('marks the lesson complete only after every question is answered', () => {
    const lesson = createLesson({ pool: POOL, questionCount: 3, rng: seededRng(5) });
    expect(isComplete(lesson)).toBe(false);

    const q = currentQuestion(lesson);
    expect(q).not.toBeNull();

    const after = answer(lesson, q!.correct);
    expect(isComplete(after)).toBe(false);
    expect(after.currentIndex).toBe(1);
    expect(after.answers).toHaveLength(1);

    const done = answerAll(lesson, () => true);
    expect(isComplete(done)).toBe(true);
    expect(currentQuestion(done)).toBeNull();
  });

  it('throws when the pool is too small to build distractors', () => {
    expect(() =>
      createLesson({ pool: POOL.slice(0, 3), questionCount: 1, rng: seededRng(6) }),
    ).toThrow();
  });
});

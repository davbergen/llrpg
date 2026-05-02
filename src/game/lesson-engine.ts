import type { VocabEntry } from './vocab';

export interface MCQ {
  jp: string;
  romaji: string;
  correct: string;
  options: string[];
}

export interface AnswerRecord {
  questionIndex: number;
  chosen: string;
  correct: boolean;
}

export interface LessonState {
  questions: MCQ[];
  currentIndex: number;
  answers: AnswerRecord[];
}

export type Rng = () => number;

export interface CreateLessonOptions {
  pool: VocabEntry[];
  questionCount: number;
  rng?: Rng;
}

const DISTRACTORS_PER_QUESTION = 3;
const OPTIONS_PER_QUESTION = DISTRACTORS_PER_QUESTION + 1;

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createLesson({ pool, questionCount, rng = Math.random }: CreateLessonOptions): LessonState {
  if (questionCount < 0) throw new Error('questionCount must be >= 0');
  if (pool.length < OPTIONS_PER_QUESTION) {
    throw new Error(`pool must contain at least ${OPTIONS_PER_QUESTION} entries`);
  }

  const prompts = shuffle(pool, rng).slice(0, questionCount);
  const questions: MCQ[] = prompts.map((entry) => {
    const distractors = shuffle(
      pool.filter((e) => e.en !== entry.en),
      rng,
    ).slice(0, DISTRACTORS_PER_QUESTION);
    const options = shuffle([entry.en, ...distractors.map((d) => d.en)], rng);
    return {
      jp: entry.jp,
      romaji: entry.romaji,
      correct: entry.en,
      options,
    };
  });

  return { questions, currentIndex: 0, answers: [] };
}

export function currentQuestion(state: LessonState): MCQ | null {
  return state.questions[state.currentIndex] ?? null;
}

export function answer(state: LessonState, chosen: string): LessonState {
  const q = currentQuestion(state);
  if (!q) return state;
  const record: AnswerRecord = {
    questionIndex: state.currentIndex,
    chosen,
    correct: chosen === q.correct,
  };
  return {
    ...state,
    currentIndex: state.currentIndex + 1,
    answers: [...state.answers, record],
  };
}

export function isComplete(state: LessonState): boolean {
  return state.answers.length >= state.questions.length;
}

export function accuracy(state: LessonState): number {
  if (state.questions.length === 0) return 0;
  const correct = state.answers.filter((a) => a.correct).length;
  return correct / state.questions.length;
}

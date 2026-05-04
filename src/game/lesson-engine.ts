import type { SpineEntry } from '../content/spine';
import type { ComposedCard } from './lesson-composer';
import type { CardKey, Outcome } from './fsrs-scheduler';

export interface MCQ {
  jp: string;
  romaji: string;
  correct: string;
  options: string[];
  cardId: CardKey | null;
}

export interface AnswerRecord {
  questionIndex: number;
  chosen: string;
  correct: boolean;
}

export interface LessonState {
  questions: MCQ[];
  cardIds: CardKey[];
  currentIndex: number;
  answers: AnswerRecord[];
}

export interface LessonSummary {
  accuracy: number;
  ratings: Outcome[];
  cardIds: CardKey[];
  servedCount: number;
}

export type Rng = () => number;

export interface CreateLessonOptions {
  pool: readonly SpineEntry[];
  questionCount: number;
  rng?: Rng;
  /**
   * Optional pre-composed card list. When provided, the lesson serves exactly these
   * cards (in order) and `pool` is used only as a distractor source. `questionCount`
   * is ignored. This is the path taken by the FSRS-driven flow (Slice 12+).
   */
  cards?: readonly ComposedCard[];
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

function buildMCQ(entry: SpineEntry, pool: readonly SpineEntry[], rng: Rng, cardId: CardKey | null): MCQ {
  const distractors = shuffle(
    pool.filter((e) => e.en !== entry.en),
    rng,
  ).slice(0, DISTRACTORS_PER_QUESTION);
  const options = shuffle([entry.en, ...distractors.map((d) => d.en)], rng);
  return {
    jp: entry.jp,
    romaji: entry.reading,
    correct: entry.en,
    options,
    cardId,
  };
}

export function createLesson({
  pool,
  questionCount,
  rng = Math.random,
  cards,
}: CreateLessonOptions): LessonState {
  if (pool.length < OPTIONS_PER_QUESTION) {
    throw new Error(`pool must contain at least ${OPTIONS_PER_QUESTION} entries`);
  }

  if (cards) {
    const questions = cards.map((c) => buildMCQ(c.entry, pool, rng, c.key));
    return {
      questions,
      cardIds: cards.map((c) => c.key),
      currentIndex: 0,
      answers: [],
    };
  }

  if (questionCount < 0) throw new Error('questionCount must be >= 0');
  const prompts = shuffle(pool, rng).slice(0, questionCount);
  const questions: MCQ[] = prompts.map((entry) => buildMCQ(entry, pool, rng, null));
  return {
    questions,
    cardIds: questions.map((q) => q.cardId).filter((id): id is CardKey => id !== null),
    currentIndex: 0,
    answers: [],
  };
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

export function summarize(state: LessonState): LessonSummary {
  const ratings: Outcome[] = state.answers.map((a) => (a.correct ? 'correct' : 'wrong'));
  const cardIds: CardKey[] = state.answers
    .map((a) => state.questions[a.questionIndex]?.cardId ?? null)
    .filter((id): id is CardKey => id !== null);
  return {
    accuracy: accuracy(state),
    ratings,
    cardIds,
    servedCount: state.questions.length,
  };
}

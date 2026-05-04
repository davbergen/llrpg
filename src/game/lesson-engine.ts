import type { SpineEntry, SpineFace } from '../content/spine';
import type { ComposedCard } from './lesson-composer';
import { cardKey, type CardKey, type Outcome } from './fsrs-scheduler';
import {
  dayNumber,
  deriveSeed,
  renderCard,
  type MCQQuestion,
} from './card-renderer';

export type MCQ = MCQQuestion;

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
  /** Wall-clock used to derive the per-day distractor seed. Defaults to `Date.now()`. */
  now?: number;
}

const OPTIONS_PER_QUESTION = 4;

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createLesson({
  pool,
  questionCount,
  rng = Math.random,
  cards,
  now = Date.now(),
}: CreateLessonOptions): LessonState {
  if (pool.length < OPTIONS_PER_QUESTION) {
    throw new Error(`pool must contain at least ${OPTIONS_PER_QUESTION} entries`);
  }

  const day = dayNumber(now);

  if (cards) {
    const questions = cards.map((c) => renderCard(c.entry, c.face, pool, deriveSeed(c.key, day)));
    return {
      questions,
      cardIds: cards.map((c) => c.key),
      currentIndex: 0,
      answers: [],
    };
  }

  if (questionCount < 0) throw new Error('questionCount must be >= 0');
  // Legacy random-draw fallback: pick recall cards from any entry that supports recall.
  const recallPool = pool.filter((e) => e.faces.includes('recall'));
  const source = recallPool.length >= OPTIONS_PER_QUESTION ? recallPool : pool;
  const prompts = shuffle(source, rng).slice(0, questionCount);
  const questions: MCQ[] = prompts.map((entry) => {
    const face: SpineFace = 'recall';
    const seed = deriveSeed(cardKey(entry.id, face), day) ^ Math.floor(rng() * 0xffffffff);
    return renderCard(entry, face, pool, seed);
  });
  return {
    questions,
    cardIds: questions.map((q) => q.cardId),
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
  const cardIds: CardKey[] = state.answers.map((a) => state.questions[a.questionIndex].cardId);
  return {
    accuracy: accuracy(state),
    ratings,
    cardIds,
    servedCount: state.questions.length,
  };
}

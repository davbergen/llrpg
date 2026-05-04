import { createEmptyCard, FSRS, Rating, State, type Card, type Grade } from 'ts-fsrs';
import type { SpineFace } from '../content/spine';

export type CardKey = string;
export type Outcome = 'correct' | 'wrong';
export type CardStateName = 'new' | 'learning' | 'review' | 'relearning';

export interface CardState {
  stability: number;
  difficulty: number;
  lastReview: number | null;
  nextDue: number;
  state: CardStateName;
  lapses: number;
  reps: number;
}

const fsrs = new FSRS({});

export function cardKey(entryId: string, face: SpineFace | string): CardKey {
  return `${entryId}::${face}`;
}

function stateNameOf(s: State): CardStateName {
  switch (s) {
    case State.New:
      return 'new';
    case State.Learning:
      return 'learning';
    case State.Review:
      return 'review';
    case State.Relearning:
      return 'relearning';
  }
}

function stateEnumOf(name: CardStateName): State {
  switch (name) {
    case 'new':
      return State.New;
    case 'learning':
      return State.Learning;
    case 'review':
      return State.Review;
    case 'relearning':
      return State.Relearning;
  }
}

function toFsrsCard(state: CardState): Card {
  return {
    due: new Date(state.nextDue),
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: state.reps,
    lapses: state.lapses,
    learning_steps: 0,
    state: stateEnumOf(state.state),
    last_review: state.lastReview != null ? new Date(state.lastReview) : undefined,
  };
}

function fromFsrsCard(card: Card): CardState {
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    lastReview: card.last_review ? card.last_review.getTime() : null,
    nextDue: card.due.getTime(),
    state: stateNameOf(card.state),
    lapses: card.lapses,
    reps: card.reps,
  };
}

export function newCardState(now: number): CardState {
  return fromFsrsCard(createEmptyCard(new Date(now)));
}

export function mapOutcomeToRating(outcome: Outcome): Grade {
  return outcome === 'correct' ? Rating.Good : Rating.Again;
}

export function applyOutcome(state: CardState, outcome: Outcome, now: number): CardState {
  const result = fsrs.next(toFsrsCard(state), new Date(now), mapOutcomeToRating(outcome));
  return fromFsrsCard(result.card);
}

export function isDue(state: CardState, now: number): boolean {
  return state.nextDue <= now;
}

export function overduenessDays(state: CardState, now: number): number {
  return (now - state.nextDue) / 86_400_000;
}

const STATE_PRIORITY: Record<CardStateName, number> = {
  review: 0,
  learning: 1,
  relearning: 1,
  new: 2,
};

export function compareDuePriority(a: CardState, b: CardState, now: number): number {
  const od = overduenessDays(b, now) - overduenessDays(a, now);
  if (od !== 0) return od;
  return STATE_PRIORITY[a.state] - STATE_PRIORITY[b.state];
}

export interface CardStore {
  get(key: CardKey): CardState | null;
  set(key: CardKey, state: CardState): void;
  has(key: CardKey): boolean;
  entries(): Array<[CardKey, CardState]>;
}

export class InMemoryCardStore implements CardStore {
  private map = new Map<CardKey, CardState>();

  get(key: CardKey): CardState | null {
    return this.map.get(key) ?? null;
  }

  set(key: CardKey, state: CardState): void {
    this.map.set(key, state);
  }

  has(key: CardKey): boolean {
    return this.map.has(key);
  }

  entries(): Array<[CardKey, CardState]> {
    return Array.from(this.map.entries());
  }
}

export class LocalStorageCardStore implements CardStore {
  private map: Map<CardKey, CardState>;

  constructor(private storageKey: string = 'fsrs.cards.v1') {
    this.map = LocalStorageCardStore.load(storageKey);
  }

  private static load(storageKey: string): Map<CardKey, CardState> {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return new Map();
      const obj = JSON.parse(raw) as Record<string, CardState>;
      return new Map(Object.entries(obj));
    } catch {
      return new Map();
    }
  }

  private persist(): void {
    try {
      const obj: Record<string, CardState> = {};
      for (const [k, v] of this.map) obj[k] = v;
      localStorage.setItem(this.storageKey, JSON.stringify(obj));
    } catch {
      // localStorage unavailable / quota exceeded — silently drop
    }
  }

  get(key: CardKey): CardState | null {
    return this.map.get(key) ?? null;
  }

  set(key: CardKey, state: CardState): void {
    this.map.set(key, state);
    this.persist();
  }

  has(key: CardKey): boolean {
    return this.map.has(key);
  }

  entries(): Array<[CardKey, CardState]> {
    return Array.from(this.map.entries());
  }
}

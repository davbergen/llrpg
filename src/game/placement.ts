import type { SpineEntry, SpineFace } from '../content/spine';
import { seededRng } from './card-renderer';
import { cardKey, type CardKey, type CardState, type Outcome } from './fsrs-scheduler';

export type Band = 'early' | 'mid' | 'late';
export const BANDS: readonly Band[] = ['early', 'mid', 'late'];

export const MAX_QUESTIONS = 30;
export const STEP_UP_THRESHOLD = 3;
export const STEP_DOWN_THRESHOLD = 2;

const DAY_MS = 86_400_000;

const NEIGHBOR_FALLBACK: Record<Band, readonly Band[]> = {
  early: ['early', 'mid', 'late'],
  mid: ['mid', 'early', 'late'],
  late: ['late', 'mid', 'early'],
};

export interface ProbedCard {
  entryId: string;
  face: SpineFace;
  outcome: Outcome;
}

export interface PlacementSession {
  band: Band;
  correctStreak: number;
  wrongInBand: number;
  probed: ProbedCard[];
  askedIds: string[];
  seed: number;
}

export function createPlacementSession(seed: number): PlacementSession {
  return {
    band: 'early',
    correctStreak: 0,
    wrongInBand: 0,
    probed: [],
    askedIds: [],
    seed,
  };
}

/** Partition each type's entries into thirds by spine order — early, mid, late. */
export function bandOf(entry: SpineEntry, spine: readonly SpineEntry[]): Band {
  const sameType = spine.filter((e) => e.type === entry.type);
  const idx = sameType.findIndex((e) => e.id === entry.id);
  if (idx < 0) return 'late';
  const third = Math.max(1, Math.ceil(sameType.length / 3));
  if (idx < third) return 'early';
  if (idx < third * 2) return 'mid';
  return 'late';
}

export function placementFaceFor(entry: SpineEntry): SpineFace {
  return entry.faces[0];
}

/** Pick the next entry to probe. Prefers current band, falls back to neighbors when exhausted. */
export function pickNextEntry(
  session: PlacementSession,
  spine: readonly SpineEntry[],
): SpineEntry | null {
  const asked = new Set(session.askedIds);
  const eligible = spine.filter((e) => !asked.has(e.id) && e.faces.length > 0);
  if (eligible.length === 0) return null;

  const rng = seededRng(session.seed + session.askedIds.length);
  for (const band of NEIGHBOR_FALLBACK[session.band]) {
    const pool = eligible.filter((e) => bandOf(e, spine) === band);
    if (pool.length === 0) continue;
    const sorted = pool.slice().sort((a, b) => a.id.localeCompare(b.id));
    const i = Math.floor(rng() * sorted.length);
    return sorted[i];
  }
  return null;
}

function stepUp(band: Band): Band {
  if (band === 'early') return 'mid';
  if (band === 'mid') return 'late';
  return 'late';
}

function stepDown(band: Band): Band {
  if (band === 'late') return 'mid';
  if (band === 'mid') return 'early';
  return 'early';
}

export function recordOutcome(
  session: PlacementSession,
  entry: SpineEntry,
  outcome: Outcome,
): PlacementSession {
  const probed: ProbedCard[] = [
    ...session.probed,
    { entryId: entry.id, face: placementFaceFor(entry), outcome },
  ];
  const askedIds = [...session.askedIds, entry.id];

  let { band, correctStreak, wrongInBand } = session;

  if (outcome === 'correct') {
    correctStreak += 1;
    if (correctStreak >= STEP_UP_THRESHOLD) {
      const next = stepUp(band);
      if (next !== band) {
        band = next;
        correctStreak = 0;
        wrongInBand = 0;
      } else {
        correctStreak = 0;
      }
    }
  } else {
    correctStreak = 0;
    wrongInBand += 1;
    if (wrongInBand >= STEP_DOWN_THRESHOLD) {
      const next = stepDown(band);
      if (next !== band) {
        band = next;
        correctStreak = 0;
        wrongInBand = 0;
      } else {
        wrongInBand = 0;
      }
    }
  }

  return { ...session, probed, askedIds, band, correctStreak, wrongInBand };
}

export function isPlacementComplete(session: PlacementSession): boolean {
  return session.probed.length >= MAX_QUESTIONS;
}

/** Seed an FSRS card state from a placement probe outcome. Per spec:
 *   correct → review, stability 2, difficulty 5
 *   wrong   → learning, stability 0
 */
export function seedCardState(outcome: Outcome, now: number): CardState {
  if (outcome === 'correct') {
    return {
      state: 'review',
      stability: 2,
      difficulty: 5,
      lastReview: now,
      nextDue: now + 2 * DAY_MS,
      reps: 1,
      lapses: 0,
    };
  }
  return {
    state: 'learning',
    stability: 0,
    difficulty: 6,
    lastReview: now,
    nextDue: now,
    reps: 1,
    lapses: 0,
  };
}

export interface SeedTarget {
  set(key: CardKey, state: CardState): void;
}

export function applyPlacementToStore(
  session: PlacementSession,
  store: SeedTarget,
  now: number,
): void {
  for (const p of session.probed) {
    store.set(cardKey(p.entryId, p.face), seedCardState(p.outcome, now));
  }
}

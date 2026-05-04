import type { SpineEntry, SpineFace } from '../content/spine';
import { cardKey, type CardKey } from './fsrs-scheduler';

export interface MCQQuestion {
  face: SpineFace;
  /** Main prompt text shown to the user. */
  prompt: string;
  /** Secondary prompt line (e.g. romaji under JP for `recall`). */
  promptSubtitle: string | null;
  /** For `cloze`: the sentence with `___` filled in for the blank position. */
  clozeSentence: string | null;
  correct: string;
  options: string[];
  cardId: CardKey;
}

const DISTRACTOR_COUNT = 3;
const BLANK_DISPLAY = '＿＿＿';

type AnswerOf = (entry: SpineEntry) => string | null;

interface FaceSpec {
  prompt: (entry: SpineEntry) => string;
  promptSubtitle: (entry: SpineEntry) => string | null;
  clozeSentence: (entry: SpineEntry) => string | null;
  correct: AnswerOf;
  /** How to extract a distractor answer from a candidate entry. Defaults to `correct`. */
  distractor?: AnswerOf;
  /** Optional pre-filter on the candidate spine. */
  candidateFilter?: (e: SpineEntry, target: SpineEntry) => boolean;
}

const FACE_SPECS: Record<SpineFace, FaceSpec> = {
  recall: {
    prompt: (e) => e.jp,
    promptSubtitle: (e) => e.reading,
    clozeSentence: () => null,
    correct: (e) => e.en,
  },
  reverse: {
    prompt: (e) => e.en,
    promptSubtitle: () => null,
    clozeSentence: () => null,
    correct: (e) => e.jp,
  },
  cloze: {
    prompt: (e) => (e.cloze ? e.cloze.sentence.replace('{}', BLANK_DISPLAY) : ''),
    promptSubtitle: () => null,
    clozeSentence: (e) => (e.cloze ? e.cloze.sentence.replace('{}', BLANK_DISPLAY) : null),
    correct: (e) => (e.cloze ? e.cloze.target : null),
    distractor: (e) => e.jp,
    candidateFilter: (e, target) => e.pos === target.pos,
  },
  meaning: {
    prompt: (e) => e.jp,
    promptSubtitle: () => null,
    clozeSentence: () => null,
    correct: (e) => e.en,
    candidateFilter: (e, target) => e.type === target.type,
  },
  reading: {
    prompt: (e) => e.jp,
    promptSubtitle: () => null,
    clozeSentence: () => null,
    correct: (e) => e.reading,
    candidateFilter: (e, target) => e.type === target.type,
  },
};

export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32: fast, deterministic, seedable. */
export function seededRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function deriveSeed(cardId: CardKey, dayNumber: number): number {
  return hashString(`${cardId}|${dayNumber}`);
}

export function dayNumber(now: number): number {
  return Math.floor(now / 86_400_000);
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function plausibilityRank(candidate: SpineEntry, target: SpineEntry): number {
  const samePos = candidate.pos === target.pos;
  const sameJlpt = candidate.jlpt === target.jlpt;
  if (samePos && sameJlpt) return 0;
  if (samePos) return 1;
  if (sameJlpt) return 2;
  if (candidate.type === target.type) return 3;
  return 4;
}

function sampleDistractors(
  entry: SpineEntry,
  spine: readonly SpineEntry[],
  spec: FaceSpec,
  rng: () => number,
): string[] {
  const correct = spec.correct(entry);
  if (correct === null) {
    throw new Error(`renderCard: face has no correct answer for entry ${entry.id}`);
  }

  const seenAnswers = new Set<string>();
  seenAnswers.add(correct);

  const candidates = spine.filter(
    (e) => e.id !== entry.id && (spec.candidateFilter ? spec.candidateFilter(e, entry) : true),
  );

  const getDistractor = spec.distractor ?? spec.correct;
  const buckets = new Map<number, Array<{ ans: string; id: string }>>();
  for (const c of candidates) {
    const ans = getDistractor(c);
    if (ans === null) continue;
    const rank = plausibilityRank(c, entry);
    if (!buckets.has(rank)) buckets.set(rank, []);
    buckets.get(rank)!.push({ ans, id: c.id });
  }

  const sortedRanks = Array.from(buckets.keys()).sort((a, b) => a - b);
  const picked: string[] = [];
  for (const rank of sortedRanks) {
    const bucket = buckets.get(rank)!;
    // Stable order before shuffle so the seed alone determines outcome.
    const ordered = bucket.slice().sort((a, b) => a.id.localeCompare(b.id));
    const shuffled = shuffle(ordered, rng);
    for (const { ans } of shuffled) {
      if (seenAnswers.has(ans)) continue;
      seenAnswers.add(ans);
      picked.push(ans);
      if (picked.length >= DISTRACTOR_COUNT) return picked;
    }
  }
  if (picked.length < DISTRACTOR_COUNT) {
    throw new Error(
      `renderCard: insufficient distractors for ${entry.id}::${spec === FACE_SPECS.recall ? 'recall' : 'face'} ` +
        `(got ${picked.length}, need ${DISTRACTOR_COUNT})`,
    );
  }
  return picked;
}

export function renderCard(
  entry: SpineEntry,
  face: SpineFace,
  spine: readonly SpineEntry[],
  seed: number,
): MCQQuestion {
  const spec = FACE_SPECS[face];
  if (!spec) throw new Error(`renderCard: unknown face "${face}"`);
  const correct = spec.correct(entry);
  if (correct === null) {
    throw new Error(`renderCard: entry ${entry.id} cannot serve face ${face}`);
  }

  const rng = seededRng(seed);
  const distractors = sampleDistractors(entry, spine, spec, rng);
  const options = shuffle([correct, ...distractors], rng);

  return {
    face,
    prompt: spec.prompt(entry),
    promptSubtitle: spec.promptSubtitle(entry),
    clozeSentence: spec.clozeSentence(entry),
    correct,
    options,
    cardId: cardKey(entry.id, face),
  };
}

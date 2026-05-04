import type { SpineEntry, SpineFace } from '../content/spine';
import {
  cardKey,
  compareDuePriority,
  isDue,
  type CardKey,
  type CardState,
  type CardStore,
} from './fsrs-scheduler';

export interface ComposedCard {
  entryId: string;
  face: SpineFace;
  key: CardKey;
  entry: SpineEntry;
  /** Persisted state if present, else null (a brand-new card). */
  state: CardState | null;
}

export interface ComposeOptions {
  spine: readonly SpineEntry[];
  store: CardStore;
  count: number;
  now: number;
}

/**
 * Compose a lesson session of up to `count` cards.
 *
 * Order: due cards first (most overdue first, ties broken by state priority),
 * then new-fill (cards never seen, in spine-authored order), then short.
 * Mastered-not-due cards are NEVER used as padding.
 */
export function composeLesson({ spine, store, count, now }: ComposeOptions): ComposedCard[] {
  if (count <= 0) return [];

  const allCards: ComposedCard[] = [];
  for (const entry of spine) {
    for (const face of entry.faces) {
      const key = cardKey(entry.id, face);
      allCards.push({
        entryId: entry.id,
        face,
        key,
        entry,
        state: store.get(key),
      });
    }
  }

  const dueCards = allCards.filter((c) => c.state !== null && isDue(c.state, now));
  dueCards.sort((a, b) => compareDuePriority(a.state as CardState, b.state as CardState, now));

  const newCards = allCards.filter((c) => c.state === null);

  const result: ComposedCard[] = [];
  for (const c of dueCards) {
    if (result.length >= count) break;
    result.push(c);
  }
  for (const c of newCards) {
    if (result.length >= count) break;
    result.push(c);
  }
  return result;
}

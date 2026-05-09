import type { DungeonState, SecondaryResources } from '../types';
import type { ManaState } from './mana';
import type { CardKey, CardState, CardStore } from './fsrs-scheduler';
import {
  GEMS_RETRY_COST,
  canAffordGems,
  debitGems,
  type GemLedger,
} from './gem-ledger';

export const RETRY_ACCURACY_THRESHOLD = 0.5;
export { GEMS_RETRY_COST };

export function isFailedSession(accuracy: number): boolean {
  return accuracy < RETRY_ACCURACY_THRESHOLD;
}

/**
 * Captures everything that needs to be reverted on retry. Taken at lesson start,
 * BEFORE mana is spent and BEFORE the lesson's combat tick is applied.
 */
export interface RetrySnapshot {
  hp: number;
  mana: ManaState;
  dungeonState: DungeonState;
  secondaryResources: SecondaryResources;
  /** Pre-lesson snapshot of cards that were touched. `null` = card did not exist before the lesson. */
  cards: Array<[CardKey, CardState | null]>;
}

export interface CanRetryArgs {
  ledger: GemLedger;
  alreadyUsed: boolean;
  accuracy: number;
}

export function canRetry({ ledger, alreadyUsed, accuracy }: CanRetryArgs): boolean {
  return (
    isFailedSession(accuracy) &&
    !alreadyUsed &&
    canAffordGems(ledger, GEMS_RETRY_COST)
  );
}

export interface RevertedState {
  hp: number;
  mana: ManaState;
  dungeonState: DungeonState;
  secondaryResources: SecondaryResources;
  ledger: GemLedger;
}

/**
 * Apply the retry: revert all snapshotted state and debit the retry cost from the ledger.
 * Caller must ensure `canRetry` returned true.
 */
export function applyRetry(
  snapshot: RetrySnapshot,
  ledger: GemLedger,
  now: number,
): RevertedState {
  return {
    hp: snapshot.hp,
    mana: snapshot.mana,
    dungeonState: snapshot.dungeonState,
    secondaryResources: snapshot.secondaryResources,
    ledger: debitGems(ledger, GEMS_RETRY_COST, 'lesson_retry', now),
  };
}

/**
 * Restore the given card store to its pre-lesson state. Cards that didn't exist before
 * the lesson are removed (or set to a no-op state if the store can't delete).
 */
export function revertCardStore(snapshot: RetrySnapshot, store: CardStore): void {
  for (const [key, prior] of snapshot.cards) {
    if (prior == null) {
      store.delete(key);
    } else {
      store.set(key, prior);
    }
  }
}

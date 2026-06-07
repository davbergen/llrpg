import { describe, expect, it } from 'vitest';
import {
  isFailedSession,
  canRetry,
  applyRetry,
  revertCardStore,
  RETRY_ACCURACY_THRESHOLD,
  GEMS_RETRY_COST,
  type RetrySnapshot,
} from './retry';
import { initialGemLedger, creditGems } from './gem-ledger';
import { initialManaState, MANA_MAX, spendMana } from './mana';
import { InMemoryCardStore, newCardState, applyOutcome } from './fsrs-scheduler';
import { initialDungeonState } from './dungeon';
import { emptySecondaryResources } from './secondary-resources';

const at = (h: number) => new Date(2026, 4, 9, h, 0, 0).getTime();

describe('isFailedSession', () => {
  it('treats accuracy < 50% as failed', () => {
    expect(isFailedSession(0)).toBe(true);
    expect(isFailedSession(0.49)).toBe(true);
    expect(isFailedSession(RETRY_ACCURACY_THRESHOLD)).toBe(false);
    expect(isFailedSession(0.8)).toBe(false);
  });
});

describe('canRetry', () => {
  const ledger = creditGems(initialGemLedger(), 5, 'boss_kill', 1);

  it('requires failed accuracy, unused, and affordability', () => {
    expect(canRetry({ ledger, alreadyUsed: false, accuracy: 0.4 })).toBe(true);
    expect(canRetry({ ledger, alreadyUsed: true, accuracy: 0.4 })).toBe(false);
    expect(canRetry({ ledger, alreadyUsed: false, accuracy: 0.8 })).toBe(false);
    expect(canRetry({ ledger: initialGemLedger(), alreadyUsed: false, accuracy: 0.4 })).toBe(false);
  });
});

describe('applyRetry', () => {
  it('reverts mana spend, HP, dungeon state and debits gems', () => {
    const startMana = initialManaState(at(10));
    const snapshot: RetrySnapshot = {
      hp: 100,
      mana: startMana,
      dungeonState: initialDungeonState(),
      secondaryResources: emptySecondaryResources(),
      cards: [],
    };
    const ledger = creditGems(initialGemLedger(), 10, 'boss_kill', at(10));

    // Simulate post-lesson state: mana spent, hp dropped
    const spent = spendMana(startMana, 2);
    expect(spent.current).toBe(MANA_MAX - 2);

    const result = applyRetry(snapshot, ledger, at(11));

    expect(result.hp).toBe(100);
    expect(result.mana.current).toBe(MANA_MAX);
    expect(result.ledger.balance).toBe(10 - GEMS_RETRY_COST);
    expect(result.ledger.entries[result.ledger.entries.length - 1]).toMatchObject({
      delta: -GEMS_RETRY_COST,
      source: 'lesson_retry',
    });
  });
});

describe('revertCardStore', () => {
  it('restores prior card states and removes new cards', () => {
    const store = new InMemoryCardStore();
    const now = at(10);
    const oldKey = 'old::recall';
    const newKey = 'new::recall';
    const priorOld = newCardState(now);
    store.set(oldKey, priorOld);

    // Simulate lesson: existing card gets graded wrong, new card gets graded correct.
    const after = applyOutcome(priorOld, 'wrong', now);
    store.set(oldKey, after);
    const newAfter = applyOutcome(newCardState(now), 'correct', now);
    store.set(newKey, newAfter);

    const snapshot: RetrySnapshot = {
      hp: 0,
      mana: initialManaState(now),
      dungeonState: initialDungeonState(),
      secondaryResources: emptySecondaryResources(),
      cards: [
        [oldKey, priorOld],
        [newKey, null],
      ],
    };

    revertCardStore(snapshot, store);

    expect(store.get(oldKey)).toEqual(priorOld);
    expect(store.has(newKey)).toBe(false);
  });
});

describe('full retry flow against an injected in-memory store', () => {
  it('reverts both game state and card store with no storage mocking', () => {
    // The store is injected as a value (the production path now threads the
    // root-constructed CardStore here), so the whole retry is exercisable
    // against the in-memory adapter.
    const store = new InMemoryCardStore();
    const now = at(9);
    const touchedKey = 'touched::recall';
    const freshKey = 'fresh::reverse';
    const priorTouched = newCardState(now);
    store.set(touchedKey, priorTouched);

    // Snapshot taken at lesson start (before mana spend / card writes).
    const snapshot: RetrySnapshot = {
      hp: 100,
      mana: initialManaState(now),
      dungeonState: initialDungeonState(),
      secondaryResources: emptySecondaryResources(),
      cards: [
        [touchedKey, priorTouched],
        [freshKey, null],
      ],
    };
    const ledger = creditGems(initialGemLedger(), GEMS_RETRY_COST, 'boss_kill', now);

    // Simulate a failed lesson: cards mutated, gems spendable.
    store.set(touchedKey, applyOutcome(priorTouched, 'wrong', now));
    store.set(freshKey, applyOutcome(newCardState(now), 'correct', now));

    expect(canRetry({ ledger, alreadyUsed: false, accuracy: 0.2 })).toBe(true);

    // Apply the retry: state revert + card-store revert via the injected store.
    const reverted = applyRetry(snapshot, ledger, at(10));
    revertCardStore(snapshot, store);

    expect(reverted.hp).toBe(100);
    expect(reverted.ledger.balance).toBe(0);
    expect(store.get(touchedKey)).toEqual(priorTouched);
    expect(store.has(freshKey)).toBe(false);
  });
});

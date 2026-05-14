import type { GameState, Hero } from '../types';
import { initialManaState } from '../game/mana';
import { emptySecondaryResources } from '../game/secondary-resources';
import { initialDungeonState } from '../game/dungeon';
import { initialStreakState } from '../game/streak';
import { initialGemLedger } from '../game/gem-ledger';

export interface PersistedState {
  hero: Hero | null;
  gameState: GameState;
  placementDone?: boolean;
}

export interface Repo {
  load(): Promise<PersistedState | null>;
  save(state: PersistedState): Promise<void>;
  wipe(): Promise<void>;
}

/** Backfill optional fields on a loaded PersistedState so older saves stay compatible. */
export function hydratePersisted(parsed: PersistedState): PersistedState {
  const gameState: GameState = {
    ...parsed.gameState,
    mana: parsed.gameState.mana ?? initialManaState(Date.now()),
    secondaryResources: parsed.gameState.secondaryResources ?? emptySecondaryResources(),
    dungeonState: hydrateDungeonState(parsed.gameState.dungeonState),
    streakState: parsed.gameState.streakState ?? initialStreakState(),
    gems: parsed.gameState.gems ?? initialGemLedger(),
    shop: parsed.gameState.shop ?? { date: null, rerollCount: 0, purchasedIds: [] },
  };
  return { ...parsed, gameState, placementDone: parsed.placementDone ?? false };
}

function hydrateDungeonState(raw: unknown): GameState['dungeonState'] {
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    if (typeof r.activeDungeonId === 'string' && r.progress && typeof r.progress === 'object') {
      return raw as GameState['dungeonState'];
    }
  }
  return initialDungeonState();
}

export function isPersistedShape(value: unknown): value is PersistedState {
  return !!value && typeof value === 'object' && 'gameState' in value && 'hero' in value;
}

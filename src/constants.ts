import type { Equipment, GameState, Tweaks } from './types';
import { initialDungeonState } from './game/dungeon';
import { initialManaState } from './game/mana';
import { emptySecondaryResources } from './game/secondary-resources';
import { initialStreakState } from './game/streak';
import { initialGemLedger } from './game/gem-ledger';

export const TWEAK_DEFAULTS: Tweaks = {
  accentColor: '#e6a817',
  panelStyle: 'dark',
  fontSize: 100,
  showPartyQuest: true,
  heroName: '',
  debugMode: false,
};

export const EMPTY_EQUIPMENT: Equipment = {
  head: null,
  chest: null,
  legs: null,
};

export const INITIAL_STATE: GameState = {
  hp: 100,
  maxHp: 100,
  mp: 55,
  maxMp: 80,
  xp: 0,
  maxXp: 100,
  level: 1,
  gold: 0,
  questProgress: {},
  partyMembers: [],
  inventory: [],
  dungeonState: initialDungeonState(),
  mana: initialManaState(Date.now()),
  secondaryResources: emptySecondaryResources(),
  streakState: initialStreakState(),
  gems: initialGemLedger(),
  shop: { date: null, rerollCount: 0, purchasedIds: [] },
};

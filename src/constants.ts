import type { Equipment, GameState, Tweaks } from './types';
import { initialDungeonState } from './game/dungeon';

export const TWEAK_DEFAULTS: Tweaks = {
  accentColor: '#e6a817',
  panelStyle: 'dark',
  fontSize: 100,
  showPartyQuest: true,
  heroName: '',
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
  streak: 0,
  questProgress: {},
  partyMembers: [],
  inventory: [],
  dungeonState: initialDungeonState(),
};

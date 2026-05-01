import type { GameState, Tweaks } from './types';

export const TWEAK_DEFAULTS: Tweaks = {
  accentColor: '#e6a817',
  panelStyle: 'dark',
  fontSize: 100,
  showPartyQuest: true,
  heroName: '',
};

export const INITIAL_STATE: GameState = {
  hp: 80,
  maxHp: 100,
  mp: 55,
  maxMp: 80,
  xp: 340,
  maxXp: 500,
  level: 4,
  gold: 85,
  streak: 12,
  questProgress: { daily1: 4, daily2: 2, party1: 18 },
  partyMembers: [
    { name: 'Yuki', classType: 'mage' },
    { name: 'Riku', classType: 'warrior' },
    { name: 'Sora', classType: 'rogue' },
  ],
  inventory: [],
};

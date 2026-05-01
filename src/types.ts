import type { Dispatch, SetStateAction } from 'react';

export type ClassType = 'mage' | 'warrior' | 'rogue' | 'scholar';
export type ScreenName = 'onboarding' | 'home' | 'lesson' | 'loot' | 'profile';

export interface Hero {
  name: string;
  classType: ClassType;
}

export interface PartyMember {
  name: string;
  classType: ClassType;
}

export type ItemType =
  | 'sword'
  | 'shield'
  | 'potion'
  | 'scroll'
  | 'helmet'
  | 'bow'
  | 'staff'
  | 'gem';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic';

export interface InventoryItem {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  jp: string;
  bonus: string;
  desc?: string;
}

export interface GameState {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  xp: number;
  maxXp: number;
  level: number;
  gold: number;
  streak: number;
  questProgress: Record<string, number>;
  partyMembers: PartyMember[];
  inventory: InventoryItem[];
}

export interface Tweaks {
  accentColor: string;
  panelStyle: 'dark' | 'warm' | 'cool';
  fontSize: number;
  showPartyQuest: boolean;
  heroName: string;
}

export interface ScreenProps {
  hero: Hero;
  gameState: GameState;
  setGameState: Dispatch<SetStateAction<GameState>>;
  setScreen: (screen: ScreenName) => void;
}

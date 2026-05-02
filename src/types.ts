import type { Dispatch, SetStateAction } from 'react';

export type ClassType = 'mage' | 'warrior' | 'rogue' | 'scholar';
export type ScreenName = 'onboarding' | 'home' | 'dungeon' | 'lesson' | 'loot' | 'profile';

export type EquipmentSlot = 'head' | 'chest' | 'legs';

export interface Equipment {
  head: InventoryItem | null;
  chest: InventoryItem | null;
  legs: InventoryItem | null;
}

export interface Hero {
  name: string;
  classType: ClassType;
  equipment: Equipment;
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
  slot?: EquipmentSlot;
}

export type AbilityTier = 'weak' | 'medium' | 'strong';

export interface Ability {
  id: string;
  tier: AbilityTier;
  label: string;
  baseDamage: number;
  lessonQuestions: number;
}

export interface MonsterLootEntry {
  goldMin: number;
  goldMax: number;
  itemDropChance: number;
  guaranteedItem?: boolean;
}

export interface Monster {
  id: string;
  name: string;
  emoji: string;
  maxHp: number;
  isBoss: boolean;
  counterDamage: number;
  loot: MonsterLootEntry;
}

export interface DungeonState {
  dungeonId: string;
  currentMonsterIndex: number;
  currentMonsterHp: number;
  lastAbilityUsedAt: number | null;
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
  dungeonState: DungeonState;
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
  setHero: Dispatch<SetStateAction<Hero | null>>;
  gameState: GameState;
  setGameState: Dispatch<SetStateAction<GameState>>;
  setScreen: (screen: ScreenName) => void;
}

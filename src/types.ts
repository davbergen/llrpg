// Shared-types hub for LinguaQuest. Single source of TypeScript types used
// across screens and the App shell: Hero, GameState, Tweaks, ScreenName,
// ClassType, and ScreenProps. Game-mechanic types live next to their modules
// under src/game/ and are re-imported here.

import type { Dispatch, SetStateAction } from 'react';
import type { ManaState } from './game/mana';
import type { SecondaryResources } from './game/secondary-resources';
import type { StreakState } from './game/streak';
import type { GemLedger } from './game/gem-ledger';

export type ClassType = 'mage' | 'warrior' | 'priest';
export type ScreenName =
  | 'onboarding'
  | 'home'
  | 'dungeon'
  | 'lesson'
  | 'loot'
  | 'profile'
  | 'shop'
  | 'settings';

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
  /** Boss heals this much HP at the end of each player turn (after damage applied). */
  regenPerTurn?: number;
  /** When boss HP fraction drops below this, counter damage is multiplied by `enrageCounterMultiplier`. */
  enrageBelowPct?: number;
  enrageCounterMultiplier?: number;
}

export interface DungeonProgress {
  currentMonsterIndex: number;
  currentMonsterHp: number;
  /** Epoch ms of the most recent action against this dungeon. 0 = never visited. */
  lastActionAt: number;
  cleared: boolean;
}

export interface DungeonState {
  activeDungeonId: string;
  progress: Record<string, DungeonProgress>;
  /** Damage-buff multiplier queued by the previous ability, consumed on the next damaging ability. */
  pendingDamageMultiplier?: number;
}

export interface ShopState {
  /** Day-key (YYYY-MM-DD) of the most recent visit. Reset clears purchases + rerolls. */
  date: string | null;
  rerollCount: number;
  /** Item ids purchased today — removed from the visible shop until tomorrow. */
  purchasedIds: string[];
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
  questProgress: Record<string, number>;
  partyMembers: PartyMember[];
  inventory: InventoryItem[];
  dungeonState: DungeonState;
  mana: ManaState;
  secondaryResources: SecondaryResources;
  streakState: StreakState;
  gems: GemLedger;
  shop: ShopState;
}

export type { ManaState, SecondaryResources, StreakState, GemLedger };

export interface Tweaks {
  accentColor: string;
  panelStyle: 'dark' | 'warm' | 'cool';
  fontSize: number;
  showPartyQuest: boolean;
  heroName: string;
  debugMode: boolean;
}

export interface ScreenProps {
  hero: Hero;
  setHero: Dispatch<SetStateAction<Hero | null>>;
  gameState: GameState;
  setGameState: Dispatch<SetStateAction<GameState>>;
  setScreen: (screen: ScreenName) => void;
  /** Consume an inventory item by index (Mana Elixir, etc.). */
  consumeItem: (index: number) => void;
}

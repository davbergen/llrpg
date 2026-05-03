import type { Ability, DungeonState, Monster } from '../types';

export const DUNGEON_ID = 'forest-of-first-words';
export const DUNGEON_NAME = 'Forest of First Words';

export const DUNGEON_MONSTERS: Monster[] = [
  {
    id: 'kana-slime',
    name: 'Kana Slime',
    emoji: '🟢',
    maxHp: 30,
    isBoss: false,
    counterDamage: 4,
    loot: { goldMin: 5, goldMax: 12, itemDropChance: 0.25 },
  },
  {
    id: 'hiragana-bat',
    name: 'Hiragana Bat',
    emoji: '🦇',
    maxHp: 45,
    isBoss: false,
    counterDamage: 7,
    loot: { goldMin: 8, goldMax: 18, itemDropChance: 0.35 },
  },
  {
    id: 'kanji-wolf',
    name: 'Kanji Wolf',
    emoji: '🐺',
    maxHp: 60,
    isBoss: false,
    counterDamage: 10,
    loot: { goldMin: 12, goldMax: 25, itemDropChance: 0.5 },
  },
  {
    id: 'grammar-dragon',
    name: 'Grammar Dragon',
    emoji: '🐉',
    maxHp: 120,
    isBoss: true,
    counterDamage: 15,
    loot: { goldMin: 40, goldMax: 80, itemDropChance: 1, guaranteedItem: true },
  },
];

export const ABILITIES: Ability[] = [
  { id: 'weak', tier: 'weak', label: 'Quick Strike', baseDamage: 12, lessonQuestions: 1 },
  { id: 'medium', tier: 'medium', label: 'Power Strike', baseDamage: 28, lessonQuestions: 2 },
  { id: 'strong', tier: 'strong', label: 'Ultra Strike', baseDamage: 60, lessonQuestions: 3 },
];

export function initialDungeonState(): DungeonState {
  return {
    dungeonId: DUNGEON_ID,
    currentMonsterIndex: 0,
    currentMonsterHp: DUNGEON_MONSTERS[0].maxHp,
    lastAbilityUsedAt: null,
  };
}

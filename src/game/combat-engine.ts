import type {
  AbilityTier,
  DungeonState,
  InventoryItem,
  Monster,
} from '../types';
import { ABILITIES, DUNGEON_MONSTERS } from './dungeon';

export interface ApplyAbilityInput {
  dungeonState: DungeonState;
  abilityTier: AbilityTier;
  lessonAccuracy: number;
  equipmentDamageBonus: number;
  now?: number;
  rollLoot?: (monster: Monster) => InventoryItem[];
}

export interface ApplyAbilityResult {
  nextDungeonState: DungeonState;
  damageDealt: number;
  counterDamage: number;
  monsterDefeated: boolean;
  dungeonCleared: boolean;
  lootDrops: InventoryItem[];
  xpGained: number;
  lastAbilityUsedAt: number;
}

function findAbility(tier: AbilityTier) {
  const ability = ABILITIES.find((a) => a.tier === tier);
  if (!ability) throw new Error(`Unknown ability tier: ${tier}`);
  return ability;
}

export function applyAbility(input: ApplyAbilityInput): ApplyAbilityResult {
  const {
    dungeonState,
    abilityTier,
    lessonAccuracy,
    equipmentDamageBonus,
    now = Date.now(),
    rollLoot,
  } = input;

  if (dungeonState.currentMonsterIndex >= DUNGEON_MONSTERS.length) {
    throw new Error('Cannot apply ability: dungeon already cleared');
  }

  const ability = findAbility(abilityTier);
  const monster = DUNGEON_MONSTERS[dungeonState.currentMonsterIndex];

  const clampedAccuracy = Math.max(0, Math.min(1, lessonAccuracy));
  const damageDealt = Math.round((ability.baseDamage + equipmentDamageBonus) * clampedAccuracy);
  const monsterHpAfter = Math.max(0, dungeonState.currentMonsterHp - damageDealt);
  const monsterDefeated = monsterHpAfter === 0;

  const nextIndex = monsterDefeated
    ? dungeonState.currentMonsterIndex + 1
    : dungeonState.currentMonsterIndex;
  const nextMonster = DUNGEON_MONSTERS[nextIndex];
  const dungeonCleared = monsterDefeated && monster.isBoss && nextIndex >= DUNGEON_MONSTERS.length;

  const counterDamage = monsterDefeated ? 0 : monster.counterDamage;
  const lootDrops = monsterDefeated && rollLoot ? rollLoot(monster) : [];
  const xpGained = damageDealt;

  const nextDungeonState: DungeonState = {
    ...dungeonState,
    currentMonsterIndex: nextIndex,
    currentMonsterHp: monsterDefeated
      ? nextMonster?.maxHp ?? 0
      : monsterHpAfter,
    lastAbilityUsedAt: now,
  };

  return {
    nextDungeonState,
    damageDealt,
    counterDamage,
    monsterDefeated,
    dungeonCleared,
    lootDrops,
    xpGained,
    lastAbilityUsedAt: now,
  };
}

export function clampPlayerHp(hp: number): number {
  return Math.max(1, hp);
}

import type { DungeonState, InventoryItem, Monster, SecondaryResources } from '../types';
import { DUNGEON_MONSTERS } from './dungeon';
import type { ClassAbility } from './class-abilities';
import {
  canAffordSecondary,
  gainSecondary,
  spendSecondary,
} from './secondary-resources';

export const KILL_XP_REGULAR = 50;
export const KILL_XP_BOSS = 200;

export interface ApplyAbilityInput {
  dungeonState: DungeonState;
  ability: ClassAbility;
  lessonAccuracy: number;
  equipmentDamageBonus: number;
  secondaryResources: SecondaryResources;
  rollLoot?: (monster: Monster) => InventoryItem[];
  rollGold?: (monster: Monster) => number;
}

export interface ApplyAbilityResult {
  nextDungeonState: DungeonState;
  nextSecondaryResources: SecondaryResources;
  damageDealt: number;
  counterDamage: number;
  selfHeal: number;
  monsterDefeated: boolean;
  dungeonCleared: boolean;
  lootDrops: InventoryItem[];
  goldGained: number;
  xpGained: number;
}

export function applyAbility(input: ApplyAbilityInput): ApplyAbilityResult {
  const {
    dungeonState,
    ability,
    lessonAccuracy,
    equipmentDamageBonus,
    secondaryResources,
    rollLoot,
    rollGold,
  } = input;

  if (dungeonState.currentMonsterIndex >= DUNGEON_MONSTERS.length) {
    throw new Error('Cannot apply ability: dungeon already cleared');
  }

  if (!canAffordSecondary(secondaryResources, ability.classType, ability.secondaryCost)) {
    throw new Error(
      `Cannot apply ability ${ability.id}: insufficient secondary resource ` +
        `(needed ${ability.secondaryCost})`,
    );
  }

  const monster = DUNGEON_MONSTERS[dungeonState.currentMonsterIndex];

  const clampedAccuracy = Math.max(0, Math.min(1, lessonAccuracy));
  const pendingMult = dungeonState.pendingDamageMultiplier ?? 1;
  const rawDamage = (ability.baseDamage + equipmentDamageBonus) * clampedAccuracy * pendingMult;
  const damageDealt = ability.baseDamage > 0 ? Math.round(rawDamage) : 0;

  const monsterHpAfter = Math.max(0, dungeonState.currentMonsterHp - damageDealt);
  const monsterDefeated = damageDealt > 0 && monsterHpAfter === 0;

  const nextIndex = monsterDefeated
    ? dungeonState.currentMonsterIndex + 1
    : dungeonState.currentMonsterIndex;
  const nextMonster = DUNGEON_MONSTERS[nextIndex];
  const dungeonCleared = monsterDefeated && monster.isBoss && nextIndex >= DUNGEON_MONSTERS.length;

  const counterReduction = ability.effects
    .filter((e): e is { kind: 'counter_reduction'; fraction: number } => e.kind === 'counter_reduction')
    .reduce((acc, e) => Math.min(1, acc + e.fraction), 0);
  const baseCounter = monsterDefeated ? 0 : monster.counterDamage;
  const counterDamage = Math.round(baseCounter * (1 - counterReduction));

  const selfHeal = ability.effects
    .filter((e): e is { kind: 'self_heal'; amount: number } => e.kind === 'self_heal')
    .reduce((acc, e) => acc + e.amount, 0);

  const queuedMultiplier = ability.effects.find(
    (e): e is { kind: 'damage_buff_next'; multiplier: number } => e.kind === 'damage_buff_next',
  )?.multiplier;

  const lootDrops = monsterDefeated && rollLoot ? rollLoot(monster) : [];
  const goldGained = monsterDefeated && rollGold ? rollGold(monster) : 0;
  const xpGained = monsterDefeated ? (monster.isBoss ? KILL_XP_BOSS : KILL_XP_REGULAR) : 0;

  // Consumed pending multiplier on any damaging ability; preserved for non-damage abilities.
  const consumedMultiplier = ability.baseDamage > 0;
  const carriedMultiplier = consumedMultiplier
    ? undefined
    : dungeonState.pendingDamageMultiplier;
  const nextPendingMultiplier = queuedMultiplier ?? carriedMultiplier;

  const nextDungeonState: DungeonState = {
    ...dungeonState,
    currentMonsterIndex: nextIndex,
    currentMonsterHp: monsterDefeated ? nextMonster?.maxHp ?? 0 : monsterHpAfter,
    pendingDamageMultiplier: nextPendingMultiplier,
  };

  let nextSecondaryResources = secondaryResources;
  nextSecondaryResources = spendSecondary(
    nextSecondaryResources,
    ability.classType,
    ability.secondaryCost,
  );
  // Generation only fires when an offensive ability actually connects (damageDealt > 0).
  if (damageDealt > 0) {
    nextSecondaryResources = gainSecondary(
      nextSecondaryResources,
      ability.classType,
      ability.secondaryGain,
    );
  }

  return {
    nextDungeonState,
    nextSecondaryResources,
    damageDealt,
    counterDamage,
    selfHeal,
    monsterDefeated,
    dungeonCleared,
    lootDrops,
    goldGained,
    xpGained,
  };
}

export function clampPlayerHp(hp: number): number {
  return Math.max(1, hp);
}

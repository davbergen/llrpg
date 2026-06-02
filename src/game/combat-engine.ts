import type {
  DungeonProgress,
  DungeonState,
  InventoryItem,
  Monster,
  SecondaryResources,
} from '../types';
import { getDungeon } from '../content/dungeons';
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
  /** Streak buff multiplier additive — e.g. 0.07 for a 7-day streak. Defaults to 0. */
  streakBuff?: number;
  /** Epoch ms; stored on the active dungeon's progress. Defaults to Date.now(). */
  now?: number;
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
    streakBuff = 0,
    now = Date.now(),
  } = input;

  const dungeon = getDungeon(dungeonState.activeDungeonId);
  const monsters = dungeon.monsters;
  const progress = dungeonState.progress[dungeonState.activeDungeonId];
  if (!progress) {
    throw new Error(
      `No progress entry for active dungeon "${dungeonState.activeDungeonId}"`,
    );
  }

  if (progress.currentMonsterIndex >= monsters.length) {
    throw new Error('Cannot apply ability: dungeon already cleared');
  }

  if (!canAffordSecondary(secondaryResources, ability.classType, ability.secondaryCost)) {
    throw new Error(
      `Cannot apply ability ${ability.id}: insufficient secondary resource ` +
        `(needed ${ability.secondaryCost})`,
    );
  }

  const monster = monsters[progress.currentMonsterIndex];

  const clampedAccuracy = Math.max(0, Math.min(1, lessonAccuracy));
  const pendingMult = dungeonState.pendingDamageMultiplier ?? 1;
  const streakMult = 1 + Math.max(0, streakBuff);
  const rawDamage =
    (ability.baseDamage + equipmentDamageBonus) * clampedAccuracy * streakMult * pendingMult;
  const damageDealt = ability.baseDamage > 0 ? Math.round(rawDamage) : 0;

  const hpAfterDamage = Math.max(0, progress.currentMonsterHp - damageDealt);
  const monsterDefeated = damageDealt > 0 && hpAfterDamage === 0;

  // Boss regen: applied at end of player turn if monster survives.
  const regen = !monsterDefeated && monster.isBoss ? monster.regenPerTurn ?? 0 : 0;
  const monsterHpAfter = Math.min(monster.maxHp, hpAfterDamage + regen);

  const nextIndex = monsterDefeated
    ? progress.currentMonsterIndex + 1
    : progress.currentMonsterIndex;
  const nextMonster = monsters[nextIndex];
  const dungeonCleared = monsterDefeated && monster.isBoss && nextIndex >= monsters.length;

  const counterReduction = ability.effects
    .filter((e): e is { kind: 'counter_reduction'; fraction: number } => e.kind === 'counter_reduction')
    .reduce((acc, e) => Math.min(1, acc + e.fraction), 0);
  // Boss enrage: counter scales when boss HP fraction drops below threshold.
  const enraged =
    monster.isBoss &&
    !monsterDefeated &&
    monster.enrageBelowPct != null &&
    monsterHpAfter / monster.maxHp < monster.enrageBelowPct;
  const enrageMult = enraged ? monster.enrageCounterMultiplier ?? 1 : 1;
  const baseCounter = monsterDefeated ? 0 : monster.counterDamage * enrageMult;
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

  const consumedMultiplier = ability.baseDamage > 0;
  const carriedMultiplier = consumedMultiplier
    ? undefined
    : dungeonState.pendingDamageMultiplier;
  const nextPendingMultiplier = queuedMultiplier ?? carriedMultiplier;

  const nextProgress: DungeonProgress = {
    currentMonsterIndex: nextIndex,
    currentMonsterHp: monsterDefeated ? nextMonster?.maxHp ?? 0 : monsterHpAfter,
    lastActionAt: now,
    cleared: dungeonCleared,
  };

  const nextDungeonState: DungeonState = {
    ...dungeonState,
    progress: {
      ...dungeonState.progress,
      [dungeonState.activeDungeonId]: nextProgress,
    },
    pendingDamageMultiplier: nextPendingMultiplier,
  };

  let nextSecondaryResources = secondaryResources;
  nextSecondaryResources = spendSecondary(
    nextSecondaryResources,
    ability.classType,
    ability.secondaryCost,
  );
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

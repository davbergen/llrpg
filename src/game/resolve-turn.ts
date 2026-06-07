import type { GameState, Hero, InventoryItem, Monster } from '../types';
import { getActiveMonsters } from './dungeon';
import { applyAbility, resolvePlayerHp } from './combat-engine';
import type { ClassAbility } from './class-abilities';
import { emptySecondaryResources } from './secondary-resources';
import {
  resolveMana,
  spendMana,
  applyFirstLessonBonus,
  initialManaState,
} from './mana';
import { tickStreak, streakBuff, initialStreakState } from './streak';
import {
  creditGems,
  GEMS_PER_BOSS,
  GEMS_PER_STREAK_MILESTONE,
  initialGemLedger,
} from './gem-ledger';
import { addXp } from './progression';
import { calcStats } from './stats';
import { STREAK_MILESTONE_GOLD } from './streak-milestones';

/**
 * The slice of GameState that a combat turn rewrites. Everything else on
 * GameState (mp/maxMp, questProgress, partyMembers, shop) is untouched and the
 * caller preserves it by spreading the previous state.
 */
export type TurnStateSlice = Pick<
  GameState,
  | 'hp'
  | 'maxHp'
  | 'xp'
  | 'level'
  | 'maxXp'
  | 'gold'
  | 'inventory'
  | 'dungeonState'
  | 'mana'
  | 'secondaryResources'
  | 'streakState'
  | 'gems'
>;

/** Parameters the Dungeon screen needs to play the ability animation. */
export interface TurnAnimation {
  abilityId: string;
  damage: number;
  heal: number;
  counterDamage: number;
  killed: boolean;
}

export interface ResolveTurnInput {
  ability: ClassAbility;
  /** Lesson accuracy in [0, 1]; 1 in debug mode. */
  lessonAccuracy: number;
  gameState: GameState;
  hero: Hero;
  /** Single epoch-ms timestamp used for every time-dependent step this turn. */
  now: number;
  /** Debug mode skips the mana charge (infinite MP). */
  debugMode: boolean;
  /** Loot roller, invoked only on a kill. Injected so the result stays pure/testable. */
  rollLoot?: (monster: Monster) => InventoryItem[];
  /** Gold roller, invoked only on a kill. Injected so the result stays pure/testable. */
  rollGold?: (monster: Monster) => number;
}

export interface TurnResult {
  /** Next-state slice to merge into GameState. */
  nextState: TurnStateSlice;
  /** The active monster's HP reached 0 this turn. */
  monsterDefeated: boolean;
  /** The boss died and the dungeon is now cleared. */
  dungeonCleared: boolean;
  /** The monster's counter was lethal (and no level-up saved the player). */
  playerDefeated: boolean;
  /** The XP awarded this turn pushed the hero up at least one level. */
  leveledUp: boolean;
  /** Hero level after the turn. */
  newLevel: number;
  /** XP awarded this turn (kills only — ADR-0001). */
  xpGained: number;
  /** Gold from the kill (excludes streak-milestone gold, already folded into nextState.gold). */
  goldGained: number;
  /** Items dropped by the kill. */
  loot: InventoryItem[];
  /** Defeated monster's name, for the loot screen. Undefined when nothing died. */
  monsterName?: string;
  /** Whether the Dungeon screen should play an animation before the commit lands. */
  wantsAnimation: boolean;
  /** Animation parameters when `wantsAnimation`, else null. */
  animation: TurnAnimation | null;
}

/**
 * Resolve one combat turn into a next-state slice plus outcome flags, with no
 * React dependency. This is the decision chain that used to live inline in
 * App.tsx: apply ability → award kill XP → level/max-HP delta → resolve player
 * HP → defeat-vs-retreat → tick streak → credit gems + milestone gold → spend
 * mana + first-lesson bonus → secondary resources.
 *
 * Preserves XP-from-kills-only (ADR-0001 — `result.xpGained` is the sole XP
 * source) and the inverted damage-per-MP curve (ADR-0002 — lives in the combat
 * engine, untouched here).
 */
export function resolveTurn(input: ResolveTurnInput): TurnResult {
  const { ability, lessonAccuracy, gameState, hero, now, debugMode, rollLoot, rollGold } = input;

  const activeMonsters = getActiveMonsters(gameState.dungeonState);
  const activeProgress = gameState.dungeonState.progress[gameState.dungeonState.activeDungeonId];
  const monster = activeProgress ? activeMonsters[activeProgress.currentMonsterIndex] : undefined;
  const streakState = gameState.streakState ?? initialStreakState();

  const result = applyAbility({
    dungeonState: gameState.dungeonState,
    ability,
    secondaryResources: gameState.secondaryResources ?? emptySecondaryResources(),
    lessonAccuracy,
    equipmentDamageBonus: calcStats(hero, hero.equipment, gameState.level).damageBonus,
    streakBuff: streakBuff(streakState.count),
    now,
    rollLoot: monster ? rollLoot : undefined,
    rollGold: monster ? rollGold : undefined,
  });

  // XP comes only from monster/boss kills (ADR-0001): the combat engine's
  // xpGained is the sole source. Answering lesson questions grants no XP — the
  // "studying is rewarded" intent lives in FSRS scheduling and the streak buff.
  const totalXpDelta = result.xpGained;
  const progress = addXp(
    { xp: gameState.xp, level: gameState.level, maxXp: gameState.maxXp },
    totalXpDelta,
  );

  const nextMaxHp = gameState.maxHp + progress.maxHpDelta;
  const hpOutcome = resolvePlayerHp({
    hp: gameState.hp,
    counterDamage: result.counterDamage,
    selfHeal: result.selfHeal,
    maxHp: nextMaxHp,
  });
  // Leveling up restores HP, so a level-up earned this turn saves you from an
  // otherwise-lethal counter.
  const playerDefeated = !progress.leveledUp && hpOutcome.defeated;
  // Defeat cost (B1/#79): retreat to the current monster, fully healed.
  const nextHp = progress.leveledUp || playerDefeated ? nextMaxHp : hpOutcome.hp;

  const activeId = gameState.dungeonState.activeDungeonId;
  const resourcesAfterRun =
    result.dungeonCleared || playerDefeated
      ? emptySecondaryResources()
      : result.nextSecondaryResources;
  const dungeonAfterRun = result.dungeonCleared
    ? { ...result.nextDungeonState, pendingDamageMultiplier: undefined }
    : playerDefeated
      ? {
          // Retreat: reset the current monster's HP to full and clear queued buffs.
          ...result.nextDungeonState,
          progress: {
            ...result.nextDungeonState.progress,
            [activeId]: {
              ...result.nextDungeonState.progress[activeId],
              currentMonsterHp:
                monster?.maxHp ?? result.nextDungeonState.progress[activeId].currentMonsterHp,
            },
          },
          pendingDamageMultiplier: undefined,
        }
      : result.nextDungeonState;

  const tickResult = tickStreak(streakState, now);
  let nextLedger = gameState.gems ?? initialGemLedger();
  if (result.monsterDefeated && monster?.isBoss) {
    nextLedger = creditGems(nextLedger, GEMS_PER_BOSS, 'boss_kill', now);
  }
  let milestoneGold = 0;
  if (tickResult.milestonesCrossed > 0) {
    nextLedger = creditGems(
      nextLedger,
      GEMS_PER_STREAK_MILESTONE * tickResult.milestonesCrossed,
      'streak_milestone',
      now,
    );
    milestoneGold = STREAK_MILESTONE_GOLD * tickResult.milestonesCrossed;
  }

  // Deferred charge (#4): the ability's mana is spent here, at turn resolution,
  // not when the lesson began — so backing out of a lesson costs nothing. Debug
  // mode keeps infinite mana (never charged).
  const baseMana = resolveMana(gameState.mana ?? initialManaState(now), now);
  const afterSpend = debugMode ? baseMana : spendMana(baseMana, ability.mpCost);
  const manaAfterBonus = afterSpend.firstLessonBonusUsedToday
    ? afterSpend
    : applyFirstLessonBonus(afterSpend);

  const nextState: TurnStateSlice = {
    hp: nextHp,
    maxHp: nextMaxHp,
    xp: progress.xp,
    level: progress.level,
    maxXp: progress.maxXp,
    gold: gameState.gold + result.goldGained + milestoneGold,
    inventory: [...gameState.inventory, ...result.lootDrops],
    dungeonState: dungeonAfterRun,
    mana: manaAfterBonus,
    secondaryResources: resourcesAfterRun,
    streakState: tickResult.state,
    gems: nextLedger,
  };

  const hasShieldEffect = ability.effects.some((e) => e.kind === 'counter_reduction');
  const wantsAnimation =
    result.damageDealt > 0 || result.selfHeal > 0 || (ability.baseDamage === 0 && hasShieldEffect);

  return {
    nextState,
    monsterDefeated: result.monsterDefeated,
    dungeonCleared: result.dungeonCleared,
    playerDefeated,
    leveledUp: progress.leveledUp,
    newLevel: progress.level,
    xpGained: totalXpDelta,
    goldGained: result.goldGained,
    loot: result.lootDrops,
    monsterName: monster?.name,
    wantsAnimation,
    animation: wantsAnimation
      ? {
          abilityId: ability.id,
          damage: result.damageDealt,
          heal: result.selfHeal,
          counterDamage: result.counterDamage,
          killed: result.monsterDefeated,
        }
      : null,
  };
}

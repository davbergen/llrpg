// Headless balance simulation over the pure game/ engines.
//
// `simulate()` runs many Monte-Carlo fight trials of a player archetype against
// a dungeon and reports the metrics the balance bands are judged on. It drives
// the *real* combat engine (applyAbility) so the sim cannot drift from gameplay.
//
// See docs/GOAL-content-balance.md. This module measures; it never decides what
// "balanced" is — that lives in bands.ts (human-owned).

import type { ClassType, DungeonState, Equipment, Hero, Monster } from '../types';
import type { ParsedDungeon } from '../content/dungeons';
import { applyAbility } from '../game/combat-engine';
import {
  unlockedAbilities,
  type ClassAbility,
} from '../game/class-abilities';
import { calcStats } from '../game/stats';
import { MANA_MAX, FIRST_LESSON_BONUS } from '../game/mana';
import {
  canAffordSecondary,
  emptySecondaryResources,
} from '../game/secondary-resources';
import { SIM_TRIALS, type PlayerArchetype } from './bands';

const EMPTY_EQUIPMENT: Equipment = { head: null, chest: null, legs: null };

// Safety caps to bound a single boss fight. A fight that exceeds these is
// treated as a loss (the player can never out-damage boss regen, or the day
// budget loops forever) rather than spinning the simulator.
const CAST_CAP = 200;
const REST_CAP = 60;

export interface SimResult {
  winRate: number;
  /** Mean ability-casts spent on the boss across winning trials (rounded). */
  castsToBoss: number;
  /** Mean player HP fraction at the moment the boss dies, across wins. */
  endHpFraction: number;
  /** True if any monster's worst-case counter can drop a full-HP player to 0. */
  anyOneShot: boolean;
}

/** Deterministic 32-bit PRNG (mulberry32) — reproducible trials. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(...parts: (string | number)[]): number {
  let h = 2166136261;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function heroFor(classType: ClassType): Hero {
  return { name: 'sim', classType, equipment: EMPTY_EQUIPMENT };
}

function selfHealAmount(ability: ClassAbility): number {
  return ability.effects
    .filter((e): e is { kind: 'self_heal'; amount: number } => e.kind === 'self_heal')
    .reduce((sum, e) => sum + e.amount, 0);
}

/** Worst-case (fully-enraged) counter a monster can deal in a single turn. */
export function maxEffectiveCounter(monster: Monster): number {
  const enrageMult = monster.isBoss ? monster.enrageCounterMultiplier ?? 1 : 1;
  return Math.round(monster.counterDamage * enrageMult);
}

/** True if any monster one-shots a full-HP player at the given level. */
export function dungeonOneShots(dungeon: ParsedDungeon, level: number): boolean {
  const maxHp = calcStats(heroFor('mage'), EMPTY_EQUIPMENT, level).maxHp;
  return dungeon.monsters.some((m) => maxEffectiveCounter(m) >= maxHp);
}

function damageBuffMultiplier(ability: ClassAbility): number {
  const buff = ability.effects.find(
    (e): e is { kind: 'damage_buff_next'; multiplier: number } => e.kind === 'damage_buff_next',
  );
  return buff?.multiplier ?? 1;
}

function counterReductionFraction(ability: ClassAbility): number {
  return ability.effects
    .filter((e): e is { kind: 'counter_reduction'; fraction: number } => e.kind === 'counter_reduction')
    .reduce((acc, e) => Math.min(1, acc + e.fraction), 0);
}

/**
 * Per-cast policy a competent player would follow, made class-aware so the sim
 * reflects skilled play rather than a naive "always nuke" loop. This is sim
 * *fidelity*, not a balance knob — it changes how well the simulated player
 * uses the existing kit, never the kit's numbers or the bands.
 *
 * Priority each cast, given current HP, mana and secondary resource:
 *  1. Survival: if a heal exists and we're hurt enough that the incoming counter
 *     could plausibly kill within ~2 turns, heal (biggest heal that helps).
 *  2. Spend a queued damage buff (e.g. Berserker Roar → next hit) by following
 *     it with the hardest hit, so the buff is never wasted.
 *  3. Offense: hit hardest, but prefer abilities that *gain* secondary when we
 *     can't yet afford our premium spender, so rage/faith actually accumulates
 *     toward Execute / Judgment instead of starving.
 * Returns null when nothing is affordable (out of mana → rest).
 */
function chooseAbility(
  abilities: ClassAbility[],
  mana: number,
  secondary: ReturnType<typeof emptySecondaryResources>,
  classType: ClassType,
  hp: number,
  maxHp: number,
  incomingCounter: number,
  buffQueued: boolean,
): ClassAbility | null {
  const affordable = abilities.filter(
    (a) =>
      a.mpCost <= mana &&
      canAffordSecondary(secondary, classType, a.secondaryCost),
  );
  if (affordable.length === 0) return null;

  // 1. Survival. Heal when the fight could end us soon: either low absolute HP
  //    or the next couple of counters would drop us past 0.
  const heals = affordable.filter((a) => selfHealAmount(a) > 0);
  if (heals.length > 0) {
    const lethalSoon = hp <= incomingCounter * 2 || hp / maxHp < 0.35;
    // Don't heal if we're already topped up enough that a heal would overheal.
    const biggestHeal = heals.reduce((best, a) =>
      selfHealAmount(a) > selfHealAmount(best) ? a : best,
    );
    if (lethalSoon && hp + selfHealAmount(biggestHeal) > hp) {
      return biggestHeal;
    }
  }

  const damagers = affordable.filter((a) => a.baseDamage > 0);

  // 2. If a damage buff is queued, cash it in with the hardest available hit.
  if (buffQueued && damagers.length > 0) {
    return damagers.reduce((best, a) => (a.baseDamage > best.baseDamage ? a : best));
  }

  if (damagers.length === 0) {
    // Only non-damaging options affordable (e.g. a buff/shield). Prefer queuing
    // a damage buff; else take the strongest mitigation; else anything.
    const buffs = affordable.filter((a) => damageBuffMultiplier(a) > 1);
    if (buffs.length > 0) {
      return buffs.reduce((best, a) =>
        damageBuffMultiplier(a) > damageBuffMultiplier(best) ? a : best,
      );
    }
    const mitigations = affordable.filter((a) => counterReductionFraction(a) > 0);
    if (mitigations.length > 0) {
      return mitigations.reduce((best, a) =>
        counterReductionFraction(a) > counterReductionFraction(best) ? a : best,
      );
    }
    return affordable[0];
  }

  // 3. Offense. The strongest hit overall is our premium spender; if it isn't
  //    affordable yet (gated by secondary), build toward it with the best
  //    secondary-gaining strike rather than dumping resources elsewhere.
  const strongestKnown = abilities.reduce((best, a) =>
    a.baseDamage > best.baseDamage ? a : best,
  );
  const premiumAffordable = affordable.some((a) => a.id === strongestKnown.id);
  if (!premiumAffordable && (strongestKnown.secondaryCost ?? 0) > 0) {
    const builders = damagers.filter((a) => (a.secondaryGain ?? 0) > 0);
    if (builders.length > 0) {
      return builders.reduce((best, a) =>
        (a.secondaryGain ?? 0) > (best.secondaryGain ?? 0) ||
        ((a.secondaryGain ?? 0) === (best.secondaryGain ?? 0) && a.baseDamage > best.baseDamage)
          ? a
          : best,
      );
    }
  }

  return damagers.reduce((best, a) => (a.baseDamage > best.baseDamage ? a : best));
}

function rollAccuracy(questions: number, p: number, rng: () => number): number {
  let correct = 0;
  for (let i = 0; i < questions; i++) {
    if (rng() < p) correct++;
  }
  return questions > 0 ? correct / questions : 1;
}

interface RunOutcome {
  won: boolean;
  bossCasts: number;
  endHpFraction: number;
}

/**
 * One boss fight, boss-centric per the balance bands.
 *
 * The bands ("win rate", "boss dies in N casts", "ends the boss fight with
 * <60% HP") are all phrased about the *boss*, so the sim measures the boss
 * fight directly. The player arrives **rested** — full HP, a fresh day's mana,
 * empty rage/faith (secondary resets on dungeon exit) — the real game's state
 * on entering the final room after healing at Home.
 *
 * Within the boss fight HP is the binding resource: it carries down through the
 * whole encounter and is never restored except by a class's own heal abilities.
 * Mana is *not* meant to gate the fight — a real player spreads a boss across
 * days, grinding lessons to refresh mana while the boss keeps its HP (PRD user
 * story 34). So when the day's mana runs out the player "rests" (mana +
 * secondary refresh) but takes **no** heal; the boss's accumulated damage
 * stands. This makes the win-rate gradient respond to the sanctioned knobs
 * (boss maxHp / counter / regen / enrage): more boss HP ⇒ more casts ⇒ more
 * counters absorbed ⇒ lower win rate, and lower-accuracy archetypes need more
 * casts per kill, so they die more often — exactly what the bands judge.
 */
function simulateRun(
  dungeon: ParsedDungeon,
  classType: ClassType,
  level: number,
  accuracy: number,
  rng: () => number,
): RunOutcome {
  const monsters = dungeon.monsters;
  const bossIndex = monsters.length - 1;
  const boss = monsters[bossIndex];
  const abilities = unlockedAbilities(classType, level);
  const maxHp = calcStats(heroFor(classType), EMPTY_EQUIPMENT, level).maxHp;

  const dayMana = MANA_MAX + FIRST_LESSON_BONUS; // daily budget incl. first-lesson bonus

  let hp = maxHp;
  let mana = dayMana;
  let secondary = emptySecondaryResources();
  let state: DungeonState = {
    activeDungeonId: dungeon.meta.id,
    progress: {
      [dungeon.meta.id]: {
        currentMonsterIndex: bossIndex,
        currentMonsterHp: boss.maxHp,
        lastActionAt: 0,
        cleared: false,
      },
    },
  };

  let bossCasts = 0;
  let rests = 0;

  while (true) {
    const incomingCounter = maxEffectiveCounter(boss);
    const buffQueued = (state.pendingDamageMultiplier ?? 1) > 1;
    const ability = chooseAbility(
      abilities,
      mana,
      secondary,
      classType,
      hp,
      maxHp,
      incomingCounter,
      buffQueued,
    );
    if (!ability) {
      // Day's mana spent: grind lessons overnight to refresh mana (and rebuild
      // rage/faith from scratch). No heal — the boss keeps the damage it dealt.
      if (++rests > REST_CAP) return { won: false, bossCasts, endHpFraction: 0 };
      mana = dayMana;
      secondary = emptySecondaryResources();
      continue;
    }

    const accuracyRoll = rollAccuracy(ability.lessonQuestions, accuracy, rng);
    mana -= ability.mpCost;

    const res = applyAbility({
      dungeonState: state,
      ability,
      lessonAccuracy: accuracyRoll,
      equipmentDamageBonus: 0,
      secondaryResources: secondary,
      now: 0,
    });
    state = res.nextDungeonState;
    secondary = res.nextSecondaryResources;
    bossCasts++;

    hp = Math.min(maxHp, hp - res.counterDamage + res.selfHeal);

    if (bossCasts > CAST_CAP) return { won: false, bossCasts, endHpFraction: 0 };
    if (hp <= 0) return { won: false, bossCasts, endHpFraction: 0 };
    if (res.dungeonCleared) return { won: true, bossCasts, endHpFraction: hp / maxHp };
  }
}

export interface SimulateOptions {
  trials?: number;
  seed?: number;
}

/**
 * Run `trials` Monte-Carlo runs of one archetype/class/level against a dungeon.
 * Matches the GOAL signature: returns { winRate, castsToBoss, endHpFraction,
 * anyOneShot }.
 */
export function simulate(
  dungeon: ParsedDungeon,
  archetype: PlayerArchetype,
  classType: ClassType,
  level: number,
  options: SimulateOptions = {},
): SimResult {
  const trials = options.trials ?? SIM_TRIALS;
  const baseSeed = options.seed ?? hashSeed(dungeon.meta.id, classType, level, archetype.id);
  const rng = mulberry32(baseSeed);

  let wins = 0;
  let bossCastSum = 0;
  let endHpSum = 0;

  for (let i = 0; i < trials; i++) {
    const outcome = simulateRun(dungeon, classType, level, archetype.accuracy, rng);
    if (outcome.won) {
      wins++;
      bossCastSum += outcome.bossCasts;
      endHpSum += outcome.endHpFraction;
    }
  }

  return {
    winRate: trials > 0 ? wins / trials : 0,
    castsToBoss: wins > 0 ? Math.round(bossCastSum / wins) : 0,
    endHpFraction: wins > 0 ? endHpSum / wins : 0,
    anyOneShot: dungeonOneShots(dungeon, level),
  };
}

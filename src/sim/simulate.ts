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
import { freshProgress } from '../game/dungeon';
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

// Safety caps to bound a single run. A run that exceeds these is treated as a
// loss (the fight either drags forever or the player can never out-damage boss
// regen) rather than looping the simulator.
const CAST_CAP = 500;
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

/**
 * Greedy per-cast policy: heal when hurt, otherwise hit hardest affordable.
 * Returns null when the player can afford no ability (out of mana → must rest).
 */
function chooseAbility(
  abilities: ClassAbility[],
  mana: number,
  secondary: ReturnType<typeof emptySecondaryResources>,
  classType: ClassType,
  hpFraction: number,
): ClassAbility | null {
  const affordable = abilities.filter(
    (a) =>
      a.mpCost <= mana &&
      canAffordSecondary(secondary, classType, a.secondaryCost),
  );
  if (affordable.length === 0) return null;

  if (hpFraction < 0.5) {
    const heals = affordable.filter((a) => selfHealAmount(a) > 0);
    if (heals.length > 0) {
      return heals.reduce((best, a) =>
        selfHealAmount(a) > selfHealAmount(best) ? a : best,
      );
    }
  }

  const damagers = affordable.filter((a) => a.baseDamage > 0);
  if (damagers.length > 0) {
    return damagers.reduce((best, a) => (a.baseDamage > best.baseDamage ? a : best));
  }
  return affordable[0];
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
 * One continuous dungeon run. HP carries across the whole run (threat-
 * preserving: a rest restores mana only, never HP — the real game's home-regen
 * only makes the player's life easier, so passing bands here is conservative).
 */
function simulateRun(
  dungeon: ParsedDungeon,
  classType: ClassType,
  level: number,
  accuracy: number,
  rng: () => number,
): RunOutcome {
  const monsters = dungeon.monsters;
  const abilities = unlockedAbilities(classType, level);
  const maxHp = calcStats(heroFor(classType), EMPTY_EQUIPMENT, level).maxHp;

  let hp = maxHp;
  let mana = MANA_MAX + FIRST_LESSON_BONUS; // first-lesson bonus, once per run
  let secondary = emptySecondaryResources();
  let state: DungeonState = {
    activeDungeonId: dungeon.meta.id,
    progress: { [dungeon.meta.id]: freshProgress(monsters) },
  };

  let bossCasts = 0;
  let casts = 0;
  let rests = 0;

  while (true) {
    const progress = state.progress[dungeon.meta.id];
    const monster = monsters[progress.currentMonsterIndex];
    if (!monster) return { won: true, bossCasts, endHpFraction: hp / maxHp };

    const ability = chooseAbility(abilities, mana, secondary, classType, hp / maxHp);
    if (!ability) {
      // Out of mana: rest restores mana only.
      if (++rests > REST_CAP) return { won: false, bossCasts, endHpFraction: 0 };
      mana = MANA_MAX;
      continue;
    }

    const accuracyRoll = rollAccuracy(ability.lessonQuestions, accuracy, rng);
    mana -= ability.mpCost;
    const wasBoss = monster.isBoss;

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
    if (wasBoss) bossCasts++;

    hp = Math.min(maxHp, hp - res.counterDamage + res.selfHeal);

    if (++casts > CAST_CAP) return { won: false, bossCasts, endHpFraction: 0 };
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

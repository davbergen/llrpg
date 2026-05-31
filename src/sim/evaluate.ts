// Band evaluation: run every class against a dungeon at its intended level and
// decide whether it passes the human-owned bands in bands.ts.
//
// This is the measuring stick the loop tunes game-side knobs against. It never
// loosens a band — it only reports pass/fail and why.

import type { ClassType } from '../types';
import type { ParsedDungeon } from '../content/dungeons';
import {
  ARCHETYPES,
  GUARDRAIL_BANDS,
  TYPICAL_BANDS,
  type PlayerArchetype,
} from './bands';
import { simulate, type SimResult, type SimulateOptions } from './simulate';

const CLASSES: ClassType[] = ['mage', 'warrior', 'priest'];

export interface ClassEvaluation {
  classType: ClassType;
  struggling: SimResult;
  typical: SimResult;
  strong: SimResult;
}

export interface DungeonEvaluation {
  dungeonId: string;
  level: number;
  pass: boolean;
  failures: string[];
  classes: ClassEvaluation[];
}

function evaluateClass(
  dungeon: ParsedDungeon,
  classType: ClassType,
  level: number,
  options: SimulateOptions,
): ClassEvaluation {
  const run = (a: PlayerArchetype) => simulate(dungeon, a, classType, level, options);
  return {
    classType,
    struggling: run(ARCHETYPES.struggling),
    typical: run(ARCHETYPES.typical),
    strong: run(ARCHETYPES.strong),
  };
}

/**
 * Evaluate a dungeon at its intended level across all three classes and check
 * every band. Returns the full per-class results plus a flat list of band
 * failures (empty ⇒ pass).
 */
export function evaluateDungeon(
  dungeon: ParsedDungeon,
  level: number,
  options: SimulateOptions = {},
): DungeonEvaluation {
  const classes = CLASSES.map((c) => evaluateClass(dungeon, c, level, options));
  const failures: string[] = [];

  // Per-class bands: typical win rate, boss-cast count, struggling guardrail.
  for (const c of classes) {
    const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
    if (c.typical.winRate < TYPICAL_BANDS.winRateMin || c.typical.winRate > TYPICAL_BANDS.winRateMax) {
      failures.push(
        `${c.classType}: typical win rate ${pct(c.typical.winRate)} outside ` +
          `${pct(TYPICAL_BANDS.winRateMin)}–${pct(TYPICAL_BANDS.winRateMax)}`,
      );
    }
    if (
      c.typical.winRate > 0 &&
      (c.typical.castsToBoss < TYPICAL_BANDS.bossCastsMin ||
        c.typical.castsToBoss > TYPICAL_BANDS.bossCastsMax)
    ) {
      failures.push(
        `${c.classType}: boss dies in ${c.typical.castsToBoss} casts, outside ` +
          `${TYPICAL_BANDS.bossCastsMin}–${TYPICAL_BANDS.bossCastsMax}`,
      );
    }
    if (c.struggling.winRate < GUARDRAIL_BANDS.strugglingWinRateMin) {
      failures.push(
        `${c.classType}: struggling win rate ${pct(c.struggling.winRate)} below ` +
          `guardrail ${pct(GUARDRAIL_BANDS.strugglingWinRateMin)}`,
      );
    }
  }

  // One-shot guardrail (class-independent: maxHp does not vary by class).
  if (classes[0].typical.anyOneShot) {
    failures.push('a monster one-shots a typical player at intended level');
  }

  // "At least one class" bands.
  const someClassThreatening = classes.some(
    (c) => c.typical.winRate > 0 && c.typical.endHpFraction > 0 && c.typical.endHpFraction < TYPICAL_BANDS.threatHpMax,
  );
  if (!someClassThreatening) {
    failures.push(
      `no class ends the boss fight inside (0, ${(TYPICAL_BANDS.threatHpMax * 100).toFixed(0)}%) HP — not threatening`,
    );
  }

  if (GUARDRAIL_BANDS.strongMustLoseHp) {
    const someStrongLosesHp = classes.some((c) => c.strong.winRate > 0 && c.strong.endHpFraction < 1);
    if (!someStrongLosesHp) {
      failures.push('strong player is 100%-trivial (ends every winnable fight at full HP)');
    }
  }

  return {
    dungeonId: dungeon.meta.id,
    level,
    pass: failures.length === 0,
    failures,
    classes,
  };
}

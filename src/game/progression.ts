export const HP_PER_LEVEL = 10;

export interface ProgressionState {
  xp: number;
  level: number;
  /**
   * XP needed to clear the *current* level. Derived from `xpThresholdForLevel`;
   * carried on the state only so the XP bar can render xp/maxXp without
   * recomputing. `addXp` ignores the incoming value and always uses the curve.
   */
  maxXp: number;
}

export interface AddXpResult extends ProgressionState {
  leveledUp: boolean;
  levelsGained: number;
  maxHpDelta: number;
}

/**
 * Geometric XP curve: each level costs 1.5× the previous. Tuned so a first full
 * clear of all three dungeons (~2,340 XP at good accuracy) lands the player near
 * level 7 — cumulative thresholds L1→L7 total ≈ 2,078 XP — matching the level-7
 * ability ceiling in `class-abilities.ts`.
 */
export function xpThresholdForLevel(level: number): number {
  return Math.round(100 * Math.pow(1.5, Math.max(1, level) - 1));
}

export function addXp(state: ProgressionState, delta: number): AddXpResult {
  let xp = Math.max(0, state.xp + delta);
  let level = state.level;
  let levelsGained = 0;
  let threshold = xpThresholdForLevel(level);

  while (xp >= threshold) {
    xp -= threshold;
    level += 1;
    levelsGained += 1;
    threshold = xpThresholdForLevel(level);
  }

  return {
    xp,
    level,
    maxXp: threshold,
    leveledUp: levelsGained > 0,
    levelsGained,
    maxHpDelta: levelsGained * HP_PER_LEVEL,
  };
}

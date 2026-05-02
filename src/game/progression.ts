export const HP_PER_LEVEL = 10;

export interface ProgressionState {
  xp: number;
  level: number;
  maxXp: number;
}

export interface AddXpResult extends ProgressionState {
  leveledUp: boolean;
  levelsGained: number;
  maxHpDelta: number;
}

export function addXp(state: ProgressionState, delta: number): AddXpResult {
  if (state.maxXp <= 0) throw new Error('maxXp must be positive');

  let xp = Math.max(0, state.xp + delta);
  let level = state.level;
  let levelsGained = 0;

  while (xp >= state.maxXp) {
    xp -= state.maxXp;
    level += 1;
    levelsGained += 1;
  }

  return {
    xp,
    level,
    maxXp: state.maxXp,
    leveledUp: levelsGained > 0,
    levelsGained,
    maxHpDelta: levelsGained * HP_PER_LEVEL,
  };
}

import { HP_PER_LEVEL } from './progression';

export interface CombatResolutionInput {
  /** Player HP at the start of the turn, before this turn's counter/heal. */
  currentHp: number;
  maxHp: number;
  /** Counter damage the monster dealt this turn (already reduced by shields). */
  counterDamage: number;
  /** HP restored by the ability's self-heal effect this turn. */
  selfHeal: number;
  /** Levels gained from the XP awarded this turn. */
  levelsGained: number;
}

export interface CombatResolutionResult {
  /** Player HP after the turn. 0 when the run ended in death. */
  hp: number;
  /** Max HP after the turn — grows by HP_PER_LEVEL per level gained. */
  maxHp: number;
  /** True when counter damage met or exceeded the HP carried into the turn. */
  died: boolean;
}

/**
 * Resolves the player's HP for one combat turn (a committed lesson).
 *
 * Rules encoded here (the playtest fix):
 * - A level-up adds `HP_PER_LEVEL` to max HP and heals only that increment —
 *   never a full refill (the old "immortal" bug came from full-healing on
 *   every level-up, which happened almost every fight under the flat curve).
 * - Death is possible: the run ends when counter damage meets or exceeds the
 *   HP carried into the turn. Self-heal and the level-up increment raise HP for
 *   *subsequent* turns but do not retroactively prevent this turn's lethal hit.
 */
export function resolveCombat({
  currentHp,
  maxHp,
  counterDamage,
  selfHeal,
  levelsGained,
}: CombatResolutionInput): CombatResolutionResult {
  const maxHpDelta = Math.max(0, levelsGained) * HP_PER_LEVEL;
  const nextMaxHp = maxHp + maxHpDelta;

  const died = counterDamage >= currentHp;
  if (died) {
    return { hp: 0, maxHp: nextMaxHp, died: true };
  }

  const raw = currentHp - counterDamage + selfHeal + maxHpDelta;
  const hp = Math.max(1, Math.min(nextMaxHp, raw));
  return { hp, maxHp: nextMaxHp, died: false };
}

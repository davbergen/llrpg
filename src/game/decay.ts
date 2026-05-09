export const DAY_MS = 24 * 60 * 60 * 1000;
export const GRACE_DAYS = 2;
export const DECAY_FRACTION_PER_DAY = 0.2;

export interface DecayInput {
  /** Epoch ms of the most recent action against this monster. 0 = never visited. */
  lastActionAt: number;
  currentHp: number;
  maxHp: number;
  isBoss: boolean;
}

/**
 * Returns how much HP to regen onto the monster for the period since `lastActionAt`.
 *
 * Rule: 20% of missing HP per full day skipped, applied only after a 2-day
 * grace period. Bosses are immune. Result clamps to (maxHp - currentHp).
 */
export function calculateDecay(input: DecayInput, now: number): number {
  const { lastActionAt, currentHp, maxHp, isBoss } = input;
  if (isBoss) return 0;
  if (currentHp >= maxHp) return 0;
  if (lastActionAt <= 0) return 0;
  const elapsedMs = now - lastActionAt;
  if (elapsedMs <= GRACE_DAYS * DAY_MS) return 0;

  const daysAfterGrace = Math.floor(elapsedMs / DAY_MS) - GRACE_DAYS;
  if (daysAfterGrace <= 0) return 0;

  const missing = maxHp - currentHp;
  const regen = missing * DECAY_FRACTION_PER_DAY * daysAfterGrace;
  return Math.min(missing, Math.round(regen));
}

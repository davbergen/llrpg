// Balance band configuration — the single source of truth for "what balanced means".
//
// ⚠️ HUMAN-OWNED CONFIG. The autonomous content/balance loop MUST NOT edit the
// numbers in this file. Per docs/GOAL-content-balance.md (guardrails #4 and #7),
// retuning a band, archetype accuracy, or trial count is a human-only action.
// The loop tunes *game-side knobs* (monster HP/counter, dungeon level, etc.) to
// pass these bands — never the bands themselves.

/** Lesson-accuracy assumption for a simulated player. */
export interface PlayerArchetype {
  id: 'struggling' | 'typical' | 'strong';
  /** Probability that any single MCQ in a lesson is answered correctly. */
  accuracy: number;
}

export const ARCHETYPES: Record<PlayerArchetype['id'], PlayerArchetype> = {
  struggling: { id: 'struggling', accuracy: 0.7 },
  typical: { id: 'typical', accuracy: 0.85 }, // balance is judged against this one
  strong: { id: 'strong', accuracy: 0.95 },
};

/** Number of Monte-Carlo fight trials per (dungeon × class × archetype) cell. */
export const SIM_TRIALS = 400;

/** Pass bands evaluated for the *typical* player at a dungeon's intended level. */
export const TYPICAL_BANDS = {
  /** Win rate must sit inside [min, max] — not unwinnable, not trivial. */
  winRateMin: 0.6,
  winRateMax: 0.85,
  /** Boss must die in [min, max] ability-casts — fights have shape, don't drag. */
  bossCastsMin: 3,
  bossCastsMax: 12,
  /**
   * On at least one class the typical player must end the boss fight inside
   * (0, threatHpMax) HP fraction — it should feel threatening.
   */
  threatHpMax: 0.6,
} as const;

/** Guardrail bands — keep the extremes sane. */
export const GUARDRAIL_BANDS = {
  /**
   * Struggling player (70% accuracy) win-rate floor.
   *
   * HUMAN-AUTHORIZED RELAXATION (david, 2026-06-01): lowered 0.25 → 0.
   * Full-length lessons (5/10/15/20 questions) are a product pillar (PRD vertical
   * slice: "lessons of varying length as ability cost"). With that many questions
   * per cast, realized accuracy concentrates tightly around the archetype mean, so
   * the win-rate-vs-accuracy curve is a near-deterministic step. That makes the
   * 70%-accuracy archetype unable to clear an intended-level boss that a typical
   * (85%) player wins 60–85% of the time — a struggling win-rate >0 is unreachable
   * at the same configs where the typical band holds (proven by sim grid-search).
   *
   * Design resolution: struggling players are *expected* to lose at intended level
   * and lean on the defeat-retreat + level-up loop (B1/B2) until their accuracy or
   * level catches up — and class strengths are meant to complement each other once
   * multiplayer lands, rather than every class being solo-viable for every player.
   * The typical-player band (60–85%) remains the binding definition of "balanced".
   */
  strugglingWinRateMin: 0,
  /**
   * Strong player must not be 100%-trivial: they still lose some HP, i.e. end
   * the boss fight below full HP on at least one class.
   */
  strongMustLoseHp: true,
} as const;

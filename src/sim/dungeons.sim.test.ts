// The balance gate. Runs every dungeon through the bands and fails if any
// dungeon is out of band. Invoked via `npm run sim` (a dedicated vitest config),
// NOT by `npm test` — it is the tuning target the loop drives toward, and is
// expected to stay red until all dungeons are authored and tuned (DoD finish).
//
// Per docs/GOAL-content-balance.md guardrail #4/#7: do not make this pass by
// editing the sim or loosening bands. Only game-side knobs may change.

import { describe, it, expect } from 'vitest';
import { DUNGEONS } from '../content/dungeons';
import { evaluateDungeon, type DungeonEvaluation } from './evaluate';

function formatLine(e: DungeonEvaluation): string {
  const cls = e.classes
    .map(
      (c) =>
        `${c.classType[0]}:win ${(c.typical.winRate * 100).toFixed(0)}% ` +
        `boss ${c.typical.castsToBoss} hp ${(c.typical.endHpFraction * 100).toFixed(0)}%`,
    )
    .join(' | ');
  return `${e.pass ? 'PASS' : 'FAIL'} ${e.dungeonId} @L${e.level}  ${cls}`;
}

describe('balance bands', () => {
  const results = DUNGEONS.map((d) => evaluateDungeon(d, d.meta.intendedLevel));

  // Human-readable report regardless of pass/fail.
  const report = [
    '\n=== Balance band report ===',
    ...results.flatMap((e) => [formatLine(e), ...e.failures.map((f) => `     ✗ ${f}`)]),
  ].join('\n');
  process.stdout.write(`${report}\n`);

  it('has exactly 8 tiered dungeons (DoD B)', () => {
    expect(DUNGEONS.length).toBe(8);
  });

  for (const d of DUNGEONS) {
    it(`${d.meta.id} passes the bands at its intended level`, () => {
      const e = evaluateDungeon(d, d.meta.intendedLevel);
      expect(e.failures).toEqual([]);
    });
  }
});

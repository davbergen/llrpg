import { describe, expect, it } from 'vitest';
import { addXp, HP_PER_LEVEL } from './progression';

describe('progression', () => {
  it('accumulates xp without leveling when below threshold', () => {
    const result = addXp({ xp: 10, level: 1, maxXp: 100 }, 30);
    expect(result.xp).toBe(40);
    expect(result.level).toBe(1);
    expect(result.leveledUp).toBe(false);
    expect(result.levelsGained).toBe(0);
    expect(result.maxHpDelta).toBe(0);
  });

  it('rolls xp into a single level on transition', () => {
    const result = addXp({ xp: 80, level: 2, maxXp: 100 }, 25);
    expect(result.level).toBe(3);
    expect(result.xp).toBe(5);
    expect(result.leveledUp).toBe(true);
    expect(result.levelsGained).toBe(1);
    expect(result.maxHpDelta).toBe(HP_PER_LEVEL);
  });

  it('lands on the threshold exactly, leveling up with xp = 0', () => {
    const result = addXp({ xp: 90, level: 1, maxXp: 100 }, 10);
    expect(result.level).toBe(2);
    expect(result.xp).toBe(0);
    expect(result.leveledUp).toBe(true);
    expect(result.levelsGained).toBe(1);
  });

  it('does not set leveledUp when no level transition occurs', () => {
    const result = addXp({ xp: 0, level: 1, maxXp: 100 }, 0);
    expect(result.leveledUp).toBe(false);
    expect(result.levelsGained).toBe(0);
    expect(result.maxHpDelta).toBe(0);
  });

  it('compounds max-HP increment across multi-level deltas', () => {
    const result = addXp({ xp: 10, level: 1, maxXp: 100 }, 250);
    expect(result.levelsGained).toBe(2);
    expect(result.level).toBe(3);
    expect(result.xp).toBe(60);
    expect(result.leveledUp).toBe(true);
    expect(result.maxHpDelta).toBe(HP_PER_LEVEL * 2);
  });

  it('handles a delta that crosses many levels at once', () => {
    const result = addXp({ xp: 0, level: 1, maxXp: 50 }, 175);
    expect(result.levelsGained).toBe(3);
    expect(result.level).toBe(4);
    expect(result.xp).toBe(25);
    expect(result.maxHpDelta).toBe(HP_PER_LEVEL * 3);
  });

  it('clamps a negative-resulting xp at 0 without dropping levels', () => {
    const result = addXp({ xp: 10, level: 3, maxXp: 100 }, -50);
    expect(result.xp).toBe(0);
    expect(result.level).toBe(3);
    expect(result.leveledUp).toBe(false);
  });
});

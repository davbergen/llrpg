import { describe, expect, it } from 'vitest';
import { addXp, xpThresholdForLevel, HP_PER_LEVEL } from './progression';

describe('xpThresholdForLevel', () => {
  it('grows geometrically at 1.5× per level', () => {
    expect(xpThresholdForLevel(1)).toBe(100);
    expect(xpThresholdForLevel(2)).toBe(150);
    expect(xpThresholdForLevel(3)).toBe(225);
    expect(xpThresholdForLevel(4)).toBe(338);
    expect(xpThresholdForLevel(5)).toBe(506);
    expect(xpThresholdForLevel(6)).toBe(759);
  });

  it('cumulative cost to reach level 7 is ~2,078 XP', () => {
    let total = 0;
    for (let lvl = 1; lvl <= 6; lvl++) total += xpThresholdForLevel(lvl);
    expect(total).toBe(2078);
  });
});

describe('progression', () => {
  it('accumulates xp without leveling when below threshold', () => {
    const result = addXp({ xp: 10, level: 1, maxXp: 100 }, 30);
    expect(result.xp).toBe(40);
    expect(result.level).toBe(1);
    expect(result.leveledUp).toBe(false);
    expect(result.levelsGained).toBe(0);
    expect(result.maxHpDelta).toBe(0);
    expect(result.maxXp).toBe(100);
  });

  it('rolls xp into a single level on transition using the per-level threshold', () => {
    // Level 2 threshold is 150; 130 + 25 = 155 → level 3 with 5 carryover.
    const result = addXp({ xp: 130, level: 2, maxXp: 150 }, 25);
    expect(result.level).toBe(3);
    expect(result.xp).toBe(5);
    expect(result.leveledUp).toBe(true);
    expect(result.levelsGained).toBe(1);
    expect(result.maxHpDelta).toBe(HP_PER_LEVEL);
    expect(result.maxXp).toBe(xpThresholdForLevel(3));
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

  it('climbs multiple levels in one gain, charging each per-level threshold', () => {
    // From L1, xp 0: 100 (→L2) + 150 (→L3) = 250 spent; 260 leaves 10 into L3.
    const result = addXp({ xp: 0, level: 1, maxXp: 100 }, 260);
    expect(result.levelsGained).toBe(2);
    expect(result.level).toBe(3);
    expect(result.xp).toBe(10);
    expect(result.leveledUp).toBe(true);
    expect(result.maxHpDelta).toBe(HP_PER_LEVEL * 2);
    expect(result.maxXp).toBe(xpThresholdForLevel(3));
  });

  it('slows down: the same XP that cleared early levels no longer levels later ones', () => {
    // 200 XP clears L1 (100) with room to spare, but does not clear L3 (225).
    expect(addXp({ xp: 0, level: 1, maxXp: 100 }, 200).level).toBe(2);
    expect(addXp({ xp: 0, level: 3, maxXp: 225 }, 200).level).toBe(3);
  });

  it('clamps a negative-resulting xp at 0 without dropping levels', () => {
    const result = addXp({ xp: 10, level: 3, maxXp: 225 }, -50);
    expect(result.xp).toBe(0);
    expect(result.level).toBe(3);
    expect(result.leveledUp).toBe(false);
  });
});

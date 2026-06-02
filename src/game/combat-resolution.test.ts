import { describe, expect, it } from 'vitest';
import { resolveCombat } from './combat-resolution';
import { HP_PER_LEVEL } from './progression';

describe('resolveCombat', () => {
  it('subtracts counter damage from HP when no level-up or heal', () => {
    const r = resolveCombat({
      currentHp: 80,
      maxHp: 100,
      counterDamage: 30,
      selfHeal: 0,
      levelsGained: 0,
    });
    expect(r.hp).toBe(50);
    expect(r.maxHp).toBe(100);
    expect(r.died).toBe(false);
  });

  it('adds self-heal on top of the post-counter HP, capped at max', () => {
    const r = resolveCombat({
      currentHp: 40,
      maxHp: 100,
      counterDamage: 10,
      selfHeal: 25,
      levelsGained: 0,
    });
    expect(r.hp).toBe(55);
    expect(r.died).toBe(false);
  });

  it('never exceeds max HP', () => {
    const r = resolveCombat({
      currentHp: 95,
      maxHp: 100,
      counterDamage: 0,
      selfHeal: 55,
      levelsGained: 0,
    });
    expect(r.hp).toBe(100);
  });

  it('heals only the level-up increment — not a full refill', () => {
    const r = resolveCombat({
      currentHp: 30,
      maxHp: 100,
      counterDamage: 0,
      selfHeal: 0,
      levelsGained: 1,
    });
    expect(r.maxHp).toBe(110);
    expect(r.hp).toBe(30 + HP_PER_LEVEL); // 40, not 110
    expect(r.died).toBe(false);
  });

  it('grows max HP by HP_PER_LEVEL per level across a multi-level gain', () => {
    const r = resolveCombat({
      currentHp: 50,
      maxHp: 100,
      counterDamage: 0,
      selfHeal: 0,
      levelsGained: 3,
    });
    expect(r.maxHp).toBe(130);
    expect(r.hp).toBe(50 + HP_PER_LEVEL * 3);
  });

  it('dies when counter damage exceeds current HP', () => {
    const r = resolveCombat({
      currentHp: 20,
      maxHp: 100,
      counterDamage: 35,
      selfHeal: 0,
      levelsGained: 0,
    });
    expect(r.died).toBe(true);
    expect(r.hp).toBe(0);
  });

  it('dies when counter damage exactly meets current HP', () => {
    const r = resolveCombat({
      currentHp: 20,
      maxHp: 100,
      counterDamage: 20,
      selfHeal: 0,
      levelsGained: 0,
    });
    expect(r.died).toBe(true);
    expect(r.hp).toBe(0);
  });

  it('survives with 1 HP when counter is one short of lethal', () => {
    const r = resolveCombat({
      currentHp: 20,
      maxHp: 100,
      counterDamage: 19,
      selfHeal: 0,
      levelsGained: 0,
    });
    expect(r.died).toBe(false);
    expect(r.hp).toBe(1);
  });

  it('a same-turn self-heal does not retroactively prevent a lethal hit', () => {
    const r = resolveCombat({
      currentHp: 20,
      maxHp: 100,
      counterDamage: 25,
      selfHeal: 25,
      levelsGained: 0,
    });
    expect(r.died).toBe(true);
    expect(r.hp).toBe(0);
  });

  it('still grows max HP on a level-up gained on the lethal turn', () => {
    const r = resolveCombat({
      currentHp: 10,
      maxHp: 100,
      counterDamage: 15,
      selfHeal: 0,
      levelsGained: 1,
    });
    expect(r.died).toBe(true);
    expect(r.maxHp).toBe(110);
    expect(r.hp).toBe(0);
  });
});

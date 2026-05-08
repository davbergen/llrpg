import { describe, expect, it } from 'vitest';
import {
  emptySecondaryResources,
  resetSecondaryResources,
  gainRage,
  spendRage,
  gainFaith,
  spendFaith,
  gainSecondary,
  spendSecondary,
  canAffordSecondary,
  RAGE_MAX,
  FAITH_MAX,
} from './secondary-resources';

describe('secondary-resources', () => {
  it('starts at zero rage / zero faith', () => {
    expect(emptySecondaryResources()).toEqual({ rage: 0, faith: 0 });
  });

  describe('rage generation/consumption', () => {
    it('caps rage at RAGE_MAX', () => {
      const s = gainRage(emptySecondaryResources(), RAGE_MAX + 5);
      expect(s.rage).toBe(RAGE_MAX);
    });

    it('cannot spend more rage than available', () => {
      expect(() => spendRage({ rage: 1, faith: 0 }, 2)).toThrow();
    });

    it('spends down to zero', () => {
      expect(spendRage({ rage: 5, faith: 0 }, 5).rage).toBe(0);
    });
  });

  describe('faith generation/consumption', () => {
    it('caps faith at FAITH_MAX', () => {
      const s = gainFaith(emptySecondaryResources(), FAITH_MAX + 100);
      expect(s.faith).toBe(FAITH_MAX);
    });

    it('cannot spend more faith than available', () => {
      expect(() => spendFaith({ rage: 0, faith: 2 }, 3)).toThrow();
    });
  });

  describe('class-keyed helpers', () => {
    it('canAffordSecondary returns true for mages regardless of cost (no cost expected)', () => {
      expect(canAffordSecondary({ rage: 0, faith: 0 }, 'mage', undefined)).toBe(true);
    });

    it('canAffordSecondary on mage with a non-zero cost is false (mages have no resource)', () => {
      // Mage abilities never declare a cost; this guards against malformed data.
      expect(canAffordSecondary({ rage: 0, faith: 0 }, 'mage', 1)).toBe(false);
    });

    it('canAffordSecondary checks rage for warrior', () => {
      expect(canAffordSecondary({ rage: 5, faith: 0 }, 'warrior', 5)).toBe(true);
      expect(canAffordSecondary({ rage: 4, faith: 0 }, 'warrior', 5)).toBe(false);
    });

    it('canAffordSecondary checks faith for priest', () => {
      expect(canAffordSecondary({ rage: 0, faith: 6 }, 'priest', 6)).toBe(true);
      expect(canAffordSecondary({ rage: 0, faith: 5 }, 'priest', 6)).toBe(false);
    });

    it('gainSecondary routes to the right resource', () => {
      expect(gainSecondary(emptySecondaryResources(), 'warrior', 3).rage).toBe(3);
      expect(gainSecondary(emptySecondaryResources(), 'priest', 3).faith).toBe(3);
      // mages get nothing
      expect(gainSecondary(emptySecondaryResources(), 'mage', 3)).toEqual({ rage: 0, faith: 0 });
    });

    it('spendSecondary routes to the right resource', () => {
      expect(spendSecondary({ rage: 5, faith: 0 }, 'warrior', 3).rage).toBe(2);
      expect(spendSecondary({ rage: 0, faith: 5 }, 'priest', 3).faith).toBe(2);
    });

    it('spendSecondary is a no-op when cost is undefined or zero', () => {
      expect(spendSecondary({ rage: 5, faith: 0 }, 'warrior', undefined).rage).toBe(5);
      expect(spendSecondary({ rage: 5, faith: 0 }, 'warrior', 0).rage).toBe(5);
    });
  });

  describe('dungeon-exit reset', () => {
    it('resetSecondaryResources zeroes both pools', () => {
      const before = { rage: 7, faith: 9 };
      const after = resetSecondaryResources();
      expect(after).toEqual({ rage: 0, faith: 0 });
      // immutability: original untouched
      expect(before).toEqual({ rage: 7, faith: 9 });
    });
  });
});

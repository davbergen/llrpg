import { describe, expect, it } from 'vitest';
import { SAVE_KEY, loadSave, saveSave, wipeSave, type PersistedState } from './save';
import { EMPTY_EQUIPMENT, INITIAL_STATE } from './constants';

function makeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    _map: map,
  };
}

const sampleState: PersistedState = {
  hero: { name: 'Aiko', classType: 'mage', equipment: EMPTY_EQUIPMENT },
  gameState: INITIAL_STATE,
};

describe('save module', () => {
  it('round-trips a known state through saveSave + loadSave', () => {
    const storage = makeStorage();
    saveSave(sampleState, storage);
    expect(loadSave(storage)).toEqual(sampleState);
  });

  it('returns null when the key is absent', () => {
    const storage = makeStorage();
    expect(loadSave(storage)).toBeNull();
  });

  it('returns null on JSON parse failure (does not throw)', () => {
    const storage = makeStorage();
    storage.setItem(SAVE_KEY, '{not json');
    expect(() => loadSave(storage)).not.toThrow();
    expect(loadSave(storage)).toBeNull();
  });

  it('returns null when the stored value is the wrong shape', () => {
    const storage = makeStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({ unrelated: true }));
    expect(loadSave(storage)).toBeNull();
  });

  it('wipeSave clears the key', () => {
    const storage = makeStorage();
    saveSave(sampleState, storage);
    expect(storage._map.has(SAVE_KEY)).toBe(true);
    wipeSave(storage);
    expect(storage._map.has(SAVE_KEY)).toBe(false);
    expect(loadSave(storage)).toBeNull();
  });
});

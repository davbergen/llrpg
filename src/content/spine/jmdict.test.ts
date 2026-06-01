import { describe, expect, it } from 'vitest';
import {
  categoryOf,
  loadJmdictIndex,
  lookupVocab,
  meaningOverlaps,
  validateVocabEntry,
} from './jmdict';
import { readBlessedList } from './blessed';

describe('categoryOf', () => {
  it('maps fine JMdict codes to coarse spine categories', () => {
    expect(categoryOf('n')).toBe('noun');
    expect(categoryOf('v5k')).toBe('verb');
    expect(categoryOf('vs-i')).toBe('verb');
    expect(categoryOf('adj-i')).toBe('adjective');
    expect(categoryOf('adj-na')).toBe('adjective');
    expect(categoryOf('adv')).toBe('adverb');
    expect(categoryOf('pn')).toBe('pronoun');
    expect(categoryOf('prt')).toBe('particle');
    expect(categoryOf('ctr')).toBe('counter');
    expect(categoryOf('exp')).toBe('expression');
  });

  it('falls back to "other" for unknown codes', () => {
    expect(categoryOf('not-a-real-code')).toBe('other');
  });
});

describe('meaningOverlaps', () => {
  it('matches on a shared content word', () => {
    expect(meaningOverlaps('water', ['water', 'cold water'])).toBe(true);
    expect(meaningOverlaps('to drink', ['to drink', 'to gulp'])).toBe(true);
  });

  it('does not match on function words alone', () => {
    expect(meaningOverlaps('to fly', ['to swim'])).toBe(false);
  });

  it('passes vacuously when the meaning has no distinctive token', () => {
    // "to be" reduces to only stopwords, so there is nothing to corroborate.
    expect(meaningOverlaps('to be', ['oh', 'hmm'])).toBe(true);
  });
});

describe('JMdict index', () => {
  const index = loadJmdictIndex();

  it('loads the vendored common dictionary', () => {
    expect(index.version).toMatch(/^3\./);
    expect(index.byForm.size).toBeGreaterThan(10_000);
  });

  it('indexes a word by both its kanji and kana forms', () => {
    expect(index.byForm.has('水')).toBe(true);
    expect(lookupVocab(index, '水', 'みず')).not.toBeNull();
  });

  it('finds kana-only headwords', () => {
    // ああ ("Ah!, Oh!") has no kanji; the kana form is the headword.
    expect(lookupVocab(index, 'ああ', 'ああ')).not.toBeNull();
  });

  it('exposes the primary-sense POS for derivation', () => {
    // 運動 ("exercise") is a noun first, verb (vs) second — primaryPos picks noun.
    expect(lookupVocab(index, '運動', 'うんどう')?.primaryPos).toBe('noun');
    expect(lookupVocab(index, '水', 'みず')?.primaryPos).toBe('noun');
  });
});

describe('validateVocabEntry', () => {
  const index = loadJmdictIndex();

  it('accepts a correct entry', () => {
    expect(validateVocabEntry(index, { jp: '水', reading: 'みず', pos: 'noun', en: 'water' })).toEqual({
      ok: true,
    });
  });

  it('rejects an expression that is not in JMdict common', () => {
    const r = validateVocabEntry(index, { jp: '𡈽', reading: 'よもや', pos: 'noun' });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/not in JMdict common/);
  });

  it('rejects a wrong reading', () => {
    const r = validateVocabEntry(index, { jp: '水', reading: 'まちがい', pos: 'noun' });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/matches no JMdict kana/);
  });

  it('rejects a wrong part-of-speech', () => {
    const r = validateVocabEntry(index, { jp: '水', reading: 'みず', pos: 'verb' });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/not among JMdict senses/);
  });

  it('rejects a meaning that does not overlap any gloss', () => {
    const r = validateVocabEntry(index, { jp: '水', reading: 'みず', pos: 'noun', en: 'volcano' });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/does not overlap/);
  });
});

describe('readBlessedList', () => {
  it('reads the N5 list with the documented row count', () => {
    const rows = readBlessedList('N5');
    expect(rows).toHaveLength(718);
    expect(rows.every((r) => r.level === 'N5')).toBe(true);
    const mizu = rows.find((r) => r.expression === '水');
    expect(mizu?.reading).toBe('みず');
  });

  it('reads the N4 list with the documented row count', () => {
    const rows = readBlessedList('N4');
    expect(rows).toHaveLength(668);
  });

  it('parses quoted fields containing commas', () => {
    const rows = readBlessedList('N5');
    const au = rows.find((r) => r.expression === '会う');
    expect(au?.meaning).toContain('to meet');
    expect(au?.meaning).toContain('to see');
  });
});

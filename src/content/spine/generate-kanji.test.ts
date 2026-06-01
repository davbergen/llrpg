import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateKanji, renderKanjiMarkdown } from './generate-kanji';
import { loadKanjidicIndex, validateKanjiEntry, normalizeReading } from './kanjidic';
import { readKanjiList } from './kanji-membership';
import { parseSpine } from './parser';

const HERE = dirname(fileURLToPath(import.meta.url));
const KANJI_MD = readFileSync(resolve(HERE, 'kanji.md'), 'utf8');

const gen = generateKanji();

describe('normalizeReading', () => {
  it('drops okurigana and prefix/suffix hyphens', () => {
    expect(normalizeReading('た.べる')).toBe('た');
    expect(normalizeReading('-び')).toBe('び');
    expect(normalizeReading('こ-')).toBe('こ');
    expect(normalizeReading('みず')).toBe('みず');
  });
});

describe('kanji spine generation (DoD C)', () => {
  it('emits both blessed kanji lists in full (no residuals, no duplicates)', () => {
    expect(gen.residuals).toEqual([]);
    expect(gen.duplicates).toEqual([]);
    expect(gen.entries.filter((e) => e.jlpt === 'N5').length).toBe(readKanjiList('N5').length);
    expect(gen.entries.filter((e) => e.jlpt === 'N4').length).toBe(readKanjiList('N4').length);
  });

  it('every emitted entry passes the KANJIDIC2 correctness gate', () => {
    const index = loadKanjidicIndex();
    const failures = gen.entries
      .map((e) => ({ e, r: validateKanjiEntry(index, { jp: e.jp, reading: e.reading, en: e.en }) }))
      .filter((x) => !x.r.ok);
    expect(failures.map((f) => `${f.e.id}: ${f.r.reason}`)).toEqual([]);
  });

  it('stores kana readings (no romaji)', () => {
    expect(gen.entries.every((e) => !/[a-z]/i.test(e.reading))).toBe(true);
  });

  it('uses stable, unique ids of the form k:<kanji>', () => {
    const ids = new Set<string>();
    for (const e of gen.entries) {
      expect(e.id).toBe(`k:${e.jp}`);
      expect(ids.has(e.id)).toBe(false);
      ids.add(e.id);
    }
  });

  it('accounts for every blessed kanji (entry | duplicate | residual)', () => {
    for (const level of ['N5', 'N4'] as const) {
      const members = readKanjiList(level).length;
      const entries = gen.entries.filter((e) => e.jlpt === level).length;
      const dups = gen.duplicates.filter((d) => d.level === level).length;
      const resid = gen.residuals.filter((r) => r.level === level).length;
      expect(entries + dups + resid).toBe(members);
    }
  });
});

describe('committed kanji.md is in sync with the generator', () => {
  it('matches renderKanjiMarkdown(generateKanji()) byte-for-byte', () => {
    expect(KANJI_MD).toBe(renderKanjiMarkdown(gen.entries));
  });

  it('parses under the kanji spine schema with matching entry count', () => {
    const parsed = parseSpine(KANJI_MD, { fileType: 'kanji' });
    expect(parsed.length).toBe(gen.entries.length);
  });
});

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateVocab, renderVocabMarkdown, candidatePairs } from './generate-vocab';
import { loadJmdictIndex, validateVocabEntry } from './jmdict';
import { readBlessedList } from './blessed';
import { parseSpine } from './parser';
import { VOCAB_RESIDUALS, residualKey } from './vocab-residuals';

const HERE = dirname(fileURLToPath(import.meta.url));
const VOCAB_MD = readFileSync(resolve(HERE, 'vocab.md'), 'utf8');

const gen = generateVocab();

describe('candidatePairs normalization', () => {
  const keys = (e: string, r: string) => candidatePairs(e, r).map((c) => `${c.jp}/${c.reading}`);

  it('keeps the faithful reading at highest priority', () => {
    expect(candidatePairs('水', 'みず')[0]).toMatchObject({ jp: '水', reading: 'みず' });
  });
  it('splits multi-form rows on ; ；and 、', () => {
    expect(keys('回る、回す', 'まわる、まわす')).toContain('回る/まわる');
    expect(keys('足; 脚', 'あし')).toEqual(expect.arrayContaining(['足/あし', '脚/あし']));
  });
  it('strips ～, honorific, する, さん, adverbial と', () => {
    expect(keys('～円', '～えん')).toContain('円/えん');
    expect(keys('お酒', 'おさけ')).toContain('酒/さけ');
    expect(keys('運動', 'うんどうする')).toContain('運動/うんどう');
    expect(keys('叔父さん', 'おじさん')).toContain('叔父/おじ');
    expect(keys('ゆっくりと', 'ゆっくりと')).toContain('ゆっくり/ゆっくり');
  });
  it('marks reading-as-form candidates meaning-gated', () => {
    const c = candidatePairs('杯', 'はい').find((x) => x.jp === 'はい' && x.reading === 'はい');
    expect(c?.meaningGated).toBe(true);
  });
});

describe('vocab spine generation (DoD C)', () => {
  it('emits the bulk of both blessed lists', () => {
    expect(gen.entries.length).toBeGreaterThan(1300);
    expect(gen.entries.some((e) => e.jlpt === 'N5')).toBe(true);
    expect(gen.entries.some((e) => e.jlpt === 'N4')).toBe(true);
  });

  it('every emitted entry passes the JMdict correctness gate', () => {
    const index = loadJmdictIndex();
    const failures = gen.entries
      .map((e) => ({ e, r: validateVocabEntry(index, { jp: e.jp, reading: e.reading, pos: e.pos, en: e.en }) }))
      .filter((x) => !x.r.ok);
    expect(failures.map((f) => `${f.e.id}: ${f.r.reason}`)).toEqual([]);
  });

  it('stores kana readings (no romaji), not the legacy prototype', () => {
    // Every reading is kana/kanji-free-of-latin; the old spine stored romaji.
    expect(gen.entries.every((e) => !/[a-z]/i.test(e.reading))).toBe(true);
  });

  it('uses stable, unique ids of the form jp:reading', () => {
    const ids = new Set<string>();
    for (const e of gen.entries) {
      expect(e.id).toBe(`${e.jp}:${e.reading}`);
      expect(ids.has(e.id)).toBe(false);
      ids.add(e.id);
    }
  });

  it('accounts for every blessed row (entry | duplicate | documented residual)', () => {
    for (const level of ['N5', 'N4'] as const) {
      const rows = readBlessedList(level).length;
      const entries = gen.entries.filter((e) => e.jlpt === level).length;
      const dups = gen.duplicates.filter((d) => d.row.level === level).length;
      const resid = gen.residuals.filter((r) => r.row.level === level).length;
      expect(entries + dups + resid).toBe(rows);
    }
  });

  it('residual set equals the documented escalation allowlist exactly', () => {
    const got = new Set(gen.residuals.map((r) => residualKey(r.row)));
    const want = new Set(VOCAB_RESIDUALS.map(residualKey));
    expect([...got].sort()).toEqual([...want].sort());
  });
});

describe('committed vocab.md is in sync with the generator', () => {
  it('matches renderVocabMarkdown(generateVocab()) byte-for-byte', () => {
    expect(VOCAB_MD).toBe(renderVocabMarkdown(gen.entries));
  });

  it('parses under the vocab spine schema with matching entry count', () => {
    const parsed = parseSpine(VOCAB_MD, { fileType: 'vocab' });
    expect(parsed.length).toBe(gen.entries.length);
  });
});

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateGrammar, renderGrammarMarkdown } from './generate-grammar';
import { readGrammarList } from './grammar-list';
import { parseSpine } from './parser';

const HERE = dirname(fileURLToPath(import.meta.url));
const GRAMMAR_MD = readFileSync(resolve(HERE, 'grammar.md'), 'utf8');

const gen = generateGrammar();

describe('grammar spine generation (DoD C)', () => {
  it('emits every N5/N4 grammar row from the blessed list', () => {
    const rows = readGrammarList();
    expect(gen.entries.length).toBe(rows.length);
    expect(gen.entries.filter((e) => e.jlpt === 'N5').length).toBe(
      rows.filter((r) => r.level === 'N5').length,
    );
    expect(gen.entries.filter((e) => e.jlpt === 'N4').length).toBe(
      rows.filter((r) => r.level === 'N4').length,
    );
  });

  it('uses stable, unique ids of the form g:<level>-<num>', () => {
    const ids = new Set<string>();
    for (const e of gen.entries) {
      expect(e.id).toMatch(/^g:N[45]-\d+$/);
      expect(ids.has(e.id)).toBe(false);
      ids.add(e.id);
    }
  });

  it('keeps grammar points that share a JP form but differ in meaning', () => {
    // e.g. N5 でも "but" and N4 でも "…or something" are distinct curriculum.
    const demo = gen.entries.filter((e) => e.jp === 'でも');
    expect(demo.length).toBe(2);
    expect(new Set(demo.map((e) => e.id)).size).toBe(2);
  });

  it('every entry is a deterministically-gradable recall MCQ (non-empty jp + en)', () => {
    for (const e of gen.entries) {
      expect(e.jp.length).toBeGreaterThan(0);
      expect(e.en.length).toBeGreaterThan(0);
    }
  });
});

describe('committed grammar.md is in sync with the generator', () => {
  it('matches renderGrammarMarkdown(generateGrammar()) byte-for-byte', () => {
    expect(GRAMMAR_MD).toBe(renderGrammarMarkdown(gen.entries));
  });

  it('parses under the grammar spine schema with a single recall face each', () => {
    const parsed = parseSpine(GRAMMAR_MD, { fileType: 'grammar' });
    expect(parsed.length).toBe(gen.entries.length);
    expect(parsed.every((e) => e.faces.length === 1 && e.faces[0] === 'recall')).toBe(true);
  });
});

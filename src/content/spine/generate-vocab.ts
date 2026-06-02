/**
 * Vocab spine generator -- DoD C / slice C2.
 *
 * Build/test-time ONLY (imports `jmdict.ts` + `blessed.ts`, both of which read
 * `data/vendor/` from disk via `node:fs`; never bundled into the client).
 *
 * Membership comes from the blessed JLPT N5/N4 lists (`blessed.ts`); correctness
 * comes from the vendored JMdict (`jmdict.ts`). For each blessed row we resolve
 * the written form + kana reading against JMdict through a small *mechanical
 * normalization cascade*, then *derive* the part-of-speech from the matched
 * word's primary sense. Nothing here invents curriculum: a row that does not
 * resolve becomes a residual, never a guess.
 *
 * Run it (regenerate `vocab.md`) with:
 *   GEN_VOCAB=1 npx vite-node src/content/spine/generate-vocab.ts
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  loadJmdictIndex,
  lookupVocab,
  meaningOverlaps,
  type JmdictIndex,
  type MatchedWord,
  type PosCategory,
} from './jmdict';
import { readBlessedList, type BlessedRow, type JlptLevel } from './blessed';

export interface GeneratedEntry {
  id: string;
  jp: string;
  reading: string;
  en: string;
  pos: PosCategory;
  jlpt: JlptLevel;
  /** True when `en` fell back to a JMdict gloss because the blessed meaning did
   *  not overlap one (so the stored meaning is still dictionary-corroborated). */
  meaningFromJmdict: boolean;
}

export interface GenResult {
  entries: GeneratedEntry[];
  /** Rows that resolved but collided with an already-emitted id (kept once). */
  duplicates: { row: BlessedRow; id: string }[];
  /** Rows that did not resolve against JMdict after the full cascade. */
  residuals: { row: BlessedRow; tried: string[] }[];
}

// --- normalization primitives -------------------------------------------------

// Alt-form separators used in the blessed lists: ASCII/fullwidth semicolons and
// the Japanese comma (e.g. `回る、回す` / `まわる、まわす`).
const SEP = /[;；、]/;
const WAVE = /[～〜]/g;
const PAREN = /[（(][^）)]*[）)]/g;

function splitForms(s: string): string[] {
  return s
    .split(SEP)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/** A normalization transform: (jp, reading) -> (jp, reading), or null if N/A. */
type Transform = (jp: string, reading: string) => [string, string] | null;

const stripParens: Transform = (jp, r) => {
  const a = jp.replace(PAREN, '').trim();
  const b = r.replace(PAREN, '').trim();
  return a === jp && b === r ? null : [a, b];
};

const stripWave: Transform = (jp, r) => {
  const a = jp.replace(WAVE, '').trim();
  const b = r.replace(WAVE, '').trim();
  return a === jp && b === r ? null : [a, b];
};

// Honorific お / ご prefix carried on both the kanji form and its reading.
const stripHonorific: Transform = (jp, r) => {
  for (const h of ['お', 'ご']) {
    if (jp.startsWith(h) && r.startsWith(h) && jp.length > 1 && r.length > 1) {
      return [jp.slice(1), r.slice(1)];
    }
  }
  return null;
};

// Suru-verb: the bare noun already matches; strip the trailing する from the
// reading (and from the form if written out).
const stripSuru: Transform = (jp, r) => {
  if (!r.endsWith('する')) return null;
  const a = jp.endsWith('する') ? jp.slice(0, -2) : jp;
  const b = r.slice(0, -2);
  return b.length === 0 ? null : [a, b];
};

// Familiar honorific さん suffix (e.g. 叔父さん/おじさん -> 伯父/おじ). Only fires
// when the bare lemma is what JMdict carries; common さん-headwords (お母さん …)
// match at rank 0 first, so this never clobbers them.
const stripSan: Transform = (jp, r) => {
  if (!r.endsWith('さん')) return null;
  const a = jp.endsWith('さん') ? jp.slice(0, -2) : jp;
  const b = r.slice(0, -2);
  return b.length === 0 ? null : [a, b];
};

// Adverbial と (e.g. ゆっくりと -> ゆっくり). Gated + lowest priority, so common
// と-final adverbs (きちんと, ずっと …) keep their rank-0 match.
const stripAdverbialTo: Transform = (jp, r) => {
  if (!r.endsWith('と') || r.length < 3) return null;
  const a = jp.endsWith('と') ? jp.slice(0, -1) : jp;
  const b = r.slice(0, -1);
  return [a, b];
};

const TRANSFORMS: Transform[] = [
  stripParens,
  stripWave,
  stripHonorific,
  stripSuru,
  stripSan,
  stripAdverbialTo,
];

// --- candidate generation ------------------------------------------------------

/** A (jp, reading) lookup candidate. */
export interface Candidate {
  jp: string;
  reading: string;
  /**
   * When true, a JMdict hit only counts if the blessed meaning also overlaps a
   * gloss. Set on reading-as-form candidates (tier 3) so an orthographic variant
   * (真中 -> 真ん中/まんなか, meanings agree) resolves, while a bare-kana homophone
   * (~杯/はい vs はい "yes", meanings disagree) is correctly rejected.
   */
  meaningGated: boolean;
}

function popcount(n: number): number {
  let c = 0;
  while (n) {
    c += n & 1;
    n >>= 1;
  }
  return c;
}

/**
 * Ordered lookup candidates for a blessed row, in three priority tiers:
 *   1. every written-form x reading combination (the faithful reading);
 *   2. each written form used as its own reading -- kana headwords, an empty
 *      reading column, swapped columns (いただく / 頂く);
 *   3. each reading used as a form (meaning-gated) -- orthographic variants.
 * Within every tier the mechanical transforms are applied fewest-first, so the
 * closest match to the source always wins. Deduped (highest-priority kept).
 */
export function candidatePairs(expression: string, reading: string): Candidate[] {
  const jps = splitForms(expression);
  const readings = splitForms(reading);

  const out: Candidate[] = [];
  const seen = new Set<string>();
  const push = (jp: string, r: string, meaningGated: boolean) => {
    const a = jp.trim();
    const b = r.trim();
    if (!a || !b) return;
    const key = `${a} ${b}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ jp: a, reading: b, meaningGated });
  };

  // subsets of TRANSFORMS, ordered by popcount (fewest transforms first)
  const subsets = [...Array(1 << TRANSFORMS.length).keys()].sort(
    (x, y) => popcount(x) - popcount(y),
  );
  const emit = (jp0: string, r0: string, meaningGated: boolean) => {
    for (const mask of subsets) {
      let jp = jp0;
      let r = r0;
      let dead = false;
      for (let i = 0; i < TRANSFORMS.length; i++) {
        if (!(mask & (1 << i))) continue;
        const res = TRANSFORMS[i](jp, r);
        if (res === null) {
          dead = true; // this transform did not apply; subset is redundant
          break;
        }
        [jp, r] = res;
      }
      if (!dead) push(jp, r, meaningGated);
    }
  };

  for (const jp of jps) for (const r of readings) emit(jp, r, false); // tier 1
  for (const jp of jps) emit(jp, jp, false); // tier 2
  for (const r of readings) emit(r, r, true); // tier 3
  return out;
}

// --- generation ----------------------------------------------------------------

/** Resolve one blessed row to a single (jp, reading, matched word), or null. */
function resolveRow(
  index: JmdictIndex,
  row: BlessedRow,
): { jp: string; reading: string; word: MatchedWord | null; tried: string[] } {
  const cands = candidatePairs(row.expression, row.reading);
  for (const c of cands) {
    const word = lookupVocab(index, c.jp, c.reading);
    if (!word) continue;
    // Tier-3 (reading-as-form) hits must also corroborate the meaning, so a bare
    // kana homophone (杯 -> はい "yes") cannot masquerade as the intended word.
    if (c.meaningGated && !meaningOverlaps(row.meaning, word.glosses)) continue;
    return { jp: c.jp, reading: c.reading, word, tried: cands.map((x) => `${x.jp}/${x.reading}`) };
  }
  return { jp: '', reading: '', word: null, tried: cands.map((x) => `${x.jp}/${x.reading}`) };
}

export function generateVocab(index: JmdictIndex = loadJmdictIndex()): GenResult {
  const entries: GeneratedEntry[] = [];
  const duplicates: GenResult['duplicates'] = [];
  const residuals: GenResult['residuals'] = [];
  const byId = new Set<string>();

  // N5 first so a word shared across levels is tagged at the lower level.
  for (const level of ['N5', 'N4'] as const) {
    for (const row of readBlessedList(level)) {
      const { jp, reading, word, tried } = resolveRow(index, row);
      if (!word) {
        residuals.push({ row, tried });
        continue;
      }
      const id = `${jp}:${reading}`;
      if (byId.has(id)) {
        duplicates.push({ row, id });
        continue;
      }
      byId.add(id);
      // Prefer the blessed meaning when it corroborates a JMdict gloss; otherwise
      // fall back to the matched word's first gloss (still dictionary-sourced).
      const blessed = row.meaning.trim();
      const overlaps = meaningOverlaps(blessed, word.glosses);
      const en = overlaps ? blessed : (word.glosses[0] ?? blessed);
      entries.push({
        id,
        jp,
        reading,
        en,
        pos: word.primaryPos,
        jlpt: level,
        meaningFromJmdict: !overlaps,
      });
    }
  }
  return { entries, duplicates, residuals };
}

// --- markdown emission ---------------------------------------------------------

const HEADER = `<!--
  Vocabulary spine. GENERATED by src/content/spine/generate-vocab.ts from the
  blessed JLPT N5/N4 lists (data/vendor/jlpt/), gated against vendored JMdict.
  Do not hand-edit; re-run the generator instead:
    GEN_VOCAB=1 npx vite-node src/content/spine/generate-vocab.ts
  Each entry's reading is kana; pos is derived from JMdict's primary sense.
  Faces: recall (jp->en) + reverse (en->jp), both deterministically gradable.
-->
`;

/** Flatten a scalar value for the line-oriented spine markdown. */
function scalar(v: string): string {
  // The parser splits on the first ':' only; collapse newlines defensively.
  return v.replace(/\s+/g, ' ').trim();
}

export function renderVocabMarkdown(entries: readonly GeneratedEntry[]): string {
  const blocks = entries.map(
    (e) => `---
id: ${scalar(e.id)}
type: vocab
jp: ${scalar(e.jp)}
reading: ${scalar(e.reading)}
en: ${scalar(e.en)}
pos: ${e.pos}
jlpt: ${e.jlpt}
tags: []
faces: [recall, reverse]
---`,
  );
  return HEADER + '\n' + blocks.join('\n\n') + '\n';
}

// --- runner --------------------------------------------------------------------

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, 'vocab.md');

function main(): void {
  const { entries, duplicates, residuals } = generateVocab();
  writeFileSync(OUT, renderVocabMarkdown(entries), 'utf8');
  const n5 = entries.filter((e) => e.jlpt === 'N5').length;
  const n4 = entries.filter((e) => e.jlpt === 'N4').length;
  const fellBack = entries.filter((e) => e.meaningFromJmdict).length;
  console.log(`wrote ${entries.length} entries (N5 ${n5}, N4 ${n4}) -> ${OUT}`);
  console.log(`  meaning fell back to JMdict gloss: ${fellBack}`);
  console.log(`  duplicates skipped: ${duplicates.length}`);
  console.log(`  residuals (unresolved): ${residuals.length}`);
  for (const { row } of residuals) {
    console.log(`    RESIDUAL ${row.level}  ${row.expression} / ${row.reading}`);
  }
}

// Importers (the coverage test) must not trigger file I/O. vite-node masks
// argv[1] (it points at vite-node itself), so gate emission behind an env flag.
if (process.env.GEN_VOCAB === '1') {
  main();
}

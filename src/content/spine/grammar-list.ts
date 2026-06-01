/**
 * Blessed JLPT grammar list — DoD C, content rule B.
 *
 * Build/test-time ONLY (reads `data/vendor/` via `node:fs`; never bundled into
 * the client). Unlike vocab/kanji, grammar has **no dictionary to cross-check
 * against** (JMdict/KANJIDIC2 are words and kanji). So this list is the *sole*
 * authority for both membership *and* content; the only correctness guard is
 * that every row must render as a deterministically-gradable MCQ (see
 * `generate-grammar.ts`) and that malformed rows fail the build rather than
 * produce a broken entry.
 *
 * Source: user-provided community list (see `data/vendor/MANIFEST.md`). A
 * spreadsheet export with NO header and several empty trailing columns. Columns:
 *   0: level (`N5` / `N4` / …)   1: # (per-level sequence)
 *   2: grammar point (JP)        3: romaji   4: meaning   5+: blank / source
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { JlptLevel } from './blessed';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(HERE, '../../../data/vendor/grammar/JLPT Grammar.xlsx - full list.csv');

export interface GrammarRow {
  level: JlptLevel;
  /** Per-level sequence number from the source (unique within a level). */
  num: number;
  /** Grammar point as written (kana/kanji, may carry `・` alternatives, `～`). */
  jp: string;
  /** Romaji reading. */
  romaji: string;
  /** English meaning(s), as authored (may be `;`-separated). */
  meaning: string;
}

/** Parse one CSV record, honoring `"..."`-quoted fields and `""` escapes. */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

/**
 * Read every N5/N4 grammar row. Rows of other levels (and the 8 blank rows in
 * the source) are skipped. Throws on a malformed N5/N4 row — too few columns, a
 * non-numeric `#`, or an empty grammar point / meaning — so the build fails
 * rather than emitting a broken entry (MANIFEST § grammar).
 */
export function readGrammarList(): GrammarRow[] {
  const text = readFileSync(FILE, 'utf8');
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const rows: GrammarRow[] = [];
  for (let i = 0; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const level = cols[0]?.trim();
    if (level !== 'N5' && level !== 'N4') continue; // out-of-scope or blank row
    if (cols.length < 5) {
      throw new Error(`grammar.csv line ${i + 1}: expected >=5 columns, got ${cols.length}`);
    }
    const num = Number(cols[1].trim());
    const jp = cols[2].trim();
    const romaji = cols[3].trim();
    const meaning = cols[4].trim();
    if (!Number.isInteger(num)) {
      throw new Error(`grammar.csv line ${i + 1}: non-numeric # "${cols[1]}"`);
    }
    if (!jp || !meaning) {
      throw new Error(`grammar.csv line ${i + 1}: empty grammar point or meaning`);
    }
    rows.push({ level: level as JlptLevel, num, jp, romaji, meaning });
  }
  return rows;
}

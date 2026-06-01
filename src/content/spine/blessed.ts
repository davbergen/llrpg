/**
 * Blessed JLPT vocab membership lists — DoD C, content rule B.
 *
 * Build/test-time ONLY (reads from `data/vendor/` via `node:fs`; never bundled
 * into the client). The list decides *which* words belong to N5/N4; it is the
 * sole authority for membership. Correctness of each word is a separate concern
 * handled by `jmdict.ts`.
 *
 * Source: jamsinclair/open-anki-jlpt-decks (derived from the Tanos JLPT lists),
 * vendored 2026-05-31. See `data/vendor/MANIFEST.md`. CSV columns:
 * `expression,reading,meaning,tags,guid` with standard double-quote escaping.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

export type JlptLevel = 'N5' | 'N4';

export interface BlessedRow {
  level: JlptLevel;
  /** Headword as written (kanji and/or kana). */
  expression: string;
  /** Kana reading. */
  reading: string;
  /** English meaning(s), as authored in the list (may be comma/`;`-separated). */
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

/** Read and parse a blessed list. Throws on a malformed (under-columned) row. */
export function readBlessedList(level: JlptLevel): BlessedRow[] {
  const file = resolve(HERE, `../../../data/vendor/jlpt/${level.toLowerCase()}.csv`);
  const text = readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const rows: BlessedRow[] = [];
  // Row 0 is the header (`expression,reading,meaning,tags,guid`).
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 3) {
      throw new Error(`${level}.csv line ${i + 1}: expected >=3 columns, got ${cols.length}`);
    }
    const [expression, reading, meaning] = cols;
    rows.push({ level, expression: expression.trim(), reading: reading.trim(), meaning: meaning.trim() });
  }
  return rows;
}

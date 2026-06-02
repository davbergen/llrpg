/**
 * Blessed JLPT kanji membership lists — DoD C, content rule B.
 *
 * Build/test-time ONLY (reads `data/vendor/` via `node:fs`; never bundled into
 * the client). The list decides *which* kanji belong to N5/N4; it is the sole
 * authority for membership. Correctness (readings / meanings) is a separate
 * concern handled by `kanjidic.ts`.
 *
 * Source: user-provided community list (see `data/vendor/MANIFEST.md`). Format:
 * a `Kanji` header line, then one kanji per line, no translations.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { JlptLevel } from './blessed';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Read a blessed kanji membership list. Throws on a missing/empty header. */
export function readKanjiList(level: JlptLevel): string[] {
  const file = resolve(HERE, `../../../data/vendor/kanji/${level.toLowerCase()}_kanji.csv`);
  const text = readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines[0] !== 'Kanji') {
    throw new Error(`${level}_kanji.csv: expected "Kanji" header, got "${lines[0]}"`);
  }
  return lines.slice(1);
}

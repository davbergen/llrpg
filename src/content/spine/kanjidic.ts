/**
 * KANJIDIC2 correctness gate — DoD C, content rule B.
 *
 * Build/test-time ONLY. Reads the vendored, committed
 * `data/vendor/kanjidic/kanjidic2.xml.gz` from disk and is therefore never
 * imported by client/app code (it would pull `node:fs` into the bundle). It is
 * consumed exclusively by tests and the kanji spine generator.
 *
 * Role: a kanji spine entry is *correct* iff its character exists in KANJIDIC2,
 * its stored reading is one the dictionary attests, and its English meaning is
 * one KANJIDIC2 supplies. Membership ("which kanji") comes from the blessed
 * per-level lists (see `kanji-membership.ts`); correctness ("is the reading /
 * meaning right") comes from here. Claude never invents curriculum.
 *
 * Attribution: KANJIDIC2 is property of the EDRDG, used under the EDRDG Licence
 * (CC BY-SA 4.0). See `data/vendor/MANIFEST.md`.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const KANJIDIC_GZ = resolve(HERE, '../../../data/vendor/kanjidic/kanjidic2.xml.gz');

/** One KANJIDIC2 character collapsed to what the gate + generator need. */
export interface KanjiInfo {
  /** Kun-yomi readings, okurigana stripped (`た.べる` → `たべ`? no — see note). */
  kun: string[];
  /** On-yomi readings (katakana), prefix/suffix hyphens stripped. */
  on: string[];
  /** English meanings (KANJIDIC2 `<meaning>` with no `m_lang`), in order. */
  meanings: string[];
}

export interface KanjidicIndex {
  /** Kanji character → its readings + meanings. */
  byChar: Map<string, KanjiInfo>;
  /** KANJIDIC2 database version, for provenance assertions. */
  version: string;
}

const XML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
};

function decodeEntities(s: string): string {
  return s.replace(/&(amp|lt|gt|quot|apos);/g, (m) => XML_ENTITIES[m] ?? m);
}

/**
 * Normalize a KANJIDIC2 reading to a bare kana reading of the kanji itself:
 *   - drop okurigana (everything from the `.` onward: `た.べる` → `た`),
 *   - drop leading/trailing prefix/suffix hyphens (`-び` → `び`, `こ-` → `こ`).
 * The part before the `.` is the reading carried by the kanji; the okurigana is
 * the inflecting tail written in kana, so stripping it yields a genuine reading.
 */
export function normalizeReading(raw: string): string {
  return raw.split('.')[0].replace(/^-|-$/g, '').trim();
}

function findAll(block: string, re: RegExp): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const g = new RegExp(re.source, 'g');
  while ((m = g.exec(block)) !== null) out.push(m[1]);
  return out;
}

function buildIndex(): KanjidicIndex {
  const xml = gunzipSync(readFileSync(KANJIDIC_GZ)).toString('utf8');
  const version =
    /<database_version>(.*?)<\/database_version>/.exec(xml)?.[1] ?? 'unknown';

  const byChar = new Map<string, KanjiInfo>();
  // One <character> block per kanji. Regex extraction (mirrors jmdict.ts's
  // targeted approach) avoids pulling an XML parser into the dev toolchain.
  const blocks = xml.match(/<character>[\s\S]*?<\/character>/g) ?? [];
  for (const b of blocks) {
    const lit = /<literal>(.*?)<\/literal>/.exec(b)?.[1];
    if (!lit) continue;
    const kunRaw = findAll(b, /<reading r_type="ja_kun">(.*?)<\/reading>/);
    const onRaw = findAll(b, /<reading r_type="ja_on">(.*?)<\/reading>/);
    // English meanings are <meaning> with no m_lang attribute; localized ones
    // carry m_lang="fr" etc. and are excluded.
    const meanings = findAll(b, /<meaning>(.*?)<\/meaning>/).map(decodeEntities);
    const kun = dedupe(kunRaw.map(normalizeReading).filter(Boolean));
    const on = dedupe(onRaw.map(normalizeReading).filter(Boolean));
    byChar.set(lit, { kun, on, meanings });
  }
  return { byChar, version };
}

function dedupe(xs: string[]): string[] {
  return [...new Set(xs)];
}

let cached: KanjidicIndex | null = null;

/** Load (and memoize) the KANJIDIC2 index. Parsed once per process. */
export function loadKanjidicIndex(): KanjidicIndex {
  if (!cached) cached = buildIndex();
  return cached;
}

/** Look up one kanji, or `null` if absent from KANJIDIC2. */
export function lookupKanji(index: KanjidicIndex, char: string): KanjiInfo | null {
  return index.byChar.get(char) ?? null;
}

/**
 * Pick the canonical spine reading for a kanji: the first kun-yomi (the reading
 * most learners associate with a single kanji), falling back to the first
 * on-yomi when the kanji has no kun reading. Both are already normalized.
 */
export function primaryReading(info: KanjiInfo): string | null {
  return info.kun[0] ?? info.on[0] ?? null;
}

export interface KanjiCandidate {
  /** The kanji character. */
  jp: string;
  /** Stored kana reading. */
  reading: string;
  /** Stored English meaning. */
  en: string;
}

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

/**
 * The kanji correctness gate. A candidate passes iff its character exists in
 * KANJIDIC2, its reading is one the dictionary attests (kun or on, normalized),
 * and its meaning is one KANJIDIC2 supplies (case-insensitive). Returns the
 * first failing reason.
 */
export function validateKanjiEntry(
  index: KanjidicIndex,
  c: KanjiCandidate,
): ValidationResult {
  const info = index.byChar.get(c.jp);
  if (!info) {
    return { ok: false, reason: `kanji "${c.jp}" not in KANJIDIC2` };
  }
  if (![...info.kun, ...info.on].includes(c.reading)) {
    return {
      ok: false,
      reason: `reading "${c.reading}" is not a KANJIDIC2 reading for "${c.jp}"`,
    };
  }
  const want = c.en.toLowerCase();
  if (!info.meanings.some((m) => m.toLowerCase() === want)) {
    return {
      ok: false,
      reason: `meaning "${c.en}" is not a KANJIDIC2 meaning for "${c.jp}"`,
    };
  }
  return { ok: true };
}

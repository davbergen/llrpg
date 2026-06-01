/**
 * JMdict correctness gate — DoD C, content rule B.
 *
 * Build/test-time ONLY. This module reads the vendored, committed
 * `data/vendor/jmdict/jmdict-eng-common.json.zip` from disk and is therefore
 * never imported by client/app code (it would pull `node:fs` into the bundle).
 * It is consumed exclusively by tests and the spine generator.
 *
 * Role: a vocab spine entry is *correct* iff its written form + kana reading +
 * coarse part-of-speech corroborate a JMdict-common entry (and, when supplied,
 * its English meaning overlaps a JMdict gloss). Membership ("which words") comes
 * from the blessed JLPT list (see `blessed.ts`); correctness ("is the Japanese
 * right") comes from here. Claude never invents curriculum.
 *
 * Attribution: JMdict is property of the EDRDG, used under the EDRDG Licence
 * (CC BY-SA 4.0). See `data/vendor/MANIFEST.md`.
 */
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const JMDICT_ZIP = resolve(HERE, '../../../data/vendor/jmdict/jmdict-eng-common.json.zip');

/** Coarse part-of-speech buckets the spine uses (JMdict has 50+ fine codes). */
export type PosCategory =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'pronoun'
  | 'particle'
  | 'conjunction'
  | 'interjection'
  | 'counter'
  | 'numeric'
  | 'prefix'
  | 'suffix'
  | 'expression'
  | 'other';

/**
 * JMdict fine POS code → coarse spine category. Covers every code present in the
 * vendored `jmdict-eng-common` (52 codes as of 3.6.2). Unknown codes fall back to
 * 'other' via {@link categoryOf}.
 */
const POS_MAP: Record<string, PosCategory> = {
  // nouns & nominal forms
  n: 'noun',
  'n-pref': 'noun',
  'n-suf': 'noun',
  // verbs
  v1: 'verb',
  'v1-s': 'verb',
  'v2a-s': 'verb',
  v5aru: 'verb',
  v5b: 'verb',
  v5g: 'verb',
  v5k: 'verb',
  'v5k-s': 'verb',
  v5m: 'verb',
  v5n: 'verb',
  v5r: 'verb',
  'v5r-i': 'verb',
  v5s: 'verb',
  v5t: 'verb',
  v5u: 'verb',
  'v5u-s': 'verb',
  vi: 'verb',
  vt: 'verb',
  vk: 'verb',
  vr: 'verb',
  vs: 'verb',
  'vs-c': 'verb',
  'vs-i': 'verb',
  'vs-s': 'verb',
  vz: 'verb',
  aux: 'verb',
  'aux-v': 'verb',
  // adjectives
  'adj-i': 'adjective',
  'adj-ix': 'adjective',
  'adj-na': 'adjective',
  'adj-no': 'adjective',
  'adj-pn': 'adjective',
  'adj-f': 'adjective',
  'adj-t': 'adjective',
  'adj-ku': 'adjective',
  'aux-adj': 'adjective',
  // adverbs
  adv: 'adverb',
  'adv-to': 'adverb',
  // grammatical / closed classes
  pn: 'pronoun',
  prt: 'particle',
  conj: 'conjunction',
  int: 'interjection',
  ctr: 'counter',
  num: 'numeric',
  pref: 'prefix',
  suf: 'suffix',
  exp: 'expression',
  cop: 'expression',
  unc: 'other',
};

/** Map a fine JMdict POS code to its coarse spine category. */
export function categoryOf(code: string): PosCategory {
  return POS_MAP[code] ?? 'other';
}

/** A JMdict word collapsed to what the gate needs. */
export interface MatchedWord {
  /** Every kana reading attested for this word. */
  kana: Set<string>;
  /** Coarse POS categories across all of this word's senses. */
  posCategories: Set<PosCategory>;
  /** Lower-cased English glosses across all senses. */
  glosses: string[];
}

export interface JmdictIndex {
  /** Written form (kanji *or* kana headword) → words bearing that form. */
  byForm: Map<string, MatchedWord[]>;
  /** JMdict release version, for provenance assertions. */
  version: string;
}

interface RawWord {
  kanji: { text: string }[];
  kana: { text: string }[];
  sense: { partOfSpeech: string[]; gloss: { text: string }[] }[];
}

function decompress(): { version: string; words: RawWord[] } {
  const buf = readFileSync(JMDICT_ZIP);
  if (buf.readUInt32LE(0) !== 0x04034b50) {
    throw new Error('jmdict zip: missing PK local-file-header magic');
  }
  const method = buf.readUInt16LE(8);
  const compSize = buf.readUInt32LE(18);
  const nameLen = buf.readUInt16LE(26);
  const extraLen = buf.readUInt16LE(28);
  const dataStart = 30 + nameLen + extraLen;
  const comp = buf.subarray(dataStart, dataStart + compSize);
  const raw = method === 8 ? inflateRawSync(comp) : comp;
  return JSON.parse(raw.toString('utf8'));
}

function buildIndex(): JmdictIndex {
  const { version, words } = decompress();
  const byForm = new Map<string, MatchedWord[]>();
  for (const w of words) {
    const kana = new Set(w.kana.map((k) => k.text));
    const posCategories = new Set<PosCategory>();
    const glosses: string[] = [];
    for (const s of w.sense) {
      for (const p of s.partOfSpeech) posCategories.add(categoryOf(p));
      for (const g of s.gloss) glosses.push(g.text.toLowerCase());
    }
    const word: MatchedWord = { kana, posCategories, glosses };
    const forms = new Set<string>();
    for (const k of w.kanji) forms.add(k.text);
    for (const k of w.kana) forms.add(k.text);
    for (const form of forms) {
      const list = byForm.get(form);
      if (list) list.push(word);
      else byForm.set(form, [word]);
    }
  }
  return { byForm, version };
}

let cached: JmdictIndex | null = null;

/** Load (and memoize) the JMdict index. ~16 MB JSON, parsed once per process. */
export function loadJmdictIndex(): JmdictIndex {
  if (!cached) cached = buildIndex();
  return cached;
}

/**
 * Find the JMdict word matching a written form + kana reading, or `null`. Used
 * by the generator to *derive* a spine entry's POS/gloss from the dictionary
 * (rather than inventing them).
 */
export function lookupVocab(
  index: JmdictIndex,
  jp: string,
  reading: string,
): MatchedWord | null {
  const words = index.byForm.get(jp);
  if (!words) return null;
  return words.find((w) => w.kana.has(reading)) ?? null;
}

export interface VocabCandidate {
  jp: string;
  reading: string;
  pos: string;
  /** Optional English meaning; when present it must overlap a JMdict gloss. */
  en?: string;
}

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

// Common English function words that must not count as a meaning "match".
const MEANING_STOPWORDS = new Set([
  'a', 'an', 'the', 'to', 'of', 'in', 'on', 'at', 'by', 'for', 'and', 'or',
  'be', 'is', 'are', 'with', 'as', 'it', 'that', 'this', 'from', 'into',
  'one', 'something', 'someone', 'etc',
]);

function contentTokens(s: string): Set<string> {
  const out = new Set<string>();
  for (const tok of s.toLowerCase().split(/[^a-z]+/)) {
    if (tok.length >= 2 && !MEANING_STOPWORDS.has(tok)) out.add(tok);
  }
  return out;
}

/** True iff the candidate meaning shares a content word with any JMdict gloss. */
export function meaningOverlaps(en: string, glosses: string[]): boolean {
  const want = contentTokens(en);
  if (want.size === 0) return true; // nothing distinctive to check (e.g. "Ah!")
  for (const g of glosses) {
    const have = contentTokens(g);
    for (const t of want) if (have.has(t)) return true;
  }
  return false;
}

/**
 * The correctness gate. A candidate passes iff its written form exists among
 * JMdict-common words, one of those words has the candidate's kana reading, that
 * reading-matched word carries the candidate's coarse POS, and (if `en` is
 * supplied) the meaning overlaps a gloss. Returns the first failing reason.
 */
export function validateVocabEntry(
  index: JmdictIndex,
  c: VocabCandidate,
): ValidationResult {
  const words = index.byForm.get(c.jp);
  if (!words || words.length === 0) {
    return { ok: false, reason: `expression "${c.jp}" not in JMdict common` };
  }
  const readingMatch = words.filter((w) => w.kana.has(c.reading));
  if (readingMatch.length === 0) {
    return {
      ok: false,
      reason: `reading "${c.reading}" matches no JMdict kana for "${c.jp}"`,
    };
  }
  if (!readingMatch.some((w) => w.posCategories.has(c.pos as PosCategory))) {
    return {
      ok: false,
      reason: `pos "${c.pos}" not among JMdict senses for "${c.jp}/${c.reading}"`,
    };
  }
  if (c.en !== undefined) {
    const glosses = readingMatch.flatMap((w) => w.glosses);
    if (!meaningOverlaps(c.en, glosses)) {
      return {
        ok: false,
        reason: `meaning "${c.en}" does not overlap JMdict glosses for "${c.jp}/${c.reading}"`,
      };
    }
  }
  return { ok: true };
}

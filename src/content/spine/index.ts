import vocab from './vocab.md';
import grammar from './grammar.md';
import kanji from './kanji.md';
import type { SpineEntry } from './parser';

export type { SpineEntry, SpineFace, SpineFileType } from './parser';

/**
 * Bumped whenever the shape of the spine changes (new file, new face, schema
 * change). Persisted card-state code can use this to invalidate caches.
 */
export const SPINE_VERSION = 4;

export const VOCAB_SPINE: readonly SpineEntry[] = vocab;
export const GRAMMAR_SPINE: readonly SpineEntry[] = grammar;
export const KANJI_SPINE: readonly SpineEntry[] = kanji;

/** All spine entries combined, in vocab → grammar → kanji order. */
export const SPINE: readonly SpineEntry[] = [...vocab, ...grammar, ...kanji];

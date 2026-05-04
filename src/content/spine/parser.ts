export type SpineFace = 'recall' | 'production' | 'listening';

export interface SpineEntry {
  id: string;
  type: string;
  jp: string;
  reading: string;
  en: string;
  pos: string;
  jlpt: string;
  tags: string[];
  faces: SpineFace[];
}

const REQUIRED_KEYS = ['id', 'type', 'jp', 'reading', 'en', 'pos', 'jlpt'] as const;
const ARRAY_KEYS = new Set(['tags', 'faces']);

function stripQuotes(s: string): string {
  if (s.length >= 2 && (s[0] === '"' || s[0] === "'") && s[s.length - 1] === s[0]) {
    return s.slice(1, -1);
  }
  return s;
}

function parseScalar(raw: string): string {
  return stripQuotes(raw.trim());
}

function parseArray(raw: string): string[] {
  const t = raw.trim();
  if (!(t.startsWith('[') && t.endsWith(']'))) {
    throw new Error(`expected [..] array, got: ${raw}`);
  }
  const inner = t.slice(1, -1).trim();
  if (!inner) return [];
  return inner.split(',').map((s) => stripQuotes(s.trim()));
}

function parseBlock(block: string, blockIndex: number): SpineEntry {
  const fields: Record<string, string | string[]> = {};
  for (const rawLine of block.split('\n')) {
    const line = rawLine.trimEnd();
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (!m) throw new Error(`block ${blockIndex}: cannot parse line "${line}"`);
    const [, key, rawValue] = m;
    fields[key] = ARRAY_KEYS.has(key) ? parseArray(rawValue) : parseScalar(rawValue);
  }
  for (const k of REQUIRED_KEYS) {
    if (typeof fields[k] !== 'string' || (fields[k] as string).length === 0) {
      throw new Error(`block ${blockIndex}: missing required field "${k}"`);
    }
  }
  return {
    id: fields.id as string,
    type: fields.type as string,
    jp: fields.jp as string,
    reading: fields.reading as string,
    en: fields.en as string,
    pos: fields.pos as string,
    jlpt: fields.jlpt as string,
    tags: (fields.tags as string[] | undefined) ?? [],
    faces: ((fields.faces as string[] | undefined) ?? []) as SpineFace[],
  };
}

export function parseSpine(text: string): SpineEntry[] {
  // Strip HTML comments so they can't be confused with content.
  const stripped = text.replace(/<!--[\s\S]*?-->/g, '');
  const lines = stripped.split('\n');
  const blocks: string[] = [];
  let current: string[] | null = null;
  for (const line of lines) {
    if (line.trim() === '---') {
      if (current === null) {
        current = [];
      } else {
        blocks.push(current.join('\n'));
        current = null;
      }
      continue;
    }
    if (current !== null) current.push(line);
  }
  if (current !== null) {
    throw new Error('unterminated frontmatter block');
  }
  const entries = blocks.map((b, i) => parseBlock(b, i));
  const ids = new Set<string>();
  for (const e of entries) {
    if (ids.has(e.id)) throw new Error(`duplicate id "${e.id}"`);
    ids.add(e.id);
  }
  return entries;
}

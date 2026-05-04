import { describe, expect, it } from 'vitest';
import { parseSpine } from './parser';

describe('parseSpine', () => {
  it('parses a single block', () => {
    const text = `---
id: water
type: vocab
jp: 水
reading: mizu
en: water
pos: noun
jlpt: N5
tags: []
faces: [recall]
---
`;
    const entries = parseSpine(text);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      id: 'water',
      type: 'vocab',
      jp: '水',
      reading: 'mizu',
      en: 'water',
      pos: 'noun',
      jlpt: 'N5',
      tags: [],
      faces: ['recall'],
      cloze: null,
    });
  });

  it('parses cloze fields when present', () => {
    const text = `---
id: eats
type: vocab
jp: 食べる
reading: taberu
en: to eat
pos: verb
jlpt: N5
tags: []
faces: [cloze]
cloze_sentence: 私はりんごを{}。
cloze_target: 食べる
---
`;
    const [e] = parseSpine(text);
    expect(e.cloze).toEqual({ sentence: '私はりんごを{}。', target: '食べる' });
  });

  it('throws when face cloze is declared without cloze fields', () => {
    const text = `---
id: bad
type: vocab
jp: x
reading: x
en: x
pos: noun
jlpt: N5
tags: []
faces: [cloze]
---
`;
    expect(() => parseSpine(text)).toThrow(/cloze/);
  });

  it('throws on unknown face values', () => {
    const text = `---
id: bad
type: vocab
jp: x
reading: x
en: x
pos: noun
jlpt: N5
tags: []
faces: [bogus]
---
`;
    expect(() => parseSpine(text)).toThrow(/unknown face/);
  });

  it('parses multiple blocks separated by blank lines', () => {
    const text = `---
id: a
type: vocab
jp: 火
reading: hi
en: fire
pos: noun
jlpt: N5
tags: [element]
faces: [recall]
---

---
id: b
type: vocab
jp: 木
reading: ki
en: tree
pos: noun
jlpt: N5
tags: []
faces: [recall]
---
`;
    const entries = parseSpine(text);
    expect(entries).toHaveLength(2);
    expect(entries[0].tags).toEqual(['element']);
    expect(entries[1].id).toBe('b');
  });

  it('skips HTML comments', () => {
    const text = `<!-- a header comment -->
---
id: x
type: vocab
jp: 水
reading: mizu
en: water
pos: noun
jlpt: N5
tags: []
faces: [recall]
---
`;
    expect(parseSpine(text)).toHaveLength(1);
  });

  it('throws on duplicate ids', () => {
    const block = (id: string) => `---
id: ${id}
type: vocab
jp: 水
reading: mizu
en: water
pos: noun
jlpt: N5
tags: []
faces: [recall]
---
`;
    expect(() => parseSpine(block('dup') + block('dup'))).toThrow(/duplicate id/);
  });

  it('throws on missing required fields', () => {
    const text = `---
id: a
type: vocab
jp: 水
en: water
pos: noun
jlpt: N5
tags: []
faces: [recall]
---
`;
    expect(() => parseSpine(text)).toThrow(/reading/);
  });
});

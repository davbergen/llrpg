/**
 * True if the string contains any Japanese script — hiragana, katakana, or
 * CJK kanji. Used to size MCQ option buttons: kana/kanji options need a larger
 * body font to be legible, while romaji/Latin options keep the pixel font.
 */
export function containsJapanese(str: string): boolean {
  // Hiragana (3040–309F), Katakana (30A0–30FF), CJK Unified Ideographs
  // (4E00–9FFF), plus the half/full-width katakana block (FF66–FF9D).
  return /[぀-ゟ゠-ヿ一-鿿ｦ-ﾝ]/.test(str);
}

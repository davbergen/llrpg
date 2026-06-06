import { describe, expect, it } from 'vitest';
import { containsJapanese } from './text-script';

describe('containsJapanese', () => {
  it('detects hiragana', () => {
    expect(containsJapanese('ねこ')).toBe(true);
    expect(containsJapanese('たべる')).toBe(true);
  });

  it('detects katakana', () => {
    expect(containsJapanese('テレビ')).toBe(true);
    expect(containsJapanese('コーヒー')).toBe(true);
  });

  it('detects kanji', () => {
    expect(containsJapanese('猫')).toBe(true);
    expect(containsJapanese('日本語')).toBe(true);
  });

  it('detects Japanese mixed with Latin', () => {
    expect(containsJapanese('to eat (たべる)')).toBe(true);
  });

  it('returns false for romaji and English', () => {
    expect(containsJapanese('neko')).toBe(false);
    expect(containsJapanese('to eat')).toBe(false);
    expect(containsJapanese('Tabemasu')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(containsJapanese('')).toBe(false);
  });
});

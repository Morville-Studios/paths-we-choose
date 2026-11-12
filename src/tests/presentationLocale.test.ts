import { afterEach, describe, expect, it } from 'vitest';
import { setGameLocale } from '../i18n';
import { localizePlayerText } from '../i18n/presentation';

afterEach(() => setGameLocale('en'));

describe('bundled player translations', () => {
  it.each([
    ['zh-Hant', '開始冒險', '戰士'],
    ['zh-Hans', '开始冒险', '战士'],
    ['ja', '冒険を始める', '戦士'],
    ['ko', '모험 시작', '전사'],
  ] as const)('translates the title action and game terms in %s', (locale, start, fighter) => {
    setGameLocale(locale);
    expect(localizePlayerText('Start Adventure')).toBe(start);
    expect(localizePlayerText('Fighter')).toBe(fighter);
    expect(localizePlayerText('Turn 12')).not.toBe('Turn 12');
  });

  it('keeps English source text when the player selects English', () => {
    setGameLocale('en');
    expect(localizePlayerText('Start Adventure')).toBe('Start Adventure');
  });
});

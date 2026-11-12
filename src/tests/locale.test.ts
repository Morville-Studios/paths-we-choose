import { describe, expect, it } from 'vitest';
import { normalizeGameLocale, resolveGameLocale } from '../i18n/locale';

describe('game language preference', () => {
  it('maps browser Chinese regions and scripts to the correct writing system', () => {
    expect(normalizeGameLocale('zh-TW')).toBe('zh-Hant');
    expect(normalizeGameLocale('zh-Hans-SG')).toBe('zh-Hans');
    expect(normalizeGameLocale('zh-HK')).toBe('zh-Hant');
    expect(normalizeGameLocale('zh-CN')).toBe('zh-Hans');
  });

  it('uses an explicit choice, then a stored choice, then browser order, then English', () => {
    expect(resolveGameLocale({ query: 'ja', stored: 'ko', browser: ['zh-TW'] })).toBe('ja');
    expect(resolveGameLocale({ stored: 'ko', browser: ['zh-TW'] })).toBe('ko');
    expect(resolveGameLocale({ browser: ['fr-FR', 'zh-TW', 'ja-JP'] })).toBe('zh-Hant');
    expect(resolveGameLocale({ browser: ['fr-FR'] })).toBe('en');
  });
});

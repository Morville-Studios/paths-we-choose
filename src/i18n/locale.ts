export type GameLocale = 'en' | 'zh-Hant' | 'zh-Hans' | 'ja' | 'ko';

export const GAME_LOCALES: ReadonlyArray<{ code: GameLocale; label: string }> = [
  { code: 'en', label: 'EN' },
  { code: 'zh-Hant', label: '繁中' },
  { code: 'zh-Hans', label: '简中' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
];

export function normalizeGameLocale(value: string | null | undefined): GameLocale | null {
  const tag = (value || '').trim().replaceAll('_', '-').toLowerCase();
  if (!tag) return null;
  if (tag === 'zh-hant' || tag.startsWith('zh-hant-') || /^zh-(tw|hk|mo)(?:-|$)/.test(tag)) return 'zh-Hant';
  if (tag === 'zh' || tag === 'zh-hans' || tag.startsWith('zh-hans-') || /^zh-(cn|sg)(?:-|$)/.test(tag)) return 'zh-Hans';
  if (tag === 'ja' || tag.startsWith('ja-')) return 'ja';
  if (tag === 'ko' || tag.startsWith('ko-')) return 'ko';
  if (tag === 'en' || tag.startsWith('en-')) return 'en';
  return null;
}

export function resolveGameLocale(options: { query?: string | null; stored?: string | null; browser?: readonly string[] }): GameLocale {
  const explicit = normalizeGameLocale(options.query);
  if (explicit) return explicit;
  const saved = normalizeGameLocale(options.stored);
  if (saved) return saved;
  for (const language of options.browser || []) {
    const locale = normalizeGameLocale(language);
    if (locale) return locale;
  }
  return 'en';
}

import { GAME_LOCALES, normalizeGameLocale, resolveGameLocale, type GameLocale } from './locale';
export { GAME_LOCALES, normalizeGameLocale, resolveGameLocale, type GameLocale } from './locale';

const STORAGE_KEY = 'morville:paths-we-choose:language';
const PAGE_TITLES: Record<GameLocale, string> = {
  en: 'The Paths We Choose — Tabletop Card Adventure | Morville Studios · Morville Games',
  'zh-Hant': '抉擇之路 — 桌上卡牌冒險 | Morville Studios',
  'zh-Hans': '抉择之路 — 桌面卡牌冒险 | Morville Studios',
  ja: '選択の道 — テーブルトップカードアドベンチャー | Morville Studios',
  ko: '선택의 길 — 테이블톱 카드 모험 | Morville Studios',
};

function storedChoice(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

const queryChoice = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('lang');
let currentLocale = resolveGameLocale({
  query: queryChoice,
  stored: storedChoice(),
  browser: typeof navigator === 'undefined' ? [] : navigator.languages?.length ? navigator.languages : [navigator.language],
});

if (normalizeGameLocale(queryChoice)) {
  try { localStorage.setItem(STORAGE_KEY, currentLocale); } catch { /* Private browsing may disable storage. */ }
}

function applyDocumentLocale(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = currentLocale;
  document.documentElement.dataset.gameLocale = currentLocale;
  document.title = PAGE_TITLES[currentLocale];
}

applyDocumentLocale();

export function getGameLocale(): GameLocale { return currentLocale; }

export function setGameLocale(locale: GameLocale): void {
  currentLocale = locale;
  try { localStorage.setItem(STORAGE_KEY, locale); } catch { /* Keep the in-memory choice. */ }
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', locale);
    window.history.replaceState(window.history.state, '', url);
  }
  applyDocumentLocale();
}

export function gameLanguageControl(): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'game-language-control';
  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Language / 語言 / 语言 / 言語 / 언어');
  select.dataset.gameLanguage = '';
  for (const { code, label } of GAME_LOCALES) {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = label;
    select.append(option);
  }
  select.value = currentLocale;
  wrapper.append(select);
  return wrapper;
}

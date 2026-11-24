import { GAME_LOCALES, normalizeGameLocale, resolveGameLocale, type GameLocale } from './locale';
export { GAME_LOCALES, normalizeGameLocale, resolveGameLocale, type GameLocale } from './locale';

// Keep the original key so returning players retain their language choice.
const STORAGE_KEY = 'morville:paths-we-choose:language';
const PAGE_TITLES: Record<GameLocale, string> = {
  en: 'Paths to Odamyrus — Free Fantasy Card Game | Morville Studios',
  'zh-Hant': '通往奧達米魯斯之路 — 免費奇幻卡牌遊戲 | Morville Studios',
  'zh-Hans': '通往奥达米鲁斯之路 — 免费奇幻卡牌游戏 | Morville Studios',
  ja: 'オダミルスへの道 — 無料ファンタジーカードゲーム | Morville Studios',
  ko: '오다미루스로 가는 길 — 무료 판타지 카드 게임 | Morville Studios',
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

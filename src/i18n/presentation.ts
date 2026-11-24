import { getGameLocale } from './index';
import type { GameLocale } from './locale';
import { EDITORIAL_OVERRIDES } from './overrides';

type Catalog = Record<Exclude<GameLocale, 'en'>, Record<string, string>>;
type TranslatedLocale = Exclude<GameLocale, 'en'>;
const catalogs: Partial<Catalog> = {};
const catalogLoads = new Map<TranslatedLocale, Promise<void>>();
const localeLoaders: Record<TranslatedLocale, () => Promise<{ default: Record<string, string> }>> = {
  'zh-Hant': () => import('virtual:game-locale:zh-Hant'),
  'zh-Hans': () => import('virtual:game-locale:zh-Hans'),
  ja: () => import('virtual:game-locale:ja'),
  ko: () => import('virtual:game-locale:ko'),
};

/** Load bundled translations before rendering a non-English locale. */
export function ensureGameTranslations(locale: GameLocale): Promise<void> {
  if (locale === 'en' || catalogs[locale]) return Promise.resolve();
  const pending = catalogLoads.get(locale);
  if (pending) return pending;
  const load = localeLoaders[locale]().then(({ default: entries }) => {
    catalogs[locale] = { ...entries, ...EDITORIAL_OVERRIDES[locale] };
  }).catch((error: unknown) => {
    catalogLoads.delete(locale);
    throw error;
  });
  catalogLoads.set(locale, load);
  return load;
}
type CatalogEntry = { english: string; localized: string; pattern: RegExp };
type CatalogIndex = { entries: CatalogEntry[]; byPrefix: Map<string, number[]> };
const catalogIndexCache = new Map<TranslatedLocale, CatalogIndex>();

function getCatalogIndex(locale: TranslatedLocale): CatalogIndex {
  const cached = catalogIndexCache.get(locale);
  if (cached) return cached;
  const entries = Object.entries(catalogs?.[locale] ?? {})
    .filter(([english]) => english.length >= 4)
    .sort((a, b) => b[0].length - a[0].length)
    .map(([english, localized]) => {
      const escaped = english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`${/^[A-Za-z]/.test(english) ? '(?<![A-Za-z])' : ''}${escaped}${/[A-Za-z]$/.test(english) ? '(?![A-Za-z])' : ''}`, 'g');
      return { english, localized, pattern };
    });
  const byPrefix = new Map<string, number[]>();
  entries.forEach(({ english }, index) => {
    const prefix = english.slice(0, 2);
    const matches = byPrefix.get(prefix) ?? [];
    matches.push(index);
    byPrefix.set(prefix, matches);
  });
  const index = { entries, byPrefix };
  catalogIndexCache.set(locale, index);
  return index;
}
const originalText = new WeakMap<Text, { source: string; output: string }>();
const originalAttributes = new WeakMap<Element, Map<string, { source: string; output: string }>>();
const ATTRIBUTES = ['alt', 'aria-label', 'title', 'placeholder'] as const;
const TERMINOLOGY: Record<Exclude<GameLocale, 'en'>, Array<[string, string]>> = {
  'zh-Hant': [['我們選擇的道路', '抉擇之路'], ['戰鬥機', '戰士'], ['甲板', '牌組'], ['統計數據', '屬性'], ['流氓', '盜賊']],
  'zh-Hans': [['我们选择的道路', '抉择之路'], ['战斗机', '战士'], ['甲板', '卡组'], ['统计数据', '属性'], ['流氓', '盗贼']],
  ja: [['私たちが選ぶ道', '選択の道'], ['戦闘機', '戦士'], ['卓上統計力学', '卓上ゲームの能力値ルール']],
  ko: [['우리가 선택한 길', '선택의 길'], ['전투기', '전사'], ['갑판', '덱'], ['통계', '능력치']],
};

function useGameTerminology(value: string, locale: Exclude<GameLocale, 'en'>): string {
  let result = value;
  for (const [generic, gameTerm] of TERMINOLOGY[locale]) result = result.replaceAll(generic, gameTerm);
  return result;
}

function translate(source: string, locale: GameLocale): string {
  if (locale === 'en') return source;
  const catalog = catalogs?.[locale];
  if (!catalog) return source;
  const trim = source.trim();
  const exact = catalog[trim];
  if (exact) return source.replace(trim, useGameTerminology(exact, locale));
  // Dynamic labels combine a translated phrase with live numbers or card names.
  // Replace only source-language phrases, in longest-first order, once per node.
  let result = source;
  const { entries, byPrefix } = getCatalogIndex(locale);
  const candidateIndices = new Set<number>();
  for (let i = 0; i < source.length - 1; i++) {
    for (const index of byPrefix.get(source.slice(i, i + 2)) ?? []) {
      candidateIndices.add(index);
    }
  }
  for (const index of [...candidateIndices].sort((a, b) => a - b)) {
    const { english, localized, pattern } = entries[index];
    if (!result.includes(english)) continue;
    result = result.replace(pattern, () => localized);
  }
  return useGameTerminology(result, locale);
}

export function localizePlayerText(source: string): string {
  return translate(source, getGameLocale());
}

function translateText(node: Text, locale: GameLocale): void {
  if (!node.textContent?.trim() || node.parentElement?.closest('script, style, code, pre')) return;
  const previous = originalText.get(node);
  const source = previous && node.textContent === previous.output ? previous.source : node.textContent;
  const output = translate(source, locale);
  originalText.set(node, { source, output });
  if (output !== node.textContent) node.textContent = output;
}

function translateAttributes(element: Element, locale: GameLocale): void {
  const known = originalAttributes.get(element) ?? new Map();
  for (const attr of ATTRIBUTES) {
    const value = element.getAttribute(attr);
    if (!value) continue;
    const prior = known.get(attr);
    const source = prior && value === prior.output ? prior.source : value;
    const output = translate(source, locale);
    known.set(attr, { source, output });
    if (value !== output) element.setAttribute(attr, output);
  }
  originalAttributes.set(element, known);
}

export function localizeGameTree(root: Element): void {
  const locale = getGameLocale();
  translateAttributes(root, locale);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.TEXT_NODE) translateText(node as Text, locale);
    else translateAttributes(node as Element, locale);
  }
}

export function observeLocalizedGame(root: Element): MutationObserver {
  const observer = new MutationObserver(records => {
    if (getGameLocale() === 'en') return;
    const changed = new Set<Element>();
    for (const record of records) {
      if (record.type === 'attributes') changed.add(record.target as Element);
      else if (record.type === 'characterData') {
        const parent = record.target.parentElement;
        if (parent) changed.add(parent);
      } else {
        for (const added of record.addedNodes) {
          if (added instanceof Element) changed.add(added);
          else if (added.parentElement) changed.add(added.parentElement);
        }
      }
    }
    for (const element of changed) if (root.contains(element)) localizeGameTree(element);
  });
  observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [...ATTRIBUTES] });
  return observer;
}

import generated from './generated.json';
import { getGameLocale } from './index';
import type { GameLocale } from './locale';
import { EDITORIAL_OVERRIDES } from './overrides';

type Catalog = Record<Exclude<GameLocale, 'en'>, Record<string, string>>;
const catalogs = Object.fromEntries(Object.entries(generated).map(([locale, entries]) => [locale, {
  ...(entries as Record<string, string>),
  ...EDITORIAL_OVERRIDES[locale as Exclude<GameLocale, 'en'>],
}])) as Catalog;
const catalogEntries = Object.fromEntries(Object.entries(catalogs).map(([locale, entries]) => [
  locale,
  Object.entries(entries).filter(([english]) => english.length >= 4).sort((a, b) => b[0].length - a[0].length).map(([english, localized]) => {
    const escaped = english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`${/^[A-Za-z]/.test(english) ? '(?<![A-Za-z])' : ''}${escaped}${/[A-Za-z]$/.test(english) ? '(?![A-Za-z])' : ''}`, 'g');
    return { english, localized, pattern };
  }),
])) as Record<Exclude<GameLocale, 'en'>, Array<{ english: string; localized: string; pattern: RegExp }>>;
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
  const catalog = catalogs[locale];
  const trim = source.trim();
  const exact = catalog[trim];
  if (exact) return source.replace(trim, useGameTerminology(exact, locale));
  // Dynamic labels combine a translated phrase with live numbers or card names.
  // Replace only source-language phrases, in longest-first order, once per node.
  let result = source;
  for (const { english, localized, pattern } of catalogEntries[locale]) {
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

/**
 * Game Icon helpers for raster icons sliced from public/icons/icons.png
 */

export type StatKey = 'str' | 'dex' | 'agi' | 'int' | 'cha' | 'luk';
export type DerivedStatKey = 'acc' | 'eva' | 'atk' | 'def' | 'matk' | 'mdef';
export type SlotKey = 'weapon' | 'armor' | 'accessory';
export type ResourceKey = 'sp' | 'gold';

export function getStatIcon(
  stat: string,
  extraClass = '',
  alt?: string
): string {
  const key = stat.toLowerCase();
  return `<img src="/icons/${key}.png" alt="${alt ?? stat.toUpperCase()}" class="game-icon stat-icon ${extraClass}" loading="lazy" />`;
}

export function getDerivedStatIcon(
  derived: string,
  extraClass = '',
  alt?: string
): string {
  const key = derived.toLowerCase();
  if (key === 'act') {
    return `<span class="game-icon derived-icon act-icon ${extraClass}" aria-label="Action Points">⚡</span>`;
  }
  return `<img src="/icons/${key}.png" alt="${alt ?? derived.toUpperCase()}" class="game-icon derived-icon ${extraClass}" loading="lazy" />`;
}

export function getSlotIcon(
  slot: string,
  extraClass = '',
  alt?: string
): string {
  const key = slot.toLowerCase();
  const file = key === 'weapon' || key === 'armor' || key === 'accessory' ? `slot-${key}` : key;
  return `<img src="/icons/${file}.png" alt="${alt ?? slot}" class="game-icon slot-icon ${extraClass}" loading="lazy" />`;
}

export function getResourceIcon(
  res: 'sp' | 'gold',
  extraClass = '',
  alt?: string
): string {
  const file = res.toLowerCase();
  return `<img src="/icons/${file}.png" alt="${alt ?? res.toUpperCase()}" class="game-icon resource-icon ${extraClass}" loading="lazy" />`;
}

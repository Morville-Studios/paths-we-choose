import treasuresData from '../../data/treasures.json';
import { ShopItemDef } from '../core/types';

export type ShopItemTemplate = Omit<ShopItemDef, 'instanceId'>;

/**
 * Physical supply count per item template:
 * Health Potions have (6 - level) copies (Lvl 1: 5, Lvl 2: 4, Lvl 3: 3, Lvl 4: 2);
 * all other treasure items have 2 physical copies.
 */
export function getTreasureSupplyCount(tpl: Pick<ShopItemDef, 'id' | 'category' | 'level'>): number {
  if (tpl.category === 'consumable' && tpl.id.includes('health_potion')) {
    return Math.max(1, 6 - (tpl.level ?? 1));
  }
  return 2;
}

export const SHOP_ITEM_CATALOG: ShopItemTemplate[] = treasuresData
  .filter((entry) => entry.type === 'treasure')
  .map(({ type: _type, ...item }) => item as ShopItemTemplate);

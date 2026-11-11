import { describe, expect, it } from 'vitest';
import { drawTreasureCardsWithReshuffle, drawTreasureUntilLevel } from '../core/deck';
import { startAdventure, villageChooseShop, villageGoBack } from '../core/engine';
import { RunState, ShopItemDef } from '../core/types';
import { SHOP_ITEM_CATALOG } from '../data/shopItems';

const make = (level: number, id: string): ShopItemDef => ({ ...SHOP_ITEM_CATALOG[0], id, instanceId: id, name: id, level });

describe('treasure mechanics: shop level band and exploration cap', () => {
  it('accepts a village-level item or one level below and discards higher cards', () => {
    const low = make(1, 'low'); const valid = make(2, 'valid'); const high = make(3, 'high');
    const result = drawTreasureCardsWithReshuffle([high, low, valid], [], 1, 42, 0, 2);
    expect(result.drawn).toEqual([low]);
    expect(result.discard).toEqual([high]);
    expect(result.discardedInvalid).toEqual([high]);
    expect(result.deck).toEqual([valid]);
  });

  it('fills seven Level 2 stock slots across a reshuffle after rejecting the last Level 3 card', () => {
    const high = make(3, 'high');
    const stock = Array.from({ length: 7 }, (_, i) => make(2, `stock${i}`));
    const deck = [high]; const graveyard = [...stock];
    const before = JSON.stringify({ deck, graveyard });
    const result = drawTreasureCardsWithReshuffle(deck, graveyard, 7, 42, 0, 2);
    expect(result.drawn).toHaveLength(7);
    expect(result.drawn.every(item => item.level === 2)).toBe(true);
    expect(new Set(result.drawn.map(item => item.instanceId)).size).toBe(7);
    expect([...result.deck, ...result.discard]).toEqual([high]);
    expect(result.reshuffleCount).toBe(1);
    expect(JSON.stringify({ deck, graveyard })).toBe(before);
    expect(drawTreasureCardsWithReshuffle(deck, graveyard, 7, 42, 0, 2)).toEqual(result);
  });

  it.each([1, 2])('Level 2 undiscovered terrain accepts a Level %i reward after rejecting Level 3 and recycling', level => {
    const high = make(3, 'high'); const valid = make(level, 'valid');
    const result = drawTreasureUntilLevel([high], [valid], 2, 42);
    expect(result.item).toEqual(valid);
    expect(result.reshuffleCount).toBe(1);
    expect([...result.deck, ...result.discard]).toEqual([high]);
  });

  it('discovery starting with an empty deck immediately reshuffles and finds its reward', () => {
    const reward = make(2, 'reward');
    expect(drawTreasureUntilLevel([], [reward], 2, 42, 3)).toMatchObject({ item: reward, reshuffleCount: 4 });
  });

  function village(level: number): RunState {
    const state = startAdventure('fighter', 'level-shop');
    const node = Object.values(state.board).find(n => n.status === 'available')!;
    node.card = { ...node.card, level, hasVillage: true, hasHostile: false, hasShrine: false };
    state.activeHook = { type: 'VILLAGE', village: { coord: node.coord, turn: 1, subView: 'main', trainOptions: [], shopStock: [], actionTaken: false } };
    return state;
  }

  it.each([1, 2])('village Level %i fills its stock with matching cards and preserves physical-card ownership', level => {
    const shop = villageChooseShop(village(level));
    if (shop.activeHook.type !== 'VILLAGE') throw new Error('Expected village');
    expect(shop.activeHook.village.shopStock).toHaveLength(5 + level);
    expect(shop.activeHook.village.shopStock.every(item => (item.level ?? 1) >= Math.max(1, level - 1) && (item.level ?? 1) <= level)).toBe(true);
    const cards = [...shop.treasureDeck, ...shop.treasureDiscard, ...shop.activeHook.village.shopStock];
    expect(cards).toHaveLength(42);
    expect(new Set(cards.map(item => item.instanceId)).size).toBe(42);
  });

  it('fills a Level 3 store from Level 2 and Level 3 physical cards without minting copies', () => {
    const shop = villageChooseShop(village(3));
    if (shop.activeHook.type !== 'VILLAGE') throw new Error('Expected village');
    expect(shop.activeHook.village.shopStock).toHaveLength(8);
    expect(shop.activeHook.village.shopStock.every(item => item.level === 2 || item.level === 3)).toBe(true);
    expect([...shop.treasureDeck, ...shop.treasureDiscard, ...shop.activeHook.village.shopStock]).toHaveLength(42);
  });

  it('uses Level 4 supply in a Level 5 store and does not redraw partial stock when reopening', () => {
    const shop = villageChooseShop(village(5));
    if (shop.activeHook.type !== 'VILLAGE') throw new Error('Expected village');
    expect(shop.activeHook.village.shopStock).toHaveLength(2);
    expect(shop.activeHook.village.shopStock.every(item => item.level === 4)).toBe(true);
    expect(shop.activeHook.village.shopStockDrawn).toBe(true);
    expect(shop.treasureDiscard).toHaveLength(40);
    const reopened = villageChooseShop(villageGoBack(shop));
    expect(reopened.treasureDeck).toEqual(shop.treasureDeck);
    expect(reopened.treasureDiscard).toEqual(shop.treasureDiscard);
    expect(reopened.rngState).toBe(shop.rngState);
    expect(reopened.treasureReshuffleCount).toBe(shop.treasureReshuffleCount);
  });
});

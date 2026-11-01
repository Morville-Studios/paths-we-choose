import { describe, expect, it } from 'vitest';
import { drawTreasureCardsWithReshuffle, drawTreasureUntilLevel } from '../core/deck';
import { startAdventure, villageChooseShop, villageGoBack } from '../core/engine';
import { RunState, ShopItemDef } from '../core/types';
import { SHOP_ITEM_CATALOG } from '../data/shopItems';

const make = (level: number, id: string): ShopItemDef => ({ ...SHOP_ITEM_CATALOG[0], id, instanceId: id, name: id, level });

describe('treasure mechanics: shop equality and exploration cap', () => {
  it('keeps only exact village-level items, discarding both lower and higher cards immediately', () => {
    const low = make(1, 'low'); const valid = make(2, 'valid'); const high = make(3, 'high');
    const result = drawTreasureCardsWithReshuffle([low, high, valid], [], 1, 42, 0, 2);
    expect(result.drawn).toEqual([valid]);
    expect(result.discard).toEqual([low, high]);
    expect(result.discardedInvalid).toEqual([low, high]);
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
    expect(shop.activeHook.village.shopStock.every(item => item.level === level)).toBe(true);
    const cards = [...shop.treasureDeck, ...shop.treasureDiscard, ...shop.activeHook.village.shopStock];
    expect(cards).toHaveLength(28);
    expect(new Set(cards.map(item => item.instanceId)).size).toBe(28);
  });

  it('cannot endlessly reshuffle an absent catalog level, and does not redraw empty stock when reopening', () => {
    const shop = villageChooseShop(village(3));
    if (shop.activeHook.type !== 'VILLAGE') throw new Error('Expected village');
    expect(shop.activeHook.village.shopStock).toEqual([]);
    expect(shop.activeHook.village.shopStockDrawn).toBe(true);
    expect(shop.treasureDiscard).toHaveLength(28);
    const reopened = villageChooseShop(villageGoBack(shop));
    expect(reopened.treasureDeck).toEqual(shop.treasureDeck);
    expect(reopened.treasureDiscard).toEqual(shop.treasureDiscard);
    expect(reopened.rngState).toBe(shop.rngState);
    expect(reopened.treasureReshuffleCount).toBe(shop.treasureReshuffleCount);
  });
});

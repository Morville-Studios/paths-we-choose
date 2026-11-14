import { describe, expect, it } from 'vitest';
import { drawTreasureCardsWithReshuffle, drawTreasureUntilLevel } from '../core/deck';
import { finishVillage, startAdventure, startNextMission, villageChooseShop, villageGoBack } from '../core/engine';
import { RunState, ShopItemDef } from '../core/types';
import { SHOP_ITEM_CATALOG } from '../data/shopItems';

const make = (level: number, id: string): ShopItemDef => ({ ...SHOP_ITEM_CATALOG[0], id, instanceId: id, name: id, level });

describe('treasure mechanics: exact shop level, deduplication, and exploration cap', () => {
  it('accepts only exact village-level items and discards wrong-level or duplicate cards', () => {
    const low = make(1, 'low');
    const valid = make(2, 'valid');
    const validDup: ShopItemDef = { ...valid, instanceId: 'valid_dup' };
    const high = make(3, 'high');
    const other = make(2, 'other');
    const result = drawTreasureCardsWithReshuffle([high, low, valid, validDup, other], [], 2, 42, 0, 2);
    expect(result.drawn).toEqual([valid, other]);
    expect(result.discard).toEqual([high, low, validDup]);
    expect(result.discardedInvalid).toEqual([high, low, validDup]);
    expect(result.deck).toEqual([]);
  });

  it('fills five Level 2 stock slots across a reshuffle after rejecting the last Level 3 card', () => {
    const high = make(3, 'high');
    const stock = Array.from({ length: 5 }, (_, i) => make(2, `stock${i}`));
    const deck = [high]; const graveyard = [...stock];
    const before = JSON.stringify({ deck, graveyard });
    const result = drawTreasureCardsWithReshuffle(deck, graveyard, 5, 42, 0, 2);
    expect(result.drawn).toHaveLength(5);
    expect(result.drawn.every(item => item.level === 2)).toBe(true);
    expect(new Set(result.drawn.map(item => item.id)).size).toBe(5);
    expect([...result.deck, ...result.discard]).toEqual([high]);
    expect(result.reshuffleCount).toBe(1);
    expect(JSON.stringify({ deck, graveyard })).toBe(before);
    expect(drawTreasureCardsWithReshuffle(deck, graveyard, 5, 42, 0, 2)).toEqual(result);
  });

  it('stops with partial stock when only duplicate exact-level cards remain', () => {
    const sword1 = make(1, 'sword');
    const sword2: ShopItemDef = { ...sword1, instanceId: 'sword_2' };
    const result = drawTreasureCardsWithReshuffle([sword1], [sword2], 4, 42, 0, 1);
    expect(result.drawn).toEqual([sword1]);
    expect(result.discard).toEqual([sword2]);
    expect(result.deck).toEqual([]);
    expect(result.reshuffleCount).toBe(0);

    const fromEmptyDeck = drawTreasureCardsWithReshuffle([], [sword1, sword2], 4, 42, 0, 1);
    expect(fromEmptyDeck.drawn).toEqual([sword1]);
    expect(fromEmptyDeck.discard).toEqual([sword2]);
    expect(fromEmptyDeck.deck).toEqual([]);
    expect(fromEmptyDeck.reshuffleCount).toBe(1);
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

  function village(level: number, mission = 1): RunState {
    let state = startAdventure('fighter', 'level-shop');
    for (let m = 1; m < mission; m++) {
      state = startNextMission(finishVillage(state));
    }
    state = finishVillage(state);
    const node = Object.values(state.board).find(n => n.status === 'available')!;
    node.card = { ...node.card, level, hasVillage: true, hasHostile: false, hasShrine: false };
    state.activeHook = { type: 'VILLAGE', village: { coord: node.coord, turn: 1, subView: 'main', trainOptions: [], shopStock: [], actionTaken: false } };
    return state;
  }

  it.each([1, 2])('village Level %i fills 3 + level unique exact-level slots and preserves physical-card ownership', level => {
    const shop = villageChooseShop(village(level));
    if (shop.activeHook.type !== 'VILLAGE') throw new Error('Expected village');
    expect(shop.activeHook.village.shopStock).toHaveLength(3 + level);
    expect(shop.activeHook.village.shopStock.every(item => (item.level ?? 1) === level)).toBe(true);
    expect(new Set(shop.activeHook.village.shopStock.map(item => item.id)).size).toBe(3 + level);
    const equipped = Object.values(shop.equippedGear).filter((item): item is NonNullable<typeof item> => item !== null);
    const cards = [...shop.treasureDeck, ...shop.treasureDiscard, ...shop.activeHook.village.shopStock, ...equipped, ...(shop.treasureVoid ?? [])];
    expect(cards).toHaveLength(48);
    expect(new Set(cards.map(item => item.instanceId)).size).toBe(48);
  });

  it('fills a Level 3 store in Scenario 2 with available unique Level 3 physical cards without minting copies', () => {
    const shop = villageChooseShop(village(3, 2));
    if (shop.activeHook.type !== 'VILLAGE') throw new Error('Expected village');
    expect(shop.activeHook.village.shopStock).toHaveLength(1);
    expect(shop.activeHook.village.shopStock.every(item => item.level === 3)).toBe(true);
    const equipped = Object.values(shop.equippedGear).filter((item): item is NonNullable<typeof item> => item !== null);
    expect([...shop.treasureDeck, ...shop.treasureDiscard, ...shop.activeHook.village.shopStock, ...equipped, ...(shop.treasureVoid ?? [])]).toHaveLength(48);
  });

  it('stops cleanly with empty stock in a Level 5 store (no Level 5 items defined) and does not redraw when reopening', () => {
    const shop = villageChooseShop(village(5));
    if (shop.activeHook.type !== 'VILLAGE') throw new Error('Expected village');
    expect(shop.activeHook.village.shopStock).toHaveLength(0);
    expect(shop.activeHook.village.shopStockDrawn).toBe(true);
    expect(shop.treasureDiscard).toHaveLength(41);
    const reopened = villageChooseShop(villageGoBack(shop));
    expect(reopened.treasureDeck).toEqual(shop.treasureDeck);
    expect(reopened.treasureDiscard).toEqual(shop.treasureDiscard);
    expect(reopened.rngState).toBe(shop.rngState);
    expect(reopened.treasureReshuffleCount).toBe(shop.treasureReshuffleCount);
  });
});

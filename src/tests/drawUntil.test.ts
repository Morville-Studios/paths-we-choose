import { describe, expect, it } from 'vitest';
import { drawEncounterMonsters, drawMonsterCardWithReshuffle, drawTreasureCardsWithReshuffle, drawTreasureUntilLevel } from '../core/deck';
import { chooseCard, getAvailableCoords, startAdventure } from '../core/engine';
import { MonsterCard, RunState, ShopItemDef } from '../core/types';
import { MONSTER_TEMPLATES } from '../data/monsters';
import { SHOP_ITEM_CATALOG } from '../data/shopItems';
import { explorationModal, pileModal } from '../ui/render';

const goblin: MonsterCard = { ...MONSTER_TEMPLATES.goblin, id: 'goblin' };
const bull: MonsterCard = { ...MONSTER_TEMPLATES.bullwark, id: 'bull' };
const rattler: MonsterCard = { ...MONSTER_TEMPLATES.rattler, id: 'rattler' };
const low: ShopItemDef = { ...SHOP_ITEM_CATALOG.find(i => i.level === 1)!, instanceId: 'low' };
const high: ShopItemDef = { ...SHOP_ITEM_CATALOG.find(i => i.level === 2)!, instanceId: 'high' };

describe('ability searches and recycling game mechanics', () => {
  it('fizzles on the last over-level monster without searching the graveyard or advancing RNG', () => {
    const result = drawMonsterCardWithReshuffle([bull], [goblin], 42, 'forest', 1);
    expect(result).toMatchObject({ monster: null, deck: [], discard: [goblin, bull], nextState: 42, cardsExamined: 1 });
    const next = drawMonsterCardWithReshuffle(result.deck, result.discard, result.nextState, 'forest', 1);
    expect(next.monster?.id).toBe('goblin');
  });

  it('examines terrain rejects only once, retaining the bottom-of-deck rule', () => {
    const deck = [rattler, { ...rattler, id: 'rattler2' }];
    const before = JSON.stringify(deck);
    const result = drawMonsterCardWithReshuffle(deck, [goblin], 42, 'grasslands', 2);
    expect(result.monster).toBeNull();
    expect(result.cardsExamined).toBe(2);
    expect(result.deck).toEqual(deck);
    expect(result.discard).toEqual([goblin]);
    expect(JSON.stringify(deck)).toBe(before);
  });

  it('recycles mid-encounter to fill the budget without inserting fallback creatures', () => {
    const result = drawEncounterMonsters([goblin, bull], [{ ...goblin, id: 'grave_goblin' }], 42, 2, 'grasslands');
    expect(result.monsters.map(m => m.id)).toEqual(['goblin', 'grave_goblin']);
    expect(result.supplyExhausted).toBe(false);
    expect([...result.deck, ...result.discard].map(m => m.id)).toEqual(['bull']);
  });

  it('does not revisit rotated terrain rejects after selecting a valid creature', () => {
    const result = drawEncounterMonsters([rattler, goblin], [], 42, 2, 'grasslands');
    expect(result.monsters).toEqual([goblin]);
    expect(result.deck).toEqual([rattler]);
    expect(result.supplyExhausted).toBe(true);
  });

  it('recycles when the entire initial deck is rejected for level', () => {
    const result = drawEncounterMonsters([bull], [goblin], 42, 1, 'grasslands');
    expect(result.monsters).toEqual([goblin]);
    expect(result.supplyExhausted).toBe(false);
    expect([...result.deck, ...result.discard]).toEqual([bull]);
  });

  it('does not access the graveyard while terrain rejects keep the deck nonempty', () => {
    const result = drawEncounterMonsters([rattler], [goblin], 42, 2, 'grasslands');
    expect(result).toMatchObject({ monsters: [], deck: [rattler], discard: [goblin], nextState: 42, supplyExhausted: true });
  });

  it('conserves physical copies and replays deterministically across recycling', () => {
    const deck = [goblin, bull];
    const discard = [{ ...goblin, id: 'grave1' }, { ...goblin, id: 'grave2' }];
    const before = JSON.stringify({ deck, discard });
    const result = drawEncounterMonsters(deck, discard, 42, 2, 'grasslands');
    expect(drawEncounterMonsters(deck, discard, 42, 2, 'grasslands')).toEqual(result);
    expect(JSON.stringify({ deck, discard })).toBe(before);
    const ids = [...result.monsters, ...result.deck, ...result.discard].map(m => m.id).sort();
    expect(ids).toEqual(['goblin', 'bull', 'grave1', 'grave2'].sort());
    expect(new Set(ids).size).toBe(4);
  });

  it('starts combat using recycled creatures rather than clearing the encounter', () => {
    const { state, coord } = encounterState();
    state.monsterDiscard = [goblin, { ...goblin, id: 'grave_goblin' }];
    const result = chooseCard(state, coord);
    if (result.activeHook.type !== 'COMBAT') throw new Error('Expected ordinary combat');
    expect(result.activeHook.combat.monsters.map(m => m.monster.id).sort()).toEqual(['goblin', 'grave_goblin']);
    expect(result.bannerMessage).not.toContain('fizzl');
  });

  it('succeeds if the last card satisfies the condition', () => {
    expect(drawEncounterMonsters([goblin], [], 42, 1, 'grasslands')).toMatchObject({ monsters: [goblin], deck: [], supplyExhausted: false });
    expect(drawTreasureUntilLevel([high, low], [], 1, 42)).toMatchObject({ item: low, deck: [], discard: [high], reshuffleCount: 0 });
  });

  it('an empty monster deck with no eligible supply stops without unnecessary shuffling', () => {
    expect(drawEncounterMonsters([], [bull], 42, 1, 'grasslands')).toMatchObject({ monsters: [], deck: [], discard: [bull], supplyExhausted: true });
    expect(drawMonsterCardWithReshuffle([], [], 42)).toMatchObject({ monster: null, cardsExamined: 0, nextState: 42 });
  });

  it('treasure discovery recycles after rejecting the last card instead of ability-fizzling', () => {
    const result = drawTreasureUntilLevel([high], [low], 1, 42);
    expect(result.item).toEqual(low);
    expect(result.reshuffleCount).toBe(1);
    expect([...result.deck, ...result.discard]).toEqual([high]);
    expect(result.discardedOverLevel).toContainEqual(high);
  });

  it('impossible treasure supplies terminate safely without an endless loop', () => {
    expect(drawTreasureUntilLevel([], [high], 1, 42)).toMatchObject({ item: null, deck: [], discard: [high], reshuffleCount: 1 });
    expect(drawTreasureUntilLevel([], [], 1, 42)).toMatchObject({ item: null, deck: [], discard: [], reshuffleCount: 0 });
  });

  it('ordinary fixed-count draws still reshuffle when another card is needed', () => {
    expect(drawTreasureCardsWithReshuffle([high], [low], 2, 42)).toMatchObject({ drawn: [high, low], deck: [], discard: [], reshuffleCount: 1 });
  });

  it('does not offer a treasure claim when no eligible supply exists', () => {
    const html = explorationModal({ coord: { col: 0, row: 1 }, roll: 6, outcome: 'treasure', foundItem: null,
      card: { id: 'land', name: 'Undiscovered Grassland', terrain: 'grasslands', level: 1, hasHostile: false, hasVillage: false, hasShrine: false, revealed: true } });
    expect(html).toContain('No Treasure Available');
    expect(html.toLowerCase()).not.toContain('fizzl');
    expect(html).toContain('Continue Journey');
    expect(html).not.toContain('Claim Treasure');
  });

  function encounterState(maxTurns = 2): { state: RunState; coord: { col: number; row: number } } {
    const state = startAdventure('fighter', 'fizzle');
    state.welcomePreparing = false;
    state.maxTurns = maxTurns;
    const coord = getAvailableCoords(state)[0];
    const node = Object.values(state.board).find(n => n.coord.col === coord.col && n.coord.row === coord.row)!;
    node.card = { ...node.card, terrain: 'grasslands', level: 2, hasHostile: true, hasVillage: false, hasShrine: false };
    state.monsterDeck = [bull];
    state.monsterDiscard = [];
    return { state, coord };
  }

  it('an empty encounter resolves normally without an empty battle or free victory rewards', () => {
    const { state, coord } = encounterState();
    const result = chooseCard(state, coord);
    expect(result.activeHook.type).toBe('NONE');
    expect(result.bannerMessage).toContain('No eligible monsters');
    expect(result.bannerMessage).not.toContain('fizzl');
    expect(result.currentMusic).toBe('map-area');
    expect(result.playerResources).toEqual(state.playerResources);
    expect(result.monsterDiscard.map(m => m.id)).toEqual(['bull']);
  });

  it('an unavailable encounter on the final map turn still triggers its boss', () => {
    const { state, coord } = encounterState(1);
    const result = chooseCard(state, coord);
    if (result.activeHook.type !== 'COMBAT') throw new Error('Expected boss combat');
    expect(result.activeHook.combat.monsters[0].monster.templateId).toBe('goblin_chieftain');
  });

  it('deck viewers disclose card counts in catalog order, not draw order; graveyards remain inspectable', () => {
    const state = startAdventure('fighter', 'visibility');
    state.monsterDeck = [goblin, bull, rattler];
    const first = pileModal('monster_deck', state);
    state.monsterDeck.reverse();
    expect(pileModal('monster_deck', state)).toBe(first);
    state.monsterDiscard = [goblin];
    expect(pileModal('monster_discard', state)).toContain('Goblin');
  });
});

import { describe, expect, it } from 'vitest';
import { drawEncounterEnemies, drawEnemyCardWithReshuffle, drawTreasureCardsWithReshuffle, drawTreasureUntilLevel } from '../core/deck';
import { chooseCard, confirmEncounterClear, finishVillage, getAvailableCoords, startAdventure, startBossCombat } from '../core/engine';
import { EnemyCard, RunState, ShopItemDef } from '../core/types';
import { ENEMY_TEMPLATES } from '../data/enemies';
import { SHOP_ITEM_CATALOG } from '../data/shopItems';
import { explorationModal, pileModal } from '../ui/render';

const goblin: EnemyCard = { ...ENEMY_TEMPLATES.goblin, id: 'goblin' };
const bull: EnemyCard = { ...ENEMY_TEMPLATES.bullwark, id: 'bull' };
const rattler: EnemyCard = { ...ENEMY_TEMPLATES.rattler, id: 'rattler' };
const low: ShopItemDef = { ...SHOP_ITEM_CATALOG.find(i => i.level === 1)!, instanceId: 'low' };
const high: ShopItemDef = { ...SHOP_ITEM_CATALOG.find(i => i.level === 2)!, instanceId: 'high' };

describe('ability searches and recycling game mechanics', () => {
  it('fizzles on the last over-level enemy without searching the graveyard or advancing RNG', () => {
    const result = drawEnemyCardWithReshuffle([bull], [goblin], 42, 'forest', 1);
    expect(result).toMatchObject({ enemy: null, deck: [], discard: [goblin, bull], nextState: 42, cardsExamined: 1 });
    const next = drawEnemyCardWithReshuffle(result.deck, result.discard, result.nextState, 'forest', 1);
    expect(next.enemy?.id).toBe('goblin');
  });

  it('examines terrain rejects only once, retaining the bottom-of-deck rule', () => {
    const deck = [rattler, { ...rattler, id: 'rattler2' }];
    const before = JSON.stringify(deck);
    const result = drawEnemyCardWithReshuffle(deck, [goblin], 42, 'grasslands', 2);
    expect(result.enemy).toBeNull();
    expect(result.cardsExamined).toBe(2);
    expect(result.deck).toEqual(deck);
    expect(result.discard).toEqual([goblin]);
    expect(JSON.stringify(deck)).toBe(before);
  });

  it('recycles mid-encounter to fill the budget without inserting fallback enemies', () => {
    const result = drawEncounterEnemies([goblin, bull], [{ ...goblin, id: 'grave_goblin' }], 42, 2, 'grasslands');
    expect(result.enemies.map(m => m.id)).toEqual(['goblin', 'grave_goblin']);
    expect(result.supplyExhausted).toBe(false);
    expect([...result.deck, ...result.discard].map(m => m.id)).toEqual(['bull']);
  });

  it('does not revisit rotated terrain rejects after selecting a valid enemy', () => {
    const result = drawEncounterEnemies([rattler, goblin], [], 42, 2, 'grasslands');
    expect(result.enemies).toEqual([goblin]);
    expect(result.deck).toEqual([rattler]);
    expect(result.supplyExhausted).toBe(true);
  });

  it('recycles when the entire initial deck is rejected for level', () => {
    const result = drawEncounterEnemies([bull], [goblin], 42, 1, 'grasslands');
    expect(result.enemies).toEqual([goblin]);
    expect(result.supplyExhausted).toBe(false);
    expect([...result.deck, ...result.discard]).toEqual([bull]);
  });

  it('does not access the graveyard while terrain rejects keep the deck nonempty', () => {
    const result = drawEncounterEnemies([rattler], [goblin], 42, 2, 'grasslands');
    expect(result).toMatchObject({ enemies: [], deck: [rattler], discard: [goblin], nextState: 42, supplyExhausted: true });
  });

  it('conserves physical copies and replays deterministically across recycling', () => {
    const deck = [goblin, bull];
    const discard = [{ ...goblin, id: 'grave1' }, { ...goblin, id: 'grave2' }];
    const before = JSON.stringify({ deck, discard });
    const result = drawEncounterEnemies(deck, discard, 42, 2, 'grasslands');
    expect(drawEncounterEnemies(deck, discard, 42, 2, 'grasslands')).toEqual(result);
    expect(JSON.stringify({ deck, discard })).toBe(before);
    const ids = [...result.enemies, ...result.deck, ...result.discard].map(m => m.id).sort();
    expect(ids).toEqual(['goblin', 'bull', 'grave1', 'grave2'].sort());
    expect(new Set(ids).size).toBe(4);
  });

  it('starts combat using recycled enemies rather than clearing the encounter', () => {
    const { state, coord } = encounterState();
    state.enemyDiscard = [goblin];
    const result = chooseCard(state, coord);
    if (result.activeHook.type !== 'COMBAT') throw new Error('Expected ordinary combat');
    expect(result.activeHook.combat.enemies.map(m => m.enemy.id)).toEqual(['goblin']);
    expect(result.bannerMessage).not.toContain('fizzl');
  });

  it('succeeds if the last card satisfies the condition', () => {
    expect(drawEncounterEnemies([goblin], [], 42, 1, 'grasslands')).toMatchObject({ enemies: [goblin], deck: [], supplyExhausted: false });
    expect(drawTreasureUntilLevel([high, low], [], 1, 42)).toMatchObject({ item: low, deck: [], discard: [high], reshuffleCount: 0 });
  });

  it('an empty enemy deck with no eligible supply stops without unnecessary shuffling', () => {
    expect(drawEncounterEnemies([], [bull], 42, 1, 'grasslands')).toMatchObject({ enemies: [], deck: [], discard: [bull], supplyExhausted: true });
    expect(drawEnemyCardWithReshuffle([], [], 42)).toMatchObject({ enemy: null, cardsExamined: 0, nextState: 42 });
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

  it('shows the already-awarded treasure card and only offers a return to the map', () => {
    const html = explorationModal({ coord: { col: 0, row: 1 }, roll: 6, outcome: 'treasure', foundItem: low,
      card: { id: 'land', name: 'Undiscovered Grassland', terrain: 'grasslands', level: 1, hasHostile: false, hasVillage: false, hasShrine: false, revealed: true } });
    expect(html).toContain('Congratulations! Treasure Chest Found!');
    expect(html).toContain('exploration-item-card');
    expect(html).toContain('/cards/items/');
    expect(html).toContain('Added directly to your Backpack');
    expect(html).toContain('Return to Map View');
    expect(html).not.toContain('Claim Treasure');
  });

  function encounterState(maxTurns = 2): { state: RunState; coord: { col: number; row: number } } {
    const state = finishVillage(startAdventure('fighter', 'fizzle'));
    state.welcomePreparing = false;
    state.maxTurns = maxTurns;
    const coord = getAvailableCoords(state)[0];
    const node = Object.values(state.board).find(n => n.coord.col === coord.col && n.coord.row === coord.row)!;
    node.card = { ...node.card, terrain: 'grasslands', level: 1, hasHostile: true, hasVillage: false, hasShrine: false };
    state.enemyDeck = [bull];
    state.enemyDiscard = [];
    return { state, coord };
  }

  it('an empty encounter resolves normally without an empty battle or free victory rewards', () => {
    const { state, coord } = encounterState();
    const result = chooseCard(state, coord);
    expect(result.activeHook.type).toBe('ENCOUNTER_CLEAR');
    expect(result.bannerMessage).toContain('no eligible enemies');
    expect(result.bannerMessage).not.toContain('fizzl');
    expect(result.currentMusic).toBeNull();
    expect(result.playerResources).toEqual(state.playerResources);
    expect(result.enemyDiscard.map(m => m.id)).toEqual(['bull']);
  });

  it('an unavailable encounter on the final map turn still triggers its boss', () => {
    const { state, coord } = encounterState(1);
    const result = chooseCard(state, coord);
    expect(result.activeHook.type).toBe('ENCOUNTER_CLEAR');
    const continued = confirmEncounterClear(result);
    expect(continued.activeHook.type).toBe('BOSS_APPROACH');
    const bossCombat = startBossCombat(continued);
    if (bossCombat.activeHook.type !== 'COMBAT') throw new Error('Expected boss combat after acknowledging encounter');
    expect(bossCombat.activeHook.combat.enemies[0].enemy.templateId).toBe('goblin_chieftain');
  });

  it('deck viewers disclose card counts in catalog order, not draw order; graveyards remain inspectable', () => {
    const state = startAdventure('fighter', 'visibility');
    state.enemyDeck = [goblin, bull, rattler];
    const first = pileModal('enemy_deck', state);
    state.enemyDeck.reverse();
    expect(pileModal('enemy_deck', state)).toBe(first);
    state.enemyDiscard = [goblin];
    expect(pileModal('enemy_discard', state)).toContain('Goblin');
  });
});

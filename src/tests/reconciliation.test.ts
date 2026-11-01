import { describe, expect, it } from 'vitest';
import { createCombatSession, endPlayerCombatTurn, evaluateAttackRoll } from '../core/combat';
import { buyItem, playCard, startAdventure } from '../core/engine';
import { SHOP_ITEM_CATALOG } from '../data/shopItems';
import { CombatCardDef, MonsterCard, RunState } from '../core/types';
import { MONSTER_TEMPLATES } from '../data/monsters';
import { Store } from '../state/store';
import { getEffectiveStatsFromState } from '../core/stats';
import { cardInspectModal, combatConfirmModal, renderPlayArea } from '../ui/render';

function critSeed(acc: number, eva: number): number {
  for (let seed = 1; seed < 10000; seed++) if (evaluateAttackRoll(seed, acc, eva).isCrit) return seed;
  throw new Error('No critical seed');
}
function combat(state: RunState) {
  if (state.activeHook.type !== 'COMBAT') throw new Error('Expected combat');
  return state.activeHook.combat;
}
function setup(damage: number): RunState {
  const state = startAdventure('wizard', 'reconciliation');
  const target: MonsterCard = { ...MONSTER_TEMPLATES.goblin, id: 'target', maxHp: 100, def: 0, eva: 0, pattern: [{ label: 'Strike', damage, block: 0 }] };
  const card: CombatCardDef = { id: 'strike', instanceId: 'strike', name: 'Strike', classId: 'wizard', cardType: 'attack', apCost: 1, baseDamage: damage, baseBlock: 0 };
  return { ...state, logTimestamp: '12:34:56', playerResources: { ...state.playerResources!, hp: 100, maxHp: 100 }, activeHook: { type: 'COMBAT', combat: { ...createCombatSession([target], [], 1).combat, hand: [card] } } };
}

describe('reconciled critical and replay rules', () => {
  it.each([1, 3, 5])('floors critical hero damage for base %i without an extra minimum', damage => {
    const state = setup(damage);
    state.rngState = critSeed(1, 0);
    expect(combat(playCard(state, 'strike', 0)).lastAttackRoll?.damageDealt).toBe(Math.floor(damage * 1.5));
  });

  it.each([1, 3, 5])('floors critical monster damage for base %i', damage => {
    const state = setup(damage);
    state.rngState = critSeed(1, 0);
    expect(combat(endPlayerCombatTurn(state)).lastAttackRoll?.damageDealt).toBe(Math.floor(damage * 1.5));
  });

  it('replays full combat state and logs from identical explicit inputs', () => {
    const state = setup(3);
    state.rngState = critSeed(1, 0);
    const before = JSON.stringify(state);
    const first = endPlayerCombatTurn(state);
    expect(endPlayerCombatTurn(state)).toEqual(first);
    expect(combat(first).combatLog.at(-1)).toContain('[12:34:56]');
    expect(JSON.stringify(state)).toBe(before);
    const session = createCombatSession([MONSTER_TEMPLATES.goblin as MonsterCard], [], 1, 3, '10:20:30');
    expect(session.combat.combatLog[0]).toContain('[10:20:30]');
  });

  it('injects the clock at the store boundary while preserving no-op identity', () => {
    const initial = setup(3);
    const store = new Store(initial, () => '01:02:03');
    const before = store.get();
    let notifications = 0;
    store.subscribe(() => { notifications++; });
    store.update(state => state);
    expect(store.get()).toBe(before);
    expect(notifications).toBe(0);
    store.update(endPlayerCombatTurn);
    expect(store.get().logTimestamp).toBe('01:02:03');
    expect(notifications).toBe(1);
    expect(combat(store.get()).combatLog.slice(1).every(entry => entry.startsWith('[01:02:03]'))).toBe(true);
  });

  it('shows the same DEX, gear and Berzerk damage in hand, confirmation and inspection', () => {
    const state = startAdventure('fighter', 'preview');
    state.playerBaseStats.dex = 2; // Effective DEX 3 contributes 1 damage.
    state.playerResources!.hp = 4; // Berzerk +2.
    state.equippedGear.weapon = { id: 'sword', instanceId: 'sword', name: 'Sword', category: 'weapon', description: '', buyPrice: 0, sellPrice: 0, gearBonus: { atk: 2 } };
    const card: CombatCardDef = { id: 'strike', instanceId: 'strike', name: 'Strike', classId: 'fighter', cardType: 'attack', apCost: 1, baseDamage: 2, damageScalingStat: 'str', damageScalingDivisor: 2, baseBlock: 0 };
    state.activeHook = { type: 'COMBAT', combat: { ...createCombatSession([{ ...MONSTER_TEMPLATES.goblin, id: 'goblin' }], [], 1).combat, hand: [card] } };
    // 2 base + 1 STR + 1 DEX + 2 weapon + 2 Berzerk = 8.
    const hand = renderPlayArea(state, { selectedClass: 'fighter', showDeck: false, villageTab: 'buy', targetIndex: 0 });
    expect(hand).toContain('Deal <b>8</b> DMG');
    const confirmation = combatConfirmModal(state, combat(state), { cardInstanceId: 'strike', targetIndex: 0 }, getEffectiveStatsFromState(state));
    expect(confirmation).toContain('Deal <b>8</b> DMG');
    const inspection = cardInspectModal({ kind: 'action', card }, state);
    expect(inspection).toContain('Deal <b>8</b> DMG');
    expect(inspection).toContain('DEX, gear and passive bonuses');
  });

  it('rejects unstocked purchases and transfers the stocked instance without creating a card', () => {
    const state = startAdventure('fighter', 'stock');
    const item = { ...SHOP_ITEM_CATALOG.find(item => item.id === 'lvl1_iron_sword')!, instanceId: 'owned_stock' };
    state.activeHook = { type: 'VILLAGE', village: { coord: { col: 0, row: 1 }, turn: 1, subView: 'shop', trainOptions: [], shopStock: [], actionTaken: false } };
    expect(buyItem(state, item.id)).toBe(state);
    state.activeHook.village.shopStock = [item];
    const next = buyItem(state, item.instanceId);
    expect(next.equippedGear.weapon?.instanceId).toBe(item.instanceId);
    if (next.activeHook.type !== 'VILLAGE') throw new Error('Expected village');
    expect(next.activeHook.village.shopStock).toHaveLength(0);
    expect(buyItem(next, item.id)).toBe(next);
  });
});

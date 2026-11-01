import { describe, expect, it } from 'vitest';
import { createCombatSession, endPlayerCombatTurn, evaluateAttackRoll } from '../core/combat';
import { playCard, startAdventure } from '../core/engine';
import { CombatCardDef, MonsterCard, RunState } from '../core/types';
import { MONSTER_TEMPLATES } from '../data/monsters';
import { cardInspectModal, renderPlayArea, UiState } from '../ui/render';

const stalker: MonsterCard = { ...MONSTER_TEMPLATES.stalker, id: 'stalker_test' };
const attack: CombatCardDef = { id: 'test', instanceId: 'test', name: 'Test', classId: 'fighter', cardType: 'attack', apCost: 1, baseDamage: 1, baseBlock: 0 };
const ui: UiState = { selectedClass: 'fighter', showDeck: false, villageTab: 'buy', targetIndex: 0 };
function setup(): RunState {
  const state = startAdventure('fighter', 'stalker');
  return { ...state, activeHook: { type: 'COMBAT', combat: { ...createCombatSession([stalker], [], 1).combat, hand: [attack] } } };
}
function battle(state: RunState) {
  if (state.activeHook.type !== 'COMBAT') throw new Error('Expected combat');
  return state.activeHook.combat;
}
function seedFor(hit: boolean, eva: number): number {
  for (let seed = 1; seed < 10000; seed++) {
    const roll = evaluateAttackRoll(seed, 1, eva);
    if (roll.isHit === hit && !roll.isCrit) return seed;
  }
  throw new Error('No seed');
}

describe('Stalker', () => {
  it('uses the supplied stats, art, terrain and Skittish rule', () => {
    expect(stalker).toMatchObject({ statPointReward: 2, goldReward: 4, level: 2, cardNumber: 'mon1grs-06', maxHp: 8, def: 0, eva: 2, acc: 1, spawnTerrains: ['grasslands', 'forest'] });
    const html = cardInspectModal({ kind: 'monster', monster: stalker, currentHp: 8 }, setup());
    for (const value of ['/cards/creatures/stalker.jpg', 'Sprint', 'Pounce', 'Skittish', '2 turns']) expect(html).toContain(value);
  });

  it('keeps Sprint for two turns including Pounce, then refreshes without stacking', () => {
    let state = endPlayerCombatTurn(setup());
    expect(battle(state).monsters[0]).toMatchObject({ evaBonus: 1, accBonus: 1, evaBonusTurns: 2, accBonusTurns: 2 });
    state = endPlayerCombatTurn(state);
    expect(battle(state).monsters[0]).toMatchObject({ evaBonus: 1, accBonus: 1, evaBonusTurns: 1, accBonusTurns: 1 });
    expect(battle(state).lastAttackRoll).toMatchObject({ actionName: 'Pounce', netAcc: 1 });
    state = endPlayerCombatTurn(state);
    expect(battle(state).monsters[0]).toMatchObject({ evaBonus: 1, accBonus: 1, evaBonusTurns: 2, accBonusTurns: 2 });
    // Remove further Sprint casts to observe expiration rather than refresh.
    battle(state).monsters[0].monster = { ...stalker, pattern: [{ label: 'Idle', damage: 0, block: 0 }] };
    state = endPlayerCombatTurn(endPlayerCombatTurn(state));
    expect(battle(state).monsters[0]).toMatchObject({ evaBonus: 0, accBonus: 0, evaBonusTurns: 0, accBonusTurns: 0 });
  });

  it('gains EVA immediately on each hit and uses it for the next attack and displayed odds', () => {
    const state = setup();
    state.rngState = seedFor(true, 2);
    const before = JSON.stringify(state);
    const next = playCard(state, 'test', 0);
    expect(battle(next).monsters[0]).toMatchObject({ evaBonus: 1, skittishEvaBonus: 1 });
    expect(JSON.stringify(state)).toBe(before);
    expect(renderPlayArea(next, ui)).toContain('TARGET (Roll 7+ · 58.3%)');
    battle(next).hand = [attack];
    next.rngState = seedFor(true, 3);
    const again = playCard(next, 'test', 0);
    expect(battle(again).lastAttackRoll?.netAcc).toBe(-2);
    expect(battle(again).monsters[0]).toMatchObject({ evaBonus: 2, skittishEvaBonus: 2 });
  });

  it('does not trigger on a miss, but does trigger on a hit fully absorbed by Block', () => {
    const state = setup();
    state.rngState = seedFor(false, 2);
    expect(battle(playCard(state, 'test', 0)).monsters[0].evaBonus ?? 0).toBe(0);
    state.rngState = seedFor(true, 2);
    battle(state).monsters[0].block = 10;
    const next = playCard(state, 'test', 0);
    expect(battle(next).monsters[0]).toMatchObject({ hp: 8, evaBonus: 1 });
  });

  it('expires Skittish at End Turn while retaining Sprint through Pounce', () => {
    const state = endPlayerCombatTurn(setup());
    battle(state).hand = [attack];
    state.rngState = seedFor(true, 3);
    const hit = playCard(state, 'test', 0);
    expect(battle(hit).monsters[0].evaBonus).toBe(2);
    const next = endPlayerCombatTurn(hit);
    expect(battle(next).monsters[0]).toMatchObject({ evaBonus: 1, accBonus: 1, skittishEvaBonus: 0 });
  });
});

import { describe, expect, it } from 'vitest';
import { createCombatSession, endPlayerCombatTurn, evaluateAttackRoll } from '../core/combat';
import { playCard, startAdventure } from '../core/engine';
import { ActionCardDef, EnemyCard, RunState } from '../core/types';
import { ENEMY_TEMPLATES } from '../data/enemies';
import { cardInspectModal, renderPlayArea, UiState } from '../ui/render';

const stalker: EnemyCard = { ...ENEMY_TEMPLATES.stalker, id: 'stalker_test' };
const attack: ActionCardDef = { id: 'test', instanceId: 'test', name: 'Test', classId: 'fighter', cardType: 'attack', apCost: 1, baseDamage: 1, baseBlock: 0 };
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
    const roll = evaluateAttackRoll(seed, 3, eva);
    if (roll.isHit === hit) return seed;
  }
  throw new Error('No seed');
}

describe('Stalker', () => {
  it('uses the supplied stats, art, terrain and Skittish rule', () => {
    expect(stalker).toMatchObject({ statPointReward: 3, goldReward: 10, level: 2, cardNumber: 'mon1grs-06', maxHp: 10, def: 0, eva: 4, acc: 3, spawnTerrains: ['grasslands', 'forest'] });
    const html = cardInspectModal({ kind: 'enemy', enemy: stalker, currentHp: 10 }, setup());
    for (const value of ['/cards/enemies/stalker.jpg', 'T1:', 'T2:', 'Skittish', '2 turns']) expect(html).toContain(value);
    expect(html).not.toContain('Pounce');
  });

  it('keeps EVA (1, 2) for two turns including Pounce while ACC (1) lasts 1 turn, then refreshes', () => {
    let state = endPlayerCombatTurn(setup());
    expect(battle(state).enemies[0]).toMatchObject({ evaBonus: 1, accBonus: 1, evaBonusTurns: 2, accBonusTurns: 1 });
    state = endPlayerCombatTurn(state);
    expect(battle(state).enemies[0]).toMatchObject({ evaBonus: 1, accBonus: 0, evaBonusTurns: 1, accBonusTurns: 0 });
    expect(battle(state).lastAttackRoll).toMatchObject({ actionName: 'Attack', netAcc: 1 });
    state = endPlayerCombatTurn(state);
    expect(battle(state).enemies[0]).toMatchObject({ evaBonus: 1, accBonus: 1, evaBonusTurns: 2, accBonusTurns: 1 });
    // Remove further Sprint casts to observe expiration rather than refresh.
    battle(state).enemies[0].enemy = { ...stalker, pattern: [{ label: 'Idle', damage: 0, block: 0 }] };
    state = endPlayerCombatTurn(endPlayerCombatTurn(state));
    expect(battle(state).enemies[0]).toMatchObject({ evaBonus: 0, accBonus: 0, evaBonusTurns: 0, accBonusTurns: 0 });
  });

  it('gains EVA immediately on each hit and uses it for the next attack and displayed odds', () => {
    const state = setup();
    state.rngState = seedFor(true, 4);
    const before = JSON.stringify(state);
    const next = playCard(state, 'test', 0);
    expect(battle(next).enemies[0]).toMatchObject({ evaBonus: 1, skittishEvaBonus: 1 });
    expect(JSON.stringify(state)).toBe(before);
    expect(renderPlayArea(next, ui)).toContain('TARGET (Hit: 9–12 · 48.1%)');
    battle(next).hand = [attack];
    next.rngState = seedFor(true, 5);
    const again = playCard(next, 'test', 0);
    expect(battle(again).lastAttackRoll?.netAcc).toBe(-2);
    expect(battle(again).enemies[0]).toMatchObject({ evaBonus: 2, skittishEvaBonus: 2 });
  });

  it('triggers on both a miss and a hit fully absorbed by Block', () => {
    const state = setup();
    state.rngState = seedFor(false, 4);
    expect(battle(playCard(state, 'test', 0)).enemies[0].evaBonus ?? 0).toBe(1);
    state.rngState = seedFor(true, 4);
    battle(state).enemies[0].block = 10;
    const next = playCard(state, 'test', 0);
    expect(battle(next).enemies[0]).toMatchObject({ hp: 10, evaBonus: 1 });
  });

  it('expires Skittish at End Turn while retaining EVA (1, 2) through Pounce', () => {
    const state = endPlayerCombatTurn(setup());
    battle(state).hand = [attack];
    state.rngState = seedFor(true, 5);
    const hit = playCard(state, 'test', 0);
    expect(battle(hit).enemies[0].evaBonus).toBe(2);
    const next = endPlayerCombatTurn(hit);
    expect(battle(next).enemies[0]).toMatchObject({ evaBonus: 1, accBonus: 0, skittishEvaBonus: 0 });
  });
});

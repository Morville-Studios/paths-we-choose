import { describe, expect, it } from 'vitest';
import { createCombatSession, endPlayerCombatTurn, evaluateAttackRoll } from '../core/combat';
import { startAdventure, villageDoRest } from '../core/engine';
import { applySingleShrineBoon } from '../core/shrine';
import { MonsterCard, RunState } from '../core/types';
import { MONSTER_TEMPLATES } from '../data/monsters';
import { cardInspectModal } from '../ui/render';

const assassin: MonsterCard = { ...MONSTER_TEMPLATES.assassin, id: 'assassin_test' };
function seedFor(hit: boolean, crit = false): number {
  for (let seed = 1; seed < 10000; seed++) {
    const roll = evaluateAttackRoll(seed, 2, 1);
    if (roll.isHit === hit && roll.isCrit === crit) return seed;
  }
  throw new Error('No matching roll');
}
function setup(): RunState {
  const state = startAdventure('fighter', 'assassin');
  return { ...state, rngState: seedFor(true), activeHook: { type: 'COMBAT', combat: createCombatSession([assassin], [], 1).combat } };
}
function battle(state: RunState) {
  if (state.activeHook.type !== 'COMBAT') throw new Error('Expected combat');
  return state.activeHook.combat;
}

describe('Assassin poison and piercing attacks', () => {
  it('shows the profile, exact artwork filename, Underground badge and attack effects', () => {
    expect(assassin).toMatchObject({ statPointReward: 4, goldReward: 8, level: 3, creatureType: 'Human', cardNumber: 'mon3smp-03', maxHp: 10, def: 1, eva: 3, acc: 2, mdef: 1, spawnTerrains: ['swamp', 'cave', 'underground'] });
    const html = cardInspectModal({ kind: 'monster', monster: assassin, currentHp: 10 }, setup());
    for (const text of ['/cards/creatures/assasin.jpg', 'Underground', 'Poison on hit', 'Ignore 2 DEF']) expect(html).toContain(text);
  });

  it('applies poison even when direct damage is fully blocked, including critical hits', () => {
    for (const crit of [false, true]) {
      const state = setup();
      state.rngState = seedFor(true, crit);
      battle(state).playerBlock = 100;
      const before = JSON.stringify(state);
      const next = endPlayerCombatTurn(state);
      expect(next.statusEffects).toEqual(['poison']);
      expect(next.playerResources?.hp).toBe(state.playerResources?.hp);
      expect(battle(next).lastAttackRoll?.damageDealt).toBe(0);
      expect(JSON.stringify(state)).toBe(before);
    }
  });

  it.each([0, 2, 4])('Poison Dart deals 3 physical damage ignoring up to 3 DEF (DEF %i)', def => {
    const state = setup();
    state.equippedGear.armor = { id: 'armor', instanceId: 'armor', name: 'Armor', category: 'armor', description: '', buyPrice: 0, sellPrice: 0, gearBonus: { def, mdef: 100 } };
    const next = endPlayerCombatTurn(state);
    expect(next.playerResources?.hp).toBe(state.playerResources!.hp - (3 - Math.max(0, def - 3)));
    expect(battle(next).lastAttackRoll).toMatchObject({ damageDealt: 3 - Math.max(0, def - 3), defenseType: 'DEF' });
    expect(next.statusEffects).toEqual(['poison']);
    expect(assassin.name).toBe('Assasin');
  });

  it('does not apply poison on a miss', () => {
    const state = setup();
    state.rngState = seedFor(false);
    const next = endPlayerCombatTurn(state);
    expect(next.statusEffects).toEqual([]);
    expect(next.playerResources?.hp).toBe(state.playerResources?.hp);
  });

  it('ticks once on subsequent End Turn, bypasses defenses, does not stack, and persists in later battles', () => {
    const state = setup();
    state.statusEffects = ['poison'];
    state.divineProtection = 100;
    battle(state).playerBlock = 100;
    const next = endPlayerCombatTurn(state);
    expect(next.statusEffects).toEqual(['poison']);
    expect(next.playerResources?.hp).toBe(state.playerResources!.hp - 1);
    expect(battle(next).combatLog.join(' ')).toContain('Poison deals 1 HP');
    next.activeHook = { type: 'COMBAT', combat: createCombatSession([{ ...assassin, pattern: [] }], [], 1).combat };
    expect(endPlayerCombatTurn(next).playerResources?.hp).toBe(state.playerResources!.hp - 2);
  });

  it('can kill the hero before monsters act', () => {
    const state = setup();
    state.statusEffects = ['poison'];
    state.playerResources!.hp = 1;
    const next = endPlayerCombatTurn(state);
    expect(next.activeHook).toMatchObject({ type: 'ON_GAME_OVER', defeatedBy: 'Poison' });
    expect(next.rngState).toBe(state.rngState);
  });

  it.each([0, 1, 2, 4])('ignores up to 2 physical DEF without making DEF negative (DEF %i)', def => {
    const state = setup();
    battle(state).monsters[0].patternIndex = 1;
    state.equippedGear.armor = { id: 'armor', instanceId: 'armor', name: 'Armor', category: 'armor', description: '', buyPrice: 0, sellPrice: 0, gearBonus: { def, mdef: 100 } };
    const next = endPlayerCombatTurn(state);
    expect(battle(next).lastAttackRoll).toMatchObject({ damageDealt: 7 - Math.max(0, def - 2), damageDefReduced: Math.max(0, def - 2), defenseType: 'DEF' });
  });

  it('keeps Block and Divine Protection effective against Piercing Strike', () => {
    const state = setup();
    battle(state).monsters[0].patternIndex = 1;
    battle(state).playerBlock = 2;
    state.divineProtection = 1;
    expect(battle(endPlayerCombatTurn(state)).lastAttackRoll).toMatchObject({ damageDealt: 4, damageBlocked: 2, damageProtReduced: 1 });
  });

  it('is cured by existing shrine cleanse and village rest', () => {
    const state = setup();
    state.statusEffects = ['poison'];
    expect(applySingleShrineBoon(state, 'cleanse').nextState.statusEffects).toEqual([]);
    state.activeHook = { type: 'VILLAGE', village: { coord: { col: 0, row: 1 }, turn: 1, subView: 'main', actionTaken: false, trainOptions: [], shopStock: [] } };
    expect(villageDoRest(state).statusEffects).toEqual([]);
  });
});

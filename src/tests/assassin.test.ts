import { describe, expect, it } from 'vitest';
import { createCombatSession, endPlayerCombatTurn, evaluateAttackRoll } from '../core/combat';
import { startAdventure, villageDoRest } from '../core/engine';
import { applySingleShrineBoon } from '../core/shrine';
import { MonsterCard, RunState } from '../core/types';
import { getEffectiveStatsFromState, getPlayerDef } from '../core/stats';
import { MONSTER_TEMPLATES } from '../data/monsters';
import { cardInspectModal } from '../ui/render';

const assassin: MonsterCard = { ...MONSTER_TEMPLATES.assassin, id: 'assassin_test' };
function seedFor(hit: boolean): number {
  for (let seed = 1; seed < 10000; seed++) {
    const roll = evaluateAttackRoll(seed, 4, 2);
    if (roll.isHit === hit && !roll.isDiabolic) return seed;
  }
  throw new Error('No matching roll');
}
function setup(): RunState {
  const state = startAdventure('fighter', 'assassin');
  return {
    ...state,
    equippedGear: { weapon: null, armor: null, accessory: null },
    rngState: seedFor(true),
    activeHook: { type: 'COMBAT', combat: createCombatSession([assassin], [], 1).combat },
  };
}
function battle(state: RunState) {
  if (state.activeHook.type !== 'COMBAT') throw new Error('Expected combat');
  return state.activeHook.combat;
}

describe('Assassin poison and piercing attacks', () => {
  it('shows the profile, exact artwork filename, Underground badge, Skittish (2), PEN (3), Poison (4, 2)', () => {
    expect(assassin).toMatchObject({ statPointReward: 4, goldReward: 15, level: 3, creatureType: 'Human', cardNumber: 'mon3smp-03', maxHp: 13, def: 2, eva: 4, acc: 4, mdef: 1, skittishEvaOnHit: 2, spawnTerrains: ['swamp', 'cave', 'underground'] });
    const html = cardInspectModal({ kind: 'monster', monster: assassin, currentHp: 13 }, setup());
    const plainHtml = html.replace(/<\/?b>/g, '');
    for (const text of ['/cards/creatures/assasin.jpg', 'Underground', 'Skittish (2)', 'ATK (5)', 'PEN (3)', 'ACC (2)', 'Poison (4, 2)']) expect(plainHtml).toContain(text);
  });

  it('T2 ACC (2), Poison (4, 2) inflicts Poison on hit and triggers MACG-3D6 vs VIT at Hero start phase', () => {
    const state = setup();
    battle(state).monsters[0].patternIndex = 1;
    // Find a seed where Assassin (ACC 4 + 2 = 6 vs Hero EVA 2 -> net +4) hits AND Poison (4 vs Fighter VIT 3 -> net +1) hits
    state.rngState = Array.from({ length: 10000 }, (_, i) => i + 1).find(seed => {
      const r1 = evaluateAttackRoll(seed, 6, 2);
      const r2 = evaluateAttackRoll(r1.nextState, 4, 3);
      return r1.isHit && r2.isHit;
    })!;
    const before = JSON.stringify(state);
    const next = endPlayerCombatTurn(state);
    expect(next.statusEffects).toEqual(['poison']);
    expect(battle(next).playerPoison).toEqual({ damage: 4, turnsRemaining: 1 });
    expect(next.playerResources?.hp).toBe(state.playerResources!.hp - 4);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('Hero can shake off Poison damage via MACG-3D6 vs VIT and Poison wears off after duration', () => {
    const state = setup();
    battle(state).monsters[0].patternIndex = 1;
    // Assassin hits, but Poison vs VIT misses (Hero shakes it off)
    state.rngState = Array.from({ length: 10000 }, (_, i) => i + 1).find(seed => {
      const r1 = evaluateAttackRoll(seed, 6, 2);
      const r2 = evaluateAttackRoll(r1.nextState, 4, 3);
      return r1.isHit && !r2.isHit;
    })!;
    const next = endPlayerCombatTurn(state);
    expect(next.statusEffects).toEqual(['poison']);
    expect(battle(next).playerPoison).toEqual({ damage: 4, turnsRemaining: 1 });
    expect(next.playerResources?.hp).toBe(state.playerResources!.hp);
    expect(battle(next).combatLog.join(' ')).toContain('Hero shakes off the poison');
  });

  it('does not apply poison on a miss', () => {
    const state = setup();
    battle(state).monsters[0].patternIndex = 1;
    state.rngState = Array.from({ length: 10000 }, (_, i) => i + 1).find(seed => !evaluateAttackRoll(seed, 6, 2).isHit)!;
    const next = endPlayerCombatTurn(state);
    expect(next.statusEffects).toEqual([]);
    expect(battle(next).playerPoison ?? null).toBeNull();
    expect(next.playerResources?.hp).toBe(state.playerResources?.hp);
  });

  it('Poison tick bypasses DEF/MDEF/Block and expires after turnsRemaining reaches 0', () => {
    const state = setup();
    battle(state).monsters = [{ ...battle(state).monsters[0], monster: { ...assassin, pattern: [] } }];
    battle(state).playerPoison = { damage: 4, turnsRemaining: 2 };
    state.statusEffects = ['poison'];
    state.divineProtection = 100;
    battle(state).playerBlock = 100;
    state.rngState = Array.from({ length: 10000 }, (_, i) => i + 1).find(seed => evaluateAttackRoll(seed, 4, 3).isHit)!;
    const turn2 = endPlayerCombatTurn(state);
    expect(turn2.playerResources?.hp).toBe(state.playerResources!.hp - 4);
    expect(battle(turn2).playerPoison).toEqual({ damage: 4, turnsRemaining: 1 });

    turn2.rngState = Array.from({ length: 10000 }, (_, i) => i + 1).find(seed => evaluateAttackRoll(seed, 4, 3).isHit)!;
    const turn3 = endPlayerCombatTurn(turn2);
    expect(turn3.playerResources?.hp).toBe(state.playerResources!.hp - 8);
    expect(battle(turn3).playerPoison).toBeNull();
    expect(turn3.statusEffects).toEqual([]);
  });

  it('Poison can kill the hero at start phase', () => {
    const state = setup();
    battle(state).monsters = [{ ...battle(state).monsters[0], monster: { ...assassin, pattern: [] } }];
    battle(state).playerPoison = { damage: 4, turnsRemaining: 1 };
    state.statusEffects = ['poison'];
    state.playerResources!.hp = 4;
    state.rngState = Array.from({ length: 10000 }, (_, i) => i + 1).find(seed => evaluateAttackRoll(seed, 4, 3).isHit)!;
    const next = endPlayerCombatTurn(state);
    expect(next.activeHook).toMatchObject({ type: 'ON_GAME_OVER', defeatedBy: 'Poison' });
  });

  it.each([0, 1, 2, 4])('T1 ATK (5), PEN (3) ignores up to 3 physical DEF without making DEF negative (DEF %i)', def => {
    const state = setup();
    state.equippedGear.armor = { id: 'armor', instanceId: 'armor', name: 'Armor', category: 'armor', description: '', buyPrice: 0, sellPrice: 0, gearBonus: { def, mdef: 100 } };
    const totalDef = getPlayerDef(getEffectiveStatsFromState(state), def);
    const next = endPlayerCombatTurn(state);
    expect(battle(next).lastAttackRoll).toMatchObject({ damageDealt: 5 - Math.max(0, totalDef - 3), damageDefReduced: Math.max(0, totalDef - 3), defenseType: 'DEF' });
  });

  it('T1 ATK (5), PEN (3) ignores DEF granted by Divine Protection while Block absorbs damage', () => {
    const state = setup();
    battle(state).playerBlock = 1;
    state.divineProtection = 1;
    expect(battle(endPlayerCombatTurn(state)).lastAttackRoll).toMatchObject({ damageDealt: 4, damageBlocked: 1, damageProtReduced: 0 });
  });

  it('is cured by shrine cleanse; village rest only restores HP', () => {
    const state = setup();
    state.statusEffects = ['poison'];
    expect(applySingleShrineBoon(state, 'cleanse').nextState.statusEffects).toEqual([]);
    state.activeHook = { type: 'VILLAGE', village: { coord: { col: 0, row: 1 }, turn: 1, subView: 'main', actionTaken: false, trainOptions: [], shopStock: [] } };
    expect(villageDoRest(state).statusEffects).toEqual(['poison']);
  });
});

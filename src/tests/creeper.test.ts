import { describe, expect, it } from 'vitest';
import { createCombatSession, endPlayerCombatTurn, evaluateAttackRoll } from '../core/combat';
import { playCard, startAdventure } from '../core/engine';
import { roll1D6 } from '../core/rng';
import { CombatCardDef, MonsterCard, RunState } from '../core/types';
import { MONSTER_TEMPLATES } from '../data/monsters';
import { cardInspectModal } from '../ui/render';

const creeper: MonsterCard = { ...MONSTER_TEMPLATES.creeper, id: 'creeper_test' };
const strike: CombatCardDef = { id: 'strike', instanceId: 'strike', name: 'Strike', classId: 'fighter', cardType: 'attack', apCost: 1, baseDamage: 20, baseBlock: 0 };

function setup(): RunState {
  const state = startAdventure('fighter', 'creeper');
  const { combat } = createCombatSession([creeper], [], 1);
  return { ...state, activeHook: { type: 'COMBAT', combat: { ...combat, hand: [strike] } } };
}
function battle(state: RunState) {
  if (state.activeHook.type !== 'COMBAT') throw new Error('Expected combat');
  return state.activeHook.combat;
}
function seedForRevival(maxAllowedRoll: number, success: boolean): number {
  for (let seed = 1; seed < 10000; seed++) {
    const attack = evaluateAttackRoll(seed, 1, 0);
    if (attack.isHit && (roll1D6(attack.nextState).roll <= maxAllowedRoll) === success) return seed;
  }
  throw new Error('No seed found');
}

function seedForAllThreeUndyingFails(): number {
  for (let seed = 1; seed < 100000; seed++) {
    const attack = evaluateAttackRoll(seed, 1, 0);
    if (!attack.isHit) continue;
    const r1 = roll1D6(attack.nextState);
    if (r1.roll <= 3) continue; // token 1 (2 left): needs <= 3
    const r2 = roll1D6(r1.nextState);
    if (r2.roll <= 2) continue; // token 2 (1 left): needs <= 2
    const r3 = roll1D6(r2.nextState);
    if (r3.roll <= 1) continue; // token 3 (0 left): needs <= 1
    return seed;
  }
  throw new Error('No seed found');
}

describe('Creeper', () => {
  it('shows its requested profile, artwork, MDEF, Swamp terrain and Undying rule', () => {
    expect(creeper).toMatchObject({ statPointReward: 4, goldReward: 15, creatureType: 'Undead', cardNumber: 'mon3smp-02', level: 3, maxHp: 14, def: 2, eva: 3, acc: 3, mdef: 2, spawnTerrains: ['swamp'], undyingTokens: 3 });
    const html = cardInspectModal({ kind: 'monster', monster: creeper, currentHp: 14 }, setup());
    for (const text of ['/cards/creatures/creeper.jpg', 'Undying (3)', 'MDEF', 'Swamps', 'T1:', 'T2:']) expect(html).toContain(text);
    expect(html).not.toContain('Submerge');
  });

  it('alternates capped Regen/DEF with a physical ATK (7) against DEF', () => {
    const state = setup();
    battle(state).monsters[0].hp = 11;
    const submerged = endPlayerCombatTurn(state);
    expect(battle(submerged).monsters[0]).toMatchObject({ hp: 14, block: 3, patternIndex: 1 });
    expect(submerged.playerResources?.hp).toBe(state.playerResources?.hp);
    submerged.equippedGear.armor = { id: 'armor', instanceId: 'armor', name: 'Armor', description: '', category: 'armor', buyPrice: 0, sellPrice: 0, gearBonus: { def: 2, mdef: 100 } };
    submerged.rngState = Array.from({ length: 1000 }, (_, i) => i + 1).find(seed => {
      const roll = evaluateAttackRoll(seed, 3, 2);
      return roll.isHit;
    })!;
    const ambush = endPlayerCombatTurn(submerged);
    expect(ambush.playerResources?.hp).toBe(state.playerResources!.hp - 4);
    expect(battle(ambush).lastAttackRoll).toMatchObject({ defenseType: 'DEF', damageDefReduced: 3, damageDealt: 4 });
    expect(battle(ambush).monsters[0]).toMatchObject({ block: 0, patternIndex: 2 });
  });

  it('consumes Undying (3) tokens on defeat, revives at full HP on 1-3, and decreases threshold on subsequent revivals', () => {
    const state = setup();
    state.rngState = seedForRevival(3, true);
    battle(state).monsters[0].patternIndex = 1;
    const before = JSON.stringify(state);
    const next = playCard(state, 'strike', 0);
    expect(battle(next).monsters).toHaveLength(1);
    expect(battle(next).monsters[0]).toMatchObject({ hp: 14, block: 0, patternIndex: 1, undyingTokensRemaining: 2 });
    expect(next.playerResources).toEqual(state.playerResources);
    expect(next.monsterDiscard).toEqual(state.monsterDiscard);
    expect(battle(next).combatLog.join(' ')).toContain('Undying: consumed 1 token (2 left)');
    expect(JSON.stringify(state)).toBe(before);
    // Second defeat with 2 tokens left: consumes 1 (1 left) and needs 1-2 to revive to full HP.
    battle(next).hand = [strike];
    next.rngState = seedForRevival(2, true);
    const secondRevive = playCard(next, 'strike', 0);
    expect(battle(secondRevive).monsters[0]).toMatchObject({ hp: 14, undyingTokensRemaining: 1 });
  });

  it('allows victory and discards the card exactly once when all Undying token rolls fail', () => {
    const state = setup();
    state.rngState = seedForAllThreeUndyingFails();
    const next = playCard(state, 'strike', 0);
    expect(next.activeHook.type).toBe('VICTORY');
    expect(next.monsterDiscard.filter(m => m.id === creeper.id)).toHaveLength(1);
  });

  it('does not consume an Undying roll for a nonlethal hit or a miss', () => {
    for (const hit of [true, false]) {
      const state = setup();
      battle(state).hand = [{ ...strike, baseDamage: 3 }];
      state.rngState = Array.from({ length: 1000 }, (_, i) => i + 1).find(seed => evaluateAttackRoll(seed, 1, 0).isHit === hit)!;
      const attack = evaluateAttackRoll(state.rngState, 1, 0);
      const next = playCard(state, 'strike', 0);
      expect(next.rngState).toBe(attack.nextState);
      expect(battle(next).combatLog.join(' ')).not.toContain('Undying:');
      expect(battle(next).monsters[0].undyingTokensRemaining).toBe(3);
    }
  });
});

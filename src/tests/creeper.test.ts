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
function seedForRevival(success: boolean): number {
  for (let seed = 1; seed < 10000; seed++) {
    const attack = evaluateAttackRoll(seed, 1, 0);
    if (attack.isHit && (roll1D6(attack.nextState).roll === 6) === success) return seed;
  }
  throw new Error('No seed found');
}

describe('Creeper', () => {
  it('shows its requested profile, artwork, MDEF, Swamp terrain and Resilient rule', () => {
    expect(creeper).toMatchObject({ statPointReward: 4, goldReward: 8, creatureType: 'Undead', cardNumber: 'mon3smp-02', level: 3, maxHp: 12, def: 2, eva: 0, acc: 1, mdef: 1, spawnTerrains: ['swamp'] });
    const html = cardInspectModal({ kind: 'monster', monster: creeper, currentHp: 12 }, setup());
    for (const text of ['/cards/creatures/creeper.jpg', 'Resilient', 'MDEF', 'Swamps', 'Submerge', 'Ambush']) expect(html).toContain(text);
  });

  it('alternates capped Submerge healing and Block with a physical Ambush against DEF', () => {
    const state = setup();
    battle(state).monsters[0].hp = 11;
    const submerged = endPlayerCombatTurn(state);
    expect(battle(submerged).monsters[0]).toMatchObject({ hp: 12, block: 3, patternIndex: 1 });
    expect(submerged.playerResources?.hp).toBe(state.playerResources?.hp);
    submerged.equippedGear.armor = { id: 'armor', instanceId: 'armor', name: 'Armor', description: '', category: 'armor', buyPrice: 0, sellPrice: 0, gearBonus: { def: 2, mdef: 100 } };
    submerged.rngState = Array.from({ length: 1000 }, (_, i) => i + 1).find(seed => {
      const roll = evaluateAttackRoll(seed, 1, 1);
      return roll.isHit && !roll.isCrit;
    })!;
    const ambush = endPlayerCombatTurn(submerged);
    expect(ambush.playerResources?.hp).toBe(state.playerResources!.hp - 5);
    expect(battle(ambush).lastAttackRoll).toMatchObject({ defenseType: 'DEF', damageDefReduced: 2, damageDealt: 5 });
    expect(battle(ambush).monsters[0]).toMatchObject({ block: 0, patternIndex: 2 });
  });

  it('rolls after a lethal hit and returns at 6 HP before victory, without rewards or duplication', () => {
    const state = setup();
    state.rngState = seedForRevival(true);
    battle(state).monsters[0].patternIndex = 1;
    const before = JSON.stringify(state);
    const next = playCard(state, 'strike', 0);
    expect(battle(next).monsters).toHaveLength(1);
    expect(battle(next).monsters[0]).toMatchObject({ hp: 6, block: 0, patternIndex: 1 });
    expect(next.playerResources).toEqual(state.playerResources);
    expect(next.monsterDiscard).toEqual(state.monsterDiscard);
    expect(battle(next).combatLog.join(' ')).toContain('Resilient: rolled 1d6 = 6');
    const attack = evaluateAttackRoll(state.rngState, 1, 0);
    expect(next.rngState).toBe(roll1D6(attack.nextState).nextState);
    expect(JSON.stringify(state)).toBe(before);
    // No once-per-battle limit: another defeat can trigger another successful roll.
    battle(next).hand = [strike];
    next.rngState = seedForRevival(true);
    expect(battle(playCard(next, 'strike', 0)).monsters[0].hp).toBe(6);
  });

  it('allows victory and discards the card exactly once when the revival roll fails', () => {
    const state = setup();
    state.rngState = seedForRevival(false);
    const next = playCard(state, 'strike', 0);
    expect(next.activeHook.type).toBe('VICTORY');
    expect(next.monsterDiscard.filter(m => m.id === creeper.id)).toHaveLength(1);
  });

  it('does not consume a revival roll for a nonlethal hit or a miss', () => {
    for (const hit of [true, false]) {
      const state = setup();
      battle(state).hand = [{ ...strike, baseDamage: 3 }];
      state.rngState = Array.from({ length: 1000 }, (_, i) => i + 1).find(seed => evaluateAttackRoll(seed, 1, 0).isHit === hit)!;
      const attack = evaluateAttackRoll(state.rngState, 1, 0);
      const next = playCard(state, 'strike', 0);
      expect(next.rngState).toBe(attack.nextState);
      expect(battle(next).combatLog.join(' ')).not.toContain('Resilient:');
    }
  });
});

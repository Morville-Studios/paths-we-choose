import { describe, expect, it } from 'vitest';
import { createCombatSession, endPlayerCombatTurn, evaluateAttackRoll, getHeroStatDebuffMods } from '../core/combat';
import { playCard, startAdventure } from '../core/engine';
import { MonsterCard, RunState } from '../core/types';
import { getDefaultMonsterRewards, MONSTER_TEMPLATES } from '../data/monsters';
import { cardInspectModal } from '../ui/render';
import { getMonsterRasterArtPath } from '../ui/cardArt';

const witch: MonsterCard = { ...MONSTER_TEMPLATES.witch, id: 'witch_test' };

function setup(monsters = [witch]): RunState {
  const state = startAdventure('fighter', 'witch');
  const { combat } = createCombatSession(monsters, state.playerMasterDeck, state.rngState);
  return { ...state, playerResources: { hp: 100, maxHp: 100, statPoints: 0, gold: 0 },
    activeHook: { type: 'COMBAT', combat } };
}

function battle(state: RunState) {
  if (state.activeHook.type !== 'COMBAT') throw new Error('Expected combat');
  return state.activeHook.combat;
}

describe('Witch mechanics', () => {
  it('registers the confirmed collector ID, stats and default level rewards', () => {
    expect(witch).toMatchObject({ templateId: 'witch', cardNumber: 'mon3smp-04', level: 3,
      maxHp: 10, def: 1, mdef: 3, eva: 1, acc: 1, spawnTerrains: ['swamp', 'cave'],
      statPointReward: 4, goldReward: 8, endTurnRegen: 1 });
    expect(MONSTER_TEMPLATES.stalker.cardNumber).toBe('mon1grs-06');
    expect(Object.values(MONSTER_TEMPLATES).map(m => m.cardNumber).filter(id => id === 'mon3smp-04')).toHaveLength(1);
  });

  it('doubles default rewards at every level', () => {
    expect([1, 2, 3, 4, 5, 6].map(getDefaultMonsterRewards)).toEqual([
      { statPointReward: 1, goldReward: 2 }, { statPointReward: 2, goldReward: 4 },
      { statPointReward: 4, goldReward: 8 }, { statPointReward: 8, goldReward: 16 },
      { statPointReward: 16, goldReward: 32 }, { statPointReward: 32, goldReward: 64 },
    ]);
  });
  it('casts both hexes without hit rolls; keeps each for its stated hero turns', () => {
    const initial = setup();
    const before = JSON.stringify(initial);
    const first = endPlayerCombatTurn(initial);
    expect(getHeroStatDebuffMods(battle(first))).toEqual({ acc: -1, eva: -1, def: 0, mdef: 0 });
    expect(battle(first).heroStatDebuffs?.[0].turnsRemaining).toBe(2);
    const second = endPlayerCombatTurn(first);
    expect(getHeroStatDebuffMods(battle(second))).toEqual({ acc: -1, eva: -1, def: -1, mdef: -1 });
    expect(battle(second).heroStatDebuffs?.map(effect => effect.turnsRemaining)).toEqual([1, 1]);
    const third = endPlayerCombatTurn(second);
    expect(getHeroStatDebuffMods(battle(third))).toEqual({ acc: 0, eva: 0, def: 0, mdef: 0 });
    expect(JSON.stringify(initial)).toBe(before);
    expect(endPlayerCombatTurn(initial)).toEqual(first);
  });

  it('Smite uses reduced MDEF, ignoring physical DEF and honoring Block', () => {
    let state = setup();
    state.equippedGear.armor = { id: 'test', instanceId: 'test', name: 'Test armor', description: '', category: 'armor',
      buyPrice: 0, sellPrice: 0, gearBonus: { def: 100, mdef: 3 } };
    state = endPlayerCombatTurn(endPlayerCombatTurn(state));
    battle(state).playerBlock = 1;
    state.rngState = Array.from({ length: 1000 }, (_, i) => i + 1).find(seed => {
      const roll = evaluateAttackRoll(seed, 1, 0);
      return roll.isHit && !roll.isCrit;
    })!;
    const next = endPlayerCombatTurn(state);
    expect(battle(next).lastAttackRoll).toMatchObject({ defenseType: 'MDEF', damageDefReduced: 2, damageBlocked: 1, damageDealt: 4 });
    expect(next.playerResources?.hp).toBe(96);
  });

  it('reduces hero attack accuracy and shows both hex descriptions and artwork', () => {
    const state = endPlayerCombatTurn(setup());
    const attackIndex = battle(state).hand.findIndex(card => card.baseDamage > 0);
    const next = playCard(state, battle(state).hand[attackIndex].instanceId, 0);
    expect(battle(next).lastAttackRoll?.netAcc).toBe(0); // base ACC 1 + card 1 - hex 1 - Witch EVA 1
    const html = cardInspectModal({ kind: 'monster', monster: witch }, state);
    expect(getMonsterRasterArtPath('witch')).toBe('/cards/creatures/witch.jpg');
    expect(html).toContain('/cards/creatures/witch.jpg');
    expect(html).toContain('Hero -1 EVA / -1 ACC (2t)');
    expect(html).toContain('Hero -1 DEF / -1 MDEF (1t)');
    expect(html).not.toContain('Idle');
  });

  it('regenerates after every pattern, caps healing, and never revives a dead Witch', () => {
    let state = setup();
    battle(state).monsters[0].hp = 7;
    for (const expected of [8, 9, 10, 10]) {
      state = endPlayerCombatTurn(state);
      expect(battle(state).monsters[0].hp).toBe(expected);
    }
    battle(state).monsters[0].hp = 0;
    expect(battle(endPlayerCombatTurn(state)).monsters[0].hp).toBe(0);
  });

  it('applies defense exposure immediately to following physical attackers and clamps at zero', () => {
    const dog = { ...MONSTER_TEMPLATES.wild_dog, id: 'dog' };
    const state = setup([witch, dog]);
    battle(state).monsters[0].patternIndex = 1;
    state.rngState = Array.from({ length: 1000 }, (_, i) => i + 1).find(seed => {
      const roll = evaluateAttackRoll(seed, 2, 1);
      return roll.isHit && !roll.isCrit;
    })!;
    const next = endPlayerCombatTurn(state);
    expect(battle(next).lastAttackRoll).toMatchObject({ damageDealt: 4, damageDefReduced: 0, defenseType: 'DEF' });
  });

  it('refreshes the same hex without stacking and keeps different sources independent', () => {
    let state = endPlayerCombatTurn(setup([witch, { ...witch, id: 'witch_2' }]));
    expect(getHeroStatDebuffMods(battle(state))).toEqual({ acc: -2, eva: -2, def: 0, mdef: 0 });
    battle(state).monsters.forEach(monster => { monster.patternIndex = 0; });
    state = endPlayerCombatTurn(state);
    expect(getHeroStatDebuffMods(battle(state))).toEqual({ acc: -2, eva: -2, def: 0, mdef: 0 });
    expect(battle(state).heroStatDebuffs).toHaveLength(2);
    expect(battle(state).heroStatDebuffs?.every(effect => effect.turnsRemaining === 2)).toBe(true);
  });
});

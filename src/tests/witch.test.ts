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
  return { ...state, equippedGear: { weapon: null, armor: null, accessory: null },
    playerResources: { hp: 100, maxHp: 100, statPoints: 0, gold: 0 },
    activeHook: { type: 'COMBAT', combat } };
}

function battle(state: RunState) {
  if (state.activeHook.type !== 'COMBAT') throw new Error('Expected combat');
  return state.activeHook.combat;
}

describe('Witch mechanics', () => {
  it('registers the confirmed collector ID, stats and default level rewards', () => {
    expect(witch).toMatchObject({ templateId: 'witch', cardNumber: 'mon3smp-04', level: 3,
      maxHp: 14, def: 1, mdef: 3, eva: 2, acc: 4, spawnTerrains: ['swamp', 'cave'],
      statPointReward: 4, goldReward: 15, regenOnStart: 2 });
    expect(MONSTER_TEMPLATES.stalker.cardNumber).toBe('mon1grs-06');
    expect(Object.values(MONSTER_TEMPLATES).map(m => m.cardNumber).filter(id => id === 'mon3smp-04')).toHaveLength(1);
  });

  it('scales default rewards linearly by level', () => {
    expect([1, 2, 3, 4, 5, 6].map(level => getDefaultMonsterRewards(level))).toEqual([
      { statPointReward: 2, goldReward: 5 }, { statPointReward: 3, goldReward: 10 },
      { statPointReward: 4, goldReward: 15 }, { statPointReward: 5, goldReward: 20 },
      { statPointReward: 6, goldReward: 25 }, { statPointReward: 7, goldReward: 30 },
    ]);
  });
  it('casts Blind (2, 2) and Ensnare (2, 2) on T1 without hit rolls; keeps them for 2 hero turns', () => {
    const initial = setup();
    const before = JSON.stringify(initial);
    const first = endPlayerCombatTurn(initial);
    expect(getHeroStatDebuffMods(battle(first))).toEqual({ acc: -2, eva: -2, def: 0, mdef: 0 });
    expect(battle(first).heroStatDebuffs?.[0].turnsRemaining).toBe(2);
    const second = endPlayerCombatTurn(first);
    expect(getHeroStatDebuffMods(battle(second))).toEqual({ acc: -2, eva: -2, def: 0, mdef: 0 });
    expect(battle(second).heroStatDebuffs?.[0].turnsRemaining).toBe(1);
    battle(second).monsters[0].hp = 0; // prevent Witch from cycling back to T1 on turn 3
    const third = endPlayerCombatTurn(second);
    expect(getHeroStatDebuffMods(battle(third))).toEqual({ acc: 0, eva: 0, def: 0, mdef: 0 });
    expect(JSON.stringify(initial)).toBe(before);
    expect(endPlayerCombatTurn(initial)).toEqual(first);
  });

  it('T2 MATK (7) uses MDEF, ignoring physical DEF and honoring Block', () => {
    let state = setup();
    state.equippedGear.armor = { id: 'test', instanceId: 'test', name: 'Test armor', description: '', category: 'armor',
      buyPrice: 0, sellPrice: 0, gearBonus: { def: 100, mdef: 3 } };
    state = endPlayerCombatTurn(state);
    battle(state).playerBlock = 1;
    state.rngState = Array.from({ length: 1000 }, (_, i) => i + 1).find(seed => {
      const roll = evaluateAttackRoll(seed, 4, 0);
      return roll.isHit;
    })!;
    const next = endPlayerCombatTurn(state);
    expect(battle(next).lastAttackRoll).toMatchObject({ defenseType: 'MDEF', damageDefReduced: 3, damageBlocked: 1, damageDealt: 3 });
    expect(next.playerResources?.hp).toBe(97);
  });

  it('reduces hero attack accuracy and shows Blind, Ensnare, Regen (2) and artwork', () => {
    const state = endPlayerCombatTurn(setup());
    const attackIndex = battle(state).hand.findIndex(card => card.baseDamage > 0);
    const next = playCard(state, battle(state).hand[attackIndex].instanceId, 0);
    expect(battle(next).lastAttackRoll?.netAcc).toBe(-1); // default Hero ACC 3 - Blind 2 - Witch EVA 2 = -1
    const html = cardInspectModal({ kind: 'monster', monster: witch }, state);
    expect(getMonsterRasterArtPath('witch')).toBe('/cards/creatures/witch.jpg');
    expect(html).toContain('/cards/creatures/witch.jpg');
    const plainHtml = html.replace(/<\/?b>/g, '');
    expect(plainHtml).toContain('Regen (2)');
    expect(plainHtml).toContain('Blind (2, 2)');
    expect(plainHtml).toContain('Ensnare (2, 2)');
    expect(plainHtml).not.toContain('Idle');
  });

  it('regenerates 2 HP on start of turn, caps healing, and never revives a dead Witch', () => {
    let state = setup();
    battle(state).monsters[0].hp = 10;
    for (const expected of [12, 14, 14]) {
      state = endPlayerCombatTurn(state);
      expect(battle(state).monsters[0].hp).toBe(expected);
    }
    battle(state).monsters[0].hp = 0;
    expect(battle(endPlayerCombatTurn(state)).monsters[0].hp).toBe(0);
  });

  it('refreshes the same hex without stacking and keeps different sources independent', () => {
    let state = endPlayerCombatTurn(setup([witch, { ...witch, id: 'witch_2' }]));
    expect(getHeroStatDebuffMods(battle(state))).toEqual({ acc: -4, eva: -4, def: 0, mdef: 0 });
    battle(state).monsters.forEach(monster => { monster.patternIndex = 0; });
    state = endPlayerCombatTurn(state);
    expect(getHeroStatDebuffMods(battle(state))).toEqual({ acc: -4, eva: -4, def: 0, mdef: 0 });
    expect(battle(state).heroStatDebuffs).toHaveLength(2);
    expect(battle(state).heroStatDebuffs?.every(effect => effect.turnsRemaining === 2)).toBe(true);
  });
});

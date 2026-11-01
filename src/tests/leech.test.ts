import { describe, expect, it } from 'vitest';
import { createCombatSession, endPlayerCombatTurn, evaluateAttackRoll } from '../core/combat';
import { playCard, startAdventure } from '../core/engine';
import { MonsterCard, RunState } from '../core/types';
import { MONSTER_TEMPLATES } from '../data/monsters';
import { cardInspectModal } from '../ui/render';

const leech: MonsterCard = { ...MONSTER_TEMPLATES.leech, id: 'leech_test' };
const zombie: MonsterCard = { ...MONSTER_TEMPLATES.zombie, id: 'discard_zombie' };
const hitSeed = Array.from({ length: 1000 }, (_, i) => i + 1).find(seed => {
  const roll = evaluateAttackRoll(seed, 2, 0);
  return roll.isHit && !roll.isCrit;
})!;

function setup(): RunState {
  const state = startAdventure('wizard', 'leech');
  const { combat } = createCombatSession([leech], [], 1);
  return {
    ...state, rngState: hitSeed,
    playerResources: { hp: 100, maxHp: 100, statPoints: 0, gold: 0 },
    activeHook: { type: 'COMBAT', combat: { ...combat, monsters: [{ monster: leech, hp: 5, block: 0, patternIndex: 0 }] } },
  };
}

function battle(state: RunState) {
  if (state.activeHook.type !== 'COMBAT') throw new Error('Expected combat');
  return state.activeHook.combat;
}

describe('Leech', () => {
  it('uses the requested profile, artwork, magical pattern and spawn terrains', () => {
    expect(leech).toMatchObject({ statPointReward: 8, goldReward: 16, creatureType: 'Undead', cardNumber: 'mon3smp-01', level: 4, maxHp: 10, def: 1, mdef: 3, eva: 2, acc: 2, spawnTerrains: ['swamp', 'cave'] });
    const html = cardInspectModal({ kind: 'monster', monster: leech, currentHp: 10 }, setup());
    expect(html).toContain('/cards/creatures/leech.jpg');
    expect(html).toContain('MDEF');
    expect(html).toContain('MATK');
    expect(html).toContain('Swamps 🪷, Caves 🪨');
  });

  it('uses MDEF instead of DEF, applies Block, and drains half HP damage rounded down', () => {
    const state = setup();
    state.equippedGear.armor = { id: 'test', instanceId: 'test', name: 'Test', description: '', category: 'armor', buyPrice: 0, sellPrice: 0, gearBonus: { def: 100, mdef: 2 } };
    battle(state).playerBlock = 1;
    const before = JSON.stringify(state);
    const next = endPlayerCombatTurn(state);
    expect(next.playerResources?.hp).toBe(97);
    expect(battle(next).monsters[0].hp).toBe(6);
    expect(battle(next).lastAttackRoll).toMatchObject({ damageDealt: 3, damageBlocked: 1, damageDefReduced: 2, defenseType: 'MDEF' });
    expect(battle(next).combatLog.join(' ')).toContain('absorbed by Hero MDEF');
    expect(JSON.stringify(state)).toBe(before);
  });

  it('does not drain on a miss or fully blocked attack and caps healing at Max HP', () => {
    const state = setup();
    battle(state).playerBlock = 100;
    expect(battle(endPlayerCombatTurn(state)).monsters[0].hp).toBe(5);
    battle(state).playerBlock = 0;
    state.rngState = Array.from({ length: 1000 }, (_, i) => i + 1).find(seed => !evaluateAttackRoll(seed, 2, 0).isHit)!;
    expect(battle(endPlayerCombatTurn(state)).monsters[0].hp).toBe(5);
    state.rngState = hitSeed;
    battle(state).monsters[0].hp = 9;
    expect(battle(endPlayerCombatTurn(state)).monsters[0].hp).toBe(10);
  });

  it('Channels for healing and block and revives exactly one discarded Zombie on turns 6 and 12', () => {
    let state = setup();
    state.playerResources!.hp = 1000;
    state.monsterDiscard = [zombie, { ...zombie, id: 'second_zombie' }, { ...MONSTER_TEMPLATES.goblin, id: 'goblin' }];
    for (let turn = 1; turn <= 12; turn++) {
      state = endPlayerCombatTurn(state);
      const combat = battle(state);
      expect(combat.monsters.length).toBe(1 + Math.floor(turn / 6));
      if (turn % 2 === 0) expect(combat.monsters[0].block).toBe(2);
      if (turn === 6 || turn === 12) {
        const revived = combat.monsters.at(-1)!;
        expect(revived).toMatchObject({ hp: zombie.maxHp, patternIndex: 0 });
        expect(state.monsterDiscard.some(m => m.id === revived.monster.id)).toBe(false);
      }
    }
    expect(state.monsterDiscard.map(m => m.id)).toEqual(['goblin']);
  });

  it('does not invent a Zombie when discard is empty and dead Leeches cannot Channel', () => {
    const state = setup();
    battle(state).monsters[0] = { monster: leech, hp: 5, block: 0, patternIndex: 5, channelCount: 2 };
    const next = endPlayerCombatTurn(state);
    expect(battle(next).monsters).toHaveLength(1);
    expect(battle(next).monsters[0]).toMatchObject({ hp: 7, block: 2, channelCount: 3 });
    battle(state).monsters[0].hp = 0;
    state.monsterDiscard = [zombie];
    expect(endPlayerCombatTurn(state).monsterDiscard).toEqual([zombie]);
  });

  it('absorbs hero spell damage with Leech MDEF rather than physical DEF', () => {
    const state = setup();
    battle(state).monsters[0].hp = 10;
    battle(state).hand = [{ id: 'spell', instanceId: 'spell', name: 'Spell', classId: 'wizard', cardType: 'attack', apCost: 1, baseDamage: 6, damageScalingStat: 'int', damageScalingDivisor: 100, baseBlock: 0 }];
    state.rngState = Array.from({ length: 1000 }, (_, i) => i + 1).find(seed => {
      const roll = evaluateAttackRoll(seed, 1, 2);
      return roll.isHit && !roll.isCrit;
    })!;
    const next = playCard(state, 'spell', 0);
    expect(battle(next).monsters[0].hp).toBe(7);
    expect(battle(next).lastAttackRoll?.defenseType).toBe('MDEF');
  });
});

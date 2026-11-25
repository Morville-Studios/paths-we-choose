import { describe, expect, it } from 'vitest';
import { createCombatSession, endPlayerCombatTurn, evaluateAttackRoll } from '../core/combat';
import { playCard, startAdventure } from '../core/engine';
import { EnemyCard, RunState } from '../core/types';
import { ENEMY_TEMPLATES } from '../data/enemies';
import { cardInspectModal } from '../ui/render';

const leech: EnemyCard = { ...ENEMY_TEMPLATES.leech, id: 'leech_test' };
const zombie: EnemyCard = { ...ENEMY_TEMPLATES.zombie, id: 'discard_zombie' };
const deckZombie: EnemyCard = { ...ENEMY_TEMPLATES.zombie, id: 'deck_zombie' };
const hitSeed = Array.from({ length: 1000 }, (_, i) => i + 1).find(seed => {
  const roll = evaluateAttackRoll(seed, 2, 2);
  return roll.isHit;
})!;

function setup(): RunState {
  const state = startAdventure('wizard', 'leech');
  const { combat } = createCombatSession([leech], [], 1);
  return {
    ...state, rngState: hitSeed,
    enemyDeck: [],
    enemyDiscard: [],
    equippedGear: { weapon: null, armor: null, accessory: null },
    playerResources: { hp: 100, maxHp: 100, statPoints: 0, gold: 0 },
    activeHook: { type: 'COMBAT', combat: { ...combat, enemies: [{ enemy: leech, hp: 5, block: 0, patternIndex: 1 }] } },
  };
}

function battle(state: RunState) {
  if (state.activeHook.type !== 'COMBAT') throw new Error('Expected combat');
  return state.activeHook.combat;
}

describe('Leech', () => {
  it('uses the requested profile, artwork, Regen (2), Summon (Zombie), MATK (7), LSteal and spawn terrains', () => {
    expect(leech).toMatchObject({ statPointReward: 5, goldReward: 20, enemyType: 'Undead', cardNumber: 'mon3smp-01', level: 4, maxHp: 18, def: 1, mdef: 3, eva: 2, acc: 3, regenOnStart: 2, spawnTerrains: ['swamp', 'cave'] });
    const html = cardInspectModal({ kind: 'enemy', enemy: leech, currentHp: 18 }, setup());
    expect(html).toContain('/cards/enemies/leech.jpg');
    expect(html).toContain('Regen (2)');
    expect(html).toContain('Summon (Zombie)');
    expect(html).toContain('MATK');
    expect(html).toContain('LSteal');
    expect(html).toContain('Swamps 🪷, Caves 🪨');
  });

  it('uses MDEF instead of DEF, applies Block, regens 2 on start, and drains 50% rounded up on T2 MATK (7), LSteal', () => {
    const state = setup();
    state.equippedGear.armor = { id: 'test', instanceId: 'test', name: 'Test', description: '', category: 'armor', buyPrice: 0, sellPrice: 0, gearBonus: { def: 100, mdef: 2 } };
    battle(state).playerBlock = 1;
    const before = JSON.stringify(state);
    const next = endPlayerCombatTurn(state);
    // T2: 7 MATK - 2 MDEF - 1 Block = 4 damage -> 96 HP; Leech starts 5 + 2 Regen = 7, + ceil(4*0.5)=2 LSteal = 9 HP
    expect(next.playerResources?.hp).toBe(96);
    expect(battle(next).enemies[0].hp).toBe(9);
    expect(battle(next).lastAttackRoll).toMatchObject({ damageDealt: 4, damageBlocked: 1, damageDefReduced: 2, defenseType: 'MDEF' });
    expect(battle(next).combatLog.join(' ')).toContain('absorbed by Hero MDEF');
    expect(JSON.stringify(state)).toBe(before);
  });

  it('does not drain on a miss or fully blocked attack and caps healing at Max HP', () => {
    const state = setup();
    battle(state).playerBlock = 100;
    // 5 + 2 Regen = 7 HP, 0 LSteal because fully blocked
    expect(battle(endPlayerCombatTurn(state)).enemies[0].hp).toBe(7);
    battle(state).playerBlock = 0;
    state.rngState = Array.from({ length: 1000 }, (_, i) => i + 1).find(seed => !evaluateAttackRoll(seed, 2, 0).isHit)!;
    expect(battle(endPlayerCombatTurn(state)).enemies[0].hp).toBe(7);
    state.rngState = hitSeed;
    battle(state).enemies[0].hp = 17;
    expect(battle(endPlayerCombatTurn(state)).enemies[0].hp).toBe(18);
  });

  it('T1 Summon (Zombie) summons Zombie from Enemy Deck and shuffles, or puts 1 from Discard on top of Deck on miss', () => {
    const state = setup();
    battle(state).enemies[0].patternIndex = 0;
    state.enemyDeck = [{ ...ENEMY_TEMPLATES.goblin, id: 'g1' }, deckZombie];
    const summonedState = endPlayerCombatTurn(state);
    expect(battle(summonedState).enemies).toHaveLength(2);
    expect(battle(summonedState).enemies[1]).toMatchObject({ hp: deckZombie.maxHp, patternIndex: 0, isSummon: true });
    expect(summonedState.enemyDeck.some(m => m.id === 'deck_zombie')).toBe(false);

    // Miss in deck: retrieve Zombie from discard and place on top of Enemy Deck
    const missState = setup();
    battle(missState).enemies[0].patternIndex = 0;
    missState.enemyDeck = [{ ...ENEMY_TEMPLATES.goblin, id: 'g1' }];
    missState.enemyDiscard = [zombie];
    const returnedState = endPlayerCombatTurn(missState);
    expect(battle(returnedState).enemies).toHaveLength(1);
    expect(returnedState.enemyDeck[0].id).toBe('discard_zombie');
    expect(returnedState.enemyDiscard).toEqual([]);
  });

  it('does not invent a Zombie when both deck and discard are empty and dead Leeches do not act', () => {
    const state = setup();
    battle(state).enemies[0] = { enemy: leech, hp: 5, block: 0, patternIndex: 0 };
    const next = endPlayerCombatTurn(state);
    expect(battle(next).enemies).toHaveLength(1);
    expect(battle(next).enemies[0].hp).toBe(7); // 5 + 2 Regen
    battle(state).enemies[0].hp = 0;
    state.enemyDiscard = [zombie];
    expect(endPlayerCombatTurn(state).enemyDiscard).toEqual([zombie]);
  });

  it('absorbs hero spell damage with Leech MDEF rather than physical DEF', () => {
    const state = setup();
    battle(state).enemies[0].hp = 18;
    battle(state).hand = [{ id: 'spell', instanceId: 'spell', name: 'Spell', classId: 'wizard', cardType: 'attack', apCost: 1, baseDamage: 6, damageScalingStat: 'int', damageScalingDivisor: 100, baseBlock: 0 }];
    state.rngState = Array.from({ length: 1000 }, (_, i) => i + 1).find(seed => {
      const roll = evaluateAttackRoll(seed, 1, 2);
      return roll.isHit;
    })!;
    const next = playCard(state, 'spell', 0);
    expect(battle(next).enemies[0].hp).toBe(15);
    expect(battle(next).lastAttackRoll?.defenseType).toBe('MDEF');
  });
});

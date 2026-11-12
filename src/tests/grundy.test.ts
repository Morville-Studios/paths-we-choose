import { describe, expect, it } from 'vitest';
import { createCombatSession, getMonsterIntent } from '../core/combat';
import { endTurn, startAdventure } from '../core/engine';
import { MonsterCard, RunState } from '../core/types';
import { createBossMonsterCard, MONSTER_TEMPLATES } from '../data/monsters';

function monster(templateId: keyof typeof MONSTER_TEMPLATES, id: string): MonsterCard {
  return { ...MONSTER_TEMPLATES[templateId], id };
}

function grundyBattle(monsterDeck: MonsterCard[], monsterDiscard: MonsterCard[] = []): RunState {
  const state = startAdventure('fighter', 'grundy-rules');
  const { combat } = createCombatSession([createBossMonsterCard()], [], state.rngState);
  return { ...state, monsterDeck, monsterDiscard, activeHook: { type: 'COMBAT', combat } };
}

describe('Grundy boss rules', () => {
  it('uses the requested Level 5 stats and reward inscription', () => {
    expect(createBossMonsterCard()).toMatchObject({
      name: 'Grundy', level: 5, maxHp: 30, def: 3, mdef: 1, acc: 3, eva: 3,
      goldReward: 32, statPointReward: 16,
    });
  });

  it('Call Goblin tutors the first Goblin from the hidden Monster Deck into play', () => {
    const rattler = monster('rattler', 'rattler-before-goblin');
    const goblin = monster('goblin', 'called-goblin');
    const result = endTurn(grundyBattle([rattler, goblin]));
    if (result.activeHook.type !== 'COMBAT') throw new Error('expected combat');
    expect(result.activeHook.combat.monsters.map(entry => entry.monster.id)).toEqual([
      'boss_goblin_chieftain', 'called-goblin',
    ]);
    expect(result.activeHook.combat.monsters[1]).toMatchObject({ hp: goblin.maxHp, patternIndex: 0 });
    expect(result.monsterDeck.map(card => card.id)).toEqual(['rattler-before-goblin']);
    expect(result.activeHook.combat.combatLog.some(entry => entry.includes('found Goblin in the Monster Deck'))).toBe(true);
  });

  it('returns one discarded Goblin to the top when Call Goblin finds none in the draw pile', () => {
    const rattler = monster('rattler', 'only-rattler');
    const goblin = monster('goblin', 'discarded-goblin');
    const result = endTurn(grundyBattle([rattler], [goblin]));
    if (result.activeHook.type !== 'COMBAT') throw new Error('expected combat');
    expect(result.activeHook.combat.monsters).toHaveLength(1);
    expect(result.monsterDeck.map(card => card.id)).toEqual(['discarded-goblin', 'only-rattler']);
    expect(result.monsterDiscard).toEqual([]);
    expect(result.activeHook.combat.combatLog.some(entry => entry.includes("call falls on deaf ears"))).toBe(true);
  });

  it('Beef up grants four Block and one temporary DEF', () => {
    const state = grundyBattle([]);
    if (state.activeHook.type !== 'COMBAT') throw new Error('expected combat');
    state.activeHook.combat.monsters[0].patternIndex = 1;
    const result = endTurn(state);
    if (result.activeHook.type !== 'COMBAT') throw new Error('expected combat');
    expect(result.activeHook.combat.monsters[0]).toMatchObject({ block: 4, defBonus: 1, defBonusTurns: 1 });
  });

  it('Goblin March adds one damage for every living Goblin in play', () => {
    const grundy = { monster: createBossMonsterCard(), hp: 24, block: 0, patternIndex: 2 };
    const goblinOne = { monster: monster('goblin', 'march-1'), hp: 6, block: 0, patternIndex: 0 };
    const goblinTwo = { monster: monster('goblin', 'march-2'), hp: 0, block: 0, patternIndex: 0 };
    expect(getMonsterIntent(grundy, [grundy, goblinOne, goblinTwo]).damage).toBe(7);
  });
});

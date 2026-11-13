import { describe, expect, it } from 'vitest';
import {
  createCombatSession,
  getMonsterEffectiveAtk,
  getMonsterEffectiveDef,
  getMonsterIntent,
} from '../core/combat';
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
  it('uses the requested Level 5 stats, ability, and reward inscription', () => {
    expect(createBossMonsterCard()).toMatchObject({
      name: 'Grundy', level: 5, maxHp: 30, def: 3, mdef: 1, acc: 3, eva: 3,
      goldReward: 50, statPointReward: 12,
      abilities: ["Grundy's ATK and DEF increases for each other goblin creatures in play"],
    });
  });

  it('Call Goblin summons the first Goblin from the hidden Monster Deck into play and shuffles the deck', () => {
    const rattler = monster('rattler', 'rattler-before-goblin');
    const goblin = monster('goblin', 'called-goblin');
    const result = endTurn(grundyBattle([rattler, goblin]));
    if (result.activeHook.type !== 'COMBAT') throw new Error('expected combat');
    expect(result.activeHook.combat.monsters.map(entry => entry.monster.id)).toEqual([
      'boss_goblin_chieftain', 'called-goblin',
    ]);
    expect(result.activeHook.combat.monsters[1]).toMatchObject({ hp: goblin.maxHp, patternIndex: 0 });
    expect(result.monsterDeck.map(card => card.id)).toEqual(['rattler-before-goblin']);
    expect(result.activeHook.combat.combatLog.some(entry => entry.includes('summoned Goblin from the Monster Deck into play and shuffled the deck'))).toBe(true);
  });

  it('returns one discarded Goblin to the top when Call Goblin finds none in the draw pile (FIFO)', () => {
    const rattler = monster('rattler', 'only-rattler');
    const goblin = monster('goblin', 'discarded-goblin');
    const result = endTurn(grundyBattle([rattler], [goblin]));
    if (result.activeHook.type !== 'COMBAT') throw new Error('expected combat');
    expect(result.activeHook.combat.monsters).toHaveLength(1);
    expect(result.monsterDeck.map(card => card.id)).toEqual(['discarded-goblin', 'only-rattler']);
    expect(result.monsterDiscard).toEqual([]);
    expect(result.activeHook.combat.combatLog.some(entry => entry.includes("Retrieved Goblin from the Monster Discard (FIFO)"))).toBe(true);
  });

  it('Turn 2 is Goblin March which deals 6 physical damage and has 2 turns total in pattern', () => {
    const card = createBossMonsterCard();
    expect(card.pattern).toHaveLength(2);
    expect(card.pattern[0].label).toBe('Call Goblin');
    expect(card.pattern[1]).toEqual({ label: 'Goblin March', damage: 6, block: 0 });
  });

  it('Grundy ATK and DEF increase for each other goblin creature in play', () => {
    const grundy = { monster: createBossMonsterCard(), hp: 30, block: 0, patternIndex: 1 };
    const goblinOne = { monster: monster('goblin', 'march-1'), hp: 6, block: 0, patternIndex: 0 };
    const goblinTwo = { monster: monster('goblin', 'march-2'), hp: 6, block: 0, patternIndex: 0 };
    const deadGoblin = { monster: monster('goblin', 'march-3'), hp: 0, block: 0, patternIndex: 0 };

    // With 0 other goblins
    expect(getMonsterEffectiveAtk(grundy, [grundy])).toBe(0);
    expect(getMonsterEffectiveDef(grundy, [grundy])).toBe(3); // base 3 DEF
    expect(getMonsterIntent(grundy, [grundy]).damage).toBe(6);

    // With 2 living goblins (dead goblin ignored)
    const inPlay = [grundy, goblinOne, goblinTwo, deadGoblin];
    expect(getMonsterEffectiveAtk(grundy, inPlay)).toBe(2);
    expect(getMonsterEffectiveDef(grundy, inPlay)).toBe(5); // base 3 + 2 = 5 DEF
    expect(getMonsterIntent(grundy, inPlay).damage).toBe(8); // 6 base + 2 ATK = 8 DMG
  });
});

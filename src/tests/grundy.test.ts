import { describe, expect, it } from 'vitest';
import {
  createCombatSession,
  getMonsterEffectiveAtk,
  getMonsterEffectiveDef,
  getMonsterIntent,
} from '../core/combat';
import { playCard, startAdventure } from '../core/engine';
import { CombatCardDef, MonsterCard, RunState } from '../core/types';
import { createBossMonsterCard, MONSTER_TEMPLATES } from '../data/monsters';

function monster(templateId: keyof typeof MONSTER_TEMPLATES, id: string): MonsterCard {
  return { ...MONSTER_TEMPLATES[templateId], id };
}

function heavyStrike(instanceId: string, baseDamage: number): CombatCardDef {
  return {
    id: 'test_strike',
    instanceId,
    name: 'Test Strike',
    classId: 'fighter',
    cardType: 'attack',
    level: 1,
    attackRange: 'melee',
    apCost: 1,
    baseDamage,
    baseBlock: 0,
    accBonus: 20,
    flavorText: 'Test strike.',
  };
}

function grundyBattle(
  monsterDeck: MonsterCard[],
  monsterDiscard: MonsterCard[] = [],
  grundyHp = 36,
  hand: CombatCardDef[] = [],
): RunState {
  const state = startAdventure('fighter', 'grundy-rules');
  const { combat } = createCombatSession([createBossMonsterCard()], [], state.rngState);
  combat.monsters[0].hp = grundyHp;
  if (hand.length > 0) {
    combat.hand = hand;
  }
  return { ...state, monsterDeck, monsterDiscard, activeHook: { type: 'COMBAT', combat } };
}

describe('Grundy boss rules', () => {
  it('uses the Level 5 stats, passive summon abilities, and reward inscription', () => {
    expect(createBossMonsterCard()).toMatchObject({
      name: 'Grundy', level: 5, maxHp: 36, def: 3, mdef: 2, acc: 3, eva: 3,
      goldReward: 50, statPointReward: 12,
      abilities: [
        "Grundy's ATK and DEF increases for each other goblin creatures in play",
        'Summons a Goblin from the Monster Deck at 50% HP and 25% HP',
      ],
    });
  });

  it('attacks immediately with Goblin March (6 physical damage)', () => {
    const card = createBossMonsterCard();
    expect(card.pattern).toHaveLength(1);
    expect(card.pattern[0]).toEqual({ label: 'Goblin March', damage: 6, block: 0 });
  });

  it('passively summons a Goblin at 50% HP and another at 25% HP from the Monster Deck', () => {
    const rattler = monster('rattler', 'rattler-before-goblin');
    const goblinOne = monster('goblin', 'called-goblin-1');
    const goblinTwo = monster('goblin', 'called-goblin-2');

    // Start at 20 HP; dealing 2+ net damage drops Grundy to <= 18 HP (50% of 36)
    const after50 = playCard(
      grundyBattle([rattler, goblinOne, goblinTwo], [], 20, [heavyStrike('s1', 6)]),
      's1',
      0,
    );
    if (after50.activeHook.type !== 'COMBAT') throw new Error('expected combat');
    expect(after50.activeHook.combat.monsters.map(entry => entry.monster.id)).toEqual([
      'boss_goblin_chieftain', 'called-goblin-1',
    ]);
    expect(after50.activeHook.combat.monsters[0].triggeredHpThresholds).toEqual([50]);
    expect(after50.activeHook.combat.combatLog.some(entry => entry.includes('drops to 50% HP or below'))).toBe(true);

    // Next hit drops Grundy to <= 9 HP (25% of 36) and summons the second Goblin
    after50.activeHook.combat.hand = [heavyStrike('s2', 14)];
    after50.activeHook.combat.playerAp = 3;
    const after25 = playCard(after50, 's2', 0);
    if (after25.activeHook.type !== 'COMBAT') throw new Error('expected combat');
    expect(after25.activeHook.combat.monsters.map(entry => entry.monster.id)).toEqual([
      'boss_goblin_chieftain', 'called-goblin-1', 'called-goblin-2',
    ]);
    expect(after25.activeHook.combat.monsters[0].triggeredHpThresholds).toEqual([50, 25]);
    expect(after25.monsterDeck.map(card => card.id)).toEqual(['rattler-before-goblin']);
  });

  it('retrieves a discarded Goblin to the top of Monster Deck (FIFO) if none are in draw pile on passive summon', () => {
    const rattler = monster('rattler', 'only-rattler');
    const goblin = monster('goblin', 'discarded-goblin');
    const result = playCard(
      grundyBattle([rattler], [goblin], 20, [heavyStrike('s1', 6)]),
      's1',
      0,
    );
    if (result.activeHook.type !== 'COMBAT') throw new Error('expected combat');
    expect(result.activeHook.combat.monsters).toHaveLength(1);
    expect(result.monsterDeck.map(card => card.id)).toEqual(['discarded-goblin', 'only-rattler']);
    expect(result.monsterDiscard).toEqual([]);
    expect(result.activeHook.combat.combatLog.some(entry => entry.includes('Retrieved Goblin from the Monster Discard (FIFO)'))).toBe(true);
  });

  it('Grundy ATK and DEF increase for each other goblin creature in play', () => {
    const grundy = { monster: createBossMonsterCard(), hp: 36, block: 0, patternIndex: 0 };
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

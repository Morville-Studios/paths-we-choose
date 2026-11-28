import { describe, expect, it } from 'vitest';
import {
  createCombatSession,
  endPlayerCombatTurn,
  getEnemyEffectiveAtk,
  getEnemyEffectiveDef,
  getEnemyIntent,
} from '../core/combat';
import { playCard, startAdventure } from '../core/engine';
import { ActionCardDef, EnemyCard, RunState } from '../core/types';
import { createBossEnemyCard, ENEMY_TEMPLATES } from '../data/enemies';

function enemy(templateId: keyof typeof ENEMY_TEMPLATES, id: string): EnemyCard {
  return { ...ENEMY_TEMPLATES[templateId], id };
}

function heavyStrike(instanceId: string, baseDamage: number): ActionCardDef {
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
  enemyDeck: EnemyCard[],
  enemyDiscard: EnemyCard[] = [],
  grundyHp = 36,
  hand: ActionCardDef[] = [],
): RunState {
  const state = startAdventure('fighter', 'grundy-rules');
  const { combat } = createCombatSession([createBossEnemyCard()], [], state.rngState);
  combat.enemies[0].hp = grundyHp;
  if (hand.length > 0) {
    combat.hand = hand;
  }
  return { ...state, enemyDeck, enemyDiscard, activeHook: { type: 'COMBAT', combat } };
}

describe('Grundy boss rules', () => {
  it('uses the Level 5 stats, passive summon abilities, and reward inscription', () => {
    expect(createBossEnemyCard()).toMatchObject({
      name: 'Grundy', level: 5, maxHp: 36, def: 3, mdef: 2, acc: 4, eva: 3,
      goldReward: 50, statPointReward: 12,
      summonOnTurnStart: 'goblin',
      abilities: [
        'Summon (Goblin)',
        'Emergency (Goblin)',
        'Inspired (Goblin)',
        'Co-defended (Goblin)',
      ],
    });
  });

  it('summons a Goblin from the Enemy Deck at the start of each of his turns', () => {
    const goblinOne = enemy('goblin', 'turn-goblin-1');
    const goblinTwo = enemy('goblin', 'turn-goblin-2');
    const state = grundyBattle([goblinOne, goblinTwo]);
    const afterTurn1 = endPlayerCombatTurn(state);
    if (afterTurn1.activeHook.type !== 'COMBAT') throw new Error('expected combat');
    expect(afterTurn1.activeHook.combat.enemies.map(entry => entry.enemy.id)).toEqual([
      'boss_goblin_chieftain', 'turn-goblin-1',
    ]);
    expect(afterTurn1.activeHook.combat.enemies[1].isSummon).toBe(true);
    expect(afterTurn1.enemyDeck.map(card => card.id)).toEqual(['turn-goblin-2']);
  });

  it('attacks immediately with Goblin March (6 physical damage)', () => {
    const card = createBossEnemyCard();
    expect(card.pattern).toHaveLength(1);
    expect(card.pattern[0]).toEqual({ label: 'Goblin March', damage: 6, block: 0 });
  });

  it('passively summons a Goblin at 50% HP and another at 25% HP from the Enemy Deck', () => {
    const rattler = enemy('rattler', 'rattler-before-goblin');
    const goblinOne = enemy('goblin', 'called-goblin-1');
    const goblinTwo = enemy('goblin', 'called-goblin-2');

    // Start at 20 HP; dealing 2+ net damage drops Grundy to <= 18 HP (50% of 36)
    const after50 = playCard(
      grundyBattle([rattler, goblinOne, goblinTwo], [], 20, [heavyStrike('s1', 6)]),
      's1',
      0,
    );
    if (after50.activeHook.type !== 'COMBAT') throw new Error('expected combat');
    expect(after50.activeHook.combat.enemies.map(entry => entry.enemy.id)).toEqual([
      'boss_goblin_chieftain', 'called-goblin-1',
    ]);
    expect(after50.activeHook.combat.enemies[0].triggeredHpThresholds).toEqual([50]);
    expect(after50.activeHook.combat.combatLog.some(entry => entry.includes('drops to 50% HP or below'))).toBe(true);

    // Next hit drops Grundy to <= 9 HP (25% of 36) and summons the second Goblin
    after50.activeHook.combat.hand = [heavyStrike('s2', 14)];
    after50.activeHook.combat.playerAp = 3;
    const after25 = playCard(after50, 's2', 0);
    if (after25.activeHook.type !== 'COMBAT') throw new Error('expected combat');
    expect(after25.activeHook.combat.enemies.map(entry => entry.enemy.id)).toEqual([
      'boss_goblin_chieftain', 'called-goblin-1', 'called-goblin-2',
    ]);
    expect(after25.activeHook.combat.enemies[0].triggeredHpThresholds).toEqual([50, 25]);
    expect(after25.enemyDeck.map(card => card.id)).toEqual(['rattler-before-goblin']);
  });

  it('retrieves a discarded Goblin to the top of Enemy Deck (FIFO) if none are in draw pile on passive summon', () => {
    const rattler = enemy('rattler', 'only-rattler');
    const goblin = enemy('goblin', 'discarded-goblin');
    const result = playCard(
      grundyBattle([rattler], [goblin], 20, [heavyStrike('s1', 6)]),
      's1',
      0,
    );
    if (result.activeHook.type !== 'COMBAT') throw new Error('expected combat');
    expect(result.activeHook.combat.enemies).toHaveLength(1);
    expect(result.enemyDeck.map(card => card.id)).toEqual(['discarded-goblin', 'only-rattler']);
    expect(result.enemyDiscard).toEqual([]);
    expect(result.activeHook.combat.combatLog.some(entry => entry.includes('Retrieved Goblin from the Enemy Discard (FIFO)'))).toBe(true);
  });

  it('Grundy ATK and DEF increase for each other goblin enemy in play', () => {
    const grundy = { enemy: createBossEnemyCard(), hp: 36, block: 0, patternIndex: 0 };
    const goblinOne = { enemy: enemy('goblin', 'march-1'), hp: 6, block: 0, patternIndex: 0 };
    const goblinTwo = { enemy: enemy('goblin', 'march-2'), hp: 6, block: 0, patternIndex: 0 };
    const deadGoblin = { enemy: enemy('goblin', 'march-3'), hp: 0, block: 0, patternIndex: 0 };

    // With 0 other goblins
    expect(getEnemyEffectiveAtk(grundy, [grundy])).toBe(0);
    expect(getEnemyEffectiveDef(grundy, [grundy])).toBe(3); // base 3 DEF
    expect(getEnemyIntent(grundy, [grundy]).damage).toBe(6);

    // With 2 living goblins (dead goblin ignored)
    const inPlay = [grundy, goblinOne, goblinTwo, deadGoblin];
    expect(getEnemyEffectiveAtk(grundy, inPlay)).toBe(2);
    expect(getEnemyEffectiveDef(grundy, inPlay)).toBe(5); // base 3 + 2 = 5 DEF
    expect(getEnemyIntent(grundy, inPlay).damage).toBe(8); // 6 base + 2 ATK = 8 DMG
  });
});

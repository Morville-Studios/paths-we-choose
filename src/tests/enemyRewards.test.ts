import { describe, expect, it } from 'vitest';
import { createCombatSession, evaluateAttackRoll, playActionCardFromHand } from '../core/combat';
import { startAdventure } from '../core/engine';
import { ActionCardDef, EnemyCard, RunState } from '../core/types';
import { ENEMY_TEMPLATES, createBossEnemyCard, createMission2BossCards, createMission3BossCard } from '../data/enemies';

describe('level-based enemy reward inscriptions', () => {
  it.each(Object.values(ENEMY_TEMPLATES))('$name grants the level-based SP and Gold rewards', enemy => {
    const isBoss = !!enemy.isBoss;
    const baseGold = enemy.level * 5;
    const baseSp = enemy.level + 1;
    const expectedGold = isBoss ? baseGold * 2 : baseGold;
    const expectedSp = isBoss ? baseSp * 2 : baseSp;
    expect(enemy.statPointReward).toBe(expectedSp);
    expect(enemy.goldReward).toBe(expectedGold);
  });

  it('spawns bosses with the same reward rule', () => {
    expect(createBossEnemyCard()).toMatchObject({ name: 'Grundy', level: 5, statPointReward: 12, goldReward: 50 });
    for (const enemy of createMission2BossCards()) {
      expect(enemy).toMatchObject({ level: 4, statPointReward: 10, goldReward: 40 });
    }
    expect(createMission3BossCard()).toMatchObject({ name: 'Fallen King', level: 7, statPointReward: 16, goldReward: 70 });
  });

  it('awards every defeated card inscription once, before player victory bonuses', () => {
    const state = startAdventure('wizard', 'all-enemy-rewards');
    const enemies: EnemyCard[] = Object.values(ENEMY_TEMPLATES).map(enemy => ({ ...enemy, id: enemy.templateId }));
    const finisher: ActionCardDef = { id: 'finish', instanceId: 'finish', name: 'Finish', classId: 'wizard',
      cardType: 'attack', apCost: 1, baseDamage: 100, baseBlock: 0, accBonus: 100 };
    const { combat } = createCombatSession(enemies, [], 42);
    combat.enemies.forEach((enemy, index) => { enemy.hp = index === 0 ? 1 : 0; });
    combat.hand = [finisher];
    const rngState = Array.from({ length: 1000 }, (_, index) => index + 1)
      .find(seed => evaluateAttackRoll(seed, 101, 1).isHit)!;
    const input: RunState = { ...state, rngState, activeHook: { type: 'COMBAT', combat } };
    const expectedSp = enemies.reduce((sum, enemy) => sum + enemy.statPointReward, 0);
    const expectedGold = enemies.reduce((sum, enemy) => sum + enemy.goldReward, 0);
    let awarded = false;
    const result = playActionCardFromHand(input, 'finish', 0, (next, defeated, rewards) => {
      awarded = true;
      expect(defeated).toHaveLength(enemies.length);
      expect(rewards).toMatchObject({ statPointsEarned: expectedSp, baseGold: expectedGold, goldEarned: expectedGold, luckyCharmGold: 0 });
      return next;
    });
    expect(awarded).toBe(true);
    expect(result.playerResources?.statPoints).toBe(state.playerResources!.statPoints + expectedSp);
    expect(result.playerResources?.gold).toBe(state.playerResources!.gold + expectedGold);
  });
});

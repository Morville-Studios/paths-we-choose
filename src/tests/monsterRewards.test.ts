import { describe, expect, it } from 'vitest';
import { createCombatSession, evaluateAttackRoll, playCombatCardFromHand } from '../core/combat';
import { startAdventure } from '../core/engine';
import { CombatCardDef, MonsterCard, RunState } from '../core/types';
import { MONSTER_TEMPLATES, createBossMonsterCard, createMission2BossCards, createMission3BossCard } from '../data/monsters';

describe('level-based monster reward inscriptions', () => {
  it.each(Object.values(MONSTER_TEMPLATES))('$name grants the level-based SP and Gold rewards', monster => {
    const isBoss = !!monster.isBoss;
    const baseGold = monster.level * 5;
    const baseSp = monster.level + 1;
    const expectedGold = isBoss ? baseGold * 2 : baseGold;
    const expectedSp = isBoss ? baseSp * 2 : baseSp;
    expect(monster.statPointReward).toBe(expectedSp);
    expect(monster.goldReward).toBe(expectedGold);
  });

  it('spawns bosses with the same reward rule', () => {
    expect(createBossMonsterCard()).toMatchObject({ name: 'Grundy', level: 5, statPointReward: 12, goldReward: 50 });
    for (const monster of createMission2BossCards()) {
      expect(monster).toMatchObject({ level: 4, statPointReward: 10, goldReward: 40 });
    }
    expect(createMission3BossCard()).toMatchObject({ name: 'Fallen King', level: 7, statPointReward: 16, goldReward: 70 });
  });

  it('awards every defeated card inscription once, before player victory bonuses', () => {
    const state = startAdventure('wizard', 'all-monster-rewards');
    const monsters: MonsterCard[] = Object.values(MONSTER_TEMPLATES).map(monster => ({ ...monster, id: monster.templateId }));
    const finisher: CombatCardDef = { id: 'finish', instanceId: 'finish', name: 'Finish', classId: 'wizard',
      cardType: 'attack', apCost: 1, baseDamage: 100, baseBlock: 0, accBonus: 100 };
    const { combat } = createCombatSession(monsters, [], 42);
    combat.monsters.forEach((monster, index) => { monster.hp = index === 0 ? 1 : 0; });
    combat.hand = [finisher];
    const rngState = Array.from({ length: 1000 }, (_, index) => index + 1)
      .find(seed => evaluateAttackRoll(seed, 101, 1).isHit)!;
    const input: RunState = { ...state, rngState, activeHook: { type: 'COMBAT', combat } };
    const expectedSp = monsters.reduce((sum, monster) => sum + monster.statPointReward, 0);
    const expectedGold = monsters.reduce((sum, monster) => sum + monster.goldReward, 0);
    let awarded = false;
    const result = playCombatCardFromHand(input, 'finish', 0, (next, defeated, rewards) => {
      awarded = true;
      expect(defeated).toHaveLength(monsters.length);
      expect(rewards).toMatchObject({ statPointsEarned: expectedSp, baseGold: expectedGold, goldEarned: expectedGold, luckyCharmGold: 0 });
      return next;
    });
    expect(awarded).toBe(true);
    expect(result.playerResources?.statPoints).toBe(state.playerResources!.statPoints + expectedSp);
    expect(result.playerResources?.gold).toBe(state.playerResources!.gold + expectedGold);
  });
});

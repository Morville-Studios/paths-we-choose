import { describe, expect, it } from 'vitest';
import { createCombatSession, evaluateAttackRoll, playCombatCardFromHand } from '../core/combat';
import { startAdventure } from '../core/engine';
import { CombatCardDef, MonsterCard, RunState } from '../core/types';
import { MONSTER_TEMPLATES, createBossMonsterCard, createMission2BossCards } from '../data/monsters';

describe('level-based monster reward inscriptions', () => {
  it.each(Object.values(MONSTER_TEMPLATES))('$name grants the level-based SP and Gold rewards', monster => {
    const expectedSp = [1, 2, 4, 8, 16, 32][monster.level - 1];
    expect(monster.statPointReward).toBe(expectedSp);
    expect(monster.goldReward).toBe(expectedSp * 2);
  });

  it('spawns bosses with the same reward rule', () => {
    expect(createBossMonsterCard()).toMatchObject({ level: 2, statPointReward: 2, goldReward: 4 });
    for (const monster of createMission2BossCards()) {
      expect(monster).toMatchObject({ level: 3, statPointReward: 4, goldReward: 8 });
    }
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
    let awarded = false;
    const result = playCombatCardFromHand(input, 'finish', 0, (next, defeated, rewards) => {
      awarded = true;
      expect(defeated).toHaveLength(19);
      expect(rewards).toMatchObject({ statPointsEarned: 53, baseGold: 106, goldEarned: 106, luckBonusGold: 0, luckyCharmGold: 0 });
      return next;
    });
    expect(awarded).toBe(true);
    expect(result.playerResources?.statPoints).toBe(state.playerResources!.statPoints + 53);
    expect(result.playerResources?.gold).toBe(state.playerResources!.gold + 106);
  });
});

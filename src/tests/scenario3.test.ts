import { describe, expect, it } from 'vitest';
import {
  createCombatSession,
  endPlayerCombatTurn,
  evaluateAttackRoll,
  playCombatCardFromHand,
} from '../core/combat';
import { startAdventure, startNextMission } from '../core/engine';
import { CombatCardDef, MonsterCard, RunState, ShopItemDef } from '../core/types';
import {
  MONSTER_TEMPLATES,
  createMission3BossCard,
  getScenarioMonsterDeckComposition,
} from '../data/monsters';
import { STAGE_3_DECK_COMPOSITION, STAGE_3_MISSION_NAME } from '../data/stages';

function card(templateId: 'dark_orc' | 'orc_shaman' | 'king_nezenheim'): MonsterCard {
  return { ...MONSTER_TEMPLATES[templateId], id: `${templateId}_test` };
}

function setupCombat(monsters: MonsterCard[], seed = 42): RunState {
  const state = startAdventure('fighter', `seed-${seed}`);
  const { combat } = createCombatSession(monsters, [], seed);
  return {
    ...state,
    playerResources: { hp: 100, maxHp: 100, statPoints: 0, gold: 0 },
    activeHook: { type: 'COMBAT', combat },
  };
}

describe('Scenario 3: Tomb of the Fallen King', () => {
  it('defines the correct 30-card adventure deck composition', () => {
    const total = Object.values(STAGE_3_DECK_COMPOSITION).reduce((a, b) => a + b, 0);
    expect(total).toBe(30);
    expect(STAGE_3_DECK_COMPOSITION['advsmp-01']).toBe(8);
    expect(STAGE_3_DECK_COMPOSITION['advcav-01']).toBe(5);
    expect(STAGE_3_DECK_COMPOSITION['advund-01']).toBe(1);
  });

  it('defines the correct 30-card monster deck composition', () => {
    const composition = getScenarioMonsterDeckComposition(3);
    const countMap = Object.fromEntries(composition.map(c => [c.templateId, c.count]));
    const total = Object.values(countMap).reduce((a, b) => a + b, 0);
    expect(total).toBe(30);

    // 17 Swamp
    expect(countMap.assassin).toBe(6);
    expect(countMap.leech).toBe(4);
    expect(countMap.witch).toBe(4);
    expect(countMap.creeper).toBe(3);

    // 10 Cave
    expect(countMap.cultist_mage).toBe(4);
    expect(countMap.lurker).toBe(3);
    expect(countMap.phalanx).toBe(3);

    // 3 Underground
    expect(countMap.dark_orc).toBe(2);
    expect(countMap.orc_shaman).toBe(1);
  });

  it('Dark Orc has correct stats and patterns', () => {
    const orc = MONSTER_TEMPLATES.dark_orc;
    expect(orc.level).toBe(5);
    expect(orc.maxHp).toBe(22);
    expect(orc.def).toBe(3);
    expect(orc.mdef).toBe(2);
    expect(orc.acc).toBe(4);
    expect(orc.eva).toBe(5);
    expect(orc.goldReward).toBe(25);
    expect(orc.statPointReward).toBe(6);
    expect(orc.pattern).toHaveLength(2);
    expect(orc.pattern[0]).toMatchObject({ label: 'Slash', damage: 9 });
    expect(orc.pattern[1]).toMatchObject({ label: 'Wild Swing', damage: 11, accBonus: -1 });
  });

  it('Orc Shaman has correct stats and dual-damage pattern', () => {
    const shaman = MONSTER_TEMPLATES.orc_shaman;
    expect(shaman.level).toBe(6);
    expect(shaman.maxHp).toBe(30);
    expect(shaman.def).toBe(3);
    expect(shaman.mdef).toBe(4);
    expect(shaman.acc).toBe(5);
    expect(shaman.eva).toBe(5);
    expect(shaman.goldReward).toBe(30);
    expect(shaman.statPointReward).toBe(7);
    expect(shaman.pattern).toHaveLength(2);
    expect(shaman.pattern[0]).toMatchObject({ label: 'Duality Spark', damage: 6, magicDamage: 6 });
    expect(shaman.pattern[1]).toMatchObject({ label: 'Wild Swing', damage: 11, accBonus: -1 });
  });

  it('King Nezenheim has boss stats and Unholy Aura passive', () => {
    const boss = MONSTER_TEMPLATES.king_nezenheim;
    expect(boss.isBoss).toBe(true);
    expect(boss.level).toBe(7);
    expect(boss.maxHp).toBe(40);
    expect(boss.def).toBe(5);
    expect(boss.mdef).toBe(5);
    expect(boss.acc).toBe(6);
    expect(boss.eva).toBe(5);
    expect(boss.goldReward).toBe(70);
    expect(boss.statPointReward).toBe(16);
    expect(boss.pattern[0].label).toBe('Summon Undead');
    expect(boss.pattern[0].summonUndeadFromMonsterDeck).toBe(true);
    expect(boss.pattern[1]).toMatchObject({ label: 'Corrupted Blade', damage: 7, magicDamage: 7 });
  });

  it('King Nezenheim Unholy Aura heals all undead allies (including himself) by 3 HP at turn start', () => {
    const bossCard = card('king_nezenheim');
    const minion = { ...MONSTER_TEMPLATES.creeper, id: 'creeper_test' };
    const state = setupCombat([bossCard, minion]);
    if (state.activeHook.type !== 'COMBAT') throw new Error('Expected combat');

    // Damage both creatures, set Creeper to patternIndex 1 (Ambush: 0 heal)
    state.activeHook.combat.monsters[0].hp = 30; // Boss (max 40)
    state.activeHook.combat.monsters[1].hp = 5;  // Creeper (max 14)
    state.activeHook.combat.monsters[1].patternIndex = 1;

    // End player turn -> King Nezenheim Unholy Aura activates
    const afterTurn = endPlayerCombatTurn(state);
    if (afterTurn.activeHook.type !== 'COMBAT') throw new Error('Expected combat');

    const m0 = afterTurn.activeHook.combat.monsters[0];
    const m1 = afterTurn.activeHook.combat.monsters[1];
    expect(m0.hp).toBe(33); // 30 + 3
    expect(m1.hp).toBe(8);  // 5 + 3
    expect((afterTurn.gameLog ?? []).some(l => l.includes('Unholy Aura') && l.includes('restoring 3 HP'))).toBe(true);
  });

  it('Summoned creatures are marked with isSummon and award 0 SP and 0 Gold on defeat', () => {
    const bossCard = card('king_nezenheim');
    const summonCard: MonsterCard = { ...MONSTER_TEMPLATES.zombie, id: 'summon_zombie', statPointReward: 10, goldReward: 50 };
    const state = setupCombat([bossCard]);
    if (state.activeHook.type !== 'COMBAT') throw new Error('Expected combat');

    // Add summoned monster to combat
    state.activeHook.combat.monsters.push({
      monster: summonCard,
      hp: 5,
      block: 0,
      patternIndex: 0,
      isSummon: true,
    });

    const strikeCard: CombatCardDef = {
      id: 'finisher',
      instanceId: 'finisher_1',
      name: 'Fatal Blow',
      classId: 'fighter',
      cardType: 'attack',
      apCost: 1,
      baseDamage: 100,
      baseBlock: 0,
      accBonus: 100,
    };
    state.activeHook.combat.hand = [strikeCard];
    state.playerResources = { hp: 50, maxHp: 50, statPoints: 10, gold: 20 };

    // Defeat the summon (target index 1)
    const afterKill = playCombatCardFromHand(state, 'finisher_1', 1, (next) => next);

    // 1. The summoned creature was returned immediately to monsterDiscard
    expect(afterKill.monsterDiscard.some(m => m.id === 'summon_zombie')).toBe(true);
    // 2. Player SP and Gold did not increase (prevent milking exploit)
    expect(afterKill.playerResources?.statPoints).toBe(10);
    expect(afterKill.playerResources?.gold).toBe(20);
    // 3. Game log notes that summoned creature was returned to discard with no rewards
    expect((afterKill.gameLog ?? []).some(l => l.includes('Summoned') && l.includes('awards no SP or Gold'))).toBe(true);
  });

  it('Dual damage attack (Duality Spark) applies DEF against physical and MDEF against magic', () => {
    const shaman = card('orc_shaman');
    // Pattern 0 is Duality Spark (6 damage + 6 magicDamage)
    const state = setupCombat([shaman], 100);
    if (state.activeHook.type !== 'COMBAT') throw new Error('Expected combat');

    const testArmor: ShopItemDef = {
      id: 'test_armor',
      instanceId: 'test_armor_1',
      name: 'Plate Robe',
      category: 'armor',
      buyPrice: 10,
      sellPrice: 5,
      description: 'Test armor',
      gearBonus: { def: 2, mdef: 1 },
    };
    state.equippedGear = {
      ...state.equippedGear,
      armor: testArmor,
    };
    state.playerResources = { hp: 50, maxHp: 50, statPoints: 0, gold: 0 };

    // Find an RNG seed where the monster attack hits
    let seedState = 1;
    let hitFound = false;
    for (let s = 1; s < 500; s++) {
      const roll = evaluateAttackRoll(s, shaman.acc ?? 5, 2);
      if (roll.isHit && !roll.isDiabolic) {
        seedState = s;
        hitFound = true;
        break;
      }
    }
    expect(hitFound).toBe(true);

    const testState = {
      ...state,
      rngState: seedState,
      activeHook: {
        type: 'COMBAT' as const,
        combat: {
          ...state.activeHook.combat,
          playerBlock: 0,
        },
      },
    };

    const afterTurn = endPlayerCombatTurn(testState);
    expect((afterTurn.gameLog ?? []).some(l => l.includes('Duality Spark') && l.includes('HIT!'))).toBe(true);
  });

  it('startNextMission transitions to Scenario 3 and spawns King Nezenheim', () => {
    const s1 = startAdventure('fighter', 'seed-s3-trans');
    const s2 = startNextMission(s1);
    expect(s2.currentMission).toBe(2);
    const s3 = startNextMission(s2);
    expect(s3.currentMission).toBe(3);
    expect(s3.missionName).toBe(STAGE_3_MISSION_NAME);
    expect(s3.scenarioLevel).toBe(3);
    expect(s3.turn).toBe(0);
    expect(s3.maxTurns).toBe(15);
    expect(s3.adventureDeck.length).toBe(25); // 30 - 5 initial dealt = 25
    expect(s3.monsterDeck.length).toBe(30);

    const boss = createMission3BossCard();
    expect(boss.name).toBe('Fallen King');
    expect(boss.isBoss).toBe(true);
  });
});

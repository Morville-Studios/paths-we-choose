import { describe, expect, it } from 'vitest';
import {
  attemptFlee,
  buyItem,
  calculateRestCost,
  chooseCard,
  clearMapBlessings,
  confirmCombatVictory,
  confirmExplorationCombat,
  confirmExplorationSafe,
  dismissWelcomePrepare,
  endTurn,
  finishVillage,
  getAvailableCoords,
  getFleeThreshold,
  leaveShrine,
  playCard,
  shrineChoosePrayerOption,
  shrineDoChoosePrayer,
  shrinePray,
  shrineUpgradeStat,
  startAdventure,
  startNextMission,
  villageChooseShop,
  villageChooseTrain,
  villageDoRest,
  villageDoTrainDraft,
  villageDoTrainRemove,
  villageGoBack,
  welcomeUpgradeStat,
  equipItem,
  unequipItem,
  useConsumable,
} from '../core/engine';
import { getTrainRemovalCost, getTrainingSkillCost } from '../core/village';
import {
  canUpgradeBaseStat,
  upgradeBaseStat,
  getBaseStatUpgradeCost,
  previewGearChange,
  getEffectiveStatsFromState,
  getPlayerAcc,
  getPlayerAct,
  getPlayerAtk,
  getPlayerCritThreshold,
  getPlayerEva,
  getPlayerDef,
  getPlayerMdef,
  computeCombatGearBonuses,
  calculateGoodsPrice,
  getFighterBerzerkBonus,
} from '../core/stats';
import {
  applySingleShrineBoon,
  getEligiblePrayerOptions,
  PRAYER_OPTION_CATALOG,
} from '../core/shrine';
import {
  computeCardEffect,
  evaluateAttackRoll,
  computeHitProbability,
  getMonsterIntent,
  BASE_HIT_THRESHOLD,
} from '../core/combat';
import { roll2D6 } from '../core/rng';
import { drawEncounterMonsters, drawMonsterCardWithReshuffle, buildStage2AdventureDeck } from '../core/deck';
import { MONSTER_TEMPLATES, createBossMonstersForMission } from '../data/monsters';
import { ADVENTURE_CARD_CATALOG, STAGE_2_MISSION_NAME } from '../data/stages';
import { COMBAT_CARD_CATALOG } from '../data/combatCards';
import { SHOP_ITEM_CATALOG } from '../data/shopItems';
import { AdventureCard, CombatCardDef, CombatMonster, MonsterCard, RunState } from '../core/types';

function start(classId: 'fighter' | 'wizard' | 'rogue' = 'fighter', seed = 'test-seed'): RunState {
  return startAdventure(classId, seed);
}

/** Moves along the first available choice, auto-resolving anything that opens. */
function stepAuto(state: RunState): RunState {
  let s = chooseCard(state, getAvailableCoords(state)[0]);
  let guard = 0;
  while (s.activeHook.type !== 'NONE' && guard++ < 500) {
    if (s.activeHook.type === 'COMBAT') {
      const combat = s.activeHook.combat;
      const curCombat = {
        ...combat,
        monsters: combat.monsters.map((m, idx) => ({ ...m, hp: idx === 0 ? 1 : 0, block: 0 })),
      };
      const atk = curCombat.hand.find((c: CombatCardDef) => c.cardType === 'attack');
      if (atk && curCombat.playerAp >= atk.apCost) {
        const reliableCard: CombatCardDef = { ...atk, accBonus: 10, baseDamage: 99 };
        s = {
          ...s,
          activeHook: {
            type: 'COMBAT',
            combat: {
              ...curCombat,
              hand: curCombat.hand.map((c: CombatCardDef) => (c.instanceId === atk.instanceId ? reliableCard : c)),
            },
          },
        };
        s = playCard(s, atk.instanceId, 0);
      } else {
        s = endTurn(s);
      }
    } else if (s.activeHook.type === 'VICTORY') {
      s = confirmCombatVictory(s);
    } else if (s.activeHook.type === 'VILLAGE') {
      s = finishVillage(s);
    } else if (s.activeHook.type === 'SHRINE') {
      s = leaveShrine(s);
    } else if (s.activeHook.type === 'EXPLORATION') {
      if (s.activeHook.exploration.outcome === 'combat') {
        s = confirmExplorationCombat(s);
      } else {
        s = confirmExplorationSafe(s);
      }
    } else break;
  }
  return s;
}

describe('stats', () => {
  it('fighter and wizard start with the documented effective stats and HP', () => {
    const f = start('fighter');
    expect(f.playerResources?.maxHp).toBe(16);
    expect(f.playerResources?.statPoints).toBe(4);
    expect(f.welcomePreparing).toBe(true);

    const w = start('wizard');
    expect(w.playerResources?.maxHp).toBe(12);
    expect(w.playerResources?.statPoints).toBe(4);
    expect(w.welcomePreparing).toBe(true);
  });

  it('upgrade cost is (currentBaseLevel + 1) squared', () => {
    // Base 1 -> 2 costs (1+1)^2 = 4 SP
    expect(getBaseStatUpgradeCost(1)).toBe(4);
    // Base 2 -> 3 costs (2+1)^2 = 9 SP
    expect(getBaseStatUpgradeCost(2)).toBe(9);
    // Base 3 -> 4 costs (3+1)^2 = 16 SP
    expect(getBaseStatUpgradeCost(3)).toBe(16);
    // Base 4 -> 5 costs (4+1)^2 = 25 SP
    expect(getBaseStatUpgradeCost(4)).toBe(25);

    let s = start('fighter');
    s = { ...s, playerResources: { ...s.playerResources!, statPoints: 13 } };
    expect(canUpgradeBaseStat(s, 'str')).toBe(true);
    s = upgradeBaseStat(s, 'str'); // 1 -> 2 costs 4 SP
    expect(s.playerBaseStats.str).toBe(2);
    expect(s.playerResources?.statPoints).toBe(9); // 13 - 4 = 9
    s = upgradeBaseStat(s, 'str'); // 2 -> 3 costs 9 SP
    expect(s.playerBaseStats.str).toBe(3);
    expect(s.playerResources?.statPoints).toBe(0); // 9 - 9 = 0
    expect(s.playerResources?.maxHp).toBe(20);
    expect(canUpgradeBaseStat(s, 'str')).toBe(false); // needs 16 SP
  });
});

describe('card scaling', () => {
  it('matches documented starting values', () => {
    const fighter = { str: 4, dex: 2, agi: 3, int: 2, cha: 1, luk: 1 };
    const melee = { ...COMBAT_CARD_CATALOG.melee_atk, instanceId: 'x' };
    expect(computeCardEffect(melee, fighter).damage).toBe(4);
    const shield = { ...COMBAT_CARD_CATALOG.shield_def, instanceId: 'y' };
    const eff = computeCardEffect(shield, fighter);
    expect(eff.block).toBe(4);
    expect(eff.evasionBonus).toBe(1);
  });
});

describe('board setup', () => {
  it('defines exactly one encounter tier for each currently available terrain', () => {
    const encounterLevels = Object.values(ADVENTURE_CARD_CATALOG)
      .filter((card) => card.hasHostile)
      .map((card) => `${card.terrain}:${card.level}`)
      .sort();

    expect(encounterLevels).toEqual(['forest:3', 'grasslands:2', 'swamp:4']);
  });

  it('deals 2 choices + 3 lookahead cards and is deterministic', () => {
    const a = start('fighter', 'abc');
    const b = start('fighter', 'abc');
    expect(Object.keys(a.board).length).toBe(6);
    expect(getAvailableCoords(a).length).toBe(2);
    expect(a.adventureDeck.length).toBe(25); // 30 total - 5 dealt = 25
    expect(Object.keys(a.board)).toEqual(Object.keys(b.board));
    expect(a.monsterDeck.length).toBe(38); // The Goblin King monster deck
  });

  it('Stage 1 deck composition: 30 cards total according to STAGE_1_DECK_COMPOSITION', () => {
    const s = start('wizard');
    const all = [...s.adventureDeck, ...Object.values(s.board).map((n) => n.card)].filter(
      (c) => c.terrain !== 'start'
    );
    expect(all.length).toBe(30);

    const counts: Record<string, number> = {};
    for (const c of all) {
      const code = c.cardNumber ?? '';
      counts[code] = (counts[code] ?? 0) + 1;
    }

    expect(counts['advgrs-00']).toBe(3);
    expect(counts['advgrs-01']).toBe(8);
    expect(counts['advgrs-03']).toBe(3);
    expect(counts['advgrs-04']).toBe(3);
    expect(counts['advfrs-00']).toBe(2);
    expect(counts['advfrs-01']).toBe(5);
    expect(counts['advfrs-03']).toBe(2);
    expect(counts['advfrs-04']).toBe(2);
    expect(counts['advsmp-00']).toBe(1);
    expect(counts['advsmp-01']).toBe(1);
    expect(counts['advsmp-03'] ?? 0).toBe(0);
    expect(counts['advsmp-04'] ?? 0).toBe(0);
  });

  it('draws monsters until total creature level >= 3 for Level 3 Forest Encounter', () => {
    const s = start('fighter', 'lvl3-test-seed');
    const drawn = drawEncounterMonsters(s.monsterDeck, s.monsterDiscard, s.rngState, 3, 'forest');
    const totalLevel = drawn.monsters.reduce((acc, m) => acc + m.level, 0);
    expect(totalLevel).toBeGreaterThanOrEqual(3);
    expect(drawn.monsters.length).toBeGreaterThanOrEqual(1);
    expect(drawn.monsters.every((m) => (m.spawnTerrains ?? []).includes('forest'))).toBe(true);
  });
});

describe('movement and conservation', () => {
  it('keeps 30 adventure cards conserved and bounded board size for the whole run', () => {
    let s = start('fighter', 'conserve');
    for (let t = 1; t <= 14; t++) {
      s = stepAuto(s);
      expect(s.activeHook.type).toBe('NONE');
      expect(s.turn).toBe(t);
      const boardCards = Object.keys(s.board).length;
      expect(s.adventureDeck.length + s.adventureDiscard.length + boardCards).toBe(30);
      expect(boardCards).toBeLessThanOrEqual(9);
      expect(getAvailableCoords(s).length).toBe(2);
    }
  });

  it('reaching turn 15 spawns the boss and defeating it completes the stage', () => {
    let s = start('fighter', 'boss-run');
    for (let t = 1; t <= 14; t++) s = stepAuto(s);
    s = chooseCard(s, getAvailableCoords(s)[0]);
    // Resolve the row-15 tile until the boss shows up
    let guard = 0;
    while (
      !(s.activeHook.type === 'COMBAT' && s.activeHook.combat.monsters.some((m) => m.monster.isBoss)) &&
      guard++ < 20
    ) {
      if (s.activeHook.type === 'COMBAT') {
        const combat = s.activeHook.combat;
        s = {
          ...s,
          activeHook: {
            type: 'COMBAT',
            combat: {
              ...combat,
              monsters: combat.monsters.map((m, idx) => ({ ...m, hp: idx === 0 ? 1 : 0, block: 0 })),
            },
          },
        };
        const atk = combat.hand.find((c) => c.cardType === 'attack')!;
        s = playCard(s, atk.instanceId, 0);
        if (s.activeHook.type === 'VICTORY') s = confirmCombatVictory(s);
      } else if (s.activeHook.type === 'VICTORY') s = confirmCombatVictory(s);
      else if (s.activeHook.type === 'VILLAGE') s = finishVillage(s);
      else if (s.activeHook.type === 'SHRINE') s = leaveShrine(s);
      else if (s.activeHook.type === 'EXPLORATION') {
        s = s.activeHook.exploration.outcome === 'combat' ? confirmExplorationCombat(s) : confirmExplorationSafe(s);
      }
    }
    expect(s.turn).toBe(15);
    expect(s.activeHook.type).toBe('COMBAT');
    if (s.activeHook.type !== 'COMBAT') return;
    expect(s.activeHook.combat.monsters[0].monster.name).toBe('Goblin Chieftain');
    const combat = s.activeHook.combat;
    s = {
      ...s,
      activeHook: {
        type: 'COMBAT',
        combat: {
          ...combat,
          monsters: combat.monsters.map((m) => ({ ...m, hp: 1, block: 0 })),
        },
      },
    };
    let atkGuard = 0;
    while (s.activeHook.type === 'COMBAT' && atkGuard++ < 30) {
      const curCombat = s.activeHook.combat;
      const atk = curCombat.hand.find((c) => c.cardType === 'attack');
      if (atk && curCombat.playerAp >= atk.apCost) {
        s = playCard(s, atk.instanceId, 0);
      } else {
        s = endTurn(s);
      }
    }
    if (s.activeHook.type === 'VICTORY') {
      expect(s.activeHook.victory.isBoss).toBe(true);
      s = confirmCombatVictory(s);
    }
    expect(s.activeHook.type).toBe('ON_STAGE_COMPLETE');
  });
});

describe('combat with hostile level 2', () => {
  it('fills battle area until total monster level >= 2', () => {
    let s = start('fighter', 'combat-enc');
    let guard = 0;
    while (s.activeHook.type !== 'COMBAT' && guard++ < 14) {
      s = chooseCard(s, getAvailableCoords(s)[0]);
      if (s.activeHook.type === 'VILLAGE') s = finishVillage(s);
      else if (s.activeHook.type === 'SHRINE') s = leaveShrine(s);
    }
    if (s.activeHook.type !== 'COMBAT') return;
    const combat = s.activeHook.combat;
    // Level 1 monsters each have level 1 (draws 2), or Level 2 monster draws 1
    const totalLevel = combat.monsters.reduce((sum, m) => sum + m.monster.level, 0);
    expect(totalLevel).toBeGreaterThanOrEqual(2);
    expect(combat.monsters.length).toBeGreaterThanOrEqual(1);
    expect(combat.hand.length).toBe(5);
    expect(combat.playerAp).toBe(3);

    const after = endTurn(s);
    if (after.activeHook.type === 'COMBAT') {
      expect(after.activeHook.combat.hand.length).toBe(5);
      expect(after.activeHook.combat.combatTurn).toBe(2);
    }
  });
});

describe('village', () => {
  function inVillage(): RunState {
    let s = start('fighter', 'village');
    s = {
      ...s,
      activeHook: {
        type: 'VILLAGE',
        village: { coord: { col: 0, row: 1 }, turn: 1, subView: 'main', trainOptions: [], shopStock: [], actionTaken: false },
      },
    };
    return s;
  }

  it('rest restores the selected amount and keeps the village visit open', () => {
    let s = inVillage();
    // A full rest of 13 missing HP takes 7 two-HP ticks and costs 7 Gold.
    s = { ...s, playerResources: { ...s.playerResources!, hp: 3, gold: 10 } };
    s = villageDoRest(s);
    expect(s.playerResources?.hp).toBe(s.playerResources?.maxHp);
    expect(s.playerResources?.gold).toBe(3);
    expect(s.activeHook.type).toBe('VILLAGE');
  });

  it('rest is prevented if player does not have enough gold', () => {
    let s = inVillage();
    s = { ...s, playerResources: { ...s.playerResources!, hp: 3, gold: 5 } }; // needs 7g
    const notRested = villageDoRest(s);
    expect(notRested.playerResources?.hp).toBe(3);
    expect(notRested.playerResources?.gold).toBe(5);
    expect(notRested.activeHook.type).toBe('VILLAGE');
  });

  it('rest is prevented when player is on full health and has no negative status ailments', () => {
    let s = inVillage();
    s = {
      ...s,
      statusEffects: [],
      playerResources: { ...s.playerResources!, hp: s.playerResources!.maxHp, gold: 50 },
    };
    const notRested = villageDoRest(s);
    expect(notRested.playerResources?.hp).toBe(s.playerResources!.maxHp);
    expect(notRested.playerResources?.gold).toBe(50);
    expect(notRested.activeHook.type).toBe('VILLAGE');
  });

  it('rest is disabled at full health even when the hero has an ailment', () => {
    let s = inVillage();
    s = {
      ...s,
      statusEffects: ['poison'],
      playerResources: { ...s.playerResources!, hp: s.playerResources!.maxHp, gold: 20 },
    };
    const rested = villageDoRest(s);
    expect(rested.playerResources?.hp).toBe(s.playerResources!.maxHp);
    expect(rested.playerResources?.gold).toBe(20);
    expect(rested.statusEffects).toEqual(['poison']);
    expect(rested.activeHook.type).toBe('VILLAGE');
  });

  it('rest heals HP but does not cleanse status ailments', () => {
    let s = inVillage();
    // 13 missing HP costs 7 one-Gold ticks.
    s = {
      ...s,
      statusEffects: ['poison', 'crippled'],
      playerResources: { ...s.playerResources!, hp: 3, gold: 20 },
    };
    const rested = villageDoRest(s);
    expect(rested.playerResources?.hp).toBe(s.playerResources!.maxHp);
    expect(rested.playerResources?.gold).toBe(13);
    expect(rested.statusEffects).toEqual(['poison', 'crippled']);
    expect(rested.activeHook.type).toBe('VILLAGE');
  });

  it('can return from shop to the menu after purchases without changing its prepared stock', () => {
    let s = inVillage();
    s = { ...s, playerResources: { ...s.playerResources!, gold: 20 } };
    s = villageChooseShop(s);
    if (s.activeHook.type !== 'VILLAGE') throw new Error('expected village');
    expect(s.activeHook.village.subView).toBe('shop');

    // Can go back to menu before purchasing
    s = villageGoBack(s);
    if (s.activeHook.type !== 'VILLAGE') throw new Error('expected village');
    expect(s.activeHook.village.subView).toBe('main');

    // Go back into shop and buy an item
    s = villageChooseShop(s);
    if (s.activeHook.type !== 'VILLAGE') throw new Error('expected village');
    const stocked = s.activeHook.village.shopStock.find(item => item.buyPrice <= 20)!;
    s = buyItem(s, stocked.instanceId);
    if (s.activeHook.type !== 'VILLAGE') throw new Error('expected village');
    const stockAfterPurchase = s.activeHook.village.shopStock;
    const backAfterPurchase = villageGoBack(s);
    if (backAfterPurchase.activeHook.type !== 'VILLAGE') throw new Error('expected village');
    expect(backAfterPurchase.activeHook.village.subView).toBe('main');
    expect(backAfterPurchase.activeHook.village.shopStock).toEqual(stockAfterPurchase);
  });

  it('previewGearChange correctly calculates stat deltas and maxHp changes', () => {
    const s = start('fighter');
    const preview = previewGearChange(s, 'weapon', {
      id: 'iron_broadsword',
      name: 'Iron Broadsword',
      description: 'Weapon',
      category: 'weapon',
      buyPrice: 8,
      sellPrice: 4,
      statBonus: { str: 1 },
    });
    expect(preview.before.str).toBe(3);
    expect(preview.after.str).toBe(4);
    expect(preview.maxHpBefore).toBe(16);
    expect(preview.maxHpAfter).toBe(18);
  });

  it('training has published costs, consumes prepared offers, and remains reversible', () => {
    let s = inVillage();
    s = { ...s, playerResources: { ...s.playerResources!, gold: 100, statPoints: 100 } };
    s = villageChooseTrain(s);
    expect(s.activeHook.type === 'VILLAGE' && s.activeHook.village.trainOptions.length).toBe(3);
    if (s.activeHook.type !== 'VILLAGE') throw new Error('expected village');
    const offer = s.activeHook.village.trainOptions[0];
    const skillCost = getTrainingSkillCost(offer);
    const drafted = villageDoTrainDraft(s, offer.instanceId);
    expect(drafted.playerMasterDeck.length).toBe(11);
    expect(drafted.activeHook.type).toBe('VILLAGE');
    expect(drafted.playerResources?.gold).toBe(100 - skillCost.gold);
    expect(drafted.playerResources?.statPoints).toBe(100 - skillCost.statPoints);
    if (drafted.activeHook.type !== 'VILLAGE') throw new Error('expected village');
    expect(drafted.activeHook.village.trainOptions).toHaveLength(2);

    const removalCost = getTrainRemovalCost(drafted);
    const removed = villageDoTrainRemove(drafted, drafted.playerMasterDeck[0].instanceId);
    expect(removed.playerMasterDeck.length).toBe(10);
    expect(removed.playerResources?.gold).toBe(100 - skillCost.gold - removalCost);
    expect(removed.trainRemovalCount).toBe(1);
    expect(getTrainRemovalCost(removed)).toBe(removalCost + 1);
  });
});

describe('shrine', () => {
  it('allows converting Stat Points into Base Stats and leaves the shrine', () => {
    let s = start('fighter');
    s = {
      ...s,
      playerResources: { ...s.playerResources!, statPoints: 13 },
      activeHook: { type: 'SHRINE', shrine: { coord: { col: 0, row: 1 }, turn: 1, prayed: false } },
    };
    // Upgrade STR: Base 1 -> 2 costs (1+1)^2 = 4 SP
    s = shrineUpgradeStat(s, 'str');
    expect(s.playerBaseStats.str).toBe(2);
    expect(s.playerResources?.statPoints).toBe(9); // 13 - 4 = 9

    // Upgrade STR again: Base 2 -> 3 costs (2+1)^2 = 9 SP
    s = shrineUpgradeStat(s, 'str');
    expect(s.playerBaseStats.str).toBe(3);
    expect(s.playerResources?.statPoints).toBe(0); // 9 - 9 = 0

    // Leave shrine
    s = leaveShrine(s);
    expect(s.activeHook.type).toBe('NONE');
  });

  it('evaluates prayer option eligibility based on player condition', () => {
    let s = start('fighter');
    // At full HP and no status effects: Cleanse and Revitalize should not appear
    let eligible = getEligiblePrayerOptions(s).map((o) => o.id);
    expect(eligible).not.toContain('cleanse');
    expect(eligible).not.toContain('revitalize');
    expect(eligible).toContain('blessing_str');
    expect(eligible).toContain('blessing_agi');
    expect(eligible).toContain('blessing_int');
    expect(eligible).toContain('blessing_luk');
    expect(eligible).toContain('divine_protection');

    // With negative status effect: Cleanse becomes eligible
    s = { ...s, statusEffects: ['poison'] };
    eligible = getEligiblePrayerOptions(s).map((o) => o.id);
    expect(eligible).toContain('cleanse');

    // When missing HP: Revitalize becomes eligible
    s = { ...s, playerResources: { ...s.playerResources!, hp: 10 } };
    eligible = getEligiblePrayerOptions(s).map((o) => o.id);
    expect(eligible).toContain('revitalize');
  });

  it('praying rolls 3 distinct options and granting a blessing updates effective stats and vitals', () => {
    let s = start('fighter');
    s = {
      ...s,
      activeHook: { type: 'SHRINE', shrine: { coord: { col: 0, row: 1 }, turn: 1, prayed: false } },
    };

    s = shrinePray(s);
    if (s.activeHook.type !== 'SHRINE') throw new Error('expected shrine');
    expect(s.activeHook.shrine.prayOptions?.length).toBe(3);

    // Ensure Blessing of Strength is available to test stat update and vitals syncing
    s = {
      ...s,
      activeHook: {
        type: 'SHRINE',
        shrine: {
          ...s.activeHook.shrine,
          prayOptions: [
            PRAYER_OPTION_CATALOG.blessing_str,
            PRAYER_OPTION_CATALOG.blessing_dex,
            PRAYER_OPTION_CATALOG.blessing_cha,
          ],
        },
      },
    };

    // Pick Blessing of Strength: grants +1 STR blessing bonus, which raises effective STR to 4 and Max HP from 16 to 18
    s = shrineChoosePrayerOption(s, 'blessing_str');
    expect(s.playerBlessingBonuses.str).toBe(1);
    expect(getEffectiveStatsFromState(s).str).toBe(4);
    expect(s.playerResources?.maxHp).toBe(18);
    expect(s.playerResources?.hp).toBe(18);

    // Shrine is now marked as prayed and cannot pray again
    if (s.activeHook.type !== 'SHRINE') throw new Error('expected shrine');
    expect(s.activeHook.shrine.prayed).toBe(true);
    const prayedAgain = shrinePray(s);
    expect(prayedAgain).toBe(s);
  });

  it('choosing a blessing via shrineDoChoosePrayer applies the boon and automatically leaves the shrine', () => {
    let s = start('fighter');
    s = {
      ...s,
      activeHook: { type: 'SHRINE', shrine: { coord: { col: 0, row: 1 }, turn: 1, prayed: false } },
    };

    s = shrinePray(s);
    if (s.activeHook.type !== 'SHRINE') throw new Error('expected shrine');
    const chosenBoon = s.activeHook.shrine.prayOptions![0].id;

    // Choose the boon via shrineDoChoosePrayer
    const after = shrineDoChoosePrayer(s, chosenBoon);
    // Shrine is automatically closed and player is back on the adventure board
    expect(after.activeHook.type).toBe('NONE');
  });

  it('cleanse removes negative status effects and revitalize restores full HP', () => {
    let s = start('fighter');
    s = {
      ...s,
      statusEffects: ['poison', 'blindness'],
      playerResources: { ...s.playerResources!, hp: 5 },
      activeHook: {
        type: 'SHRINE',
        shrine: {
          coord: { col: 0, row: 1 },
          turn: 1,
          prayed: false,
          prayOptions: [
            { id: 'cleanse', name: 'Cleanse', description: '' },
            { id: 'revitalize', name: 'Revitalize', description: '' },
            { id: 'divine_protection', name: 'Divine Protection', description: '' },
          ],
        },
      },
    };

    // Cleanse
    const cleansed = shrineChoosePrayerOption(s, 'cleanse');
    expect(cleansed.statusEffects).toEqual([]);

    // Revitalize
    const revitalized = shrineChoosePrayerOption(s, 'revitalize');
    expect(revitalized.playerResources?.hp).toBe(revitalized.playerResources?.maxHp);
  });

  it('divine protection reduces incoming monster combat damage by 1', () => {
    let s = start('fighter', 'seed-combat');
    s = {
      ...s,
      playerBaseStats: { ...s.playerBaseStats, str: 3 }, // 3 base + 2 class = 5 STR -> 1 DEF
      divineProtection: 1,
      activeHook: {
        type: 'COMBAT',
        combat: {
          monsters: [
            {
              monster: {
                id: 'goblin_1',
                templateId: 'goblin',
                name: 'Goblin',
                level: 1,
                maxHp: 8,
                acc: 10,
                statPointReward: 1,
                goldReward: 4,
                abilities: [],
                pattern: [{ label: 'Slash', damage: 3, block: 0 }],
              },
              hp: 8,
              block: 0,
              patternIndex: 0,
            },
          ],
          combatTurn: 1,
          playerAp: 0,
          playerMaxAp: 3,
          playerBlock: 0,
          playerEvasionMod: 0,
          drawPile: [],
          hand: [],
          discardPile: [],
          combatLog: [],
        },
      },
    };

    // Normal hit with 3 DMG would deal 3 HP loss. With Fighter 3 STR (1 DEF) + Divine Protection (1), damage reduction is 2 (3 - 2 = 1 HP loss: 16 -> 15).
    const after = endTurn(s);
    expect(after.playerResources?.hp).toBe(15);
  });

  it('temporary map blessings and divine protection do not carry over to the next map', () => {
    let s = start('fighter');
    s = {
      ...s,
      playerBlessingBonuses: { str: 1, dex: 1, agi: 1, int: 1, cha: 1, luk: 1 },
      divineProtection: 1,
      playerResources: { ...s.playerResources!, maxHp: 18, hp: 18 },
    };

    expect(getEffectiveStatsFromState(s).str).toBe(4);
    expect(s.divineProtection).toBe(1);

    // Clear map blessings
    const cleared = clearMapBlessings(s);
    expect(cleared.playerBlessingBonuses).toEqual({ str: 0, dex: 0, agi: 0, int: 0, cha: 0, luk: 0 });
    expect(cleared.divineProtection).toBe(0);
    // Effective STR reverts to 3, Max HP reverts to 16, and HP is reclamped to 16
    expect(getEffectiveStatsFromState(cleared).str).toBe(3);
    expect(cleared.playerResources?.maxHp).toBe(16);
    expect(cleared.playerResources?.hp).toBe(16);
  });

  it('automatically grants a random boon upon entering a shrine without needing to pray', () => {
    let s = start('fighter');
    s = dismissWelcomePrepare(s);
    // Place a shrine on (0, 1) and step on it
    const shrineCard: AdventureCard = {
      id: 'test_shrine_1',
      name: 'Grassland Shrine',
      terrain: 'grasslands',
      level: 1,
      hasShrine: true,
      hasHostile: false,
      hasVillage: false,
      revealed: true,
      cardNumber: 'ADV · #004',
    };
    s.board['-0.5,1'] = {
      coord: { col: -0.5, row: 1 },
      card: shrineCard,
      status: 'available',
      turnPlaced: 0,
    };

    s = chooseCard(s, { col: -0.5, row: 1 });
    expect(s.activeHook.type).toBe('SHRINE');
    if (s.activeHook.type !== 'SHRINE') throw new Error('expected shrine');

    // Shrine automatically granted a boon upon enter
    expect(s.activeHook.shrine.grantedBoon).toBeDefined();
    expect(s.activeHook.shrine.prayed).toBe(true);
    expect(s.activeBlessingId).toBe(s.activeHook.shrine.grantedBoon?.id);
    expect(s.bannerMessage).toContain(s.activeHook.shrine.grantedBoon!.name);
  });

  it('only 1 shrine blessing can be active at a time; getting another replaces the previous one', () => {
    let s = start('fighter');
    // First shrine grants Blessing of Strength
    const firstBoon = applySingleShrineBoon(s, 'blessing_str');
    s = firstBoon.nextState;
    expect(s.activeBlessingId).toBe('blessing_str');
    expect(s.playerBlessingBonuses.str).toBe(1);
    expect(getEffectiveStatsFromState(s).str).toBe(4);
    expect(s.playerResources?.maxHp).toBe(18); // 16 + 2 = 18

    // Second shrine grants Blessing of Agility
    const secondBoon = applySingleShrineBoon(s, 'blessing_agi');
    s = secondBoon.nextState;
    expect(secondBoon.replacedBoonName).toBe('Blessing of Strength');
    expect(s.activeBlessingId).toBe('blessing_agi');
    // Previous STR blessing was reset to 0
    expect(s.playerBlessingBonuses.str).toBe(0);
    // New AGI blessing is 1
    expect(s.playerBlessingBonuses.agi).toBe(1);
    // Max HP reverted from 18 to 16
    expect(s.playerResources?.maxHp).toBe(16);
    expect(s.playerResources?.hp).toBe(16);
  });
});

describe('rest cost formula', () => {
  it('charges one Gold per two HP restoration tick, rounding the final tick up', () => {
    expect(calculateRestCost({ hp: 18, maxHp: 18, statPoints: 0, gold: 0 })).toBe(0);
    expect(calculateRestCost({ hp: 10, maxHp: 18, statPoints: 0, gold: 0 })).toBe(4);
    expect(calculateRestCost({ hp: 8, maxHp: 18, statPoints: 0, gold: 0 })).toBe(5);
    expect(calculateRestCost({ hp: 1, maxHp: 20, statPoints: 0, gold: 0 })).toBe(10);
    expect(calculateRestCost({ hp: 0, maxHp: 20, statPoints: 0, gold: 0 })).toBe(10);
  });
});

describe('terrain-aware monster encounters (Ramram & Rattler)', () => {
  it('Ramram is a Level 1 beast found in grasslands only, and Rattler is found in forest only', () => {
    const s = start('fighter');
    const ramram = s.monsterDeck.find((m) => m.templateId === 'ramram');
    expect(ramram).toBeDefined();
    expect(ramram?.level).toBe(1);
    expect(ramram?.spawnTerrains).toEqual(['grasslands']);
    expect(ramram?.statPointReward).toBe(1);
    expect(ramram?.goldReward).toBe(2);
    expect(ramram?.maxHp).toBe(6);

    const rattler = s.monsterDeck.find((m) => m.templateId === 'rattler');
    expect(rattler).toBeDefined();
    expect(rattler?.level).toBe(2);
    expect(rattler?.spawnTerrains).toEqual(['forest']);
    expect(rattler?.statPointReward).toBe(2);
    expect(rattler?.goldReward).toBe(4);
    expect(rattler?.maxHp).toBe(6);
  });

  it('drawEncounterMonsters filters monsters by encounter terrain', () => {
    const s = start('fighter', 'seed-enc');

    // Drawing in Grasslands will never draw Rattler (forest only)
    const grasslandDraw = drawEncounterMonsters(s.monsterDeck, s.monsterDiscard, s.rngState, 6, 'grasslands');
    expect(grasslandDraw.monsters.length).toBeGreaterThan(0);
    expect(grasslandDraw.monsters.every((m) => m.spawnTerrains?.includes('grasslands'))).toBe(true);
    expect(grasslandDraw.monsters.some((m) => m.templateId === 'rattler')).toBe(false);

    // Drawing in Forest draws forest monsters
    const forestDraw = drawEncounterMonsters(s.monsterDeck, s.monsterDiscard, s.rngState, 6, 'forest');
    expect(forestDraw.monsters.length).toBeGreaterThan(0);
    expect(forestDraw.monsters.every((m) => m.spawnTerrains?.includes('forest'))).toBe(true);
  });

  it('incompatible drawn monsters go back to the bottom of the monster deck immediately instead of discard pile', () => {
    const rattler = { ...MONSTER_TEMPLATES.rattler, id: 'm_rattler' };   // Forest only
    const goblin = { ...MONSTER_TEMPLATES.goblin, id: 'm_goblin' };       // Grasslands & Forest
    const ramram = { ...MONSTER_TEMPLATES.ramram, id: 'm_ramram' };       // Grasslands & Forest
    const caveOnlyMonster: MonsterCard = {
      ...MONSTER_TEMPLATES.zombie,
      id: 'm_cave',
      spawnTerrains: ['cave'],
    };

    // Test Grassland draw where top card is Rattler (incompatible)
    const deck = [rattler, goblin, ramram];
    const discard: any[] = [];
    const result = drawMonsterCardWithReshuffle(deck, discard, 42, 'grasslands');

    // Goblin should be drawn
    expect(result.monster?.id).toBe('m_goblin');
    // Rattler must have moved to the bottom of the deck, NOT the discard pile!
    expect(result.discard.length).toBe(0);
    expect(result.deck.map((m) => m.id)).toEqual(['m_ramram', 'm_rattler']);

    // Test Forest draw where top card is cave-only (incompatible)
    const forestDeck = [caveOnlyMonster, rattler, goblin];
    const forestResult = drawMonsterCardWithReshuffle(forestDeck, discard, 42, 'forest');

    // Rattler should be drawn
    expect(forestResult.monster?.id).toBe('m_rattler');
    // Cave monster must have moved to the bottom of the deck, NOT the discard pile!
    expect(forestResult.discard.length).toBe(0);
    expect(forestResult.deck.map((m) => m.id)).toEqual(['m_goblin', 'm_cave']);
  });

  it('contains 2x Bullwark, 2x Basilisk, and 4x Zombie in monster deck with correct terrain spawning', () => {
    const s = start('fighter');
    const bullwarks = s.monsterDeck.filter((m) => m.templateId === 'bullwark');
    expect(bullwarks.length).toBe(2);
    expect(bullwarks[0].level).toBe(3);
    expect(bullwarks[0].spawnTerrains).toEqual(['swamp', 'forest']);
    expect(bullwarks[0].def).toBe(2);
    expect(bullwarks[0].eva).toBe(0);
    expect(bullwarks[0].acc).toBe(1);
    expect(bullwarks[0].maxHp).toBe(12);
    expect(bullwarks[0].goldReward).toBe(8);
    expect(bullwarks[0].statPointReward).toBe(4);

    const treeSnappers = s.monsterDeck.filter((m) => m.templateId === 'tree_snapper');
    expect(treeSnappers.length).toBe(2);
    expect(treeSnappers[0].level).toBe(2);
    expect(treeSnappers[0].spawnTerrains).toEqual(['swamp', 'forest']);
    expect(treeSnappers[0].def).toBe(1);
    expect(treeSnappers[0].acc).toBe(1);
    expect(treeSnappers[0].maxHp).toBe(8);
    expect(treeSnappers[0].goldReward).toBe(4);
    expect(treeSnappers[0].statPointReward).toBe(2);
    expect(treeSnappers[0].creatureType).toBe('Reptile');

    const zombies = s.monsterDeck.filter((m) => m.templateId === 'zombie');
    expect(zombies.length).toBe(4);
    expect(zombies[0].level).toBe(2);
    expect(zombies[0].spawnTerrains).toEqual(['swamp', 'cave', 'forest']);
    expect(zombies[0].maxHp).toBe(7);
    expect(zombies[0].goldReward).toBe(4);
    expect(zombies[0].statPointReward).toBe(2);

    // None of these three spawn in Grasslands
    const grasslandDraw = drawEncounterMonsters(s.monsterDeck, s.monsterDiscard, s.rngState, 6, 'grasslands');
    expect(grasslandDraw.monsters.some((m) => m.templateId === 'bullwark')).toBe(false);
    expect(grasslandDraw.monsters.some((m) => m.templateId === 'tree_snapper')).toBe(false);
    expect(grasslandDraw.monsters.some((m) => m.templateId === 'zombie')).toBe(false);
  });
});

describe('new creature mechanics: Bullwark charge scaling and Zombie lifesteal', () => {
  it('Bullwark charge attack increases its attack damage by +1 permanently each time it charges', () => {
    const bullwarkCard = { ...MONSTER_TEMPLATES.bullwark, id: 'test_bullwark' };
    const cm: CombatMonster = {
      monster: bullwarkCard,
      hp: bullwarkCard.maxHp,
      block: 0,
      patternIndex: 0, // Turn 1: Bulwark Brace (block 4)
    };

    // Intent at index 0 is Bulwark Brace (block 4, damage 0)
    expect(getMonsterIntent(cm).damage).toBe(0);
    expect(getMonsterIntent(cm).block).toBe(4);

    // Advance to index 1: Heavy Charge (damage 6)
    cm.patternIndex = 1;
    expect(getMonsterIntent(cm).damage).toBe(6);

    // Simulate combat state with Bullwark about to execute Heavy Charge
    let s = start('fighter');
    // Ensure hero has high HP and no block so damage passes through
    s = {
      ...s,
      activeHook: {
        type: 'COMBAT',
        combat: {
          monsters: [cm],
          combatTurn: 1,
          playerAp: 0,
          playerMaxAp: 3,
          playerBlock: 0,
          playerEvasionMod: 0,
          drawPile: [],
          hand: [],
          discardPile: [],
          combatLog: [],
        },
      },
    };

    // End turn to trigger monster turn execution
    s = endTurn(s);
    expect(s.activeHook?.type).toBe('COMBAT');
    if (s.activeHook?.type === 'COMBAT') {
      const activeMonster = s.activeHook.combat.monsters[0];
      // Charge momentum increased attackBonus to 1
      expect(activeMonster.attackBonus).toBe(1);
      // On next cycle when index wraps back to Heavy Charge, damage should be 6 + 1 = 7
      activeMonster.patternIndex = 1;
      expect(getMonsterIntent(activeMonster).damage).toBe(7);
    }
  });

  it('Zombie has 1 DEF, 0 EVA, and regenerates 2 HP (no Block) on Turn 1', () => {
    const zombieTemplate = MONSTER_TEMPLATES.zombie;
    expect(zombieTemplate.def).toBe(1);
    expect(zombieTemplate.eva).toBe(0);
    expect(zombieTemplate.acc).toBe(0);
    expect(zombieTemplate.pattern).toHaveLength(2);
    expect(zombieTemplate.pattern[0]).toEqual({ label: 'Regenerate', damage: 0, block: 0, heal: 2 });
    expect(zombieTemplate.pattern[1]).toEqual({ label: 'Rotting Claw', damage: 5, block: 0 });

    const zombieCard = { ...zombieTemplate, id: 'test_zombie' };
    const cm: CombatMonster = {
      monster: zombieCard,
      hp: 4, // Damaged zombie (maxHp 7)
      block: 0,
      patternIndex: 0, // Regenerate
    };

    let s = start('fighter');
    s = {
      ...s,
      playerResources: { ...s.playerResources!, hp: 30, maxHp: 30 },
      activeHook: {
        type: 'COMBAT',
        combat: {
          monsters: [cm],
          combatTurn: 1,
          playerAp: 0,
          playerMaxAp: 3,
          playerBlock: 0,
          playerEvasionMod: 0,
          drawPile: [],
          hand: [],
          discardPile: [],
          combatLog: [],
        },
      },
    };

    const next = endTurn(s);
    expect(next.activeHook.type).toBe('COMBAT');
    if (next.activeHook.type === 'COMBAT') {
      const mon = next.activeHook.combat.monsters[0];
      expect(mon.hp).toBe(6); // Restored +2 HP from 4
      expect(mon.block).toBe(0); // No Block gained on Regenerate
      expect(mon.patternIndex).toBe(1); // Advanced to next pattern step (Rotting Claw)
      const hasRegenLog = next.activeHook.combat.combatLog.some(
        (l) => l.includes('Zombie uses Regenerate: restores +2 HP (6/7 HP).')
      );
      expect(hasRegenLog).toBe(true);
    }
  });

  it('Zombie heals HP equal to unblocked damage dealt to player (lifesteal)', () => {
    const zombieCard = { ...MONSTER_TEMPLATES.zombie, id: 'test_zombie' };
    const cm: CombatMonster = {
      monster: zombieCard,
      hp: 5, // Damaged zombie (maxHp 14)
      block: 0,
      patternIndex: 1, // Rotting Claw (damage 4, block 0)
    };

    let s = start('fighter');
    // Set hero DEF to 0 and player block to 0, ensure attack hits
    s = {
      ...s,
      playerBaseStats: { ...s.playerBaseStats, str: 1, agi: 1, dex: 1 }, // Def = 0
      playerResources: { ...s.playerResources!, hp: 30, maxHp: 30 },
      activeHook: {
        type: 'COMBAT',
        combat: {
          monsters: [cm],
          combatTurn: 1,
          playerAp: 0,
          playerMaxAp: 3,
          playerBlock: 0,
          playerEvasionMod: 0,
          drawPile: [],
          hand: [],
          discardPile: [],
          combatLog: [],
        },
      },
    };

    // Run until a hit occurs or set rng to ensure hit
    let healed = false;
    for (let seed = 1; seed <= 50; seed++) {
      let testState = { ...s, rngState: seed * 7919 };
      const next = endTurn(testState);
      if (next.activeHook?.type === 'COMBAT') {
        const mon = next.activeHook.combat.monsters[0];
        if (mon.hp > 5) {
          // Zombie healed via lifesteal!
          expect(mon.hp).toBeGreaterThan(5);
          expect(mon.hp).toBeLessThanOrEqual(zombieCard.maxHp);
          const hasHealLog = next.activeHook.combat.combatLog.some((l) => l.includes('drains life and restores'));
          expect(hasHealLog).toBe(true);
          healed = true;
          break;
        }
      }
    }
    expect(healed).toBe(true);
  });

  it('drawMonsterCardWithReshuffle discards monsters with level > encounterLevel directly into monsterDiscard', () => {
    const bullwark = { ...MONSTER_TEMPLATES.bullwark, id: 'm_bull' }; // Lvl 3
    const rattler = { ...MONSTER_TEMPLATES.rattler, id: 'm_rat' };   // Lvl 2
    const goblin = { ...MONSTER_TEMPLATES.goblin, id: 'm_gob' };     // Lvl 1

    // Draw for a Level 1 encounter
    const deck = [bullwark, rattler, goblin];
    const discard: MonsterCard[] = [];
    const drawn = drawMonsterCardWithReshuffle(deck, discard, 1234, 'forest', 1);

    // Goblin (Lvl 1) is selected
    expect(drawn.monster?.id).toBe('m_gob');
    // Bullwark (Lvl 3) and Rattler (Lvl 2) went straight to discard!
    expect(drawn.discard.map((m) => m.id)).toEqual(['m_bull', 'm_rat']);
    expect(drawn.deck).toEqual([]);
  });

  it('drawEncounterMonsters respects encounterLevel discard rule for Level 1 encounter', () => {
    const bullwark = { ...MONSTER_TEMPLATES.bullwark, id: 'm_bull' }; // Lvl 3
    const treeSnapper = { ...MONSTER_TEMPLATES.tree_snapper, id: 'm_snap' }; // Lvl 2
    const slime = { ...MONSTER_TEMPLATES.pink_slime, id: 'm_slime' }; // Lvl 1

    const deck = [bullwark, treeSnapper, slime];
    const discard: MonsterCard[] = [];
    const res = drawEncounterMonsters(deck, discard, 42, 1, 'forest');

    expect(res.monsters.length).toBe(1);
    expect(res.monsters[0].id).toBe('m_slime');
    expect(res.discard.map((m) => m.id)).toEqual(['m_bull', 'm_snap']);
  });

  it('Basilisk Turn 1 Stalk grants +2 EVA for 1 turn against player attacks', () => {
    const treeSnapper = { ...MONSTER_TEMPLATES.tree_snapper, id: 'm_snapper' };
    expect(treeSnapper.maxHp).toBe(8);
    expect(treeSnapper.goldReward).toBe(4);
    expect(treeSnapper.statPointReward).toBe(2);
    expect(treeSnapper.acc).toBe(1);
    expect(treeSnapper.eva).toBe(1);
    expect(treeSnapper.def).toBe(1);
    expect(treeSnapper.creatureType).toBe('Reptile');
    expect(treeSnapper.abilities).toHaveLength(0);

    const cm: CombatMonster = {
      monster: treeSnapper,
      hp: 8,
      block: 0,
      patternIndex: 0, // Turn 1: Stalk
    };

    let s = start('fighter');
    s = {
      ...s,
      activeHook: {
        type: 'COMBAT',
        combat: {
          monsters: [cm],
          combatTurn: 1,
          playerAp: 0,
          playerMaxAp: 3,
          playerBlock: 0,
          playerEvasionMod: 0,
          drawPile: [],
          hand: [],
          discardPile: [],
          combatLog: [],
        },
      },
    };

    const next = endTurn(s);
    if (next.activeHook.type === 'COMBAT') {
      const mon = next.activeHook.combat.monsters[0];
      expect(mon.evaBonus).toBe(2);
      expect(next.activeHook.combat.combatLog.some((l) => l.includes('Basilisk uses Stalk and gains +2 EVA'))).toBe(true);
    }
  });

  it('Blob Ooze Bump deals 3 DMG and restores 1 HP', () => {
    const slime = { ...MONSTER_TEMPLATES.pink_slime, id: 'm_slime' };
    expect(slime.maxHp).toBe(4);
    expect(slime.goldReward).toBe(2);
    expect(slime.statPointReward).toBe(1);
    expect(slime.acc).toBe(0);
    expect(slime.def).toBe(1);
    expect(slime.pattern[0]).toEqual({ label: 'Ooze Bump', damage: 3, block: 0, heal: 1 });
    expect(slime.pattern[1]).toEqual({ label: 'Acid Glob', damage: 4, block: 0 });

    const cm: CombatMonster = {
      monster: slime,
      hp: 2, // Damaged: 2/4 HP
      block: 0,
      patternIndex: 0, // Ooze Bump
    };

    let s = start('fighter');
    s = {
      ...s,
      activeHook: {
        type: 'COMBAT',
        combat: {
          monsters: [cm],
          combatTurn: 1,
          playerAp: 0,
          playerMaxAp: 3,
          playerBlock: 0,
          playerEvasionMod: 0,
          drawPile: [],
          hand: [],
          discardPile: [],
          combatLog: [],
        },
      },
    };

    const next = endTurn(s);
    if (next.activeHook.type === 'COMBAT') {
      const mon = next.activeHook.combat.monsters[0];
      expect(mon.hp).toBe(3); // Healed +1 HP from 2
      expect(next.activeHook.combat.combatLog.some((l) => l.includes('Blob uses Ooze Bump: restores +1 HP'))).toBe(true);
    }
  });

  it('Scavenger Lunging Bite grants +1 ACC for 1 turn', () => {
    const dog = { ...MONSTER_TEMPLATES.wild_dog, id: 'm_dog' };
    expect(dog.maxHp).toBe(6);
    expect(dog.goldReward).toBe(2);
    expect(dog.statPointReward).toBe(1);
    expect(dog.pattern[1]).toEqual({ label: 'Lunging Bite', damage: 3, block: 0, accBonus: 1 });

    const cm: CombatMonster = {
      monster: dog,
      hp: 6,
      block: 0,
      patternIndex: 1, // Lunging Bite
    };

    let s = start('fighter');
    s = {
      ...s,
      activeHook: {
        type: 'COMBAT',
        combat: {
          monsters: [cm],
          combatTurn: 1,
          playerAp: 0,
          playerMaxAp: 3,
          playerBlock: 0,
          playerEvasionMod: 0,
          drawPile: [],
          hand: [],
          discardPile: [],
          combatLog: [],
        },
      },
    };

    const next = endTurn(s);
    if (next.activeHook.type === 'COMBAT') {
      const mon = next.activeHook.combat.monsters[0];
      expect(mon.accBonus).toBe(1);
      expect(next.activeHook.combat.combatLog.some((l) => l.includes('Scavenger uses Lunging Bite and gains +1 ACC'))).toBe(true);
    }
  });
});

describe('2x 1d6 (2d6) combat rolls, DEX, ACC and EVA mechanics', () => {
  it('rolls 2d6 in range 2-12 and accurately identifies snake eyes and boxcars', () => {
    let state = 12345;
    let hadSnakeEyes = false;
    let hadBoxcars = false;
    let had7 = false;

    for (let i = 0; i < 200; i++) {
      const res = roll2D6(state);
      expect(res.die1).toBeGreaterThanOrEqual(1);
      expect(res.die1).toBeLessThanOrEqual(6);
      expect(res.die2).toBeGreaterThanOrEqual(1);
      expect(res.die2).toBeLessThanOrEqual(6);
      expect(res.total).toBe(res.die1 + res.die2);
      expect(res.total).toBeGreaterThanOrEqual(2);
      expect(res.total).toBeLessThanOrEqual(12);

      if (res.die1 === 1 && res.die2 === 1) {
        expect(res.isSnakeEyes).toBe(true);
        hadSnakeEyes = true;
      } else {
        expect(res.isSnakeEyes).toBe(false);
      }

      if (res.die1 === 6 && res.die2 === 6) {
        expect(res.isBoxcars).toBe(true);
        hadBoxcars = true;
      } else {
        expect(res.isBoxcars).toBe(false);
      }

      if (res.total === 7) had7 = true;
      state = res.nextState;
    }

    expect(hadSnakeEyes).toBe(true);
    expect(hadBoxcars).toBe(true);
    expect(had7).toBe(true);
  });

  it('evaluates attack rolls with ACC vs EVA, snake eyes miss and boxcars critical', () => {
    // 3 ACC vs 2 EVA -> net ACC = +1, needs 4+ on 2d6 to hit
    // Search for a roll that gives total = 6
    let s = 1;
    let found6 = false;
    let foundSnakeEyes = false;
    let foundBoxcars = false;

    for (let i = 0; i < 500; i++) {
      const currentState = s;
      const { die1, die2, total, nextState } = roll2D6(s);
      s = nextState;

      if (die1 === 1 && die2 === 1) {
        // Snake eyes with +10 net ACC must STILL be a total miss!
        const evalSnake = evaluateAttackRoll(currentState, 12, 2);
        expect(evalSnake.isSnakeEyes).toBe(true);
        expect(evalSnake.isHit).toBe(false);
        expect(evalSnake.isCrit).toBe(false);
        foundSnakeEyes = true;
      }

      if (die1 === 6 && die2 === 6) {
        // Boxcars with -10 net ACC must STILL be a critical hit!
        const evalBox = evaluateAttackRoll(currentState, 0, 10);
        expect(evalBox.isBoxcars).toBe(true);
        expect(evalBox.isHit).toBe(true);
        expect(evalBox.isCrit).toBe(true);
        foundBoxcars = true;
      }

      if (total === 6 && die1 !== die2) {
        // 3 ACC vs 2 EVA (+1 net ACC): total 6 + 1 = 7 >= 5 -> HIT!
        const evalHit = evaluateAttackRoll(currentState, 3, 2);
        expect(evalHit.total).toBe(6);
        expect(evalHit.netAcc).toBe(1);
        expect(evalHit.neededRoll).toBe(4);
        expect(evalHit.isHit).toBe(true);
        found6 = true;
      }
    }

    expect(found6).toBe(true);
    expect(foundSnakeEyes).toBe(true);
    expect(foundBoxcars).toBe(true);
  });

  it('class defaults: Warrior/Fighter and Wizard stat bonuses, ACC, EVA, and CHA', () => {
    const fighter = start('fighter');
    const fEff = getEffectiveStatsFromState(fighter);
    expect(fEff.dex).toBe(2); // 1 base + 1 class (secondary)
    expect(getPlayerAcc(fEff)).toBe(1); // 1 per 2 DEX (floor(2/2) = 1)
    expect(fEff.agi).toBe(2); // 1 base + 1 class (secondary)
    expect(getPlayerEva(fEff)).toBe(1); // 1 per 2 AGI (floor(2/2) = 1)
    expect(fEff.str).toBe(3); // 1 base + 2 class (primary)
    expect(fEff.cha).toBe(1); // 1 base + 0 class

    const wizard = start('wizard');
    const wEff = getEffectiveStatsFromState(wizard);
    expect(wEff.int).toBe(3); // 1 base + 2 class (primary)
    expect(wEff.dex).toBe(2); // 1 base + 1 class (secondary)
    expect(getPlayerAcc(wEff)).toBe(1); // 1 per 2 DEX (floor(2/2) = 1)
    expect(wEff.cha).toBe(2); // 1 base + 1 class (secondary)
    expect(wEff.agi).toBe(1); // 1 base + 0 class
    expect(getPlayerEva(wEff)).toBe(0); // 1 per 2 AGI (floor(1/2) = 0)
  });

  it('1 EVA per 2 AGI and 1 ACC per 2 DEX scaling rules', () => {
    expect(getPlayerEva({ str: 1, dex: 1, agi: 1, int: 1, cha: 1, luk: 1 })).toBe(0); // floor(1/2) = 0
    expect(getPlayerEva({ str: 1, dex: 1, agi: 2, int: 1, cha: 1, luk: 1 })).toBe(1); // floor(2/2) = 1
    expect(getPlayerEva({ str: 1, dex: 1, agi: 3, int: 1, cha: 1, luk: 1 })).toBe(1); // floor(3/2) = 1
    expect(getPlayerEva({ str: 1, dex: 1, agi: 4, int: 1, cha: 1, luk: 1 })).toBe(2); // floor(4/2) = 2
    expect(getPlayerEva({ str: 1, dex: 1, agi: 5, int: 1, cha: 1, luk: 1 })).toBe(2); // floor(5/2) = 2
    expect(getPlayerEva({ str: 1, dex: 1, agi: 6, int: 1, cha: 1, luk: 1 })).toBe(3); // floor(6/2) = 3

    expect(getPlayerAcc({ str: 1, dex: 1, agi: 1, int: 1, cha: 1, luk: 1 })).toBe(0); // floor(1/2) = 0
    expect(getPlayerAcc({ str: 1, dex: 2, agi: 1, int: 1, cha: 1, luk: 1 })).toBe(1); // floor(2/2) = 1
    expect(getPlayerAcc({ str: 1, dex: 3, agi: 1, int: 1, cha: 1, luk: 1 })).toBe(1); // floor(3/2) = 1
    expect(getPlayerAcc({ str: 1, dex: 4, agi: 1, int: 1, cha: 1, luk: 1 })).toBe(2); // floor(4/2) = 2
    expect(getPlayerAcc({ str: 1, dex: 5, agi: 1, int: 1, cha: 1, luk: 1 })).toBe(2); // floor(5/2) = 2
    expect(getPlayerAcc({ str: 1, dex: 6, agi: 1, int: 1, cha: 1, luk: 1 })).toBe(3); // floor(6/2) = 3
  });

  it('DEX increases ATK by 1 per 3 DEX, and AGI increases DEF by 1 per 3 AGI', () => {
    // ATK: floor(STR / 2) + floor(DEX / 3) + gear
    expect(getPlayerAtk({ str: 1, dex: 1, agi: 1, int: 1, cha: 1, luk: 1 })).toBe(0); // 0 + 0 = 0
    expect(getPlayerAtk({ str: 1, dex: 3, agi: 1, int: 1, cha: 1, luk: 1 })).toBe(1); // 0 + 1 = 1
    expect(getPlayerAtk({ str: 3, dex: 3, agi: 1, int: 1, cha: 1, luk: 1 })).toBe(2); // 1 + 1 = 2
    expect(getPlayerAtk({ str: 3, dex: 6, agi: 1, int: 1, cha: 1, luk: 1 })).toBe(3); // 1 + 2 = 3

    // DEF: floor(STR / 5) + floor(AGI / 3) + gear
    expect(getPlayerDef({ str: 1, dex: 1, agi: 1, int: 1, cha: 1, luk: 1 })).toBe(0); // 0 + 0 = 0
    expect(getPlayerDef({ str: 5, dex: 1, agi: 1, int: 1, cha: 1, luk: 1 })).toBe(1); // 1 + 0 = 1 (1 DEF per 5 STR)
    expect(getPlayerDef({ str: 1, dex: 1, agi: 3, int: 1, cha: 1, luk: 1 })).toBe(1); // 0 + 1 = 1 (1 DEF per 3 AGI)
    expect(getPlayerDef({ str: 5, dex: 1, agi: 3, int: 1, cha: 1, luk: 1 })).toBe(2); // 1 + 1 = 2
    expect(getPlayerDef({ str: 10, dex: 1, agi: 3, int: 1, cha: 1, luk: 1 })).toBe(3); // 2 + 1 = 3
    expect(getPlayerDef({ str: 10, dex: 1, agi: 6, int: 1, cha: 1, luk: 1 })).toBe(4); // 2 + 2 = 4
  });

  it('INT increases ACT by 1 for every 5 INT starting at 3', () => {
    expect(getPlayerAct({ str: 1, dex: 1, agi: 1, int: 1, cha: 1, luk: 1 })).toBe(3); // 3 + 0 = 3
    expect(getPlayerAct({ str: 1, dex: 1, agi: 1, int: 4, cha: 1, luk: 1 })).toBe(3); // 3 + 0 = 3
    expect(getPlayerAct({ str: 1, dex: 1, agi: 1, int: 5, cha: 1, luk: 1 })).toBe(4); // 3 + 1 = 4
    expect(getPlayerAct({ str: 1, dex: 1, agi: 1, int: 9, cha: 1, luk: 1 })).toBe(4); // 3 + 1 = 4
    expect(getPlayerAct({ str: 1, dex: 1, agi: 1, int: 10, cha: 1, luk: 1 })).toBe(5); // 3 + 2 = 5
  });

  it('LUK improves critical chance threshold by 1 per 10 LUK', () => {
    // 0-9 LUK: crit threshold 12 (rolls of 12)
    expect(getPlayerCritThreshold({ str: 1, dex: 1, agi: 1, int: 1, cha: 1, luk: 1 })).toBe(12);
    expect(getPlayerCritThreshold({ str: 1, dex: 1, agi: 1, int: 1, cha: 1, luk: 9 })).toBe(12);
    // 10-19 LUK: crit threshold 11 (rolls of 11-12)
    expect(getPlayerCritThreshold({ str: 1, dex: 1, agi: 1, int: 1, cha: 1, luk: 10 })).toBe(11);
    expect(getPlayerCritThreshold({ str: 1, dex: 1, agi: 1, int: 1, cha: 1, luk: 19 })).toBe(11);
    // 20+ LUK: crit threshold 10 (rolls of 10-12)
    expect(getPlayerCritThreshold({ str: 1, dex: 1, agi: 1, int: 1, cha: 1, luk: 20 })).toBe(10);

    const prob12 = computeHitProbability(7, 12);
    expect(prob12.critPercent).toBe(2.8); // 1 in 36
    const prob11 = computeHitProbability(7, 11);
    expect(prob11.critPercent).toBe(8.3); // 3 in 36
    const prob10 = computeHitProbability(7, 10);
    expect(prob10.critPercent).toBe(16.7); // 6 in 36
  });

  it('upgrades Base DEX at Shrines using Stat Points and applies Blessing of Dexterity', () => {
    let s = start('fighter');
    s = {
      ...s,
      playerResources: { ...s.playerResources!, statPoints: 5 },
    };

    // Base DEX is 1, cost 1 -> 2 is (1+1)^2 = 4 SP
    expect(canUpgradeBaseStat(s, 'dex')).toBe(true);
    s = upgradeBaseStat(s, 'dex');
    expect(s.playerBaseStats.dex).toBe(2);
    expect(s.playerResources?.statPoints).toBe(1); // 5 - 4 = 1
    expect(getEffectiveStatsFromState(s).dex).toBe(3); // 2 base + 1 class = 3
    expect(getPlayerAcc(getEffectiveStatsFromState(s))).toBe(1); // floor(3/2) = 1

    // Altar Blessing of Dexterity
    s = {
      ...s,
      activeHook: { type: 'SHRINE', shrine: { coord: { col: 0, row: 1 }, turn: 1, prayed: false, prayOptions: [
        { id: 'blessing_dex', name: 'Blessing of Dexterity', description: '+1 DEX bonus for this map.' },
      ] } },
    };
    s = shrineChoosePrayerOption(s, 'blessing_dex');
    expect(s.playerBlessingBonuses?.dex).toBe(1);
    expect(getEffectiveStatsFromState(s).dex).toBe(4); // 2 base + 1 class + 1 blessing = 4
    expect(getPlayerAcc(getEffectiveStatsFromState(s))).toBe(2); // floor(4/2) = 2
  });

  it('player attack performs 2d6 hit check against target monster EVA and updates lastAttackRoll', () => {
    let s = start('fighter');
    const goblinCard = { ...MONSTER_TEMPLATES.goblin, id: 'test_goblin', instanceId: 'test_goblin' };
    const meleeCard = { ...COMBAT_CARD_CATALOG.melee_atk, instanceId: 'test_melee' };

    s = {
      ...s,
      activeHook: {
        type: 'COMBAT',
        combat: {
          monsters: [{ monster: goblinCard, hp: 8, block: 0, patternIndex: 0 }],
          combatTurn: 1,
          playerAp: 3,
          playerMaxAp: 3,
          playerBlock: 0,
          playerEvasionMod: 0,
          drawPile: [],
          hand: [meleeCard],
          discardPile: [],
          combatLog: [],
        },
      },
    };

    // Play card
    s = playCard(s, 'test_melee', 0);
    expect(s.activeHook.type).toBe('COMBAT');
    if (s.activeHook.type === 'COMBAT') {
      const combat = s.activeHook.combat;
      expect(combat.lastAttackRoll).toBeDefined();
      expect(combat.lastAttackRoll?.attackerName).toBe('Hero');
      expect(combat.lastAttackRoll?.targetName).toBe('Goblin');
      expect(combat.lastAttackRoll?.actionName).toBe('Melee ATK');
      expect(combat.lastAttackRoll?.die1).toBeGreaterThanOrEqual(1);
      expect(combat.lastAttackRoll?.die1).toBeLessThanOrEqual(6);
      expect(combat.lastAttackRoll?.die2).toBeGreaterThanOrEqual(1);
      expect(combat.lastAttackRoll?.die2).toBeLessThanOrEqual(6);
      // Net ACC = 2 ACC (Hero DEX 2 gives 1 ACC + Melee ATK +1 ACC) - 1 EVA (Goblin) = 1 -> Needed roll = 5 - 1 = 4
      expect(combat.lastAttackRoll?.netAcc).toBe(1);
      expect(combat.lastAttackRoll?.neededRoll).toBe(4);

      if (combat.lastAttackRoll?.isHit) {
        expect(combat.monsters[0].hp).toBeLessThan(8);
      } else {
        expect(combat.monsters[0].hp).toBe(8);
      }
    }
  });

  it('Melee ATK has inherent +1 ACC bonus and computeHitProbability calculates accurate 2d6 chances', () => {
    const melee = COMBAT_CARD_CATALOG.melee_atk;
    expect(melee.accBonus).toBe(1);

    const s = start('fighter');
    const effStats = getEffectiveStatsFromState(s);
    const eff = computeCardEffect({ ...melee, instanceId: 'm1' }, effStats);
    expect(eff.accBonus).toBe(1);

    // Standard baseline (needed roll 5): 30/36 = 83.3%
    expect(BASE_HIT_THRESHOLD).toBe(5);
    const p5 = computeHitProbability(5);
    expect(p5.hitCombos).toBe(30);
    expect(p5.hitPercent).toBe(83.3);

    // Needed roll 4: 33/36 = 91.7%
    const p4 = computeHitProbability(4);
    expect(p4.hitCombos).toBe(33);
    expect(p4.hitPercent).toBe(91.7);

    // Snake eyes (1,1) always misses even on needed 2
    const p2 = computeHitProbability(2);
    expect(p2.hitCombos).toBe(35); // 35/36 hits (only snake eyes misses)

    // Boxcars (6,6) always crits even on needed 12
    const p12 = computeHitProbability(12);
    expect(p12.hitCombos).toBe(1);
    expect(p12.hitPercent).toBe(2.8);
  });
});

describe('Charisma (CHA) price discounts and goods pricing', () => {
  it('each point of CHA reduces purchaseable goods prices by 5%', () => {
    // 0 CHA: 0% discount
    expect(calculateGoodsPrice(20, 0)).toBe(20);
    expect(calculateGoodsPrice(10, 0)).toBe(10);

    // 1 CHA: 5% discount
    expect(calculateGoodsPrice(20, 1)).toBe(19); // 20 * 0.95 = 19
    expect(calculateGoodsPrice(10, 1)).toBe(10); // 10 * 0.95 = 9.5 -> 10

    // 2 CHA: 10% discount (Wizard starting CHA)
    expect(calculateGoodsPrice(20, 2)).toBe(18); // 20 * 0.9 = 18
    expect(calculateGoodsPrice(10, 2)).toBe(9);  // 10 * 0.9 = 9
    expect(calculateGoodsPrice(8, 2)).toBe(7);   // 8 * 0.9 = 7.2 -> 7

    // 4 CHA: 20% discount
    expect(calculateGoodsPrice(20, 4)).toBe(16); // 20 * 0.8 = 16
    expect(calculateGoodsPrice(10, 4)).toBe(8);  // 10 * 0.8 = 8

    // Price never drops below 1
    expect(calculateGoodsPrice(1, 10)).toBe(1);
  });

  it('village buyItem applies CHA discount on purchases', () => {
    let s = start('wizard'); // Wizard has 2 CHA (10% discount)
    s = {
      ...s,
      playerResources: { ...s.playerResources!, gold: 20 },
      activeHook: {
        type: 'VILLAGE',
        village: { coord: { col: 0, row: 1 }, turn: 1, subView: 'shop', trainOptions: [], shopStock: [], actionTaken: false },
      },
    };

    if (s.activeHook.type !== 'VILLAGE') throw new Error('expected village');
    s.activeHook.village.shopStock = [{ ...SHOP_ITEM_CATALOG.find(item => item.id === 'lvl1_iron_sword')!, instanceId: 'stock_sword' }];
    // Iron Sword has base buyPrice: 10. With 2 CHA (10% off), cost is 9 gold.
    s = buyItem(s, 'lvl1_iron_sword');
    expect(s.playerResources?.gold).toBe(11); // 20 - 9 = 11
    expect(s.equippedGear.weapon?.id).toBe('lvl1_iron_sword');
  });
});

describe('Game start preparation dialog and 4 starting Stat Points', () => {
  it('players start with 4 stat points and can upgrade base stats via welcomeUpgradeStat', () => {
    const s = start('fighter');
    expect(s.playerResources?.statPoints).toBe(4);
    expect(s.welcomePreparing).toBe(true);
    expect(s.playerBaseStats.str).toBe(1);
    expect(s.playerResources?.maxHp).toBe(16);

    // Upgrade STR right away in preparation: Base 1 -> 2 costs (1+1)^2 = 4 SP
    const upgraded = welcomeUpgradeStat(s, 'str');
    expect(upgraded.playerBaseStats.str).toBe(2);
    expect(upgraded.playerResources?.statPoints).toBe(0); // 4 - 4 = 0
    expect(upgraded.playerResources?.maxHp).toBe(18);
    expect(upgraded.playerResources?.hp).toBe(18);

    // Dismiss preparation dialog to begin journey
    const ready = dismissWelcomePrepare(upgraded);
    expect(ready.welcomePreparing).toBe(false);

    // Once dismissed, welcomeUpgradeStat is blocked
    const blocked = welcomeUpgradeStat(ready, 'str');
    expect(blocked).toBe(ready);
  });
});

describe('Starting 20 Gold, New Shop Items, and DEF/MATK/MDEF Combat Stats', () => {
  it('players start with 20 Gold on adventure start', () => {
    const fighter = start('fighter');
    expect(fighter.playerResources?.gold).toBe(20);

    const wizard = start('wizard');
    expect(wizard.playerResources?.gold).toBe(20);
  });

  it('shop catalog contains all 21 items with clean names, correct levels, prices, and bonuses', () => {
    expect(SHOP_ITEM_CATALOG).toHaveLength(21);
    expect(SHOP_ITEM_CATALOG.every((i) => !i.name.startsWith('LVL'))).toBe(true);
    const ids = SHOP_ITEM_CATALOG.map((i) => i.id);
    expect(ids).toEqual([
      'lvl1_health_potion',
      'lvl1_iron_sword',
      'lvl1_apprentice_staff',
      'lvl1_robe',
      'lvl1_leather_gear',
      'lvl1_chainmail',
      'lvl2_spellbinder',
      'lvl2_beast_ring',
      'lvl2_hermes_gear',
      'lvl2_goldstar',
      'lvl2_iron_sword_plus',
      'lvl2_chainmail_plus',
      'lvl2_robe_plus',
      'lvl2_apprentice_staff_plus',
      'lvl2_leather_gear_plus',
      'lvl2_health_potion_plus',
      'lvl3_health_potion_plus_plus',
      'lvl4_health_potion_plus_plus_plus',
      'lvl1_dagger',
      'lvl2_dagger_plus',
      'lvl2_focus_ring',
    ]);

    const potion = SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl1_health_potion')!;
    expect(potion.buyPrice).toBe(6);
    expect(potion.healAmount).toBe(10);

    const sword = SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl1_iron_sword')!;
    expect(sword.buyPrice).toBe(10);
    expect(sword.gearBonus?.atk).toBe(1);

    const swordPlus = SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl2_iron_sword_plus')!;
    expect(swordPlus.buyPrice).toBe(30);
    expect(swordPlus.gearBonus?.atk).toBe(2);
    expect(swordPlus.gearBonus?.acc).toBe(1);

    const staff = SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl1_apprentice_staff')!;
    expect(staff.buyPrice).toBe(15);
    expect(staff.gearBonus?.matk).toBe(1);
    expect(staff.gearBonus?.mdef).toBeUndefined();

    const staffPlus = SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl2_apprentice_staff_plus')!;
    expect(staffPlus.buyPrice).toBe(45);
    expect(staffPlus.gearBonus?.matk).toBe(2);
    expect(staffPlus.gearBonus?.atk).toBe(1);

    const robe = SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl1_robe')!;
    expect(robe.buyPrice).toBe(15);
    expect(robe.gearBonus?.mdef).toBe(1);

    const robePlus = SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl2_robe_plus')!;
    expect(robePlus.buyPrice).toBe(45);
    expect(robePlus.gearBonus?.mdef).toBe(2);
    expect(robePlus.gearBonus?.def).toBe(1);

    const chainmail = SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl1_chainmail')!;
    expect(chainmail.buyPrice).toBe(15);
    expect(chainmail.gearBonus?.def).toBe(1);

    const chainmailPlus = SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl2_chainmail_plus')!;
    expect(chainmailPlus.buyPrice).toBe(45);
    expect(chainmailPlus.gearBonus?.def).toBe(2);
    expect(chainmailPlus.gearBonus?.eva).toBe(1);

    const leather = SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl1_leather_gear')!;
    const leatherPlus = SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl2_leather_gear_plus')!;
    expect(leather.name).toBe('Leather Gear');
    expect(leatherPlus.gearBonus).toMatchObject({ eva: 2, def: 1 });

    const consumables = SHOP_ITEM_CATALOG.filter((i) => i.category === 'consumable');
    expect(consumables.map((i) => [i.name, i.level, i.healAmount, i.buyPrice])).toEqual([
      ['Health Potion', 1, 10, 6],
      ['Health Potion +', 2, 18, 14],
      ['Health Potion ++', 3, 24, 24],
      ['Health Potion +++', 4, 28, 36],
    ]);

    const dagger = SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl1_dagger')!;
    const daggerPlus = SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl2_dagger_plus')!;
    expect(dagger).toMatchObject({ buyPrice: 10, level: 1, gearBonus: { pen: 1 } });
    expect(daggerPlus).toMatchObject({ buyPrice: 30, level: 2, gearBonus: { pen: 2, atk: 1 } });

    expect(SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl2_spellbinder')).toMatchObject({ name: 'Spellbinder', level: 2, buyPrice: 20, statBonus: { int: 1 } });
    expect(SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl2_beast_ring')).toMatchObject({ name: 'Beast Ring', level: 2, buyPrice: 20, statBonus: { str: 1 } });
    expect(SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl2_goldstar')).toMatchObject({ name: 'Goldstar', level: 2, buyPrice: 20, luckyCharmGoldBonus: true });
    expect(SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl2_hermes_gear')).toMatchObject({ name: 'Hermes Gear', level: 2, buyPrice: 20, statBonus: { agi: 1 } });
    expect(SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl2_focus_ring')).toMatchObject({ level: 2, buyPrice: 20, statBonus: { dex: 1 } });
  });

  it('Hero DEF increases by 1 for every 5 STR, by 1 for every 3 AGI, and from gear, reducing physical damage intake', () => {
    let s = start('fighter', 'seed-combat'); // Base STR 1 + Class STR 2 = STR 3 -> floor(3/5) = 0 DEF
    const eff = getEffectiveStatsFromState(s);
    expect(getPlayerDef(eff)).toBe(0);

    // Increase STR to 5 (Base STR 3 + Class STR 2 = STR 5 -> floor(5/5) = 1 DEF)
    s = {
      ...s,
      playerBaseStats: {
        ...s.playerBaseStats,
        str: 3,
      },
    };
    const eff5Str = getEffectiveStatsFromState(s);
    expect(getPlayerDef(eff5Str)).toBe(1);

    // Equip LVL 1 Chainmail (+1 DEF)
    s = {
      ...s,
      equippedGear: {
        ...s.equippedGear,
        armor: {
          id: 'lvl1_chainmail',
          instanceId: 'inst_chain',
          name: 'Chainmail',
          description: '+1 DEF',
          category: 'armor',
          buyPrice: 15,
          sellPrice: 7,
          gearBonus: { def: 1 },
        },
      },
    };

    const gearBonus = computeCombatGearBonuses(s.equippedGear);
    expect(gearBonus.def).toBe(1);
    expect(getPlayerDef(eff5Str, gearBonus.def)).toBe(2); // 1 from STR + 1 from Chainmail = 2 DEF

    // Set up a combat round where a monster attacks with 4 DMG
    s = {
      ...s,
      activeHook: {
        type: 'COMBAT',
        combat: {
          monsters: [
            {
              monster: {
                id: 'm1',
                templateId: 'goblin',
                name: 'Goblin',
                level: 1,
                maxHp: 10,
                acc: 20, // Guarantee 100% hit
                eva: 0,
                statPointReward: 1,
                goldReward: 3,
                abilities: [],
                pattern: [{ label: 'Club Strike', damage: 4, block: 0 }],
              },
              hp: 10,
              block: 0,
              patternIndex: 0,
            },
          ],
          combatTurn: 1,
          playerAp: 0,
          playerMaxAp: 3,
          playerBlock: 0,
          playerEvasionMod: 0,
          drawPile: [],
          hand: [],
          discardPile: [],
          combatLog: [],
        },
      },
    };

    const initialHp = s.playerResources!.hp;
    const after = endTurn(s);
    // 4 base damage reduced by 2 DEF -> 2 HP damage taken
    expect(after.playerResources?.hp).toBe(initialHp - 2);
  });

  it('Hero MDEF increases by 1 for every 5 INT and from gear', () => {
    expect(getPlayerMdef({ str: 1, dex: 1, agi: 1, int: 1, cha: 1, luk: 1 })).toBe(0);
    expect(getPlayerMdef({ str: 1, dex: 1, agi: 1, int: 4, cha: 1, luk: 1 })).toBe(0);
    expect(getPlayerMdef({ str: 1, dex: 1, agi: 1, int: 5, cha: 1, luk: 1 })).toBe(1);
    expect(getPlayerMdef({ str: 1, dex: 1, agi: 1, int: 9, cha: 1, luk: 1 })).toBe(1);
    expect(getPlayerMdef({ str: 1, dex: 1, agi: 1, int: 10, cha: 1, luk: 1 })).toBe(2);
    expect(getPlayerMdef({ str: 1, dex: 1, agi: 1, int: 5, cha: 1, luk: 1 }, 2)).toBe(3); // +2 gear
  });

  it('Goldstar grants an additional (1d6 - 1) Gold upon winning battle', () => {
    let s = start('fighter', 'seed-combat');
    s = {
      ...s,
      playerResources: { ...s.playerResources!, gold: 10 },
      equippedGear: {
        ...s.equippedGear,
        accessory: {
          id: 'lvl2_goldstar',
          instanceId: 'inst_charm',
          name: 'Goldstar',
          description: 'Bonus gold',
          category: 'accessory',
          buyPrice: 20,
          sellPrice: 10,
          luckyCharmGoldBonus: true,
        },
      },
      activeHook: {
        type: 'COMBAT',
        combat: {
          monsters: [
            {
              monster: {
                id: 'm1',
                templateId: 'goblin',
                name: 'Goblin',
                level: 1,
                maxHp: 1,
                acc: 1,
                eva: 0,
                statPointReward: 2,
                goldReward: 5,
                abilities: [],
                pattern: [{ label: 'Attack', damage: 1, block: 0 }],
              },
              hp: 1,
              block: 0,
              patternIndex: 0,
            },
          ],
          combatTurn: 1,
          playerAp: 1,
          playerMaxAp: 3,
          playerBlock: 0,
          playerEvasionMod: 0,
          drawPile: [],
          hand: [
            {
              id: 'melee_atk',
              instanceId: 'card_win',
              name: 'Melee ATK',
              classId: 'fighter',
              cardType: 'attack',
              apCost: 1,
              baseDamage: 5,
              baseBlock: 0,
              accBonus: 10,
              cardNumber: 'GRS · #012/021',
            },
          ],
          discardPile: [],
          combatLog: [],
        },
      },
    };

    // Play card to defeat goblin
    const victory = playCard(s, 'card_win', 0);
    // Base gold reward is 5 + floor(LUK 1 / 2) = 0 -> 5 gold.
    // Lucky charm adds (1d6 - 1) which is between 0 and 5.
    // Total gold should be 10 + 5 + luckyBonus >= 15 and <= 20.
    const gold = victory.playerResources?.gold ?? 0;
    expect(gold).toBeGreaterThanOrEqual(15);
    expect(gold).toBeLessThanOrEqual(20);
    expect(victory.bannerMessage).toContain('Goldstar');
  });

  it('monster with empty pattern skips its turn like a rock and logs did nothing', () => {
    let s = start('fighter');
    s = {
      ...s,
      activeHook: {
        type: 'COMBAT',
        combat: {
          monsters: [
            {
              monster: {
                id: 'rock_1',
                templateId: 'goblin',
                name: 'Pet Rock',
                level: 1,
                maxHp: 10,
                acc: 2,
                eva: 0,
                statPointReward: 1,
                goldReward: 2,
                abilities: [],
                pattern: [], // Empty pattern
              },
              hp: 10,
              block: 0,
              patternIndex: 0,
            },
          ],
          combatTurn: 1,
          playerAp: 0,
          playerMaxAp: 3,
          playerBlock: 0,
          playerEvasionMod: 0,
          drawPile: [],
          hand: [],
          discardPile: [],
          combatLog: [],
        },
      },
    };

    const initialHp = s.playerResources!.hp;
    const after = endTurn(s);
    // Player took 0 damage
    expect(after.playerResources?.hp).toBe(initialHp);
    if (after.activeHook.type === 'COMBAT') {
      const log = after.activeHook.combat.combatLog;
      expect(log.some((entry) => entry.includes('Pet Rock did nothing.'))).toBe(true);
    }
  });

  it('allows equipping and unequipping items outside combat, moving items to/from backpack and syncing vitals', () => {
    let s = start('fighter');
    // Give player an iron sword equipped and a ring in backpack
    const sword = { ...SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl1_iron_sword')!, instanceId: 'test_sword' };
    const ring = { ...SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl2_beast_ring')!, instanceId: 'test_ring' };

    s = {
      ...s,
      equippedGear: { weapon: sword, armor: null, accessory: null },
      backpack: [ring],
    };

    expect(s.equippedGear.weapon?.name).toBe('Iron Sword');
    expect(s.backpack).toHaveLength(1);
    expect(s.backpack[0].name).toBe('Beast Ring');

    // Unequip weapon by slot key 'weapon'
    s = unequipItem(s, 'weapon');
    expect(s.equippedGear.weapon).toBeNull();
    expect(s.backpack).toHaveLength(2);
    expect(s.backpack.some((i) => i.instanceId === 'test_sword')).toBe(true);

    // Equip ring from backpack
    s = equipItem(s, 'test_ring');
    expect(s.equippedGear.accessory?.name).toBe('Beast Ring');
    expect(s.backpack).toHaveLength(1);
    // Ring gives +1 STR, which increases Max HP (STR 3 -> 4, Max HP 16 -> 18)
    expect(s.playerResources?.maxHp).toBe(18);

    // Unequip accessory by instanceId
    s = unequipItem(s, 'test_ring');
    expect(s.equippedGear.accessory).toBeNull();
    expect(s.backpack).toHaveLength(2);
    // Max HP drops back to 16
    expect(s.playerResources?.maxHp).toBe(16);
  });

  it('prevents equipping and unequipping during combat', () => {
    let s = start('fighter');
    const sword = { ...SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl1_iron_sword')!, instanceId: 'test_sword' };
    const ring = { ...SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl2_beast_ring')!, instanceId: 'test_ring' };

    s = {
      ...s,
      equippedGear: { weapon: sword, armor: null, accessory: null },
      backpack: [ring],
      activeHook: {
        type: 'COMBAT',
        combat: {
          monsters: [],
          combatTurn: 1,
          playerAp: 3,
          playerMaxAp: 3,
          playerBlock: 0,
          playerEvasionMod: 0,
          drawPile: [],
          hand: [],
          discardPile: [],
          combatLog: [],
        },
      },
    };

    // Unequipping during combat is rejected
    const afterUnequip = unequipItem(s, 'weapon');
    expect(afterUnequip.equippedGear.weapon).not.toBeNull();
    expect(afterUnequip.backpack).toHaveLength(1);

    // Equipping during combat is rejected
    const afterEquip = equipItem(s, 'test_ring');
    expect(afterEquip.equippedGear.accessory).toBeNull();
    expect(afterEquip.backpack).toHaveLength(1);
  });
});

describe('Hero Passives, Rogue Class, and Level 2 Equipment', () => {
  it('Rogue class initializes with Primary AGI (+2), Secondary DEX (+1), STR (+1), 14 Max HP, and starter deck', () => {
    const s = start('rogue');
    expect(s.playerClass).toBe('rogue');
    const eff = getEffectiveStatsFromState(s);
    expect(eff.str).toBe(2);
    expect(eff.dex).toBe(2);
    expect(eff.agi).toBe(3);
    expect(eff.int).toBe(1);
    expect(eff.cha).toBe(1);
    expect(eff.luk).toBe(1);
    expect(s.playerResources?.maxHp).toBe(14); // 10 + 2*2 = 14
    expect(s.playerResources?.hp).toBe(14);
    expect(s.playerMasterDeck).toHaveLength(10);
    const meleeCount = s.playerMasterDeck.filter((c) => c.id === 'melee_atk').length;
    const shieldCount = s.playerMasterDeck.filter((c) => c.id === 'shield_def').length;
    expect(meleeCount).toBe(8);
    expect(shieldCount).toBe(2);
  });

  it('Fighter [Berzerk] grants +1 ATK when HP <= 50% maxHp and +2 ATK when HP <= 25% maxHp', () => {
    const maxHp = 16;
    expect(getFighterBerzerkBonus('fighter', 16, maxHp)).toBe(0);
    expect(getFighterBerzerkBonus('fighter', 9, maxHp)).toBe(0);
    expect(getFighterBerzerkBonus('fighter', 8, maxHp)).toBe(1); // 50%
    expect(getFighterBerzerkBonus('fighter', 5, maxHp)).toBe(1);
    expect(getFighterBerzerkBonus('fighter', 4, maxHp)).toBe(2); // 25%
    expect(getFighterBerzerkBonus('fighter', 1, maxHp)).toBe(2);

    // Wizard and Rogue do not receive berzerk bonus
    expect(getFighterBerzerkBonus('wizard', 4, maxHp)).toBe(0);
    expect(getFighterBerzerkBonus('rogue', 4, maxHp)).toBe(0);
  });

  it('Wizard [Conserve] carries over leftover AP to the next combat turn', () => {
    let s = start('wizard');
    s = {
      ...s,
      activeHook: {
        type: 'COMBAT',
        combat: {
          monsters: [
            {
              monster: {
                id: 'm1',
                templateId: 'pink_slime',
                name: 'Blob',
                level: 1,
                maxHp: 20,
                def: 0,
                acc: 1,
                eva: 0,
                statPointReward: 1,
                goldReward: 3,
                abilities: [],
                pattern: [{ label: 'Idle', damage: 0, block: 0 }],
              },
              hp: 20,
              block: 0,
              patternIndex: 0,
            },
          ],
          combatTurn: 1,
          playerAp: 2, // 2 unused AP left
          playerMaxAp: 3,
          playerBlock: 0,
          playerEvasionMod: 0,
          drawPile: [],
          hand: [],
          discardPile: [],
          combatLog: [],
        },
      },
    };

    const nextTurnState = endTurn(s);
    if (nextTurnState.activeHook.type !== 'COMBAT') throw new Error('expected combat');
    // Conserve carries over 2 AP: 3 + 2 = 5 AP
    expect(nextTurnState.activeHook.combat.playerAp).toBe(5);
    expect(nextTurnState.activeHook.combat.combatLog.some((l) => l.includes('[Conserve]'))).toBe(true);
  });

  it('Rogue [Steal] awards +1 Gold immediately when rolling pairs on an attack hit check', () => {
    let s = start('rogue');
    s = {
      ...s,
      playerResources: { ...s.playerResources!, gold: 10 },
      activeHook: {
        type: 'COMBAT',
        combat: {
          monsters: [
            {
              monster: {
                id: 'm1',
                templateId: 'goblin',
                name: 'Goblin',
                level: 1,
                maxHp: 20,
                def: 0,
                acc: 1,
                eva: 0,
                statPointReward: 1,
                goldReward: 4,
                abilities: [],
                pattern: [{ label: 'Idle', damage: 0, block: 0 }],
              },
              hp: 20,
              block: 0,
              patternIndex: 0,
            },
          ],
          combatTurn: 1,
          playerAp: 3,
          playerMaxAp: 3,
          playerBlock: 0,
          playerEvasionMod: 0,
          drawPile: [],
          hand: [
            {
              id: 'melee_atk',
              instanceId: 'card_steal_test',
              name: 'Melee ATK',
              classId: 'rogue',
              cardType: 'attack',
              apCost: 1,
              baseDamage: 2,
              baseBlock: 0,
              accBonus: 1,
              cardNumber: 'ROG · #001',
            },
          ],
          discardPile: [],
          combatLog: [],
        },
      },
    };

    // Find an rng seed where roll2D6 produces a pair (die1 === die2)
    let pairRng = 1;
    for (let testRng = 1; testRng < 500; testRng++) {
      const roll = roll2D6(testRng);
      if (roll.die1 === roll.die2) {
        pairRng = testRng;
        break;
      }
    }
    s = { ...s, rngState: pairRng };

    const played = playCard(s, 'card_steal_test', 0);
    // Gold increased from 10 to 11 due to [Steal]
    expect(played.playerResources?.gold).toBe(11);
    if (played.activeHook.type === 'COMBAT') {
      expect(played.activeHook.combat.combatLog.some((l) => l.includes('[Steal]'))).toBe(true);
    }
  });

  it('Level 2 equipment items grant correct stats and pricing', () => {
    const swordPlus = SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl2_iron_sword_plus')!;
    expect(swordPlus.buyPrice).toBe(30);
    expect(swordPlus.sellPrice).toBe(15);
    expect(swordPlus.gearBonus?.atk).toBe(2);
    expect(swordPlus.gearBonus?.acc).toBe(1);

    const chainPlus = SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl2_chainmail_plus')!;
    expect(chainPlus.buyPrice).toBe(45);
    expect(chainPlus.sellPrice).toBe(22);
    expect(chainPlus.gearBonus?.def).toBe(2);
    expect(chainPlus.gearBonus?.eva).toBe(1);

    const robePlus = SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl2_robe_plus')!;
    expect(robePlus.buyPrice).toBe(45);
    expect(robePlus.sellPrice).toBe(22);
    expect(robePlus.gearBonus?.mdef).toBe(2);
    expect(robePlus.gearBonus?.def).toBe(1);

    const staffPlus = SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl2_apprentice_staff_plus')!;
    expect(staffPlus.buyPrice).toBe(45);
    expect(staffPlus.sellPrice).toBe(22);
    expect(staffPlus.gearBonus?.matk).toBe(2);
    expect(staffPlus.gearBonus?.atk).toBe(1);

    const combatGear = computeCombatGearBonuses({
      weapon: { ...swordPlus, instanceId: 'iron-sword-plus-test' },
      armor: { ...chainPlus, instanceId: 'chainmail-plus-test' },
      accessory: null,
    });
    expect(combatGear).toMatchObject({ acc: 1, atk: 2, def: 2, eva: 1 });
    expect(getPlayerAcc(getEffectiveStatsFromState(start('fighter')), combatGear.acc)).toBe(2);
  });

  it('Dagger PEN bypasses natural monster DEF for physical attacks before Block', () => {
    const daggerPlus = { ...SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl2_dagger_plus')!, instanceId: 'dagger-plus-test' };
    const melee = { ...COMBAT_CARD_CATALOG.melee_atk, instanceId: 'penetrating-melee' };
    const seed = Array.from({ length: 1000 }, (_, i) => i + 1).find((candidate) => {
      const roll = evaluateAttackRoll(candidate, 20, 0, 12);
      return roll.isHit && !roll.isCrit;
    })!;
    let state = startAdventure('fighter', 'penetration-test');
    state = {
      ...state,
      rngState: seed,
      equippedGear: { weapon: daggerPlus, armor: null, accessory: null },
      activeHook: {
        type: 'COMBAT',
        combat: {
          monsters: [{ monster: { ...MONSTER_TEMPLATES.goblin, id: 'armored-goblin', def: 2, maxHp: 5 }, hp: 5, block: 1, patternIndex: 0 }],
          combatTurn: 1,
          playerAp: 3,
          playerMaxAp: 3,
          playerBlock: 0,
          playerEvasionMod: 0,
          drawPile: [],
          hand: [melee],
          discardPile: [],
          combatLog: [],
        },
      },
    };

    const next = playCard(state, melee.instanceId, 0);
    if (next.activeHook.type !== 'COMBAT') throw new Error('Expected battle to continue');
    const roll = next.activeHook.combat.lastAttackRoll!;
    expect(roll).toMatchObject({ damagePenetrated: 2, damageDefReduced: 0, damageBlocked: 1, damageDealt: 3 });
    expect(next.activeHook.combat.monsters[0].hp).toBe(2);
    expect(next.activeHook.combat.combatLog.join(' ')).toContain('2 Goblin DEF bypassed by PEN');
  });

  it('monster attack with Hero DEF states "absorbed by Hero DEF" in combat log', () => {
    // Fighter has 3 STR -> floor(3/2) = 1 DEF; plus 1 DEF from Rogue secondary or chainmail -> let's test hero with DEF
    let s = startAdventure('fighter', 'seed-def-log');
    s = { ...s, rngState: 123 };
    s = {
      ...s,
      equippedGear: {
        ...s.equippedGear,
        armor: { ...SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl1_chainmail')!, instanceId: 'chain_01' },
      },
      activeHook: {
        type: 'COMBAT',
        combat: {
          combatTurn: 1,
          monsters: [
            {
              monster: { ...MONSTER_TEMPLATES['bullwark'], id: 'bull_def_test' },
              hp: 20,
              block: 0,
              patternIndex: 1, // Heavy Charge 6 DMG
            },
          ],
          playerAp: 0,
          playerMaxAp: 3,
          playerBlock: 0,
          playerEvasionMod: 0,
          drawPile: [],
          hand: [],
          discardPile: [],
          combatLog: [],
        },
      },
    };

    const next = endTurn(s);
    if (next.activeHook.type === 'COMBAT') {
      const log = next.activeHook.combat.combatLog;
      expect(log.some((l) => l.includes('absorbed by Hero DEF'))).toBe(true);
    }
  });

  it('useConsumable in active combat restores HP and records timestamped log in combatLog', () => {
    let s = startAdventure('fighter', 'seed-potion-combat');
    const potion = { ...SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl1_health_potion')!, instanceId: 'potion_in_combat' };
    s = {
      ...s,
      backpack: [potion],
      playerResources: { ...s.playerResources!, hp: 5, maxHp: 16 },
      activeHook: {
        type: 'COMBAT',
        combat: {
          combatTurn: 1,
          monsters: [
            {
              monster: { ...MONSTER_TEMPLATES['wild_dog'], id: 'dog_potion_test' },
              hp: 7,
              block: 0,
              patternIndex: 0,
            },
          ],
          playerAp: 3,
          playerMaxAp: 3,
          playerBlock: 0,
          playerEvasionMod: 0,
          drawPile: [],
          hand: [],
          discardPile: [],
          combatLog: [],
        },
      },
    };

    const healedState = useConsumable(s, 'potion_in_combat');
    expect(healedState.playerResources!.hp).toBe(15);
    expect(healedState.backpack.length).toBe(0);
    if (healedState.activeHook.type === 'COMBAT') {
      const log = healedState.activeHook.combat.combatLog;
      expect(log.some((l) => l.includes('Used Health Potion: restored +10 HP'))).toBe(true);
    }
  });

  describe('Stage 2: Cult of Trolls & Boss Encounter', () => {
    it('Stage 2 adventure deck composition: exactly 30 cards matching STAGE_2_DECK_COMPOSITION', () => {
      const { deck } = buildStage2AdventureDeck(12345);
      expect(deck.length).toBe(30);

      const counts: Record<string, number> = {};
      for (const c of deck) {
        const code = c.cardNumber ?? '';
        counts[code] = (counts[code] ?? 0) + 1;
      }

      expect(counts['advgrs-00'] ?? 0).toBe(0);
      expect(counts['advgrs-01']).toBe(2);
      expect(counts['advgrs-03'] ?? 0).toBe(0);
      expect(counts['advgrs-04'] ?? 0).toBe(0);
      expect(counts['advfrs-00']).toBe(2);
      expect(counts['advfrs-01']).toBe(9);
      expect(counts['advfrs-03']).toBe(3);
      expect(counts['advfrs-04']).toBe(3);
      expect(counts['advsmp-00']).toBe(1);
      expect(counts['advsmp-01']).toBe(6);
      expect(counts['advsmp-03']).toBe(2);
      expect(counts['advsmp-04']).toBe(2);
    });

    it('startNextMission transitions to Mission 2 ("Cult of Trolls")', () => {
      let s = start('fighter', 'mission-trans-seed');
      s = { ...s, turn: 15, currentMission: 1, playerResources: { ...s.playerResources!, hp: 4 } };
      const nextState = startNextMission(s);

      expect(nextState.currentMission).toBe(2);
      expect(nextState.missionName).toBe(STAGE_2_MISSION_NAME);
      expect(nextState.turn).toBe(0);
      expect(nextState.maxTurns).toBe(15);
      expect(nextState.playerResources!.hp).toBe(nextState.playerResources!.maxHp);
      expect(nextState.activeHook.type).toBe('NONE');
      expect(Object.keys(nextState.board).length).toBe(6); // 1 start + 2 available + 3 lookahead
      expect(nextState.playerPosition).toEqual({ col: 0, row: 0 });
      expect(nextState.adventureDeck.length).toBe(25); // 30 - 5 = 25
      expect(nextState.bannerMessage).toContain('Cult of Trolls');
    });

    it('createBossMonstersForMission(2) returns the 3 Boss Trolls', () => {
      const bosses = createBossMonstersForMission(2);
      expect(bosses.length).toBe(3);
      expect(bosses[0].templateId).toBe('troll_healer');
      expect(bosses[0].name).toBe('Troll Healer');
      expect(bosses[0].isBoss).toBe(true);

      expect(bosses[1].templateId).toBe('troll_hexer');
      expect(bosses[1].name).toBe('Troll Hexer');
      expect(bosses[1].isBoss).toBe(true);

      expect(bosses[2].templateId).toBe('troll_brute');
      expect(bosses[2].name).toBe('Troll Warrior');
      expect(bosses[2].isBoss).toBe(true);
    });

    it('Troll Healer casts Troll Mending healing damaged troll for 10 HP', () => {
      let s = start('fighter', 'troll-healer-seed');
      const bosses = createBossMonstersForMission(2);
      s = {
        ...s,
        activeHook: {
          type: 'COMBAT',
          combat: {
            combatTurn: 1,
            monsters: [
              { monster: bosses[0], hp: 20, block: 0, patternIndex: 0 },
              { monster: bosses[1], hp: 20, block: 0, patternIndex: 0 },
              { monster: bosses[2], hp: 10, block: 0, patternIndex: 0 }, // Troll Warrior damaged: 10/24 HP
            ],
            playerAp: 0,
            playerMaxAp: 3,
            playerBlock: 0,
            playerEvasionMod: 0,
            drawPile: [],
            hand: [],
            discardPile: [],
            combatLog: [],
          },
        },
      };

      const afterMonsterTurn = endTurn(s);
      if (afterMonsterTurn.activeHook.type === 'COMBAT') {
        const warrior = afterMonsterTurn.activeHook.combat.monsters[2];
        // Warrior should be healed by 10 HP: from 10 to 20
        expect(warrior.hp).toBe(20);
        const log = afterMonsterTurn.activeHook.combat.combatLog;
        expect(log.some((l) => l.includes('Troll Healer casts Troll Mending: restored +10 HP to Troll Warrior'))).toBe(true);
      }
    });

    it('Troll Hexer applies debuffs to next combat turn', () => {
      let s = start('fighter', 'troll-hexer-seed');
      const bosses = createBossMonstersForMission(2);
      s = {
        ...s,
        activeHook: {
          type: 'COMBAT',
          combat: {
            combatTurn: 1,
            monsters: [
              { monster: bosses[1], hp: 20, block: 0, patternIndex: 0 }, // Hexer alone
            ],
            playerAp: 0,
            playerMaxAp: 3,
            playerBlock: 0,
            playerEvasionMod: 0,
            drawPile: [],
            hand: [],
            discardPile: [],
            combatLog: [],
          },
        },
      };

      const afterMonsterTurn = endTurn(s);
      if (afterMonsterTurn.activeHook.type === 'COMBAT') {
        const c = afterMonsterTurn.activeHook.combat;
        const hasDebuff =
          (c.playerAccMod ?? 0) === -1 ||
          (c.playerVulnerableMod ?? 0) === 1 ||
          (c.playerEvasionMod ?? 0) === -1;
        expect(hasDebuff).toBe(true);
      }
    });
  });

  describe('undiscovered terrains exploration mechanic', () => {
    it('advgrs-00, advfrs-00, advsmp-00 are flagged as undiscovered with correct names', () => {
      const s = start('fighter', 'undiscovered-names');
      const all = [...s.adventureDeck, ...Object.values(s.board).map((n) => n.card)];
      const grs0 = all.find((c) => c.cardNumber === 'advgrs-00');
      const frs0 = all.find((c) => c.cardNumber === 'advfrs-00');
      const smp0 = all.find((c) => c.cardNumber === 'advsmp-00');

      expect(grs0?.name).toBe('Undiscovered Grassland');
      expect(grs0?.isUndiscovered).toBe(true);
      expect(grs0?.level).toBe(1);

      expect(frs0?.name).toBe('Undiscovered Forest');
      expect(frs0?.isUndiscovered).toBe(true);
      expect(frs0?.level).toBe(2);

      expect(smp0?.name).toBe('Undiscovered Swamp');
      expect(smp0?.isUndiscovered).toBe(true);
      expect(smp0?.level).toBe(3);
    });

    it('stepping on undiscovered terrain triggers EXPLORATION hook with combat when roll <= card level', () => {
      let s = start('fighter', 'test-combat-roll');
      s = dismissWelcomePrepare(s);
      const avail = getAvailableCoords(s)[0];
      const card = {
        id: 'advgrs-00',
        instanceId: 'test-undisc-1',
        name: 'Undiscovered Grassland',
        terrain: 'grasslands' as const,
        level: 1,
        hasHostile: false,
        hasVillage: false,
        hasShrine: false,
        revealed: true,
        cardNumber: 'advgrs-00',
        isUndiscovered: true,
      };
      s = {
        ...s,
        board: {
          ...s.board,
          [`${avail.col},${avail.row}`]: {
            coord: avail,
            card,
            status: 'available',
            turnPlaced: 1,
          },
        },
      };

      let combatTriggered = false;
      for (let seed = 1; seed <= 50; seed++) {
        let testState: RunState = {
          ...s,
          rngState: seed * 12345,
          activeHook: { type: 'NONE' },
        };
        testState = chooseCard(testState, avail);
        if (testState.activeHook.type === 'EXPLORATION' && testState.activeHook.exploration.outcome === 'combat') {
          combatTriggered = true;
          expect(testState.activeHook.exploration.roll).toBeLessThanOrEqual(1);
          // Confirm combat starts battle
          const battleState = confirmExplorationCombat(testState);
          expect(battleState.activeHook.type).toBe('COMBAT');
          break;
        }
      }
      expect(combatTriggered).toBe(true);
    });

    it('stepping on undiscovered terrain triggers treasure when roll == 6, discarding over-level cards and adding item to backpack', () => {
      let s = start('fighter', 'test-treasure-roll');
      s = dismissWelcomePrepare(s);
      const avail = getAvailableCoords(s)[0];
      const card = {
        id: 'advgrs-00',
        instanceId: 'test-undisc-grs',
        name: 'Undiscovered Grassland',
        terrain: 'grasslands' as const,
        level: 1,
        hasHostile: false,
        hasVillage: false,
        hasShrine: false,
        revealed: true,
        cardNumber: 'advgrs-00',
        isUndiscovered: true,
      };
      s = {
        ...s,
        board: {
          ...s.board,
          [`${avail.col},${avail.row}`]: {
            coord: avail,
            card,
            status: 'available',
            turnPlaced: 1,
          },
        },
      };

      let treasureFound = false;
      for (let seed = 1; seed <= 50; seed++) {
        let testState: RunState = {
          ...s,
          rngState: seed * 54321,
          backpack: [],
          activeHook: { type: 'NONE' },
        };
        testState = chooseCard(testState, avail);
        if (testState.activeHook.type === 'EXPLORATION' && testState.activeHook.exploration.outcome === 'treasure') {
          treasureFound = true;
          expect(testState.activeHook.exploration.roll).toBe(6);
          const item = testState.activeHook.exploration.foundItem;
          expect(item).toBeDefined();
          expect((item?.level ?? 1)).toBeLessThanOrEqual(1);
          expect(testState.backpack.some((b) => b.instanceId === item?.instanceId)).toBe(true);

          // Confirm safe clears hook
          const safeState = confirmExplorationSafe(testState);
          expect(safeState.activeHook.type).toBe('NONE');
          break;
        }
      }
      expect(treasureFound).toBe(true);
    });

    it('stepping on undiscovered terrain grants safe passage when roll is between card level + 1 and 5', () => {
      let s = start('fighter', 'test-safe-roll');
      s = dismissWelcomePrepare(s);
      const avail = getAvailableCoords(s)[0];
      const card = {
        id: 'advgrs-00',
        instanceId: 'test-undisc-safe',
        name: 'Undiscovered Grassland',
        terrain: 'grasslands' as const,
        level: 1,
        hasHostile: false,
        hasVillage: false,
        hasShrine: false,
        revealed: true,
        cardNumber: 'advgrs-00',
        isUndiscovered: true,
      };
      s = {
        ...s,
        board: {
          ...s.board,
          [`${avail.col},${avail.row}`]: {
            coord: avail,
            card,
            status: 'available',
            turnPlaced: 1,
          },
        },
      };

      let safeTriggered = false;
      for (let seed = 1; seed <= 50; seed++) {
        let testState: RunState = {
          ...s,
          rngState: seed * 99999,
          activeHook: { type: 'NONE' },
        };
        testState = chooseCard(testState, avail);
        if (testState.activeHook.type === 'EXPLORATION' && testState.activeHook.exploration.outcome === 'safe') {
          safeTriggered = true;
          expect(testState.activeHook.exploration.roll).toBeGreaterThan(1);
          expect(testState.activeHook.exploration.roll).toBeLessThan(6);
          const resolved = confirmExplorationSafe(testState);
          expect(resolved.activeHook.type).toBe('NONE');
          break;
        }
      }
      expect(safeTriggered).toBe(true);
    });
  });

  describe('Combat Victory Modal and Loots Flow', () => {
    it('defeating regular enemies transitions activeHook into VICTORY modal, and confirmCombatVictory returns to map', () => {
      let s = start('fighter');
      const goblinTemplate = MONSTER_TEMPLATES.goblin;
      const goblinCard = {
        ...goblinTemplate,
        id: 'test_goblin',
        instanceId: 'test_goblin_inst',
      };

      s = {
        ...s,
        activeHook: {
          type: 'COMBAT',
          combat: {
            monsters: [{ monster: goblinCard, hp: 1, block: 0, patternIndex: 0 }],
            combatTurn: 1,
            playerAp: 3,
            playerMaxAp: 3,
            playerBlock: 0,
            playerEvasionMod: 0,
            drawPile: [],
            hand: [
              {
                id: 'atk_lethal',
                instanceId: 'card_win',
                name: 'Melee ATK',
                classId: 'fighter',
                cardType: 'attack',
                apCost: 1,
                baseDamage: 5,
                baseBlock: 0,
                accBonus: 10,
                cardNumber: 'GRS · #012/021',
              },
            ],
            discardPile: [],
            combatLog: [],
          },
        },
      };

      // Play lethal attack
      const afterWin = playCard(s, 'card_win', 0);
      expect(afterWin.activeHook.type).toBe('VICTORY');
      if (afterWin.activeHook.type !== 'VICTORY') return;

      const victory = afterWin.activeHook.victory;
      expect(victory.defeatedMonsters).toHaveLength(1);
      expect(victory.defeatedMonsters[0].name).toBe('Goblin');
      expect(victory.statPointsEarned).toBe(goblinTemplate.statPointReward);
      expect(victory.goldEarned).toBeGreaterThanOrEqual(goblinTemplate.goldReward);
      expect(victory.isBoss).toBe(false);

      // Confirm victory returns to map navigation
      const backOnMap = confirmCombatVictory(afterWin);
      expect(backOnMap.activeHook.type).toBe('NONE');
    });

    it('defeating stage boss transitions to VICTORY, and confirmCombatVictory transitions to ON_STAGE_COMPLETE', () => {
      let s = start('fighter');
      const bossMonsters = createBossMonstersForMission(1);
      const boss = bossMonsters[0];

      s = {
        ...s,
        currentMission: 1,
        activeHook: {
          type: 'COMBAT',
          combat: {
            monsters: [{ monster: boss, hp: 1, block: 0, patternIndex: 0 }],
            combatTurn: 1,
            playerAp: 3,
            playerMaxAp: 3,
            playerBlock: 0,
            playerEvasionMod: 0,
            drawPile: [],
            hand: [
              {
                id: 'atk_lethal',
                instanceId: 'card_win_boss',
                name: 'Melee ATK',
                classId: 'fighter',
                cardType: 'attack',
                apCost: 1,
                baseDamage: 10,
                baseBlock: 0,
                accBonus: 10,
                cardNumber: 'GRS · #012/021',
              },
            ],
            discardPile: [],
            combatLog: [],
          },
        },
      };

      const bossWin = playCard(s, 'card_win_boss', 0);
      expect(bossWin.activeHook.type).toBe('VICTORY');
      if (bossWin.activeHook.type !== 'VICTORY') return;

      const victory = bossWin.activeHook.victory;
      expect(victory.isBoss).toBe(true);
      expect(victory.bossTitle).toBe('Goblin Chieftain');

      // Confirming boss victory proceeds to stage complete
      const stageComplete = confirmCombatVictory(bossWin);
      expect(stageComplete.activeHook.type).toBe('ON_STAGE_COMPLETE');
    });
  });

  describe('Monster DEF absorbs hero attack damage', () => {
    it('subtracts monster DEF from hero damage before block and HP', () => {
      let s = start('fighter');
      const beetle = { ...MONSTER_TEMPLATES.fighting_beetle, id: 'beetle_def_test' };
      expect(beetle.def).toBe(1);
      s = {
        ...s,
        activeHook: {
          type: 'COMBAT',
          combat: {
            monsters: [{ monster: beetle, hp: 5, block: 0, patternIndex: 0 }],
            combatTurn: 1,
            playerAp: 3,
            playerMaxAp: 3,
            playerBlock: 0,
            playerEvasionMod: 0,
            drawPile: [],
            hand: [
              {
                id: 'atk_fixed',
                instanceId: 'card_fixed',
                name: 'Fixed Strike',
                classId: 'fighter',
                cardType: 'attack',
                apCost: 1,
                baseDamage: 4,
                baseBlock: 0,
                accBonus: 20,
              },
            ],
            discardPile: [],
            combatLog: [],
          },
        },
      };

      // Find a seed that hits without critting so damage is exactly 4
      for (let seed = 1; seed <= 200; seed++) {
        const after = playCard({ ...s, rngState: seed * 7919 }, 'card_fixed', 0);
        if (after.activeHook.type !== 'COMBAT') continue;
        const roll = after.activeHook.combat.lastAttackRoll!;
        if (!roll.isHit || roll.isCrit) continue;
        expect(roll.damageDefReduced).toBe(1);
        expect(roll.damageDealt).toBe(3);
        expect(after.activeHook.combat.monsters[0].hp).toBe(2);
        return;
      }
      throw new Error('No non-crit hit seed found');
    });
  });

  describe('Permanent FLEE action', () => {
    const buildCombat = (s: RunState, isBoss = false, ap = 3): RunState => {
      const gob = { ...MONSTER_TEMPLATES.goblin, id: 'flee_gob', isBoss };
      return {
        ...s,
        activeHook: {
          type: 'COMBAT',
          combat: {
            monsters: [{ monster: gob, hp: 6, block: 0, patternIndex: 0 }],
            combatTurn: 1,
            playerAp: ap,
            playerMaxAp: 3,
            playerBlock: 0,
            playerEvasionMod: 0,
            drawPile: [],
            hand: [],
            discardPile: [],
            combatLog: [],
          },
        },
      };
    };

    it('threshold is floor((AGI + LUK) / 2)', () => {
      expect(getFleeThreshold({ str: 1, dex: 1, agi: 2, int: 1, cha: 1, luk: 1 })).toBe(1);
      expect(getFleeThreshold({ str: 1, dex: 1, agi: 3, int: 1, cha: 1, luk: 1 })).toBe(2);
      expect(getFleeThreshold({ str: 1, dex: 1, agi: 5, int: 1, cha: 1, luk: 4 })).toBe(4);
    });

    it('success escapes without rewards; failure spends 2 AP and stays in combat', () => {
      const base = start('rogue'); // AGI 3 + LUK 1 -> threshold 2
      const goldBefore = base.playerResources!.gold;
      const spBefore = base.playerResources!.statPoints;
      let sawSuccess = false;
      let sawFail = false;
      for (let seed = 1; seed <= 100 && !(sawSuccess && sawFail); seed++) {
        const s = { ...buildCombat(base), rngState: seed * 104729 };
        const after = attemptFlee(s);
        if (after.activeHook.type === 'NONE') {
          sawSuccess = true;
          expect(after.playerResources!.gold).toBe(goldBefore);
          expect(after.playerResources!.statPoints).toBe(spBefore);
          expect(after.monsterDiscard.some((m) => m.id === 'flee_gob')).toBe(true);
        } else if (after.activeHook.type === 'COMBAT') {
          sawFail = true;
          expect(after.activeHook.combat.playerAp).toBe(1);
          expect(after.activeHook.combat.lastFleeRoll?.success).toBe(false);
          expect(after.activeHook.combat.lastFleeRoll!.roll).toBeGreaterThan(2);
        }
      }
      expect(sawSuccess).toBe(true);
      expect(sawFail).toBe(true);
    });

    it('cannot flee with less than 2 AP or from a boss', () => {
      const base = start('rogue');
      const lowAp = buildCombat(base, false, 1);
      expect(attemptFlee(lowAp)).toBe(lowAp);
      const boss = buildCombat(base, true, 3);
      expect(attemptFlee(boss)).toBe(boss);
    });
  });

  describe('Ghoul Creature and Growl Debuff', () => {
    it('defines Ghoul with 8 HP, 2 EVA, 1 ACC, Forest/Swamp terrains, and Growl + Mad Dash pattern', () => {
      const ghoul = MONSTER_TEMPLATES.ghoul;
      expect(ghoul).toBeDefined();
      expect(ghoul.name).toBe('Ghoul');
      expect(ghoul.maxHp).toBe(8);
      expect(ghoul.eva).toBe(2);
      expect(ghoul.acc).toBe(1);
      expect(ghoul.def).toBe(0);
      expect(ghoul.spawnTerrains).toContain('forest');
      expect(ghoul.spawnTerrains).toContain('swamp');
      expect(ghoul.pattern).toHaveLength(2);
      expect(ghoul.pattern[0].label).toBe('Growl');
      expect(ghoul.pattern[0].heroEvaDebuff).toBe(1);
      expect(ghoul.pattern[0].heroEvaDebuffDuration).toBe(2);
      expect(ghoul.pattern[1].label).toBe('Mad Dash');
      expect(ghoul.pattern[1].damage).toBe(6);
    });

    it('Growl reduces Hero EVA by 1 for 2 turns in combat', () => {
      let s = start('fighter'); // Fighter starting stats: AGI 2 -> base EVA 1
      const ghoul = { ...MONSTER_TEMPLATES.ghoul, id: 'test_ghoul' };

      s = {
        ...s,
        activeHook: {
          type: 'COMBAT',
          combat: {
            monsters: [{ monster: ghoul, hp: 8, block: 0, patternIndex: 0 }],
            combatTurn: 1,
            playerAp: 3,
            playerMaxAp: 3,
            playerBlock: 0,
            playerEvasionMod: 0,
            drawPile: [],
            hand: [],
            discardPile: [],
            combatLog: [],
          },
        },
      };

      // Turn 1: Player ends turn. Ghoul executes Turn 1: Growl.
      const afterT1 = endTurn(s);
      expect(afterT1.activeHook.type).toBe('COMBAT');
      if (afterT1.activeHook.type !== 'COMBAT') return;

      const c1 = afterT1.activeHook.combat;
      // Hero EVA is reduced by 1 for 2 turns
      expect(c1.playerEvasionMod).toBe(-1);
      expect(c1.playerEvaDebuffTurns).toBe(2);
      expect(c1.combatLog.some((l) => l.includes('Growl') && l.includes('reduces Hero\'s EVA by 1'))).toBe(true);

      // Turn 2: Player ends turn. Ghoul executes Turn 2: Mad Dash (6 DMG).
      // Debuff is active for turn 1 of 2.
      const afterT2 = endTurn(afterT1);
      expect(afterT2.activeHook.type).toBe('COMBAT');
      if (afterT2.activeHook.type !== 'COMBAT') return;

      const c2 = afterT2.activeHook.combat;
      expect(c2.playerEvasionMod).toBe(-1);
      expect(c2.playerEvaDebuffTurns).toBe(1);

      // Turn 3: Player ends turn. Debuff was on 1 turn remaining, so after this round it expires!
      const afterT3 = endTurn(afterT2);
      expect(afterT3.activeHook.type).toBe('COMBAT');
      if (afterT3.activeHook.type !== 'COMBAT') return;

      const c3 = afterT3.activeHook.combat;
      expect(c3.combatLog.some((l) => l.includes('Growl debuff has worn off'))).toBe(true);
    });
  });
});

describe("The Goblin King monster deck", () => {
  it("uses the exact collector numbers and quantities", () => {
    const deck = start("fighter").monsterDeck;
    const counts: Record<string, number> = {};
    for (const m of deck) counts[m.cardNumber!] = (counts[m.cardNumber!] ?? 0) + 1;
    expect(counts).toEqual({'mon1grs-01': 6,'mon1grs-02': 3,'mon1grs-03': 3,'mon1grs-04': 3,'mon1grs-05': 3,'mon2frs-01': 2,'mon2frs-02': 2,'mon2frs-03': 4,'mon2frs-04': 2,'mon2frs-05': 2, 'mon3smp-01': 1, 'mon3smp-02': 1, 'mon3smp-03': 2, 'mon1grs-06': 3, 'mon3smp-04': 1});
    expect(new Set(deck.map(m => m.id)).size).toBe(38);
  });
  it("allows Goblins in swamps and skips Ramram in forests", () => {
    const goblin = { ...MONSTER_TEMPLATES.goblin, id: "goblin" };
    const ramram = { ...MONSTER_TEMPLATES.ramram, id: "ramram" };
    expect(drawMonsterCardWithReshuffle([goblin], [], 123, "swamp").monster?.id).toBe("goblin");
    const result = drawMonsterCardWithReshuffle([ramram, goblin], [], 123, "forest");
    expect(result.monster?.id).toBe("goblin");
    expect(result.deck.map(m => m.id)).toEqual(["ramram"]);
  });
});


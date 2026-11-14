import { describe, expect, it } from 'vitest';
import {
  createCombatSession,
  endPlayerCombatTurn,
  evaluateAttackRoll,
  getHeroStatDebuffMods,
  playCombatCardFromHand,
} from '../core/combat';
import { startAdventure } from '../core/engine';
import { CombatCardDef, MonsterCard, RunState } from '../core/types';
import { MONSTER_TEMPLATES, STAGE_1_MONSTER_DECK_COMPOSITION } from '../data/monsters';
import { getMonsterRasterArtPath } from '../ui/cardArt';
import { cardInspectModal } from '../ui/render';

function card(templateId: 'phalanx' | 'cultist_mage' | 'lurker'): MonsterCard {
  return { ...MONSTER_TEMPLATES[templateId], id: `${templateId}_test` };
}

function battle(state: RunState) {
  if (state.activeHook.type !== 'COMBAT') throw new Error('Expected combat');
  return state.activeHook.combat;
}

function setup(monster: MonsterCard): RunState {
  const state = startAdventure('fighter', `test-${monster.templateId}`);
  const { combat } = createCombatSession([monster], [], state.rngState);
  return {
    ...state,
    equippedGear: { weapon: null, armor: null, accessory: null },
    playerResources: { hp: 100, maxHp: 100, statPoints: 0, gold: 0 },
    activeHook: { type: 'COMBAT', combat },
  };
}

function seedForMonsterRolls(monsterAcc: number, heroEva: number, hitResults: boolean[]): number {
  for (let seed = 1; seed < 100_000; seed++) {
    let rngState = seed;
    let matches = true;
    for (const expectedHit of hitResults) {
      const result = evaluateAttackRoll(rngState, monsterAcc, heroEva);
      rngState = result.nextState;
      if (result.isHit !== expectedHit) {
        matches = false;
        break;
      }
    }
    if (matches) return seed;
  }
  throw new Error('No matching deterministic roll sequence');
}

function seedForHeroRoll(hit: boolean): number {
  for (let seed = 1; seed < 100_000; seed++) {
    const result = evaluateAttackRoll(seed, 101, 0);
    if (result.isHit === hit) return seed;
  }
  throw new Error('No matching deterministic hero roll');
}

const reliableAttack: CombatCardDef = {
  id: 'test_attack',
  instanceId: 'test_attack',
  name: 'Test Attack',
  classId: 'fighter',
  cardType: 'attack',
  apCost: 1,
  baseDamage: 6,
  damageScalingStat: 'str',
  damageScalingDivisor: 100,
  baseBlock: 0,
  accBonus: 100,
};

describe('cave monster catalog and combat mechanics', () => {
  it('stores all requested balance changes in the canonical monster catalog', () => {
    expect(MONSTER_TEMPLATES.fighting_beetle.pattern[0]).toMatchObject({
      label: 'Shell Guard', damage: 0, block: 0, defBonus: 1, defDuration: 2,
    });
    expect(MONSTER_TEMPLATES.rattler).toMatchObject({ maxHp: 10, def: 1 });
    expect(MONSTER_TEMPLATES.pink_slime).toMatchObject({ mdef: 1 });
    expect(MONSTER_TEMPLATES.zombie).toMatchObject({ mdef: 1 });
    expect(MONSTER_TEMPLATES.zombie.pattern[0]).toMatchObject({ label: 'Life Steal', damage: 6, drainFraction: 0.5, drainRound: 'ceil' });
    expect(MONSTER_TEMPLATES.ghoul).toMatchObject({ maxHp: 12, mdef: 2 });
    expect(MONSTER_TEMPLATES.bullwark).toMatchObject({ maxHp: 16 });
    expect(MONSTER_TEMPLATES.bullwark.pattern).toEqual([
      { label: 'Heal', damage: 0, block: 0, heal: 4 },
      { label: 'Heavy Charge', damage: 7, block: 0 },
    ]);
    expect(MONSTER_TEMPLATES.assassin.maxHp).toBe(13);
    expect(MONSTER_TEMPLATES.witch.maxHp).toBe(14);
    expect(MONSTER_TEMPLATES.leech).toMatchObject({ maxHp: 18, regenOnStart: 2 });
    expect(MONSTER_TEMPLATES.leech.pattern[1]).toMatchObject({ label: 'T2', damage: 7, damageType: 'magical', lifesteal: true });
  });

  it('registers Phalanx, Cultist Mage, and Lurker with art, stats, rewards, terrains, and public collector IDs', () => {
    const phalanx = card('phalanx');
    expect(phalanx).toMatchObject({
      cardNumber: 'mon4cav-01', level: 4, maxHp: 20, def: 3, mdef: 2, eva: 5, acc: 4,
      statPointReward: 5, goldReward: 20, spawnTerrains: ['cave'], creatureType: 'Arachnid',
    });
    expect(phalanx.skittishEvaOnHit).toBe(2);
    expect(phalanx.pattern[0]).toMatchObject({
      label: 'T1', damage: 0,
      heroStatDebuff: { stats: { acc: 2, eva: 3 }, duration: 1 },
    });
    expect(phalanx.pattern[1]).toMatchObject({ label: 'T2', damage: 7, offhandDamage: 6 });

    const cultist = card('cultist_mage');
    expect(cultist).toMatchObject({
      cardNumber: 'mon4cav-02', level: 4, maxHp: 18, def: 2, mdef: 3, acc: 5, eva: 4,
      statPointReward: 5, goldReward: 20, spawnTerrains: ['cave', 'underground', 'underworld'],
      channel: { amount: 1, duration: 3 },
    });
    expect(cultist.pattern).toEqual([{ label: 'T1', damage: 8, damageType: 'magical', block: 0 }]);

    const lurker = card('lurker');
    expect(lurker).toMatchObject({
      cardNumber: 'mon4cav-03', level: 5, maxHp: 25, def: 4, mdef: 3, acc: 4, eva: 4,
      statPointReward: 6, goldReward: 25, spawnTerrains: ['cave', 'underground'],
      creatureType: 'Wurm', retaliationDamageOnHeroAttack: 1, hardenDefOnHit: 1,
    });
    expect(lurker.pattern).toEqual([
      { label: 'T1', damage: 10, block: 0 },
      { label: 'T2', damage: 0, heal: 12, block: 0, defBonus: -2, bonusDuration: 1 },
    ]);

    expect(getMonsterRasterArtPath('phalanx')).toBe('/cards/creatures/phalanx.png');
    expect(getMonsterRasterArtPath('cultist_mage')).toBe('/cards/creatures/cultist_mage.png');
    expect(getMonsterRasterArtPath('lurker')).toBe('/cards/creatures/lurker.png');
    const phalanxHtml = cardInspectModal({ kind: 'monster', monster: phalanx }, setup(phalanx)).replace(/<\/?b>/g, '');
    expect(phalanxHtml).toContain('Skittish (2)');
    expect(phalanxHtml).toContain('ATK (7)');
    expect(phalanxHtml).toContain('ATK (6)');
    expect(cardInspectModal({ kind: 'monster', monster: cultist }, setup(cultist))).toContain('Underworld 🔥');

    // Their Cave main terrain is outside Scenario 1's Grassland–Swamp setup band.
    for (const templateId of ['phalanx', 'cultist_mage', 'lurker']) {
      expect(STAGE_1_MONSTER_DECK_COMPOSITION.some(entry => entry.templateId === templateId)).toBe(false);
    }
  });

  it('applies Phalanx T1 Ensnare (3) and Blind (2) for 1 turn', () => {
    const phalanx = card('phalanx');
    const state = setup(phalanx);
    const next = endPlayerCombatTurn(state);
    expect(next.playerResources?.hp).toBe(100);
    expect(getHeroStatDebuffMods(battle(next))).toEqual({ acc: -2, eva: -3, def: 0, mdef: 0 });
    expect(battle(next).heroStatDebuffs).toMatchObject([{ turnsRemaining: 1 }]);
  });

  it('resolves Phalanx T2 ATK (7), ATK (6) as two independent hit checks with mitigation on each hit', () => {
    const phalanx = card('phalanx');
    const state = setup(phalanx);
    battle(state).monsters[0].patternIndex = 1;
    battle(state).playerBlock = 3;
    state.rngState = seedForMonsterRolls(4, 2, [true, true]);
    const next = endPlayerCombatTurn(state);
    // Hit 1: 7 - 1 DEF = 6 (3 absorbed by Block -> 3 HP dmg); Hit 2: 6 - 1 DEF = 5 HP dmg -> Total 8 HP loss (92 HP)
    expect(next.playerResources?.hp).toBe(92);
    expect(battle(next).playerBlock).toBe(0);
    expect(battle(next).combatLog.join(' ')).toContain('resolving 2 separate attacks');
    expect(battle(next).combatLog.filter(line => line.includes('T2 (7 DMG') || line.includes('T2 (6 DMG')).length).toBe(2);
  });

  it('Cultist Mage Channel (1, 3) stacks +1 MATK per turn up to +3 after 3 turns', () => {
    const cultist = card('cultist_mage');
    let state = setup(cultist);
    // Turn 1: base MATK 8 -> gains +1 Channel (3t)
    state.rngState = seedForMonsterRolls(5, 2, [true]);
    state = endPlayerCombatTurn(state);
    expect(battle(state).lastAttackRoll?.damageDealt).toBe(8);
    // Turn 2: MATK 9 -> gains +1 Channel (3t)
    state.rngState = seedForMonsterRolls(5, 2, [true]);
    state = endPlayerCombatTurn(state);
    expect(battle(state).lastAttackRoll?.damageDealt).toBe(9);
    // Turn 3: MATK 10 -> gains +1 Channel (3t)
    state.rngState = seedForMonsterRolls(5, 2, [true]);
    state = endPlayerCombatTurn(state);
    expect(battle(state).lastAttackRoll?.damageDealt).toBe(10);
    // Turn 4: MATK 11 (Turn 1 stack expires at end of Turn 4, new stack added -> still +3 max)
    state.rngState = seedForMonsterRolls(5, 2, [true]);
    state = endPlayerCombatTurn(state);
    expect(battle(state).lastAttackRoll?.damageDealt).toBe(11);
    expect(battle(state).monsters[0].channelStacks).toHaveLength(3);
  });

  it('Lurker Thorn (1) does NOT trigger on ranged spell or ranged weapon attacks', () => {
    const lurker = card('lurker');
    const rangedSpell: CombatCardDef = { ...reliableAttack, id: 'spell_ranged', damageScalingStat: 'int', attackRange: 'ranged' };
    const state = setup(lurker);
    battle(state).hand = [rangedSpell];
    state.rngState = seedForHeroRoll(true);
    const next = playCombatCardFromHand(state, rangedSpell.instanceId, 0, s => s);
    expect(next.playerResources?.hp).toBe(100);
  });

  it('uses Hero MDEF for Cultist Mage Soul Burn', () => {
    const cultist = card('cultist_mage');
    const state = setup(cultist);
    state.equippedGear.armor = {
      id: 'mdef_armor', instanceId: 'mdef_armor', name: 'MDEF Armor', category: 'armor', description: '',
      buyPrice: 0, sellPrice: 0, gearBonus: { def: 100, mdef: 2 },
    };
    state.rngState = seedForMonsterRolls(5, 2, [true]);
    const next = endPlayerCombatTurn(state);
    expect(next.playerResources?.hp).toBe(94);
    expect(battle(next).lastAttackRoll).toMatchObject({ defenseType: 'MDEF', damageDefReduced: 2, damageDealt: 6 });
  });

  it('makes Lurker acid retaliate after a successful nonlethal hero attack while ignoring DEF and Block', () => {
    const lurker = card('lurker');
    const state = setup(lurker);
    battle(state).hand = [reliableAttack];
    battle(state).playerBlock = 99;
    state.equippedGear.armor = {
      id: 'armor', instanceId: 'armor', name: 'Armor', category: 'armor', description: '',
      buyPrice: 0, sellPrice: 0, gearBonus: { def: 99 },
    };
    state.rngState = seedForHeroRoll(true);
    const next = playCombatCardFromHand(state, reliableAttack.instanceId, 0, value => value);
    expect(next.playerResources?.hp).toBe(99);
    expect(battle(next).playerBlock).toBe(99);
    expect(battle(next).monsters[0].hp).toBe(22); // 7 damage - 4 Lurker DEF.
    expect(battle(next).combatLog.join(' ')).toContain('ignores DEF and Block');
  });

  it('does not trigger Lurker acid on a miss or after a killing blow', () => {
    const lurker = card('lurker');
    const missState = setup(lurker);
    const inaccurateAttack = { ...reliableAttack, instanceId: 'miss_attack', accBonus: -100 };
    battle(missState).hand = [inaccurateAttack];
    missState.rngState = 1;
    const miss = playCombatCardFromHand(missState, inaccurateAttack.instanceId, 0, value => value);
    expect(miss.playerResources?.hp).toBe(100);

    const killState = setup(lurker);
    battle(killState).monsters[0].hp = 1;
    battle(killState).hand = [reliableAttack];
    killState.rngState = seedForHeroRoll(true);
    const kill = playCombatCardFromHand(killState, reliableAttack.instanceId, 0, value => value);
    expect(kill.playerResources?.hp).toBe(100);
  });

  it('lets Lurker acid deal full retaliatory damage since DEF and Block are bypassed', () => {
    const lurker = card('lurker');
    const state = setup(lurker);
    state.divineProtection = 1;
    battle(state).hand = [reliableAttack];
    state.rngState = seedForHeroRoll(true);
    const next = playCombatCardFromHand(state, reliableAttack.instanceId, 0, value => value);
    expect(next.playerResources?.hp).toBe(99);
    expect(battle(next).combatLog.join(' ')).toContain('Hero loses 1 HP (ignores DEF and Block)');
  });

  it('lets Divine Protection grant +1 MDEF to absorb magical damage from Cultist Mage', () => {
    const cultist = card('cultist_mage');
    const state = setup(cultist);
    state.divineProtection = 1;
    state.rngState = seedForMonsterRolls(5, 2, [true]);
    const next = endPlayerCombatTurn(state);
    expect(next.playerResources?.hp).toBe(93); // 8 Soul Burn - 1 MDEF = 7 DMG (100 -> 93)
    expect(battle(next).lastAttackRoll).toMatchObject({ defenseType: 'MDEF', damageDefReduced: 1, damageDealt: 7 });
  });

  it('lets Lurker Shed heal 12 HP and remove its 2 DEF for one turn only', () => {
    const lurker = card('lurker');
    let state = setup(lurker);
    battle(state).monsters[0] = { monster: lurker, hp: 5, block: 0, patternIndex: 1 };
    state = endPlayerCombatTurn(state);
    expect(battle(state).monsters[0]).toMatchObject({ hp: 17, defBonus: -2, defBonusTurns: 1, patternIndex: 2 });
    expect(battle(state).combatLog.join(' ')).toContain('loses 2 DEF for 1 turn');

    state.rngState = seedForMonsterRolls(1, 1, [false]);
    state = endPlayerCombatTurn(state);
    expect(battle(state).monsters[0].defBonus).toBe(0);
    expect(battle(state).monsters[0].defBonusTurns).toBe(0);
  });
});

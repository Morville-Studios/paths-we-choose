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
      if (result.isHit !== expectedHit || result.isCrit) {
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
    if (result.isHit === hit && !result.isCrit) return seed;
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
      label: 'Shell Guard', damage: 3, block: 0, defBonus: 1, bonusDuration: 1,
    });
    expect(MONSTER_TEMPLATES.rattler).toMatchObject({ maxHp: 10, def: 1 });
    expect(MONSTER_TEMPLATES.pink_slime).toMatchObject({ mdef: 1 });
    expect(MONSTER_TEMPLATES.zombie).toMatchObject({ mdef: 1 });
    expect(MONSTER_TEMPLATES.zombie.pattern[0]).toMatchObject({ label: 'Regenerate', heal: 3 });
    expect(MONSTER_TEMPLATES.ghoul).toMatchObject({ maxHp: 12, mdef: 2 });
    expect(MONSTER_TEMPLATES.bullwark).toMatchObject({ maxHp: 16 });
    expect(MONSTER_TEMPLATES.bullwark.pattern).toEqual([
      { label: 'Chaotic Impulse', damage: 0, block: 0, randomBuff: { amount: 1, stats: ['atk', 'acc'], duration: 1 } },
      { label: 'Heavy Charge', damage: 7, block: 0 },
    ]);
    expect(MONSTER_TEMPLATES.assassin.maxHp).toBe(13);
    expect(MONSTER_TEMPLATES.witch.maxHp).toBe(14);
    expect(MONSTER_TEMPLATES.leech).toMatchObject({ maxHp: 18 });
    expect(MONSTER_TEMPLATES.leech.pattern[0]).toMatchObject({ label: 'Soul Drain', damage: 8, damageType: 'magical' });
  });

  it('registers Phalanx, Cultist Mage, and Lurker with art, stats, rewards, terrains, and public collector IDs', () => {
    const phalanx = card('phalanx');
    expect(phalanx).toMatchObject({
      cardNumber: 'mon4cav-01', level: 4, maxHp: 20, def: 3, mdef: 2, eva: 5, acc: 4,
      statPointReward: 8, goldReward: 16, spawnTerrains: ['cave'], creatureType: 'Arachnid',
    });
    expect(phalanx.pattern[0]).toMatchObject({
      label: 'Blinding Web', damage: 6,
      heroStatDebuff: { stats: { acc: 1, eva: 2 }, duration: 1 }, heroStatDebuffOnHit: true,
    });
    expect(phalanx.pattern[1]).toMatchObject({ label: 'Double Smash', damage: 8, hitCount: 2 });

    const cultist = card('cultist_mage');
    expect(cultist).toMatchObject({
      cardNumber: 'mon4cav-02', level: 4, maxHp: 18, def: 2, mdef: 3, acc: 5, eva: 4,
      statPointReward: 8, goldReward: 16, spawnTerrains: ['cave', 'underground', 'underworld'],
    });
    expect(cultist.pattern).toEqual([{ label: 'Soul Burn', damage: 8, damageType: 'magical', block: 0 }]);

    const lurker = card('lurker');
    expect(lurker).toMatchObject({
      cardNumber: 'mon4cav-03', level: 5, maxHp: 25, def: 4, mdef: 3, acc: 4, eva: 4,
      statPointReward: 16, goldReward: 32, spawnTerrains: ['cave', 'underground'],
      creatureType: 'Wurm', retaliationDamageOnHeroAttack: 1,
    });
    expect(lurker.pattern).toEqual([
      { label: 'Drill', damage: 10, block: 0 },
      { label: 'Shed', damage: 0, heal: 12, block: 0, defBonus: -2, bonusDuration: 1 },
    ]);

    expect(getMonsterRasterArtPath('phalanx')).toBe('/cards/creatures/phalanx.png');
    expect(getMonsterRasterArtPath('cultist_mage')).toBe('/cards/creatures/cultist_mage.png');
    expect(getMonsterRasterArtPath('lurker')).toBe('/cards/creatures/lurker.png');
    expect(cardInspectModal({ kind: 'monster', monster: phalanx }, setup(phalanx))).toContain('DMG ×2');
    expect(cardInspectModal({ kind: 'monster', monster: cultist }, setup(cultist))).toContain('Underworld 🔥');

    // Their Cave main terrain is outside Scenario 1's Grassland–Swamp setup band.
    for (const templateId of ['phalanx', 'cultist_mage', 'lurker']) {
      expect(STAGE_1_MONSTER_DECK_COMPOSITION.some(entry => entry.templateId === templateId)).toBe(false);
    }
  });

  it('applies Phalanx Blinding Web penalties only when the web attack hits', () => {
    const phalanx = card('phalanx');
    const hitState = setup(phalanx);
    hitState.rngState = seedForMonsterRolls(4, 2, [true]);
    const hit = endPlayerCombatTurn(hitState);
    expect(hit.playerResources?.hp).toBe(94);
    expect(getHeroStatDebuffMods(battle(hit))).toEqual({ acc: -1, eva: -2, def: 0, mdef: 0 });
    expect(battle(hit).heroStatDebuffs).toMatchObject([{ turnsRemaining: 1 }]);

    const missState = setup(phalanx);
    missState.rngState = seedForMonsterRolls(4, 2, [false]);
    const miss = endPlayerCombatTurn(missState);
    expect(miss.playerResources?.hp).toBe(100);
    expect(getHeroStatDebuffMods(battle(miss))).toEqual({ acc: 0, eva: 0, def: 0, mdef: 0 });
  });

  it('resolves Phalanx Double Smash as two independent hit checks with mitigation on each hit', () => {
    const phalanx = card('phalanx');
    const state = setup(phalanx);
    battle(state).monsters[0].patternIndex = 1;
    battle(state).playerBlock = 3;
    state.rngState = seedForMonsterRolls(4, 2, [true, true]);
    const next = endPlayerCombatTurn(state);
    expect(next.playerResources?.hp).toBe(87); // 16 total damage; 3 absorbed by Block.
    expect(battle(next).playerBlock).toBe(0);
    expect(battle(next).combatLog.join(' ')).toContain('resolving 2 separate attacks');
    expect(battle(next).combatLog.filter(line => line.includes('Double Smash (8 DMG')).length).toBe(2);
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

  it('lets Divine Protection reduce Lurker acid because only DEF and Block are bypassed', () => {
    const lurker = card('lurker');
    const state = setup(lurker);
    state.divineProtection = 1;
    battle(state).hand = [reliableAttack];
    state.rngState = seedForHeroRoll(true);
    const next = playCombatCardFromHand(state, reliableAttack.instanceId, 0, value => value);
    expect(next.playerResources?.hp).toBe(100);
    expect(battle(next).combatLog.join(' ')).toContain('reduced by Divine Protection');
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

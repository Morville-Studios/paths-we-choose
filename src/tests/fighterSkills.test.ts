import { describe, expect, it } from 'vitest';
import { endTurn, playCard, startAdventure } from '../core/engine';
import { computeCardEffect } from '../core/combat';
import { ActiveCombatState, ActionCardDef, EnemyCard, RunState } from '../core/types';
import { createActionCardInstance } from '../data/actionCards';
import { getEffectiveStatsFromState } from '../core/stats';

const dummyEnemy: EnemyCard = {
  id: 'dummy', templateId: 'goblin', name: 'Training Dummy', level: 1, maxHp: 100,
  def: 0, acc: 0, eva: 0, statPointReward: 0, goldReward: 0, abilities: [],
  pattern: [{ label: 'Wait', damage: 0, block: 0 }],
};

function combatState(hand: ActionCardDef[], drawPile: ActionCardDef[] = [], inPlay: ActionCardDef[] = []): RunState {
  const base = startAdventure('fighter', 'fighter-skills');
  const combat: ActiveCombatState = {
    enemies: [{ enemy: dummyEnemy, hp: dummyEnemy.maxHp, block: 0, patternIndex: 0 }],
    combatTurn: 1, playerAp: 3, playerMaxAp: 3, playerBlock: 0, playerEvasionMod: 0,
    drawPile, hand, discardPile: [], inPlay, combatLog: [],
  };
  return {
    ...base,
    equippedGear: { weapon: null, armor: null, accessory: null },
    activeHook: { type: 'COMBAT', combat },
  };
}

function card(id: string, suffix: string): ActionCardDef {
  return createActionCardInstance(id, suffix);
}

describe('Fighter skill cards', () => {
  it('conserves ordinary cards and refills a five-card hand by recycling the discard', () => {
    const cards = [
      card('melee_atk', 'one'),
      card('melee_atk', 'two'),
      card('shield_def', 'three'),
      card('shield_def', 'four'),
      card('melee_atk', 'five'),
    ];
    const state = combatState([cards[0]]);
    if (state.activeHook.type !== 'COMBAT') throw new Error('combat should continue');
    state.activeHook.combat.discardPile = cards.slice(1);

    const afterPlay = playCard(state, cards[0].instanceId, 0);
    if (afterPlay.activeHook.type !== 'COMBAT') throw new Error('combat should continue');
    expect(afterPlay.activeHook.combat.hand).toEqual([]);
    expect(afterPlay.activeHook.combat.discardPile).toHaveLength(5);

    const nextTurn = endTurn(afterPlay);
    if (nextTurn.activeHook.type !== 'COMBAT') throw new Error('combat should continue');
    const nextCombat = nextTurn.activeHook.combat;
    expect(nextCombat.hand).toHaveLength(5);
    expect(nextCombat.drawPile).toEqual([]);
    expect(nextCombat.discardPile).toEqual([]);
    expect(nextCombat.hand.map((card) => card.instanceId).sort()).toEqual(cards.map((card) => card.instanceId).sort());
  });

  it('uses derived ATK and DEF for the renamed cards and their upgrades', () => {
    const state = startAdventure('fighter', 'fighter-scaling');
    const stats = getEffectiveStatsFromState(state);
    expect(computeCardEffect(card('melee_atk', 'melee'), stats).damage).toBe(6); // 3 + 3 ATK
    expect(computeCardEffect(card('shield_def', 'shield'), stats).block).toBe(5); // 4 + 1 DEF (STR 4 + AGI 2 + VIT 3 = 9 -> 1 DEF)
    expect(computeCardEffect(card('heavy_cleave', 'high'), stats).damage).toBe(6); // 3 ATK + 3 ACC
    expect(computeCardEffect(card('high_strike_plus', 'high-plus'), stats).damage).toBe(9); // ceil(1.5 × (3 ATK + 3 ACC)) = 9
    expect(computeCardEffect(card('heavy_cleave', 'high-debuffed'), stats, undefined, 0, 0, -1).damage).toBe(5); // live -1 ACC debuff
    expect(computeCardEffect(card('battle_focus', 'fortify'), stats).block).toBe(4); // 3 + 1 DEF = 4
    expect(computeCardEffect(card('battle_focus', 'fortify'), stats, { atk: 0, def: 3, acc: 0, eva: 0, matk: 0, mdef: 0, pen: 0 }).block).toBe(7); // 3 + (1 + 3) DEF = 7
    expect(computeCardEffect(card('fortify_plus', 'fortify-plus'), stats).block).toBe(6); // 4 + ceil(1.5 × 1 DEF) = 6
    expect(computeCardEffect(card('whirlwind', 'whirlwind'), stats).damage).toBe(4); // 1 + 3 ATK
    expect(computeCardEffect(card('whirlwind_plus', 'whirlwind-plus'), stats).damage).toBe(7); // 2 + ceil(1.5 × 3 ATK) = 7
    expect(computeCardEffect(card('iron_parry', 'parry'), stats)).toMatchObject({ block: 3, evasionBonus: 1 }); // 1 + floor((3 DEX + 2 AGI) / 2) = 3 Block, +1 EVA
    expect(computeCardEffect(card('iron_parry', 'parry'), { ...stats, agi: 4 })).toMatchObject({ block: 4, evasionBonus: 1 }); // 1 + floor((3 DEX + 4 AGI) / 2) = 4 Block, +1 EVA
    expect(computeCardEffect(card('parry_plus', 'parry-plus'), stats)).toMatchObject({ block: 4, evasionBonus: 2 }); // 2 + floor((3 DEX + 2 AGI) / 2) = 4 Block, +2 EVA
  });

  it('requires chosen discards for Battlecry, draws cards, and refunds AP', () => {
    const battlecry = card('battlecry', 'play');
    const first = card('melee_atk', 'first');
    const held = card('melee_atk', 'held');
    const draws = [card('shield_def', 'draw-1'), card('melee_atk', 'draw-2')];
    const state = combatState([battlecry, first, held], draws);

    expect(playCard(state, battlecry.instanceId, 0).activeHook).toEqual(state.activeHook);
    const result = playCard(state, battlecry.instanceId, 0, [first.instanceId]);
    if (result.activeHook.type !== 'COMBAT') throw new Error('combat should continue');
    expect(result.activeHook.combat.playerAp).toBe(3);
    expect(result.activeHook.combat.hand.map((c) => c.instanceId)).toEqual([held.instanceId, ...draws.map((c) => c.instanceId)]);
    expect(result.activeHook.combat.discardPile).toHaveLength(2);
  });

  it('keeps Battlecry on the Stack until its draw finishes, so it cannot draw itself', () => {
    const battlecry = card('battlecry', 'stack-play');
    const first = card('melee_atk', 'stack-cost-1');
    const held = card('melee_atk', 'stack-held');
    const drawOne = card('shield_def', 'stack-draw-1');
    const drawTwo = card('melee_atk', 'stack-draw-2');
    const result = playCard(
      combatState([battlecry, first, held], [drawOne, drawTwo]),
      battlecry.instanceId,
      0,
      [first.instanceId]
    );
    if (result.activeHook.type !== 'COMBAT') throw new Error('combat should continue');
    const combat = result.activeHook.combat;
    expect(combat.hand).toHaveLength(3);
    expect(combat.hand.some((drawn) => drawn.instanceId === battlecry.instanceId)).toBe(false);
    expect(combat.discardPile.at(-1)?.instanceId).toBe(battlecry.instanceId);
    expect(combat.stack).toEqual([]);
    const entered = combat.combatLog.findIndex((entry) => entry.includes('enters the Stack'));
    const drew = combat.combatLog.findIndex((entry) => entry.includes('Battlecry: drew'));
    const resolved = combat.combatLog.findIndex((entry) => entry.includes('fully resolves'));
    expect(entered).toBeLessThan(drew);
    expect(drew).toBeLessThan(resolved);
  });

  it('rolls Whirlwind independently against every living enemy', () => {
    const whirlwind = { ...card('whirlwind', 'play'), accBonus: 100 };
    const state = combatState([whirlwind]);
    if (state.activeHook.type !== 'COMBAT') throw new Error('combat expected');
    state.activeHook.combat.enemies.push({ enemy: { ...dummyEnemy, id: 'dummy-2', name: 'Second Dummy' }, hp: 100, block: 0, patternIndex: 0 });
    const result = playCard(state, whirlwind.instanceId);
    if (result.activeHook.type !== 'COMBAT') throw new Error('combat should continue');
    expect(result.activeHook.combat.combatLog.filter((entry) => entry.includes('Played Whirlwind on'))).toHaveLength(2);
    expect(result.activeHook.combat.lastAttackRolls).toHaveLength(2);
    expect(result.activeHook.combat.lastAttackRolls?.[0].targetIndex).toBe(0);
    expect(result.activeHook.combat.lastAttackRolls?.[1].targetIndex).toBe(1);
  });

  it('keeps Battle Flag in play and draws when Adrenalin grants AP from discarded cards', () => {
    const flag = card('battle_flag', 'flag');
    const adrenalin = card('adrenalin', 'adrenalin');
    const fuel = card('melee_atk', 'fuel');
    const drawn = card('shield_def', 'drawn');
    const result = playCard(combatState([adrenalin, fuel], [drawn], [flag]), adrenalin.instanceId, 0, [fuel.instanceId]);
    if (result.activeHook.type !== 'COMBAT') throw new Error('combat should continue');
    expect(result.activeHook.combat.playerAp).toBe(3);
    expect(result.activeHook.combat.inPlay).toEqual([flag]);
    expect(result.activeHook.combat.hand).toEqual([drawn]);
  });

  it('spends Battle Flag AP without refunding AP or drawing a card on entry', () => {
    const flag = card('battle_flag', 'play');
    const held = card('melee_atk', 'held');
    const waiting = card('shield_def', 'waiting');
    const result = playCard(combatState([flag, held], [waiting]), flag.instanceId);
    if (result.activeHook.type !== 'COMBAT') throw new Error('combat should continue');
    const combat = result.activeHook.combat;
    expect(combat.playerAp).toBe(2);
    expect(combat.hand).toEqual([held]);
    expect(combat.drawPile).toEqual([waiting]);
    expect(combat.inPlay).toEqual([flag]);
    expect(combat.combatLog.join(' ')).not.toContain('regained');
    expect(combat.combatLog.join(' ')).not.toContain('Battle Flag: drew');
  });

  it('adds Execute damage for each chosen discard', () => {
    const executeCard = card('final_smash', 'final');
    expect(executeCard.name).toBe('Execute');
    expect(executeCard.apCost).toBe(2);
    const fuel = card('melee_atk', 'fuel');
    const state = combatState([executeCard, fuel]);
    state.rngState = 1;
    const result = playCard(state, executeCard.instanceId, 0, [fuel.instanceId]);
    if (result.activeHook.type !== 'COMBAT') throw new Error('combat should continue');
    expect(result.activeHook.combat.combatLog.find((entry) => entry.includes('Played Execute'))).toContain('15 DMG');
  });

  it('draws an extra card whenever Adrenalin is put into your hand', () => {
    const battlecry = card('battlecry', 'bc');
    const cost = card('melee_atk', 'cost');
    const adrenalin = card('adrenalin', 'adr');
    const extra1 = card('shield_def', 'extra-1');
    const extra2 = card('melee_atk', 'extra-2');

    // Battlecry discards 1 and draws 2: drawing Adrenalin + extra1 triggers 1 extra draw (extra2) -> 3 drawn total
    const state = combatState([battlecry, cost], [adrenalin, extra1, extra2]);
    const result = playCard(state, battlecry.instanceId, 0, [cost.instanceId]);
    if (result.activeHook.type !== 'COMBAT') throw new Error('combat should continue');
    expect(result.activeHook.combat.hand.map((c) => c.instanceId)).toEqual([
      adrenalin.instanceId,
      extra1.instanceId,
      extra2.instanceId,
    ]);
    expect(result.activeHook.combat.drawPile).toEqual([]);
    const log = result.activeHook.combat.combatLog;
    const i1 = log.findIndex((e) => e.includes('Battlecry: drew Adrenalin.'));
    const i2 = log.findIndex((e) => e.includes("Adrenalin's On-Draw trigger enters the Stack."));
    const i3 = log.findIndex((e) => e.includes('Adrenalin: drew Shield') || e.includes('Adrenalin: drew Defend.'));
    const i4 = log.findIndex((e) => e.includes("Adrenalin's On-Draw trigger fully resolves and moves out of the Stack."));
    const i5 = log.findIndex((e) => e.includes('Battlecry: drew Slash.'));
    expect(i1).toBeGreaterThan(-1);
    expect(i2).toBeGreaterThan(i1);
    expect(i3).toBeGreaterThan(i2);
    expect(i4).toBeGreaterThan(i3);
    expect(i5).toBeGreaterThan(i4);
  });
});

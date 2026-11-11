import { describe, expect, it } from 'vitest';
import { endTurn, playCard, startAdventure } from '../core/engine';
import { computeCardEffect } from '../core/combat';
import { ActiveCombatState, CombatCardDef, MonsterCard, RunState } from '../core/types';
import { createCombatCardInstance } from '../data/combatCards';
import { getEffectiveStatsFromState } from '../core/stats';

const dummyMonster: MonsterCard = {
  id: 'dummy', templateId: 'goblin', name: 'Training Dummy', level: 1, maxHp: 100,
  def: 0, acc: 0, eva: 0, statPointReward: 0, goldReward: 0, abilities: [],
  pattern: [{ label: 'Wait', damage: 0, block: 0 }],
};

function combatState(hand: CombatCardDef[], drawPile: CombatCardDef[] = [], inPlay: CombatCardDef[] = []): RunState {
  const base = startAdventure('fighter', 'fighter-skills');
  const combat: ActiveCombatState = {
    monsters: [{ monster: dummyMonster, hp: dummyMonster.maxHp, block: 0, patternIndex: 0 }],
    combatTurn: 1, playerAp: 3, playerMaxAp: 3, playerBlock: 0, playerEvasionMod: 0,
    drawPile, hand, discardPile: [], inPlay, combatLog: [],
  };
  return { ...base, activeHook: { type: 'COMBAT', combat } };
}

function card(id: string, suffix: string): CombatCardDef {
  return createCombatCardInstance(id, suffix);
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
    expect(computeCardEffect(card('melee_atk', 'melee'), stats).damage).toBe(4); // 3 + 1 ATK
    expect(computeCardEffect(card('shield_def', 'shield'), stats).block).toBe(4); // 4 + 0 DEF
    expect(computeCardEffect(card('heavy_cleave', 'high'), stats).damage).toBe(2); // 1 ATK + 1 ACC
    expect(computeCardEffect(card('high_strike_plus', 'high-plus'), stats).damage).toBe(3); // 2 × 1 ATK + 1 ACC
    expect(computeCardEffect(card('heavy_cleave', 'high-debuffed'), stats, undefined, 0, 0, -1).damage).toBe(1); // live -1 ACC debuff
    expect(computeCardEffect(card('battle_focus', 'fortify'), stats).block).toBe(3); // 3 + 0 DEF
    expect(computeCardEffect(card('fortify_plus', 'fortify-plus'), stats).block).toBe(4); // 4 + 2 × 0 DEF
    expect(computeCardEffect(card('whirlwind', 'whirlwind'), stats).damage).toBe(2); // 1 + 1 ATK
    expect(computeCardEffect(card('whirlwind_plus', 'whirlwind-plus'), stats).damage).toBe(4); // 2 + 2 × 1 ATK
    expect(computeCardEffect(card('iron_parry', 'parry'), stats)).toMatchObject({ block: 5, evasionBonus: 1 });
    expect(computeCardEffect(card('parry_plus', 'parry-plus'), stats)).toMatchObject({ block: 7, evasionBonus: 2 });
  });

  it('requires chosen discards for Battlecry, draws cards, and refunds AP', () => {
    const battlecry = card('battlecry', 'play');
    const first = card('melee_atk', 'first');
    const second = card('shield_def', 'second');
    const held = card('melee_atk', 'held');
    const draws = [card('shield_def', 'draw-1'), card('melee_atk', 'draw-2'), card('shield_def', 'draw-3')];
    const state = combatState([battlecry, first, second, held], draws);

    expect(playCard(state, battlecry.instanceId, 0).activeHook).toEqual(state.activeHook);
    const result = playCard(state, battlecry.instanceId, 0, [first.instanceId, second.instanceId]);
    if (result.activeHook.type !== 'COMBAT') throw new Error('combat should continue');
    expect(result.activeHook.combat.playerAp).toBe(3);
    expect(result.activeHook.combat.hand.map((c) => c.instanceId)).toEqual([held.instanceId, ...draws.map((c) => c.instanceId)]);
    expect(result.activeHook.combat.discardPile).toHaveLength(3);
  });

  it('keeps Battlecry on the Stack until its draw finishes, so it cannot draw itself', () => {
    const battlecry = card('battlecry', 'stack-play');
    const first = card('melee_atk', 'stack-cost-1');
    const second = card('shield_def', 'stack-cost-2');
    const held = card('melee_atk', 'stack-held');
    const drawOne = card('shield_def', 'stack-draw-1');
    const drawTwo = card('melee_atk', 'stack-draw-2');
    const result = playCard(
      combatState([battlecry, first, second, held], [drawOne, drawTwo]),
      battlecry.instanceId,
      0,
      [first.instanceId, second.instanceId]
    );
    if (result.activeHook.type !== 'COMBAT') throw new Error('combat should continue');
    const combat = result.activeHook.combat;
    expect(combat.hand).toHaveLength(4);
    expect(combat.hand.some((drawn) => drawn.instanceId === battlecry.instanceId)).toBe(false);
    expect(combat.discardPile.at(-1)?.instanceId).toBe(battlecry.instanceId);
    expect(combat.stack).toEqual([]);
    const entered = combat.combatLog.findIndex((entry) => entry.includes('enters the Stack'));
    const drew = combat.combatLog.findIndex((entry) => entry.includes('Battlecry: drew 3 cards'));
    const resolved = combat.combatLog.findIndex((entry) => entry.includes('fully resolves'));
    expect(entered).toBeLessThan(drew);
    expect(drew).toBeLessThan(resolved);
  });

  it('rolls Whirlwind independently against every living enemy', () => {
    const whirlwind = { ...card('whirlwind', 'play'), accBonus: 100 };
    const state = combatState([whirlwind]);
    if (state.activeHook.type !== 'COMBAT') throw new Error('combat expected');
    state.activeHook.combat.monsters.push({ monster: { ...dummyMonster, id: 'dummy-2', name: 'Second Dummy' }, hp: 100, block: 0, patternIndex: 0 });
    const result = playCard(state, whirlwind.instanceId);
    if (result.activeHook.type !== 'COMBAT') throw new Error('combat should continue');
    expect(result.activeHook.combat.combatLog.filter((entry) => entry.includes('Played Whirlwind on'))).toHaveLength(2);
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

  it('adds Final Smash damage for each chosen discard', () => {
    const finalSmash = card('final_smash', 'final');
    const fuel = card('melee_atk', 'fuel');
    const state = combatState([finalSmash, fuel]);
    const result = playCard(state, finalSmash.instanceId, 0, [fuel.instanceId]);
    if (result.activeHook.type !== 'COMBAT') throw new Error('combat should continue');
    expect(result.activeHook.combat.combatLog.find((entry) => entry.includes('Played Final Smash'))).toContain('11 DMG');
  });
});

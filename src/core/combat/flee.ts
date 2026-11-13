import { syncAudioState } from '../audio';
import { appendGameLog, createTimestamp } from '../log';
import { roll3D6 } from '../rng';
import { computeCombatGearBonuses, getEffectiveStatsFromState, getPlayerEva } from '../stats';
import { ActiveCombatState, CombatAttackRollSummary, CombatMonster, RunState } from '../types';
import { FLEE_AP_COST } from './constants';
import { getHeroStatDebuffMods } from './debuffs';
import { computeHitProbability } from './rolls';

export function computeFleeNetAcc(playerEva: number, livingMonsters: CombatMonster[]): number {
  const totalEnemyAcc = livingMonsters
    .filter((m) => m.hp > 0)
    .reduce((sum, m) => sum + (m.monster.acc ?? 0), 0);
  return playerEva - totalEnemyAcc;
}

export function attemptCombatFlee(state: RunState): RunState {
  if (state.activeHook.type !== 'COMBAT' || !state.playerResources) {
    return state;
  }

  const combat = { ...state.activeHook.combat };
  if (combat.playerAp < FLEE_AP_COST) {
    return state;
  }
  if (combat.monsters.some((m) => m.monster.isBoss)) {
    return state;
  }

  const effectiveStats = getEffectiveStatsFromState(state);
  const combatGear = computeCombatGearBonuses(state.equippedGear);
  const heroDebuffs = getHeroStatDebuffMods(combat);
  const playerEva = getPlayerEva(effectiveStats, combat.playerEvasionMod + heroDebuffs.eva, combatGear.eva);

  const livingMonsters = combat.monsters.filter((m) => m.hp > 0);
  const netFlee = computeFleeNetAcc(playerEva, livingMonsters);

  const hitProb = computeHitProbability(netFlee);
  const { die1, die2, die3, total: rollTotal, nextState: nextRng } = roll3D6(state.rngState);

  const isDiabolic = rollTotal === 3 || rollTotal === 18;
  const isSuccess = !isDiabolic && rollTotal >= hitProb.minHitRoll && rollTotal <= hitProb.maxHitRoll;
  const time = createTimestamp(state.logTimestamp);

  const fleeRollSummary: CombatAttackRollSummary = {
    attackerName: 'Hero',
    targetName: livingMonsters.map((m) => m.monster.name).join(', ') || 'Enemies',
    actionName: 'Flee',
    die1,
    die2,
    die3,
    total: rollTotal,
    netAcc: netFlee,
    minHitRoll: hitProb.minHitRoll,
    maxHitRoll: hitProb.maxHitRoll,
    isHit: isSuccess,
    isDiabolic,
    damageDealt: 0,
    damageBlocked: 0,
  };

  if (isSuccess) {
    const monstersToDiscard = combat.monsters.map((m) => m.monster);
    return syncAudioState({
      ...state,
      rngState: nextRng,
      monsterDiscard: [...state.monsterDiscard, ...monstersToDiscard],
      activeHook: { type: 'NONE', lastAttackRolls: [fleeRollSummary] },
      gameLog: appendGameLog(
        state,
        `[${time}] 🏃 Escaped from battle! Rolled 3d6 [${die1}, ${die2}, ${die3}] = ${rollTotal} (Hit Range: ${hitProb.minHitRoll}–${hitProb.maxHitRoll}, Net: ${netFlee >= 0 ? `+${netFlee}` : netFlee}). No rewards collected.`
      ),
      bannerMessage: `🏃 Escaped from battle! Rolled 3d6 = ${rollTotal} (Hit Range: ${hitProb.minHitRoll}–${hitProb.maxHitRoll}). No rewards collected.`,
    });
  }

  const updatedCombat: ActiveCombatState = {
    ...combat,
    playerAp: combat.playerAp - FLEE_AP_COST,
    combatLog: [
      ...combat.combatLog,
      `[${time}] 🏃 Attempted to flee: rolled 3d6 [${die1}, ${die2}, ${die3}] = ${rollTotal} (Hit Range: ${hitProb.minHitRoll}–${hitProb.maxHitRoll}, Net: ${netFlee >= 0 ? `+${netFlee}` : netFlee}) -> Failed to escape!`,
    ],
    lastAttackRoll: fleeRollSummary,
    lastAttackRolls: [fleeRollSummary],
    lastFleeRoll: {
      roll: rollTotal,
      threshold: hitProb.minHitRoll,
      success: false,
    },
  };

  return {
    ...state,
    rngState: nextRng,
    activeHook: {
      type: 'COMBAT',
      combat: updatedCombat,
    },
    gameLog: appendGameLog(
      state,
      `[${time}] 🏃 Attempted to flee: rolled 3d6 [${die1}, ${die2}, ${die3}] = ${rollTotal} (Hit Range: ${hitProb.minHitRoll}–${hitProb.maxHitRoll}, Net: ${netFlee >= 0 ? `+${netFlee}` : netFlee}) -> Failed to escape!`
    ),
  };
}

import { getPlayerAcc, getPlayerAtk, getPlayerDef } from '../stats';
import { CharacterStats, ActionCardDef, CombatGearBonuses } from '../types';

export interface ComputedCardEffect {
  damage: number;
  block: number;
  evasionBonus: number;
  accBonus: number;
}

export function computeCardEffect(
  card: ActionCardDef,
  effectiveStats: CharacterStats,
  gearCombatBonuses?: CombatGearBonuses,
  extraAtkBonus = 0,
  discardedCardCount = 0,
  extraAccBonus = 0,
  extraDefBonus = 0,
): ComputedCardEffect {
  let damage = card.baseDamage;
  const liveAcc = getPlayerAcc(effectiveStats, gearCombatBonuses?.acc ?? 0) + extraAccBonus;
  if (card.damageScalingStat) {
    const divisor = card.damageScalingDivisor ?? 2;
    const multiplier = card.damageScalingMultiplier ?? 1;
    const baseStatVal = card.damageScalingStat === 'atk'
      ? getPlayerAtk(effectiveStats, gearCombatBonuses?.atk ?? 0) + extraAtkBonus
      : effectiveStats[card.damageScalingStat as keyof CharacterStats];
    const statVal =
      card.damageAddsAccuracy && card.damageScalingIncludesAccuracy
        ? baseStatVal + liveAcc
        : baseStatVal;
    const scaledDamage =
      card.damageScalingRound === 'ceil'
        ? Math.ceil((statVal / divisor) * multiplier)
        : Math.floor(statVal / divisor) * multiplier;
    damage += scaledDamage;
    if (card.damageScalingStat === 'str') {
      damage += Math.floor(effectiveStats.dex / 3) + (gearCombatBonuses?.atk ?? 0) + extraAtkBonus;
    } else if (card.damageScalingStat === 'int') {
      damage += gearCombatBonuses?.matk ?? 0;
    }
  }
  if (card.damageAddsAccuracy && !card.damageScalingIncludesAccuracy) {
    damage += liveAcc;
  }
  damage += (card.damagePerDiscard ?? 0) * discardedCardCount;

  let block = card.baseBlock;
  if (card.blockScalingStat && card.baseBlock > 0) {
    const divisor = card.blockScalingDivisor ?? 2;
    const multiplier = card.blockScalingMultiplier ?? 1;
    const statVal =
      card.blockScalingStat === 'def'
        ? getPlayerDef(effectiveStats, gearCombatBonuses?.def ?? 0, extraDefBonus)
        : card.blockScalingStat === 'dex_agi'
        ? effectiveStats.dex + effectiveStats.agi
        : effectiveStats[card.blockScalingStat as keyof CharacterStats];
    block +=
      card.blockScalingRound === 'ceil'
        ? Math.ceil((statVal / divisor) * multiplier)
        : Math.floor(statVal / divisor) * multiplier;
  }

  let evasionBonus = 0;
  if (card.evasionScalingStat) {
    evasionBonus = card.evasionMultiplier ?? 1;
  }

  const accBonus = card.accBonus ?? 0;

  return { damage, block, evasionBonus, accBonus };
}

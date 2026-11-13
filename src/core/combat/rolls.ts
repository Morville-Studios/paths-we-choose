import { roll3D6 } from '../rng';

export interface HitProbability {
  hitCombos: number;
  totalCombos: number;
  hitPercent: number;
  diabolicPercent: number;
  minHitRoll: number;
  maxHitRoll: number;
  bonus: number;
}

/**
 * Calculates the exact 3d6 Success Roll Range hit probability (MACG-3D6™).
 * - Roll range: 3 to 18 (216 combinations).
 * - Tier 4 (+0 Net ACC) is the baseline center at [7..14] (81.5% probability).
 * - Each +1 Net ACC expands outward: Tier 5 (+1 Net ACC) [6..15], Tier 6 (+2 Net ACC) [5..16], Tier 7 (>= +3 Net ACC) [4..17] (99.1% max).
 * - Negative Net ACC contracts inward: Tier 3 (-1 Net ACC) [8..13], Tier 2 (-2 Net ACC) [9..12], Tier 1 (<= -3 Net ACC) [10..11] (25.0% Sure Hit Rolls).
 * - Rolls of 3 and 18 are "Diabolic rolls" and always guarantee a miss regardless of ACC.
 * - Hit Range: [max(4, 10 - expansion) .. min(17, 11 + expansion)] where expansion = clamp(0, 6, 3 + netAcc).
 */
export function computeHitProbability(netAcc: number): HitProbability {
  const expansion = Math.max(0, Math.min(6, 3 + netAcc));
  const minHitRoll = Math.max(4, 10 - expansion);
  const maxHitRoll = Math.min(17, 11 + expansion);

  let hitCombos = 0;
  for (let d1 = 1; d1 <= 6; d1++) {
    for (let d2 = 1; d2 <= 6; d2++) {
      for (let d3 = 1; d3 <= 6; d3++) {
        const sum = d1 + d2 + d3;
        if (sum >= minHitRoll && sum <= maxHitRoll && sum !== 3 && sum !== 18) {
          hitCombos++;
        }
      }
    }
  }

  const hitPercent = Math.round((hitCombos / 216) * 1000) / 10;
  const diabolicPercent = Math.round((2 / 216) * 1000) / 10;
  return {
    hitCombos,
    totalCombos: 216,
    hitPercent,
    diabolicPercent,
    minHitRoll,
    maxHitRoll,
    bonus: expansion,
  };
}

export interface CombatAttackRoll {
  die1: number;
  die2: number;
  die3: number;
  total: number;
  isDiabolic: boolean;
  isTriples: boolean;
  isPair: boolean;
  matchingDie?: number;
  attackerAcc: number;
  targetEva: number;
  netAcc: number;
  minHitRoll: number;
  maxHitRoll: number;
  isHit: boolean;
  nextState: number;
}

/**
 * Evaluates an attack using the 3d6 Quick Time Event (QTE) Distance / Hit Check Bar.
 */
export function evaluateAttackRoll(
  rngState: number,
  attackerAcc: number,
  targetEva: number
): CombatAttackRoll {
  const { die1, die2, die3, total, isTriples, isPair, matchingDie, nextState } = roll3D6(rngState);
  const netAcc = attackerAcc - targetEva;
  const expansion = Math.max(0, Math.min(6, 3 + netAcc));
  const isDiabolic = total === 3 || total === 18;
  const minHitRoll = Math.max(4, 10 - expansion);
  const maxHitRoll = Math.min(17, 11 + expansion);

  const isHit = !isDiabolic && total >= minHitRoll && total <= maxHitRoll;

  return {
    die1,
    die2,
    die3,
    total,
    isDiabolic,
    isTriples,
    isPair,
    matchingDie,
    attackerAcc,
    targetEva,
    netAcc,
    minHitRoll,
    maxHitRoll,
    isHit,
    nextState,
  };
}

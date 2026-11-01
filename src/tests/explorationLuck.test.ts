import { describe, expect, it } from 'vitest';
import { resolveUndiscoveredExploration } from '../core/engine';

describe('Undiscovered terrain Luck modifier', () => {
  it('adds one effective exploration roll per full five LUK', () => {
    expect(resolveUndiscoveredExploration(1, 1, 4)).toEqual({ luckBonus: 0, effectiveRoll: 1, outcome: 'combat' });
    expect(resolveUndiscoveredExploration(1, 1, 5)).toEqual({ luckBonus: 1, effectiveRoll: 2, outcome: 'safe' });
    expect(resolveUndiscoveredExploration(4, 3, 10)).toEqual({ luckBonus: 2, effectiveRoll: 6, outcome: 'treasure' });
  });

  it('treats every effective roll of six or more as treasure before checking ambush level', () => {
    expect(resolveUndiscoveredExploration(5, 5, 5)).toMatchObject({ effectiveRoll: 6, outcome: 'treasure' });
    expect(resolveUndiscoveredExploration(6, 6, 0)).toMatchObject({ effectiveRoll: 6, outcome: 'treasure' });
  });
});

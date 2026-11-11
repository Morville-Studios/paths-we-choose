import { describe, expect, it } from 'vitest';
import { resolveUndiscoveredExploration } from '../core/engine';

describe('Undiscovered terrain pure 1d6 exploration roll', () => {
  it('resolves pure 1d6 rolls against terrain level without stat modifiers', () => {
    expect(resolveUndiscoveredExploration(1, 1)).toEqual({ effectiveRoll: 1, outcome: 'combat' });
    expect(resolveUndiscoveredExploration(2, 1)).toEqual({ effectiveRoll: 2, outcome: 'safe' });
    expect(resolveUndiscoveredExploration(6, 3)).toEqual({ effectiveRoll: 6, outcome: 'treasure' });
  });

  it('treats every roll of six as treasure before checking ambush level', () => {
    expect(resolveUndiscoveredExploration(6, 5)).toMatchObject({ effectiveRoll: 6, outcome: 'treasure' });
    expect(resolveUndiscoveredExploration(6, 6)).toMatchObject({ effectiveRoll: 6, outcome: 'treasure' });
  });
});

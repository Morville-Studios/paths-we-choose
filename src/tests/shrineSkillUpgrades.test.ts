import { describe, expect, it } from 'vitest';
import { startAdventure } from '../core/engine';
import { getShrineSkillUpgradeOptions, upgradeShrineSkill } from '../core/shrine';
import { createCombatCardInstance, getVoidCards } from '../data/combatCards';
import { pileModal, renderPlayArea, UiState } from '../ui/render';

const ui: UiState = { selectedClass: 'fighter', showDeck: false, villageTab: 'buy', targetIndex: 0 };

function atShrine(level: number, cardId: string) {
  const base = startAdventure('fighter', `skill-shrine-${level}-${cardId}`);
  const coord = { col: 0, row: 0 };
  const board = {
    ...base.board,
    '0.0,0': {
      ...base.board['0.0,0'],
      card: { ...base.board['0.0,0'].card, level, hasShrine: true },
    },
  };
  return {
    ...base,
    board,
    playerMasterDeck: [...base.playerMasterDeck, createCombatCardInstance(cardId, 'owned')],
    playerResources: { ...base.playerResources!, gold: 100, statPoints: 100 },
    activeHook: { type: 'SHRINE' as const, shrine: { coord, turn: 1 } },
  };
}

describe('Void skill upgrades at Shrines', () => {
  it('keeps every + card in the inexhaustible Void rather than the New Skills deck', () => {
    expect(getVoidCards().map((card) => card.id).sort()).toEqual([
      'battlecry_plus', 'fortify_plus', 'high_strike_plus', 'parry_plus', 'whirlwind_plus',
    ]);
    const state = startAdventure('fighter', 'void-sidebar');
    expect(renderPlayArea(state, ui)).toContain('data-pile="void_deck"');
    const voidModal = pileModal('void_deck', state);
    expect(voidModal).toContain('The Void');
    expect(voidModal).toContain('VOID UPGRADE');
    expect(voidModal).toContain('Goblin Chieftain');
    expect(voidModal).toContain('Troll Healer');
    expect(voidModal).toContain('Wizard');
    expect(voidModal).toContain('Rogue');
    expect(voidModal).not.toContain('Fighter hero card (in the Void)');
  });

  it('allows Level 2 Shrines to replace owned 1 AP cards for 10 Gold and 2 SP', () => {
    const state = atShrine(2, 'iron_parry');
    const option = getShrineSkillUpgradeOptions(state).find((candidate) => candidate.source.id === 'iron_parry');
    expect(option).toMatchObject({ upgrade: { id: 'parry_plus' }, goldCost: 10, statPointCost: 2 });

    const upgraded = upgradeShrineSkill(state, option!.source.instanceId);
    expect(upgraded.playerMasterDeck.some((card) => card.id === 'parry_plus')).toBe(true);
    expect(upgraded.playerMasterDeck.some((card) => card.id === 'iron_parry')).toBe(false);
    expect(upgraded.playerResources).toMatchObject({ gold: 90, statPoints: 98 });
  });

  it('reserves the 2 AP to 3 AP upgrade route for Level 3 Shrines at 30 Gold and 6 SP', () => {
    const level2 = atShrine(2, 'heavy_cleave');
    expect(getShrineSkillUpgradeOptions(level2).some((candidate) => candidate.upgrade.id === 'high_strike_plus')).toBe(false);

    const level3 = atShrine(3, 'heavy_cleave');
    const option = getShrineSkillUpgradeOptions(level3).find((candidate) => candidate.upgrade.id === 'high_strike_plus');
    expect(option).toMatchObject({ goldCost: 30, statPointCost: 6 });
    const upgraded = upgradeShrineSkill(level3, option!.source.instanceId);
    expect(upgraded.playerMasterDeck.some((card) => card.id === 'high_strike_plus')).toBe(true);
    expect(upgraded.playerResources).toMatchObject({ gold: 70, statPoints: 94 });
  });
});

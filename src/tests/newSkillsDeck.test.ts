import { describe, expect, it } from 'vitest';
import { drawNewSkillsWithReshuffle } from '../core/deck';
import { finishVillage, startAdventure, villageDoTrainDraft, villageChooseTrain } from '../core/engine';
import { reconcileRunNewSkills } from '../core/newSkills';
import { getVoidCards } from '../data/combatCards';
import { prepareVillage } from '../core/village';
import { pileModal, renderPlayArea, UiState } from '../ui/render';

const ui: UiState = { selectedClass: 'fighter', showDeck: false, villageTab: 'buy', targetIndex: 0 };

describe('New Skills Deck', () => {
  it('keeps starter cards exclusive to the 8/2 starting deck and gives every other class skill two copies', () => {
    const fighter = finishVillage(startAdventure('fighter', 'new-skills-fighter'));
    const allSkills = [...fighter.newSkillsDeck, ...fighter.newSkillsDiscard];
    expect(fighter.playerMasterDeck.filter((card) => card.id === 'melee_atk')).toHaveLength(8);
    expect(fighter.playerMasterDeck.filter((card) => card.id === 'shield_def')).toHaveLength(2);
    expect(allSkills).toHaveLength(16);
    for (const id of ['heavy_cleave', 'iron_parry', 'battle_focus', 'whirlwind', 'battlecry', 'battle_flag', 'adrenalin', 'final_smash']) {
      expect(allSkills.filter((card) => card.id === id)).toHaveLength(2);
    }
    expect(allSkills.some((card) => card.isSkillUpgrade)).toBe(false);
    expect(allSkills.some((card) => card.id === 'melee_atk' || card.id === 'shield_def')).toBe(false);
  });

  it('draws training offers from the deck, transfers learned cards, and recycles only unlearned offers', () => {
    let state = finishVillage(startAdventure('fighter', 'new-skills-village'));
    state = { ...state, playerResources: { ...state.playerResources!, gold: 100, statPoints: 100 } };
    const beforeDeckLen = state.newSkillsDeck.length;
    const beforeDiscardLen = state.newSkillsDiscard.length;
    state = prepareVillage(state, { col: 0, row: 1 }, 1);
    expect(state.activeHook.type === 'VILLAGE' && state.activeHook.village.trainOptions).toHaveLength(3);
    expect(state.newSkillsDeck).toHaveLength(beforeDeckLen - 3);

    state = villageChooseTrain(state);
    if (state.activeHook.type !== 'VILLAGE') throw new Error('expected village');
    const offer = state.activeHook.village.trainOptions[0];
    const learned = villageDoTrainDraft(state, offer.instanceId);
    expect(learned.playerMasterDeck.some((card) => card.id === offer.id && card.instanceId.includes('_trained_t'))).toBe(true);
    expect(learned.newSkillsDeck).toHaveLength(beforeDeckLen - 3);
    const left = finishVillage(learned);
    expect(left.newSkillsDiscard).toHaveLength(beforeDiscardLen + 2);
    const allPhysicalSkills = [...left.newSkillsDeck, ...left.newSkillsDiscard, ...left.playerMasterDeck.filter((card) => card.instanceId.includes('_trained_'))];
    expect(allPhysicalSkills).toHaveLength(16);
  });

  it('shows the remaining learnable deck and supports deterministic discard recycling', () => {
    const state = startAdventure('fighter', 'new-skills-inspect');
    expect(renderPlayArea(state, ui)).toContain('data-pile="new_skills_deck"');
    const modal = pileModal('new_skills_deck', state);
    expect(modal).toContain('New Skills Deck');
    expect(modal).toContain('High Strike');
    expect(modal).not.toMatch(/data-card-id="heavy_cleave"[^>]*disabled/);
    expect(modal).not.toContain('data-action="play-card"');
    const drawn = drawNewSkillsWithReshuffle([], state.newSkillsDeck.slice(0, 2), 2, state.rngState, 0);
    expect(drawn.drawn).toHaveLength(2);
    expect(drawn.deck).toHaveLength(0);
    expect(drawn.discard).toHaveLength(0);
    expect(drawn.reshuffleCount).toBe(1);
  });

  it('upgrades an in-progress run to the complete two-copy skill catalog', () => {
    const fresh = finishVillage(startAdventure('fighter', 'new-skills-content-upgrade'));
    const allFresh = [...fresh.newSkillsDeck, ...fresh.newSkillsDiscard];
    const legacy = {
      ...fresh,
      newSkillsDiscard: [],
      newSkillsDeck: [
        ...allFresh.filter((card) => ['heavy_cleave', 'iron_parry', 'battle_focus'].includes(card.id)),
        ...getVoidCards(),
      ],
    };
    const upgraded = reconcileRunNewSkills(legacy);

    expect(upgraded.newSkillsDeck).toHaveLength(16);
    for (const id of ['heavy_cleave', 'iron_parry', 'battle_focus', 'whirlwind', 'battlecry', 'battle_flag', 'adrenalin', 'final_smash']) {
      expect(upgraded.newSkillsDeck.filter((card) => card.id === id)).toHaveLength(2);
    }
    expect(upgraded.newSkillsDeck.some((card) => card.isSkillUpgrade)).toBe(false);
    expect(upgraded.bannerMessage).toContain('10 missing skill cards');
    expect(upgraded.bannerMessage).toContain('5 Void upgrades removed');
  });

  it('counts a physically destroyed learnable card in the Void instead of recreating it', () => {
    const fresh = finishVillage(startAdventure('fighter', 'new-skills-destroyed-void'));
    const allFresh = [...fresh.newSkillsDeck, ...fresh.newSkillsDiscard];
    const destroyed = allFresh.find((card) => card.id === 'battlecry')!;
    const withDestroyedCard = {
      ...fresh,
      newSkillsDeck: fresh.newSkillsDeck.filter((card) => card.instanceId !== destroyed.instanceId),
      newSkillsDiscard: fresh.newSkillsDiscard.filter((card) => card.instanceId !== destroyed.instanceId),
      voidCards: [destroyed],
    };

    const reconciled = reconcileRunNewSkills(withDestroyedCard);
    expect(
      [...reconciled.newSkillsDeck, ...reconciled.newSkillsDiscard].filter((card) => card.id === 'battlecry')
    ).toHaveLength(1);
    expect(reconciled.voidCards?.filter((card) => card.id === 'battlecry')).toHaveLength(1);
    expect([
      ...reconciled.newSkillsDeck,
      ...reconciled.newSkillsDiscard,
      ...(reconciled.voidCards ?? []),
    ].filter((card) => card.id === 'battlecry')).toHaveLength(2);
  });
});

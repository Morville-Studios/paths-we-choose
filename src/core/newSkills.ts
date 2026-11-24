import { drawNewSkillsWithReshuffle, reconcileNewSkillsDeck } from './deck';
import { coordToKey } from './grid';
import { CombatCardDef, RunState } from './types';

/** Returns how many training skill cards a Village offers (2 + Village Level). */
export function getTrainOfferCount(villageLevel: number): number {
  return 2 + Math.max(1, villageLevel);
}

/**
 * Applies data-content additions to an in-progress run without requiring the
 * player to abandon it. New Skills are finite physical cards, so reconcile
 * across every location a learnable card can occupy before adding a copy.
 */
export function reconcileRunNewSkills(state: RunState): RunState {
  if (!state.playerClass) return state;

  const activeTrainOptions: CombatCardDef[] = state.activeHook.type === 'VILLAGE'
    ? state.activeHook.village.trainOptions
    : [];
  const reconciliation = reconcileNewSkillsDeck(
    state.playerClass,
    state.newSkillsDeck,
    state.newSkillsDiscard,
    state.playerMasterDeck,
    activeTrainOptions,
    state.voidCards ?? [],
    state.rngState
  );
  if (reconciliation.added.length === 0 && reconciliation.removed === 0) return state;

  const villageLevel = state.activeHook.type === 'VILLAGE'
    ? (state.board[coordToKey(state.activeHook.village.coord)]?.card?.level ?? 1)
    : 1;
  const targetOfferCount = getTrainOfferCount(villageLevel);
  const refill = state.activeHook.type === 'VILLAGE'
    ? drawNewSkillsWithReshuffle(
      reconciliation.deck,
      reconciliation.discard,
      Math.max(0, targetOfferCount - reconciliation.activeTrainOptions.length),
      reconciliation.nextState,
      state.newSkillsReshuffleCount,
      villageLevel
    )
    : null;
  const additionMessage = reconciliation.added.length > 0
    ? `${reconciliation.added.length} missing skill card${reconciliation.added.length === 1 ? '' : 's'} added`
    : '';
  const removalMessage = reconciliation.removed > 0
    ? `${reconciliation.removed} Void upgrade${reconciliation.removed === 1 ? '' : 's'} removed from training`
    : '';
  const summary = [additionMessage, removalMessage].filter(Boolean).join('; ');

  return {
    ...state,
    rngState: refill?.nextState ?? reconciliation.nextState,
    newSkillsDeck: refill?.deck ?? reconciliation.deck,
    newSkillsDiscard: refill?.discard ?? reconciliation.discard,
    newSkillsReshuffleCount: refill?.reshuffleCount ?? state.newSkillsReshuffleCount,
    activeHook: state.activeHook.type === 'VILLAGE'
      ? { type: 'VILLAGE', village: { ...state.activeHook.village, trainOptions: [...reconciliation.activeTrainOptions, ...(refill?.drawn ?? [])] } }
      : state.activeHook,
    bannerMessage: `${summary} in the New Skills Deck.`,
  };
}

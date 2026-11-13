import type { CombatAttackRollSummary, RunState } from '../core/types';
import type { Store } from '../state/store';
import type { UiState } from '../ui/render';

export interface ActionPayload {
  id?: string;
  stat?: string;
  col?: string;
  row?: string;
  pile?: string;
}

export interface ActionContext {
  root: HTMLElement;
  store: Store;
  ui: UiState;
  render: () => void;
  newSeed: () => string;
  clearTransientUiForNewAdventure: () => void;
  setCombatTarget: (newTarget: number) => void;
  navigateCombatTarget: (direction: -1 | 1) => void;
  selectHandCard: (index: number) => void;
  navigateHand: (direction: -1 | 1) => void;
  executeConfirmPlayCard: () => void;
  applyNextDiceRoll: () => void;
  settleActiveDiceRoll: () => void;
  runTransitionWithDiceRolls: (transition: (s: RunState) => RunState) => CombatAttackRollSummary[];
}

export type ActionHandler = (
  ctx: ActionContext,
  payload: ActionPayload,
  target: HTMLElement,
  event: MouseEvent
) => void;

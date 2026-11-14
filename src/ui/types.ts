import { ClassId, CombatAttackRollSummary, InspectedCardInfo, RunState, StatKey } from '../core/types';

export type PileType =
  | 'adventure_deck'
  | 'adventure_discard'
  | 'monster_deck'
  | 'monster_discard'
  | 'player_deck'
  | 'player_discard'
  | 'new_skills_deck'
  | 'new_skills_discard'
  | 'void_deck'
  | 'treasure_deck'
  | 'treasure_discard'
  | 'paths_deck'
  | 'paths_discard';

export interface QteBarOptions {
  minHitRoll: number;
  maxHitRoll: number;
  rolledTotal?: number;
  die1?: number;
  die2?: number;
  die3?: number;
  isHit?: boolean;
  netAcc?: number;
  hitPercent?: number;
  compact?: boolean;
}

export interface PendingCardPlay {
  cardInstanceId: string;
  targetIndex: number;
  discardedCardInstanceIds?: string[];
}

export interface PendingTrainingAction {
  kind: 'learn' | 'destroy';
  cardInstanceId: string;
}

export interface PendingDiceRoll {
  roll: CombatAttackRollSummary;
  nextState?: RunState;
  settled: boolean;
}

export type PendingShrineAction =
  | { kind: 'upgrade-stat'; stat: StatKey }
  | { kind: 'upgrade-skill'; sourceInstanceId: string }
  | { kind: 'leave' };

export type PendingSaveAction =
  | { kind: 'overwrite'; slotId: 2 | 3 | 4 | 5 }
  | { kind: 'delete'; slotId: 1 | 2 | 3 | 4 | 5 };

export interface UiState {
  handIndex?: number;
  selectedClass: ClassId | null;
  showDeck: boolean;
  villageTab: 'buy' | 'sell';
  targetIndex: number;
  inspectedCard?: InspectedCardInfo | null;
  inspectedPile?: PileType | null;
  pendingCardPlay?: PendingCardPlay | null;
  pendingDiceRolls?: PendingDiceRoll[] | null;
  pendingFlee?: boolean;
  pendingEndTurn?: boolean;
  pendingUseItemId?: string | null;
  pendingSellItemId?: string | null;
  pendingTrainingAction?: PendingTrainingAction | null;
  pendingShrineAction?: PendingShrineAction | null;
  selectedShrineStat?: StatKey | null;
  inspectedStat?: StatKey | null;
  villageRestTicks?: number;
  showGuide?: boolean;
  guidePage?: number;
  showLog?: boolean;
  showSaves?: boolean;
  pendingSaveAction?: PendingSaveAction | null;
}

/** True when keyboard/carousel input must not reach gameplay behind an overlay. */
export function hasBlockingUiOverlay(ui: UiState): boolean {
  return Boolean(
    ui.inspectedCard
    || ui.inspectedPile
    || ui.inspectedStat
    || ui.showDeck
    || ui.pendingCardPlay
    || (ui.pendingDiceRolls && ui.pendingDiceRolls.length > 0)
    || ui.pendingFlee
    || ui.pendingEndTurn
    || ui.pendingUseItemId
    || ui.pendingSellItemId
    || ui.pendingTrainingAction
    || ui.pendingShrineAction
    || ui.pendingSaveAction
    || ui.showGuide
    || ui.showLog
    || ui.showSaves
  );
}

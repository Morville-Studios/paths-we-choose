import { attemptFlee, endTurn } from '../../core/engine';
import type { CombatCardDef } from '../../core/types';
import type { ActionHandler } from '../types';

export const combatActions: Record<string, ActionHandler> = {
  'prev-hand-card': ({ navigateHand }) => navigateHand(-1),
  'next-hand-card': ({ navigateHand }) => navigateHand(1),

  'select-hand-card': ({ selectHandCard }, { id }) => {
    selectHandCard(Number(id));
  },

  'play-card': ({ store, ui, render }, { id }) => {
    const curState = store.get();
    if (curState.activeHook.type !== 'COMBAT') return;
    const combat = curState.activeHook.combat;
    const card = combat.hand.find((c: CombatCardDef) => c.instanceId === id);
    if (card && combat.playerAp >= card.apCost) {
      ui.pendingCardPlay = {
        cardInstanceId: id as string,
        targetIndex: ui.targetIndex,
        discardedCardInstanceIds: [],
      };
      render();
    }
  },

  'apply-dice-roll': ({ applyNextDiceRoll }) => {
    applyNextDiceRoll();
  },

  'skip-or-apply-dice': ({ ui, settleActiveDiceRoll, applyNextDiceRoll }, _payload, target, ev) => {
    if (!ui.pendingDiceRolls || ui.pendingDiceRolls.length === 0) return;
    if (!ui.pendingDiceRolls[0].settled) {
      settleActiveDiceRoll();
    } else if (ev.target === target) {
      applyNextDiceRoll();
    }
  },

  'confirm-play-card': ({ executeConfirmPlayCard }) => {
    executeConfirmPlayCard();
  },

  'toggle-card-discard': ({ ui, render }, { id }) => {
    if (!ui.pendingCardPlay || !id) return;
    const current = ui.pendingCardPlay.discardedCardInstanceIds ?? [];
    ui.pendingCardPlay.discardedCardInstanceIds = current.includes(id)
      ? current.filter((instanceId) => instanceId !== id)
      : [...current, id];
    render();
  },

  'cancel-play-card': ({ ui, render }) => {
    ui.pendingCardPlay = null;
    render();
  },

  'close-confirm-backdrop': ({ ui, render }, _payload, target, ev) => {
    if (ev.target === target) {
      ui.pendingCardPlay = null;
      render();
    }
  },

  'confirm-switch-target': ({ setCombatTarget }, { id }) => {
    setCombatTarget(Number(id));
  },

  target: ({ setCombatTarget }, { id }) => {
    setCombatTarget(Number(id));
  },

  'prev-target': ({ navigateCombatTarget }) => navigateCombatTarget(-1),
  'next-target': ({ navigateCombatTarget }) => navigateCombatTarget(1),

  'end-turn': ({ store, ui, render, runTransitionWithDiceRolls }) => {
    const curState = store.get();
    if (curState.activeHook.type === 'COMBAT' && curState.activeHook.combat.playerAp > 0) {
      ui.pendingCardPlay = null;
      ui.pendingFlee = false;
      ui.pendingEndTurn = true;
      render();
      return;
    }
    ui.pendingEndTurn = false;
    ui.handIndex = 0;
    runTransitionWithDiceRolls(endTurn);
  },

  'confirm-end-turn': ({ ui, runTransitionWithDiceRolls }) => {
    ui.pendingEndTurn = false;
    ui.handIndex = 0;
    runTransitionWithDiceRolls(endTurn);
  },

  'cancel-end-turn': ({ ui, render }) => {
    ui.pendingEndTurn = false;
    render();
  },

  'cancel-end-turn-backdrop': ({ ui, render }, _payload, target, ev) => {
    if (ev.target === target) {
      ui.pendingEndTurn = false;
      render();
    }
  },

  'flee-card': ({ store, ui, render }) => {
    const curState = store.get();
    if (curState.activeHook.type === 'COMBAT' && curState.activeHook.combat.playerAp >= 2) {
      ui.pendingCardPlay = null;
      ui.pendingFlee = true;
      render();
    }
  },

  'confirm-flee': ({ ui, runTransitionWithDiceRolls }) => {
    ui.pendingFlee = false;
    runTransitionWithDiceRolls(attemptFlee);
  },

  'cancel-flee': ({ ui, render }) => {
    ui.pendingFlee = false;
    render();
  },

  'cancel-flee-backdrop': ({ ui, render }, _payload, target, ev) => {
    if (ev.target === target) {
      ui.pendingFlee = false;
      render();
    }
  },
};

import {
  buyItem,
  finishVillage,
  leaveShrine,
  sellItem,
  shrineDoChoosePrayer,
  shrinePray,
  shrineUpgradeSkill,
  shrineUpgradeStat,
  villageChooseShop,
  villageChooseTrain,
  villageDoRest,
  villageDoTrainDraft,
  villageVisitShrine,
  villageDoTrainRemove,
  villageGoBack,
} from '../../core/engine';
import type { ShrinePrayerOptionId, StatKey } from '../../core/types';
import type { ActionHandler } from '../types';

export const villageAndShrineActions: Record<string, ActionHandler> = {
  upgrade: ({ store }, { stat }) => {
    store.update((s) => shrineUpgradeStat(s, stat as StatKey));
  },

  'shrine-upgrade': ({ store }, { stat }) => {
    store.update((s) => shrineUpgradeStat(s, stat as StatKey));
  },

  'select-shrine-stat': ({ ui, render }, { stat }) => {
    ui.selectedShrineStat = stat as StatKey;
    render();
  },

  'request-shrine-stat-upgrade': ({ ui, render }, { stat }) => {
    if (!stat) return;
    ui.selectedShrineStat = stat as StatKey;
    ui.pendingShrineAction = { kind: 'upgrade-stat', stat: stat as StatKey };
    render();
  },

  'request-shrine-skill-upgrade': ({ ui, render }, { id }) => {
    if (!id) return;
    ui.pendingShrineAction = { kind: 'upgrade-skill', sourceInstanceId: id };
    render();
  },

  'shrine-pray': ({ store }) => {
    store.update(shrinePray);
  },

  'shrine-choose-prayer': ({ store }, { id }) => {
    store.update((s) => shrineDoChoosePrayer(s, id as ShrinePrayerOptionId));
  },

  'request-leave-shrine': ({ store, ui, render }) => {
    const cur = store.get();
    if (cur.activeHook.type === 'SHRINE' && cur.activeHook.shrine.returnToVillage) {
      ui.selectedShrineStat = null;
      ui.pendingShrineAction = null;
      store.update(leaveShrine);
      return;
    }
    ui.pendingShrineAction = { kind: 'leave' };
    render();
  },

  'cancel-shrine-action': ({ ui, render }) => {
    ui.pendingShrineAction = null;
    render();
  },

  'cancel-shrine-action-backdrop': ({ ui, render }, _payload, target, ev) => {
    if (ev.target === target) {
      ui.pendingShrineAction = null;
      render();
    }
  },

  'confirm-shrine-action': ({ store, ui, render }) => {
    const pending = ui.pendingShrineAction;
    ui.pendingShrineAction = null;
    if (pending?.kind === 'upgrade-stat') {
      store.update((s) => shrineUpgradeStat(s, pending.stat));
    } else if (pending?.kind === 'upgrade-skill') {
      store.update((s) => shrineUpgradeSkill(s, pending.sourceInstanceId));
    } else if (pending?.kind === 'leave') {
      ui.selectedShrineStat = null;
      store.update(leaveShrine);
    } else {
      render();
    }
  },

  'village-back': ({ store }) => {
    store.update(villageGoBack);
  },

  'village-rest': ({ store, ui }) => {
    store.update((s) => villageDoRest(s, ui.villageRestTicks));
  },

  'village-shop': ({ store, ui }) => {
    ui.villageTab = 'buy';
    store.update(villageChooseShop);
  },

  'village-train': ({ store }) => {
    store.update(villageChooseTrain);
  },

  'village-visit-shrine': ({ store }) => {
    store.update(villageVisitShrine);
  },

  'village-leave': ({ store, ui }) => {
    ui.villageRestTicks = undefined;
    ui.pendingTrainingAction = null;
    ui.pendingSellItemId = null;
    store.update(finishVillage);
  },

  buy: ({ store }, { id }) => {
    store.update((s) => buyItem(s, id as string));
  },

  sell: ({ store, ui, render }, { id }) => {
    const curState = store.get();
    const item = curState.backpack.find((i) => i.instanceId === id);
    if (!item) return;
    ui.pendingSellItemId = id as string;
    render();
  },

  'confirm-sell-item': ({ store, ui, render }) => {
    const targetId = ui.pendingSellItemId;
    ui.pendingSellItemId = null;
    if (targetId) {
      store.update((s) => sellItem(s, targetId));
    } else {
      render();
    }
  },

  'cancel-sell-item': ({ ui, render }) => {
    ui.pendingSellItemId = null;
    render();
  },

  'cancel-sell-item-backdrop': ({ ui, render }, _payload, target, ev) => {
    if (ev.target === target) {
      ui.pendingSellItemId = null;
      render();
    }
  },

  tab: ({ ui, render }, { id }) => {
    ui.villageTab = id as 'buy' | 'sell';
    render();
  },

  'train-draft': ({ ui, render }, { id }) => {
    ui.pendingTrainingAction = { kind: 'learn', cardInstanceId: id as string };
    render();
  },

  'train-remove': ({ ui, render }, { id }) => {
    ui.pendingTrainingAction = { kind: 'destroy', cardInstanceId: id as string };
    render();
  },

  'cancel-training-action': ({ ui, render }) => {
    ui.pendingTrainingAction = null;
    render();
  },

  'cancel-training-action-backdrop': ({ ui, render }, _payload, target, ev) => {
    if (ev.target === target) {
      ui.pendingTrainingAction = null;
      render();
    }
  },

  'confirm-training-action': ({ store, ui, render }) => {
    const pending = ui.pendingTrainingAction;
    ui.pendingTrainingAction = null;
    if (pending?.kind === 'learn') {
      store.update((s) => villageDoTrainDraft(s, pending.cardInstanceId));
    } else if (pending?.kind === 'destroy') {
      store.update((s) => villageDoTrainRemove(s, pending.cardInstanceId));
    } else {
      render();
    }
  },
};

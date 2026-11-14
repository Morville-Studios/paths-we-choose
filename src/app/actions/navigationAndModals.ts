import { audioManager } from '../../audio/audioManager';
import { GUIDE_PAGE_COUNT } from '../../ui/screens/guide';
import { firstLivingMonsterIndex } from '../../core/combat';
import {
  advancePathToTreasurePrompt,
  buyPathMerchantItem,
  chooseCard,
  confirmCombatVictory,
  confirmEncounterClear,
  confirmExplorationCombat,
  confirmExplorationSafe,
  confirmPathAmbushCombat,
  confirmPathChallengeDone,
  confirmPathSneakCombat,
  createInitialState,
  goToClassSelect,
  resolvePathChestAttempt,
  resolvePathSneakCheck,
  resolvePathSpringTrap,
  resolvePathTreasureCheck,
  restAtPathSanctuary,
  rollPathGoldStash,
  startAdventure,
  startBossCombat,
  startNextMission,
} from '../../core/engine';
import { reconcileRunNewSkills } from '../../core/newSkills';
import type { ClassId, RunState, StatKey } from '../../core/types';
import { equipItem, unequipItem, useConsumable } from '../../core/village';
import {
  AUTOSAVE_SLOT_ID,
  deleteSaveSlot,
  getSaveSlot,
  loadSaveSlot,
  MANUAL_SAVE_SLOT_IDS,
  SAVE_SLOT_IDS,
  saveManualSlot,
  type ManualSaveSlotId,
  type SaveSlotId,
} from '../../state/saveStorage';
import { forceGameUpdate } from '../../updates';
import { CLASS_CAROUSEL_ORDER, type PileType } from '../../ui/render';
import { findInspectedCard } from '../inspect';
import type { ActionContext, ActionHandler } from '../types';

function stepClassCarousel(ctx: ActionContext, direction: -1 | 1): void {
  const current = ctx.ui.selectedClass ?? 'fighter';
  const activeIdx =
    CLASS_CAROUSEL_ORDER.indexOf(current) >= 0 ? CLASS_CAROUSEL_ORDER.indexOf(current) : 0;
  const nextIdx =
    (activeIdx + direction + CLASS_CAROUSEL_ORDER.length) % CLASS_CAROUSEL_ORDER.length;
  ctx.ui.selectedClass = CLASS_CAROUSEL_ORDER[nextIdx];
  ctx.render();
}

function restoreSavedRun(ctx: ActionContext, restored: RunState): void {
  ctx.clearTransientUiForNewAdventure();
  ctx.ui.showSaves = false;
  ctx.ui.pendingSaveAction = null;
  if (restored.activeHook.type === 'COMBAT') {
    const living = firstLivingMonsterIndex(restored.activeHook.combat);
    ctx.ui.targetIndex = living >= 0 ? living : 0;
  }
  ctx.store.set(restored);
}

export const navigationAndModalActions: Record<string, ActionHandler> = {
  'toggle-audio': ({ render }) => {
    audioManager.toggleMute();
    render();
  },

  'open-pile': ({ store, ui, render }, { pile, id }) => {
    const targetPile = pile || id;
    if (targetPile === 'new_skills_deck' || targetPile === 'new_skills_discard') {
      store.update(reconcileRunNewSkills);
    }
    ui.inspectedPile = targetPile as PileType;
    render();
  },

  'close-pile': ({ ui, render }) => {
    ui.inspectedPile = null;
    ui.showDeck = false;
    render();
  },

  'close-pile-backdrop': ({ ui, render }, _payload, target, ev) => {
    if (ev.target === target) {
      ui.inspectedPile = null;
      ui.showDeck = false;
      render();
    }
  },

  'inspect-item': ({ store, ui, render }, _payload, target) => {
    const cardEl = target.closest<HTMLElement>('[data-inspect-kind]') ?? target;
    const info = findInspectedCard(store.get(), cardEl);
    if (info) {
      ui.inspectedCard = info;
      render();
    }
  },

  'inspect-monster': ({ store, ui, render }, _payload, target) => {
    const cardEl = target.closest<HTMLElement>('[data-inspect-kind="monster"]') ?? target;
    const info = findInspectedCard(store.get(), cardEl);
    if (info) {
      ui.inspectedCard = info;
      render();
    }
  },

  'inspect-adventure': ({ store, ui, render }, _payload, target) => {
    const cardEl = target.closest<HTMLElement>('[data-inspect-kind="adventure"]') ?? target;
    const info = findInspectedCard(store.get(), cardEl);
    if (info) {
      ui.inspectedCard = info;
      render();
    }
  },

  'inspect-action': ({ store, ui, render }, _payload, target) => {
    const cardEl = target.closest<HTMLElement>('[data-inspect-kind="action"]') ?? target;
    const info = findInspectedCard(store.get(), cardEl);
    if (info) {
      ui.inspectedCard = info;
      render();
    }
  },

  'inspect-path': ({ store, ui, render }, _payload, target) => {
    const cardEl = target.closest<HTMLElement>('[data-inspect-kind="path"]') ?? target;
    const info = findInspectedCard(store.get(), cardEl);
    if (info) {
      ui.inspectedCard = info;
      render();
    }
  },

  'close-inspect': ({ ui, render }) => {
    ui.inspectedCard = null;
    ui.inspectedStat = null;
    render();
  },

  'close-inspect-backdrop': ({ ui, render }, _payload, target, ev) => {
    if (ev.target === target) {
      ui.inspectedCard = null;
      ui.inspectedStat = null;
      render();
    }
  },

  'inspect-stat': ({ ui, render }, { stat }) => {
    ui.inspectedStat = (stat as StatKey) || null;
    render();
  },

  'open-guide': ({ ui, render }) => {
    ui.showGuide = true;
    if (!ui.guidePage) ui.guidePage = 1;
    render();
  },

  'close-guide': ({ ui, render }) => {
    ui.showGuide = false;
    render();
  },

  'close-guide-backdrop': ({ ui, render }, _payload, target, ev) => {
    if (ev.target === target) {
      ui.showGuide = false;
      render();
    }
  },

  'guide-prev-page': ({ ui, render }) => {
    ui.guidePage = Math.max(1, (ui.guidePage ?? 1) - 1);
    render();
  },

  'guide-next-page': ({ ui, render }) => {
    ui.guidePage = Math.min(GUIDE_PAGE_COUNT, (ui.guidePage ?? 1) + 1);
    render();
  },

  'guide-jump-page': ({ ui, render }, _payload, target) => {
    const pageAttr = target.getAttribute('data-page');
    if (!pageAttr) return;
    const pNum = parseInt(pageAttr, 10);
    if (pNum >= 1 && pNum <= GUIDE_PAGE_COUNT) {
      ui.guidePage = pNum;
      render();
    }
  },

  'guide-scroll-section': (_ctx, _payload, target) => {
    const targetId = target.getAttribute('data-target');
    if (targetId) {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },

  'open-log': ({ ui, render }) => {
    ui.showLog = true;
    render();
  },

  'close-log': ({ ui, render }) => {
    ui.showLog = false;
    render();
  },

  'close-log-backdrop': ({ ui, render }, _payload, target, ev) => {
    if (ev.target === target) {
      ui.showLog = false;
      render();
    }
  },

  'toggle-deck': ({ ui, render }) => {
    ui.showDeck = !ui.showDeck;
    render();
  },

  'prev-class': (ctx) => stepClassCarousel(ctx, -1),
  'next-class': (ctx) => stepClassCarousel(ctx, 1),

  start: ({ store, ui }) => {
    if (!ui.selectedClass) ui.selectedClass = 'fighter';
    store.update(goToClassSelect);
  },

  'select-class': ({ ui, render }, { id }) => {
    if (id) {
      ui.selectedClass = id as ClassId;
      render();
    }
  },

  embark: ({ store, ui, newSeed, clearTransientUiForNewAdventure }) => {
    const chosen = ui.selectedClass ?? 'fighter';
    const seed = newSeed();
    clearTransientUiForNewAdventure();
    store.set(startAdventure(chosen, seed));
  },

  'next-mission': ({ store }) => {
    store.update((s) => startNextMission(s));
  },

  restart: ({ store, ui, render, newSeed }) => {
    ui.selectedClass = null;
    store.set(createInitialState(newSeed()));
    render();
  },

  choose: ({ store, ui }, { col, row }) => {
    ui.selectedShrineStat = null;
    ui.pendingShrineAction = null;
    store.update((s) => chooseCard(s, { col: Number(col), row: Number(row) }));
  },

  equip: ({ store }, { id }) => {
    store.update((s) => equipItem(s, id as string));
  },

  unequip: ({ store }, { id }) => {
    store.update((s) => unequipItem(s, id as string));
  },

  'use-item': ({ store, ui, render }, { id }) => {
    const curState = store.get();
    const item = curState.backpack.find((i) => i.instanceId === id);
    if (!item || item.category !== 'consumable' || !curState.playerResources) return;
    if (item.healAmount && curState.playerResources.hp >= curState.playerResources.maxHp) return;
    ui.pendingUseItemId = id as string;
    render();
  },

  'confirm-use-item': ({ store, ui, render }) => {
    const targetId = ui.pendingUseItemId;
    ui.pendingUseItemId = null;
    if (targetId) {
      store.update((s) => useConsumable(s, targetId));
    } else {
      render();
    }
  },

  'cancel-use-item': ({ ui, render }) => {
    ui.pendingUseItemId = null;
    render();
  },

  'cancel-use-item-backdrop': ({ ui, render }, _payload, target, ev) => {
    if (ev.target === target) {
      ui.pendingUseItemId = null;
      render();
    }
  },

  'confirm-exploration-combat': ({ store }) => {
    store.update(confirmExplorationCombat);
  },

  'confirm-exploration-safe': ({ store }) => {
    store.update(confirmExplorationSafe);
  },

  'path-roll-sneak': ({ store }) => {
    store.update(resolvePathSneakCheck);
  },

  'path-start-combat': ({ store }) => {
    store.update(confirmPathSneakCombat);
  },

  'path-to-treasure': ({ store }) => {
    store.update(advancePathToTreasurePrompt);
  },

  'path-roll-treasure': ({ store }) => {
    store.update(resolvePathTreasureCheck);
  },

  'path-merchant-buy': ({ store }, { id }) => {
    if (id) store.update((s) => buyPathMerchantItem(s, id));
  },

  'path-sanctuary-rest': ({ store }) => {
    store.update(restAtPathSanctuary);
  },

  'path-ambush-combat': (ctx) => {
    ctx.runTransitionWithDiceRolls(confirmPathAmbushCombat);
  },

  'path-chest-force': ({ store }) => {
    store.update((s) => resolvePathChestAttempt(s, 'force_open'));
  },

  'path-chest-lockpick': ({ store }) => {
    store.update((s) => resolvePathChestAttempt(s, 'lockpick'));
  },

  'path-chest-seal': ({ store }) => {
    store.update((s) => resolvePathChestAttempt(s, 'remove_seal'));
  },

  'path-chest-abandon': ({ store }) => {
    store.update((s) => resolvePathChestAttempt(s, 'abandon'));
  },

  'path-gold-roll': ({ store }) => {
    store.update(rollPathGoldStash);
  },

  'path-spring-trap-roll': ({ store }) => {
    store.update(resolvePathSpringTrap);
  },

  'path-done': ({ store }) => {
    store.update(confirmPathChallengeDone);
  },

  'confirm-encounter-clear': ({ store }) => {
    store.update(confirmEncounterClear);
  },

  'confirm-victory': ({ store }) => {
    store.update(confirmCombatVictory);
  },

  'start-boss-battle': ({ store }) => {
    store.update(startBossCombat);
  },

  'continue-autosave': (ctx) => {
    const restored = loadSaveSlot(AUTOSAVE_SLOT_ID);
    if (restored) restoreSavedRun(ctx, restored);
  },

  'open-saves': ({ ui, render }) => {
    ui.showSaves = true;
    ui.pendingSaveAction = null;
    render();
  },

  'close-saves': ({ ui, render }) => {
    ui.showSaves = false;
    ui.pendingSaveAction = null;
    render();
  },

  'close-saves-backdrop': ({ ui, render }, _payload, target, ev) => {
    if (ev.target === target) {
      ui.showSaves = false;
      ui.pendingSaveAction = null;
      render();
    }
  },

  'save-slot': ({ store, ui, render }, { id }) => {
    const slotId = Number(id) as ManualSaveSlotId;
    if (!MANUAL_SAVE_SLOT_IDS.includes(slotId)) return;
    if (getSaveSlot(slotId)) {
      ui.pendingSaveAction = { kind: 'overwrite', slotId };
      render();
      return;
    }
    saveManualSlot(slotId, store.get());
    render();
  },

  'load-slot': (ctx, { id }) => {
    const slotId = Number(id) as SaveSlotId;
    if (!SAVE_SLOT_IDS.includes(slotId)) return;
    const restored = loadSaveSlot(slotId);
    if (restored) restoreSavedRun(ctx, restored);
  },

  'delete-slot': ({ ui, render }, { id }) => {
    const slotId = Number(id) as SaveSlotId;
    if (!SAVE_SLOT_IDS.includes(slotId)) return;
    ui.pendingSaveAction = { kind: 'delete', slotId };
    render();
  },

  'cancel-save-action': ({ ui, render }) => {
    ui.pendingSaveAction = null;
    render();
  },

  'confirm-save-action': ({ store, ui, render }) => {
    const pending = ui.pendingSaveAction;
    ui.pendingSaveAction = null;
    if (pending?.kind === 'overwrite') {
      saveManualSlot(pending.slotId, store.get());
    } else if (pending?.kind === 'delete') {
      deleteSaveSlot(pending.slotId);
    }
    render();
  },

  'force-update': (_ctx, _payload, target) => {
    (target as HTMLButtonElement).disabled = true;
    target.textContent = 'Updating...';
    void forceGameUpdate();
  },
};

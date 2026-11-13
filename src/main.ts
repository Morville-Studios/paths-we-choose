import './ui/styles.css';
import { audioManager } from './audio/audioManager';
import { ACTION_HANDLERS } from './app/actions';
import { createCombatAnimator } from './app/combatAnimator';
import { findInspectedCard } from './app/inspect';
import type { ActionContext } from './app/types';
import { firstLivingMonsterIndex } from './core/combat';
import { confirmCombatVictory, createInitialState, startAdventure, startBossCombat } from './core/engine';
import { computeCombatGearBonuses, getEffectiveStatsFromState, getPlayerAcc } from './core/stats';
import type { StatKey } from './core/types';
import { gameLanguageControl, getGameLocale, setGameLocale, type GameLocale } from './i18n';
import { localizeGameTree, observeLocalizedGame } from './i18n/presentation';
import { autosaveRun } from './state/saveStorage';
import { Store } from './state/store';
import {
  CLASS_CAROUSEL_ORDER,
  getHandCarouselIndex,
  hasBlockingUiOverlay,
  PileType,
  renderClassSelect,
  renderPlayArea,
  renderWelcome,
  UiState,
  updateClassCarouselDom,
  updateHandCarouselDom,
  updateMonsterCarouselDom,
} from './ui/render';
import { startUpdateMonitor } from './updates';

function newSeed(): string {
  return Date.now().toString(36);
}

const root = document.getElementById('app') as HTMLElement;
const languageControl = gameLanguageControl();
document.body.append(languageControl);
languageControl.querySelector('select')?.addEventListener('change', (event) => {
  setGameLocale((event.target as HTMLSelectElement).value as GameLocale);
  root.replaceChildren();
  render();
  const updateNotice = document.querySelector('.release-notice');
  if (updateNotice) localizeGameTree(updateNotice);
});
observeLocalizedGame(root);

const store = new Store(createInitialState(newSeed()));
startUpdateMonitor(() => {
  const state = store.get();
  return state.screen === 'play_area' && state.activeHook.type !== 'ON_GAME_OVER';
});

const ui: UiState = {
  selectedClass: null,
  showDeck: false,
  villageTab: 'buy',
  targetIndex: 0,
  inspectedCard: null,
  inspectedPile: null,
};

function render(): void {
  const languageSelect = languageControl.querySelector('select');
  if (languageSelect) languageSelect.value = getGameLocale();
  const s = store.get();

  const scroll = new Map<string, number>();
  root.querySelectorAll<HTMLElement>('.modal, .sheet').forEach((el, i) => scroll.set(String(i), el.scrollTop));

  const isMuted = audioManager.isTrackMuted();
  const audioBtnHtml = ui.showGuide
    ? ''
    : `<button class="audio-btn ${isMuted ? 'muted' : ''}" data-action="toggle-audio" title="${isMuted ? 'Unmute Music' : 'Mute Music'}" aria-label="Toggle Music">${isMuted ? '🔇' : '🔊'}</button>`;

  if (s.screen === 'welcome') {
    root.innerHTML =
      renderWelcome(
        Boolean(ui.showGuide),
        ui.guidePage ?? 1,
        ui.inspectedCard,
        ui.inspectedStat,
        s,
        Boolean(ui.showSaves),
        ui.pendingSaveAction ?? null
      ) + audioBtnHtml;
  } else if (s.screen === 'class_select') {
    if (!ui.selectedClass) ui.selectedClass = 'fighter';
    const updated = updateClassCarouselDom(root, ui.selectedClass);
    if (!updated) {
      root.innerHTML = renderClassSelect(ui) + audioBtnHtml;
    }
  } else {
    root.innerHTML = renderPlayArea(s, ui) + audioBtnHtml;
  }

  localizeGameTree(root);

  root.querySelectorAll<HTMLElement>('.modal, .sheet').forEach((el, i) => {
    el.scrollTop = scroll.get(String(i)) ?? 0;
  });
}

const combatAnimator = createCombatAnimator({ root, store, ui, render });

store.subscribe((state) => {
  autosaveRun(state);
  if (combatAnimator.isAnimating()) return;
  render();
  audioManager.sync(state);
});

function setCombatTarget(newTarget: number): void {
  if (combatAnimator.isAnimating()) return;
  ui.targetIndex = newTarget;
  if (ui.pendingCardPlay) {
    ui.pendingCardPlay.targetIndex = newTarget;
    render();
    return;
  }
  const s = store.get();
  if (s.activeHook?.type === 'COMBAT' && !ui.inspectedCard && !ui.inspectedPile && !ui.showDeck) {
    const stats = getEffectiveStatsFromState(s);
    const playerAcc = getPlayerAcc(stats, computeCombatGearBonuses(s.equippedGear).acc);
    const updated = updateMonsterCarouselDom(root, s.activeHook.combat, ui.targetIndex, playerAcc);
    if (!updated) render();
  } else {
    render();
  }
}

function navigateCombatTarget(direction: -1 | 1): void {
  if (hasBlockingUiOverlay(ui) || combatAnimator.isAnimating()) return;
  const s = store.get();
  if (s.activeHook?.type !== 'COMBAT') return;
  const combat = s.activeHook.combat;
  const livingIndices = combat.monsters
    .map((m, idx) => ({ m, idx }))
    .filter(({ m }) => m.hp > 0)
    .map(({ idx }) => idx);

  if (livingIndices.length <= 1) return;

  const currentTarget =
    combat.monsters[ui.targetIndex] && combat.monsters[ui.targetIndex].hp > 0
      ? ui.targetIndex
      : firstLivingMonsterIndex(combat);
  const currentPos = livingIndices.indexOf(currentTarget);
  const validPos = currentPos >= 0 ? currentPos : 0;
  const nextPos = (validPos + direction + livingIndices.length) % livingIndices.length;
  setCombatTarget(livingIndices[nextPos]);
}

function selectHandCard(index: number): void {
  const state = store.get();
  if (state.activeHook.type !== 'COMBAT' || hasBlockingUiOverlay(ui) || combatAnimator.isAnimating()) return;
  ui.handIndex = getHandCarouselIndex(index, state.activeHook.combat.hand.length);
  if (!updateHandCarouselDom(root, ui.handIndex)) render();
}

function navigateHand(direction: -1 | 1): void {
  const state = store.get();
  if (state.activeHook.type !== 'COMBAT' || combatAnimator.isAnimating()) return;
  const count = state.activeHook.combat.hand.length;
  if (count < 2) return;
  selectHandCard((getHandCarouselIndex(ui.handIndex ?? 0, count) + direction + count) % count);
}

// Pointer gestures: hand carousel swipe + long-press inspection (2s cards, 1s piles/stats)
let handSwipe: { x: number; y: number } | null = null;
let handSwipeConsumed = false;
let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let longPressTriggered = false;
let longPressGeneration = 0;
let startX = 0;
let startY = 0;

function clearLongPress(): void {
  longPressGeneration += 1;
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

function clearTransientUiForNewAdventure(): void {
  clearLongPress();
  longPressTriggered = false;
  handSwipe = null;
  handSwipeConsumed = false;
  ui.inspectedCard = null;
  ui.inspectedPile = null;
  ui.inspectedStat = null;
  ui.showDeck = false;
  ui.pendingCardPlay = null;
  ui.pendingFlee = false;
  ui.pendingTrainingAction = null;
  ui.pendingShrineAction = null;
  ui.selectedShrineStat = null;
  ui.showGuide = false;
  ui.showSaves = false;
  ui.pendingSaveAction = null;
  ui.handIndex = 0;
  ui.targetIndex = 0;
  ui.villageRestTicks = undefined;
}

root.addEventListener('dragstart', (ev) => {
  if ((ev.target as HTMLElement).closest('.hand-carousel-track')) ev.preventDefault();
});

root.addEventListener('input', (ev) => {
  const target = ev.target as HTMLInputElement;
  if (target.dataset.action !== 'set-village-rest-ticks') return;
  ui.villageRestTicks = Number(target.value);
  render();
});

root.addEventListener('pointerdown', (ev) => {
  const target = ev.target as HTMLElement;
  if (target.closest('.hand-carousel-track')) {
    handSwipe = { x: ev.clientX, y: ev.clientY };
  }

  if (ev.button !== 0 && ev.pointerType === 'mouse') return;
  const pileEl = target.closest<HTMLElement>('[data-pile]');
  const cardEl = target.closest<HTMLElement>('[data-inspect-kind]');
  const statEl = target.closest<HTMLElement>('[data-inspect-stat]');
  if (!pileEl && !cardEl && !statEl) return;

  clearLongPress();
  longPressTriggered = false;
  startX = ev.clientX;
  startY = ev.clientY;
  const generation = ++longPressGeneration;

  if (statEl) {
    longPressTimer = setTimeout(() => {
      if (generation !== longPressGeneration) return;
      longPressTimer = null;
      longPressTriggered = true;
      const stat = statEl.dataset.inspectStat as StatKey;
      if (stat) {
        ui.inspectedStat = stat;
        render();
      }
    }, 1000);
  } else if (pileEl) {
    longPressTimer = setTimeout(() => {
      if (generation !== longPressGeneration) return;
      longPressTimer = null;
      longPressTriggered = true;
      const pile = pileEl.dataset.pile as PileType;
      if (pile) {
        ui.inspectedPile = pile;
        render();
      }
    }, 1000);
  } else if (cardEl) {
    longPressTimer = setTimeout(() => {
      if (generation !== longPressGeneration) return;
      longPressTimer = null;
      longPressTriggered = true;
      const info = findInspectedCard(store.get(), cardEl);
      if (info) {
        ui.inspectedCard = info;
        render();
      }
    }, 2000);
  }
});

root.addEventListener('pointermove', (ev) => {
  if (!longPressTimer) return;
  if (Math.abs(ev.clientX - startX) > 10 || Math.abs(ev.clientY - startY) > 10) {
    clearLongPress();
  }
});

root.addEventListener('pointerup', (ev) => {
  clearLongPress();
  if (!handSwipe) return;
  const dx = ev.clientX - handSwipe.x;
  const dy = ev.clientY - handSwipe.y;
  handSwipe = null;
  if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;
  handSwipeConsumed = true;
  navigateHand(dx < 0 ? 1 : -1);
  window.setTimeout(() => {
    handSwipeConsumed = false;
  }, 250);
});

root.addEventListener('pointercancel', () => {
  handSwipe = null;
  clearLongPress();
});

// Right-click to inspect cards, deck/discard piles, or stats
root.addEventListener('contextmenu', (ev) => {
  const target = ev.target as HTMLElement;

  const statEl = target.closest<HTMLElement>('[data-inspect-stat]');
  if (statEl) {
    ev.preventDefault();
    ev.stopPropagation();
    const stat = statEl.dataset.inspectStat as StatKey;
    if (stat) {
      ui.inspectedStat = stat;
      render();
      return;
    }
  }

  const pileEl = target.closest<HTMLElement>('[data-pile], [data-pile-default]');
  if (pileEl) {
    ev.preventDefault();
    ev.stopPropagation();
    const pile = (pileEl.dataset.pile ?? pileEl.dataset.pileDefault) as PileType;
    if (pile) {
      ui.inspectedPile = pile;
      render();
      return;
    }
  }

  const cardEl = target.closest<HTMLElement>('[data-inspect-kind]');
  if (!cardEl) return;
  ev.preventDefault();
  ev.stopPropagation();
  const info = findInspectedCard(store.get(), cardEl);
  if (info) {
    ui.inspectedCard = info;
    render();
  }
});

window.addEventListener('keydown', (ev) => {
  if (combatAnimator.isTransitioningVictory() || combatAnimator.isAnimating()) return;
  const s = store.get();

  if (ui.pendingDiceRolls && ui.pendingDiceRolls.length > 0) {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      combatAnimator.applyNextDiceRoll();
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      combatAnimator.settleActiveDiceRoll();
    }
    return;
  }

  if (s.activeHook.type === 'BOSS_APPROACH' && (ev.key === 'Enter' || ev.key === ' ')) {
    ev.preventDefault();
    store.update(startBossCombat);
    return;
  }

  if (ui.pendingCardPlay && (ev.key === 'Enter' || ev.key === ' ')) {
    ev.preventDefault();
    combatAnimator.executeConfirmPlayCard();
    return;
  }

  if (ev.key === 'Escape') {
    if (ui.inspectedCard || ui.inspectedStat) {
      ui.inspectedCard = null;
      ui.inspectedStat = null;
      render();
    } else if (ui.inspectedPile || ui.showDeck) {
      ui.inspectedPile = null;
      ui.showDeck = false;
      render();
    } else if (ui.pendingCardPlay) {
      ui.pendingCardPlay = null;
      render();
    } else if (ui.pendingFlee) {
      ui.pendingFlee = false;
      render();
    } else if (ui.pendingTrainingAction) {
      ui.pendingTrainingAction = null;
      render();
    } else if (ui.pendingShrineAction) {
      ui.pendingShrineAction = null;
      render();
    } else if (ui.pendingSaveAction) {
      ui.pendingSaveAction = null;
      render();
    } else if (ui.showSaves) {
      ui.showSaves = false;
      render();
    } else if (ui.showGuide) {
      ui.showGuide = false;
      render();
    } else if (ui.showLog) {
      ui.showLog = false;
      render();
    }
    return;
  }

  if (ui.showGuide) {
    if (ev.key === 'ArrowLeft' || ev.key === 'a' || ev.key === 'A' || ev.key === 'PageUp') {
      ev.preventDefault();
      ui.guidePage = Math.max(1, (ui.guidePage ?? 1) - 1);
      render();
      return;
    }
    if (ev.key === 'ArrowRight' || ev.key === 'd' || ev.key === 'D' || ev.key === 'PageDown') {
      ev.preventDefault();
      ui.guidePage = Math.min(7, (ui.guidePage ?? 1) + 1);
      render();
      return;
    }
    if (['1', '2', '3', '4', '5', '6', '7'].includes(ev.key)) {
      ev.preventDefault();
      ui.guidePage = parseInt(ev.key, 10);
      render();
      return;
    }
  }

  if ((ev.key === 'l' || ev.key === 'L') && s.screen === 'play_area' && !hasBlockingUiOverlay(ui)) {
    ev.preventDefault();
    ui.showLog = true;
    render();
    return;
  }

  if (s.screen === 'class_select') {
    if (hasBlockingUiOverlay(ui)) return;
    const current = ui.selectedClass ?? 'fighter';
    const activeIdx = CLASS_CAROUSEL_ORDER.indexOf(current) >= 0 ? CLASS_CAROUSEL_ORDER.indexOf(current) : 0;

    if (ev.key === 'a' || ev.key === 'A' || ev.key === 'ArrowLeft') {
      ev.preventDefault();
      ui.selectedClass = CLASS_CAROUSEL_ORDER[(activeIdx - 1 + CLASS_CAROUSEL_ORDER.length) % CLASS_CAROUSEL_ORDER.length];
      render();
      return;
    }
    if (ev.key === 'd' || ev.key === 'D' || ev.key === 'ArrowRight') {
      ev.preventDefault();
      ui.selectedClass = CLASS_CAROUSEL_ORDER[(activeIdx + 1) % CLASS_CAROUSEL_ORDER.length];
      render();
      return;
    }
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      const seed = newSeed();
      clearTransientUiForNewAdventure();
      store.set(startAdventure(current, seed));
      return;
    }
  }

  if (s.screen === 'play_area' && s.activeHook?.type === 'VICTORY' && (ev.key === 'Enter' || ev.key === ' ')) {
    ev.preventDefault();
    store.update(confirmCombatVictory);
    return;
  }

  if (s.screen === 'play_area' && s.activeHook?.type === 'COMBAT') {
    if (hasBlockingUiOverlay(ui)) return;
    if (ev.key.toLowerCase() === 'q' || ev.key.toLowerCase() === 'e') {
      ev.preventDefault();
      navigateHand(ev.key.toLowerCase() === 'q' ? -1 : 1);
      return;
    }
    if (ev.key === 'a' || ev.key === 'A' || ev.key === 'ArrowLeft') {
      ev.preventDefault();
      const livingTargets = s.activeHook.combat.monsters.filter((monster) => monster.hp > 0).length;
      if (livingTargets <= 1) navigateHand(-1);
      else navigateCombatTarget(-1);
      return;
    }
    if (ev.key === 'd' || ev.key === 'D' || ev.key === 'ArrowRight') {
      ev.preventDefault();
      const livingTargets = s.activeHook.combat.monsters.filter((monster) => monster.hp > 0).length;
      if (livingTargets <= 1) navigateHand(1);
      else navigateCombatTarget(1);
    }
  }
});

const actionContext: ActionContext = {
  root,
  store,
  ui,
  render,
  newSeed,
  clearTransientUiForNewAdventure,
  setCombatTarget,
  navigateCombatTarget,
  selectHandCard,
  navigateHand,
  executeConfirmPlayCard: combatAnimator.executeConfirmPlayCard,
  applyNextDiceRoll: combatAnimator.applyNextDiceRoll,
  settleActiveDiceRoll: combatAnimator.settleActiveDiceRoll,
  runTransitionWithDiceRolls: combatAnimator.runTransitionWithDiceRolls,
};

root.addEventListener('click', (ev) => {
  if (combatAnimator.isTransitioningVictory() || combatAnimator.isAnimating()) return;
  if (handSwipeConsumed) {
    handSwipeConsumed = false;
    return;
  }
  if (longPressTriggered) {
    longPressTriggered = false;
    ev.preventDefault();
    ev.stopPropagation();
    return;
  }

  const handUnit = (ev.target as HTMLElement).closest<HTMLElement>('.hand-carousel-unit:not(.is-center)');
  if (handUnit?.dataset.handIndex !== undefined) {
    selectHandCard(Number(handUnit.dataset.handIndex));
    return;
  }

  const target = (ev.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!target || (target as HTMLButtonElement).disabled) return;
  const { action, id, stat, col, row, pile } = target.dataset;
  if (!action) return;

  const handler = ACTION_HANDLERS[action];
  if (handler) {
    handler(actionContext, { id, stat, col, row, pile }, target, ev);
  }
});

audioManager.sync(store.get());
render();

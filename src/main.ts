import './ui/styles.css';
import { startUpdateMonitor } from './updates';
import {
  attemptFlee,
  buyItem,
  chooseCard,
  confirmCombatVictory,
  confirmExplorationCombat,
  confirmExplorationSafe,
  createInitialState,
  dismissWelcomePrepare,
  endTurn,
  finishVillage,
  goToClassSelect,
  leaveShrine,
  playCard,
  sellItem,
  shrineDoChoosePrayer,
  shrinePray,
  shrineUpgradeStat,
  shrineUpgradeSkill,
  startAdventure,
  startNextMission,
  villageChooseShop,
  villageChooseTrain,
  villageDoRest,
  villageDoTrainDraft,
  villageDoTrainRemove,
  villageGoBack,
  welcomeUpgradeStat,
} from './core/engine';
import { equipItem, unequipItem, useConsumable } from './core/village';
import { CombatCardDef, InspectedCardInfo, MonsterTemplateId, ShrinePrayerOptionId, StatKey } from './core/types';
import { createCombatCardInstance, createFleeCard, FLEE_CARD_ID } from './data/combatCards';
import { MONSTER_TEMPLATES } from './data/monsters';
import { SHOP_ITEM_CATALOG } from './data/shopItems';
import { ADVENTURE_CARD_CATALOG } from './data/stages';
import { toGridKey } from './core/grid';
import { firstLivingMonsterIndex } from './core/combat';
import { computeCombatGearBonuses, getEffectiveStatsFromState, getPlayerAcc, getPlayerCritThreshold } from './core/stats';
import { Store } from './state/store';
import { reconcileRunNewSkills } from './core/newSkills';
import { audioManager } from './audio/audioManager';
import {
  CLASS_CAROUSEL_ORDER,
  getAdventureCardName,
  PileType,
  renderClassSelect,
  renderPlayArea,
  renderWelcome,
  UiState,
  updateClassCarouselDom,
  updateMonsterCarouselDom,
  getHandCarouselIndex,
  updateHandCarouselDom,
} from './ui/render';
import { ClassId } from './core/types';

function newSeed(): string {
  return Date.now().toString(36);
}

const root = document.getElementById('app') as HTMLElement;
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

function setCombatTarget(newTarget: number): void {
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
    const updated = updateMonsterCarouselDom(root, s.activeHook.combat, ui.targetIndex, playerAcc, getPlayerCritThreshold(stats));
    if (!updated) {
      render();
    }
  } else {
    render();
  }
}

function navigateCombatTarget(direction: -1 | 1): void {
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
  if (state.activeHook.type !== 'COMBAT' || ui.pendingCardPlay || ui.pendingFlee || ui.inspectedCard || ui.inspectedPile || ui.inspectedStat || ui.showDeck) return;
  ui.handIndex = getHandCarouselIndex(index, state.activeHook.combat.hand.length);
  if (!updateHandCarouselDom(root, ui.handIndex)) render();
}

function navigateHand(direction: -1 | 1): void {
  const state = store.get();
  if (state.activeHook.type !== 'COMBAT') return;
  const count = state.activeHook.combat.hand.length;
  if (count < 2) return;
  selectHandCard((getHandCarouselIndex(ui.handIndex ?? 0, count) + direction + count) % count);
}

let handSwipe: { x: number; y: number } | null = null;
let handSwipeConsumed = false;
root.addEventListener('dragstart', ev => {
  if ((ev.target as HTMLElement).closest('.hand-carousel-track')) ev.preventDefault();
});
root.addEventListener('pointerdown', ev => {
  if ((ev.target as HTMLElement).closest('.hand-carousel-track')) handSwipe = { x: ev.clientX, y: ev.clientY };
});
root.addEventListener('pointercancel', () => { handSwipe = null; });
root.addEventListener('pointerup', ev => {
  if (!handSwipe) return;
  const dx = ev.clientX - handSwipe.x;
  const dy = ev.clientY - handSwipe.y;
  handSwipe = null;
  if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;
  clearLongPress();
  handSwipeConsumed = true;
  navigateHand(dx < 0 ? 1 : -1);
  window.setTimeout(() => { handSwipeConsumed = false; }, 250);
});

function render(): void {
  const s = store.get();
  // Preserve scroll of scrollable containers across re-renders
  const scroll = new Map<string, number>();
  root.querySelectorAll<HTMLElement>('.modal, .sheet').forEach((el, i) => scroll.set(String(i), el.scrollTop));

  const isMuted = audioManager.isTrackMuted();
  const audioBtnHtml = `<button class="audio-btn ${isMuted ? 'muted' : ''}" data-action="toggle-audio" title="${isMuted ? 'Unmute Music' : 'Mute Music'}" aria-label="Toggle Music">${isMuted ? '🔇' : '🔊'}</button>`;

  if (s.screen === 'welcome') {
    root.innerHTML = renderWelcome(Boolean(ui.showGuide)) + audioBtnHtml;
  } else if (s.screen === 'class_select') {
    if (!ui.selectedClass) ui.selectedClass = 'fighter';
    const updated = updateClassCarouselDom(root, ui.selectedClass);
    if (!updated) {
      root.innerHTML = renderClassSelect(ui) + audioBtnHtml;
    }
  } else {
    root.innerHTML = renderPlayArea(s, ui) + audioBtnHtml;
  }

  root.querySelectorAll<HTMLElement>('.modal, .sheet').forEach((el, i) => {
    el.scrollTop = scroll.get(String(i)) ?? 0;
  });
}

store.subscribe((state) => {
  render();
  audioManager.sync(state);
});

// ---------------------------------------------------------------------------
// Card Inspection (Right-Click or Long-Press for 2s)
// ---------------------------------------------------------------------------

function findInspectedCard(cardEl: HTMLElement): InspectedCardInfo | null {
  const {
    inspectKind,
    cardId,
    cardInstance,
    monsterId,
    monsterIndex,
    nodeCol,
    nodeRow,
    boardKey,
    adventureCardName,
    adventureCardNumber,
  } = cardEl.dataset;
  const s = store.get();

  if (inspectKind === 'action') {
    // 1. Look up in active combat hand
    if (s.activeHook.type === 'COMBAT') {
      const fromHand = s.activeHook.combat.hand.find((c) => c.instanceId === cardInstance);
      if (fromHand) return { kind: 'action', card: fromHand };
    }
    // 2. Look up in master deck
    const fromDeck = s.playerMasterDeck.find((c) => c.instanceId === cardInstance);
    if (fromDeck) return { kind: 'action', card: fromDeck };

    // 3. Look up in learnable Skills piles.
    const fromNewSkills = [...s.newSkillsDeck, ...s.newSkillsDiscard].find((c) => c.instanceId === cardInstance);
    if (fromNewSkills) return { kind: 'action', card: fromNewSkills };

    // 4. Look up in village train options
    if (s.activeHook.type === 'VILLAGE') {
      const fromTrain = s.activeHook.village.trainOptions.find((c) => c.instanceId === cardInstance);
      if (fromTrain) return { kind: 'action', card: fromTrain };
    }

    // 5. Fallback to catalog instance
    if (cardId === FLEE_CARD_ID) {
      return { kind: 'action', card: createFleeCard(s.playerClass ?? 'fighter') };
    }
    if (cardId) {
      try {
        return { kind: 'action', card: createCombatCardInstance(cardId, 'inspect') };
      } catch {}
    }
  } else if (inspectKind === 'monster') {
    if (s.activeHook.type === 'COMBAT') {
      const idx = Number(monsterIndex);
      const cm = s.activeHook.combat.monsters[idx];
      if (cm) {
        const boons: { name: string; description: string; value: string }[] = [];
        const bonus = cm.attackBonus ?? 0;
        if (bonus > 0) {
          boons.push({
            name: 'Charge Momentum',
            value: `+${bonus} ATK`,
            description: `Momentum accelerates with each charge. Heavy Charge currently deals ${6 + bonus} DMG (Base 6 + ${bonus} Boon).`,
          });
        }
        if (cm.evaBonus && cm.evaBonus > 0) {
          boons.push({
            name: 'Stalking Evasion',
            value: `+${cm.evaBonus} EVA`,
            description: `Carefully stalks prey from concealment, gaining +${cm.evaBonus} EVA against incoming attacks this round.`,
          });
        }
        if (cm.accBonus && cm.accBonus > 0) {
          boons.push({
            name: 'Lunging Accuracy',
            value: `+${cm.accBonus} ACC`,
            description: `Leaps forward with predatory precision, gaining +${cm.accBonus} ACC on attack rolls this round.`,
          });
        }
        if (cm.block > 0) {
          boons.push({
            name: 'Active Block',
            value: `+${cm.block} Block`,
            description: `Absorbs incoming attack damage before creature HP is reduced.`,
          });
        }
        return {
          kind: 'monster',
          monster: cm.monster,
          currentHp: cm.hp,
          block: cm.block,
          attackBonus: cm.attackBonus,
          accBonus: cm.accBonus,
          evaBonus: cm.evaBonus,
          activeBoons: boons,
        };
      }
    }
    if (monsterId && monsterId in MONSTER_TEMPLATES) {
      const tpl = MONSTER_TEMPLATES[monsterId as MonsterTemplateId];
      return { kind: 'monster', monster: { ...tpl, id: `monster_${monsterId}_inspect` } };
    }
  } else if (inspectKind === 'adventure') {
    // 1. Check direct board key (e.g. "0.0,0", "-1.0,2", "0.5,1")
    if (boardKey && s.board[boardKey]) {
      return { kind: 'adventure', card: s.board[boardKey].card };
    }
    // 2. Convert col & row via toGridKey
    if (nodeCol !== undefined && nodeRow !== undefined) {
      const gridKey = toGridKey(Number(nodeCol), Number(nodeRow));
      if (s.board[gridKey]) {
        return { kind: 'adventure', card: s.board[gridKey].card };
      }
      const rawKey = `${nodeCol},${nodeRow}`;
      if (s.board[rawKey]) {
        return { kind: 'adventure', card: s.board[rawKey].card };
      }
    }
    // 3. Search board by card ID
    if (cardId) {
      const foundNode = Object.values(s.board).find((n) => n.card.id === cardId);
      if (foundNode) return { kind: 'adventure', card: foundNode.card };
    }
    // 4. Fallback to adventureDeck or adventureDiscard
    if (adventureCardNumber) {
      const fromDeck = s.adventureDeck.find((c) => c.cardNumber === adventureCardNumber);
      if (fromDeck) return { kind: 'adventure', card: fromDeck };
      const fromDiscard = s.adventureDiscard.find((c) => c.cardNumber === adventureCardNumber);
      if (fromDiscard) return { kind: 'adventure', card: fromDiscard };
      if (adventureCardNumber in ADVENTURE_CARD_CATALOG) {
        const def = ADVENTURE_CARD_CATALOG[adventureCardNumber];
        return {
          kind: 'adventure',
          card: {
            id: `inspect_${def.cardCode}`,
            name: def.name,
            terrain: def.terrain,
            level: def.level,
            hasHostile: def.hasHostile,
            hasVillage: def.hasVillage,
            hasShrine: def.hasShrine,
            revealed: true,
            cardNumber: def.cardCode,
            flavorText: def.flavorText,
          },
        };
      }
    }
    if (adventureCardName) {
      const fromDeck = s.adventureDeck.find((c) => (c.name || getAdventureCardName(c)) === adventureCardName);
      if (fromDeck) return { kind: 'adventure', card: fromDeck };
      const fromDiscard = s.adventureDiscard.find((c) => (c.name || getAdventureCardName(c)) === adventureCardName);
      if (fromDiscard) return { kind: 'adventure', card: fromDiscard };
    }
  } else if (inspectKind === 'item') {
    const { itemId, itemInstance } = cardEl.dataset;
    // 1. Check active village shop stock
    if (s.activeHook.type === 'VILLAGE' && s.activeHook.village.shopStock) {
      const inStock = s.activeHook.village.shopStock.find(
        (i) => (itemInstance && i.instanceId === itemInstance) || i.id === itemId
      );
      if (inStock) return { kind: 'item', item: inStock };
    }
    // 2. Check treasure deck and discard
    if (itemInstance) {
      const inDeck = s.treasureDeck.find((i) => i.instanceId === itemInstance);
      if (inDeck) return { kind: 'item', item: inDeck };
      const inDiscard = s.treasureDiscard.find((i) => i.instanceId === itemInstance);
      if (inDiscard) return { kind: 'item', item: inDiscard };
    }
    // 3. Check equipped gear
    if (itemInstance) {
      for (const slot of ['weapon', 'armor', 'accessory'] as const) {
        if (s.equippedGear[slot]?.instanceId === itemInstance) {
          return { kind: 'item', item: s.equippedGear[slot]! };
        }
      }
      // 4. Check backpack
      const inBackpack = s.backpack.find((i) => i.instanceId === itemInstance);
      if (inBackpack) return { kind: 'item', item: inBackpack };
    }
    // 5. Check catalog by ID
    if (itemId) {
      const cat = SHOP_ITEM_CATALOG.find((i) => i.id === itemId);
      if (cat) return { kind: 'item', item: { ...cat, instanceId: itemInstance || `inspect_${cat.id}` } };
    }
  }

  return null;
}

// Right Click to inspect full card details OR open deck/discard pile modal OR stat info modal
root.addEventListener('contextmenu', (ev) => {
  const target = ev.target as HTMLElement;

  // 1. Right-click on a stat row to inspect stat computation & next SP cost
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

  // 2. Right-click on a deck or discard pile
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

  // 3. Right-click on an inspectable card
  const cardEl = target.closest<HTMLElement>('[data-inspect-kind]');
  if (!cardEl) return;
  ev.preventDefault();
  ev.stopPropagation();
  const info = findInspectedCard(cardEl);
  if (info) {
    ui.inspectedCard = info;
    render();
  }
});

// Touch / Pointer Long Press (2s for cards, 1s for deck piles and stats)
let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let longPressTriggered = false;
let longPressGeneration = 0;
let startX = 0;
let startY = 0;

function clearLongPress() {
  longPressGeneration += 1;
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

function clearTransientUiForNewAdventure() {
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
  ui.showGuide = false;
  ui.handIndex = 0;
  ui.targetIndex = 0;
  ui.villageRestTicks = undefined;
}

root.addEventListener('input', (ev) => {
  const target = ev.target as HTMLInputElement;
  if (target.dataset.action !== 'set-village-rest-ticks') return;
  ui.villageRestTicks = Number(target.value);
  render();
});

root.addEventListener('pointerdown', (ev) => {
  if (ev.button !== 0 && ev.pointerType === 'mouse') return;
  const target = ev.target as HTMLElement;
  const pileEl = target.closest<HTMLElement>('[data-pile]');
  const cardEl = target.closest<HTMLElement>('[data-inspect-kind]');
  const statEl = target.closest<HTMLElement>('[data-inspect-stat]');
  if (!pileEl && !cardEl && !statEl) return;

  clearLongPress();
  longPressTriggered = false;
  startX = ev.clientX;
  startY = ev.clientY;

  if (statEl) {
    const generation = ++longPressGeneration;
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
    const generation = ++longPressGeneration;
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
    const generation = ++longPressGeneration;
    longPressTimer = setTimeout(() => {
      if (generation !== longPressGeneration) return;
      longPressTimer = null;
      longPressTriggered = true;
      const info = findInspectedCard(cardEl);
      if (info) {
        ui.inspectedCard = info;
        render();
      }
    }, 2000);
  }
});

root.addEventListener('pointermove', (ev) => {
  if (!longPressTimer) return;
  const dx = Math.abs(ev.clientX - startX);
  const dy = Math.abs(ev.clientY - startY);
  if (dx > 10 || dy > 10) {
    clearLongPress();
  }
});

root.addEventListener('pointerup', () => {
  clearLongPress();
});

root.addEventListener('pointercancel', () => {
  clearLongPress();
});

// Keyboard shortcuts
window.addEventListener('keydown', (ev) => {
  const s = store.get();

  if (s.screen === 'class_select') {
    const current = ui.selectedClass ?? 'fighter';
    const activeIdx = CLASS_CAROUSEL_ORDER.indexOf(current) >= 0 ? CLASS_CAROUSEL_ORDER.indexOf(current) : 0;

    if (ev.key === 'a' || ev.key === 'A' || ev.key === 'ArrowLeft') {
      ev.preventDefault();
      const prevIdx = (activeIdx - 1 + CLASS_CAROUSEL_ORDER.length) % CLASS_CAROUSEL_ORDER.length;
      ui.selectedClass = CLASS_CAROUSEL_ORDER[prevIdx];
      render();
      return;
    }

    if (ev.key === 'd' || ev.key === 'D' || ev.key === 'ArrowRight') {
      ev.preventDefault();
      const nextIdx = (activeIdx + 1) % CLASS_CAROUSEL_ORDER.length;
      ui.selectedClass = CLASS_CAROUSEL_ORDER[nextIdx];
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

  if (s.screen === 'play_area' && s.activeHook?.type === 'COMBAT') {
    if (ev.key.toLowerCase() === 'q' || ev.key.toLowerCase() === 'e') {
      ev.preventDefault();
      navigateHand(ev.key.toLowerCase() === 'q' ? -1 : 1);
      return;
    }
    if (!ui.inspectedCard && !ui.inspectedPile && !ui.showDeck) {
      if (ev.key === 'a' || ev.key === 'A' || ev.key === 'ArrowLeft') {
        ev.preventDefault();
        // With one target, target traversal has no effect. Reuse the familiar
        // left controls for the hand carousel instead.
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
        return;
      }
    }
  }

  if (ev.key === 'Escape') {
    if (ui.pendingCardPlay) {
      ui.pendingCardPlay = null;
      render();
    } else if (ui.inspectedPile || ui.showDeck) {
      ui.inspectedPile = null;
      ui.showDeck = false;
      render();
    } else if (ui.inspectedCard) {
      ui.inspectedCard = null;
      render();
    }
  }
});

// ---------------------------------------------------------------------------
// Click Handling
// ---------------------------------------------------------------------------

root.addEventListener('click', (ev) => {
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

  // Side cards are previews, never actions. Handle their whole surface before
  // generic action delegation so their card artwork cannot steal the click.
  const handPreview = (ev.target as HTMLElement).closest<HTMLElement>('.hand-carousel-unit:not(.is-center)');
  if (handPreview?.dataset.handIndex !== undefined) {
    selectHandCard(Number(handPreview.dataset.handIndex));
    return;
  }

  const target = (ev.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!target || (target as HTMLButtonElement).disabled) return;
  const { action, id, stat, col, row, pile } = target.dataset;

  if (action === 'toggle-audio') {
    audioManager.toggleMute();
    render();
    return;
  }

  if (action === 'open-pile') {
    if ((pile || id) === 'new_skills_deck' || (pile || id) === 'new_skills_discard') {
      store.update(reconcileRunNewSkills);
    }
    ui.inspectedPile = (pile || id) as PileType;
    render();
    return;
  }

  if (action === 'close-pile') {
    ui.inspectedPile = null;
    ui.showDeck = false;
    render();
    return;
  }

  if (action === 'close-pile-backdrop') {
    if (ev.target === target) {
      ui.inspectedPile = null;
      ui.showDeck = false;
      render();
    }
    return;
  }

  if (action === 'inspect-item') {
    const cardEl = target.closest<HTMLElement>('[data-inspect-kind]') ?? target;
    const info = findInspectedCard(cardEl);
    if (info) {
      ui.inspectedCard = info;
      render();
    }
    return;
  }

  if (action === 'inspect-monster') {
    const cardEl = target.closest<HTMLElement>('[data-inspect-kind="monster"]') ?? target;
    const info = findInspectedCard(cardEl);
    if (info) {
      ui.inspectedCard = info;
      render();
    }
    return;
  }

  if (action === 'close-inspect') {
    ui.inspectedCard = null;
    ui.inspectedStat = null;
    render();
    return;
  }

  if (action === 'close-inspect-backdrop') {
    // Only close if clicking directly on the backdrop outside the modal
    if (ev.target === target) {
      ui.inspectedCard = null;
      ui.inspectedStat = null;
      render();
    }
    return;
  }

  if (action === 'prev-class') {
    const current = ui.selectedClass ?? 'fighter';
    const activeIdx = CLASS_CAROUSEL_ORDER.indexOf(current) >= 0 ? CLASS_CAROUSEL_ORDER.indexOf(current) : 0;
    const prevIdx = (activeIdx - 1 + CLASS_CAROUSEL_ORDER.length) % CLASS_CAROUSEL_ORDER.length;
    ui.selectedClass = CLASS_CAROUSEL_ORDER[prevIdx];
    render();
    return;
  }

  if (action === 'next-class') {
    const current = ui.selectedClass ?? 'fighter';
    const activeIdx = CLASS_CAROUSEL_ORDER.indexOf(current) >= 0 ? CLASS_CAROUSEL_ORDER.indexOf(current) : 0;
    const nextIdx = (activeIdx + 1) % CLASS_CAROUSEL_ORDER.length;
    ui.selectedClass = CLASS_CAROUSEL_ORDER[nextIdx];
    render();
    return;
  }

  switch (action) {
    case 'start':
      if (!ui.selectedClass) ui.selectedClass = 'fighter';
      store.update(goToClassSelect);
      break;
    case 'open-guide':
      ui.showGuide = true;
      render();
      break;
    case 'close-guide':
      ui.showGuide = false;
      render();
      break;
    case 'close-guide-backdrop':
      if (ev.target === target) {
        ui.showGuide = false;
        render();
      }
      break;
    case 'select-class':
      if (id) {
        ui.selectedClass = id as ClassId;
        render();
      }
      break;
    case 'embark': {
      const chosen = ui.selectedClass ?? 'fighter';
      const seed = newSeed();
      clearTransientUiForNewAdventure();
      store.set(startAdventure(chosen, seed));
      break;
    }
    case 'next-mission':
      store.update((s) => startNextMission(s));
      break;
    case 'restart':
      ui.selectedClass = null;
      store.set(createInitialState(newSeed()));
      render();
      break;
    case 'choose':
      store.update((s) => chooseCard(s, { col: Number(col), row: Number(row) }));
      break;
    case 'upgrade':
      store.update((s) => shrineUpgradeStat(s, stat as StatKey));
      break;
    case 'inspect-stat':
      ui.inspectedStat = (stat as StatKey) || null;
      render();
      break;
    case 'equip':
      store.update((s) => equipItem(s, id as string));
      break;
    case 'unequip':
      store.update((s) => unequipItem(s, id as string));
      break;
    case 'use-item':
      store.update((s) => useConsumable(s, id as string));
      break;
    case 'toggle-deck':
      ui.showDeck = !ui.showDeck;
      render();
      break;
    case 'prev-hand-card':
      navigateHand(-1);
      break;
    case 'next-hand-card':
      navigateHand(1);
      break;
    case 'select-hand-card':
      selectHandCard(Number(id));
      break;
    case 'play-card': {
      const curState = store.get();
      if (curState.activeHook.type === 'COMBAT') {
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
      }
      break;
    }
    case 'confirm-play-card':
      if (ui.pendingCardPlay) {
        const { cardInstanceId, targetIndex, discardedCardInstanceIds = [] } = ui.pendingCardPlay;
        ui.pendingCardPlay = null;
        store.update((s) => playCard(s, cardInstanceId, targetIndex, discardedCardInstanceIds));
      }
      break;
    case 'toggle-card-discard': {
      if (!ui.pendingCardPlay || !id) break;
      const current = ui.pendingCardPlay.discardedCardInstanceIds ?? [];
      ui.pendingCardPlay.discardedCardInstanceIds = current.includes(id)
        ? current.filter((instanceId) => instanceId !== id)
        : [...current, id];
      render();
      break;
    }
    case 'cancel-play-card':
      ui.pendingCardPlay = null;
      render();
      break;
    case 'close-confirm-backdrop':
      if (ev.target === target) {
        ui.pendingCardPlay = null;
        render();
      }
      break;
    case 'confirm-switch-target':
      setCombatTarget(Number(id));
      break;
    case 'target':
      setCombatTarget(Number(id));
      break;
    case 'prev-target':
      navigateCombatTarget(-1);
      break;
    case 'next-target':
      navigateCombatTarget(1);
      break;
    case 'welcome-upgrade':
      store.update((s) => welcomeUpgradeStat(s, stat as StatKey));
      break;
    case 'shrine-upgrade':
      store.update((s) => shrineUpgradeStat(s, stat as StatKey));
      break;
    case 'shrine-upgrade-skill':
      if (id) store.update((s) => shrineUpgradeSkill(s, id));
      break;
    case 'dismiss-welcome-dialog':
      store.update(dismissWelcomePrepare);
      break;
    case 'shrine-pray':
      store.update(shrinePray);
      break;
    case 'shrine-choose-prayer':
      store.update((s) => shrineDoChoosePrayer(s, id as ShrinePrayerOptionId));
      break;
    case 'leave-shrine':
      store.update(leaveShrine);
      break;
    case 'village-back':
      store.update(villageGoBack);
      break;
    case 'end-turn':
      ui.handIndex = 0;
      store.update(endTurn);
      break;
    case 'village-rest':
      store.update((s) => villageDoRest(s, ui.villageRestTicks));
      break;
    case 'village-shop':
      ui.villageTab = 'buy';
      store.update(villageChooseShop);
      break;
    case 'village-train':
      store.update(villageChooseTrain);
      break;
    case 'village-leave':
      ui.villageRestTicks = undefined;
      store.update(finishVillage);
      break;
    case 'buy':
      store.update((s) => buyItem(s, id as string));
      break;
    case 'sell':
      store.update((s) => sellItem(s, id as string));
      break;
    case 'tab':
      ui.villageTab = id as 'buy' | 'sell';
      render();
      break;
    case 'train-draft':
      store.update((s) => villageDoTrainDraft(s, id as string));
      break;
    case 'train-remove':
      store.update((s) => villageDoTrainRemove(s, id as string));
      break;
    case 'confirm-exploration-combat':
      store.update(confirmExplorationCombat);
      break;
    case 'confirm-exploration-safe':
      store.update(confirmExplorationSafe);
      break;
    case 'confirm-victory':
      store.update(confirmCombatVictory);
      break;
    case 'flee-card': {
      const curState = store.get();
      if (curState.activeHook.type === 'COMBAT' && curState.activeHook.combat.playerAp >= 2) {
        ui.pendingCardPlay = null;
        ui.pendingFlee = true;
        render();
      }
      break;
    }
    case 'confirm-flee':
      ui.pendingFlee = false;
      store.update(attemptFlee);
      break;
    case 'cancel-flee':
      ui.pendingFlee = false;
      render();
      break;
    case 'cancel-flee-backdrop':
      if (ev.target === target) {
        ui.pendingFlee = false;
        render();
      }
      break;
  }
});

audioManager.sync(store.get());
render();

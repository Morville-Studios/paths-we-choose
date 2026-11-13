import { coordToKey } from '../../core/grid';
import {
  calculateGoodsPrice,
  GearPreview,
  getEffectiveStatsFromState,
  previewGearChange,
} from '../../core/stats';
import { ActiveVillageState, RunState, ShopItemDef, STATS } from '../../core/types';
import {
  checkRestEligibility,
  getTrainingSkillCost,
  getTrainRemovalCost,
  getVillageRestOption,
  MIN_DECK_SIZE,
} from '../../core/village';
import { ShopItemTemplate } from '../../data/shopItems';
import { getAdventureRasterArtPath, getItemRasterArtPath } from '../cardArt';
import { getResourceIcon, getSlotIcon } from '../icons';
import { publicAsset } from '../publicAsset';
import { PendingTrainingAction, UiState } from '../types';
import { combatCardHtml, voidCardCount } from '../render';
function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

/** Chips such as "STR 4 â†’ 5 (+1)" for every stat that would change, plus Max HP. */
function deltaChips(p: GearPreview): string {
  const chips = STATS.filter((s) => p.after[s] !== p.before[s]).map((s) => {
    const d = p.after[s] - p.before[s];
    return `<span class="chip ${d > 0 ? 'up' : 'down'}">${s.toUpperCase()} ${p.before[s]} &rarr; ${p.after[s]} (${signed(d)})</span>`;
  });
  if (p.maxHpAfter !== p.maxHpBefore) {
    const d = p.maxHpAfter - p.maxHpBefore;
    chips.push(
      `<span class="chip ${d > 0 ? 'up' : 'down'}">Max HP ${p.maxHpBefore} &rarr; ${p.maxHpAfter} (${signed(d)})</span>`
    );
  }
  if (p.combatBefore && p.combatAfter) {
    const combatKeys = ['atk', 'def', 'matk', 'mdef', 'eva', 'acc', 'pen', 'act'] as const;
    for (const k of combatKeys) {
      const beforeVal = p.combatBefore[k];
      const afterVal = p.combatAfter[k];
      const diff = afterVal - beforeVal;
      if (diff !== 0) {
        chips.push(
          `<span class="chip ${diff > 0 ? 'up' : 'down'}">${k.toUpperCase()} ${beforeVal} &rarr; ${afterVal} (${signed(diff)})</span>`
        );
      }
    }
  }
  return chips.length ? chips.join('') : '<span class="chip">No stat change</span>';
}


function shopBuyRow(state: RunState, item: ShopItemDef | ShopItemTemplate): string {
  const gold = state.playerResources!.gold;
  const eff = getEffectiveStatsFromState(state);
  const price = calculateGoodsPrice(item.buyPrice, eff.cha);
  const affordable = gold >= price;
  const discountNote =
    eff.cha > 0 && price < item.buyPrice
      ? ` <span class="shop-discount" title="${eff.cha * 5}% Charisma Discount">(-${item.buyPrice - price}g CHA)</span>`
      : '';
  let detail = '';
  if (item.category === 'consumable') {
    detail = `<span class="chip">Goes to your backpack</span>`;
  } else {
    const preview = previewGearChange(state, item.category, item);
    const replaced = preview.replaced
      ? `Replaces <b>${preview.replaced.name}</b> (moves to backpack)`
      : `Fills your empty ${item.category} slot`;
    detail = `<div class="replace-note">${replaced}</div><div class="chips">${deltaChips(preview)}</div>`;
  }

  const rasterArt = getItemRasterArtPath(item.id);
  const slotIcon =
    item.category === 'weapon'
      ? getSlotIcon('weapon', 'header-icon')
      : item.category === 'armor'
      ? getSlotIcon('armor', 'header-icon')
      : item.category === 'accessory'
      ? getSlotIcon('accessory', 'header-icon')
      : '🧪';
  const typeLabel =
    item.category === 'weapon'
      ? 'Weapon'
      : item.category === 'armor'
      ? 'Armor'
      : item.category === 'accessory'
      ? 'Accessory'
      : 'Consumable';
  const instanceId = 'instanceId' in item && item.instanceId ? item.instanceId : item.id;

  return `
  <div class="shop-row inspectable-row" data-inspect-kind="item" data-item-id="${item.id}" data-item-instance="${instanceId}" title="Right-click or hold to inspect card">
    <div class="shop-card-preview-box" data-action="inspect-item" data-item-id="${item.id}" data-item-instance="${instanceId}" title="Click or hold to inspect card">
      <div class="shop-mini-card tcg-template-item">
        <img src="${rasterArt}" alt="${item.name}" class="shop-card-art-img" loading="lazy" />
        <span class="shop-mini-slot-badge" title="${typeLabel}">${slotIcon}</span>
        <span class="shop-mini-level-badge">Lvl ${item.level ?? 1}</span>
      </div>
    </div>
    <div class="shop-info">
      <div class="shop-item-title-row">
        <b class="shop-item-name">${item.name}</b>
        <span class="shop-item-type-badge">${slotIcon} ${typeLabel}</span>
      </div>
      <small class="shop-item-desc">${item.description}</small>
      ${detail}
    </div>
    <div class="shop-action-box">
      <button class="btn mini shop-buy-btn" data-action="buy" data-id="${instanceId}" ${affordable ? '' : 'disabled'}>
        Buy ${price}g${discountNote}
      </button>
    </div>
  </div>`;
}

function shopSellRow(state: RunState, item: ShopItemDef): string {
  const equipped = (['weapon', 'armor', 'accessory'] as const).find(
    (s) => state.equippedGear[s]?.instanceId === item.instanceId
  );
  let detail = '';
  if (equipped) {
    detail = `<div class="chips">${deltaChips(previewGearChange(state, equipped, null))}</div>`;
  }

  const rasterArt = getItemRasterArtPath(item.id);
  const slotIcon =
    item.category === 'weapon'
      ? getSlotIcon('weapon', 'header-icon')
      : item.category === 'armor'
      ? getSlotIcon('armor', 'header-icon')
      : item.category === 'accessory'
      ? getSlotIcon('accessory', 'header-icon')
      : '🧪';
  const typeLabel =
    item.category === 'weapon'
      ? 'Weapon'
      : item.category === 'armor'
      ? 'Armor'
      : item.category === 'accessory'
      ? 'Accessory'
      : 'Consumable';

  return `
  <div class="shop-row inspectable-row" data-inspect-kind="item" data-item-id="${item.id}" data-item-instance="${item.instanceId}" title="Right-click or hold to inspect card">
    <div class="shop-card-preview-box" data-action="inspect-item" data-item-id="${item.id}" data-item-instance="${item.instanceId}" title="Click or hold to inspect card">
      <div class="shop-mini-card tcg-template-item">
        <img src="${rasterArt}" alt="${item.name}" class="shop-card-art-img" loading="lazy" />
        <span class="shop-mini-slot-badge" title="${typeLabel}">${slotIcon}</span>
        <span class="shop-mini-level-badge">Lvl ${item.level ?? 1}</span>
      </div>
    </div>
    <div class="shop-info">
      <div class="shop-item-title-row">
        <b class="shop-item-name">${item.name}</b>
        ${equipped ? ` <small class="shop-equipped-tag">(equipped as ${equipped})</small>` : ''}
        <span class="shop-item-type-badge">${slotIcon} ${typeLabel}</span>
      </div>
      <small class="shop-item-desc">${item.description}</small>
      ${detail}
    </div>
    <div class="shop-action-box">
      <button class="btn mini shop-sell-btn" data-action="sell" data-id="${item.instanceId}">
        Sell ${item.sellPrice}g
      </button>
    </div>
  </div>`;
}

export function villageViewHtml(state: RunState, village: ActiveVillageState, ui: UiState): string {
  const res = state.playerResources!;
  const villageCard = state.board[coordToKey(village.coord)]?.card;
  const villageName = villageCard?.name ?? 'Village';
  const villageLevel = villageCard?.level ?? 1;
  const villageArt = villageCard ? getAdventureRasterArtPath(villageCard) : publicAsset('cards/adventure/grassland_village.jpg');
  const locationHeader = `
    <header class="village-location-header">
      <img src="${villageArt}" alt="${villageName}" class="village-location-art" loading="eager" />
      <div class="village-location-copy">
        <span class="village-location-type">VILLAGE</span>
        <h2>${villageName}</h2>
        <span class="village-location-level">Lvl ${villageLevel}</span>
      </div>
    </header>`;
  let body = '';
  if (village.subView === 'main') {
    const restOption = getVillageRestOption(res, ui.villageRestTicks);
    const eligibility = checkRestEligibility(state, restOption.ticks);
    const restLabels = Array.from({ length: restOption.maxTicks }, (_, index) => {
      const ticks = index + 1;
      const option = getVillageRestOption(res, ticks);
      return `<span>${option.isFullRest ? 'Full' : `${option.hpRestored} HP`}</span>`;
    }).join('');
    const restMessage = eligibility.reason === 'full_health'
      ? 'Already at full HP.'
      : eligibility.reason === 'insufficient_gold'
      ? `Need ${restOption.cost} Gold; you have ${res.gold}.`
      : `${restOption.isFullRest ? 'Full rest' : `Restore ${restOption.hpRestored} HP`} for ${restOption.cost} Gold.`;

    body = `
    <p class="village-intro">Use any service while you visit. Your shop stock and training offers are reserved when you arrive.</p>
    <div class="village-actions">
      <section class="village-service village-rest-service">
        <div class="village-service-heading"><b>Rest</b><span>${res.hp} / ${res.maxHp} HP</span></div>
        ${restOption.maxTicks > 0 ? `
          <input class="village-rest-slider" type="range" min="1" max="${restOption.maxTicks}" step="1" value="${restOption.ticks}" data-action="set-village-rest-ticks" aria-label="Rest duration: ${restOption.isFullRest ? 'Full' : `${restOption.hpRestored} HP`}" />
          <div class="village-rest-ticks" aria-hidden="true">${restLabels}</div>` : ''}
        <p class="village-service-note">${restMessage} Each tick restores up to 2 HP and costs 1 Gold.</p>
        <button class="btn primary" data-action="village-rest" ${eligibility.canRest ? '' : 'disabled'}>
          Rest ${restOption.isFullRest ? 'to Full' : `+${restOption.hpRestored} HP`} (${restOption.cost}g)
        </button>
      </section>
      <button class="btn big" data-action="village-shop">Shop<small>Buy &amp; sell gear</small></button>
      <button class="btn big" data-action="village-train">Training<small>Learn skills or destroy cards</small></button>
    </div>
    <div class="village-view-footer">
      <button class="btn" data-action="village-leave">Leave village</button>
    </div>`;
  } else if (village.subView === 'shop') {
    const shopLevel = state.board[coordToKey(village.coord)]?.card.level ?? 1;
    const shopLevelBand = shopLevel === 1 ? 'Level 1' : `Levels ${shopLevel - 1}–${shopLevel}`;
    const owned: ShopItemDef[] = [
      ...(['weapon', 'armor', 'accessory'] as const)
        .map((s) => state.equippedGear[s])
        .filter((i): i is ShopItemDef => !!i),
      ...state.backpack,
    ];
    const stock = village.shopStock && village.shopStock.length > 0 ? village.shopStock : [];
    const list =
      ui.villageTab === 'buy'
        ? stock.length > 0
          ? stock.map((i) => shopBuyRow(state, i)).join('')
          : `<p class="muted empty-shop-stock">No ${shopLevelBand} items are available in this store.</p>`
        : owned.length
        ? owned.map((i) => shopSellRow(state, i)).join('')
        : '<p class="muted">Nothing to sell.</p>';
    body = `
    <div class="shop-layout">
      <section class="shop-main">
        <p class="muted">Level ${shopLevel} store · Supplies ${shopLevelBand} items</p>
        <div class="shop-header">
          <p class="gold-display">${getResourceIcon('gold', 'chip-icon')} Gold: <b>${res.gold}</b></p>
          <div class="tabs">
            <button class="tab ${ui.villageTab === 'buy' ? 'on' : ''}" data-action="tab" data-id="buy">Buy (${stock.length})</button>
            <button class="tab ${ui.villageTab === 'sell' ? 'on' : ''}" data-action="tab" data-id="sell">Sell (${owned.length})</button>
          </div>
        </div>
        <div class="shop-list">${list}</div>
        <div class="village-view-footer">
          <button class="btn" data-action="village-back">&larr; Village options</button>
        </div>
      </section>
    </div>`;
  } else {
    const stats = getEffectiveStatsFromState(state);
    const canRemove = state.playerMasterDeck.length > MIN_DECK_SIZE;
    const removalCost = getTrainRemovalCost(state);
    const canAffordRemoval = res.gold >= removalCost;
    body = `
    <div class="village-training-layout">
      <div class="village-training-main">
        <section class="train-section">
          <h3>Learn a skill</h3>
          <p class="muted">Select a card to review its purchase before paying.</p>
          <div class="train-card-grid">${village.trainOptions.length
            ? village.trainOptions.map((c) => {
              const cost = getTrainingSkillCost(c);
              const canLearn = res.gold >= cost.gold && res.statPoints >= cost.statPoints;
              return `<div class="train-card-offer">${combatCardHtml(c, stats, canLearn, 'train-draft', false, state)}<span>${cost.gold} Gold · ${cost.statPoints} SP</span></div>`;
            }).join('')
            : '<p class="muted">All pre-drawn training offers have been learned.</p>'}</div>
        </section>
        <section class="train-section">
          <h3>Destroy a card <small>${canRemove ? `(${removalCost} Gold)` : '(deck at minimum size)'}</small></h3>
          <p class="muted">Destroyed cards go to the Void. Each destruction increases the next cost by 1 Gold for this adventure.</p>
          <div class="train-card-grid">${state.playerMasterDeck
            .map((c) => `<div class="train-card-offer">${combatCardHtml(c, stats, canRemove && canAffordRemoval, 'train-remove', false, state)}<span>${removalCost} Gold</span></div>`)
            .join('')}</div>
        </section>
      </div>
      <aside class="village-training-sidebar" aria-label="Training resources">
        <h3>Your Resources</h3>
        <div class="training-resource-value">${getResourceIcon('gold', 'chip-icon')} <span><b>${res.gold}</b> Gold</span></div>
        <div class="training-resource-value">${getResourceIcon('sp', 'chip-icon')} <span><b>${res.statPoints}</b> SP</span></div>
        <hr />
        <h4>Learning costs</h4>
        <ul><li>1 AP: 5 Gold + 1 SP</li><li>2 AP: 10 Gold + 2 SP</li><li>3 AP: 20 Gold + 4 SP</li></ul>
        <h4>Destroy cost</h4>
        <p><b>${removalCost} Gold</b> now<br/><small>Next: ${removalCost + 1} Gold</small></p>
        <button class="void-inspect-link" data-action="open-pile" data-pile="void_deck">Inspect Void (${voidCardCount(state)})</button>
      </aside>
    </div>
    <div class="village-view-footer">
      <button class="btn" data-action="village-back">&larr; Village options</button>
    </div>`;
  }
  return `
  <section class="village-view village-component ${village.subView === 'shop' ? 'is-shop' : ''} ${village.subView === 'train' ? 'is-train' : ''}" aria-label="Village View">
    ${locationHeader}
    ${body}
  </section>`;
}

export function trainingConfirmModal(state: RunState, pending: PendingTrainingAction): string {
  if (state.activeHook.type !== 'VILLAGE' || state.activeHook.village.subView !== 'train' || !state.playerResources) return '';
  const village = state.activeHook.village;
  const card = pending.kind === 'learn'
    ? village.trainOptions.find(option => option.instanceId === pending.cardInstanceId)
    : state.playerMasterDeck.find(owned => owned.instanceId === pending.cardInstanceId);
  if (!card) return '';
  const stats = getEffectiveStatsFromState(state);
  const skillCost = getTrainingSkillCost(card);
  const destroyCost = getTrainRemovalCost(state);
  const goldCost = pending.kind === 'learn' ? skillCost.gold : destroyCost;
  const spCost = pending.kind === 'learn' ? skillCost.statPoints : 0;
  const canAfford = state.playerResources.gold >= goldCost && state.playerResources.statPoints >= spCost;
  const title = pending.kind === 'learn' ? `Learn ${card.name}?` : `Destroy ${card.name}?`;
  const detail = pending.kind === 'learn'
    ? `This exact card will move from the New Skills offer into your Combat Deck.`
    : `This card will permanently leave your Combat Deck and move to the Void. The next destruction will cost ${destroyCost + 1} Gold.`;

  return `
  <div class="modal-backdrop transaction-confirm-backdrop" data-action="cancel-training-action-backdrop">
    <div class="modal training-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="training-confirm-title">
      <header class="confirm-modal-header">
        <h2 id="training-confirm-title">${title}</h2>
        <button class="modal-close-btn" data-action="cancel-training-action" aria-label="Cancel">&times;</button>
      </header>
      <div class="training-confirm-body">
        <div class="training-confirm-card">${combatCardHtml(card, stats, false, 'noop', false, state)}</div>
        <div class="training-confirm-copy">
          <p>${detail}</p>
          <div class="training-confirm-balance">
            <span>${getResourceIcon('gold', 'chip-icon')} You have <b>${state.playerResources.gold} Gold</b></span>
            <span>${getResourceIcon('sp', 'chip-icon')} You have <b>${state.playerResources.statPoints} SP</b></span>
          </div>
          <div class="training-confirm-cost">Cost: <b>${goldCost} Gold${spCost > 0 ? ` + ${spCost} SP` : ''}</b></div>
        </div>
      </div>
      <footer class="confirm-modal-footer">
        <button class="btn primary big" data-action="confirm-training-action" ${canAfford ? '' : 'disabled'}>
          ${pending.kind === 'learn' ? 'Confirm Purchase' : 'Confirm Destroy'}
        </button>
        <button class="btn secondary" data-action="cancel-training-action">Cancel</button>
      </footer>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Card Info Modal (Right-Click & Long-Press 2s Inspection)
// ---------------------------------------------------------------------------


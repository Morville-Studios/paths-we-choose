import { CLASS_TRAIN_POOLS, createCombatCardInstance } from '../data/combatCards';
import { createTimestamp } from './combat';
import { drawTreasureCardsWithReshuffle } from './deck';
import { coordToKey } from './grid';
import { shuffleArray } from './rng';
import { calculateGoodsPrice, getEffectiveStatsFromState, syncVitals } from './stats';
import {
  ActiveVillageState,
  EquipmentSlot,
  GridCoord,
  PlayerResources,
  RunState,
  ShopItemDef,
} from './types';

export { syncVitals };

export const MIN_DECK_SIZE = 5;
export const TRAIN_OPTION_COUNT = 3;

export function createVillageState(coord: GridCoord, turn: number): ActiveVillageState {
  return {
    coord,
    turn,
    subView: 'main',
    trainOptions: [],
    shopStock: [],
    actionTaken: false,
  };
}

function getVillage(state: RunState): ActiveVillageState | null {
  return state.activeHook.type === 'VILLAGE' ? state.activeHook.village : null;
}

function withVillage(state: RunState, village: ActiveVillageState): RunState {
  return { ...state, activeHook: { type: 'VILLAGE', village } };
}

// ---------------------------------------------------------------------------
// Rest
// ---------------------------------------------------------------------------

/** Resting costs 5 gold + 1 gold for every 10 HP missing, rounded down. */
export function calculateRestCost(res: PlayerResources): number {
  const missingHp = Math.max(0, res.maxHp - res.hp);
  return 5 + Math.floor(missingHp / 10);
}

export interface RestEligibility {
  canRest: boolean;
  cost: number;
  reason?: 'full_health_no_ailments' | 'insufficient_gold';
}

/**
 * Checks whether the player can rest at the village inn.
 * Resting is disabled when the player is on full health AND has no negative status ailments,
 * or when the player has insufficient gold.
 */
export function checkRestEligibility(state: RunState): RestEligibility {
  if (!state.playerResources) {
    return { canRest: false, cost: 0 };
  }
  const res = state.playerResources;
  const cost = calculateRestCost(res);
  const isFullHealth = res.hp >= res.maxHp;
  const hasAilments = (state.statusEffects?.length ?? 0) > 0;

  if (isFullHealth && !hasAilments) {
    return { canRest: false, cost, reason: 'full_health_no_ailments' };
  }

  if (res.gold < cost) {
    return { canRest: false, cost, reason: 'insufficient_gold' };
  }

  return { canRest: true, cost };
}

export function villageRest(state: RunState): RunState {
  const village = getVillage(state);
  if (!village || village.actionTaken || !state.playerResources) return state;
  const eligibility = checkRestEligibility(state);
  if (!eligibility.canRest) return state;

  const cost = eligibility.cost;
  const hadAilments = (state.statusEffects?.length ?? 0) > 0;
  const missingHp = state.playerResources.maxHp - state.playerResources.hp;

  let bannerMessage = `You rest at the village inn for ${cost} gold and recover to full health.`;
  if (hadAilments && missingHp > 0) {
    bannerMessage = `You rest at the village inn for ${cost} gold, recover to full health, and cleanse all ailments.`;
  } else if (hadAilments) {
    bannerMessage = `You rest at the village inn for ${cost} gold and cleanse all negative ailments.`;
  }

  return {
    ...withVillage(state, { ...village, actionTaken: true }),
    playerResources: {
      ...state.playerResources,
      gold: state.playerResources.gold - cost,
      hp: state.playerResources.maxHp,
    },
    statusEffects: [],
    bannerMessage,
  };
}

// ---------------------------------------------------------------------------
// Shop (choosing Shop is the village's 1 action; transactions stay open until you leave)
// ---------------------------------------------------------------------------

export function villageOpenShop(state: RunState): RunState {
  const village = getVillage(state);
  if (!village) return state;

  // If already opened during this visit or an action was already taken, do not re-draw
  if (village.shopStockDrawn || (village.shopStock && village.shopStock.length > 0) || village.actionTaken) {
    return withVillage(state, { ...village, subView: 'shop' });
  }

  // Determine village level (default 1 if unspecified)
  const tile = state.board[coordToKey(village.coord)]?.card;
  const villageLevel = tile?.level ?? 1;
  const countToDraw = 5 + villageLevel;

  const { drawn, deck, discard, nextState, reshuffleCount } = drawTreasureCardsWithReshuffle(
    state.treasureDeck,
    state.treasureDiscard,
    countToDraw,
    state.rngState,
    state.treasureReshuffleCount,
    villageLevel
  );

  return {
    ...withVillage(state, {
      ...village,
      subView: 'shop',
      shopStock: drawn,
      shopStockDrawn: true,
    }),
    treasureDeck: deck,
    treasureDiscard: discard,
    rngState: nextState,
    treasureReshuffleCount: reshuffleCount,
  };
}

/**
 * Returns to the village menu. Only allowed until the player commits to an action
 * (a Shop purchase/sale, a Train pick, or Rest).
 */
export function villageBackToMenu(state: RunState): RunState {
  const village = getVillage(state);
  if (!village || village.actionTaken || village.subView === 'main') return state;
  return withVillage(state, { ...village, subView: 'main' });
}

export function equipItem(state: RunState, instanceId: string): RunState {
  if (state.activeHook.type === 'COMBAT') return state;
  const item = state.backpack.find((i) => i.instanceId === instanceId);
  if (!item || item.category === 'consumable') return state;
  const slot = item.category as EquipmentSlot;
  const previous = state.equippedGear[slot];
  const nextBackpack = state.backpack.filter((i) => i.instanceId !== instanceId);
  if (previous) nextBackpack.push(previous);
  const next: RunState = {
    ...state,
    equippedGear: { ...state.equippedGear, [slot]: item },
    backpack: nextBackpack,
    bannerMessage: `Equipped ${item.name}.`,
  };
  return syncVitals(state, next);
}

export function unequipItem(state: RunState, slotOrInstanceId: string): RunState {
  if (state.activeHook.type === 'COMBAT') return state;
  const slots: EquipmentSlot[] = ['weapon', 'armor', 'accessory'];
  let slot: EquipmentSlot | undefined;
  if (slots.includes(slotOrInstanceId as EquipmentSlot)) {
    slot = slotOrInstanceId as EquipmentSlot;
  } else {
    slot = slots.find((s) => state.equippedGear[s]?.instanceId === slotOrInstanceId);
  }
  if (!slot) return state;
  const current = state.equippedGear[slot];
  if (!current) return state;

  const next: RunState = {
    ...state,
    equippedGear: { ...state.equippedGear, [slot]: null },
    backpack: [...state.backpack, current],
    bannerMessage: `Unequipped ${current.name} to backpack.`,
  };
  return syncVitals(state, next);
}

export function buyItem(state: RunState, itemIdentifier: string): RunState {
  const village = getVillage(state);
  if (!village || village.subView !== 'shop' || !state.playerResources) return state;

  // 1. Look up item card in current village shop stock by instanceId or template id
  const stockIndex = (village.shopStock ?? []).findIndex(
    (i) =>
      i.instanceId === itemIdentifier ||
      i.id === itemIdentifier ||
      (itemIdentifier === 'lvl1_wooden_sword' && i.id === 'lvl1_iron_sword')
  );

  // A purchase must transfer a physical stock card; never mint a catalog copy.
  if (stockIndex < 0) return state;
  const item = village.shopStock[stockIndex];
  const nextShopStock = village.shopStock.filter((_, idx) => idx !== stockIndex);

  const eff = getEffectiveStatsFromState(state);
  const cost = calculateGoodsPrice(item.buyPrice, eff.cha);
  if (state.playerResources.gold < cost) return state;

  const paid: RunState = {
    ...withVillage(state, { ...village, shopStock: nextShopStock, actionTaken: true }),
    playerResources: {
      ...state.playerResources,
      gold: state.playerResources.gold - cost,
    },
    backpack: [...state.backpack, item],
    bannerMessage: `Bought ${item.name} for ${cost} Gold.`,
  };
  if (item.category === 'consumable') return paid;
  const equipped = equipItem(paid, item.instanceId!);
  return { ...equipped, bannerMessage: `Bought and equipped ${item.name} for ${cost} Gold.` };
}

export function sellItem(state: RunState, instanceId: string): RunState {
  const village = getVillage(state);
  if (!village || village.subView !== 'shop' || !state.playerResources) return state;

  let item = state.backpack.find((i) => i.instanceId === instanceId);
  let next: RunState = state;
  if (item) {
    next = { ...state, backpack: state.backpack.filter((i) => i.instanceId !== instanceId) };
  } else {
    const slots: EquipmentSlot[] = ['weapon', 'armor', 'accessory'];
    const slot = slots.find((s) => state.equippedGear[s]?.instanceId === instanceId);
    if (!slot) return state;
    item = state.equippedGear[slot] as ShopItemDef;
    next = { ...state, equippedGear: { ...state.equippedGear, [slot]: null } };
  }

  next = {
    ...next,
    treasureDiscard: [...next.treasureDiscard, item],
    activeHook: { type: 'VILLAGE', village: { ...village, actionTaken: true } },
    playerResources: {
      ...(next.playerResources as NonNullable<RunState['playerResources']>),
      gold: (next.playerResources?.gold ?? 0) + item.sellPrice,
    },
    bannerMessage: `Sold ${item.name} for ${item.sellPrice} Gold.`,
  };
  return syncVitals(state, next);
}

export function useConsumable(state: RunState, instanceId: string): RunState {
  if (!state.playerResources) return state;
  if (state.activeHook.type === 'ON_GAME_OVER' || state.activeHook.type === 'ON_STAGE_COMPLETE') {
    return state;
  }
  const item = state.backpack.find((i) => i.instanceId === instanceId);
  if (!item || item.category !== 'consumable' || !item.healAmount) return state;
  const initialHp = state.playerResources.hp;
  const hp = Math.min(state.playerResources.maxHp, initialHp + item.healAmount);
  const healGained = hp - initialHp;
  const nextBackpack = state.backpack.filter((i) => i.instanceId !== instanceId);

  if (state.activeHook.type === 'COMBAT') {
    const combat = state.activeHook.combat;
    return {
      ...state,
      backpack: nextBackpack,
      playerResources: { ...state.playerResources, hp },
      activeHook: {
        ...state.activeHook,
        combat: {
          ...combat,
          combatLog: [
            ...combat.combatLog,
            `[${createTimestamp(state.logTimestamp)}] 🧪 Used ${item.name}: restored +${healGained} HP (${hp}/${state.playerResources.maxHp} HP).`,
          ],
        },
      },
      bannerMessage: `Used ${item.name}: restored ${healGained} HP.`,
    };
  }

  return {
    ...state,
    backpack: nextBackpack,
    playerResources: { ...state.playerResources, hp },
    bannerMessage: `Used ${item.name}: restored ${healGained} HP.`,
  };
}

// ---------------------------------------------------------------------------
// Train
// ---------------------------------------------------------------------------

export function villageOpenTrain(state: RunState): RunState {
  const village = getVillage(state);
  if (!village || village.actionTaken || !state.playerClass) return state;
  // Offers are rolled once per visit so going back to the menu cannot be used to reroll them.
  if (village.trainOptions.length > 0) {
    return withVillage(state, { ...village, subView: 'train' });
  }
  const pool = CLASS_TRAIN_POOLS[state.playerClass];
  const { shuffled, nextState } = shuffleArray(pool, state.rngState);
  const trainOptions = shuffled
    .slice(0, TRAIN_OPTION_COUNT)
    .map((id, idx) => createCombatCardInstance(id, `offer_t${state.turn}_${idx}`));
  return {
    ...withVillage(state, { ...village, subView: 'train', trainOptions }),
    rngState: nextState,
  };
}

export function villageTrainRemove(state: RunState, instanceId: string): RunState {
  const village = getVillage(state);
  if (!village || village.subView !== 'train') return state;
  if (state.playerMasterDeck.length <= MIN_DECK_SIZE) return state;
  const card = state.playerMasterDeck.find((c) => c.instanceId === instanceId);
  if (!card) return state;
  return {
    ...state,
    playerMasterDeck: state.playerMasterDeck.filter((c) => c.instanceId !== instanceId),
    bannerMessage: `Removed ${card.name} from your deck.`,
  };
}

export function villageTrainDraft(state: RunState, offerInstanceId: string): RunState {
  const village = getVillage(state);
  if (!village || village.subView !== 'train') return state;
  const offer = village.trainOptions.find((c) => c.instanceId === offerInstanceId);
  if (!offer) return state;
  return {
    ...state,
    playerMasterDeck: [
      ...state.playerMasterDeck,
      { ...offer, instanceId: `${offer.id}_trained_t${state.turn}` },
    ],
    bannerMessage: `Added ${offer.name} to your deck.`,
  };
}

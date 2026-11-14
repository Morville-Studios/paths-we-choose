import { appendGameLog, createTimestamp } from './log';
import { drawNewSkillsWithReshuffle, drawTreasureCardsWithReshuffle } from './deck';
import { coordToKey } from './grid';
import { reconcileRunNewSkills } from './newSkills';
import { calculateGoodsPrice, getEffectiveStatsFromState, syncVitals } from './stats';
import {
  ActiveVillageState,
  EquipmentSlot,
  GridCoord,
  PlayerResources,
  RunState,

} from './types';

export { syncVitals };

export const MIN_DECK_SIZE = 5;
export const TRAIN_OPTION_COUNT = 3;
export const REST_HP_PER_TICK = 1;
export const TRAIN_REMOVAL_BASE_GOLD_COST = 5;

export interface VillageRestOption {
  ticks: number;
  maxTicks: number;
  hpRestored: number;
  cost: number;
  isFullRest: boolean;
}

export interface TrainingSkillCost {
  gold: number;
  statPoints: number;
}

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

export const VILLAGE_SHOP_BASE_SLOTS = 3;

/** Village shop slot count scales as 3 + Village Level (Grassland 4, Forest 5, Swamp 6, Cave 7). */
export function getVillageShopSlotCount(villageLevel: number): number {
  return VILLAGE_SHOP_BASE_SLOTS + villageLevel;
}

/** Pre-draw the shop and class training offers once, on entering a village. */
export function prepareVillage(state: RunState, coord: GridCoord, turn: number): RunState {
  const reconciledState = reconcileRunNewSkills(state);
  const node = reconciledState.board[coordToKey(coord)];
  const tile = node?.card;
  const villageLevel = tile?.level ?? 1;
  const stockDraw = drawTreasureCardsWithReshuffle(
    reconciledState.treasureDeck,
    reconciledState.treasureDiscard,
    getVillageShopSlotCount(villageLevel),
    reconciledState.rngState,
    reconciledState.treasureReshuffleCount,
    villageLevel
  );
  const trainDraw = drawNewSkillsWithReshuffle(
    reconciledState.newSkillsDeck,
    reconciledState.newSkillsDiscard,
    TRAIN_OPTION_COUNT,
    stockDraw.nextState,
    state.newSkillsReshuffleCount
  );

  return {
    ...reconciledState,
    rngState: trainDraw.nextState,
    treasureDeck: stockDraw.deck,
    treasureDiscard: stockDraw.discard,
    treasureReshuffleCount: stockDraw.reshuffleCount,
    newSkillsDeck: trainDraw.deck,
    newSkillsDiscard: trainDraw.discard,
    newSkillsReshuffleCount: trainDraw.reshuffleCount,
    activeHook: {
      type: 'VILLAGE',
      village: {
        ...createVillageState(coord, turn),
        shopStock: stockDraw.drawn,
        shopStockDrawn: true,
        trainOptions: trainDraw.drawn,
        ...(node?.attachedShrineCard ? { attachedShrineCard: node.attachedShrineCard } : {}),
      },
    },
    gameLog: appendGameLog(state, `[${createTimestamp(state.logTimestamp)}] 🏡 Arrived at ${tile?.name ?? 'Village'}. Services are available.`),
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

/** Every inn-rest tick heals two HP and costs one Gold; its final tick restores all remaining HP. */
export function calculateRestCost(res: PlayerResources, villageLevel = 1): number {
  return getVillageRestOption(res, undefined, villageLevel).cost;
}

export function getVillageRestOption(res: PlayerResources, requestedTicks?: number, villageLevel = 1): VillageRestOption {
  const missingHp = Math.max(0, res.maxHp - res.hp);
  const maxTicks = Math.ceil(missingHp / REST_HP_PER_TICK);
  const ticks = maxTicks === 0 ? 0 : Math.max(1, Math.min(maxTicks, Math.floor(requestedTicks ?? maxTicks)));
  const hpRestored = Math.min(missingHp, ticks * REST_HP_PER_TICK);
  return { ticks, maxTicks, hpRestored, cost: hpRestored * (1 + Math.max(1, villageLevel)), isFullRest: ticks === maxTicks };
}

export interface RestEligibility {
  canRest: boolean;
  cost: number;
  hpRestored: number;
  ticks: number;
  maxTicks: number;
  reason?: 'full_health' | 'insufficient_gold';
}

/**
 * Checks whether the player can rest at the village inn.
 * Resting is disabled at full health or when the requested rest duration costs more than the player has.
 */
export function checkRestEligibility(state: RunState, requestedTicks?: number): RestEligibility {
  if (!state.playerResources) {
    return { canRest: false, cost: 0, hpRestored: 0, ticks: 0, maxTicks: 0 };
  }
  const res = state.playerResources;
  const village = getVillage(state); const villageLevel = village ? (state.board[coordToKey(village.coord)]?.card.level ?? 1) : 1; const option = getVillageRestOption(res, requestedTicks, villageLevel);
  const isFullHealth = res.hp >= res.maxHp;

  if (isFullHealth) {
    return { canRest: false, ...option, reason: 'full_health' };
  }

  if (res.gold < option.cost) {
    return { canRest: false, ...option, reason: 'insufficient_gold' };
  }

  return { canRest: true, ...option };
}

export function villageRest(state: RunState, requestedTicks?: number): RunState {
  const village = getVillage(state);
  if (!village || !state.playerResources) return state;
  const eligibility = checkRestEligibility(state, requestedTicks);
  if (!eligibility.canRest) return state;

  return {
    ...withVillage(state, village),
    playerResources: {
      ...state.playerResources,
      gold: state.playerResources.gold - eligibility.cost,
      hp: state.playerResources.hp + eligibility.hpRestored,
    },
    gameLog: appendGameLog(state, `[${createTimestamp(state.logTimestamp)}] 🛏️ Rested at Village: restored ${eligibility.hpRestored} HP for ${eligibility.cost} Gold.`),
    bannerMessage: `Rested for ${eligibility.ticks} ${eligibility.ticks === 1 ? 'tick' : 'ticks'}: restored ${eligibility.hpRestored} HP for ${eligibility.cost} Gold.`,
  };
}

// ---------------------------------------------------------------------------
// Shop (stock is prepared on village entry and remains available until the player leaves)
// ---------------------------------------------------------------------------

export function villageOpenShop(state: RunState): RunState {
  const village = getVillage(state);
  if (!village) return state;

  // Stock is prepared on entry. The fallback supports older saves that lack pre-drawn stock.
  if (village.shopStockDrawn || (village.shopStock && village.shopStock.length > 0)) {
    return withVillage(state, { ...village, subView: 'shop' });
  }

  // Determine village level (default 1 if unspecified)
  const tile = state.board[coordToKey(village.coord)]?.card;
  const villageLevel = tile?.level ?? 1;
  const countToDraw = getVillageShopSlotCount(villageLevel);

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
 * Returns to the village menu without changing pre-drawn shop or training inventory.
 */
export function villageBackToMenu(state: RunState): RunState {
  const village = getVillage(state);
  if (!village || village.subView === 'main') return state;
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
    gameLog: appendGameLog(state, `[${createTimestamp(state.logTimestamp)}] 🛡️ Equipped ${item.name}.`),
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
    gameLog: appendGameLog(state, `[${createTimestamp(state.logTimestamp)}] 🛡️ Unequipped ${current.name} to backpack.`),
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
    ...withVillage(state, { ...village, shopStock: nextShopStock }),
    playerResources: {
      ...state.playerResources,
      gold: state.playerResources.gold - cost,
    },
    backpack: [...state.backpack, item],
    gameLog: appendGameLog(state, `[${createTimestamp(state.logTimestamp)}] 🛒 Bought ${item.name} for ${cost} Gold.`),
    bannerMessage: `Bought ${item.name} for ${cost} Gold.`,
  };
  if (item.category === 'consumable') return paid;
  const equipped = equipItem(paid, item.instanceId!);
  return { ...equipped, bannerMessage: `Bought and equipped ${item.name} for ${cost} Gold.` };
}

export function sellItem(state: RunState, instanceId: string): RunState {
  const village = getVillage(state);
  if (!village || village.subView !== 'shop' || !state.playerResources) return state;

  const item = state.backpack.find((i) => i.instanceId === instanceId);
  if (!item) return state;
  let next: RunState = { ...state, backpack: state.backpack.filter((i) => i.instanceId !== instanceId) };

  next = {
    ...next,
    voidItems: [...(state.voidItems ?? []), item],
    activeHook: { type: 'VILLAGE', village },
    playerResources: {
      ...(next.playerResources as NonNullable<RunState['playerResources']>),
      gold: (next.playerResources?.gold ?? 0) + item.sellPrice,
    },
    gameLog: appendGameLog(state, `[${createTimestamp(state.logTimestamp)}] 💰 Sold & Banished ${item.name} to the Void for ${item.sellPrice} Gold.`),
    bannerMessage: `Sold ${item.name} for ${item.sellPrice} Gold (Banished to the Void).`,
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
  const initialHp = state.playerResources.hp; if (initialHp >= state.playerResources.maxHp) return state;
  const hp = Math.min(state.playerResources.maxHp, initialHp + item.healAmount);
  const healGained = hp - initialHp; const nextTreasureDiscard = [...state.treasureDiscard, item];
  const nextBackpack = state.backpack.filter((i) => i.instanceId !== instanceId);

  if (state.activeHook.type === 'COMBAT') {
    const combat = state.activeHook.combat;
    return {
      ...state,
      backpack: nextBackpack, treasureDiscard: nextTreasureDiscard,
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
      gameLog: appendGameLog(state, `[${createTimestamp(state.logTimestamp)}] 🧪 Used ${item.name}: restored +${healGained} HP (${hp}/${state.playerResources.maxHp} HP).`),
      bannerMessage: `Used ${item.name}: restored ${healGained} HP.`,
    };
  }

  return {
    ...state,
    backpack: nextBackpack,
    playerResources: { ...state.playerResources, hp },
    gameLog: appendGameLog(state, `[${createTimestamp(state.logTimestamp)}] 🧪 Used ${item.name}: restored +${healGained} HP (${hp}/${state.playerResources.maxHp} HP).`),
    treasureDiscard: nextTreasureDiscard, bannerMessage: `Used ${item.name}: restored ${healGained} HP.`,
  };
}

// ---------------------------------------------------------------------------
// Train
// ---------------------------------------------------------------------------

export function villageOpenTrain(state: RunState): RunState {
  const village = getVillage(state);
  if (!village || !state.playerClass) return state;
  // Offers are rolled once per visit so going back to the menu cannot be used to reroll them.
  if (village.trainOptions.length > 0) {
    return withVillage(state, { ...village, subView: 'train' });
  }
  const fallback = drawNewSkillsWithReshuffle(
    state.newSkillsDeck,
    state.newSkillsDiscard,
    TRAIN_OPTION_COUNT,
    state.rngState,
    state.newSkillsReshuffleCount
  );
  return {
    ...withVillage(state, { ...village, subView: 'train', trainOptions: fallback.drawn }),
    rngState: fallback.nextState,
    newSkillsDeck: fallback.deck,
    newSkillsDiscard: fallback.discard,
    newSkillsReshuffleCount: fallback.reshuffleCount,
  };
}

export function getTrainingSkillCost(card: { apCost: number }): TrainingSkillCost {
  const factor = 2 ** Math.max(0, card.apCost - 1);
  return { gold: 5 * factor, statPoints: factor };
}

export function getTrainRemovalCost(state: Pick<RunState, 'trainRemovalCount'>): number {
  return TRAIN_REMOVAL_BASE_GOLD_COST + (state.trainRemovalCount ?? 0);
}

export function villageTrainRemove(state: RunState, instanceId: string): RunState {
  const village = getVillage(state);
  if (!village || village.subView !== 'train' || !state.playerResources) return state;
  if (state.playerMasterDeck.length <= MIN_DECK_SIZE) return state;
  const card = state.playerMasterDeck.find((c) => c.instanceId === instanceId);
  if (!card) return state;
  const cost = getTrainRemovalCost(state);
  if (state.playerResources.gold < cost) return state;
  return {
    ...state,
    playerMasterDeck: state.playerMasterDeck.filter((c) => c.instanceId !== instanceId),
    voidCards: [...(state.voidCards ?? []), card],
    playerResources: { ...state.playerResources, gold: state.playerResources.gold - cost },
    trainRemovalCount: (state.trainRemovalCount ?? 0) + 1,
    gameLog: appendGameLog(state, `[${createTimestamp(state.logTimestamp)}] 🔥 Banished ${card.name} to the Void for ${cost} Gold.`),
    bannerMessage: `Banished ${card.name} for ${cost} Gold and sent it to the Void. Next banishment costs ${cost + 1} Gold.`,
  };
}

export function villageTrainDraft(state: RunState, offerInstanceId: string): RunState {
  const village = getVillage(state);
  if (!village || village.subView !== 'train' || !state.playerResources) return state;
  const offer = village.trainOptions.find((c) => c.instanceId === offerInstanceId);
  if (!offer) return state;
  const cost = getTrainingSkillCost(offer);
  if (state.playerResources.gold < cost.gold || state.playerResources.statPoints < cost.statPoints) return state;
  return {
    ...state,
    activeHook: {
      type: 'VILLAGE',
      village: { ...village, trainOptions: village.trainOptions.filter((card) => card.instanceId !== offerInstanceId) },
    },
    playerResources: {
      ...state.playerResources,
      gold: state.playerResources.gold - cost.gold,
      statPoints: state.playerResources.statPoints - cost.statPoints,
    },
    playerMasterDeck: [
      ...state.playerMasterDeck,
      { ...offer, instanceId: `${offer.id}_trained_t${state.turn}` },
    ],
    gameLog: appendGameLog(state, `[${createTimestamp(state.logTimestamp)}] 📜 Learned skill: ${offer.name} for ${cost.gold} Gold and ${cost.statPoints} SP.`),
    bannerMessage: `Learned ${offer.name} for ${cost.gold} Gold and ${cost.statPoints} SP.`,
  };
}

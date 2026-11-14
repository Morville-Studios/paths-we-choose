import { appendGameLog, createTimestamp } from './log';
import {
  CharacterStats,
  ClassId,
  CombatGearBonuses,
  DerivedCombatStats,
  EquipmentSlot,
  EquippedGear,
  RunState,
  ShopItemDef,
  StatKey,
} from './types';
import { coordToKey } from './grid';

/** A Shrine may raise Base Stats only as high as Shrine Level + 1. */
export function getActiveShrineBaseStatCap(state: RunState): number | null {
  if (state.activeHook.type !== 'SHRINE') return null;
  const card = state.board[coordToKey(state.activeHook.shrine.coord)]?.card;
  if (!card?.hasShrine) return null;
  return card.level + 1;
}

export function computeGearBonuses(equippedGear: EquippedGear): CharacterStats {
  const bonus: CharacterStats = { str: 0, dex: 0, agi: 0, int: 0, cha: 0, vit: 0 };
  const slots: Array<keyof EquippedGear> = ['weapon', 'armor', 'accessory'];
  for (const slot of slots) {
    const item = equippedGear[slot];
    if (item && item.statBonus) {
      bonus.str += item.statBonus.str ?? 0;
      bonus.dex += item.statBonus.dex ?? 0;
      bonus.agi += item.statBonus.agi ?? 0;
      bonus.int += item.statBonus.int ?? 0;
      bonus.cha += item.statBonus.cha ?? 0;
      bonus.vit += item.statBonus.vit ?? 0;
    }
  }
  return bonus;
}

export function computeCombatGearBonuses(equippedGear: EquippedGear): Required<CombatGearBonuses> {
  const bonus: Required<CombatGearBonuses> = { acc: 0, atk: 0, def: 0, matk: 0, mdef: 0, eva: 0, pen: 0 };
  const slots: Array<keyof EquippedGear> = ['weapon', 'armor', 'accessory'];
  for (const slot of slots) {
    const item = equippedGear[slot];
    if (item && item.gearBonus) {
      bonus.acc += item.gearBonus.acc ?? 0;
      bonus.atk += item.gearBonus.atk ?? 0;
      bonus.def += item.gearBonus.def ?? 0;
      bonus.matk += item.gearBonus.matk ?? 0;
      bonus.mdef += item.gearBonus.mdef ?? 0;
      bonus.eva += item.gearBonus.eva ?? 0;
      bonus.pen += item.gearBonus.pen ?? 0;
    }
  }
  return bonus;
}

export const INNATE_STAT_BONUS = 1;

export function computeEffectiveStats(
  baseStats: CharacterStats,
  classBonuses: CharacterStats,
  equippedGear: EquippedGear,
  blessingBonuses?: CharacterStats
): CharacterStats {
  const gear = computeGearBonuses(equippedGear);
  const blessings = blessingBonuses ?? { str: 0, dex: 0, agi: 0, int: 0, cha: 0, vit: 0 };
  return {
    str: INNATE_STAT_BONUS + baseStats.str + classBonuses.str + blessings.str + gear.str,
    dex: INNATE_STAT_BONUS + baseStats.dex + classBonuses.dex + blessings.dex + gear.dex,
    agi: INNATE_STAT_BONUS + baseStats.agi + classBonuses.agi + blessings.agi + gear.agi,
    int: INNATE_STAT_BONUS + baseStats.int + classBonuses.int + blessings.int + gear.int,
    cha: INNATE_STAT_BONUS + baseStats.cha + classBonuses.cha + blessings.cha + gear.cha,
    vit: INNATE_STAT_BONUS + baseStats.vit + classBonuses.vit + blessings.vit + gear.vit,
  };
}

/**
 * Each point of Effective CHA reduces the prices of purchaseable goods by 5%.
 * e.g., 1 CHA = 5% off, 2 CHA = 10% off, 3 CHA = 15% off, etc.
 * Minimum price is 1 Gold.
 */
export function calculateGoodsPrice(basePrice: number, effectiveCha: number): number {
  const discountRate = Math.min(0.9, Math.max(0, effectiveCha * 0.05));
  return Math.max(1, Math.round(basePrice * (1 - discountRate)));
}

/**
 * Wandering Merchant applies double the hero's Charisma DISC (e.g. 20% DISC -> 40% off),
 * with the resulting Gold price rounded up (minimum 1 Gold).
 */
export function calculateMerchantGoodsPrice(basePrice: number, effectiveCha: number): number {
  const baseDiscountRate = Math.min(0.9, Math.max(0, effectiveCha * 0.05));
  const doubledDiscountRate = Math.min(0.9, baseDiscountRate * 2);
  return Math.max(1, Math.ceil(basePrice * (1 - doubledDiscountRate)));
}

/**
 * 1 point in DEX increases ACC by 1 (plus direct gear ACC).
 */
export function getPlayerAcc(stats: CharacterStats, gearAcc = 0): number {
  return stats.dex + gearAcc;
}

/**
 * 1 point in AGI increases EVA by 1 (plus gear and temporary card round EVA bonus).
 */
export function getPlayerEva(stats: CharacterStats, bonusEva = 0, gearEva = 0): number {
  return stats.agi + gearEva + bonusEva;
}

/** Hero ATK: floor(STR / 2) + floor(DEX / 3) + gear.atk */
export function getPlayerAtk(stats: CharacterStats, gearAtk = 0): number {
  return Math.floor(stats.str / 2) + Math.floor(stats.dex / 3) + gearAtk;
}

/** Physical DEF: floor((STR + AGI + VIT) / 5) + gear.def (+ divineProtection) */
export function getPlayerDef(stats: CharacterStats, gearDef = 0, divineProtection = 0): number {
  return Math.floor((stats.str + stats.agi + stats.vit) / 5) + gearDef + divineProtection;
}

/** Magical ATK: floor(INT / 2) + gear.matk (increases by 1 for every 2 INT) */
export function getPlayerMatk(stats: CharacterStats, gearMatk = 0): number {
  return Math.floor(stats.int / 2) + gearMatk;
}

/** Magical DEF: floor(INT / 5) + gear.mdef (+ divineProtection) */
export function getPlayerMdef(stats: CharacterStats, gearMdef = 0, divineProtection = 0): number {
  return Math.floor(stats.int / 5) + gearMdef + divineProtection;
}

/** Max Action Points (ACT): starts at 3, +1 for every 5 INT */
export function getPlayerAct(stats: CharacterStats): number {
  return 3 + Math.floor(stats.int / 5);
}

/** Fighter [Berzerk] Passive: +1 ATK when HP <= 50% max HP; +2 ATK instead when HP <= 25% max HP */
export function getFighterBerzerkBonus(
  playerClass?: ClassId | null,
  hp?: number,
  maxHp?: number
): number {
  if (playerClass !== 'fighter') return 0;
  if (hp === undefined || maxHp === undefined || maxHp <= 0) return 0;
  if (hp <= maxHp * 0.25) return 2;
  if (hp <= maxHp * 0.5) return 1;
  return 0;
}

export function getDerivedCombatStats(
  stats: CharacterStats,
  gear: EquippedGear,
  temporaryEva = 0,
  extraAtkBonus = 0,
  divineProtection = 0
): DerivedCombatStats {
  const combatGear = computeCombatGearBonuses(gear);
  return {
    acc: getPlayerAcc(stats, combatGear.acc),
    eva: getPlayerEva(stats, temporaryEva, combatGear.eva),
    atk: getPlayerAtk(stats, combatGear.atk) + extraAtkBonus,
    def: getPlayerDef(stats, combatGear.def, divineProtection),
    matk: getPlayerMatk(stats, combatGear.matk),
    mdef: getPlayerMdef(stats, combatGear.mdef, divineProtection),
    pen: combatGear.pen,
    act: getPlayerAct(stats),
    berzerkBonus: extraAtkBonus > 0 ? extraAtkBonus : undefined,
  };
}

export function getEffectiveStatsFromState(state: RunState): CharacterStats {
  return computeEffectiveStats(
    state.playerBaseStats,
    state.playerClassBonuses,
    state.equippedGear,
    state.playerBlessingBonuses
  );
}

export function calculateMaxHp(effectiveVit: number): number {
  return 10 + effectiveVit * 2;
}

/**
 * Recomputes maxHp from Effective VIT after any stat/blessing/gear change.
 * Gaining max HP also grants the same amount of current HP; losing max HP clamps current HP.
 */
export function syncVitals(prev: RunState, next: RunState): RunState {
  if (!next.playerResources || !prev.playerResources) return next;
  const newMax = calculateMaxHp(getEffectiveStatsFromState(next).vit);
  const delta = newMax - prev.playerResources.maxHp;
  const hp = Math.min(newMax, prev.playerResources.hp + Math.max(0, delta));
  return {
    ...next,
    playerResources: { ...next.playerResources, maxHp: newMax, hp },
  };
}

export interface GearPreview {
  slot: EquipmentSlot;
  replaced: ShopItemDef | null; // What currently sits in that slot (moves to backpack / is lost on sell)
  before: CharacterStats;       // Effective stats now
  after: CharacterStats;        // Effective stats if the swap happens
  maxHpBefore: number;
  maxHpAfter: number;
  combatBefore: DerivedCombatStats;
  combatAfter: DerivedCombatStats;
}

/**
 * Previews the stat effect of putting `newItem` into `slot` (or emptying the slot when null).
 * Pure: does not change state.
 */
export function previewGearChange(
  state: RunState,
  slot: EquipmentSlot,
  newItem: ShopItemDef | Omit<ShopItemDef, 'instanceId'> | null
): GearPreview {
  const before = getEffectiveStatsFromState(state);
  const nextGear: EquippedGear = {
    ...state.equippedGear,
    [slot]: newItem as ShopItemDef | null,
  };
  const after = computeEffectiveStats(
    state.playerBaseStats,
    state.playerClassBonuses,
    nextGear,
    state.playerBlessingBonuses
  );
  return {
    slot,
    replaced: state.equippedGear[slot],
    before,
    after,
    maxHpBefore: calculateMaxHp(before.vit),
    maxHpAfter: calculateMaxHp(after.vit),
    combatBefore: getDerivedCombatStats(before, state.equippedGear),
    combatAfter: getDerivedCombatStats(after, nextGear),
  };
}

/**
 * Stat upgrade cost requirement: currentBaseValue * 10 SP.
 * e.g., Base 1 -> 2 costs 10 SP.
 *       Base 2 -> 3 costs 20 SP.
 *       Base 3 -> 4 costs 30 SP.
 *       Base 4 -> 5 costs 40 SP.
 */
export function getBaseStatUpgradeCost(currentBaseValue: number): number {
  return currentBaseValue * 10;
}

export function canUpgradeBaseStat(state: RunState, stat: StatKey): boolean {
  if (!state.playerResources) return false;
  const currentBase = state.playerBaseStats[stat];
  const shrineCap = getActiveShrineBaseStatCap(state);
  if (shrineCap !== null && currentBase >= shrineCap) return false;
  const cost = getBaseStatUpgradeCost(currentBase);
  return state.playerResources.statPoints >= cost;
}

export function upgradeBaseStat(state: RunState, stat: StatKey): RunState {
  if (!state.playerResources) return state;
  const currentBase = state.playerBaseStats[stat];
  const shrineCap = getActiveShrineBaseStatCap(state);
  if (shrineCap !== null && currentBase >= shrineCap) return state;
  const cost = getBaseStatUpgradeCost(currentBase);
  if (state.playerResources.statPoints < cost) {
    return state;
  }

  const nextBaseStats: CharacterStats = {
    ...state.playerBaseStats,
    [stat]: currentBase + 1,
  };

  const prevEffective = getEffectiveStatsFromState(state);
  const nextEffective = computeEffectiveStats(
    nextBaseStats,
    state.playerClassBonuses,
    state.equippedGear,
    state.playerBlessingBonuses
  );

  const vitDelta = nextEffective.vit - prevEffective.vit;
  const nextMaxHp = calculateMaxHp(nextEffective.vit);
  const nextHp = Math.min(nextMaxHp, state.playerResources.hp + Math.max(0, vitDelta * 2));

  return {
    ...state,
    playerBaseStats: nextBaseStats,
    playerResources: {
      ...state.playerResources,
      statPoints: state.playerResources.statPoints - cost,
      maxHp: nextMaxHp,
      hp: nextHp,
    },
    gameLog: appendGameLog(state, `[${createTimestamp(state.logTimestamp)}] ⬆️ Upgraded Base ${stat.toUpperCase()} to ${currentBase + 1} (-${cost} SP).`),
    bannerMessage: `Upgraded Base ${stat.toUpperCase()} to ${currentBase + 1} (-${cost} SP)!`,
  };
}

/**
 * Calculates the escape roll threshold for fleeing battle:
 * floor(total AGI / 2) (minimum 1).
 * Rolling <= this value on a 1d6 successfully escapes battle.
 */
export function getFleeThreshold(effectiveStats: CharacterStats): number {
  return Math.max(1, Math.floor(effectiveStats.agi / 2));
}

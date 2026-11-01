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

export function computeGearBonuses(equippedGear: EquippedGear): CharacterStats {
  const bonus: CharacterStats = { str: 0, dex: 0, agi: 0, int: 0, cha: 0, luk: 0 };
  const slots: Array<keyof EquippedGear> = ['weapon', 'armor', 'accessory'];
  for (const slot of slots) {
    const item = equippedGear[slot];
    if (item && item.statBonus) {
      bonus.str += item.statBonus.str ?? 0;
      bonus.dex += item.statBonus.dex ?? 0;
      bonus.agi += item.statBonus.agi ?? 0;
      bonus.int += item.statBonus.int ?? 0;
      bonus.cha += item.statBonus.cha ?? 0;
      bonus.luk += item.statBonus.luk ?? 0;
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

export function computeEffectiveStats(
  baseStats: CharacterStats,
  classBonuses: CharacterStats,
  equippedGear: EquippedGear,
  blessingBonuses?: CharacterStats
): CharacterStats {
  const gear = computeGearBonuses(equippedGear);
  const blessings = blessingBonuses ?? { str: 0, dex: 0, agi: 0, int: 0, cha: 0, luk: 0 };
  return {
    str: baseStats.str + classBonuses.str + blessings.str + gear.str,
    dex: baseStats.dex + classBonuses.dex + blessings.dex + gear.dex,
    agi: baseStats.agi + classBonuses.agi + blessings.agi + gear.agi,
    int: baseStats.int + classBonuses.int + blessings.int + gear.int,
    cha: baseStats.cha + classBonuses.cha + blessings.cha + gear.cha,
    luk: baseStats.luk + classBonuses.luk + blessings.luk + gear.luk,
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

/** 1 ACC is gained for each 2 DEX, plus direct equipment bonuses. */
export function getPlayerAcc(stats: CharacterStats, gearAcc = 0): number {
  return Math.floor(stats.dex / 2) + gearAcc;
}

/** 1 EVA is gained for each 2 AGI (plus any gear and temporary card round EVA bonus) */
export function getPlayerEva(stats: CharacterStats, bonusEva = 0, gearEva = 0): number {
  return Math.floor(stats.agi / 2) + gearEva + bonusEva;
}

/** Hero ATK: floor(STR / 2) + floor(DEX / 3) + gear.atk */
export function getPlayerAtk(stats: CharacterStats, gearAtk = 0): number {
  return Math.floor(stats.str / 2) + Math.floor(stats.dex / 3) + gearAtk;
}

/** Physical DEF: floor(STR / 5) + floor(AGI / 3) + gear.def */
export function getPlayerDef(stats: CharacterStats, gearDef = 0): number {
  return Math.floor(stats.str / 5) + Math.floor(stats.agi / 3) + gearDef;
}

/** Magical ATK: floor(INT / 2) + gear.matk (increases by 1 for every 2 INT) */
export function getPlayerMatk(stats: CharacterStats, gearMatk = 0): number {
  return Math.floor(stats.int / 2) + gearMatk;
}

/** Magical DEF: floor(INT / 5) + gear.mdef (increases by 1 for every 5 INT) */
export function getPlayerMdef(stats: CharacterStats, gearMdef = 0): number {
  return Math.floor(stats.int / 5) + gearMdef;
}

/** Max Action Points (ACT): starts at 3, +1 for every 5 INT */
export function getPlayerAct(stats: CharacterStats): number {
  return 3 + Math.floor(stats.int / 5);
}

/** Critical Hit Threshold: default 12 (Boxcars), improved by 1 for every 10 LUK */
export function getPlayerCritThreshold(stats: CharacterStats): number {
  return Math.max(2, 12 - Math.floor(stats.luk / 10));
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
  extraAtkBonus = 0
): DerivedCombatStats {
  const combatGear = computeCombatGearBonuses(gear);
  return {
    acc: getPlayerAcc(stats, combatGear.acc),
    eva: getPlayerEva(stats, temporaryEva, combatGear.eva),
    atk: getPlayerAtk(stats, combatGear.atk) + extraAtkBonus,
    def: getPlayerDef(stats, combatGear.def),
    matk: getPlayerMatk(stats, combatGear.matk),
    mdef: getPlayerMdef(stats, combatGear.mdef),
    pen: combatGear.pen,
    act: getPlayerAct(stats),
    critThreshold: getPlayerCritThreshold(stats),
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

export function calculateMaxHp(effectiveStr: number): number {
  return 10 + effectiveStr * 2;
}

/**
 * Recomputes maxHp from Effective STR after any stat/blessing/gear change.
 * Gaining max HP also grants the same amount of current HP; losing max HP clamps current HP.
 */
export function syncVitals(prev: RunState, next: RunState): RunState {
  if (!next.playerResources || !prev.playerResources) return next;
  const newMax = calculateMaxHp(getEffectiveStatsFromState(next).str);
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
    maxHpBefore: calculateMaxHp(before.str),
    maxHpAfter: calculateMaxHp(after.str),
    combatBefore: getDerivedCombatStats(before, state.equippedGear),
    combatAfter: getDerivedCombatStats(after, nextGear),
  };
}

/**
 * Stat upgrade cost requirement: (current base level + 1) multiplied by itself.
 * e.g., Base 1 -> 2 costs (1+1)*(1+1) = 4 SP.
 *       Base 2 -> 3 costs (2+1)*(2+1) = 9 SP.
 *       Base 3 -> 4 costs (3+1)*(3+1) = 16 SP.
 *       Base 4 -> 5 costs (4+1)*(4+1) = 25 SP.
 */
export function getBaseStatUpgradeCost(currentBaseValue: number): number {
  const nextLevel = currentBaseValue + 1;
  return nextLevel * nextLevel;
}

export function canUpgradeBaseStat(state: RunState, stat: StatKey): boolean {
  if (!state.playerResources) return false;
  const currentBase = state.playerBaseStats[stat];
  const cost = getBaseStatUpgradeCost(currentBase);
  return state.playerResources.statPoints >= cost;
}

export function upgradeBaseStat(state: RunState, stat: StatKey): RunState {
  if (!state.playerResources) return state;
  const currentBase = state.playerBaseStats[stat];
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

  const strDelta = nextEffective.str - prevEffective.str;
  const nextMaxHp = calculateMaxHp(nextEffective.str);
  const nextHp = Math.min(nextMaxHp, state.playerResources.hp + Math.max(0, strDelta * 2));

  return {
    ...state,
    playerBaseStats: nextBaseStats,
    playerResources: {
      ...state.playerResources,
      statPoints: state.playerResources.statPoints - cost,
      maxHp: nextMaxHp,
      hp: nextHp,
    },
    bannerMessage: `Upgraded Base ${stat.toUpperCase()} to ${currentBase + 1} (-${cost} SP)!`,
  };
}

/**
 * Calculates the escape roll threshold for fleeing battle:
 * floor((total AGI + total LUK) / 2).
 * Rolling <= this value on a 1d6 successfully escapes battle.
 */
export function getFleeThreshold(effectiveStats: CharacterStats): number {
  return Math.max(1, Math.floor((effectiveStats.agi + effectiveStats.luk) / 2));
}

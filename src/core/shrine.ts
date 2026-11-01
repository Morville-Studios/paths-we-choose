import { shuffleArray } from './rng';
import { syncVitals } from './stats';
import { coordToKey } from './grid';
import { createCombatCardInstance, getVoidCards } from '../data/combatCards';
import {
  ActiveShrineState,
  CombatCardDef,
  GridCoord,
  RunState,
  ShrinePrayerOption,
  ShrinePrayerOptionId,
  StatKey,
} from './types';

export const SKILL_UPGRADE_1_AP_GOLD_COST = 10;
export const SKILL_UPGRADE_1_AP_SP_COST = 2;
export const SKILL_UPGRADE_2_AP_GOLD_COST = 30;
export const SKILL_UPGRADE_2_AP_SP_COST = 6;

export interface ShrineSkillUpgradeOption {
  source: CombatCardDef;
  upgrade: CombatCardDef;
  goldCost: number;
  statPointCost: number;
}

export const PRAYER_OPTION_CATALOG: Record<ShrinePrayerOptionId, ShrinePrayerOption> = {
  cleanse: {
    id: 'cleanse',
    name: 'Cleanse',
    description: 'Purges and removes all negative status effects (poison, blindness, crippled).',
  },
  blessing_str: {
    id: 'blessing_str',
    name: 'Blessing of Strength',
    description: '+1 STR bonus for this map (+2 Max HP and scales Melee & Shield actions).',
  },
  blessing_dex: {
    id: 'blessing_dex',
    name: 'Blessing of Dexterity',
    description: '+1 DEX bonus for this map (+1 ACC to your 2d6 attack rolls).',
  },
  blessing_agi: {
    id: 'blessing_agi',
    name: 'Blessing of Agility',
    description: '+1 AGI bonus for this map (increases EVA against incoming 2d6 attacks).',
  },
  blessing_int: {
    id: 'blessing_int',
    name: 'Blessing of Intelligence',
    description: '+1 INT bonus for this map (amplifies Fireball & Force Field spells).',
  },
  blessing_cha: {
    id: 'blessing_cha',
    name: 'Blessing of Charisma',
    description: '+1 CHA bonus for this map (reduces shop prices by an additional 5%).',
  },
  blessing_luk: {
    id: 'blessing_luk',
    name: 'Blessing of Luck',
    description: '+1 LUK bonus for this map (increases battle Gold rewards and fortune).',
  },
  divine_protection: {
    id: 'divine_protection',
    name: 'Divine Protection',
    description: 'All damage you take is reduced by 1 for the remainder of this map.',
  },
  revitalize: {
    id: 'revitalize',
    name: 'Revitalize',
    description: 'Restores your HP to maximum immediately.',
  },
};

export function createShrineState(
  coord: GridCoord,
  turn: number,
  grantedBoon?: ShrinePrayerOption,
  replacedBoonName?: string | null
): ActiveShrineState {
  return {
    coord,
    turn,
    grantedBoon,
    replacedBoonName,
    prayed: Boolean(grantedBoon),
    chosenOptionId: grantedBoon?.id,
  };
}

export function getShrineLevel(state: RunState): number {
  if (state.activeHook.type !== 'SHRINE') return 0;
  const shrineCard = state.board[coordToKey(state.activeHook.shrine.coord)]?.card;
  return shrineCard?.level ?? 0;
}

/**
 * Finds exact owned-card → Void-card upgrade pairs available at this shrine.
 * Level 2+ shrines permit 1 AP → 2 AP upgrades; Level 3+ also permit the
 * intentionally stronger 2 AP → 3 AP upgrade path.
 */
export function getShrineSkillUpgradeOptions(state: RunState): ShrineSkillUpgradeOption[] {
  if (state.activeHook.type !== 'SHRINE' || !state.playerResources) return [];
  const shrineLevel = getShrineLevel(state);
  if (shrineLevel < 2) return [];
  const voidByBaseId = new Map(getVoidCards().map((card) => [card.upgradeOf, card]));

  return state.playerMasterDeck.flatMap((source) => {
    const upgrade = voidByBaseId.get(source.id);
    if (!upgrade) return [];
    if (source.apCost === 1 && upgrade.apCost === 2) {
      return [{
        source,
        upgrade,
        goldCost: SKILL_UPGRADE_1_AP_GOLD_COST,
        statPointCost: SKILL_UPGRADE_1_AP_SP_COST,
      }];
    }
    if (shrineLevel >= 3 && source.apCost === 2 && upgrade.apCost === 3) {
      return [{
        source,
        upgrade,
        goldCost: SKILL_UPGRADE_2_AP_GOLD_COST,
        statPointCost: SKILL_UPGRADE_2_AP_SP_COST,
      }];
    }
    return [];
  });
}

/** Replace one owned action card with its matching Void upgrade. */
export function upgradeShrineSkill(state: RunState, sourceInstanceId: string): RunState {
  if (state.activeHook.type !== 'SHRINE' || !state.playerResources) return state;
  const option = getShrineSkillUpgradeOptions(state)
    .find((candidate) => candidate.source.instanceId === sourceInstanceId);
  if (!option) return state;
  const resources = state.playerResources;
  if (resources.gold < option.goldCost || resources.statPoints < option.statPointCost) return state;

  const upgradedCard = createCombatCardInstance(
    option.upgrade.id,
    `void_upgrade_${option.source.instanceId}`
  );
  return {
    ...state,
    playerResources: {
      ...resources,
      gold: resources.gold - option.goldCost,
      statPoints: resources.statPoints - option.statPointCost,
    },
    playerMasterDeck: state.playerMasterDeck.map((card) =>
      card.instanceId === sourceInstanceId ? upgradedCard : card
    ),
    bannerMessage: `${option.source.name} was upgraded into ${upgradedCard.name} by the Void (${option.goldCost} Gold, ${option.statPointCost} SP).`,
  };
}

/**
 * Returns all prayer options whose preconditions are currently met:
 * 1. cleanse: only if player has at least one negative status effect.
 * 2. blessing_*: no condition (always eligible).
 * 3. divine_protection: no condition (always eligible).
 * 4. revitalize: only if player is missing HP (hp < maxHp).
 */
export function getEligiblePrayerOptions(state: RunState): ShrinePrayerOption[] {
  const eligible: ShrinePrayerOption[] = [];

  // 1. Cleanse (condition: user has a negative status)
  if (state.statusEffects && state.statusEffects.length > 0) {
    eligible.push(PRAYER_OPTION_CATALOG.cleanse);
  }

  // 2. Blessings (condition: none)
  eligible.push(
    PRAYER_OPTION_CATALOG.blessing_str,
    PRAYER_OPTION_CATALOG.blessing_dex,
    PRAYER_OPTION_CATALOG.blessing_agi,
    PRAYER_OPTION_CATALOG.blessing_int,
    PRAYER_OPTION_CATALOG.blessing_cha,
    PRAYER_OPTION_CATALOG.blessing_luk
  );

  // 3. Divine Protection (condition: none)
  eligible.push(PRAYER_OPTION_CATALOG.divine_protection);

  // 4. Revitalize (condition: hp < maxHp)
  if (state.playerResources && state.playerResources.hp < state.playerResources.maxHp) {
    eligible.push(PRAYER_OPTION_CATALOG.revitalize);
  }

  return eligible;
}

/**
 * Rolls 3 random distinct options from all eligible prayer options using seeded PRNG.
 */
export function rollShrinePrayerOptions(
  state: RunState
): { options: ShrinePrayerOption[]; nextRng: number } {
  const eligible = getEligiblePrayerOptions(state);
  const { shuffled, nextState } = shuffleArray(eligible, state.rngState);
  return {
    options: shuffled.slice(0, 3),
    nextRng: nextState,
  };
}

/**
 * Player chooses to pray at the altar. Generates 3 random eligible options.
 */
export function shrinePray(state: RunState): RunState {
  if (state.activeHook.type !== 'SHRINE') return state;
  const shrine = state.activeHook.shrine;
  if (shrine.prayed || shrine.prayOptions) return state;

  const { options, nextRng } = rollShrinePrayerOptions(state);
  return {
    ...state,
    rngState: nextRng,
    activeHook: {
      type: 'SHRINE',
      shrine: {
        ...shrine,
        prayOptions: options,
      },
    },
    bannerMessage: 'The shrine answers your prayer with 3 divine boons. Choose one.',
  };
}

/**
 * Applies a single shrine boon, eliminating any previous active shrine blessing.
 * Invariant: Only 1 shrine blessing may be active at a time!
 */
export function applySingleShrineBoon(
  state: RunState,
  boonId: ShrinePrayerOptionId
): { nextState: RunState; replacedBoonName: string | null } {
  const opt = PRAYER_OPTION_CATALOG[boonId];
  if (!opt) return { nextState: state, replacedBoonName: null };

  const previousBlessingId = state.activeBlessingId;
  const replacedBoonName =
    previousBlessingId && previousBlessingId !== boonId
      ? PRAYER_OPTION_CATALOG[previousBlessingId]?.name ?? null
      : null;

  // 1. Eliminate any previously active shrine blessing
  let nextState: RunState = {
    ...state,
    playerBlessingBonuses: { str: 0, dex: 0, agi: 0, int: 0, cha: 0, luk: 0 },
    divineProtection: 0,
    activeBlessingId: boonId,
  };
  nextState = syncVitals(state, nextState);

  // 2. Apply the newly chosen/granted boon
  switch (boonId) {
    case 'cleanse': {
      nextState = {
        ...nextState,
        statusEffects: [],
      };
      break;
    }
    case 'blessing_str':
    case 'blessing_dex':
    case 'blessing_agi':
    case 'blessing_int':
    case 'blessing_cha':
    case 'blessing_luk': {
      const stat = boonId.replace('blessing_', '') as StatKey;
      nextState = {
        ...nextState,
        playerBlessingBonuses: {
          ...nextState.playerBlessingBonuses,
          [stat]: 1,
        },
      };
      nextState = syncVitals(state, nextState);
      break;
    }
    case 'divine_protection': {
      nextState = {
        ...nextState,
        divineProtection: 1,
      };
      break;
    }
    case 'revitalize': {
      if (nextState.playerResources) {
        nextState = {
          ...nextState,
          playerResources: {
            ...nextState.playerResources,
            hp: nextState.playerResources.maxHp,
          },
        };
      }
      break;
    }
  }

  return { nextState, replacedBoonName };
}

/**
 * Automatically grants a random boon upon visiting a Sacred Shrine.
 * Replaces any previous shrine blessing (only 1 active blessing allowed).
 */
export function grantShrineBoonOnEnter(
  state: RunState,
  coord: GridCoord,
  turn: number
): RunState {
  const eligible = getEligiblePrayerOptions(state);
  const { shuffled, nextState: nextRng } = shuffleArray(eligible, state.rngState);
  const grantedBoon = shuffled[0];

  const { nextState, replacedBoonName } = applySingleShrineBoon(
    { ...state, rngState: nextRng },
    grantedBoon.id
  );

  const shrineState: ActiveShrineState = {
    coord,
    turn,
    grantedBoon,
    replacedBoonName,
    prayed: true,
    chosenOptionId: grantedBoon.id,
  };

  const banner = replacedBoonName
    ? `The Sacred Shrine grants you ${grantedBoon.name}! (Replaced ${replacedBoonName})`
    : `The Sacred Shrine grants you ${grantedBoon.name}!`;

  return {
    ...nextState,
    activeHook: { type: 'SHRINE', shrine: shrineState },
    bannerMessage: banner,
  };
}

/**
 * Selects 1 of the offered prayer options and applies its blessing.
 * Eliminates any previous active blessing (only 1 active blessing allowed).
 */
export function shrineChoosePrayerOption(
  state: RunState,
  optionId: ShrinePrayerOptionId
): RunState {
  if (state.activeHook.type !== 'SHRINE') return state;
  const shrine = state.activeHook.shrine;
  const opt = PRAYER_OPTION_CATALOG[optionId];
  if (!opt) return state;

  const { nextState, replacedBoonName } = applySingleShrineBoon(state, optionId);

  return {
    ...nextState,
    activeHook: {
      type: 'SHRINE',
      shrine: {
        ...shrine,
        grantedBoon: opt,
        replacedBoonName,
        prayed: true,
        chosenOptionId: optionId,
      },
    },
    bannerMessage: replacedBoonName
      ? `Received ${opt.name}! (Replaced ${replacedBoonName})`
      : `Received ${opt.name}!`,
  };
}

/**
 * Clears temporary divine blessings (stat bonuses and divine protection) that do not carry over to the next map.
 * Recomputes player vitals so temporary Max HP from STR blessings is cleanly reclamped.
 */
export function clearMapBlessings(state: RunState): RunState {
  const next: RunState = {
    ...state,
    playerBlessingBonuses: { str: 0, dex: 0, agi: 0, int: 0, cha: 0, luk: 0 },
    divineProtection: 0,
    activeBlessingId: null,
  };
  return syncVitals(state, next);
}

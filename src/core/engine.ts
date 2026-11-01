import { CLASS_CATALOG, STARTING_BASE_STATS } from '../data/classes';
import { createBossMonstersForMission } from '../data/monsters';
import {
  createStartCard,
  STAGE_1_MAX_TURNS,
  STAGE_2_MAX_TURNS,
  STAGE_1_MISSION_NAME,
  STAGE_2_MISSION_NAME,
} from '../data/stages';
import { determineActiveAudio, syncAudioState } from './audio';
import {
  buildStage1AdventureDeck,
  buildStage2AdventureDeck,
  buildStage1MonsterDeck,
  buildStage1TreasureDeck,
  buildStarterCombatDeck,
  buildNewSkillsDeck,
  drawAdventureCardWithReshuffle,
  drawEncounterMonsters,
  drawTreasureUntilLevel,
} from './deck';
import {
  attemptCombatFlee,
  createCombatSession,
  endPlayerCombatTurn,
  playCombatCardFromHand,
} from './combat';
import { coordToKey, getForwardChoiceCoords, getLookaheadCoords, isSameCoord, toGridKey } from './grid';
import { hashSeed, roll1D6 } from './rng';
import {
  calculateMaxHp,
  computeEffectiveStats,
  getEffectiveStatsFromState,
  getFleeThreshold,
  getPlayerAct,
  upgradeBaseStat,
} from './stats';
import {
  buyItem as buyItemCore,
  calculateRestCost,
  equipItem,
  prepareVillage,
  sellItem as sellItemCore,
  unequipItem,
  useConsumable,
  villageBackToMenu,
  villageOpenShop,
  villageOpenTrain,
  villageRest,
  villageTrainDraft,
  villageTrainRemove,
} from './village';
import {
  clearMapBlessings,
  grantShrineBoonOnEnter,
  upgradeShrineSkill,
  shrineChoosePrayerOption,
  shrinePray,
} from './shrine';
import {
  AdventureCard,
  BoardNodeStatus,
  ClassId,
  CombatVictoryState,
  GridCoord,
  MonsterCard,
  PlacedCardNode,
  RunState,
  ShrinePrayerOptionId,
  StatKey,
} from './types';

export function createInitialState(seed = 'default'): RunState {
  return {
    seed,
    rngState: hashSeed(seed),
    screen: 'welcome',
    turn: 0,
    maxTurns: STAGE_1_MAX_TURNS,
    currentMission: 1,
    missionName: STAGE_1_MISSION_NAME,
    reshuffleCount: 0,
    playerClass: null,
    playerBaseStats: { ...STARTING_BASE_STATS },
    playerClassBonuses: { str: 0, dex: 0, agi: 0, int: 0, cha: 0, luk: 0 },
    playerBlessingBonuses: { str: 0, dex: 0, agi: 0, int: 0, cha: 0, luk: 0 },
    activeBlessingId: null,
    divineProtection: 0,
    statusEffects: [],
    playerResources: null,
    equippedGear: { weapon: null, armor: null, accessory: null },
    backpack: [],
    playerMasterDeck: [],
    newSkillsDeck: [],
    newSkillsDiscard: [],
    newSkillsReshuffleCount: 0,
    playerPosition: { col: 0, row: 0 },
    adventureDeck: [],
    adventureDiscard: [],
    monsterDeck: [],
    monsterDiscard: [],
    treasureDeck: [],
    treasureDiscard: [],
    treasureReshuffleCount: 0,
    trainRemovalCount: 0,
    board: {},
    pathHistory: [],
    activeHook: { type: 'NONE' },
    bannerMessage: '',
    welcomePreparing: false,
    currentMusic: 'start-screen',
    audioScene: 'intro',
    audioState: 'intro',
  };
}

export function goToClassSelect(state: RunState): RunState {
  return syncAudioState({ ...state, screen: 'class_select' });
}

export function resetToWelcome(seed: string): RunState {
  return createInitialState(seed);
}

function placeNode(
  board: Record<string, PlacedCardNode>,
  coord: GridCoord,
  card: AdventureCard,
  status: BoardNodeStatus,
  turn: number
): void {
  board[coordToKey(coord)] = { coord, card, status, turnPlaced: turn };
}

export function startAdventure(classId: ClassId, seed: string): RunState {
  let rng = hashSeed(seed);
  const classDef = CLASS_CATALOG[classId];

  const adv = buildStage1AdventureDeck(rng);
  rng = adv.nextState;
  const mon = buildStage1MonsterDeck(rng);
  rng = mon.nextState;
  const tr = buildStage1TreasureDeck(rng);
  rng = tr.nextState;
  const skills = buildNewSkillsDeck(classId, rng);
  rng = skills.nextState;

  let deck = adv.deck;
  let discard: AdventureCard[] = [];
  let reshuffles = 0;
  const board: Record<string, PlacedCardNode> = {};

  const startCoord: GridCoord = { col: 0, row: 0 };
  placeNode(board, startCoord, createStartCard(), 'current', 0);

  const draw = (): AdventureCard => {
    const r = drawAdventureCardWithReshuffle(deck, discard, rng, reshuffles);
    deck = r.deck;
    discard = r.discard;
    rng = r.nextState;
    reshuffles = r.reshuffleCount;
    return r.card;
  };

  for (const c of getForwardChoiceCoords(startCoord)) {
    placeNode(board, c, draw(), 'available', 0);
  }
  for (const c of getLookaheadCoords(startCoord)) {
    placeNode(board, c, draw(), 'lookahead', 0);
  }

  const gear = { weapon: null, armor: null, accessory: null };
  const effective = computeEffectiveStats(STARTING_BASE_STATS, classDef.classBonuses, gear);
  const maxHp = calculateMaxHp(effective.str);

  return syncAudioState({
    ...createInitialState(seed),
    seed,
    rngState: rng,
    screen: 'play_area',
    playerClass: classId,
    playerBaseStats: { ...STARTING_BASE_STATS },
    playerClassBonuses: { ...classDef.classBonuses },
    currentMission: 1,
    missionName: STAGE_1_MISSION_NAME,
    playerResources: { hp: maxHp, maxHp, statPoints: 4, gold: 20 },
    playerMasterDeck: buildStarterCombatDeck(classId),
    newSkillsDeck: skills.deck,
    newSkillsDiscard: [],
    newSkillsReshuffleCount: 0,
    adventureDeck: deck,
    adventureDiscard: discard,
    reshuffleCount: reshuffles,
    monsterDeck: mon.deck,
    treasureDeck: tr.deck,
    treasureDiscard: [],
    treasureReshuffleCount: 0,
    board,
    pathHistory: [startCoord],
    bannerMessage: 'Prepare for your journey.',
    welcomePreparing: true,
  });
}

export function dismissWelcomePrepare(state: RunState): RunState {
  return {
    ...state,
    welcomePreparing: false,
    bannerMessage: 'Choose your next path.',
  };
}

// ---------------------------------------------------------------------------
// Movement
// ---------------------------------------------------------------------------

export function getAvailableCoords(state: RunState): GridCoord[] {
  return Object.values(state.board)
    .filter((n) => n.status === 'available')
    .map((n) => n.coord);
}

export function isUndiscoveredTerrain(card: AdventureCard): boolean {
  return Boolean(
    card.isUndiscovered ||
    card.cardNumber === 'advgrs-00' ||
    card.cardNumber === 'advfrs-00' ||
    card.cardNumber === 'advsmp-00' ||
    (!card.hasHostile && !card.hasVillage && !card.hasShrine && card.terrain !== 'start')
  );
}

/** Resolve an undiscovered-terrain roll after the +1-per-5-LUK exploration bonus. */
export function resolveUndiscoveredExploration(roll: number, terrainLevel: number, effectiveLuk: number): {
  luckBonus: number;
  effectiveRoll: number;
  outcome: 'combat' | 'treasure' | 'safe';
} {
  const luckBonus = Math.max(0, Math.floor(effectiveLuk / 5));
  const effectiveRoll = roll + luckBonus;
  // Treasure takes precedence, including on a Level 6 terrain.
  const outcome = effectiveRoll >= 6 ? 'treasure' : effectiveRoll <= terrainLevel ? 'combat' : 'safe';
  return { luckBonus, effectiveRoll, outcome };
}

export function chooseCard(state: RunState, coord: GridCoord): RunState {
  if (state.screen !== 'play_area' || state.activeHook.type !== 'NONE') return state;
  const chosen = state.board[coordToKey(coord)];
  if (!chosen || chosen.status !== 'available') return state;

  const turn = state.turn + 1;
  const R = chosen.coord.row;
  const C = chosen.coord.col;

  let discard = [...state.adventureDiscard];
  let deck = [...state.adventureDeck];
  let rng = state.rngState;
  let reshuffles = state.reshuffleCount;
  const board: Record<string, PlacedCardNode> = {};

  // 1. Sweep row R-1 (Start card is retired; adventure cards go to the discard pile)
  for (const [key, node] of Object.entries(state.board)) {
    if (node.coord.row === R - 1) {
      if (node.card.terrain !== 'start') discard.push(node.card);
    } else {
      board[key] = node;
    }
  }

  // 2. Re-status rows R and R+1
  const [leftChoice, rightChoice] = getForwardChoiceCoords(chosen.coord);
  for (const [key, node] of Object.entries(board)) {
    let status: BoardNodeStatus = node.status;
    if (node.coord.row === R) {
      if (isSameCoord(node.coord, chosen.coord)) status = 'current';
      else status = node.status === 'unreachable' ? 'unreachable' : 'unchosen';
    } else if (node.coord.row === R + 1) {
      status =
        isSameCoord(node.coord, leftChoice) || isSameCoord(node.coord, rightChoice)
          ? 'available'
          : 'unreachable';
    }
    board[key] = { ...node, status };
  }

  // 3. Draw new lookahead row R+2 (3 cards) if within the stage
  if (R + 2 <= state.maxTurns) {
    for (const c of getLookaheadCoords(chosen.coord)) {
      const r = drawAdventureCardWithReshuffle(deck, discard, rng, reshuffles);
      deck = r.deck;
      discard = r.discard;
      rng = r.nextState;
      reshuffles = r.reshuffleCount;
      board[coordToKey(c)] = { coord: c, card: r.card, status: 'lookahead', turnPlaced: turn };
    }
  }

  let next: RunState = {
    ...state,
    turn,
    board,
    adventureDeck: deck,
    adventureDiscard: discard,
    rngState: rng,
    reshuffleCount: reshuffles,
    playerPosition: { col: C, row: R },
    pathHistory: [...state.pathHistory, { col: C, row: R }],
    bannerMessage: 'Choose your next path.',
  };

  // 4. Resolve the tile
  const card = chosen.card;
  if (card.hasHostile) {
    next = startMonsterCombat(next, card.level, card.terrain);
  } else if (card.hasVillage) {
    next = prepareVillage({
      ...next,
      bannerMessage: `You arrive at ${card.name ?? 'a village'}. Services are available while you visit.`,
    }, chosen.coord, turn);
  } else if (card.hasShrine) {
    next = grantShrineBoonOnEnter(next, chosen.coord, turn);
  } else if (isUndiscoveredTerrain(card)) {
    const { roll, nextState: rRng } = roll1D6(rng);
    const exploration = resolveUndiscoveredExploration(roll, card.level, getEffectiveStatsFromState(next).luk);
    const rollLabel = exploration.luckBonus > 0
      ? `${roll} + ${exploration.luckBonus} LUK = ${exploration.effectiveRoll}`
      : `${roll}`;
    if (exploration.outcome === 'combat') {
      next = {
        ...next,
        rngState: rRng,
        activeHook: {
          type: 'EXPLORATION',
          exploration: {
            coord: chosen.coord,
            card,
            roll,
            luckBonus: exploration.luckBonus,
            effectiveRoll: exploration.effectiveRoll,
            outcome: 'combat',
          },
        },
        bannerMessage: `Explored ${card.name}: Rolled ${rollLabel} (≤ Lvl ${card.level}) — Enemy encountered!`,
      };
    } else if (exploration.outcome === 'treasure') {
      const trRes = drawTreasureUntilLevel(
        next.treasureDeck,
        next.treasureDiscard,
        card.level,
        rRng,
        next.treasureReshuffleCount
      );
      const foundItem = trRes.item;
      const newBackpack = foundItem ? [...next.backpack, foundItem] : next.backpack;
      next = {
        ...next,
        treasureDeck: trRes.deck,
        treasureDiscard: trRes.discard,
        treasureReshuffleCount: trRes.reshuffleCount,
        rngState: trRes.nextState,
        backpack: newBackpack,
        activeHook: {
          type: 'EXPLORATION',
          exploration: {
            coord: chosen.coord,
            card,
            roll,
            luckBonus: exploration.luckBonus,
            effectiveRoll: exploration.effectiveRoll,
            outcome: 'treasure',
            foundItem,
            discardedOverLevelCount: trRes.discardedOverLevel.length,
          },
        },
        bannerMessage: foundItem
          ? `Explored ${card.name}: Rolled ${rollLabel}! Found treasure: ${foundItem.name}!`
          : `Explored ${card.name}: No eligible treasure remains in the deck or graveyard.`,
      };
    } else {
      next = {
        ...next,
        rngState: rRng,
        activeHook: {
          type: 'EXPLORATION',
          exploration: {
            coord: chosen.coord,
            card,
            roll,
            luckBonus: exploration.luckBonus,
            effectiveRoll: exploration.effectiveRoll,
            outcome: 'safe',
          },
        },
        bannerMessage: `Explored ${card.name}: Rolled ${rollLabel}. The wilderness path is peaceful.`,
      };
    }
  } else {
    next = afterTileResolved(next);
  }
  return syncAudioState(next);
}

export function confirmExplorationCombat(state: RunState): RunState {
  if (state.activeHook.type !== 'EXPLORATION') return state;
  const { card } = state.activeHook.exploration;
  return startMonsterCombat(state, card.level, card.terrain);
}

export function confirmExplorationSafe(state: RunState): RunState {
  if (state.activeHook.type !== 'EXPLORATION') return state;
  return afterTileResolved({
    ...state,
    activeHook: { type: 'NONE' },
  });
}

/** Fills the battle area with monsters until their total level >= the Encounter tile's level. */
function startMonsterCombat(state: RunState, tileLevel: number, terrain?: string): RunState {
  const drawn = drawEncounterMonsters(state.monsterDeck, state.monsterDiscard, state.rngState, tileLevel, terrain);
  const next = { ...state, monsterDeck: drawn.deck, monsterDiscard: drawn.discard, rngState: drawn.nextState };
  if (drawn.monsters.length === 0) {
    const resolved = afterTileResolved(next);
    return resolved.activeHook.type === 'NONE'
      ? { ...resolved, bannerMessage: 'No eligible monsters available. The path is clear.' }
      : resolved;
  }
  const battle = beginCombat(next, drawn.monsters);
  return drawn.supplyExhausted
    ? { ...battle, bannerMessage: `${battle.bannerMessage} No further eligible monsters available; the current foes remain.` }
    : battle;
}

function beginCombat(state: RunState, monsters: MonsterCard[]): RunState {
  const eff = getEffectiveStatsFromState(state);
  const maxAp = getPlayerAct(eff);
  const { combat, nextState } = createCombatSession(monsters, state.playerMasterDeck, state.rngState, maxAp, state.logTimestamp);
  const names = monsters.map((m) => m.name).join(' + ');
  return syncAudioState({
    ...state,
    rngState: nextState,
    activeHook: { type: 'COMBAT', combat },
    bannerMessage: monsters.some((m) => m.isBoss) ? `The boss ${names} blocks your path!` : `${names} attack!`,
  });
}

/** Called once a tile's event (if any) is fully resolved. Triggers the Turn 15 boss. */
function afterTileResolved(state: RunState): RunState {
  if (state.turn >= state.maxTurns) {
    const bossMonsters = createBossMonstersForMission(state.currentMission ?? 1);
    return beginCombat({ ...state, activeHook: { type: 'NONE' } }, bossMonsters);
  }
  return syncAudioState({ ...state, activeHook: { type: 'NONE' } });
}

function handleCombatVictory(
  state: RunState,
  defeated: MonsterCard[],
  victoryDetails: {
    statPointsEarned: number;
    goldEarned: number;
    baseGold: number;
    luckBonusGold: number;
    luckyCharmGold: number;
    hasLuckyCharm?: boolean;
  }
): RunState {
  const boss = defeated.find((m) => m.isBoss);
  const mission = state.currentMission ?? 1;
  const bossTitle = boss ? (mission === 1 ? 'Goblin Chieftain' : 'Cult of Trolls') : undefined;

  const victory: CombatVictoryState = {
    defeatedMonsters: defeated,
    statPointsEarned: victoryDetails.statPointsEarned,
    goldEarned: victoryDetails.goldEarned,
    baseGold: victoryDetails.baseGold,
    luckBonusGold: victoryDetails.luckBonusGold,
    luckyCharmGold: victoryDetails.luckyCharmGold,
    isBoss: Boolean(boss),
    bossTitle,
    stageNumber: mission,
    canContinue: mission === 1,
  };

  const luckyText = victoryDetails.hasLuckyCharm
    ? ` (incl. +${victoryDetails.luckyCharmGold} Gold from Goldstar)`
    : '';

  return syncAudioState({
    ...state,
    activeHook: {
      type: 'VICTORY',
      victory,
    },
    bannerMessage: `Victory! Defeated ${defeated.map((m) => m.name).join(' + ')}! Claimed +${victoryDetails.statPointsEarned} SP and +${victoryDetails.goldEarned} Gold${luckyText}!`,
  });
}

export function confirmCombatVictory(state: RunState): RunState {
  if (state.activeHook.type !== 'VICTORY') return state;
  const victory = state.activeHook.victory;

  if (victory.isBoss) {
    const mission = victory.stageNumber ?? 1;
    const cleared = clearMapBlessings(state);
    const bossTitle = victory.bossTitle ?? (mission === 1 ? 'Goblin Chieftain' : 'Cult of Trolls');
    const missionName = mission === 1 ? STAGE_1_MISSION_NAME : STAGE_2_MISSION_NAME;
    return syncAudioState({
      ...cleared,
      activeHook: {
        type: 'ON_STAGE_COMPLETE',
        turn: state.turn,
        bossDefeated: bossTitle,
        stageNumber: mission,
        canContinue: victory.canContinue,
      },
      bannerMessage: `${bossTitle} is defeated. ${missionName} complete!`,
    });
  }

  return afterTileResolved(state);
}

/** Transitions player from Stage 1 into Stage 2 ("Cult of Trolls") */
export function startNextMission(state: RunState): RunState {
  let rng = state.rngState;
  const mission = (state.currentMission ?? 1) + 1;
  const missionName = mission === 2 ? STAGE_2_MISSION_NAME : `Stage ${mission}`;
  const maxTurns = mission === 2 ? STAGE_2_MAX_TURNS : STAGE_1_MAX_TURNS;

  const adv = mission === 2 ? buildStage2AdventureDeck(rng) : buildStage1AdventureDeck(rng);
  rng = adv.nextState;

  let deck = adv.deck;
  let discard: AdventureCard[] = [];
  let reshuffles = 0;
  const board: Record<string, PlacedCardNode> = {};

  const startCoord: GridCoord = { col: 0, row: 0 };
  placeNode(board, startCoord, createStartCard(), 'current', 0);

  const draw = (): AdventureCard => {
    const r = drawAdventureCardWithReshuffle(deck, discard, rng, reshuffles);
    deck = r.deck;
    discard = r.discard;
    rng = r.nextState;
    reshuffles = r.reshuffleCount;
    return r.card;
  };

  for (const c of getForwardChoiceCoords(startCoord)) {
    placeNode(board, c, draw(), 'available', 0);
  }
  for (const c of getLookaheadCoords(startCoord)) {
    placeNode(board, c, draw(), 'lookahead', 0);
  }

  const eff = getEffectiveStatsFromState(state);
  const maxHp = calculateMaxHp(eff.str);
  const cleaned = clearMapBlessings(state);

  return syncAudioState({
    ...cleaned,
    rngState: rng,
    currentMission: mission,
    missionName,
    turn: 0,
    maxTurns,
    board,
    playerPosition: startCoord,
    pathHistory: [startCoord],
    adventureDeck: deck,
    adventureDiscard: discard,
    reshuffleCount: reshuffles,
    playerResources: state.playerResources
      ? { ...state.playerResources, hp: maxHp, maxHp }
      : null,
    activeHook: { type: 'NONE' },
    bannerMessage: `Embarked on ${missionName}. Choose your next path.`,
  });
}

// ---------------------------------------------------------------------------
// Combat wrappers
// ---------------------------------------------------------------------------

/** targetIndex picks which monster in the battle area an attack hits (falls back to the first living one). */
export function playCard(state: RunState, instanceId: string, targetIndex = 0, discardedCardInstanceIds: string[] = []): RunState {
  return playCombatCardFromHand(state, instanceId, targetIndex, handleCombatVictory, discardedCardInstanceIds);
}

export function endTurn(state: RunState): RunState {
  return endPlayerCombatTurn(state);
}

export function attemptFlee(state: RunState): RunState {
  return attemptCombatFlee(state);
}

export { getFleeThreshold };

// ---------------------------------------------------------------------------
// Shrine wrappers (Base Stat upgrades are only possible while standing at a Shrine)
// ---------------------------------------------------------------------------

export function shrineUpgradeStat(state: RunState, stat: StatKey): RunState {
  if (state.activeHook.type !== 'SHRINE' && !state.welcomePreparing) return state;
  return upgradeBaseStat(state, stat);
}

export function shrineUpgradeSkill(state: RunState, sourceInstanceId: string): RunState {
  return upgradeShrineSkill(state, sourceInstanceId);
}

export function welcomeUpgradeStat(state: RunState, stat: StatKey): RunState {
  if (!state.welcomePreparing) return state;
  return upgradeBaseStat(state, stat);
}

export const shrinePrayAction = shrinePray;
export const shrineChoosePrayerAction = shrineChoosePrayerOption;
export { shrinePray, shrineChoosePrayerOption, clearMapBlessings, calculateRestCost };

export function leaveShrine(state: RunState): RunState {
  if (state.activeHook.type !== 'SHRINE') return state;
  return afterTileResolved(state);
}

/**
 * Choosing a divine blessing applies the boon and automatically leaves the shrine.
 */
export function shrineDoChoosePrayer(state: RunState, optionId: ShrinePrayerOptionId): RunState {
  const chosen = shrineChoosePrayerOption(state, optionId);
  return chosen === state ? state : leaveShrine(chosen);
}

// ---------------------------------------------------------------------------
// Village wrappers (all services are repeatable until the player leaves)
// ---------------------------------------------------------------------------

export function finishVillage(state: RunState): RunState {
  if (state.activeHook.type !== 'VILLAGE') return state;
  const village = state.activeHook.village;
  const next: RunState = {
    ...state,
    treasureDiscard: [...state.treasureDiscard, ...village.shopStock],
    newSkillsDiscard: [...state.newSkillsDiscard, ...village.trainOptions],
    activeHook: { type: 'VILLAGE', village: { ...village, shopStock: [], trainOptions: [] } },
  };
  return afterTileResolved(next);
}

export function villageDoRest(state: RunState, restTicks?: number): RunState {
  return villageRest(state, restTicks);
}

export const villageChooseShop = villageOpenShop;
export const villageChooseTrain = villageOpenTrain;
export const villageGoBack = villageBackToMenu;
export const buyItem = buyItemCore;
export const sellItem = sellItemCore;
export { equipItem, unequipItem, useConsumable };

export function villageDoTrainRemove(state: RunState, instanceId: string): RunState {
  return villageTrainRemove(state, instanceId);
}

export function villageDoTrainDraft(state: RunState, offerInstanceId: string): RunState {
  return villageTrainDraft(state, offerInstanceId);
}

export { toGridKey, determineActiveAudio, syncAudioState };

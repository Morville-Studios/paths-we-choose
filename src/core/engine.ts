import { appendGameLog, createTimestamp } from './log';
import { CLASS_CATALOG, STARTING_BASE_STATS } from '../data/classes';
import { createBossMonstersForMission } from '../data/monsters';
import { buildPathsDeck } from '../data/paths';
import {
  createStartCard,
  STAGE_1_MAX_TURNS,
  STAGE_2_MAX_TURNS,
  STAGE_3_MAX_TURNS,
  STAGE_1_SCENARIO_LEVEL,
  STAGE_2_SCENARIO_LEVEL,
  STAGE_3_SCENARIO_LEVEL,
  STAGE_1_MISSION_NAME,
  STAGE_2_MISSION_NAME,
  STAGE_3_MISSION_NAME,
} from '../data/stages';
import { determineActiveAudio, syncAudioState } from './audio';
import {
  buildStage1AdventureDeck,
  buildStage2AdventureDeck,
  buildStage3AdventureDeck,
  buildPhysicalTreasureSupply,
  buildScenarioMonsterDeck,
  buildScenarioTreasureDeck,
  buildStage1MonsterDeck,
  buildStage1TreasureDeck,
  buildStarterCombatDeck,
  buildNewSkillsDeck,
  drawAdventureCardWithReshuffle,
  drawEncounterMonsters,
  drawPathCardWithReshuffle,
  drawTreasureCardsWithReshuffle,
  drawTreasureUntilLevel,
  getEncounterTargetLevel,
  pullStartingAdventureCard,
  pullStartingTreasureCard,
} from './deck';
import {
  attemptCombatFlee, computeFleeNetAcc, computeHitProbability, firstLivingMonsterIndex,
  createCombatSession,
  endPlayerCombatTurn,
  playCombatCardFromHand,
} from './combat';
import { coordToKey, getForwardChoiceCoords, getLookaheadCoords, isSameCoord, toGridKey } from './grid';
import { hashSeed, roll1D6, roll3D6 } from './rng';
import {
  calculateMaxHp,
  calculateMerchantGoodsPrice,
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
  ActiveCombatState,
  CombatAttackRollSummary,
  CombatVictoryState,
  GridCoord,
  MonsterCard,
  PlacedCardNode,
  RunState,
  ShopItemDef,
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
    scenarioLevel: STAGE_1_SCENARIO_LEVEL,
    reshuffleCount: 0,
    playerClass: null,
    playerBaseStats: { ...STARTING_BASE_STATS },
    playerClassBonuses: { str: 0, dex: 0, agi: 0, int: 0, cha: 0, vit: 0 },
    playerBlessingBonuses: { str: 0, dex: 0, agi: 0, int: 0, cha: 0, vit: 0 },
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
    voidCards: [],
    playerPosition: { col: 0, row: 0 },
    adventureDeck: [],
    adventureDiscard: [],
    monsterDeck: [],
    monsterDiscard: [],
    monsterVoid: [],
    treasureDeck: [],
    treasureDiscard: [],
    treasureVoid: [],
    treasureReshuffleCount: 0,
    pathsDeck: [],
    pathsDiscard: [],
    pathsReshuffleCount: 0,
    trainRemovalCount: 0,
    board: {},
    pathHistory: [],
    activeHook: { type: 'NONE' },
    bannerMessage: '',
    gameLog: [],
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
  turn: number,
  attachedShrineCard?: AdventureCard
): void {
  board[coordToKey(coord)] = {
    coord,
    card,
    ...(attachedShrineCard ? { attachedShrineCard } : {}),
    status,
    turnPlaced: turn,
  };
}

function getStartingVillageAndShrineCodes(scenarioLevel: number): { villageCode: string; shrineCode: string } {
  if (scenarioLevel === 3) return { villageCode: 'advsmp-03', shrineCode: 'advsmp-04' };
  if (scenarioLevel === 2) return { villageCode: 'advfrs-03', shrineCode: 'advfrs-04' };
  return { villageCode: 'advgrs-03', shrineCode: 'advgrs-04' };
}

function pullStartingVillageAndShrine(
  deck: AdventureCard[],
  scenarioLevel: number
): { villageCard: AdventureCard; shrineCard: AdventureCard; deck: AdventureCard[] } {
  const { villageCode, shrineCode } = getStartingVillageAndShrineCodes(scenarioLevel);
  const pulledVillage = pullStartingAdventureCard(deck, villageCode);
  const pulledShrine = pullStartingAdventureCard(pulledVillage.deck, shrineCode);
  return {
    villageCard: pulledVillage.card ?? createStartCard(),
    shrineCard: pulledShrine.card ?? createStartCard(),
    deck: pulledShrine.deck,
  };
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
  const paths = buildPathsDeck(rng);
  rng = paths.nextState;

  let deck = adv.deck;
  let discard: AdventureCard[] = [];
  let reshuffles = 0;
  const board: Record<string, PlacedCardNode> = {};

  const starting = pullStartingVillageAndShrine(deck, STAGE_1_SCENARIO_LEVEL);
  deck = starting.deck;

  const startCoord: GridCoord = { col: 0, row: 0 };
  placeNode(board, startCoord, starting.villageCard, 'current', 0, starting.shrineCard);

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

  let treasureDeck = tr.deck;
  let treasureVoid = tr.void;
  const gear: { weapon: typeof treasureDeck[number] | null; armor: typeof treasureDeck[number] | null; accessory: typeof treasureDeck[number] | null } = {
    weapon: null,
    armor: null,
    accessory: null,
  };
  const backpack: typeof treasureDeck = [];

  for (const [slot, itemId] of [
    ['weapon', classDef.startingGear.weaponId],
    ['armor', classDef.startingGear.armorId],
  ] as const) {
    const pulled = pullStartingTreasureCard(treasureDeck, itemId, treasureVoid);
    treasureDeck = pulled.deck;
    treasureVoid = pulled.voidPile;
    if (pulled.item) {
      if (!gear[slot]) gear[slot] = pulled.item;
      else backpack.push(pulled.item);
    }
  }

  const effective = computeEffectiveStats(STARTING_BASE_STATS, classDef.classBonuses, gear);
  const maxHp = calculateMaxHp(effective.vit);

  const initialState: RunState = {
    ...createInitialState(seed),
    seed,
    rngState: rng,
    screen: 'play_area',
    playerClass: classId,
    playerBaseStats: { ...STARTING_BASE_STATS },
    playerClassBonuses: { ...classDef.classBonuses },
    equippedGear: gear,
    backpack,
    currentMission: 1,
    missionName: STAGE_1_MISSION_NAME,
    scenarioLevel: STAGE_1_SCENARIO_LEVEL,
    playerResources: { hp: maxHp, maxHp, statPoints: 10, gold: 20 },
    playerMasterDeck: buildStarterCombatDeck(classId),
    newSkillsDeck: skills.deck,
    newSkillsDiscard: [],
    newSkillsReshuffleCount: 0,
    adventureDeck: deck,
    adventureDiscard: discard,
    reshuffleCount: reshuffles,
    monsterDeck: mon.deck,
    monsterVoid: mon.void,
    treasureDeck,
    treasureDiscard: [],
    treasureVoid,
    treasureReshuffleCount: 0,
    pathsDeck: paths.deck,
    pathsDiscard: [],
    pathsReshuffleCount: 0,
    board,
    pathHistory: [startCoord],
    gameLog: [
      `[${createTimestamp(undefined)}] 🗺️ Embarked on Scenario 1: ${STAGE_1_MISSION_NAME} as a ${classDef.name}.`,
      `[${createTimestamp(undefined)}] 🎴 Dealt initial adventure board (9 cards). Starting with 10 Stat Points and 20 Gold.`,
    ],
    bannerMessage: `Embarked on ${STAGE_1_MISSION_NAME}. You begin at ${starting.villageCard.name ?? 'the starting village'}.`,
    welcomePreparing: false,
  };
  const withVillage = prepareVillage(initialState, startCoord, 0);
  return syncAudioState({
    ...withVillage,
    gameLog: initialState.gameLog,
    bannerMessage: initialState.bannerMessage,
    welcomePreparing: false,
  });
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

/** Resolve a pure 1d6 undiscovered-terrain exploration roll. */
export function resolveUndiscoveredExploration(roll: number, terrainLevel: number): {
  effectiveRoll: number;
  outcome: 'combat' | 'treasure' | 'safe';
} {
  const effectiveRoll = roll;
  // Treasure takes precedence, including on a Level 6 terrain.
  const outcome = effectiveRoll >= 6 ? 'treasure' : effectiveRoll <= terrainLevel ? 'combat' : 'safe';
  return { effectiveRoll, outcome };
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
      if (node.attachedShrineCard && node.attachedShrineCard.terrain !== 'start') {
        discard.push(node.attachedShrineCard);
      }
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

  const time = createTimestamp(state.logTimestamp);
  const card = chosen.card;
  const pathLogs = [
    `[${time}] 🗺️ Turn ${turn}: Chose path ${card.name} (Row ${R}, Col ${C}).`,
  ];
  if (R + 2 <= state.maxTurns) {
    pathLogs.push(`[${time}] 🎴 Dealt 3 Adventure cards to the horizon (Turn ${turn + 2}).`);
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
    gameLog: appendGameLog(state, pathLogs),
    bannerMessage: 'Choose your next path.',
  };

  // 4. Resolve the tile
  if (card.hasHostile) {
    next = startMonsterCombat(next, card.level, card.terrain, card);
  } else if (card.hasVillage) {
    next = prepareVillage({
      ...next,
      bannerMessage: `You arrive at ${card.name ?? 'a village'}. Services are available while you visit.`,
    }, chosen.coord, turn);
  } else if (card.hasShrine) {
    next = grantShrineBoonOnEnter(next, chosen.coord, turn);
  } else if (isUndiscoveredTerrain(card)) {
    const drawnPath = drawPathCardWithReshuffle(
      next.pathsDeck ?? [],
      next.pathsDiscard ?? [],
      rng,
      next.pathsReshuffleCount ?? 0
    );
    if (drawnPath.card.templateId === 'merchant') {
      const treasureDraw = drawTreasureCardsWithReshuffle(
        next.treasureDeck,
        next.treasureDiscard,
        2,
        drawnPath.nextState,
        next.treasureReshuffleCount ?? 0
      );
      const offeredNames = treasureDraw.drawn.map((i) => i.name).join(', ') || 'no wares';
      next = {
        ...next,
        pathsDeck: drawnPath.deck,
        pathsDiscard: drawnPath.discard,
        pathsReshuffleCount: drawnPath.reshuffleCount,
        treasureDeck: treasureDraw.deck,
        treasureDiscard: treasureDraw.discard,
        treasureReshuffleCount: treasureDraw.reshuffleCount,
        rngState: treasureDraw.nextState,
        activeHook: {
          type: 'PATH_CHALLENGE',
          pathChallenge: {
            coord: chosen.coord,
            terrainCard: card,
            pathCard: drawnPath.card,
            phase: 'merchant_offer',
            sneakNet: 0,
            merchantStock: treasureDraw.drawn,
          },
        },
        gameLog: appendGameLog(
          next,
          `[${time}] 🧳 Wandered into ${card.name} (Lvl ${card.level}) and met a ${drawnPath.card.name} offering: ${offeredNames}!`
        ),
        bannerMessage: `You met a wandering ${drawnPath.card.name} in ${card.name}!`,
      };
    } else if (drawnPath.card.templateId === 'sanctuary') {
      next = {
        ...next,
        pathsDeck: drawnPath.deck,
        pathsDiscard: drawnPath.discard,
        pathsReshuffleCount: drawnPath.reshuffleCount,
        rngState: drawnPath.nextState,
        activeHook: {
          type: 'PATH_CHALLENGE',
          pathChallenge: {
            coord: chosen.coord,
            terrainCard: card,
            pathCard: drawnPath.card,
            phase: 'sanctuary_prompt',
            sneakNet: 0,
          },
        },
        gameLog: appendGameLog(
          next,
          `[${time}] 🌿 Wandered into ${card.name} (Lvl ${card.level}) and found a peaceful ${drawnPath.card.name}!`
        ),
        bannerMessage: `You discovered a peaceful ${drawnPath.card.name} in ${card.name}!`,
      };
    } else if (drawnPath.card.templateId === 'ambush') {
      next = {
        ...next,
        pathsDeck: drawnPath.deck,
        pathsDiscard: drawnPath.discard,
        pathsReshuffleCount: drawnPath.reshuffleCount,
        rngState: drawnPath.nextState,
        activeHook: {
          type: 'PATH_CHALLENGE',
          pathChallenge: {
            coord: chosen.coord,
            terrainCard: card,
            pathCard: drawnPath.card,
            phase: 'ambush_prompt',
            sneakNet: 0,
          },
        },
        gameLog: appendGameLog(
          next,
          `[${time}] ⚠️ Wandered into ${card.name} (Lvl ${card.level}) — it's an ${drawnPath.card.name}! Enemies strike first!`
        ),
        bannerMessage: `Ambush! Hostiles in ${card.name} strike first!`,
      };
    } else if (drawnPath.card.templateId === 'magical_chest' || drawnPath.card.templateId === 'trapped_chest') {
      next = {
        ...next,
        pathsDeck: drawnPath.deck,
        pathsDiscard: drawnPath.discard,
        pathsReshuffleCount: drawnPath.reshuffleCount,
        rngState: drawnPath.nextState,
        activeHook: {
          type: 'PATH_CHALLENGE',
          pathChallenge: {
            coord: chosen.coord,
            terrainCard: card,
            pathCard: drawnPath.card,
            phase: 'chest_prompt',
            sneakNet: 0,
          },
        },
        gameLog: appendGameLog(
          next,
          `[${time}] 🗝️ Wandered into ${card.name} (Lvl ${card.level}) and discovered a ${drawnPath.card.name}!`
        ),
        bannerMessage: `You discovered a ${drawnPath.card.name} in ${card.name}!`,
      };
    } else if (drawnPath.card.templateId === 'gold_stash') {
      next = {
        ...next,
        pathsDeck: drawnPath.deck,
        pathsDiscard: drawnPath.discard,
        pathsReshuffleCount: drawnPath.reshuffleCount,
        rngState: drawnPath.nextState,
        activeHook: {
          type: 'PATH_CHALLENGE',
          pathChallenge: {
            coord: chosen.coord,
            terrainCard: card,
            pathCard: drawnPath.card,
            phase: 'gold_stash_prompt',
            sneakNet: 0,
          },
        },
        gameLog: appendGameLog(
          next,
          `[${time}] 💰 Wandered into ${card.name} (Lvl ${card.level}) and spotted a ${drawnPath.card.name}!`
        ),
        bannerMessage: `You spotted a hidden ${drawnPath.card.name} in ${card.name}!`,
      };
    } else if (drawnPath.card.templateId === 'spring_trap') {
      const eff = getEffectiveStatsFromState(next);
      const trapNet = eff.agi - (1 + 2 * card.level);
      next = {
        ...next,
        pathsDeck: drawnPath.deck,
        pathsDiscard: drawnPath.discard,
        pathsReshuffleCount: drawnPath.reshuffleCount,
        rngState: drawnPath.nextState,
        activeHook: {
          type: 'PATH_CHALLENGE',
          pathChallenge: {
            coord: chosen.coord,
            terrainCard: card,
            pathCard: drawnPath.card,
            phase: 'spring_trap_prompt',
            sneakNet: 0,
            trapNet,
          },
        },
        gameLog: appendGameLog(
          next,
          `[${time}] 🪤 Wandered into ${card.name} (Lvl ${card.level}) and triggered a ${drawnPath.card.name}!`
        ),
        bannerMessage: `You triggered a ${drawnPath.card.name} in ${card.name}! Roll AGI to dodge!`,
      };
    } else {
      const eff = getEffectiveStatsFromState(next);
      const sneakNet = eff.agi - card.level * 2;
      next = {
        ...next,
        pathsDeck: drawnPath.deck,
        pathsDiscard: drawnPath.discard,
        pathsReshuffleCount: drawnPath.reshuffleCount,
        rngState: drawnPath.nextState,
        activeHook: {
          type: 'PATH_CHALLENGE',
          pathChallenge: {
            coord: chosen.coord,
            terrainCard: card,
            pathCard: drawnPath.card,
            phase: 'sneak_prompt',
            sneakNet,
          },
        },
        gameLog: appendGameLog(
          next,
          `[${time}] 🗺️ Wandered into ${card.name} (Lvl ${card.level}) and encountered Path Card: ${drawnPath.card.name}!`
        ),
        bannerMessage: `You wandered into ${card.name} and see hostiles ahead (${drawnPath.card.name}). Roll a Sneak Check!`,
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
  return startMonsterCombat(state, card.level, card.terrain, card);
}

export function confirmExplorationSafe(state: RunState): RunState {
  if (state.activeHook.type !== 'EXPLORATION') return state;
  return afterTileResolved({
    ...state,
    activeHook: { type: 'NONE' },
  });
}

/** Evaluates a MACG-3D6™ 3d6 Success Check (Tier 4 baseline at Net 0; 3 & 18 Diabolic Always Miss). */
export function rollMacg3d6Check(
  netModifier: number,
  rngState: number
): {
  result: import('./types').PathCheckRollResult;
  nextState: number;
} {
  const { die1, die2, die3, total, nextState } = roll3D6(rngState);
  const dice: [number, number, number] = [die1, die2, die3];
  const { minHitRoll, maxHitRoll, hitPercent } = computeHitProbability(netModifier);
  const tier = Math.max(1, Math.min(7, 4 + netModifier));
  const isDiabolic = total === 3 || total === 18;
  const success = !isDiabolic && total >= minHitRoll && total <= maxHitRoll;
  return {
    result: {
      dice,
      total,
      netModifier,
      minHitRoll,
      maxHitRoll,
      hitPercent,
      tier,
      isDiabolic,
      success,
    },
    nextState,
  };
}

export function resolvePathSneakCheck(state: RunState): RunState {
  if (state.activeHook.type !== 'PATH_CHALLENGE') return state;
  const pc = state.activeHook.pathChallenge;
  if (pc.phase !== 'sneak_prompt') return state;

  const eff = getEffectiveStatsFromState(state);
  const sneakNet = eff.agi - pc.terrainCard.level * 2;
  const { result, nextState } = rollMacg3d6Check(sneakNet, state.rngState);
  const time = createTimestamp(state.logTimestamp);
  const diceStr = `[${result.dice.join(', ')}] = ${result.total}`;

  return syncAudioState({
    ...state,
    rngState: nextState,
    pathsDiscard: [...(state.pathsDiscard ?? []), pc.pathCard],
    activeHook: {
      type: 'PATH_CHALLENGE',
      pathChallenge: {
        ...pc,
        sneakNet,
        sneakRoll: result,
        phase: result.success ? 'sneak_success' : 'sneak_fail',
      },
    },
    gameLog: appendGameLog(
      state,
      result.success
        ? `[${time}] 🥷 Sneak Check (${pc.pathCard.name}): rolled 3d6 = ${diceStr} -> ✅ SUCCEEDED! Slipped past hostiles.`
        : `[${time}] ⚠️ Sneak Check (${pc.pathCard.name}): rolled 3d6 = ${diceStr} -> ❌ CAUGHT! ${pc.terrainCard.name} becomes an Encounter.`
    ),
    bannerMessage: result.success
      ? `Sneak Check succeeded (${result.total})! You slip past the hostiles.`
      : `Sneak Check failed (${result.total})! The hostiles spot you!`,
  });
}

export function confirmPathSneakCombat(state: RunState): RunState {
  if (state.activeHook.type !== 'PATH_CHALLENGE') return state;
  const pc = state.activeHook.pathChallenge;
  if (pc.phase !== 'sneak_fail') return state;

  const coordKey = coordToKey(pc.coord);
  const node = state.board[coordKey];
  const updatedTerrainCard: AdventureCard = {
    ...pc.terrainCard,
    hasHostile: true,
    isUndiscovered: false,
  };
  const nextBoard = node
    ? { ...state.board, [coordKey]: { ...node, card: updatedTerrainCard } }
    : state.board;

  return startMonsterCombat(
    { ...state, board: nextBoard },
    updatedTerrainCard.level,
    updatedTerrainCard.terrain,
    updatedTerrainCard,
    { coord: pc.coord, terrainCard: updatedTerrainCard, pathCard: pc.pathCard }
  );
}

export function advancePathToTreasurePrompt(state: RunState): RunState {
  if (state.activeHook.type !== 'PATH_CHALLENGE') return state;
  const pc = state.activeHook.pathChallenge;
  if (pc.phase !== 'sneak_success') return state;

  const eff = getEffectiveStatsFromState(state);
  const treasureNet = eff.dex - pc.terrainCard.level * 2;
  return syncAudioState({
    ...state,
    activeHook: {
      type: 'PATH_CHALLENGE',
      pathChallenge: {
        ...pc,
        phase: 'treasure_prompt',
        treasureNet,
      },
    },
    bannerMessage: `Time for a Treasure Discovery Check (DEX vs Terrain Lvl ${pc.terrainCard.level} × 2).`,
  });
}

export function resolvePathTreasureCheck(state: RunState): RunState {
  if (state.activeHook.type !== 'PATH_CHALLENGE') return state;
  const pc = state.activeHook.pathChallenge;
  if (pc.phase !== 'treasure_prompt') return state;

  const eff = getEffectiveStatsFromState(state);
  const treasureNet = eff.dex - pc.terrainCard.level * 2;
  const { result, nextState } = rollMacg3d6Check(treasureNet, state.rngState);
  const time = createTimestamp(state.logTimestamp);
  const diceStr = `[${result.dice.join(', ')}] = ${result.total}`;

  if (!result.success) {
    return syncAudioState({
      ...state,
      rngState: nextState,
      activeHook: {
        type: 'PATH_CHALLENGE',
        pathChallenge: {
          ...pc,
          treasureNet,
          treasureRoll: result,
          phase: 'treasure_fail',
        },
      },
      gameLog: appendGameLog(
        state,
        `[${time}] 💎 Treasure Discovery (${pc.terrainCard.name}): rolled 3d6 = ${diceStr} -> You find nothing.`
      ),
      bannerMessage: `Treasure Discovery failed (${result.total}). You find nothing.`,
    });
  }

  const trRes = drawTreasureUntilLevel(
    state.treasureDeck,
    state.treasureDiscard,
    pc.terrainCard.level,
    nextState,
    state.treasureReshuffleCount
  );
  const foundItem = trRes.item;
  const newBackpack = foundItem ? [...state.backpack, foundItem] : state.backpack;

  return syncAudioState({
    ...state,
    treasureDeck: trRes.deck,
    treasureDiscard: trRes.discard,
    treasureReshuffleCount: trRes.reshuffleCount,
    rngState: trRes.nextState,
    backpack: newBackpack,
    activeHook: {
      type: 'PATH_CHALLENGE',
      pathChallenge: {
        ...pc,
        treasureNet,
        treasureRoll: result,
        phase: 'treasure_success',
        foundItem,
        discardedOverLevelCount: trRes.discardedOverLevel.length,
      },
    },
    gameLog: appendGameLog(
      state,
      foundItem
        ? `[${time}] 💎 Treasure Discovery (${pc.terrainCard.name}): rolled 3d6 = ${diceStr} -> Found ${foundItem.name} (Lvl ${foundItem.level ?? 1})!`
        : `[${time}] 💎 Treasure Discovery (${pc.terrainCard.name}): rolled 3d6 = ${diceStr} -> Succeeded, but no eligible treasure remains.`
    ),
    bannerMessage: foundItem
      ? `Treasure Discovery succeeded! Found ${foundItem.name}!`
      : `Treasure Discovery succeeded, but no eligible treasure remains.`,
  });
}

export function buyPathMerchantItem(state: RunState, itemIdentifier: string): RunState {
  if (state.activeHook.type !== 'PATH_CHALLENGE') return state;
  const pc = state.activeHook.pathChallenge;
  if (pc.phase !== 'merchant_offer' || !state.playerResources) return state;

  const stock = pc.merchantStock ?? [];
  const stockIndex = stock.findIndex(
    (i) => i.instanceId === itemIdentifier || i.id === itemIdentifier
  );
  if (stockIndex < 0) return state;

  const item = stock[stockIndex];
  const eff = getEffectiveStatsFromState(state);
  const cost = calculateMerchantGoodsPrice(item.buyPrice, eff.cha);
  if (state.playerResources.gold < cost) return state;

  const nextStock = stock.filter((_, idx) => idx !== stockIndex);
  const time = createTimestamp(state.logTimestamp);
  const paid: RunState = {
    ...state,
    activeHook: {
      type: 'PATH_CHALLENGE',
      pathChallenge: {
        ...pc,
        merchantStock: nextStock,
      },
    },
    playerResources: {
      ...state.playerResources,
      gold: state.playerResources.gold - cost,
    },
    backpack: [...state.backpack, item],
    gameLog: appendGameLog(
      state,
      `[${time}] 🛒 Bought ${item.name} from ${pc.pathCard.name} for ${cost} Gold (2× DISC).`
    ),
    bannerMessage: `Bought ${item.name} from ${pc.pathCard.name} for ${cost} Gold.`,
  };
  if (item.category === 'consumable') return paid;
  const equipped = equipItem(paid, item.instanceId!);
  return { ...equipped, bannerMessage: `Bought and equipped ${item.name} for ${cost} Gold.` };
}

export function restAtPathSanctuary(state: RunState): RunState {
  if (state.activeHook.type !== 'PATH_CHALLENGE') return state;
  const pc = state.activeHook.pathChallenge;
  if (pc.phase !== 'sanctuary_prompt' || !state.playerResources) return state;

  const prevHp = state.playerResources.hp;
  const maxHp = state.playerResources.maxHp;
  const healed = Math.max(0, maxHp - prevHp);
  const time = createTimestamp(state.logTimestamp);
  return {
    ...state,
    pathsDiscard: [...(state.pathsDiscard ?? []), pc.pathCard],
    playerResources: {
      ...state.playerResources,
      hp: maxHp,
    },
    activeHook: {
      type: 'PATH_CHALLENGE',
      pathChallenge: {
        ...pc,
        phase: 'sanctuary_done',
        healedAmount: healed,
      },
    },
    gameLog: appendGameLog(
      state,
      `[${time}] 🌿 Rested for free at ${pc.pathCard.name}: restored ${healed} HP (${maxHp}/${maxHp} HP).`
    ),
    bannerMessage: healed > 0 ? `Rested at ${pc.pathCard.name}: restored ${healed} HP!` : `Rested at ${pc.pathCard.name} (already at full HP).`,
  };
}

export function confirmPathAmbushCombat(state: RunState): RunState {
  if (state.activeHook.type !== 'PATH_CHALLENGE') return state;
  const pc = state.activeHook.pathChallenge;
  if (pc.phase !== 'ambush_prompt') return state;

  const coordKey = coordToKey(pc.coord);
  const existingNode = state.board[coordKey];
  const updatedTerrainCard: AdventureCard = {
    ...pc.terrainCard,
    hasHostile: true,
    isUndiscovered: false,
  };
  const nextBoard = existingNode
    ? { ...state.board, [coordKey]: { ...existingNode, card: updatedTerrainCard } }
    : state.board;

  const nextState: RunState = {
    ...state,
    board: nextBoard,
    pathsDiscard: [...(state.pathsDiscard ?? []), pc.pathCard],
    activeHook: { type: 'NONE' },
  };
  return startMonsterCombat(nextState, pc.terrainCard.level, pc.terrainCard.terrain, updatedTerrainCard, undefined, true);
}

export function resolvePathChestAttempt(
  state: RunState,
  method: 'force_open' | 'lockpick' | 'remove_seal' | 'abandon'
): RunState {
  if (state.activeHook.type !== 'PATH_CHALLENGE') return state;
  const pc = state.activeHook.pathChallenge;
  if (pc.phase !== 'chest_prompt' || !state.playerResources) return state;

  const time = createTimestamp(state.logTimestamp);
  if (method === 'abandon') {
    return afterTileResolved({
      ...state,
      pathsDiscard: [...(state.pathsDiscard ?? []), pc.pathCard],
      activeHook: { type: 'NONE' },
      gameLog: appendGameLog(state, `[${time}] 🚶 Abandoned the ${pc.pathCard.name} safely.`),
      bannerMessage: `Left the ${pc.pathCard.name} untouched.`,
    });
  }

  const isTrapped = pc.pathCard.templateId === 'trapped_chest';
  if (isTrapped && method === 'remove_seal') return state;

  const eff = getEffectiveStatsFromState(state);
  const lvl = pc.terrainCard.level;
  const net =
    method === 'force_open'
      ? eff.str - (3 + 2 * lvl)
      : method === 'lockpick'
      ? eff.dex - ((isTrapped ? 1 : 3) + 2 * lvl)
      : eff.int - (1 + 2 * lvl);

  const rollOut = rollMacg3d6Check(net, state.rngState);
  const treasureDraw = drawTreasureCardsWithReshuffle(
    state.treasureDeck,
    state.treasureDiscard,
    1,
    rollOut.nextState,
    state.treasureReshuffleCount ?? 0
  );
  const drawnItem = treasureDraw.drawn[0] ?? null;
  const diceStr = `[${rollOut.result.dice.join('+')}] = ${rollOut.result.total}`;

  if (rollOut.result.success) {
    return {
      ...state,
      rngState: treasureDraw.nextState,
      treasureDeck: treasureDraw.deck,
      treasureDiscard: treasureDraw.discard,
      treasureReshuffleCount: treasureDraw.reshuffleCount,
      pathsDiscard: [...(state.pathsDiscard ?? []), pc.pathCard],
      backpack: drawnItem ? [...state.backpack, drawnItem] : state.backpack,
      activeHook: {
        type: 'PATH_CHALLENGE',
        pathChallenge: {
          ...pc,
          phase: 'chest_success',
          chestAttemptMethod: method,
          chestCheckRoll: rollOut.result,
          foundItem: drawnItem,
        },
      },
      gameLog: appendGameLog(
        state,
        drawnItem
          ? `[${time}] 💎 ${pc.pathCard.name} (${method}): rolled 3d6 = ${diceStr} -> Unlocked! Found ${drawnItem.name}!`
          : `[${time}] 💎 ${pc.pathCard.name} (${method}): rolled 3d6 = ${diceStr} -> Unlocked, but the Treasure Deck was empty.`
      ),
      bannerMessage: drawnItem ? `Opened ${pc.pathCard.name}! Found ${drawnItem.name}!` : `Opened ${pc.pathCard.name}!`,
    };
  }

  // Failed: chest explodes, destroying the item inside to Void and dealing 3 damage
  const nextHp = Math.max(0, state.playerResources.hp - 3);
  const nextVoidItems = drawnItem ? [...(state.voidItems ?? []), drawnItem] : state.voidItems;
  const failLog = `[${time}] 💥 ${pc.pathCard.name} (${method}): rolled 3d6 = ${diceStr} -> FAILED! The chest exploded for 3 DMG${
    drawnItem ? ` and destroyed ${drawnItem.name}` : ''
  }.`;

  if (nextHp <= 0) {
    return syncAudioState({
      ...state,
      rngState: treasureDraw.nextState,
      treasureDeck: treasureDraw.deck,
      treasureDiscard: treasureDraw.discard,
      treasureReshuffleCount: treasureDraw.reshuffleCount,
      pathsDiscard: [...(state.pathsDiscard ?? []), pc.pathCard],
      voidItems: nextVoidItems,
      playerResources: { ...state.playerResources, hp: 0 },
      activeHook: { type: 'ON_GAME_OVER', turn: state.turn, defeatedBy: pc.pathCard.name },
      gameLog: appendGameLog(state, failLog),
      bannerMessage: `You were defeated by ${pc.pathCard.name} on Turn ${state.turn}.`,
    });
  }

  return {
    ...state,
    rngState: treasureDraw.nextState,
    treasureDeck: treasureDraw.deck,
    treasureDiscard: treasureDraw.discard,
    treasureReshuffleCount: treasureDraw.reshuffleCount,
    pathsDiscard: [...(state.pathsDiscard ?? []), pc.pathCard],
    voidItems: nextVoidItems,
    playerResources: { ...state.playerResources, hp: nextHp },
    activeHook: {
      type: 'PATH_CHALLENGE',
      pathChallenge: {
        ...pc,
        phase: 'chest_fail',
        chestAttemptMethod: method,
        chestCheckRoll: rollOut.result,
        destroyedItem: drawnItem,
        damageTaken: 3,
      },
    },
    gameLog: appendGameLog(state, failLog),
    bannerMessage: `${pc.pathCard.name} exploded! Took 3 DMG!`,
  };
}

export function rollPathGoldStash(state: RunState): RunState {
  if (state.activeHook.type !== 'PATH_CHALLENGE') return state;
  const pc = state.activeHook.pathChallenge;
  if (pc.phase !== 'gold_stash_prompt' || !state.playerResources) return state;

  const rolled = roll1D6(state.rngState);
  const goldAwarded = rolled.roll <= 3 ? 10 : rolled.roll <= 5 ? 20 : 30;
  const time = createTimestamp(state.logTimestamp);

  return {
    ...state,
    rngState: rolled.nextState,
    pathsDiscard: [...(state.pathsDiscard ?? []), pc.pathCard],
    playerResources: {
      ...state.playerResources,
      gold: state.playerResources.gold + goldAwarded,
    },
    activeHook: {
      type: 'PATH_CHALLENGE',
      pathChallenge: {
        ...pc,
        phase: 'gold_stash_done',
        goldRollDie: rolled.roll,
        goldAwarded,
      },
    },
    gameLog: appendGameLog(
      state,
      `[${time}] 💰 ${pc.pathCard.name}: rolled 1d6 = ${rolled.roll} -> Discovered +${goldAwarded} Gold!`
    ),
    bannerMessage: `Rolled ${rolled.roll} on 1d6: discovered +${goldAwarded} Gold!`,
  };
}

export function resolvePathSpringTrap(state: RunState): RunState {
  if (state.activeHook.type !== 'PATH_CHALLENGE') return state;
  const pc = state.activeHook.pathChallenge;
  if (pc.phase !== 'spring_trap_prompt' || !state.playerResources) return state;

  const eff = getEffectiveStatsFromState(state);
  const net = pc.trapNet ?? eff.agi - (1 + 2 * pc.terrainCard.level);
  const rollOut = rollMacg3d6Check(net, state.rngState);
  const diceStr = `[${rollOut.result.dice.join('+')}] = ${rollOut.result.total}`;
  const time = createTimestamp(state.logTimestamp);

  if (rollOut.result.success) {
    return {
      ...state,
      rngState: rollOut.nextState,
      pathsDiscard: [...(state.pathsDiscard ?? []), pc.pathCard],
      activeHook: {
        type: 'PATH_CHALLENGE',
        pathChallenge: {
          ...pc,
          phase: 'spring_trap_success',
          trapRoll: rollOut.result,
          damageTaken: 0,
        },
      },
      gameLog: appendGameLog(
        state,
        `[${time}] 🪤 ${pc.pathCard.name}: rolled 3d6 = ${diceStr} -> ✅ DODGED! Avoided all damage.`
      ),
      bannerMessage: `Dodged the ${pc.pathCard.name}!`,
    };
  }

  const nextHp = Math.max(0, state.playerResources.hp - 4);
  const failLog = `[${time}] 🪤 ${pc.pathCard.name}: rolled 3d6 = ${diceStr} -> ❌ HIT! Took 4 direct damage.`;
  if (nextHp <= 0) {
    return syncAudioState({
      ...state,
      rngState: rollOut.nextState,
      pathsDiscard: [...(state.pathsDiscard ?? []), pc.pathCard],
      playerResources: { ...state.playerResources, hp: 0 },
      activeHook: { type: 'ON_GAME_OVER', turn: state.turn, defeatedBy: pc.pathCard.name },
      gameLog: appendGameLog(state, failLog),
      bannerMessage: `You were defeated by ${pc.pathCard.name} on Turn ${state.turn}.`,
    });
  }

  return {
    ...state,
    rngState: rollOut.nextState,
    pathsDiscard: [...(state.pathsDiscard ?? []), pc.pathCard],
    playerResources: { ...state.playerResources, hp: nextHp },
    activeHook: {
      type: 'PATH_CHALLENGE',
      pathChallenge: {
        ...pc,
        phase: 'spring_trap_fail',
        trapRoll: rollOut.result,
        damageTaken: 4,
      },
    },
    gameLog: appendGameLog(state, failLog),
    bannerMessage: `Hit by ${pc.pathCard.name}! Took 4 damage!`,
  };
}

export function confirmPathChallengeDone(state: RunState): RunState {
  if (state.activeHook.type !== 'PATH_CHALLENGE') return state;
  const pc = state.activeHook.pathChallenge;
  if (pc.phase === 'merchant_offer') {
    const remainingStock = pc.merchantStock ?? [];
    const time = createTimestamp(state.logTimestamp);
    return afterTileResolved({
      ...state,
      treasureDiscard: [...state.treasureDiscard, ...remainingStock],
      pathsDiscard: [...(state.pathsDiscard ?? []), pc.pathCard],
      activeHook: { type: 'NONE' },
      gameLog:
        remainingStock.length > 0
          ? appendGameLog(state, `[${time}] 🧳 Left the ${pc.pathCard.name}.`)
          : state.gameLog,
    });
  }
  return afterTileResolved({
    ...state,
    activeHook: { type: 'NONE' },
  });
}

/** Fills the battle area with monsters until their total level >= floor(tileLevel * 1.5). */
function startMonsterCombat(
  state: RunState,
  tileLevel: number,
  terrain?: string,
  encounterCard?: AdventureCard,
  pendingPathTreasureCheck?: import('./types').PendingPathTreasureCheck,
  enemyFirstTurn = false
): RunState {
  const targetLevel = getEncounterTargetLevel(tileLevel);
  const drawn = drawEncounterMonsters(state.monsterDeck, state.monsterDiscard, state.rngState, targetLevel, terrain);
  const next = { ...state, monsterDeck: drawn.deck, monsterDiscard: drawn.discard, rngState: drawn.nextState };
  if (drawn.monsters.length === 0) {
    if (encounterCard) {
      return syncAudioState({
        ...next,
        activeHook: {
          type: 'ENCOUNTER_CLEAR',
          encounter: {
            card: encounterCard,
            reason: 'No eligible monsters remained in the Monster Deck or discard pile for this terrain and level.',
          },
        },
        bannerMessage: `${encounterCard.name} resolved: no eligible monsters answered the encounter.`,
      });
    }
    return afterTileResolved(next);
  }
  const battle = beginCombat(next, drawn.monsters, pendingPathTreasureCheck);
  const withSupplyBanner = drawn.supplyExhausted
    ? { ...battle, bannerMessage: `${battle.bannerMessage} No further eligible monsters available; the current foes remain.` }
    : battle;
  if (enemyFirstTurn && withSupplyBanner.activeHook.type === 'COMBAT') {
    const ambushSeed: RunState = {
      ...withSupplyBanner,
      activeHook: {
        type: 'COMBAT',
        combat: {
          ...withSupplyBanner.activeHook.combat,
          combatTurn: 0,
          playerAp: 0,
        },
      },
    };
    return endPlayerCombatTurn(ambushSeed);
  }
  return withSupplyBanner;
}

export function confirmEncounterClear(state: RunState): RunState {
  if (state.activeHook.type !== 'ENCOUNTER_CLEAR') return state;
  return afterTileResolved({ ...state, activeHook: { type: 'NONE' } });
}

function beginCombat(
  state: RunState,
  monsters: MonsterCard[],
  pendingPathTreasureCheck?: import('./types').PendingPathTreasureCheck
): RunState {
  const eff = getEffectiveStatsFromState(state);
  const maxAp = getPlayerAct(eff);
  const { combat: baseCombat, nextState } = createCombatSession(monsters, state.playerMasterDeck, state.rngState, maxAp, state.logTimestamp);
  const combat = pendingPathTreasureCheck ? { ...baseCombat, pendingPathTreasureCheck } : baseCombat;
  const names = monsters.map((m) => m.name).join(' + ');
  return syncAudioState({
    ...state,
    rngState: nextState,
    activeHook: { type: 'COMBAT', combat },
    gameLog: appendGameLog(state, combat.combatLog),
    bannerMessage: monsters.some((m) => m.isBoss) ? `The boss ${names} blocks your path!` : `${names} attack!`,
  });
}

/** Called once a tile's event (if any) is fully resolved. Triggers the Turn 15 boss approach. */
function afterTileResolved(state: RunState): RunState {
  if (state.turn >= state.maxTurns) {
    const bossMonsters = createBossMonstersForMission(state.currentMission ?? 1);
    const bossNames = bossMonsters.map((m) => m.name).join(' & ');
    return syncAudioState({
      ...state,
      activeHook: {
        type: 'BOSS_APPROACH',
        bossMonsters,
      },
      bannerMessage: `⚔️ Turn 15 Complete! The Stage Boss ${bossNames} awaits! Prepare your equipment and potions, then click the Boss card to fight!`,
    });
  }
  return syncAudioState({ ...state, activeHook: { type: 'NONE' } });
}

/** Transitions player from BOSS_APPROACH state into combat against the stage boss(es). */
export function startBossCombat(state: RunState): RunState {
  if (state.activeHook.type !== 'BOSS_APPROACH') {
    if (state.turn >= state.maxTurns) {
      const bossMonsters = createBossMonstersForMission(state.currentMission ?? 1);
      return beginCombat({ ...state, activeHook: { type: 'NONE' } }, bossMonsters);
    }
    return state;
  }
  const bossMonsters = state.activeHook.bossMonsters;
  return beginCombat({ ...state, activeHook: { type: 'NONE' } }, bossMonsters);
}

function handleCombatVictory(
  state: RunState,
  defeated: MonsterCard[],
  victoryDetails: {
    statPointsEarned: number;
    goldEarned: number;
    baseGold: number;
    luckyCharmGold: number;
    hasLuckyCharm?: boolean;
    lastAttackRolls?: CombatAttackRollSummary[];
    finalCombatState?: ActiveCombatState;
  }
): RunState {
  const boss = defeated.find((m) => m.isBoss);
  const mission = state.currentMission ?? 1;
  const bossTitle = boss ? (mission === 1 ? 'Grundy' : 'Cult of Trolls') : undefined;

  const victory: CombatVictoryState = {
    defeatedMonsters: defeated,
    statPointsEarned: victoryDetails.statPointsEarned,
    goldEarned: victoryDetails.goldEarned,
    baseGold: victoryDetails.baseGold,
    luckyCharmGold: victoryDetails.luckyCharmGold,
    isBoss: Boolean(boss),
    bossTitle,
    stageNumber: mission,
    canContinue: mission === 1 || mission === 2,
    lastAttackRolls: victoryDetails.lastAttackRolls,
    finalCombatState: victoryDetails.finalCombatState,
    pendingPathTreasureCheck:
      state.activeHook.type === 'COMBAT'
        ? state.activeHook.combat.pendingPathTreasureCheck
        : victoryDetails.finalCombatState?.pendingPathTreasureCheck,
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
    gameLog: appendGameLog(state, `[${createTimestamp(state.logTimestamp)}] 🏆 Victory! Defeated ${defeated.map((m) => m.name).join(' + ')}! Claimed +${victoryDetails.statPointsEarned} SP and +${victoryDetails.goldEarned} Gold${luckyText}!`),
    bannerMessage: `Victory! Defeated ${defeated.map((m) => m.name).join(' + ')}! Claimed +${victoryDetails.statPointsEarned} SP and +${victoryDetails.goldEarned} Gold${luckyText}!`,
  });
}

export function confirmCombatVictory(state: RunState): RunState {
  if (state.activeHook.type !== 'VICTORY') return state;
  const victory = state.activeHook.victory;

  if (victory.isBoss) {
    const mission = victory.stageNumber ?? 1;
    const cleared = clearMapBlessings(state);
    const bossTitle = victory.bossTitle ?? (mission === 1 ? 'Grundy' : mission === 2 ? 'Cult of Trolls' : 'Fallen King');
    const missionName = mission === 1 ? STAGE_1_MISSION_NAME : mission === 2 ? STAGE_2_MISSION_NAME : STAGE_3_MISSION_NAME;
    return syncAudioState({
      ...cleared,
      activeHook: {
        type: 'ON_STAGE_COMPLETE',
        turn: state.turn,
        bossDefeated: bossTitle,
        stageNumber: mission,
        canContinue: victory.canContinue,
      },
      gameLog: appendGameLog(cleared, `[${createTimestamp(state.logTimestamp)}] 👑 ${bossTitle} is defeated. ${missionName} complete!`),
      bannerMessage: `${bossTitle} is defeated. ${missionName} complete!`,
    });
  }

  if (!victory.isBoss && victory.pendingPathTreasureCheck) {
    const pending = victory.pendingPathTreasureCheck;
    const eff = getEffectiveStatsFromState(state);
    const treasureNet = eff.dex - pending.terrainCard.level * 2;
    return syncAudioState({
      ...state,
      activeHook: {
        type: 'PATH_CHALLENGE',
        pathChallenge: {
          coord: pending.coord,
          terrainCard: pending.terrainCard,
          pathCard: pending.pathCard,
          phase: 'treasure_prompt',
          sneakNet: eff.agi - pending.terrainCard.level * 2,
          treasureNet,
        },
      },
      bannerMessage: `Hostiles defeated! Time for your Treasure Discovery Check (DEX vs Terrain Lvl ${pending.terrainCard.level} × 2).`,
    });
  }

  return afterTileResolved(state);
}

/** Transitions player from Stage 1 into Stage 2 ("Cult of Trolls") or Stage 3 ("Tomb of the Fallen King") */
export function startNextMission(state: RunState): RunState {
  let rng = state.rngState;
  const mission = (state.currentMission ?? 1) + 1;
  const missionName =
    mission === 2
      ? STAGE_2_MISSION_NAME
      : mission === 3
      ? STAGE_3_MISSION_NAME
      : `Stage ${mission}`;
  const maxTurns =
    mission === 3
      ? STAGE_3_MAX_TURNS
      : mission === 2
      ? STAGE_2_MAX_TURNS
      : STAGE_1_MAX_TURNS;
  const scenarioLevel =
    mission === 3
      ? STAGE_3_SCENARIO_LEVEL
      : mission === 2
      ? STAGE_2_SCENARIO_LEVEL
      : STAGE_1_SCENARIO_LEVEL;

  const adv =
    mission === 3
      ? buildStage3AdventureDeck(rng)
      : mission === 2
      ? buildStage2AdventureDeck(rng)
      : buildStage1AdventureDeck(rng);
  rng = adv.nextState;
  const monsters = buildScenarioMonsterDeck(scenarioLevel, rng);
  rng = monsters.nextState;

  const ownedOrBanishedIds = new Set(
    [
      ...Object.values(state.equippedGear).filter((i): i is ShopItemDef => Boolean(i)),
      ...state.backpack,
      ...(state.voidItems ?? []),
    ].map((i) => i.instanceId)
  );
  const treasurePool =
    state.treasureVoid !== undefined
      ? [...state.treasureDeck, ...state.treasureDiscard, ...state.treasureVoid]
      : buildPhysicalTreasureSupply().filter((i) => !ownedOrBanishedIds.has(i.instanceId));
  const tr = buildScenarioTreasureDeck(scenarioLevel, rng, treasurePool);
  rng = tr.nextState;

  let deck = adv.deck;
  let discard: AdventureCard[] = [];
  let reshuffles = 0;
  const board: Record<string, PlacedCardNode> = {};

  const starting = pullStartingVillageAndShrine(deck, scenarioLevel);
  deck = starting.deck;

  const startCoord: GridCoord = { col: 0, row: 0 };
  placeNode(board, startCoord, starting.villageCard, 'current', 0, starting.shrineCard);

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
  const maxHp = calculateMaxHp(eff.vit);
  const cleaned = clearMapBlessings(state);

  const nextMissionState: RunState = {
    ...cleaned,
    rngState: rng,
    currentMission: mission,
    missionName,
    scenarioLevel,
    turn: 0,
    maxTurns,
    board,
    playerPosition: startCoord,
    pathHistory: [startCoord],
    adventureDeck: deck,
    adventureDiscard: discard,
    reshuffleCount: reshuffles,
    monsterDeck: monsters.deck,
    monsterDiscard: [],
    monsterVoid: monsters.void,
    treasureDeck: tr.deck,
    treasureDiscard: [],
    treasureVoid: tr.void,
    treasureReshuffleCount: 0,
    playerResources: state.playerResources
      ? { ...state.playerResources, hp: maxHp, maxHp }
      : null,
    activeHook: { type: 'NONE' },
    gameLog: appendGameLog(state, `[${createTimestamp(state.logTimestamp)}] 🌟 Advanced to Scenario ${mission}: ${missionName}!`),
    bannerMessage: `Embarked on ${missionName}. You begin at ${starting.villageCard.name ?? 'the village'}.`,
  };
  const withVillage = prepareVillage(nextMissionState, startCoord, 0);
  return syncAudioState({
    ...withVillage,
    gameLog: nextMissionState.gameLog,
    bannerMessage: nextMissionState.bannerMessage,
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

export { getFleeThreshold, computeFleeNetAcc, firstLivingMonsterIndex };

// ---------------------------------------------------------------------------
// Shrine wrappers (Base Stat upgrades are only possible while standing at a Shrine)
// ---------------------------------------------------------------------------

export function shrineUpgradeStat(state: RunState, stat: StatKey): RunState {
  if (state.activeHook.type !== 'SHRINE') return state;
  return upgradeBaseStat(state, stat);
}

export function shrineUpgradeSkill(state: RunState, sourceInstanceId: string): RunState {
  return upgradeShrineSkill(state, sourceInstanceId);
}

export const shrinePrayAction = shrinePray;
export const shrineChoosePrayerAction = shrineChoosePrayerOption;
export { shrinePray, shrineChoosePrayerOption, clearMapBlessings, calculateRestCost };

export function villageVisitShrine(state: RunState): RunState {
  if (state.activeHook.type !== 'VILLAGE') return state;
  const village = state.activeHook.village;
  const shrineCard =
    village.attachedShrineCard ?? state.board[coordToKey(village.coord)]?.attachedShrineCard;
  if (!shrineCard) return state;

  const { savedShrineState, ...villageSnapshot } = village;
  if (savedShrineState) {
    const boonName = savedShrineState.grantedBoon?.name;
    const reminder = boonName
      ? `You already received the blessing of ${boonName} from this village shrine.`
      : 'You have already visited this village shrine. You may still upgrade your stats or skills.';
    return syncAudioState({
      ...state,
      activeHook: {
        type: 'SHRINE',
        shrine: {
          ...savedShrineState,
          shrineCard,
          returnToVillage: villageSnapshot,
          alreadyVisited: true,
        },
      },
      bannerMessage: reminder,
    });
  }

  const entered = grantShrineBoonOnEnter(state, village.coord, village.turn);
  if (entered.activeHook.type !== 'SHRINE') return entered;
  return syncAudioState({
    ...entered,
    activeHook: {
      type: 'SHRINE',
      shrine: {
        ...entered.activeHook.shrine,
        shrineCard,
        returnToVillage: villageSnapshot,
      },
    },
  });
}

export function leaveShrine(state: RunState): RunState {
  if (state.activeHook.type !== 'SHRINE') return state;
  const shrine = state.activeHook.shrine;
  if (shrine.returnToVillage) {
    const { returnToVillage, alreadyVisited: _alreadyVisited, ...persistedShrine } = shrine;
    const villageName = state.board[coordToKey(returnToVillage.coord)]?.card.name ?? 'the village';
    return syncAudioState({
      ...state,
      activeHook: {
        type: 'VILLAGE',
        village: {
          ...returnToVillage,
          subView: 'main',
          savedShrineState: persistedShrine,
        },
      },
      bannerMessage: `Returned to ${villageName}. Services are available while you visit.`,
    });
  }
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

import { CLASS_CATALOG } from '../data/classes';
import { CLASS_TRAIN_POOLS, COMBAT_CARD_CATALOG, createCombatCardInstance } from '../data/combatCards';
import {
  getMonsterMainTerrain,
  getMonsterRarity,
  getMonsterSupplyCount,
  getScenarioMonsterDeckComposition,
  MONSTER_TEMPLATES,
  ORDINARY_MONSTER_TEMPLATE_IDS,
} from '../data/monsters';
import { getTreasureSupplyCount, SHOP_ITEM_CATALOG } from '../data/shopItems';
import { buildPathsDeck } from '../data/paths';
import {
  ADVENTURE_CARD_CATALOG,
  STAGE_1_DECK_COMPOSITION,
  STAGE_2_DECK_COMPOSITION,
  STAGE_3_DECK_COMPOSITION,
} from '../data/stages';
import { shuffleArray } from './rng';
import { AdventureCard, ClassId, CombatCardDef, MonsterCard, PathCard, ShopItemDef } from './types';

export function buildAdventureDeckFromComposition(
  composition: Record<string, number>,
  rngState: number
): {
  deck: AdventureCard[];
  nextState: number;
} {
  const unshuffled: AdventureCard[] = [];
  let index = 1;

  for (const [code, count] of Object.entries(composition)) {
    if (count <= 0) continue;
    const def = ADVENTURE_CARD_CATALOG[code];
    if (!def) continue;

    for (let i = 0; i < count; i++) {
      unshuffled.push({
        id: `adv_${code.replace('-', '_')}_${String(index++).padStart(2, '0')}`,
        name: def.name,
        terrain: def.terrain,
        level: def.level,
        hasHostile: def.hasHostile,
        hasVillage: def.hasVillage,
        hasShrine: def.hasShrine,
        revealed: true,
        cardNumber: def.cardCode,
        flavorText: def.flavorText,
        isUndiscovered: def.isUndiscovered,
      });
    }
  }

  const { shuffled, nextState } = shuffleArray(unshuffled, rngState);
  return { deck: shuffled, nextState };
}

export function buildStage1AdventureDeck(rngState: number): {
  deck: AdventureCard[];
  nextState: number;
} {
  return buildAdventureDeckFromComposition(STAGE_1_DECK_COMPOSITION, rngState);
}

export function buildStage2AdventureDeck(rngState: number): {
  deck: AdventureCard[];
  nextState: number;
} {
  return buildAdventureDeckFromComposition(STAGE_2_DECK_COMPOSITION, rngState);
}

export function buildStage3AdventureDeck(rngState: number): {
  deck: AdventureCard[];
  nextState: number;
} {
  return buildAdventureDeckFromComposition(STAGE_3_DECK_COMPOSITION, rngState);
}

export function drawAdventureCardWithReshuffle(
  deck: AdventureCard[],
  discard: AdventureCard[],
  rngState: number,
  reshuffleCount: number
): {
  card: AdventureCard;
  deck: AdventureCard[];
  discard: AdventureCard[];
  nextState: number;
  reshuffleCount: number;
} {
  let currentDeck = [...deck];
  let currentDiscard = [...discard];
  let currentRng = rngState;
  let nextReshuffles = reshuffleCount;

  if (currentDeck.length === 0) {
    if (currentDiscard.length === 0) {
      throw new Error('Both Adventure Deck and Adventure Discard Pile are empty.');
    }
    const shuffledResult = shuffleArray(currentDiscard, currentRng);
    currentDeck = shuffledResult.shuffled;
    currentDiscard = [];
    currentRng = shuffledResult.nextState;
    nextReshuffles += 1;
  }

  const card = currentDeck[0];
  const remainingDeck = currentDeck.slice(1);

  return {
    card,
    deck: remainingDeck,
    discard: currentDiscard,
    nextState: currentRng,
    reshuffleCount: nextReshuffles,
  };
}

export function buildPhysicalMonsterSupply(): MonsterCard[] {
  return ORDINARY_MONSTER_TEMPLATE_IDS.flatMap((templateId) => {
    const template = MONSTER_TEMPLATES[templateId];
    return Array.from({ length: getMonsterSupplyCount(template) }, (_, index) => ({
      ...template,
      rarity: getMonsterRarity(template),
      mainTerrain: getMonsterMainTerrain(template),
      id: `monster_${templateId}_${String(index + 1).padStart(2, '0')}`,
    }));
  });
}

export function buildScenarioMonsterDeck(scenarioLevel: number, rngState: number): {
  deck: MonsterCard[];
  void: MonsterCard[];
  nextState: number;
} {
  const composition = new Map(
    getScenarioMonsterDeckComposition(scenarioLevel).map((entry) => [entry.templateId, entry.count]),
  );
  const selectedByTemplate = new Map<string, number>();
  const unshuffled: MonsterCard[] = [];
  const monsterVoid: MonsterCard[] = [];
  for (const monster of buildPhysicalMonsterSupply()) {
    const selected = selectedByTemplate.get(monster.templateId) ?? 0;
    const target = composition.get(monster.templateId) ?? 0;
    if (selected < target) {
      unshuffled.push(monster);
      selectedByTemplate.set(monster.templateId, selected + 1);
    } else {
      monsterVoid.push(monster);
    }
  }

  const { shuffled, nextState } = shuffleArray(unshuffled, rngState);
  return { deck: shuffled, void: monsterVoid, nextState };
}

export function buildStage1MonsterDeck(rngState: number): {
  deck: MonsterCard[];
  void: MonsterCard[];
  nextState: number;
} {
  return buildScenarioMonsterDeck(1, rngState);
}

interface MonsterDrawResult {
  monster: MonsterCard | null;
  deck: MonsterCard[];
  discard: MonsterCard[];
  nextState: number;
  cardsExamined: number;
}

/** One bounded pass: cards returned to the bottom are not examined twice. */
function searchMonsterDeck(
  deck: MonsterCard[], discard: MonsterCard[], rngState: number,
  terrain: string | undefined, maxLevel: number | undefined, limit: number
): MonsterDrawResult {
  const currentDeck = [...deck];
  const currentDiscard = [...discard];
  let cardsExamined = 0;
  while (currentDeck.length > 0 && cardsExamined < limit) {
    const candidate = currentDeck.shift()!;
    cardsExamined++;
    if (maxLevel !== undefined && candidate.level > maxLevel) {
      currentDiscard.push(candidate);
    } else if (!terrain || !candidate.spawnTerrains?.length || candidate.spawnTerrains.some(spawn => spawn === terrain)) {
      return { monster: candidate, deck: currentDeck, discard: currentDiscard, nextState: rngState, cardsExamined };
    } else {
      currentDeck.push(candidate);
    }
  }
  return { monster: null, deck: currentDeck, discard: currentDiscard, nextState: rngState, cardsExamined };
}

/** Reshuffle only if the draw starts empty; exhaustion during this search fizzles. */
export function drawMonsterCardWithReshuffle(
  deck: MonsterCard[], discard: MonsterCard[], rngState: number,
  terrain?: string, maxLevel?: number
): MonsterDrawResult {
  let currentDeck = deck;
  let currentDiscard = discard;
  let rng = rngState;
  if (currentDeck.length === 0 && currentDiscard.length > 0) {
    const reshuffled = shuffleArray(currentDiscard, rng);
    currentDeck = reshuffled.shuffled;
    currentDiscard = [];
    rng = reshuffled.nextState;
  }
  return searchMonsterDeck(currentDeck, currentDiscard, rng, terrain, maxLevel, currentDeck.length);
}

/** Computes the encounter monster-level budget X = floor(cardLevel * 1.5). */
export function getEncounterTargetLevel(cardLevel: number): number {
  return Math.floor(cardLevel * 1.5);
}

/**
 * Encounter generation is a recycling mechanic, not an ability search.
 * Recycle an empty deck while eligible supply remains. Terrain rejects remain
 * on the bottom; a full pass without a match stops rather than cycling forever.
 */
export function drawEncounterMonsters(
  deck: MonsterCard[], discard: MonsterCard[], rngState: number,
  targetLevel: number, terrain?: string
): {
  monsters: MonsterCard[];
  deck: MonsterCard[];
  discard: MonsterCard[];
  nextState: number;
  supplyExhausted: boolean;
} {
  let currentDeck = [...deck];
  let currentDiscard = [...discard];
  let rng = rngState;
  const monsters: MonsterCard[] = [];
  let total = 0;
  let remaining = currentDeck.length;
  while (total < targetLevel) {
    if (currentDeck.length === 0) {
      const hasEligibleSupply = currentDiscard.some(monster => monster.level <= targetLevel &&
        (!terrain || !monster.spawnTerrains?.length || monster.spawnTerrains.some(spawn => spawn === terrain)));
      if (!hasEligibleSupply) break;
      const reshuffled = shuffleArray(currentDiscard, rng);
      currentDeck = reshuffled.shuffled;
      currentDiscard = [];
      rng = reshuffled.nextState;
      remaining = currentDeck.length;
    }
    if (remaining === 0) break;
    const drawn = searchMonsterDeck(currentDeck, currentDiscard, rng, terrain, targetLevel, remaining);
    remaining -= drawn.cardsExamined;
    currentDeck = drawn.deck;
    currentDiscard = drawn.discard;
    if (!drawn.monster) {
      if (currentDeck.length === 0) continue;
      break;
    }
    monsters.push(drawn.monster);
    total += drawn.monster.level;
  }
  return { monsters, deck: currentDeck, discard: currentDiscard, nextState: rng, supplyExhausted: total < targetLevel };
}

export function buildStarterCombatDeck(classId: ClassId): CombatCardDef[] {
  const classDef = CLASS_CATALOG[classId];
  return classDef.starterCardIds.map((tplId, idx) =>
    createCombatCardInstance(tplId, `starter_${idx + 1}`)
  );
}

/**
 * Each class has a separate, finite New Skills deck. Starter cards are never
 * included: the starter deck contains its eight attacks and two defenses.
 * Every other class-eligible skill has exactly two physical copies.
 */
export function buildNewSkillsDeck(classId: ClassId, rngState: number): {
  deck: CombatCardDef[];
  nextState: number;
} {
  const starters = new Set(CLASS_CATALOG[classId].starterCardIds);
  const unshuffled = CLASS_TRAIN_POOLS[classId]
    .filter((templateId) => !starters.has(templateId))
    .flatMap((templateId) => [
      createCombatCardInstance(templateId, `new_skill_${classId}_1`),
      createCombatCardInstance(templateId, `new_skill_${classId}_2`),
    ]);
  const { shuffled, nextState } = shuffleArray(unshuffled, rngState);
  return { deck: shuffled, nextState };
}

/**
 * Restores the two-copy learnable-skill invariant for an adventure that began
 * before new card content was released.  Cards already in the deck, discard,
 * active Village offers, or the player's master deck count toward their two
 * copies, so this only adds genuinely missing physical cards.
 */
export function reconcileNewSkillsDeck(
  classId: ClassId,
  deck: CombatCardDef[],
  discard: CombatCardDef[],
  playerMasterDeck: CombatCardDef[],
  activeTrainOptions: CombatCardDef[],
  destroyedVoidCards: CombatCardDef[],
  rngState: number
) {
  const starterIds = new Set(CLASS_CATALOG[classId].starterCardIds);
  const learnableIds = CLASS_TRAIN_POOLS[classId].filter((templateId) => !starterIds.has(templateId));
  const voidUpgradeIds = new Set(
    Object.values(COMBAT_CARD_CATALOG)
      .filter((card) => card.isSkillUpgrade)
      .map((card) => card.id)
  );
  const reconciledDeck = deck.filter((card) => !voidUpgradeIds.has(card.id));
  const reconciledDiscard = discard.filter((card) => !voidUpgradeIds.has(card.id));
  const reconciledTrainOptions = activeTrainOptions.filter((card) => !voidUpgradeIds.has(card.id));
  const removed = deck.length + discard.length + activeTrainOptions.length
    - reconciledDeck.length - reconciledDiscard.length - reconciledTrainOptions.length;
  const allExisting = [
    ...reconciledDeck,
    ...reconciledDiscard,
    ...playerMasterDeck,
    ...reconciledTrainOptions,
    ...destroyedVoidCards,
  ];
  const usedInstanceIds = new Set(allExisting.map((card) => card.instanceId));
  const additions: CombatCardDef[] = [];

  for (const templateId of learnableIds) {
    let copies = allExisting.filter((card) => card.id === templateId).length;
    while (copies < 2) {
      let suffix = copies + 1;
      let instanceId = `${templateId}_new_skill_${classId}_content_${suffix}`;
      while (usedInstanceIds.has(instanceId)) {
        suffix += 1;
        instanceId = `${templateId}_new_skill_${classId}_content_${suffix}`;
      }
      additions.push(createCombatCardInstance(templateId, `new_skill_${classId}_content_${suffix}`));
      usedInstanceIds.add(instanceId);
      copies += 1;
    }
  }

  if (additions.length === 0) {
    return {
      deck: reconciledDeck,
      discard: reconciledDiscard,
      activeTrainOptions: reconciledTrainOptions,
      nextState: rngState,
      added: additions,
      removed,
    };
  }

  const { shuffled, nextState } = shuffleArray([...reconciledDeck, ...additions], rngState);
  return {
    deck: shuffled,
    discard: reconciledDiscard,
    activeTrainOptions: reconciledTrainOptions,
    nextState,
    added: additions,
    removed,
  };
}

/** Draw learnable skills, recycling only unlearned offers once the deck is empty. */
export function drawNewSkillsWithReshuffle(
  deck: CombatCardDef[],
  discard: CombatCardDef[],
  count: number,
  rngState: number,
  reshuffleCount: number
): {
  drawn: CombatCardDef[];
  deck: CombatCardDef[];
  discard: CombatCardDef[];
  nextState: number;
  reshuffleCount: number;
} {
  let currentDeck = [...deck];
  let currentDiscard = [...discard];
  let rng = rngState;
  let reshuffles = reshuffleCount;
  const drawn: CombatCardDef[] = [];
  while (drawn.length < count) {
    if (currentDeck.length === 0) {
      if (currentDiscard.length === 0) break;
      const shuffled = shuffleArray(currentDiscard, rng);
      currentDeck = shuffled.shuffled;
      currentDiscard = [];
      rng = shuffled.nextState;
      reshuffles += 1;
    }
    drawn.push(currentDeck.shift()!);
  }
  return { drawn, deck: currentDeck, discard: currentDiscard, nextState: rng, reshuffleCount: reshuffles };
}

/**
 * Builds the full physical Treasure supply (2 copies per catalog item).
 */
export function buildPhysicalTreasureSupply(): ShopItemDef[] {
  const cards: ShopItemDef[] = [];
  for (const tpl of SHOP_ITEM_CATALOG) {
    const supplyCount = getTreasureSupplyCount(tpl);
    for (let copy = 1; copy <= supplyCount; copy++) {
      cards.push({
        ...tpl,
        instanceId: `tr_${tpl.id}_c${copy}`,
      });
    }
  }
  return cards;
}

/**
 * Builds the Treasure Deck for a given scenario level.
 * Only items with level in [scenarioLevel, scenarioLevel + 1] enter the deck;
 * remaining unused items stay in the box (`void`).
 */
export function buildScenarioTreasureDeck(
  scenarioLevel: number,
  rngState: number,
  existingSupply?: ShopItemDef[]
): {
  deck: ShopItemDef[];
  void: ShopItemDef[];
  nextState: number;
} {
  const supply = existingSupply ?? buildPhysicalTreasureSupply();
  const eligible: ShopItemDef[] = [];
  const unused: ShopItemDef[] = [];
  for (const item of supply) {
    const lvl = item.level ?? 1;
    if (lvl >= scenarioLevel && lvl <= scenarioLevel + 1) {
      eligible.push(item);
    } else {
      unused.push(item);
    }
  }
  const { shuffled, nextState } = shuffleArray(eligible, rngState);
  return { deck: shuffled, void: unused, nextState };
}

/**
 * Builds the Stage 1 Treasure Deck (Level 1-2 items; Level 3+ stay in the box).
 */
export function buildStage1TreasureDeck(rngState: number): {
  deck: ShopItemDef[];
  void: ShopItemDef[];
  nextState: number;
} {
  return buildScenarioTreasureDeck(1, rngState);
}

/** Shared non-fizzling treasure mechanic. Rejected physical cards go to discard. */
function drawFilteredTreasure(
  deck: ShopItemDef[], discard: ShopItemDef[], count: number, rngState: number,
  reshuffleCount: number, eligible: (item: ShopItemDef, drawn: ShopItemDef[]) => boolean
): {
  drawn: ShopItemDef[];
  deck: ShopItemDef[];
  discard: ShopItemDef[];
  nextState: number;
  reshuffleCount: number;
  discardedInvalid: ShopItemDef[];
} {
  let currentDeck = [...deck];
  let currentDiscard = [...discard];
  let rng = rngState;
  let reshuffles = reshuffleCount;
  let examined = false;
  const drawn: ShopItemDef[] = [];
  const discardedInvalid: ShopItemDef[] = [];
  while (drawn.length < count) {
    if (currentDeck.length === 0) {
      if (currentDiscard.length === 0) break;
      // Missing eligible content (or all matching copies already owned/stocked) cannot
      // create an endless loop. This is supply exhaustion, not an ability fizzle.
      if (examined && !currentDiscard.some(card => eligible(card, drawn))) break;
      const recycled = shuffleArray(currentDiscard, rng);
      currentDeck = recycled.shuffled;
      currentDiscard = [];
      rng = recycled.nextState;
      reshuffles++;
    }
    const card = currentDeck.shift()!;
    examined = true;
    if (eligible(card, drawn)) drawn.push(card);
    else {
      currentDiscard.push(card);
      discardedInvalid.push(card);
    }
  }
  return { drawn, deck: currentDeck, discard: currentDiscard, nextState: rng, reshuffleCount: reshuffles, discardedInvalid };
}

/**
 * Draw up to `count` unique stock cards matching the village's exact level.
 * Wrong-level or duplicate cards are discarded to `treasureDiscard` and do
 * not count toward stock. Recycles `treasureDiscard` once empty if eligible
 * unique items remain, stopping cleanly with partial stock if supply runs out.
 * Without villageLevel, this remains an ordinary fixed-count treasure draw.
 */
export function drawTreasureCardsWithReshuffle(
  deck: ShopItemDef[], discard: ShopItemDef[], count: number, rngState: number,
  reshuffleCount = 0, villageLevel?: number
) {
  return drawFilteredTreasure(deck, discard, count, rngState, reshuffleCount,
    (item, drawn) => villageLevel === undefined || (
      (item.level ?? 1) === villageLevel
      && !drawn.some(existing => existing.id === item.id)
    ));
}

/** Discovery rewards use a level cap, not exact equality, and never ability-fizzle. */
export function drawTreasureUntilLevel(
  deck: ShopItemDef[], discard: ShopItemDef[], maxLevel: number, rngState: number,
  reshuffleCount = 0
): {
  item: ShopItemDef | null;
  deck: ShopItemDef[];
  discard: ShopItemDef[];
  nextState: number;
  reshuffleCount: number;
  discardedOverLevel: ShopItemDef[];
} {
  const result = drawFilteredTreasure(deck, discard, 1, rngState, reshuffleCount,
    item => (item.level ?? 1) <= maxLevel);
  return { item: result.drawn[0] ?? null, deck: result.deck, discard: result.discard,
    nextState: result.nextState, reshuffleCount: result.reshuffleCount,
    discardedOverLevel: result.discardedInvalid };
}

/**
 * Pulls one matching card (by catalog code, e.g. `advgrs-03`) from a prepared
 * Adventure Deck without creating new copies out of thin air.
 */
export function pullStartingAdventureCard(
  deck: AdventureCard[],
  cardCode: string
): { card: AdventureCard | null; deck: AdventureCard[] } {
  const idPrefix = `adv_${cardCode.replace('-', '_')}_`;
  const idx = deck.findIndex(
    (c) => c.id.startsWith(idPrefix) || c.cardNumber === cardCode
  );
  if (idx < 0) return { card: null, deck };
  return {
    card: deck[idx],
    deck: [...deck.slice(0, idx), ...deck.slice(idx + 1)],
  };
}

/**
 * Pulls an existing physical Treasure card for hero setup without ever creating
 * new copies out of thin air: checks the Void (game box) first, then searches
 * the prepared scenario Treasure Deck.
 */
export function pullStartingTreasureCard(
  deck: ShopItemDef[],
  itemId: string,
  voidPile: ShopItemDef[] = []
): { item: ShopItemDef | null; deck: ShopItemDef[]; voidPile: ShopItemDef[] } {
  const voidIdx = voidPile.findIndex((c) => c.id === itemId);
  if (voidIdx >= 0) {
    const item = voidPile[voidIdx];
    return {
      item,
      deck,
      voidPile: [...voidPile.slice(0, voidIdx), ...voidPile.slice(voidIdx + 1)],
    };
  }
  const deckIdx = deck.findIndex((c) => c.id === itemId);
  if (deckIdx >= 0) {
    const item = deck[deckIdx];
    return {
      item,
      deck: [...deck.slice(0, deckIdx), ...deck.slice(deckIdx + 1)],
      voidPile,
    };
  }
  return { item: null, deck, voidPile };
}

/**
 * Draws the top card from the Paths Deck using the Morville Infinite Deck System™ (MIDS™):
 * if the deck is empty, recycles the Paths Discard pile back into a shuffled deck.
 */
export function drawPathCardWithReshuffle(
  deck: PathCard[],
  discard: PathCard[],
  rngState: number,
  reshuffleCount: number
): {
  card: PathCard;
  deck: PathCard[];
  discard: PathCard[];
  nextState: number;
  reshuffleCount: number;
} {
  let activeDeck = deck;
  let activeDiscard = discard;
  let rng = rngState;
  let reshuffles = reshuffleCount;

  if (activeDeck.length === 0) {
    if (activeDiscard.length > 0) {
      const recycled = shuffleArray(activeDiscard, rng);
      activeDeck = recycled.shuffled;
      activeDiscard = [];
      rng = recycled.nextState;
      reshuffles += 1;
    } else {
      const built = buildPathsDeck(rng);
      activeDeck = built.deck;
      rng = built.nextState;
    }
  }

  const [card, ...rest] = activeDeck;
  return {
    card,
    deck: rest,
    discard: activeDiscard,
    nextState: rng,
    reshuffleCount: reshuffles,
  };
}

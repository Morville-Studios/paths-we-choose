import { CLASS_CATALOG } from '../data/classes';
import { CLASS_TRAIN_POOLS, COMBAT_CARD_CATALOG, createCombatCardInstance } from '../data/combatCards';
import { MONSTER_TEMPLATES, STAGE_1_MONSTER_DECK_COMPOSITION } from '../data/monsters';
import { SHOP_ITEM_CATALOG } from '../data/shopItems';
import {
  ADVENTURE_CARD_CATALOG,
  STAGE_1_DECK_COMPOSITION,
  STAGE_2_DECK_COMPOSITION,
} from '../data/stages';
import { shuffleArray } from './rng';
import { AdventureCard, ClassId, CombatCardDef, MonsterCard, ShopItemDef } from './types';

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

export function buildStage1MonsterDeck(rngState: number): {
  deck: MonsterCard[];
  nextState: number;
} {
  const unshuffled: MonsterCard[] = [];
  let index = 1;

  for (const entry of STAGE_1_MONSTER_DECK_COMPOSITION) {
    const tpl = MONSTER_TEMPLATES[entry.templateId];
    for (let i = 0; i < entry.count; i++) {
      unshuffled.push({
        ...tpl,
        id: `monster_${entry.templateId}_${String(index++).padStart(2, '0')}`,
      });
    }
  }

  const { shuffled, nextState } = shuffleArray(unshuffled, rngState);
  return { deck: shuffled, nextState };
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
    } else if (!terrain || !candidate.spawnTerrains?.length || candidate.spawnTerrains.includes(terrain)) {
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
        (!terrain || !monster.spawnTerrains?.length || monster.spawnTerrains.includes(terrain)));
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
  const allExisting = [...reconciledDeck, ...reconciledDiscard, ...playerMasterDeck, ...reconciledTrainOptions];
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
 * Builds the Stage 1 Treasure Deck.
 * Composed of two copies of each of the 21 catalog items = 42 cards total.
 */
export function buildStage1TreasureDeck(rngState: number): {
  deck: ShopItemDef[];
  nextState: number;
} {
  const cards: ShopItemDef[] = [];
  for (const tpl of SHOP_ITEM_CATALOG) {
    cards.push({
      ...tpl,
      instanceId: `tr_${tpl.id}_c1`,
    });
    cards.push({
      ...tpl,
      instanceId: `tr_${tpl.id}_c2`,
    });
  }
  const { shuffled, nextState } = shuffleArray(cards, rngState);
  return { deck: shuffled, nextState };
}

/** Shared non-fizzling treasure mechanic. Rejected physical cards go to discard. */
function drawFilteredTreasure(
  deck: ShopItemDef[], discard: ShopItemDef[], count: number, rngState: number,
  reshuffleCount: number, eligible: (item: ShopItemDef) => boolean
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
      // Missing eligible content (or all matching copies already owned) cannot
      // create an endless loop. This is supply exhaustion, not an ability fizzle.
      if (examined && !currentDiscard.some(eligible)) break;
      const recycled = shuffleArray(currentDiscard, rng);
      currentDeck = recycled.shuffled;
      currentDiscard = [];
      rng = recycled.nextState;
      reshuffles++;
    }
    const card = currentDeck.shift()!;
    examined = true;
    if (eligible(card)) drawn.push(card);
    else {
      currentDiscard.push(card);
      discardedInvalid.push(card);
    }
  }
  return { drawn, deck: currentDeck, discard: currentDiscard, nextState: rng, reshuffleCount: reshuffles, discardedInvalid };
}

/**
 * Draw count stock cards at exactly villageLevel when specified. Wrong-level
 * cards are discarded and do not count toward stock. Recycle as often as needed.
 * Without villageLevel, this remains an ordinary fixed-count treasure draw.
 */
export function drawTreasureCardsWithReshuffle(
  deck: ShopItemDef[], discard: ShopItemDef[], count: number, rngState: number,
  reshuffleCount = 0, villageLevel?: number
) {
  return drawFilteredTreasure(deck, discard, count, rngState, reshuffleCount,
    item => villageLevel === undefined || (item.level ?? 1) === villageLevel);
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

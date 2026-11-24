import pathsData from '../../data/paths.json';
import { shuffleArray } from '../core/rng';
import { PathCard } from '../core/types';

export interface PathCardCatalogEntry extends Omit<PathCard, 'id'> {
  copies: number;
  flavorText: string;
}

export const PATH_CARD_CATALOG: PathCardCatalogEntry[] = pathsData
  .filter((entry) => entry.type === 'path')
  .map(({ type: _type, ...entry }) => entry as PathCardCatalogEntry);

function getPathDeckCount(templateId: PathCard['templateId'], fallback: number): number {
  return PATH_CARD_CATALOG.find((entry) => entry.templateId === templateId)?.copies ?? fallback;
}

export const ENEMY_CAMP_DECK_COUNT = getPathDeckCount('enemy_camp', 5);
export const MERCHANT_DECK_COUNT = getPathDeckCount('merchant', 2);
export const SANCTUARY_DECK_COUNT = getPathDeckCount('sanctuary', 2);
export const AMBUSH_DECK_COUNT = getPathDeckCount('ambush', 2);
export const MAGICAL_CHEST_DECK_COUNT = getPathDeckCount('magical_chest', 1);
export const TRAPPED_CHEST_DECK_COUNT = getPathDeckCount('trapped_chest', 1);
export const GOLD_STASH_DECK_COUNT = getPathDeckCount('gold_stash', 2);
export const SPRING_TRAP_DECK_COUNT = getPathDeckCount('spring_trap', 2);

export function buildPathsDeck(rng: number): { deck: PathCard[]; nextState: number } {
  const cards: PathCard[] = [];
  for (const entry of PATH_CARD_CATALOG) {
    for (let idx = 0; idx < entry.copies; idx++) {
      cards.push({
        id: `path_${entry.templateId}_${idx + 1}`,
        templateId: entry.templateId,
        name: entry.name,
        cardNumber: entry.cardNumber,
        challengeLabel: entry.challengeLabel,
        description: entry.description,
      });
    }
  }
  const { shuffled, nextState } = shuffleArray(cards, rng);
  return { deck: shuffled, nextState };
}

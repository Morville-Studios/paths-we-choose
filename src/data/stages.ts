import adventureData from '../../data/adventure.json';
import { AdventureCard, TerrainType } from '../core/types';

export const STAGE_1_MAX_TURNS = 15;
export const STAGE_2_MAX_TURNS = 15;
export const STAGE_3_MAX_TURNS = 15;
export const STAGE_1_SCENARIO_LEVEL = 1;
export const STAGE_2_SCENARIO_LEVEL = 2;
export const STAGE_3_SCENARIO_LEVEL = 3;

export const STAGE_1_MISSION_NAME = 'The Goblin King';
export const STAGE_2_MISSION_NAME = 'Cult of Trolls';
export const STAGE_3_MISSION_NAME = 'Tomb of the Fallen King';

export interface AdventureCardDefinition {
  cardCode: string;
  name: string;
  terrain: TerrainType;
  level: number;
  hasHostile: boolean;
  hasVillage: boolean;
  hasShrine: boolean;
  isUndiscovered?: boolean;
  flavorText: string;
}

const ADVENTURE_CARDS: AdventureCardDefinition[] = adventureData
  .filter((entry) => entry.type === 'adventure')
  .map(({ type: _type, ...card }) => card as AdventureCardDefinition);

export const ADVENTURE_CARD_ORDER: string[] = ADVENTURE_CARDS.map((card) => card.cardCode);

export const ADVENTURE_CARD_CATALOG: Record<string, AdventureCardDefinition> = Object.fromEntries(
  ADVENTURE_CARDS.map((card) => [card.cardCode, card])
);

/** Exact 30-card composition for Stage 1: The Goblin King */
export const STAGE_1_DECK_COMPOSITION: Record<string, number> = {
  'advgrs-00': 3,
  'advgrs-01': 8,
  'advgrs-03': 3,
  'advgrs-04': 3,
  'advfrs-00': 2,
  'advfrs-01': 5,
  'advfrs-03': 2,
  'advfrs-04': 2,
  'advsmp-00': 1,
  'advsmp-01': 1,
  'advsmp-03': 0,
  'advsmp-04': 0,
};

/** Exact 30-card composition for Stage 2: Cult of Trolls */
export const STAGE_2_DECK_COMPOSITION: Record<string, number> = {
  'advgrs-00': 0,
  'advgrs-01': 0,
  'advgrs-03': 0,
  'advgrs-04': 0,
  'advfrs-00': 3,
  'advfrs-01': 8,
  'advfrs-03': 3,
  'advfrs-04': 3,
  'advsmp-00': 2,
  'advsmp-01': 5,
  'advsmp-03': 2,
  'advsmp-04': 2,
  'advcav-00': 1,
  'advcav-01': 1,
};

/** Exact 30-card composition for Stage 3: Tomb of the Fallen King */
export const STAGE_3_DECK_COMPOSITION: Record<string, number> = {
  'advsmp-00': 3,
  'advsmp-01': 8,
  'advsmp-03': 3,
  'advsmp-04': 3,
  'advcav-00': 2,
  'advcav-01': 5,
  'advcav-03': 2,
  'advcav-04': 2,
  'advund-00': 1,
  'advund-01': 1,
};

export function createStartCard(): AdventureCard {
  return {
    id: 'card_start_00',
    name: 'Start Tile',
    terrain: 'start',
    level: 0,
    hasHostile: false,
    hasVillage: false,
    hasShrine: false,
    revealed: true,
    cardNumber: 'adv-start-00',
    flavorText: 'A quiet crossroad where your great tabletop journey begins.',
  };
}

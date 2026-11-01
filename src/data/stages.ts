import { AdventureCard, TerrainType } from '../core/types';

export const STAGE_1_MAX_TURNS = 15;
export const STAGE_2_MAX_TURNS = 15;

export const STAGE_1_MISSION_NAME = 'The Goblin King';
export const STAGE_2_MISSION_NAME = 'Cult of Trolls';

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

export const ADVENTURE_CARD_ORDER: string[] = [
  'advgrs-00',
  'advgrs-01',
  'advgrs-03',
  'advgrs-04',
  'advfrs-00',
  'advfrs-01',
  'advfrs-03',
  'advfrs-04',
  'advsmp-00',
  'advsmp-01',
  'advsmp-03',
  'advsmp-04',
];

export const ADVENTURE_CARD_CATALOG: Record<string, AdventureCardDefinition> = {
  'advgrs-00': {
    cardCode: 'advgrs-00',
    name: 'Undiscovered Grassland',
    terrain: 'grasslands',
    level: 1,
    hasHostile: false,
    hasVillage: false,
    hasShrine: false,
    isUndiscovered: true,
    flavorText: 'Untamed rolling grasslands stretching towards uncharted horizons.',
  },
  'advgrs-01': {
    cardCode: 'advgrs-01',
    name: 'Grassland Encounter',
    terrain: 'grasslands',
    level: 2,
    hasHostile: true,
    hasVillage: false,
    hasShrine: false,
    flavorText: 'Windswept sunny plains where wild wandering beasts roam.',
  },
  'advgrs-03': {
    cardCode: 'advgrs-03',
    name: 'Grassland Village',
    terrain: 'grasslands',
    level: 1,
    hasHostile: false,
    hasVillage: true,
    hasShrine: false,
    flavorText: 'A peaceful settlement with thatched roofs, warm taverns, and merchants.',
  },
  'advgrs-04': {
    cardCode: 'advgrs-04',
    name: 'Grassland Shrine',
    terrain: 'grasslands',
    level: 1,
    hasHostile: false,
    hasVillage: false,
    hasShrine: true,
    flavorText: 'A sacred golden altar humming with ancient gods and divine grace.',
  },
  'advfrs-00': {
    cardCode: 'advfrs-00',
    name: 'Undiscovered Forest',
    terrain: 'forest',
    level: 2,
    hasHostile: false,
    hasVillage: false,
    hasShrine: false,
    isUndiscovered: true,
    flavorText: 'Ancient untracked woodlands dense with primeval shadows and forgotten trails.',
  },
  'advfrs-01': {
    cardCode: 'advfrs-01',
    name: 'Forest Encounter',
    terrain: 'forest',
    level: 3,
    hasHostile: true,
    hasVillage: false,
    hasShrine: false,
    flavorText: 'A shadowed mossy thicket where creeping serpents and beasts lurk.',
  },
  'advfrs-03': {
    cardCode: 'advfrs-03',
    name: 'Forest Village',
    terrain: 'forest',
    level: 2,
    hasHostile: false,
    hasVillage: true,
    hasShrine: false,
    flavorText: 'An enchanting treetop settlement with rope bridges and welcoming lanterns.',
  },
  'advfrs-04': {
    cardCode: 'advfrs-04',
    name: 'Forest Shrine',
    terrain: 'forest',
    level: 2,
    hasHostile: false,
    hasVillage: false,
    hasShrine: true,
    flavorText: 'An ancient druidic stone circle humming with primeval magic and sacred spirits.',
  },
  'advsmp-00': {
    cardCode: 'advsmp-00',
    name: 'Undiscovered Swamp',
    terrain: 'swamp',
    level: 3,
    hasHostile: false,
    hasVillage: false,
    hasShrine: false,
    isUndiscovered: true,
    flavorText: 'Misty uncharted bayous where mysterious paths wind through deep waters.',
  },
  'advsmp-01': {
    cardCode: 'advsmp-01',
    name: 'Swamp Encounter',
    terrain: 'swamp',
    level: 4,
    hasHostile: true,
    hasVillage: false,
    hasShrine: false,
    flavorText: 'Murky stagnant bogs filled with twisted roots, toxic vapors, and lurking horrors.',
  },
  'advsmp-03': {
    cardCode: 'advsmp-03',
    name: 'Swamp Village',
    terrain: 'swamp',
    level: 3,
    hasHostile: false,
    hasVillage: true,
    hasShrine: false,
    flavorText: 'A resilient stilt village built high above treacherous waters and noxious mists.',
  },
  'advsmp-04': {
    cardCode: 'advsmp-04',
    name: 'Swamp Shrine',
    terrain: 'swamp',
    level: 3,
    hasHostile: false,
    hasVillage: false,
    hasShrine: true,
    flavorText: 'An ancient waterlogged altar carved from sunken stone, lit by eerie will-o-wisps.',
  },
};

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
  'advgrs-01': 2,
  'advgrs-03': 0,
  'advgrs-04': 0,
  'advfrs-00': 2,
  'advfrs-01': 9,
  'advfrs-03': 3,
  'advfrs-04': 3,
  'advsmp-00': 1,
  'advsmp-01': 6,
  'advsmp-03': 2,
  'advsmp-04': 2,
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

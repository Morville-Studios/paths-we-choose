import { TerrainType } from '../core/types';

export interface TerrainPresentation {
  label: string;
  pluralLabel: string;
  icon: string;
  setCode: string;
  templateClass: string;
  badgeClass: string;
}

const TERRAIN_PRESENTATION: Record<TerrainType, TerrainPresentation> = {
  start: {
    label: 'Crossroads', pluralLabel: 'Crossroads', icon: '✦', setCode: '✦ ADV',
    templateClass: 'tcg-template-start', badgeClass: 'start',
  },
  grasslands: {
    label: 'Grassland', pluralLabel: 'Grasslands', icon: '🌿', setCode: '✦ GRS',
    templateClass: 'tcg-template-grassland', badgeClass: 'grass',
  },
  forest: {
    label: 'Forest', pluralLabel: 'Forests', icon: '🌲', setCode: '✦ FOR',
    templateClass: 'tcg-template-forest', badgeClass: 'forest',
  },
  swamp: {
    label: 'Swamp', pluralLabel: 'Swamps', icon: '🪷', setCode: '✦ SWM',
    templateClass: 'tcg-template-swamp', badgeClass: 'swamp',
  },
  cave: {
    label: 'Cave', pluralLabel: 'Caves', icon: '🪨', setCode: '✦ CAV',
    templateClass: 'tcg-template-cave', badgeClass: 'cave',
  },
  underground: {
    label: 'Underground', pluralLabel: 'Underground', icon: '⛏️', setCode: '✦ UND',
    templateClass: 'tcg-template-underground', badgeClass: 'underground',
  },
};

/** Canonical labels, icons and CSS classes for every Adventure terrain. */
export function getTerrainPresentation(terrain: TerrainType): TerrainPresentation {
  return TERRAIN_PRESENTATION[terrain];
}

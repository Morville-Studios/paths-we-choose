import { AdventureCard } from '../core/types';
import { getAdventureRasterArtPath } from './cardArt';
import { getTerrainPresentation } from './terrainPresentation';

export interface AdventureCardRenderOptions {
  tag?: 'button' | 'div';
  className?: string;
  attributes?: string;
  centerHtml?: string;
  setLabel?: string;
  loading?: 'lazy' | 'eager';
}

export function getAdventureCardName(card: AdventureCard): string {
  if (card.name) return card.name;
  if (card.terrain === 'start') return 'Start Tile';
  const terrain = getTerrainPresentation(card.terrain).label;
  if (card.hasHostile) return `${terrain} Encounter`;
  if (card.hasVillage) return `${terrain} Village`;
  if (card.hasShrine) return `${terrain} Shrine`;
  return `Undiscovered ${terrain}`;
}

/** Canonical compact Land card used by the map, pile viewer and event modals. */
export function renderAdventureCardHtml(
  card: AdventureCard,
  options: AdventureCardRenderOptions = {},
): string {
  const {
    tag = 'div',
    className = '',
    attributes = '',
    centerHtml = '',
    setLabel,
    loading = 'lazy',
  } = options;
  const name = getAdventureCardName(card);
  const terrain = getTerrainPresentation(card.terrain);
  const type = card.terrain === 'start' ? 'Start Tile' : 'Land';

  return `
  <${tag} class="adv-card tcg-card tcg-adventure ${terrain.templateClass} ${className}" ${attributes}>
    <div class="tcg-art-window adv-art-window">
      <img src="${getAdventureRasterArtPath(card)}" alt="${name}" class="tcg-art-raster adv-art-raster adventure-raster" loading="${loading}" />
      <div class="adv-art-overlay"></div>
    </div>
    ${card.level > 0 ? `<div class="adv-card-level-badge">Lvl ${card.level}</div>` : ''}
    <header class="adv-card-header ${card.level > 0 ? 'has-level' : ''}">
      <span class="adv-name">${name}</span>
    </header>
    <div class="adv-center-overlay">${centerHtml}</div>
    <footer class="tcg-land-ribbon">
      <span class="tcg-land-icon ${card.terrain}">${terrain.icon}</span>
      <span class="tcg-land-type">${type}</span>
      <span class="tcg-land-set">${setLabel ?? terrain.setCode}</span>
    </footer>
  </${tag}>`;
}

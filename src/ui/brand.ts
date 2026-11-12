import { publicAsset } from './publicAsset';

export const MORVILLE_STUDIOS_URL = 'https://morvillestudios.com/';
export const GAME_CANONICAL_URL = 'https://morvillestudios.com/games/the-paths-we-choose/';
export const GAME_LOGO_ART = 'brand/paths-we-choose-logo.png';

export interface StudioBrandOptions {
  className?: string;
  linkToStudio?: boolean;
}

/** Canonical Morville Studios lockup used on public game surfaces. */
export function studioBrandHtml(options: StudioBrandOptions = {}): string {
  const className = options.className ? ` ${options.className}` : '';
  const image = `<img class="studio-brand-lockup${className}" src="${publicAsset('brand/morville-studios-games-lockup-on-dark.svg')}" alt="Morville Studios" width="470" height="120" />`;
  if (options.linkToStudio === false) return image;
  return `<a class="studio-brand-link" href="${MORVILLE_STUDIOS_URL}" aria-label="Visit Morville Studios">${image}</a>`;
}

export interface GameLogoOptions {
  className?: string;
  alt?: string;
  width?: number;
  height?: number;
}

/** The Paths We Choose tabletop AD&D boardgame-style vector logo. */
export function gameLogoHtml(options: GameLogoOptions = {}): string {
  const className = options.className ? ` ${options.className}` : '';
  const alt = options.alt ?? 'The Paths We Choose';
  const width = options.width ?? 900;
  const height = options.height ?? 380;
  return `<img class="game-logo-art${className}" src="${publicAsset(GAME_LOGO_ART)}" alt="${alt}" width="${width}" height="${height}" />`;
}

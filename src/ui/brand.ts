import { publicAsset } from './publicAsset';

export const MORVILLE_STUDIOS_URL = 'https://morvillestudios.com/';
export const GAME_CANONICAL_URL = 'https://morvillestudios.com/games/the-paths-we-choose/';

export interface StudioBrandOptions {
  className?: string;
  linkToStudio?: boolean;
}

/** Canonical Morville Studios Games division lockup used on public game surfaces. */
export function studioBrandHtml(options: StudioBrandOptions = {}): string {
  const className = options.className ? ` ${options.className}` : '';
  const image = `<img class="studio-brand-lockup${className}" src="${publicAsset('brand/morville-studios-games-lockup-on-dark.svg')}" alt="Morville Studios Games" width="520" height="120" />`;
  if (options.linkToStudio === false) return image;
  return `<a class="studio-brand-link" href="${MORVILLE_STUDIOS_URL}" aria-label="Visit Morville Studios">${image}</a>`;
}

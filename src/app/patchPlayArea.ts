const PLAY_REGION_SELECTORS = [
  '.hud',
  '.play-layout > .play-sidebar',
  '.play-layout > .play-main',
  '.play-layout > .play-sidebar-right',
  '.foot',
  '[data-ui-overlays]',
] as const;

export type PlayRegionMarkup = Map<string, string>;

function getRegions(main: HTMLElement): HTMLElement[] | null {
  const regions = PLAY_REGION_SELECTORS.map((selector) => main.querySelector<HTMLElement>(selector));
  return regions.every((region): region is HTMLElement => region !== null) ? regions : null;
}

/** Capture source markup before localization changes visible text in the DOM. */
export function snapshotPlayArea(root: HTMLElement): PlayRegionMarkup | null {
  const main = root.querySelector<HTMLElement>('.screen.play');
  const regions = main && getRegions(main);
  if (!regions) return null;
  return new Map(PLAY_REGION_SELECTORS.map((selector, index) => [selector, regions[index].outerHTML]));
}

/** Keep unchanged live regions mounted while replacing only regions whose source HTML changed. */
export function patchPlayArea(
  root: HTMLElement,
  nextHtml: string,
  previous: PlayRegionMarkup,
): { changed: HTMLElement[]; markup: PlayRegionMarkup } | null {
  const currentMain = root.querySelector<HTMLElement>('.screen.play');
  if (!currentMain) return null;
  const template = document.createElement('template');
  template.innerHTML = nextHtml;
  const nextMain = template.content.querySelector<HTMLElement>('.screen.play');
  if (!nextMain) return null;
  const currentRegions = getRegions(currentMain);
  const nextRegions = getRegions(nextMain);
  if (!currentRegions || !nextRegions) return null;

  const changed: HTMLElement[] = [];
  const markup: PlayRegionMarkup = new Map();
  currentMain.className = nextMain.className;
  PLAY_REGION_SELECTORS.forEach((selector, index) => {
    const nextRegion = nextRegions[index];
    const nextMarkup = nextRegion.outerHTML;
    markup.set(selector, nextMarkup);
    if (previous.get(selector) !== nextMarkup) {
      currentRegions[index].replaceWith(nextRegion);
      changed.push(nextRegion);
    }
  });
  return { changed, markup };
}

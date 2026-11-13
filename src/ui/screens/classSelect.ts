import { calculateMaxHp, computeEffectiveStats } from '../../core/stats';
import { CharacterStats, ClassId, STATS } from '../../core/types';
import { CLASS_CATALOG, STARTING_BASE_STATS } from '../../data/classes';
import { getAdventurerRasterArtPath } from '../cardArt';
import { getStatIcon } from '../icons';
import { UiState } from '../types';

export function getPlayerClassName(playerClass?: ClassId | null): string {
  if (playerClass === 'wizard') return 'Wizard';
  if (playerClass === 'rogue') return 'Rogue';
  return 'Fighter';
}

export const CLASS_CAROUSEL_ORDER: ClassId[] = ['fighter', 'wizard', 'rogue'];

export function classDetailPanelContentHtml(id: ClassId): string {
  const c = CLASS_CATALOG[id];
  const eff: CharacterStats = computeEffectiveStats(STARTING_BASE_STATS, c.classBonuses, { weapon: null, armor: null, accessory: null });
  const hp = calculateMaxHp(eff.vit);
  const deckLine =
    id === 'wizard'
      ? '8&times; Fireball ATK &middot; 2&times; Force Field DEF'
      : '8&times; Slash &middot; 2&times; Defend';
  const secondaryNames = c.secondaryStats.map((s) => s.toUpperCase()).join(', ');

  return `
  <div class="class-roles">
    <span class="role-badge primary">PRIMARY: ${c.primaryStat.toUpperCase()} (+2)</span>
    <span class="role-badge secondary">SECONDARY: ${secondaryNames} (+1)</span>
  </div>
  <div class="class-passive-banner">
    <div class="passive-header">
      <span class="passive-badge">PASSIVE</span>
      <span class="passive-title">${c.passive.name}</span>
    </div>
    <p class="passive-text">${c.passive.description}</p>
  </div>
  <table class="stat-table">
    <thead>
      <tr><th class="stat-th-header"></th><th>Base</th><th>Innate</th><th>Class</th><th>Total</th></tr>
    </thead>
    <tbody>
      ${STATS.map(
        (s) =>
          `<tr><th class="stat-th-cell"><span class="stat-cell-inner">${getStatIcon(s, 'stat-select-icon')} <span class="stat-select-label">${s.toUpperCase()}</span></span></th><td>1</td><td>+1</td><td>${
            c.classBonuses[s] > 0 ? '+' + c.classBonuses[s] : c.classBonuses[s]
          }</td><td><b>${eff[s]}</b></td></tr>`
      ).join('')}
    </tbody>
  </table>
  <p class="class-hp">${hp} Max HP</p>
  <p class="class-deck">Deck: ${deckLine}</p>`;
}

export function updateClassCarouselDom(container: HTMLElement, selectedClass: ClassId | null): boolean {
  const track = container.querySelector<HTMLElement>('.class-carousel-track');
  if (!track) return false;

  const activeClass = selectedClass ?? 'fighter';
  const activeIdx = CLASS_CAROUSEL_ORDER.indexOf(activeClass) >= 0 ? CLASS_CAROUSEL_ORDER.indexOf(activeClass) : 0;
  const prevIdx = (activeIdx - 1 + CLASS_CAROUSEL_ORDER.length) % CLASS_CAROUSEL_ORDER.length;
  const nextIdx = (activeIdx + 1) % CLASS_CAROUSEL_ORDER.length;

  const prevId = CLASS_CAROUSEL_ORDER[prevIdx];
  const nextId = CLASS_CAROUSEL_ORDER[nextIdx];

  CLASS_CAROUSEL_ORDER.forEach((id) => {
    const card = track.querySelector<HTMLElement>(`.class-card[data-id="${id}"]`);
    if (!card) return;

    card.classList.remove('is-center', 'is-prev', 'is-next', 'selected');
    if (id === activeClass) {
      card.classList.add('is-center', 'selected');
      card.setAttribute('aria-selected', 'true');
      card.tabIndex = 0;
    } else if (id === prevId) {
      card.classList.add('is-prev');
      card.setAttribute('aria-selected', 'false');
      card.tabIndex = 0;
    } else {
      card.classList.add('is-next');
      card.setAttribute('aria-selected', 'false');
      card.tabIndex = 0;
    }
  });

  const detailPanel = container.querySelector<HTMLElement>('#class-detail-panel');
  if (detailPanel) {
    detailPanel.innerHTML = classDetailPanelContentHtml(activeClass);
  }

  const prevBtn = container.querySelector<HTMLElement>('[data-action="prev-class"]');
  if (prevBtn) {
    prevBtn.setAttribute('title', `Previous Class: ${CLASS_CATALOG[prevId].name} (Press A or Left Arrow)`);
  }
  const nextBtn = container.querySelector<HTMLElement>('[data-action="next-class"]');
  if (nextBtn) {
    nextBtn.setAttribute('title', `Next Class: ${CLASS_CATALOG[nextId].name} (Press D or Right Arrow)`);
  }

  return true;
}

export function renderClassSelect(ui: UiState): string {
  const activeClass: ClassId = ui.selectedClass ?? 'fighter';
  const activeIdx = CLASS_CAROUSEL_ORDER.indexOf(activeClass) >= 0 ? CLASS_CAROUSEL_ORDER.indexOf(activeClass) : 0;
  const prevIdx = (activeIdx - 1 + CLASS_CAROUSEL_ORDER.length) % CLASS_CAROUSEL_ORDER.length;
  const prevId = CLASS_CAROUSEL_ORDER[prevIdx];

  const cards = CLASS_CAROUSEL_ORDER.map((id) => {
    const c = CLASS_CATALOG[id];
    const posClass = id === activeClass ? 'is-center selected' : id === prevId ? 'is-prev' : 'is-next';
    const ariaSelected = id === activeClass ? 'true' : 'false';

    return `
    <button class="class-card ${posClass}" data-action="select-class" data-id="${id}" aria-selected="${ariaSelected}" aria-label="${c.name} Class Card" tabindex="0">
      <h2>${c.name}</h2>
      <p class="class-title">${c.title}</p>
      <p class="class-desc">${c.description}</p>
      <div class="class-hero-art-frame">
        <img src="${getAdventurerRasterArtPath(id)}" alt="${c.name}" class="class-hero-art" loading="lazy" />
      </div>
    </button>`;
  }).join('');

  return `
  <main class="screen class-select">
    <h1 class="small">Choose your class</h1>
    <div class="class-select-viewport">
      <div class="class-carousel">
        <div class="class-carousel-track">
          ${cards}
        </div>
        <p class="class-select-instructions">
          Move left or right with A or D. You can also use the LEFT and RIGHT keys. Select the Adventurer Class and click Embark to start
        </p>
      </div>
      <aside class="class-detail-col" aria-label="Class Statistics and Abilities">
        <div class="class-detail-panel" id="class-detail-panel">
          ${classDetailPanelContentHtml(activeClass)}
        </div>
        <button class="btn primary big embark-btn" data-action="embark">Embark</button>
      </aside>
    </div>
  </main>`;
}

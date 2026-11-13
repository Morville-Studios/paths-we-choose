import { createInitialState } from '../../core/engine';
import { InspectedCardInfo, RunState, StatKey } from '../../core/types';
import { hasAnySavedRun, hasResumableAutosave } from '../../state/saveStorage';
import { MORVILLE_STUDIOS_URL, studioBrandHtml } from '../brand';
import { saveModalHtml } from '../modals/saveModal';
import { publicAsset } from '../publicAsset';
import { renderGuideModal } from './guide';
import { cardInspectModal, statInspectModal } from '../render';
import type { PendingSaveAction } from '../types';
export function renderWelcome(
  showGuide = false,
  guidePage = 1,
  inspectedCard: InspectedCardInfo | null = null,
  inspectedStat: StatKey | null = null,
  state?: RunState,
  showSaves = false,
  pendingSaveAction: PendingSaveAction | null = null
): string {
  const effectiveState = state ?? createInitialState('welcome-inspect');
  const canContinue = hasResumableAutosave();
  const hasSaves = hasAnySavedRun();
  return `
  <main class="screen welcome">
    <div class="welcome-vignette" aria-hidden="true"></div>
    <header class="welcome-studio-bar">
      ${studioBrandHtml({ className: 'welcome-studio-brand' })}
      <div class="welcome-studio-nav">
        <a href="${MORVILLE_STUDIOS_URL}">MorvilleStudios.com <span aria-hidden="true">↗</span></a>
      </div>
    </header>

    <section class="welcome-stage" aria-labelledby="game-title">
      <div class="welcome-floating-logo-wrap">
        <h1 id="game-title" class="welcome-logo-heading">
          <img src="${publicAsset('brand/paths-we-choose-logo.png')}" alt="The Paths We Choose" class="welcome-game-logo" width="900" height="380" />
        </h1>
      </div>

      <aside class="welcome-card-showcase" aria-label="Cards from The Paths We Choose">
        <article class="welcome-preview-card welcome-preview-card--left">
          <img src="${publicAsset('cards/adventure/forest_encounter.jpg')}" alt="Forest Encounter card artwork" width="765" height="1024" />
          <span>Choose the path</span>
        </article>
        <article class="welcome-preview-card welcome-preview-card--center">
          <img src="${publicAsset('cards/adventurers/fighter.jpg')}" alt="Fighter adventurer card artwork" width="765" height="1024" fetchpriority="high" />
          <span>Build your hero</span>
        </article>
        <article class="welcome-preview-card welcome-preview-card--right">
          <img src="${publicAsset('cards/creatures/goblin_chieftain.jpg')}" alt="Grundy creature card artwork" width="765" height="1024" />
          <span>Face the consequence</span>
        </article>
      </aside>

      <div class="welcome-bottom-tray">
        <p class="welcome-deckline">Build a path. Shape a hero. Survive what your choices reveal.</p>
        <p class="tagline">A solo browser game combining tactical deck-building, MACG-3D6™ tabletop combat, and a map that grows from every decision.</p>
        <div class="welcome-actions">
          ${canContinue ? `<button class="btn primary big welcome-start" data-action="continue-autosave"><span>Continue Adventure</span><span aria-hidden="true">→</span></button>` : ''}
          <button class="btn ${canContinue ? '' : 'primary big welcome-start'}" data-action="start">
            <span>${canContinue ? 'New Adventure' : 'Start Adventure'}</span>${canContinue ? '' : '<span aria-hidden="true">→</span>'}
          </button>
          ${hasSaves ? `<button class="btn" data-action="open-saves">Load Game</button>` : ''}
          <button class="btn guide-start-btn" data-action="open-guide">How to Play</button>
        </div>
      </div>
    </section>

    <footer class="welcome-footer">
      <span>© 2026 Morville Studios</span>
      <span class="welcome-footer-rule" aria-hidden="true"></span>
      <span>Strategy · Cards · Adventure</span>
      <span class="welcome-footer-build">v0.1</span>
      <button class="btn mini welcome-update-btn" data-action="force-update" title="Clear browser caches and reload the latest version">🔄 Update Game</button>
    </footer>
    ${showGuide ? renderGuideModal(false, guidePage) : ''}
    ${showSaves ? saveModalHtml(effectiveState, pendingSaveAction) : ''}
    ${inspectedCard ? cardInspectModal(inspectedCard, effectiveState) : ''}
    ${inspectedStat ? statInspectModal(inspectedStat, effectiveState) : ''}
  </main>`;
}


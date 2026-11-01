import { CLASS_CATALOG } from '../data/classes';
import { MONSTER_TEMPLATES } from '../data/monsters';
import { ShopItemTemplate } from '../data/shopItems';
import { ADVENTURE_CARD_ORDER } from '../data/stages';
import { getShrineLevel, getShrineSkillUpgradeOptions, PRAYER_OPTION_CATALOG } from '../core/shrine';
import {
  computeCardEffect,
  getMonsterIntent,
  getHeroStatDebuffMods,
  firstLivingMonsterIndex,
  computeHitProbability,
  BASE_HIT_THRESHOLD,
  FLEE_AP_COST,
} from '../core/combat';
import { createFleeCard, getVoidCards } from '../data/combatCards';
import { coordToKey } from '../core/grid';
import {
  getMonsterIllustration,
  getActionCardIllustration,
  getActionRasterArtPath,
  getAdventureRasterArtPath,
  getItemRasterArtPath,
  getAdventurerRasterArtPath,
} from './cardArt';
import {
  getStatIcon,
  getDerivedStatIcon,
  getSlotIcon,
  getResourceIcon,
} from './icons';
import {
  getBaseStatUpgradeCost,
  getEffectiveStatsFromState,
  getFighterBerzerkBonus,
  computeGearBonuses,
  computeCombatGearBonuses,
  getDerivedCombatStats,
  previewGearChange,
  getPlayerAcc,
  getPlayerAtk,
  getPlayerDef,
  getPlayerCritThreshold,
  getPlayerEva,
  getFleeThreshold,
  calculateGoodsPrice,
  GearPreview,
} from '../core/stats';
import {
  MIN_DECK_SIZE,
  checkRestEligibility,
  getTrainRemovalCost,
  getTrainingSkillCost,
  getVillageRestOption,
} from '../core/village';
import {
  ActiveCombatState,
  ActiveExplorationState,
  ActiveShrineState,
  ActiveVillageState,
  AdventureCard,
  CharacterStats,
  ClassId,
  CombatCardDef,
  CombatMonster,
  CombatVictoryState,
  DerivedCombatStats,
  PlacedCardNode,
  RunState,
  ShopItemDef,
  InspectedCardInfo,
  MonsterCard,
  MonsterIntent,
  StatKey,
  STATS,
} from '../core/types';

export type PileType =
  | 'adventure_deck'
  | 'adventure_discard'
  | 'monster_deck'
  | 'monster_discard'
  | 'player_deck'
  | 'player_discard'
  | 'new_skills_deck'
  | 'new_skills_discard'
  | 'void_deck'
  | 'treasure_deck'
  | 'treasure_discard';

export interface PendingCardPlay {
  cardInstanceId: string;
  targetIndex: number;
  discardedCardInstanceIds?: string[];
}

export interface UiState {
  handIndex?: number;
  selectedClass: ClassId | null;
  showDeck: boolean;
  villageTab: 'buy' | 'sell';
  targetIndex: number;
  inspectedCard?: InspectedCardInfo | null;
  inspectedPile?: PileType | null;
  pendingCardPlay?: PendingCardPlay | null;
  pendingFlee?: boolean;
  inspectedStat?: StatKey | null;
  villageRestTicks?: number;
  showGuide?: boolean;
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

export function renderWelcome(showGuide = false): string {
  return `
  <main class="screen welcome">
    <div class="welcome-card">
      <p class="eyebrow">A path-building dungeon crawl</p>
      <h1>The Paths<br/>We Choose</h1>
      <p class="tagline">A game about choices we take that create risks and opportunities.</p>
      <button class="btn primary big" data-action="start">Start Adventure</button>
      <button class="btn guide-start-btn" data-action="open-guide">📖 How to Play</button>
      <p class="version">v0.1 &middot; Stage 1: Grasslands</p>
    </div>
    ${showGuide ? renderGuideModal(false) : ''}
  </main>`;
}

/** A short, plain-language guide available before and during every adventure. */
export function renderGuideModal(inGame: boolean): string {
  return `
  <div class="modal-backdrop guide-backdrop" data-action="close-guide-backdrop">
    <section class="modal guide-modal" role="dialog" aria-modal="true" aria-labelledby="guide-title">
      <header class="guide-header">
        <div>
          <span class="guide-kicker">📖 Quick guide</span>
          <h2 id="guide-title">How to Play</h2>
          <p>Choose a path, grow your hero, and defeat the boss at the end of the map.</p>
        </div>
        <button class="modal-close-btn" data-action="close-guide" aria-label="Close guide">&times;</button>
      </header>

      <div class="guide-grid">
        <article class="guide-step featured"><span class="guide-number">1</span><h3>Pick a path</h3><p>Tap a Land card in front of your hero. Each choice moves you forward and reveals more of the map.</p></article>
        <article class="guide-step"><span class="guide-number">2</span><h3>Handle the Land</h3><p><b>Encounters</b> start battles. <b>Villages</b> heal, shop, and train. <b>Shrines</b> spend Stat Points. <b>Undiscovered</b> Lands can be safe, dangerous, or hide treasure.</p></article>
        <article class="guide-step"><span class="guide-number">3</span><h3>Win the battle</h3><p>Play cards from your hand until you run out of AP, then press <b>End Turn</b>. Defeat every creature to earn Gold and Stat Points.</p></article>
      </div>

      <div class="guide-topic-grid">
      <details class="guide-topic guide-battle-topic" open>
        <summary>⚔️ Battles in one minute</summary>
        <ul>
          <li>Each turn, your remaining hand is discarded, then you draw <b>5 cards</b>. If the draw deck empties, shuffle its discard pile and keep drawing. You usually have <b>3 AP</b> to spend.</li>
          <li>Choose a monster, then choose an attack card. The target badge tells you the roll needed and your chance to hit.</li>
          <li>Attacks roll <b>2 dice</b>. A basic hit is 5 or more after ACC and EVA. Snake eyes always miss; double sixes are a critical hit.</li>
          <li><b>Block</b> absorbs damage for this round. <b>DEF</b> reduces physical damage, while <b>MDEF</b> reduces magical damage.</li>
          <li>If a card asks you to discard cards, choose them in the confirmation window before you press Confirm.</li>
        </ul>
      </details>

      <details class="guide-topic">
        <summary>🌟 Improve your hero</summary>
        <ul>
          <li>Monsters award <b>Gold</b> and <b>Stat Points (SP)</b>.</li>
          <li>At a Shrine, spend SP to raise a base stat. The cost grows as the stat gets higher.</li>
          <li>STR helps HP and ATK; DEX helps ACC; AGI helps EVA; INT helps magic and AP; CHA lowers shop prices.</li>
          <li><b>LUK</b> improves critical hits, victory Gold, and Undiscovered Lands: every 5 LUK adds +1 to the exploration roll.</li>
        </ul>
      </details>

      <details class="guide-topic">
        <summary>🎒 Villages, treasure, and decks</summary>
        <ul>
          <li>Villages let you rest, buy or sell items, and learn skills. You can go back to the village menu while visiting.</li>
          <li>On an Undiscovered Land, a modified exploration roll of <b>6 or more</b> finds treasure. A low result can cause an ambush; other results are safe.</li>
          <li>The right sidebar lets you inspect Adventure, Monster, Treasure, Combat, and New Skills decks. Decks reshuffle their public discard pile when they need more cards.</li>
        </ul>
      </details>

      <details class="guide-topic">
        <summary>🏁 How do I win?</summary>
        <p>Keep moving forward. On Turn 15, the stage boss appears. Defeat it to complete the stage and unlock the next mission.</p>
      </details>
      </div>

      <footer class="guide-footer">
        <span>${inGame ? 'You can reopen this guide anytime from the Guide button.' : 'You can open this guide again anytime during your adventure.'}</span>
        <button class="btn primary" data-action="close-guide">${inGame ? 'Back to Game' : 'Ready to Begin'}</button>
      </footer>
    </section>
  </div>`;
}

export function getPlayerClassName(playerClass?: ClassId | null): string {
  if (playerClass === 'wizard') return 'Wizard';
  if (playerClass === 'rogue') return 'Rogue';
  return 'Fighter';
}

export const CLASS_CAROUSEL_ORDER: ClassId[] = ['fighter', 'wizard', 'rogue'];

function voidBossCards(): MonsterCard[] {
  return Object.values(MONSTER_TEMPLATES)
    .filter((monster) => monster.isBoss)
    .map((monster) => ({ ...monster, id: `void_${monster.templateId}` }));
}

function voidHeroClassIds(playerClass: ClassId | null): ClassId[] {
  return CLASS_CAROUSEL_ORDER.filter((classId) => classId !== playerClass);
}

function voidCardCount(playerClass: ClassId | null): number {
  return getVoidCards().length + voidBossCards().length + voidHeroClassIds(playerClass).length;
}

export function classDetailPanelContentHtml(id: ClassId): string {
  const c = CLASS_CATALOG[id];
  const eff: CharacterStats = {
    str: 1 + c.classBonuses.str,
    dex: 1 + c.classBonuses.dex,
    agi: 1 + c.classBonuses.agi,
    int: 1 + c.classBonuses.int,
    cha: 1 + c.classBonuses.cha,
    luk: 1 + c.classBonuses.luk,
  };
  const hp = 10 + eff.str * 2;
  const deckLine =
    id === 'wizard'
      ? '8&times; Fireball ATK &middot; 2&times; Force Field DEF'
      : '8&times; Melee ATK &middot; 2&times; Shield DEF';
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
      <tr><th class="stat-th-header"></th><th>Base</th><th>Class</th><th>Total</th></tr>
    </thead>
    <tbody>
      ${STATS.map(
        (s) =>
          `<tr><th class="stat-th-cell"><span class="stat-cell-inner">${getStatIcon(s, 'stat-select-icon')} <span class="stat-select-label">${s.toUpperCase()}</span></span></th><td>1</td><td>${
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

// ---------------------------------------------------------------------------
// Play area
// ---------------------------------------------------------------------------

export function getAdventureCardName(card: AdventureCard): string {
  if (card.name) return card.name;
  if (card.terrain === 'start') return 'Start Tile';
  const capTerrain = card.terrain === 'forest' ? 'Forest' : card.terrain === 'swamp' ? 'Swamp' : 'Grassland';
  if (card.hasHostile) return `${capTerrain} Encounter`;
  if (card.hasVillage) return `${capTerrain} Village`;
  if (card.hasShrine) return `${capTerrain} Shrine`;
  return `Undiscovered ${capTerrain}`;
}

export function playerTokenHtml(playerClass?: ClassId | null): string {
  if (playerClass === 'wizard') {
    return `
    <div class="player-token wizard" title="Wizard Token" aria-label="Wizard player token">
      <svg viewBox="0 0 36 36" class="token-svg">
        <circle cx="18" cy="18" r="16" class="token-base wizard-base" />
        <!-- Indigo Wizard Hat with Golden Star & Brim -->
        <path d="M18 6 L27 23 L9 23 Z" fill="#6366f1" stroke="#e0e7ff" stroke-width="1.4" stroke-linejoin="round" />
        <ellipse cx="18" cy="23" rx="12" ry="3.5" fill="#4338ca" stroke="#e0e7ff" stroke-width="1.2" />
        <path d="M11 20 C14 19 22 19 25 20" stroke="#facc15" stroke-width="1.8" />
        <polygon points="18,11 19.5,15 23.5,15.5 20.5,18 21.5,22 18,19.5 14.5,22 15.5,18 12.5,15.5 16.5,15" fill="#fef08a" stroke="#ca8a04" stroke-width="0.6" />
      </svg>
    </div>`;
  }
  if (playerClass === 'rogue') {
    return `
    <div class="player-token rogue" title="Rogue Token" aria-label="Rogue player token">
      <svg viewBox="0 0 36 36" class="token-svg">
        <circle cx="18" cy="18" r="16" class="token-base rogue-base" />
        <!-- Emerald Rogue Hood & Crossed Daggers -->
        <path d="M11 10 C18 6 18 6 25 10 C27 16 26 22 18 28 C10 22 9 16 11 10 Z" fill="#065f46" stroke="#34d399" stroke-width="1.3" />
        <line x1="10" y1="12" x2="26" y2="24" stroke="#f8fafc" stroke-width="2.2" stroke-linecap="round" />
        <line x1="26" y1="12" x2="10" y2="24" stroke="#f8fafc" stroke-width="2.2" stroke-linecap="round" />
        <circle cx="18" cy="18" r="3" fill="#facc15" stroke="#ca8a04" stroke-width="0.9" />
      </svg>
    </div>`;
  }
  return `
  <div class="player-token fighter" title="Fighter Token" aria-label="Fighter player token">
    <svg viewBox="0 0 36 36" class="token-svg">
      <circle cx="18" cy="18" r="16" class="token-base fighter-base" />
      <!-- Crossed Broadswords with Golden Hilts and Central Ruby Shield -->
      <line x1="8" y1="28" x2="28" y2="8" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" />
      <line x1="28" y1="28" x2="8" y2="8" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" />
      <line x1="9" y1="23" x2="13" y2="27" stroke="#f59e0b" stroke-width="2.4" stroke-linecap="round" />
      <line x1="27" y1="23" x2="23" y2="27" stroke="#f59e0b" stroke-width="2.4" stroke-linecap="round" />
      <circle cx="8" cy="28" r="1.5" fill="#fef08a" />
      <circle cx="28" cy="28" r="1.5" fill="#fef08a" />
      <path d="M18 12 L22 14 C22 20 18 24 18 24 C18 24 14 20 14 14 Z" fill="#b91c1c" stroke="#fef08a" stroke-width="1.3" />
      <path d="M18 14 L18 22" stroke="#fef08a" stroke-width="1" />
    </svg>
  </div>`;
}

function adventureCardHtml(node: PlacedCardNode, state: RunState): string {
  const { card, status, coord } = node;
  const isCurrent = status === 'current';
  const dx = coord.col - state.playerPosition.col;
  const dy = coord.row - (state.playerPosition.row + 1);
  const interactive = status === 'available' && state.activeHook.type === 'NONE';

  const cardName = getAdventureCardName(card);
  const minimizedTypeLine = card.terrain === 'start'
    ? 'Start Tile'
    : 'Land';

  const terrainIcon = card.terrain === 'forest' ? '🌲' : card.terrain === 'swamp' ? '🪷' : card.terrain === 'grasslands' ? '🌿' : '✦';
  const setCode = card.terrain === 'forest' ? '✦ FOR' : card.terrain === 'swamp' ? '✦ SWM' : card.terrain === 'start' ? '✦ ADV' : '✦ GRS';
  const rasterArt = getAdventureRasterArtPath(card);

  const templateClass = card.terrain === 'forest'
    ? 'tcg-template-forest'
    : card.terrain === 'swamp'
    ? 'tcg-template-swamp'
    : card.terrain === 'start'
    ? 'tcg-template-start'
    : 'tcg-template-grassland';

  const tag = interactive ? 'button' : 'div';
  const action = interactive ? `data-action="choose" data-col="${coord.col}" data-row="${coord.row}"` : '';

  return `
  <${tag} class="adv-card tcg-card tcg-adventure ${templateClass} ${status} ${card.hasHostile ? 'is-hostile is-encounter' : ''} ${
    card.hasVillage ? 'is-village' : ''
  } ${card.hasShrine ? 'is-shrine' : ''} ${card.terrain === 'start' ? 'is-start' : ''}" style="--dx:${dx};--dy:${dy}" ${action}
    data-inspect-kind="adventure" data-board-key="${coordToKey(coord)}" data-card-id="${card.id}" data-node-col="${coord.col}" data-node-row="${coord.row}" title="${cardName}">
    
    <!-- Full-bleed Raster Art layer -->
    <div class="tcg-art-window adv-art-window">
      <img src="${rasterArt}" alt="${cardName}" class="tcg-art-raster adv-art-raster adventure-raster" loading="lazy" />
      <div class="adv-art-overlay"></div>
    </div>

    <!-- Upper-right Level Badge on minimized card -->
    ${card.level > 0 ? `<div class="adv-card-level-badge">Lvl ${card.level}</div>` : ''}

    <!-- Top Card Name Header (Centered & Shrunk to fit) -->
    <header class="adv-card-header ${card.level > 0 ? 'has-level' : ''}">
      <span class="adv-name">${cardName}</span>
    </header>

    <!-- Center Hero Token when player is on this tile -->
    <div class="adv-center-overlay">
      ${isCurrent ? playerTokenHtml(state.playerClass) : ''}
    </div>

    <!-- Bottom Land Ribbon -->
    <footer class="tcg-land-ribbon">
      <span class="tcg-land-icon ${card.terrain}">${terrainIcon}</span>
      <span class="tcg-land-type">${minimizedTypeLine}</span>
      <span class="tcg-land-set">${setCode}</span>
    </footer>
  </${tag}>`;
}

function statPanelHtml(state: RunState): string {
  const eff = getEffectiveStatsFromState(state);
  const berzerkBonus = getFighterBerzerkBonus(
    state.playerClass,
    state.playerResources?.hp,
    state.playerResources?.maxHp
  );
  const derived = getDerivedCombatStats(eff, state.equippedGear, 0, berzerkBonus);
  const className = getPlayerClassName(state.playerClass);
  const heroArt = getAdventurerRasterArtPath(state.playerClass);

  return `
  <div class="stat-panel">
    <div class="hero-sidebar-portrait-row">
      <div class="hero-sidebar-portrait-frame" title="${className} (Hero)" data-inspect-kind="hero">
        <img src="${heroArt}" alt="${className} Hero" class="hero-sidebar-portrait-img" loading="lazy" />
      </div>
      <div class="hero-sidebar-stats-col">
        ${STATS.map((s) => `
          <div class="stat-row inspectable-stat"
            data-action="inspect-stat" data-stat="${s}" data-inspect-stat="${s}"
            title="Click or right-click to view ${s.toUpperCase()} computation, scaling & next SP cost">
            <span class="stat-name">${getStatIcon(s, 'stat-icon')} ${s.toUpperCase()}</span>
            <span class="stat-val">${eff[s]}</span>
            <span class="stat-info-pill" title="View stat breakdown">&#9432;</span>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="derived-combat-stats">
      <span class="derived-chip acc" title="Accuracy: 1 ACC per 2 DEX">${getDerivedStatIcon('acc')} ACC <b>${derived.acc}</b></span>
      <span class="derived-chip eva" title="Evasion: 1 EVA per 2 AGI + Gear EVA">${getDerivedStatIcon('eva')} EVA <b>${derived.eva}</b></span>
      <span class="derived-chip atk" title="Physical Attack: floor(STR / 2) + floor(DEX / 3) + Gear ATK">${getDerivedStatIcon('atk')} ATK <b>${derived.atk}</b></span>
      <span class="derived-chip def" title="Physical Defense: floor(STR / 5) + floor(AGI / 3) + Gear DEF">${getDerivedStatIcon('def')} DEF <b>${derived.def}</b></span>
      <span class="derived-chip matk" title="Magical Attack: floor(INT / 2) + Gear MATK">${getDerivedStatIcon('matk')} MATK <b>${derived.matk}</b></span>
      <span class="derived-chip mdef" title="Magical Defense: floor(INT / 5) + Gear MDEF">${getDerivedStatIcon('mdef')} MDEF <b>${derived.mdef}</b></span>
      ${derived.pen > 0 ? `<span class="derived-chip pen" title="Physical Penetration: physical attacks ignore this much enemy natural DEF"><span class="pen-symbol">PEN</span> PEN <b>${derived.pen}</b></span>` : ''}
      <span class="derived-chip act" title="Max Action Points: Base 3 + floor(INT / 5)">${getDerivedStatIcon('act')} ACT <b>${derived.act}</b></span>
      <span class="derived-chip crit" title="Critical Hit Range: 12 - floor(LUK / 10)">🎲 CRIT <b>${derived.critThreshold ?? 12}+</b></span>
      <span class="derived-chip cha" title="Charisma: -5% shop prices per CHA">${getStatIcon('cha')} DISC <b>-${eff.cha * 5}%</b></span>
    </div>
    <p class="muted shrine-hint">Right-click any stat for full computation &amp; next SP cost.</p>
  </div>`;
}

function gearHtml(state: RunState): string {
  const isCombat = state.activeHook.type === 'COMBAT';
  const slot = (label: string, item: ShopItemDef | null) => {
    const slotKey = label.toLowerCase();
    const raster = item ? getItemRasterArtPath(item.id) : null;
    return `
    <div class="slot ${item ? 'filled inspectable-row' : 'empty-slot'}" ${
      item
        ? `data-inspect-kind="item" data-item-id="${item.id}" data-item-instance="${item.instanceId}" title="Right-click or hold to inspect ${item.name}"`
        : ''
    }>
      <span class="slot-label">${getSlotIcon(slotKey, 'slot-icon')} ${label}</span>
      <div class="slot-item-info">
        ${raster ? `<img src="${raster}" alt="${item!.name}" class="inv-slot-mini-img" loading="lazy" />` : ''}
        <span class="slot-item-name">${item ? item.name : 'Empty'}</span>
      </div>
      ${
        item && !isCombat
          ? `<button class="btn mini secondary unequip-btn" data-action="unequip" data-id="${slotKey}" title="Unequip ${item.name} to backpack">Unequip</button>`
          : ''
      }
    </div>`;
  };

  const bagItems = state.backpack.length
    ? state.backpack
        .map((i) => {
          const raster = getItemRasterArtPath(i.id);
          const inspectAttr = `data-inspect-kind="item" data-item-id="${i.id}" data-item-instance="${i.instanceId}" title="Right-click or hold to inspect ${i.name}"`;
          const isConsumable = i.category === 'consumable';
          return `
          <div class="backpack-item inspectable-row" ${inspectAttr}>
            <div class="bag-item-left">
              <img src="${raster}" alt="${i.name}" class="inv-slot-mini-img" loading="lazy" />
              <span class="bag-item-name">${i.name}</span>
            </div>
            <div class="bag-item-actions">
              ${
                isConsumable
                  ? `<button class="btn mini primary" data-action="use-item" data-id="${i.instanceId}" title="Use consumable">Use</button>`
                  : `<button class="btn mini primary" data-action="equip" data-id="${i.instanceId}" ${
                      isCombat ? 'disabled' : ''
                    } title="Equip to ${i.category}">Equip</button>`
              }
            </div>
          </div>`;
        })
        .join('')
    : '<div class="empty-backpack-note muted">Empty (cards/items in backpack appear here)</div>';

  return `
  <div class="gear">
    <div class="equipped-slots">
      ${slot('Weapon', state.equippedGear.weapon)}
      ${slot('Armor', state.equippedGear.armor)}
      ${slot('Accessory', state.equippedGear.accessory)}
    </div>
    <div class="backpack-box">
      <div class="backpack-header">
        <span class="slot-label">🎒 Backpack (${state.backpack.length})</span>
      </div>
      <div class="backpack-items">${bagItems}</div>
    </div>
  </div>`;
}

type DeckPileGroupId = 'adventure' | 'monster' | 'player' | 'treasure' | 'newSkills' | 'void';

interface DeckPanelConfig {
  visibleGroups: readonly DeckPileGroupId[];
  heading?: string;
  ariaLabel?: string;
  className?: string;
  showFooter?: boolean;
  groupLabels?: Partial<Record<DeckPileGroupId, string>>;
}

interface DeckPileGroupDetails {
  icon: string;
  title: string;
  deckLabel: string;
  deckCount: number;
  discardCount: number;
  deckPile: PileType;
  discardPile: PileType;
  cssPrefix: string;
  showDiscard?: boolean;
}

function deckPileGroupDetails(state: RunState, group: DeckPileGroupId): DeckPileGroupDetails {
  const combat = state.activeHook.type === 'COMBAT' ? state.activeHook.combat : null;
  switch (group) {
    case 'adventure':
      return { icon: '🌿', title: 'Adventure Cards', deckLabel: 'Deck', deckCount: state.adventureDeck.length, discardCount: state.adventureDiscard.length, deckPile: 'adventure_deck', discardPile: 'adventure_discard', cssPrefix: 'adventure' };
    case 'monster':
      return { icon: '👹', title: 'Monster Cards', deckLabel: 'Deck', deckCount: state.monsterDeck.length, discardCount: state.monsterDiscard.length, deckPile: 'monster_deck', discardPile: 'monster_discard', cssPrefix: 'monster' };
    case 'player':
      return { icon: '⚔️', title: 'Player Combat Deck', deckLabel: combat ? 'Draw' : 'Deck', deckCount: combat ? combat.drawPile.length : state.playerMasterDeck.length, discardCount: combat ? combat.discardPile.length : 0, deckPile: 'player_deck', discardPile: 'player_discard', cssPrefix: 'player' };
    case 'treasure':
      return { icon: '💎', title: 'Treasure Cards', deckLabel: 'Deck', deckCount: state.treasureDeck.length, discardCount: state.treasureDiscard.length, deckPile: 'treasure_deck', discardPile: 'treasure_discard', cssPrefix: 'treasure' };
    case 'newSkills':
      return { icon: '📚', title: 'New Skills', deckLabel: 'Deck', deckCount: state.newSkillsDeck.length, discardCount: state.newSkillsDiscard.length, deckPile: 'new_skills_deck', discardPile: 'new_skills_discard', cssPrefix: 'new-skills' };
    case 'void':
      return { icon: '🌀', title: 'The Void', deckLabel: 'Void', deckCount: voidCardCount(state.playerClass), discardCount: 0, deckPile: 'void_deck', discardPile: 'void_deck', cssPrefix: 'void', showDiscard: false };
  }
}

function deckPileGroupHtml(state: RunState, group: DeckPileGroupId, label?: string): string {
  const details = deckPileGroupDetails(state, group);
  const title = label ?? details.title;
  const pileButton = (kind: 'deck' | 'discard', count: number, pile: PileType) => `
    <button class="pile-card ${details.cssPrefix}-${kind}" data-action="open-pile" data-pile="${pile}" title="View ${title} ${kind === 'deck' ? details.deckLabel : 'Discard'} (Left or Right Click)">
      <div class="pile-stack-effect"></div>
      <div class="pile-card-content">
        <span class="pile-card-title">${kind === 'deck' ? details.deckLabel : 'Discard'}</span>
        <span class="pile-card-count">${count}</span>
        <span class="pile-card-unit">cards</span>
      </div>
    </button>`;

  return `
    <div class="pile-group" data-pile-group="${group}">
      <div class="pile-group-title"><span class="pile-icon">${details.icon}</span> ${title}</div>
      <div class="pile-buttons-row ${details.showDiscard === false ? 'is-single-pile' : ''}">
        ${pileButton('deck', details.deckCount, details.deckPile)}
        ${details.showDiscard === false ? '' : pileButton('discard', details.discardCount, details.discardPile)}
      </div>
    </div>`;
}

/** Reusable deck/discard panel. Call sites choose which pile groups they expose. */
export function deckPilesPanelHtml(state: RunState, config: DeckPanelConfig): string {
  const heading = config.heading ?? 'Decks &amp; Discards';
  const className = config.className ? ` ${config.className}` : '';
  const showFooter = config.showFooter ?? true;
  const defaultPile = config.visibleGroups.length === 1
    ? deckPileGroupDetails(state, config.visibleGroups[0]).deckPile
    : undefined;
  return `
  <section class="deck-piles-panel${className}" aria-label="${config.ariaLabel ?? heading}"${defaultPile ? ` data-pile-default="${defaultPile}"` : ''}>
    <div class="piles-header"><h3>${heading}</h3></div>
    ${config.visibleGroups.map((group) => deckPileGroupHtml(state, group, config.groupLabels?.[group])).join('')}
    ${showFooter ? '<div class="piles-footer-note"><small class="muted">&#9432; Click or right-click any pile to view cards &amp; multipliers.</small></div>' : ''}
  </section>`;
}

export function rightSidebarHtml(state: RunState): string {
  return deckPilesPanelHtml(state, {
    visibleGroups: ['adventure', 'monster', 'player', 'treasure', 'newSkills', 'void'],
    heading: 'Decks &amp; Discards',
  });
}

function adventurePileCardItem(card: AdventureCard, count: number, totalCards: number): string {
  const cardName = getAdventureCardName(card);
  const terrainIcon = card.terrain === 'forest' ? '🌲' : card.terrain === 'grasslands' ? '🌿' : '✦';
  const setCode = card.terrain === 'forest' ? '✦ FOR' : card.terrain === 'start' ? '✦ ADV' : '✦ GRS';
  const rasterArt = getAdventureRasterArtPath(card);
  const templateClass = card.terrain === 'forest'
    ? 'tcg-template-forest'
    : card.terrain === 'swamp'
    ? 'tcg-template-swamp'
    : card.terrain === 'start'
    ? 'tcg-template-start'
    : 'tcg-template-grassland';
  const minimizedTypeLine = card.terrain === 'start'
    ? 'Start Tile'
    : 'Land';

  return `
  <div class="deck-pile-card-item pile-card-wrapper" data-inspect-kind="adventure" data-adventure-card-number="${card.cardNumber ?? ''}" data-adventure-card-name="${cardName}" title="${cardName} (×${count} in pile)">
    <div class="card-multiplier-badge pile-multiplier-badge">&times;${count}</div>
    <div class="deck-pile-card-frame">
      <div class="adv-card tcg-card tcg-adventure ${templateClass} ${card.hasHostile ? 'is-hostile is-encounter' : ''} ${
        card.hasVillage ? 'is-village' : ''
      } ${card.hasShrine ? 'is-shrine' : ''} ${card.terrain === 'start' ? 'is-start' : ''}">
        <div class="tcg-art-window adv-art-window">
          <img src="${rasterArt}" alt="${cardName}" class="tcg-art-raster adv-art-raster adventure-raster" loading="lazy" />
          <div class="adv-art-overlay"></div>
        </div>
        ${card.level > 0 ? `<div class="adv-card-level-badge">Lvl ${card.level}</div>` : ''}
        <header class="adv-card-header ${card.level > 0 ? 'has-level' : ''}">
          <span class="adv-name">${cardName}</span>
        </header>
        <footer class="tcg-land-ribbon">
          <span class="tcg-land-icon ${card.terrain}">${terrainIcon}</span>
          <span class="tcg-land-type">${minimizedTypeLine}</span>
          <span class="tcg-land-set">${setCode}</span>
        </footer>
      </div>
    </div>
    <div class="card-count-label pile-card-count-label"><b>${count}</b> of ${totalCards} (${Math.round((count / totalCards) * 100)}%)</div>
  </div>`;
}

export function renderSpawnBadges(spawnTerrains?: string[]): string {
  const terrains = spawnTerrains ?? ['grasslands', 'forest'];
  const badges: string[] = [];
  if (terrains.includes('grasslands')) {
    badges.push('<span class="tcg-spawn-badge grass" title="Spawns in Grasslands">🌿</span>');
  }
  if (terrains.includes('forest')) {
    badges.push('<span class="tcg-spawn-badge forest" title="Spawns in Forests">🌲</span>');
  }
  if (terrains.includes('swamp')) {
    badges.push('<span class="tcg-spawn-badge swamp" title="Spawns in Swamps">🪷</span>');
  }
  if (terrains.includes('cave')) {
    badges.push('<span class="tcg-spawn-badge cave" title="Spawns in Caves">🪨</span>');
  }
  if (terrains.includes('underground')) {
    badges.push('<span class="tcg-spawn-badge underground" title="Spawns Underground">⛏️</span>');
  }
  return badges.join('');
}

function monsterPileCardItem(m: MonsterCard, count: number, totalCards: number): string {
  const illustration = getMonsterIllustration(m.templateId);
  const terrains = m.spawnTerrains ?? ['grasslands', 'forest'];
  const spawnIcons = renderSpawnBadges(m.spawnTerrains);
  const templateClass = m.isBoss ? 'is-boss tcg-template-boss' : 'tcg-template-grassland';
  const subtype = formatCreatureSubtype(m.creatureType);

  return `
  <div class="deck-pile-card-item pile-card-wrapper" data-inspect-kind="monster" data-monster-id="${m.templateId}" title="${m.name} (×${count} in pile)">
    <div class="deck-pile-card-frame">
      <div class="tcg-card tcg-creature ${templateClass} is-mini">
        <div class="tcg-inner-frame">
          <div class="tcg-art-window">
            ${illustration}
          </div>
          <header class="tcg-header tcg-mini-creature-header">
            <span class="tcg-name">${m.name}</span>
            <span class="tcg-level-ribbon">Lvl ${m.level}</span>
          </header>
          <div class="tcg-art-spacer"></div>
          <footer class="tcg-footer tcg-mini-creature-footer">
            <span class="tcg-mini-subtype">${subtype}</span>
            <div class="tcg-spawn-group" title="Spawn Terrains: ${terrains.join(', ')}">
              ${spawnIcons}
            </div>
          </footer>
        </div>
      </div>
      <div class="pile-multiplier-badge-bottom">&times;${count}</div>
    </div>
    <div class="card-count-label pile-card-count-label"><b>${count}</b> of ${totalCards} (${Math.round((count / totalCards) * 100)}%)</div>
  </div>`;
}

function combatPileCardItem(card: CombatCardDef, count: number, totalCards: number, stats: CharacterStats, state: RunState): string {
  // Pile cards are for reference only: they must look like real cards without
  // becoming actionable combat controls.
  const cardHtml = combatCardHtml(card, stats, false, 'play-card', true, state, true);
  return `
  <div class="deck-pile-card-item pile-card-wrapper" data-inspect-kind="action" data-card-id="${card.id}" title="${card.name} (×${count} in pile)">
    <div class="deck-pile-card-frame">
      ${cardHtml}
      <div class="pile-multiplier-badge-bottom">&times;${count}</div>
    </div>
    <div class="card-count-label pile-card-count-label"><b>${count}</b> of ${totalCards} (${Math.round((count / totalCards) * 100)}%)</div>
  </div>`;
}

function voidHeroPileCardItem(classId: ClassId, totalCards: number): string {
  const hero = CLASS_CATALOG[classId];
  return `
  <div class="deck-pile-card-item pile-card-wrapper void-hero-card" title="${hero.name} hero card (in the Void)">
    <div class="deck-pile-card-frame">
      <div class="tcg-card tcg-adventurer-card is-mini">
        <div class="tcg-inner-frame">
          <div class="tcg-art-window action-window">
            <img src="${getAdventurerRasterArtPath(classId)}" alt="${hero.name}" class="tcg-art-raster" loading="lazy" />
          </div>
          <header class="tcg-header">
            <div class="tcg-header-meta">
              <div class="tcg-type-stacked">
                <span class="tcg-type-main">ADVENTURER</span>
                <span class="tcg-type-sub">Unselected Hero</span>
              </div>
              <span class="void-hero-tag">VOID</span>
            </div>
            <div class="tcg-header-title"><span class="tcg-name action-name">${hero.name}</span></div>
          </header>
          <div class="tcg-art-spacer"></div>
          <div class="tcg-textbox action-text"><div class="tcg-action-effect"><b>${hero.title}</b><br/>${hero.passive.name}</div></div>
        </div>
      </div>
      <div class="pile-multiplier-badge-bottom">×1</div>
    </div>
    <div class="card-count-label pile-card-count-label"><b>1</b> of ${totalCards} (${Math.round(100 / totalCards)}%)</div>
  </div>`;
}

export function getItemDisplayName(name: string): string {
  return name.replace(/^LVL\s*\d+\s*/i, '').trim();
}

export function formatCreatureSubtype(type?: string): string {
  if (!type) return 'Beast';
  const clean = type
    .replace(/^Boss\s+/i, '')
    .replace(/^Creature\s*[\u2014\-–:]\s*/i, '')
    .replace(/^Creature\s+/i, '')
    .replace(/^Creature$/i, '')
    .trim();
  return clean || 'Beast';
}

export interface TcgItemCardOptions {
  isMini?: boolean;
  extraClasses?: string;
}

export function renderTcgItemCard(
  item: ShopItemTemplate | ShopItemDef,
  options: TcgItemCardOptions | string = {}
): string {
  const opts: TcgItemCardOptions =
    typeof options === 'string' ? { extraClasses: options } : options;
  const isMini = Boolean(opts.isMini);
  const extraClass = [opts.extraClasses, isMini ? 'is-mini' : ''].filter(Boolean).join(' ');

  const rasterArt = getItemRasterArtPath(item.id);
  const isEquip = item.category !== 'consumable';
  const slotIcon =
    item.category === 'weapon'
      ? getSlotIcon('weapon', 'header-icon')
      : item.category === 'armor'
      ? getSlotIcon('armor', 'header-icon')
      : item.category === 'accessory'
      ? getSlotIcon('accessory', 'header-icon')
      : '🧪';
  const typeMain = isEquip ? 'Equipment' : 'Item';
  const typeSub =
    item.category === 'weapon'
      ? 'Weapon'
      : item.category === 'armor'
      ? 'Armor'
      : item.category === 'accessory'
      ? 'Accessory'
      : 'Consumable';
  const levelText = `Lvl ${item.level ?? 1}`;
  const displayName = getItemDisplayName(item.name);

  return `
  <div class="tcg-card tcg-item tcg-template-item ${extraClass}">
    <div class="tcg-inner-frame">
      <div class="tcg-art-window item-art-window">
        <img src="${rasterArt}" alt="${displayName}" class="tcg-art-raster item-raster" loading="lazy" />
      </div>
      <header class="tcg-header tcg-item-header">
        <div class="tcg-header-meta">
          <div class="tcg-type-stacked tcg-item-type-stacked">
            <span class="tcg-type-main tcg-item-type-main">${typeMain}</span>
            <span class="tcg-type-sub tcg-item-type-sub">${typeSub} <span class="item-type-icon">${slotIcon}</span></span>
          </div>
          <span class="tcg-level-ribbon tcg-item-level-ribbon">${levelText}</span>
        </div>
        <div class="tcg-header-title">
          <span class="tcg-name">${displayName}</span>
        </div>
      </header>
      <div class="tcg-art-spacer tcg-item-art-spacer"></div>
      <div class="tcg-textbox">
        <p class="item-inspect-desc">${item.description}</p>
      </div>
      ${
        !isMini
          ? `<footer class="tcg-footer">
        <span class="tcg-card-num">${item.cardNumber ?? 'ITM · #001'}</span>
      </footer>`
          : ''
      }
    </div>
  </div>`;
}

function treasurePileCardItem(item: ShopItemDef, count: number, totalCards: number): string {
  return `
  <div class="deck-pile-card-item pile-card-wrapper" data-inspect-kind="item" data-item-id="${item.id}" data-item-instance="${item.instanceId ?? ''}" title="${item.name} (×${count} in pile)">
    <div class="card-multiplier-badge pile-multiplier-badge">&times;${count}</div>
    <div class="deck-pile-card-frame">
      ${renderTcgItemCard(item, { isMini: true })}
    </div>
    <div class="card-count-label pile-card-count-label"><b>${count}</b> of ${totalCards} (${Math.round((count / totalCards) * 100)}%)</div>
  </div>`;
}

export function pileModal(pileType: PileType, state: RunState): string {
  const stats = getEffectiveStatsFromState(state);
  let title = '';
  let icon = '';
  let desc = '';
  let totalCards = 0;
  let uniqueCount = 0;
  let cardsHtml = '';

  const inCombat = state.activeHook.type === 'COMBAT';

  if (pileType === 'void_deck') {
    const upgradeCards = getVoidCards();
    const bosses = voidBossCards();
    const heroes = voidHeroClassIds(state.playerClass);
    icon = '🌀';
    title = 'The Void';
    desc = 'Public not-in-play cards. The Void is inexhaustible: eligible Shrines pull matching skill upgrades, while Boss cards and every hero not chosen by the current player remain available to inspect.';
    totalCards = upgradeCards.length + bosses.length + heroes.length;
    uniqueCount = totalCards;
    cardsHtml = [
      ...upgradeCards
        .sort((a, b) => (a.cardNumber ?? a.name).localeCompare(b.cardNumber ?? b.name))
        .map((card) => combatPileCardItem(card, 1, totalCards, stats, state)),
      ...bosses
        .sort((a, b) => (a.cardNumber ?? a.name).localeCompare(b.cardNumber ?? b.name))
        .map((monster) => monsterPileCardItem(monster, 1, totalCards)),
      ...heroes.map((classId) => voidHeroPileCardItem(classId, totalCards)),
    ].join('');
  } else if (pileType === 'adventure_deck' || pileType === 'adventure_discard') {
    const isDeck = pileType === 'adventure_deck';
    const cards = isDeck ? state.adventureDeck : state.adventureDiscard;
    icon = isDeck ? '🌿' : '🍂';
    title = isDeck ? 'Adventure Deck' : 'Adventure Discard Pile';
    desc = isDeck
      ? 'Terrain and encounter cards drawn to expand your 3-row pyramid vision cone as you journey forward.'
      : 'Adventure cards swept from lagging rows (Row R - 1) as you advance across the kingdom.';
    totalCards = cards.length;

    const groups = new Map<string, { card: AdventureCard; count: number }>();
    for (const c of cards) {
      const key = c.cardNumber || `${c.name || getAdventureCardName(c)}_${c.level}`;
      const entry = groups.get(key);
      if (entry) entry.count++;
      else groups.set(key, { card: c, count: 1 });
    }
    uniqueCount = groups.size;
    cardsHtml = Array.from(groups.values())
      .sort((a, b) => {
        const codeA = a.card.cardNumber ?? '';
        const codeB = b.card.cardNumber ?? '';
        const idxA = ADVENTURE_CARD_ORDER.indexOf(codeA);
        const idxB = ADVENTURE_CARD_ORDER.indexOf(codeB);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return codeA.localeCompare(codeB);
      })
      .map(({ card, count }) => adventurePileCardItem(card, count, totalCards))
      .join('');
  } else if (pileType === 'monster_deck' || pileType === 'monster_discard') {
    const isDeck = pileType === 'monster_deck';
    const cards = isDeck ? state.monsterDeck : state.monsterDiscard;
    icon = isDeck ? '👹' : '💀';
    title = isDeck ? 'Monster Deck' : 'Monster Discard Pile';
    desc = isDeck
      ? 'Hostiles drawn during tile encounters matching the tile terrain budget (Grasslands 🌿 & Forest 🌲). Defeating monsters awards inscribed Stat Points and Gold.'
      : 'Monsters defeated in battle during this stage.';
    totalCards = cards.length;

    const groups = new Map<string, { monster: MonsterCard; count: number }>();
    for (const m of cards) {
      const key = m.templateId || m.name;
      const entry = groups.get(key);
      if (entry) entry.count++;
      else groups.set(key, { monster: m, count: 1 });
    }
    uniqueCount = groups.size;
    cardsHtml = Array.from(groups.values())
      .sort((a, b) => {
        const codeA = a.monster.cardNumber ?? a.monster.name;
        const codeB = b.monster.cardNumber ?? b.monster.name;
        return codeA.localeCompare(codeB);
      })
      .map(({ monster, count }) => monsterPileCardItem(monster, count, totalCards))
      .join('');
  } else if (pileType === 'treasure_deck' || pileType === 'treasure_discard') {
    const isDeck = pileType === 'treasure_deck';
    const cards = isDeck ? state.treasureDeck : state.treasureDiscard;
    icon = isDeck ? '💎' : '🪙';
    title = isDeck ? 'Treasure Deck' : 'Treasure Discard Pile';
    desc = isDeck
      ? 'Treasure item cards drawn when visiting Village Shops (5 + Village Level items per visit). Unbought cards go to the Treasure Discard Pile.'
      : 'Treasure item cards discarded from previous shop visits or sold by the player. Reshuffled when the Treasure Deck runs empty.';
    totalCards = cards.length;

    const groups = new Map<string, { item: ShopItemDef; count: number }>();
    for (const item of cards) {
      const key = item.id;
      const entry = groups.get(key);
      if (entry) entry.count++;
      else groups.set(key, { item, count: 1 });
    }
    uniqueCount = groups.size;
    cardsHtml = Array.from(groups.values())
      .sort((a, b) => {
        const codeA = a.item.cardNumber ?? a.item.name;
        const codeB = b.item.cardNumber ?? b.item.name;
        return codeA.localeCompare(codeB);
      })
      .map(({ item, count }) => treasurePileCardItem(item, count, totalCards))
      .join('');
  } else {
    const isNewSkills = pileType === 'new_skills_deck' || pileType === 'new_skills_discard';
    const isDeck = pileType === 'player_deck' || pileType === 'new_skills_deck';
    const combat = state.activeHook.type === 'COMBAT' ? state.activeHook.combat : null;
    const cards = isNewSkills
      ? (isDeck ? state.newSkillsDeck : state.newSkillsDiscard)
      : combat
      ? (isDeck ? combat.drawPile : combat.discardPile)
      : (isDeck ? state.playerMasterDeck : []);
    icon = isNewSkills ? (isDeck ? '📚' : '📖') : (isDeck ? '⚔️' : '🛡️');
    title = isNewSkills
      ? (isDeck ? 'New Skills Deck' : 'New Skills Discard Pile')
      : inCombat
      ? (isDeck ? 'Player Combat Draw Deck' : 'Player Combat Discard Pile')
      : (isDeck ? 'Player Combat Master Deck' : 'Player Combat Discard Pile');
    desc = isNewSkills
      ? (isDeck
          ? 'Learnable non-starter skills. Each listed skill has two physical copies; Village training draws from this deck.'
          : 'Unlearned Village skill offers. They are reshuffled into the New Skills Deck only when it runs empty.')
      : inCombat
      ? (isDeck
          ? 'Action cards remaining in your draw pile for this combat. Reshuffled from discard when empty.'
          : 'Action cards played or discarded during this battle.')
      : (isDeck
          ? 'Your full combat action deck with current effective stat scaling.'
          : 'Combat discard pile is empty outside of battle.');
    totalCards = cards.length;

    const groups = new Map<string, { card: CombatCardDef; count: number }>();
    for (const c of cards) {
      const key = c.id;
      const entry = groups.get(key);
      if (entry) entry.count++;
      else groups.set(key, { card: c, count: 1 });
    }
    uniqueCount = groups.size;
    cardsHtml = Array.from(groups.values())
      .sort((a, b) => {
        const codeA = a.card.cardNumber ?? a.card.name;
        const codeB = b.card.cardNumber ?? b.card.name;
        return codeA.localeCompare(codeB);
      })
      .map(({ card, count }) => combatPileCardItem(card, count, totalCards, stats, state))
      .join('');
  }

  return `
  <div class="modal-backdrop" data-action="close-pile-backdrop">
    <div class="modal deck-pile-modal pile-modal">
      <header class="deck-pile-header pile-modal-header">
        <div class="deck-pile-title-group pile-header-title-group">
          <h2><span class="deck-pile-icon pile-header-icon">${icon}</span> ${title}</h2>
          <span class="deck-pile-meta pile-header-meta">${totalCards} cards total &middot; <b>${uniqueCount}</b> unique card ${uniqueCount === 1 ? 'type' : 'types'}</span>
        </div>
        <button class="modal-close-btn" data-action="close-pile" aria-label="Close modal">&times;</button>
      </header>

      <div class="deck-pile-desc pile-desc-text">${desc}</div>

      <div class="deck-pile-body">
        ${
          totalCards === 0
            ? `<div class="deck-pile-empty empty-pile-box">
                <span class="empty-icon">${icon}</span>
                <p class="empty-title">This pile is empty</p>
                <p class="empty-desc empty-pile-msg">This pile is currently empty (0 cards).</p>
              </div>`
            : `<div class="deck-pile-grid pile-modal-grid">${cardsHtml}</div>`
        }
      </div>

      <footer class="deck-pile-footer pile-modal-actions">
        <span class="deck-pile-hint muted small">&#9432; Right-click or hold any card for physical print layout &amp; formulas</span>
        <button class="btn primary" data-action="close-pile">Back to Game</button>
      </footer>
    </div>
  </div>`;
}

export function renderPlayArea(state: RunState, ui: UiState): string {
  const res = state.playerResources;
  if (!res) return '';
  const hpPct = Math.max(0, Math.round((res.hp / res.maxHp) * 100));
  const nodes = Object.values(state.board).sort((a, b) => a.coord.row - b.coord.row);
  const classDef = state.playerClass ? CLASS_CATALOG[state.playerClass] : null;

  return `
  <main class="screen play">
    <header class="hud">
      <div class="hud-top">
        <div class="turn">Turn <b>${state.turn}</b> / ${state.maxTurns}</div>
        <div class="who">${classDef ? classDef.name : ''}</div>
        <div class="gold">${getResourceIcon('gold', 'chip-icon')} ${res.gold} Gold</div>
        <div class="sp">${getResourceIcon('sp', 'chip-icon')} ${res.statPoints} SP</div>
        <button class="btn mini hud-guide-btn" data-action="open-guide" title="Open the How to Play guide">📖 Guide</button>
        ${state.divineProtection > 0 ? `<div class="hud-badge prot">&#10022; Prot -${state.divineProtection}</div>` : ''}
        ${state.statusEffects && state.statusEffects.length > 0 ? `<div class="hud-badge status">${state.statusEffects.join(', ')}</div>` : ''}
      </div>
      <div class="hp-bar"><div class="hp-fill" style="width:${hpPct}%"></div><span>${res.hp} / ${res.maxHp} HP</span></div>
      <div class="decks">
        <button class="linklike" data-action="open-pile" data-pile="adventure_deck" title="View Adventure Deck &amp; Discard">Adventure ${state.adventureDeck.length} / ${state.adventureDiscard.length} discard</button>
        <button class="linklike" data-action="open-pile" data-pile="monster_deck" title="View Monster Deck &amp; Discard">Monsters ${state.monsterDeck.length} / ${state.monsterDiscard.length} discard</button>
        <button class="linklike" data-action="open-pile" data-pile="treasure_deck" title="View Treasure Deck &amp; Discard">Treasure ${state.treasureDeck.length} / ${state.treasureDiscard.length} discard</button>
        <button class="linklike" data-action="open-pile" data-pile="player_deck" title="View Player Combat Deck">Combat deck (${state.playerMasterDeck.length})</button>
      </div>
    </header>

    <div class="play-layout">
      <aside class="play-sidebar">
        <details class="sheet" open>
          <summary>Character &amp; Gear</summary>
          ${statPanelHtml(state)}
          ${gearHtml(state)}
        </details>
      </aside>

      <div class="play-main">
        <section class="board" aria-label="Adventure board">
          <div class="board-world">${nodes.map((n) => adventureCardHtml(n, state)).join('')}</div>
        </section>

        <div class="banner">${state.bannerMessage}</div>
      </div>

      <aside class="play-sidebar-right">
        ${rightSidebarHtml(state)}
      </aside>
    </div>
    <footer class="foot">seed: ${state.seed}</footer>
    ${state.welcomePreparing ? welcomePrepareModal(state) : ''}
    ${ui.inspectedPile ? pileModal(ui.inspectedPile, state) : ''}
    ${ui.showDeck ? pileModal('player_deck', state) : ''}
    ${renderHook(state, ui)}
    ${ui.inspectedCard ? cardInspectModal(ui.inspectedCard, state) : ''}
    ${ui.inspectedStat ? statInspectModal(ui.inspectedStat, state) : ''}
    ${ui.showGuide ? renderGuideModal(true) : ''}
  </main>`;
}

function currentCardEffect(card: CombatCardDef, stats: CharacterStats, state?: RunState) {
  return computeCardEffect(card, stats,
    state ? computeCombatGearBonuses(state.equippedGear) : undefined,
    state ? getFighterBerzerkBonus(state.playerClass, state.playerResources?.hp, state.playerResources?.maxHp) : 0);
}

function cardText(card: CombatCardDef, stats: CharacterStats, state?: RunState): string {
  if (card.id === 'action_flee') {
    return `Roll 1d6 &le; <b>${getFleeThreshold(stats)}</b> to escape<br/>No rewards`;
  }
  const e = currentCardEffect(card, stats, state);
  const parts: string[] = [];
  if (e.damage > 0) parts.push(`Deal <b>${e.damage}</b> DMG${card.targetMode === 'all_enemies' ? ' to all enemies' : ''}`);
  if (card.accBonus) parts.push(`${card.accBonus > 0 ? '+' : ''}<b>${card.accBonus}</b> ACC on rolls`);
  if (e.block > 0) parts.push(`Gain <b>${e.block}</b> Block`);
  if (e.evasionBonus > 0) parts.push(`+<b>${e.evasionBonus}</b> EVA this round`);
  if (card.discardMode === 'exact') parts.push(`Discard <b>${card.discardCount ?? 0}</b>, draw <b>${card.drawCards ?? 0}</b>`);
  if (card.discardMode === 'any') parts.push(`Discard <b>X</b>${card.damagePerDiscard ? `: +${card.damagePerDiscard} DMG each` : ': +1 AP each'}`);
  if (card.gainAp && card.id !== 'adrenalin') parts.push(`Regain <b>${card.gainAp}</b> AP`);
  if (card.staysInPlay) parts.push(`<b>Stays in play</b>`);
  return parts.join('<br/>');
}

function combatCardHtml(
  card: CombatCardDef,
  stats: CharacterStats,
  playable: boolean,
  action = 'play-card',
  isMini = false,
  state?: RunState,
  viewOnly = false
): string {
  const illustration = getActionCardIllustration(card.id, card.cardType);
  const isAtk = card.cardType === 'attack';
  const cardKind = card.cardType === 'enchantment'
    ? 'Enchantment 🚩'
    : card.cardType === 'skill'
    ? 'Skill ✨'
    : isAtk
    ? `Attack ${getDerivedStatIcon('atk', 'header-icon')}`
    : `Defense ${getDerivedStatIcon('def', 'header-icon')}`;
  const templateClass = isAtk ? 'is-attack tcg-template-attack' : 'is-defense tcg-template-defense';
  const tag = viewOnly ? 'div' : 'button';
  const actionAttributes = viewOnly ? '' : `data-action="${action}" data-id="${card.instanceId}"`;
  const disabledAttribute = !viewOnly && !playable ? 'disabled' : '';
  return `
  <${tag} class="tcg-card tcg-action ${templateClass} ${card.classId} ${isMini ? 'is-mini' : ''}"
    ${actionAttributes}
    data-inspect-kind="action" data-card-id="${card.id}" data-card-instance="${card.instanceId}"
    ${disabledAttribute}>
    <div class="tcg-inner-frame">
      <div class="tcg-art-window action-window">
        ${illustration}
      </div>
      <header class="tcg-header">
        <div class="tcg-header-meta">
          <div class="tcg-type-stacked">
            <span class="tcg-type-main">ACTION</span>
            <span class="tcg-type-sub">${card.id === 'action_flee' ? 'Escape 🏃' : cardKind}</span>
          </div>
          ${card.isSkillUpgrade ? '<span class="skill-upgrade-tag">VOID UPGRADE</span>' : ''}
          <span class="tcg-ap-bubble">${card.apCost} AP</span>
        </div>
        <div class="tcg-header-title">
          <span class="tcg-name action-name">${card.name}</span>
        </div>
      </header>
      <div class="tcg-art-spacer"></div>
      <div class="tcg-textbox action-text">
        <div class="tcg-action-effect">${cardText(card, stats, state)}</div>
      </div>
      ${
        !isMini
          ? `<footer class="tcg-footer">
        <span class="tcg-card-num">${card.cardNumber ?? (isAtk ? 'ATK' : 'DEF')}</span>
        <span class="tcg-class-tag">${card.classId.toUpperCase()}</span>
      </footer>`
          : ''
      }
    </div>
  </${tag}>`;
}

export function deckModal(deck: CombatCardDef[], state: RunState): string {
  const stats = getEffectiveStatsFromState(state);
  return `
  <div class="modal-backdrop">
    <div class="modal">
      <h2>Your combat deck (${deck.length})</h2>
      <div class="hand wrap">${deck.map((c) => combatCardHtml(c, stats, false, 'play-card', false, state, true)).join('')}</div>
      <button class="btn" data-action="toggle-deck">Close</button>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Hooks (combat / village / shrine / end states)
// ---------------------------------------------------------------------------

function renderHook(state: RunState, ui: UiState): string {
  const hook = state.activeHook;
  switch (hook.type) {
    case 'COMBAT':
      return combatModal(state, hook.combat, ui);
    case 'VILLAGE':
      return villageModal(state, hook.village, ui);
    case 'SHRINE':
      return shrineModal(state);
    case 'EXPLORATION':
      return explorationModal(hook.exploration, state);
    case 'VICTORY':
      return victoryModal(hook.victory, state);
    case 'ON_GAME_OVER':
      return `
      <div class="modal-backdrop"><div class="modal center">
        <h2>Defeated</h2>
        <p>You fell to the ${hook.defeatedBy} on turn ${hook.turn}.</p>
        <button class="btn primary big" data-action="restart">Return to title</button>
      </div></div>`;
    case 'ON_STAGE_COMPLETE': {
      const isStage1 = hook.canContinue || hook.stageNumber === 1;
      return `
      <div class="modal-backdrop"><div class="modal center stage-complete-modal">
        <h2>${isStage1 ? 'Stage 1 Complete: The Goblin King Defeated!' : 'Stage 2 Complete: Cult of Trolls Cleansed!'}</h2>
        <p>You defeated ${hook.bossDefeated} on turn ${hook.turn}.</p>
        ${
          isStage1
            ? `<div class="modal-actions horizontal stage-complete-actions">
                <button class="btn primary big" data-action="next-mission">Continue to Cult of Trolls</button>
                <button class="btn big" data-action="restart">Abandon Quest</button>
              </div>`
            : `<button class="btn primary big" data-action="restart">Play Again</button>`
        }
      </div></div>`;
    }
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------

export function getMonsterCarouselClass(i: number, target: number, total: number): string {
  if (total <= 1) {
    return 'is-center';
  }
  if (total === 2) {
    if (i === target) return 'is-center';
    return target === 0 ? 'is-next' : 'is-prev';
  }
  if (i === target) {
    return 'is-center';
  }
  const prevIdx = (target - 1 + total) % total;
  const nextIdx = (target + 1) % total;
  if (i === prevIdx) {
    return 'is-prev';
  }
  if (i === nextIdx) {
    return 'is-next';
  }
  return 'is-hidden';
}

export function updateMonsterCarouselDom(
  container: HTMLElement,
  combat: ActiveCombatState,
  targetIndex: number,
  playerAcc: number,
  playerCritThreshold = 12,
): boolean {
  const track = container.querySelector<HTMLElement>('.monster-carousel-track');
  if (!track) return false;

  const total = combat.monsters.length;
  const target =
    combat.monsters[targetIndex] && combat.monsters[targetIndex].hp > 0
      ? targetIndex
      : firstLivingMonsterIndex(combat);

  combat.monsters.forEach((cm, i) => {
    const unit = track.querySelector<HTMLElement>(`.combat-monster-unit[data-id="${i}"]`);
    if (!unit) return;

    unit.classList.remove('is-center', 'is-prev', 'is-next', 'is-hidden', 'is-selected-unit', 'selected');
    const card = unit.querySelector<HTMLElement>('.tcg-creature');
    if (card) {
      card.classList.remove('is-targeted');
    }

    const posClass = getMonsterCarouselClass(i, target, total);
    posClass.split(' ').forEach((c) => {
      if (c) unit.classList.add(c);
    });

    const isSelected = i === target && cm.hp > 0;
    if (isSelected) {
      unit.classList.add('is-selected-unit', 'selected');
      if (card) card.classList.add('is-targeted');
    }

    const header = unit.querySelector<HTMLElement>('.combat-target-header');
    if (header) {
      const neededRoll = playerAcc !== undefined ? Math.max(2, Math.min(12, BASE_HIT_THRESHOLD - (playerAcc - ((cm.monster.eva ?? 0) + (cm.evaBonus ?? 0))))) : null;
      const targetText = neededRoll !== null
        ? `🎯 TARGET (Roll ${neededRoll}+ · ${computeHitProbability(neededRoll, playerCritThreshold).hitPercent}%)`
        : '🎯 TARGET';
      const badgeHtml = isSelected
        ? `<div class="combat-target-badge-top">${targetText}</div>`
        : '<div class="combat-target-spacer"></div>';
      const infoBtn = header.querySelector<HTMLElement>('.combat-monster-info-btn');
      header.innerHTML = `${badgeHtml}${infoBtn ? infoBtn.outerHTML : ''}`;
    }
  });

  return true;
}

function creatureHeaderHtml(monster: MonsterCard): string {
  return `<header class="tcg-header creature-header">
    <div class="creature-header-top">
      <span class="tcg-level-ribbon">Lvl ${monster.level}</span>
      <span class="tcg-type-main">${monster.isBoss ? 'BOSS CREATURE' : 'CREATURE'}</span>
      <span class="tcg-type-sub">${formatCreatureSubtype(monster.creatureType)}</span>
      <div class="tcg-spawn-group" aria-label="Spawn terrains: ${(monster.spawnTerrains ?? []).join(', ')}">${renderSpawnBadges(monster.spawnTerrains)}</div>
    </div>
    <div class="creature-header-title"><span class="tcg-name">${monster.name}</span><span class="tcg-card-num">${monster.cardNumber ?? ''}</span></div>
  </header>`;
}

function creatureFooterHtml(monster: MonsterCard, accBonus = 0, evaBonus = 0): string {
  const entries = [
    { stat: 'def' as const, value: monster.def ?? 0, boosted: false },
    { stat: 'mdef' as const, value: monster.mdef ?? 0, boosted: false },
    { stat: 'acc' as const, value: (monster.acc ?? 1) + accBonus, boosted: accBonus > 0 },
    { stat: 'eva' as const, value: (monster.eva ?? 0) + evaBonus, boosted: evaBonus > 0 },
  ];
  return `<footer class="tcg-footer creature-stat-footer">
    <span class="creature-footer-hp">HP <b>${monster.maxHp}</b></span>
    <div class="creature-footer-stats">${entries.filter(entry => entry.value > 0).map(entry => `<span class="creature-footer-stat ${entry.boosted ? 'is-buffed-flashing' : ''}" data-creature-stat="${entry.stat}" aria-label="${entry.stat.toUpperCase()}: ${entry.value}">${getDerivedStatIcon(entry.stat, 'chip-icon')} <b>${entry.value}</b></span>`).join('')}</div>
  </footer>`;
}

interface FullCreatureCardOptions {
  monster: MonsterCard;
  attackBonus?: number;
  accBonus?: number;
  evaBonus?: number;
  className?: string;
  artWindowClassName?: string;
  artOverlayHtml?: string;
  attributes?: string;
}

/**
 * The canonical full-size creature card face. Battle and card inspection use
 * this same markup; callers supply only live combat presentation differences.
 */
function fullCreatureCardHtml({
  monster,
  attackBonus = 0,
  accBonus = 0,
  evaBonus = 0,
  className = '',
  artWindowClassName = '',
  artOverlayHtml = '',
  attributes = '',
}: FullCreatureCardOptions): string {
  const templateClass = monster.isBoss ? 'is-boss tcg-template-boss' : 'tcg-template-grassland';
  const illustration = getMonsterIllustration(monster.templateId);
  const pattern = monster.pattern?.length ? monster.pattern : [{ label: 'Idle', damage: 0, block: 0 }];

  return `
    <div class="tcg-card tcg-creature ${templateClass} ${className}" ${attributes}>
      <div class="tcg-inner-frame">
        <div class="tcg-art-window ${artWindowClassName}">
          ${illustration}
          ${artOverlayHtml}
        </div>
        ${creatureHeaderHtml(monster)}
        <div class="tcg-art-spacer">
          <div class="tcg-art-rewards">
            <div class="tcg-art-reward-badge gold" title="Reward: +${monster.goldReward} Gold">
              ${getResourceIcon('gold', 'chip-icon')} <span>+${monster.goldReward}</span>
            </div>
            <div class="tcg-art-reward-badge sp" title="Reward: +${monster.statPointReward} SP">
              ${getResourceIcon('sp', 'chip-icon')} <span>+${monster.statPointReward}</span>
            </div>
          </div>
        </div>
        <div class="tcg-textbox tcg-creature-textbox">
          ${monster.abilities?.length ? `<div class="tcg-ability-line">${monster.abilities.join(' &middot; ')}</div>` : ''}
          ${
            attackBonus > 0
              ? `<div class="tcg-active-boon-badge is-buffed-flashing" title="Charge Momentum active">🔥 Boon: +${attackBonus} ATK</div>`
              : ''
          }
          <div class="tcg-pattern-table">
            ${pattern.map((p, index) => {
              const effectiveDamage = p.damage > 0 ? p.damage + attackBonus : 0;
              const isBuffed = p.damage > 0 && attackBonus > 0;
              const hasPriorEffect = effectiveDamage > 0 || (p.heal ?? 0) > 0 || p.block > 0 || (p.evaBonus ?? 0) > 0 || (p.accBonus ?? 0) > 0;
              return `
                <div class="tcg-pattern-row ${isBuffed ? 'is-buffed-row' : ''}">
                  <span class="p-turn">Turn ${index + 1}</span>
                  <span class="p-label">${p.label}</span>
                  ${p.poisonOnHit ? '<span>Poison on hit</span>' : ''}
                  ${p.ignoreDef ? `<span>Ignore ${p.ignoreDef} DEF</span>` : ''}
                  <span class="p-val">${
                    effectiveDamage > 0
                      ? `<span class="${isBuffed ? 'is-buffed-flashing' : ''}" title="${isBuffed ? `Base ${p.damage} + ${attackBonus} Boon` : ''}"><b>${effectiveDamage}</b> ${p.damageType === 'magical' ? 'MATK' : 'DMG'}</span>`
                      : ''
                  }${
                    p.heal && p.heal > 0
                      ? (effectiveDamage > 0 ? ' &middot; ' : '') + `+<b>${p.heal}</b> HP`
                      : ''
                  }${
                    p.block > 0
                      ? (effectiveDamage > 0 || (p.heal && p.heal > 0) ? ' &middot; ' : '') + `+<b>${p.block}</b> Blk`
                      : ''
                  }${
                    p.evaBonus && p.evaBonus > 0
                      ? (effectiveDamage > 0 || (p.heal && p.heal > 0) || p.block > 0 ? ' &middot; ' : '') + `+<b>${p.evaBonus}</b> EVA`
                      : ''
                  }${
                    p.accBonus && p.accBonus > 0
                      ? (effectiveDamage > 0 || (p.heal && p.heal > 0) || p.block > 0 || (p.evaBonus && p.evaBonus > 0) ? ' &middot; ' : '') + `+<b>${p.accBonus}</b> ACC`
                      : ''
                  }${
                    p.heroStatDebuff ? heroHexIntentHtml(p) : p.heroEvaDebuff && p.heroEvaDebuff > 0
                      ? (hasPriorEffect ? ' &middot; ' : '') + `-<b>${p.heroEvaDebuff}</b> Hero EVA (${p.heroEvaDebuffDuration ?? 2}t)`
                      : ''
                  }${
                    !p.heroStatDebuff && !p.poisonOnHit && !hasPriorEffect && (!p.heroEvaDebuff || p.heroEvaDebuff === 0) ? 'Idle' : ''
                  }</span>
                </div>`;
            }).join('')}
          </div>
        </div>
        ${creatureFooterHtml(monster, accBonus, evaBonus)}
      </div>
    </div>`;
}

function monsterCardHtml(
  cm: CombatMonster,
  index: number,
  selected: boolean,
  canTarget: boolean,
  playerAcc?: number,
  playerCritThreshold = 12,
  carouselClass: string = ''
): string {
  const m = cm.monster;
  const dead = cm.hp <= 0;
  const currentHp = dead ? 0 : cm.hp;
  const hpPct = Math.max(0, Math.min(100, Math.round((currentHp / m.maxHp) * 100)));
  const intent = getMonsterIntent(cm);
  const actionAttr = canTarget && !dead ? `data-action="target"` : '';

  const neededRoll = playerAcc !== undefined ? Math.max(2, Math.min(12, BASE_HIT_THRESHOLD - (playerAcc - ((m.eva ?? 0) + (cm.evaBonus ?? 0))))) : null;
  const targetText = neededRoll !== null
    ? `🎯 TARGET (Roll ${neededRoll}+ · ${computeHitProbability(neededRoll, playerCritThreshold).hitPercent}%)`
    : '🎯 TARGET';

  return `
  <div class="combat-monster-unit ${carouselClass} ${selected && !dead ? 'is-selected-unit selected' : ''} ${dead ? 'is-dead-unit' : ''}" data-id="${index}" ${actionAttr}>
    <div class="combat-target-header">
      ${selected && !dead ? `<div class="combat-target-badge-top">${targetText}</div>` : '<div class="combat-target-spacer"></div>'}
      <button type="button" class="combat-monster-info-btn" data-action="inspect-monster" data-inspect-kind="monster" data-monster-id="${m.templateId}" data-monster-index="${index}" title="Inspect ${m.name} boons & stats">&#9432;</button>
    </div>
    ${fullCreatureCardHtml({
      monster: m,
      attackBonus: cm.attackBonus ?? 0,
      accBonus: cm.accBonus ?? 0,
      evaBonus: cm.evaBonus ?? 0,
      className: `${dead ? 'is-dead' : ''} ${selected && !dead ? 'is-targeted' : ''}`,
      artOverlayHtml: `${cm.block > 0 && !dead ? `<div class="tcg-shield-overlay">&#128737; ${cm.block} Block</div>` : ''}${dead ? '<div class="tcg-dead-banner">DEFEATED</div>' : ''}`,
      attributes: `aria-label="${m.name} Card" data-inspect-kind="monster" data-monster-id="${m.templateId}" data-monster-index="${index}"`,
    })}

    <!-- Interactive Combat Status Dock Below Card: NEXT Intent & Live HP Bar -->
    <div class="creature-combat-dock ${dead ? 'is-dead' : ''}">
      <div class="combat-dock-row dock-intent-row">
        <span class="dock-label">NEXT:</span>
        <div class="dock-intent-val">
          ${
            dead
              ? '<span class="intent-dead">Defeated</span>'
              : `<span class="intent-icon">&#9876;</span>
                 <span class="intent-label">${intent.label}</span>
                 ${intent.poisonOnHit ? '<span>Poison on hit</span>' : ''}
                 ${intent.ignoreDef ? `<span>Ignore ${intent.ignoreDef} DEF</span>` : ''}
                 <span class="intent-val">${
                   intent.damage > 0
                     ? `<span class="${(cm.attackBonus ?? 0) > 0 ? 'is-buffed-flashing' : ''}"><b>${intent.damage}</b> ${intent.damageType === 'magical' ? 'MATK' : 'DMG'}</span>`
                     : ''
                 }${
                   intent.heal && intent.heal > 0
                     ? (intent.damage > 0 ? ' &middot; ' : '') + `+<b>${intent.heal}</b> HP`
                     : ''
                 }${
                   intent.block > 0
                     ? (intent.damage > 0 || (intent.heal && intent.heal > 0) ? ' &middot; ' : '') + `+<b>${intent.block}</b> Blk`
                     : ''
                 }${
                   intent.evaBonus && intent.evaBonus > 0
                     ? (intent.damage > 0 || (intent.heal && intent.heal > 0) || intent.block > 0 ? ' &middot; ' : '') + `+<b>${intent.evaBonus}</b> EVA`
                     : ''
                 }${
                   intent.accBonus && intent.accBonus > 0
                     ? (intent.damage > 0 || (intent.heal && intent.heal > 0) || intent.block > 0 || (intent.evaBonus && intent.evaBonus > 0) ? ' &middot; ' : '') + `+<b>${intent.accBonus}</b> ACC`
                     : ''
                 }${
                   intent.heroStatDebuff ? heroHexIntentHtml(intent) : intent.heroEvaDebuff && intent.heroEvaDebuff > 0
                     ? (intent.damage > 0 || (intent.heal && intent.heal > 0) || intent.block > 0 || (intent.evaBonus && intent.evaBonus > 0) || (intent.accBonus && intent.accBonus > 0) ? ' &middot; ' : '') + `-<b>${intent.heroEvaDebuff}</b> Hero EVA (${intent.heroEvaDebuffDuration ?? 2}t)`
                     : ''
                 }${
                   !intent.heroStatDebuff && !intent.poisonOnHit && intent.damage === 0 && intent.block === 0 && (!intent.heal || intent.heal === 0) && (!intent.evaBonus || intent.evaBonus === 0) && (!intent.accBonus || intent.accBonus === 0) && (!intent.heroEvaDebuff || intent.heroEvaDebuff === 0) ? 'Idle' : ''
                 }</span>`
          }
        </div>
      </div>
      <div class="combat-dock-row dock-hp-row">
        <span class="dock-label">HP:</span>
        <div class="hp-bar creature-hp-bar dock-hp-bar" title="Health: ${currentHp} / ${m.maxHp} HP${cm.block > 0 && !dead ? ` (+${cm.block} Block)` : ''}">
          <div class="hp-fill" style="width: ${hpPct}%"></div>
          <span class="hp-text">${currentHp} / ${m.maxHp} HP${cm.block > 0 && !dead ? ` (+${cm.block} &#128737;)` : ''}</span>
        </div>
      </div>
    </div>
  </div>`;
}

export interface ParsedCombatLogEntry {
  timestamp: string;
  actorType: 'hero' | 'enemy' | 'system';
  actorLabel: string;
  text: string;
}

export function parseCombatLogEntry(entry: string): ParsedCombatLogEntry {
  let timestamp = '';
  let text = entry.trim();

  // Extract [HH:MM:SS] if present at the start
  const timeMatch = text.match(/^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*(.*)$/s);
  if (timeMatch) {
    timestamp = timeMatch[1];
    text = timeMatch[2].trim();
  }

  // Determine actor type and display label
  let actorType: 'hero' | 'enemy' | 'system' = 'enemy';
  let actorLabel = 'Enemy';

  if (
    text.includes('Played ') ||
    text.includes('[Steal]') ||
    text.includes('[Conserve]') ||
    text.includes('Used ') ||
    /^(?:⚔️|🛡️|💰|✨|🧪)?\s*(?:You|Hero)\b/i.test(text)
  ) {
    actorType = 'hero';
    actorLabel = 'You';
  } else if (/^(?:[🗺️🌲🌿✦⚔️]?\s*)?Encountered\b/i.test(text)) {
    actorType = 'system';
    actorLabel = 'Encounter';
  } else {
    actorType = 'enemy';
    const creatureMatch = text.match(
      /^[^\w\s]*\s*([A-Za-z0-9 '\-]+?)(?:\s+uses\b|\s+gathers\b|\s+did nothing|\s+drains life|'s\b)/i
    );
    if (creatureMatch && creatureMatch[1].trim()) {
      actorLabel = creatureMatch[1].trim();
    } else {
      actorLabel = 'Enemy';
    }
  }

  return {
    timestamp,
    actorType,
    actorLabel,
    text,
  };
}

export function renderCombatLogEntries(combatLog: string[]): string {
  if (!combatLog || combatLog.length === 0) {
    return `<li class="combat-sidebar-empty">No combat actions yet.</li>`;
  }
  return combatLog
    .slice()
    .reverse()
    .map((entry) => {
      const parsed = parseCombatLogEntry(entry);
      return `
      <li class="combat-sidebar-log-item actor-${parsed.actorType}">
        <div class="combat-log-meta">
          <span class="combat-log-actor is-${parsed.actorType}">${parsed.actorLabel}</span>
          ${parsed.timestamp ? `<span class="combat-log-time">[${parsed.timestamp}]</span>` : ''}
        </div>
        <div class="combat-log-text">${parsed.text}</div>
      </li>`;
    })
    .join('');
}

function heroHexIntentHtml(intent: MonsterIntent): string {
  if (!intent.heroStatDebuff) return '';
  const stats = Object.entries(intent.heroStatDebuff.stats).map(([stat, value]) => `-${value} ${stat.toUpperCase()}`).join(' / ');
  return `Hero ${stats} (${intent.heroStatDebuff.duration}t)`;
}

function combatHeroSidebarHtml(state: RunState, combat: ActiveCombatState, stats: CharacterStats): string {
  const res = state.playerResources!;
  const hpPct = Math.max(0, Math.min(100, Math.round((res.hp / res.maxHp) * 100)));
  const eff = stats;
  const gearCombat = computeCombatGearBonuses(state.equippedGear);
  const heroDef = Math.max(0, getPlayerDef(stats, gearCombat.def) + getHeroStatDebuffMods(combat).def);
  const heroAtk = getPlayerAtk(stats, gearCombat.atk);
  const playerAccMod = (combat.playerAccMod ?? 0) + getHeroStatDebuffMods(combat).acc;
  const playerAcc = getPlayerAcc(stats, gearCombat.acc) + playerAccMod;
  const playerEva = getPlayerEva(stats, combat.playerEvasionMod + getHeroStatDebuffMods(combat).eva, gearCombat.eva);
  const className = getPlayerClassName(state.playerClass);
  const heroArt = getAdventurerRasterArtPath(state.playerClass);
  const classDef = state.playerClass ? CLASS_CATALOG[state.playerClass] : null;

  return `
  <aside class="combat-hero-sidebar" aria-label="Hero Vitals & Inventory">
    ${state.statusEffects.includes('poison') ? '<div class="hud-badge status">Poison: 1 HP damage at End Turn until cleansed</div>' : ''}
    ${(combat.heroStatDebuffs ?? []).map(effect => `<div class="hud-badge status">${effect.label}: ${Object.entries(effect.stats).map(([stat, value]) => `-${value} ${stat.toUpperCase()}`).join(', ')} · ${effect.turnsRemaining} turn(s)</div>`).join('')}
    <!-- 1. Hero Header & HP / Max HP Bar -->
    <div class="combat-hero-vitals-card">
      <div class="hero-vitals-header">
        <div class="hero-vitals-title">
          <span class="hero-class-tag">${className}</span>
          <span class="hero-role-sub">${classDef ? classDef.title : ''}</span>
        </div>
        ${state.divineProtection > 0 ? `<span class="hud-badge prot" title="Divine Protection: -${state.divineProtection} incoming DMG">✦ -${state.divineProtection} DMG</span>` : ''}
      </div>
      
      <div class="combat-hp-progress-box">
        <div class="combat-hp-labels">
          <span class="hp-label">Hero HP:</span>
          <span class="hp-numbers"><b>${res.hp}</b> / ${res.maxHp} HP</span>
        </div>
        <div class="hp-bar combat-hero-hp-bar" title="Hero Health: ${res.hp} / ${res.maxHp} HP${combat.playerBlock > 0 ? ` (+${combat.playerBlock} Block)` : ''}">
          <div class="hp-fill" style="width: ${hpPct}%"></div>
          <span class="hp-text">${res.hp} / ${res.maxHp} HP${combat.playerBlock > 0 ? ` (+${combat.playerBlock} &#128737;)` : ''}</span>
        </div>
      </div>
      ${
        (combat.playerAccMod ?? 0) < 0 || (combat.playerVulnerableMod ?? 0) > 0 || (combat.playerEvasionMod ?? 0) < 0
          ? `<div class="combat-debuff-tray" style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px;">
              ${(combat.playerAccMod ?? 0) < 0 ? `<span class="combat-debuff-chip" style="background: rgba(239, 68, 68, 0.25); border: 1px solid #ef4444; color: #fca5a5; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px;" title="Hex of Enfeeblement: -1 ACC on attack rolls">🔮 -1 ACC</span>` : ''}
              ${(combat.playerVulnerableMod ?? 0) > 0 ? `<span class="combat-debuff-chip" style="background: rgba(239, 68, 68, 0.25); border: 1px solid #ef4444; color: #fca5a5; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px;" title="Hex of Vulnerability: +1 damage taken from attacks">🔮 +1 DMG Taken</span>` : ''}
              ${(combat.playerEvasionMod ?? 0) < 0 ? `<span class="combat-debuff-chip" style="background: rgba(239, 68, 68, 0.25); border: 1px solid #ef4444; color: #fca5a5; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px;" title="Hex of Clumsiness: -1 EVA">🔮 -1 EVA</span>` : ''}
            </div>`
          : ''
      }
    </div>

    <!-- 2. Hero Portrait & Core 6 Attributes (Inspectable) -->
    <div class="combat-hero-stats-card">
      <div class="hero-sidebar-portrait-row">
        <div class="hero-sidebar-portrait-frame" title="${className} (Hero)" data-inspect-kind="hero">
          <img src="${heroArt}" alt="${className} Hero" class="hero-sidebar-portrait-img" loading="lazy" />
        </div>
        <div class="hero-sidebar-stats-col">
          ${STATS.map((s) => `
            <div class="stat-row inspectable-stat"
              data-action="inspect-stat" data-stat="${s}" data-inspect-stat="${s}"
              title="Click or right-click to view ${s.toUpperCase()} computation & scaling">
              <span class="stat-name">${getStatIcon(s, 'stat-icon')} ${s.toUpperCase()}</span>
              <span class="stat-val">${eff[s]}</span>
              <span class="stat-info-pill" title="View stat breakdown">&#9432;</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 3. Derived Combat Stats Grid (Prominent DEF & ATK) -->
      <div class="derived-combat-stats-grid">
        <div class="derived-chip" title="Physical DEF (Hero Natural DEF absorbs incoming physical damage): ${heroDef}">
          ${getDerivedStatIcon('def', 'chip-icon')}
          <span class="d-label">DEF</span>
          <b class="d-val">${heroDef}</b>
        </div>
        <div class="derived-chip" title="Physical ATK (Attack damage bonus): ${heroAtk}">
          ${getDerivedStatIcon('atk', 'chip-icon')}
          <span class="d-label">ATK</span>
          <b class="d-val">${heroAtk}</b>
        </div>
        <div class="derived-chip" title="Accuracy (Bonus to hit rolls): ${playerAcc}">
          ${getDerivedStatIcon('acc', 'chip-icon')}
          <span class="d-label">ACC</span>
          <b class="d-val">${playerAcc}</b>
        </div>
        <div class="derived-chip" title="Evasion (Lowers enemy hit chance): ${playerEva}">
          ${getDerivedStatIcon('eva', 'chip-icon')}
          <span class="d-label">EVA</span>
          <b class="d-val">${playerEva}</b>
        </div>
        ${gearCombat.pen > 0 ? `<div class="derived-chip pen" title="Physical Penetration: physical attacks ignore ${gearCombat.pen} enemy natural DEF">
          <span class="chip-icon pen-symbol">PEN</span>
          <span class="d-label">PEN</span>
          <b class="d-val">${gearCombat.pen}</b>
        </div>` : ''}
        <div class="derived-chip" title="Active Block (Absorbs damage this round): ${combat.playerBlock}">
          <span class="chip-icon">&#128737;</span>
          <span class="d-label">BLK</span>
          <b class="d-val">${combat.playerBlock}</b>
        </div>
        <div class="derived-chip ap-chip" title="Action Points: ${combat.playerAp}/${combat.playerMaxAp}">
          <span class="chip-icon">&#9889;</span>
          <span class="d-label">AP</span>
          <b class="d-val">${combat.playerAp}/${combat.playerMaxAp}</b>
        </div>
      </div>
    </div>

    <!-- 4. Combat Backpack Section (Use Consumables in Battle!) -->
    <div class="combat-backpack-card">
      <div class="combat-backpack-header">
        <span class="slot-label">&#127890; Backpack (${state.backpack.length})</span>
        <span class="backpack-tip muted">Usable in battle</span>
      </div>
      <div class="combat-backpack-list">
        ${
          state.backpack.length
            ? state.backpack.map((i) => {
                const raster = getItemRasterArtPath(i.id);
                const isConsumable = i.category === 'consumable';
                return `
                <div class="combat-bag-item inspectable-row" data-inspect-kind="item" data-item-id="${i.id}" data-item-instance="${i.instanceId}" title="Right-click to inspect ${i.name}">
                  <div class="bag-item-left">
                    <img src="${raster}" alt="${i.name}" class="inv-slot-mini-img" loading="lazy" />
                    <div class="bag-item-text">
                      <span class="bag-item-name">${i.name}</span>
                      <span class="bag-item-desc">${isConsumable ? `Restores ${i.healAmount ?? 10} HP` : i.description || i.category}</span>
                    </div>
                  </div>
                  <div class="bag-item-actions">
                    ${
                      isConsumable
                        ? `<button class="btn mini primary use-consumable-btn" data-action="use-item" data-id="${i.instanceId}" title="Use ${i.name} now">Use</button>`
                        : `<span class="gear-locked-badge" title="Gear cannot be changed during combat">Equipped</span>`
                    }
                  </div>
                </div>`;
              }).join('')
            : '<div class="empty-backpack-note muted">Backpack is empty</div>'
        }
      </div>
    </div>
  </aside>`;
}

export function getHandCarouselIndex(index: number, count: number): number {
  return count > 0 ? Math.max(0, Math.min(count - 1, index)) : 0;
}

export function updateHandCarouselDom(container: HTMLElement, index: number): boolean {
  const track = container.querySelector<HTMLElement>('.hand-carousel-track');
  if (!track) return false;
  const units = track.querySelectorAll<HTMLElement>('.hand-carousel-unit');
  const selected = getHandCarouselIndex(index, units.length);
  units.forEach((unit, i) => {
    const position = getMonsterCarouselClass(i, selected, units.length);
    unit.classList.remove('is-center', 'is-prev', 'is-next', 'is-hidden');
    unit.classList.add(position);
    unit.inert = position === 'is-hidden';
    unit.setAttribute('aria-hidden', String(position === 'is-hidden'));
    const actionCard = unit.querySelector<HTMLButtonElement>('.tcg-card');
    if (actionCard) actionCard.tabIndex = i === selected ? 0 : -1;
    const preview = unit.querySelector<HTMLButtonElement>('.hand-preview-select');
    if (preview) preview.tabIndex = i === selected ? -1 : 0;
  });
  container.querySelectorAll<HTMLButtonElement>('[data-hand-dot]').forEach((dot, i) => {
    dot.setAttribute('aria-pressed', String(i === selected));
  });
  const counter = container.querySelector('[data-hand-position]');
  if (counter) counter.textContent = units.length ? `${selected + 1} / ${units.length}` : '0 / 0';
  return true;
}

function combatHandCarousel(state: RunState, combat: ActiveCombatState, ui: UiState, stats: CharacterStats): string {
  const selected = getHandCarouselIndex(ui.handIndex ?? 0, combat.hand.length);
  const count = combat.hand.length;
  return `<section class="battle-hand" aria-label="Combat hand">
    <div class="hand-carousel-heading"><b>Your hand</b><span data-hand-position aria-live="polite">${count ? selected + 1 : 0} / ${count}</span></div>
    <div class="hand-carousel" role="region" aria-roledescription="carousel" aria-label="Action cards">
      <div class="hand hand-carousel-track">
        ${count ? combat.hand.map((card, i) => {
          const position = getMonsterCarouselClass(i, selected, count);
          return `<div class="hand-carousel-unit ${position}" data-hand-index="${i}" role="group" aria-roledescription="slide" aria-label="${card.name}, ${i + 1} of ${count}" aria-hidden="${position === 'is-hidden'}" ${position === 'is-hidden' ? 'inert' : ''}>
            ${combatCardHtml(card, stats, combat.playerAp >= card.apCost, 'play-card', false, state).replace('<button ', `<button tabindex="${i === selected ? 0 : -1}" `)}
            <button type="button" class="hand-preview-select" data-action="select-hand-card" data-id="${i}" aria-label="Select ${card.name}, card ${i + 1}" ${i === selected ? 'tabindex="-1"' : ''}></button>
          </div>`;
        }).join('') : '<p class="empty-hand">No cards left. End your turn to draw a new hand.</p>'}
      </div>
      <button type="button" class="hand-carousel-nav prev" data-action="prev-hand-card" aria-label="Previous action card" ${count < 2 ? 'disabled' : ''}>‹</button>
      <button type="button" class="hand-carousel-nav next" data-action="next-hand-card" aria-label="Next action card" ${count < 2 ? 'disabled' : ''}>›</button>
    </div>
    <div class="hand-carousel-dots" aria-label="Choose a card">${combat.hand.map((card, i) => `<button type="button" data-hand-dot data-action="select-hand-card" data-id="${i}" aria-label="${card.name}, ${card.apCost} AP, card ${i + 1}" aria-pressed="${i === selected}">${i + 1}</button>`).join('')}</div>
    <p class="hand-carousel-hint">Click a side card, use Q / E, or swipe to browse. With one enemy, A / D and LEFT / RIGHT also browse your hand. Tap the center card to use it.</p>
  </section>`;
}

function combatModal(state: RunState, combat: ActiveCombatState, ui: UiState): string {
  const stats = getEffectiveStatsFromState(state);
  const playerAcc = getPlayerAcc(stats, computeCombatGearBonuses(state.equippedGear).acc) + (combat.playerAccMod ?? 0) + getHeroStatDebuffMods(combat).acc;
  const playerCritThreshold = getPlayerCritThreshold(stats);
  const res = state.playerResources!;
  const living = combat.monsters.filter((m) => m.hp > 0).length;
  const target =
    combat.monsters[ui.targetIndex] && combat.monsters[ui.targetIndex].hp > 0
      ? ui.targetIndex
      : firstLivingMonsterIndex(combat);
  ui.targetIndex = target;
  const totalMonsters = combat.monsters.length;
  return `
  <div class="modal-backdrop combat">
    <div class="modal combat-modal">
      ${combatHeroSidebarHtml(state, combat, stats)}
      <div class="combat-main-col">
        <div class="monster-carousel">
          <div class="monster-carousel-track">
            ${combat.monsters
              .map((cm, i) => {
                const posClass = getMonsterCarouselClass(i, target, totalMonsters);
                return monsterCardHtml(cm, i, i === target, living > 1, playerAcc, playerCritThreshold, posClass);
              })
              .join('')}
          </div>
          ${
            totalMonsters > 1
              ? `
          <button type="button" class="monster-carousel-nav prev" data-action="prev-target" title="Previous Target (Press A or Left Arrow)" aria-label="Previous Target" ${
                  living <= 1 ? 'disabled' : ''
                }>&#10094;</button>
          <button type="button" class="monster-carousel-nav next" data-action="next-target" title="Next Target (Press D or Right Arrow)" aria-label="Next Target" ${
                  living <= 1 ? 'disabled' : ''
                }>&#10095;</button>`
              : ''
          }
        </div>
        <p class="monster-carousel-instructions">
          ${
            living > 1
              ? 'Traverse targets with <b>A</b> or <b>D</b>. You can also use the <b>LEFT</b> and <b>RIGHT</b> keys. Tap a monster to target it with attacks.'
              : 'Tap a monster to target it with attacks.'
          }
        </p>
        <div class="player-line">
          <span>HP <b>${res.hp}</b>/${res.maxHp}</span>
          <span>${getDerivedStatIcon('def', 'chip-icon')} Block <b>${combat.playerBlock}</b></span>
          <span>${getDerivedStatIcon('acc', 'chip-icon')} ACC <b>${playerAcc}</b></span>
          <span>${getDerivedStatIcon('eva', 'chip-icon')} EVA <b>${getPlayerEva(stats, combat.playerEvasionMod + getHeroStatDebuffMods(combat).eva, computeCombatGearBonuses(state.equippedGear).eva)}</b></span>
          ${computeCombatGearBonuses(state.equippedGear).pen > 0 ? `<span class="pen-line" title="Physical attacks ignore enemy natural DEF">PEN <b>${computeCombatGearBonuses(state.equippedGear).pen}</b></span>` : ''}
          <span class="ap">AP <b>${combat.playerAp}</b>/${combat.playerMaxAp}</span>
        </div>
        ${
          combat.lastAttackRoll
            ? `
        <div class="combat-dice-banner ${combat.lastAttackRoll.isHit ? 'is-hit' : 'is-miss'} ${
                combat.lastAttackRoll.isCrit ? 'is-crit' : ''
              } ${combat.lastAttackRoll.isSnakeEyes ? 'is-snake-eyes' : ''}">
          <span class="dice-summary-label">🎲 <b>${combat.lastAttackRoll.attackerName}</b> &rarr; <b>${
                combat.lastAttackRoll.targetName
              }</b> (${combat.lastAttackRoll.actionName})</span>
          <div class="dice-roll-group">
            <span class="dice-die">🎲 ${combat.lastAttackRoll.die1}</span>
            <span class="dice-plus">+</span>
            <span class="dice-die">🎲 ${combat.lastAttackRoll.die2}</span>
            <span class="dice-eq">=</span>
            <span class="dice-total">${combat.lastAttackRoll.total}</span>
            <span class="dice-vs">(vs ${combat.lastAttackRoll.neededRoll}+ needed)</span>
          </div>
          <span class="dice-outcome-badge">
            ${
              combat.lastAttackRoll.isCrit
                ? '💥 BOXCARS CRITICAL (+50% DMG)!'
                : combat.lastAttackRoll.isSnakeEyes
                ? '🐍 SNAKE EYES (TOTAL MISS)!'
                : combat.lastAttackRoll.isHit
                ? `🎯 HIT! (${combat.lastAttackRoll.damageDealt} DMG${
                    (combat.lastAttackRoll.damagePenetrated ?? 0) > 0
                      ? `, ${combat.lastAttackRoll.damagePenetrated} DEF bypassed by PEN`
                      : ''
                  }${
                    (combat.lastAttackRoll.damageDefReduced ?? 0) > 0
                      ? `, ${combat.lastAttackRoll.damageDefReduced} absorbed by ${
                          combat.lastAttackRoll.attackerName === 'Hero' ? combat.lastAttackRoll.targetName : 'Hero'
                        } ${combat.lastAttackRoll.defenseType ?? 'DEF'}`
                      : ''
                  }${
                    combat.lastAttackRoll.damageBlocked > 0
                      ? `, ${combat.lastAttackRoll.damageBlocked} blocked`
                      : ''
                  })`
                : '💨 MISSED!'
            }
          </span>
        </div>`
            : ''
        }
        <div class="hand-row">
          ${combatHandCarousel(state, combat, ui, stats)}
          <div class="flee-card-slot" title="Permanent action: always available, never discarded or shuffled">
            ${combatCardHtml(
              createFleeCard(state.playerClass ?? 'fighter'),
              stats,
              combat.playerAp >= FLEE_AP_COST && !combat.monsters.some((m) => m.monster.isBoss),
              'flee-card'
            )}
            <span class="flee-slot-label">${
              combat.monsters.some((m) => m.monster.isBoss) ? 'Cannot flee a Boss' : 'Always available'
            }</span>
          </div>
        </div>
        ${(combat.inPlay?.length ?? 0) > 0 ? `
        <section class="combat-in-play" aria-label="Cards in play">
          <span class="combat-in-play-label">In play</span>
          ${combat.inPlay!.map((card) => `<span class="combat-in-play-card" title="${card.flavorText ?? card.name}">🚩 ${card.name}</span>`).join('')}
        </section>` : ''}
        <div class="combat-actions">
          <button class="btn primary" data-action="end-turn">End Turn</button>
        </div>
      </div>
      <aside class="combat-log-sidebar" aria-label="Battle Log">
        ${deckPilesPanelHtml(state, {
          visibleGroups: ['player'],
          heading: 'Action Deck',
          ariaLabel: 'Action draw and discard piles',
          className: 'combat-action-piles',
          showFooter: false,
          groupLabels: { player: 'Action Cards' },
        })}
        <div class="combat-log-header">
          <span class="combat-log-header-title">📜 Battle Log</span>
          <span class="combat-log-count">${combat.combatLog.length}</span>
        </div>
        <ul class="combat-sidebar-log log">
          ${renderCombatLogEntries(combat.combatLog)}
        </ul>
      </aside>
    </div>
    ${ui.pendingCardPlay ? combatConfirmModal(state, combat, ui.pendingCardPlay, stats) : ''}
    ${ui.pendingFlee ? fleeConfirmModal(state, combat, stats) : ''}
  </div>`;
}

export function fleeConfirmModal(state: RunState, _combat: ActiveCombatState, stats: CharacterStats): string {
  const threshold = getFleeThreshold(stats);
  const successFaces = Math.min(6, threshold);
  const pct = Math.round((successFaces / 6) * 1000) / 10;
  const fleeCard = createFleeCard(state.playerClass ?? 'fighter');
  return `
  <div class="modal-backdrop combat-confirm-backdrop" data-action="cancel-flee-backdrop">
    <div class="modal combat-confirm-modal flee-confirm-modal" role="dialog" aria-modal="true">
      <header class="confirm-modal-header">
        <h2 class="confirm-title">Attempt to <span>Flee</span> from battle?</h2>
        <button class="modal-close-btn" data-action="cancel-flee" aria-label="Cancel">&times;</button>
      </header>
      <div class="confirm-card-comparison">
        <div class="confirm-card-col source">
          <div class="col-header-badge source-badge">Permanent Action (${FLEE_AP_COST} AP)</div>
          <div class="confirm-card-frame">${combatCardHtml(fleeCard, stats, true, 'noop', false, state)}</div>
        </div>
      </div>
      <div class="confirm-calc-section">
        <div class="confirm-stat-chips-grid">
          <div class="confirm-chip">
            <span class="chip-label">AGI + LUK</span>
            <span class="chip-value"><b>${stats.agi} + ${stats.luk}</b></span>
            <span class="chip-sub">Effective stats</span>
          </div>
          <span class="chip-operator">&rarr;</span>
          <div class="confirm-chip target-roll">
            <span class="chip-label">Escape Target</span>
            <span class="chip-value">🎲 <b>&le; ${threshold}</b></span>
            <span class="chip-sub">&lfloor;(AGI + LUK) / 2&rfloor; on 1d6</span>
          </div>
        </div>
        <div class="confirm-prob-box">
          <div class="prob-summary-row">
            <span class="prob-icon-label">🏃 Escape Chance:</span>
            <span class="prob-percentage"><b>${pct}%</b> (${successFaces} of 6 faces)</span>
          </div>
          <div class="prob-notes-row">
            <span class="prob-note miss">⚠️ Escaping forfeits all rewards: no SP, Gold, or loot. On a failed roll, the ${FLEE_AP_COST} AP is spent and the battle continues.</span>
          </div>
        </div>
      </div>
      <footer class="confirm-modal-footer">
        <button class="btn primary big confirm-action-btn" data-action="confirm-flee">Attempt Flee (${FLEE_AP_COST} AP)</button>
        <button class="btn secondary cancel-action-btn" data-action="cancel-flee">Cancel</button>
      </footer>
    </div>
  </div>`;
}

function heroTargetCardHtml(state: RunState, combat: ActiveCombatState, stats: CharacterStats): string {
  const className = getPlayerClassName(state.playerClass);
  const res = state.playerResources!;
  const effEva = getPlayerEva(stats, combat.playerEvasionMod + getHeroStatDebuffMods(combat).eva, computeCombatGearBonuses(state.equippedGear).eva);
  const effAcc = getPlayerAcc(stats, computeCombatGearBonuses(state.equippedGear).acc) + (combat.playerAccMod ?? 0) + getHeroStatDebuffMods(combat).acc;
  const illustration = getAdventurerRasterArtPath(state.playerClass);

  return `
  <div class="tcg-card tcg-creature tcg-template-hero" aria-label="Hero Card">
    <div class="tcg-inner-frame">
      <div class="tcg-art-window">
        <img src="${illustration}" alt="${className} Hero" class="tcg-art-raster" />
        ${combat.playerBlock > 0 ? `<div class="tcg-shield-overlay">&#128737; ${combat.playerBlock} Block</div>` : ''}
      </div>

      <header class="tcg-header">
        <div class="tcg-header-meta">
          <div class="tcg-type-stacked">
            <span class="tcg-type-main">HERO</span>
            <span class="tcg-type-sub">Adventurer &middot; Turn ${state.turn}</span>
          </div>
          <span class="tcg-badge hero">YOU</span>
        </div>
        <div class="tcg-header-title">
          <span class="tcg-name">${className} (Hero)</span>
        </div>
      </header>

      <div class="tcg-art-spacer"></div>

      <div class="tcg-textbox hero-target-textbox">
        <div class="tcg-intent-box hero-target-intent">
          <span class="intent-icon">&#128737;</span>
          <span class="intent-label">Target</span>
          <span class="intent-val">Self</span>
        </div>
      </div>

      <footer class="tcg-footer">
        <div class="tcg-pt-badge">
          HP <b>${res.hp}</b> / <b>${res.maxHp}</b> &middot; ${getDerivedStatIcon('acc', 'chip-icon')} ${effAcc} ${getDerivedStatIcon('eva', 'chip-icon')} ${effEva}
        </div>
      </footer>
    </div>
  </div>`;
}

export function combatConfirmModal(
  state: RunState,
  combat: ActiveCombatState,
  pending: PendingCardPlay,
  stats: CharacterStats
): string {
  const card = combat.hand.find((c) => c.instanceId === pending.cardInstanceId);
  if (!card) return '';

  const selectedDiscardIds = pending.discardedCardInstanceIds ?? [];
  const effect = computeCardEffect(
    card,
    stats,
    computeCombatGearBonuses(state.equippedGear),
    getFighterBerzerkBonus(state.playerClass, state.playerResources?.hp, state.playerResources?.maxHp),
    selectedDiscardIds.length
  );
  const isAttack = card.cardType === 'attack' || effect.damage > 0;
  const discardCandidates = combat.hand.filter((candidate) => candidate.instanceId !== card.instanceId);
  const requiredDiscards = card.discardMode === 'exact' ? (card.discardCount ?? 0) : null;
  const canConfirmDiscard = requiredDiscards === null || selectedDiscardIds.length === requiredDiscards;

  const livingMonsters = combat.monsters
    .map((m, idx) => ({ m, idx }))
    .filter(({ m }) => m.hp > 0);

  const targetIdx =
    combat.monsters[pending.targetIndex] && combat.monsters[pending.targetIndex].hp > 0
      ? pending.targetIndex
      : (livingMonsters[0]?.idx ?? 0);

  const targetMonster = combat.monsters[targetIdx];
  const targetName = card.targetMode === 'all_enemies'
    ? 'All Living Enemies'
    : isAttack
    ? (targetMonster ? targetMonster.monster.name : 'Target')
    : `${getPlayerClassName(state.playerClass)} (Hero)`;

  const cardAccBonus = card.accBonus ?? 0;
  const cardAccText = cardAccBonus === 0 ? '' : `${cardAccBonus > 0 ? '+' : ''}${cardAccBonus} card`;
  const playerAccMod = (combat.playerAccMod ?? 0) + getHeroStatDebuffMods(combat).acc;
  const baseAcc = getPlayerAcc(stats, computeCombatGearBonuses(state.equippedGear).acc);
  const totalAcc = baseAcc + cardAccBonus + playerAccMod;
  const targetEva = (targetMonster?.monster.eva ?? 0) + (targetMonster?.evaBonus ?? 0);
  const netAcc = totalAcc - targetEva;
  const neededRoll = Math.max(2, Math.min(12, BASE_HIT_THRESHOLD - netAcc));
  const critThreshold = getPlayerCritThreshold(stats);
  const prob = computeHitProbability(neededRoll, critThreshold);
  const critLabel =
    critThreshold === 12
      ? 'Boxcars Critical ([6, 6] = +50% ATK DMG)'
      : `Critical Hit (Rolls ${critThreshold}+ = +50% ATK DMG)`;

  const targetCardHtml = isAttack && targetMonster
    ? monsterCardHtml(targetMonster, targetIdx, true, false, totalAcc, critThreshold)
    : heroTargetCardHtml(state, combat, stats);

  return `
  <div class="modal-backdrop combat-confirm-backdrop" data-action="close-confirm-backdrop">
    <div class="modal combat-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <header class="confirm-modal-header">
        <h2 id="confirm-modal-title" class="confirm-title">Use <span>${card.name}</span> on <span>${targetName}</span></h2>
        <button class="modal-close-btn" data-action="cancel-play-card" aria-label="Cancel">&times;</button>
      </header>

      ${
        isAttack && card.targetMode !== 'all_enemies' && livingMonsters.length > 1
          ? `
      <div class="confirm-target-picker">
        <span class="picker-label">Target:</span>
        <div class="picker-options">
          ${livingMonsters
            .map(
              ({ m, idx }) => `
            <button class="btn target-pill ${idx === targetIdx ? 'primary' : 'secondary'}"
              data-action="confirm-switch-target" data-id="${idx}">
              ${m.monster.name} (${m.hp} HP)
            </button>`
            )
            .join('')}
        </div>
      </div>`
          : ''
      }

      <div class="confirm-card-comparison">
        <div class="confirm-card-col source">
          <div class="col-header-badge source-badge">Source Action (${card.apCost} AP)</div>
          <div class="confirm-card-frame">
            ${combatCardHtml(card, stats, true, 'noop', false, state)}
          </div>
        </div>

        <div class="confirm-vs-col">
          <div class="confirm-action-arrow">&rarr;</div>
          <span class="confirm-action-verb">${isAttack ? 'ATTACK' : 'APPLY'}</span>
        </div>

        <div class="confirm-card-col target">
          <div class="col-header-badge target-badge">${isAttack ? 'Target Creature' : 'Target (Self)'}</div>
          <div class="confirm-card-frame">
            ${targetCardHtml}
          </div>
        </div>
      </div>

      ${
        card.discardMode && card.discardMode !== 'none'
          ? `
      <section class="combat-discard-choice">
        <h3>${requiredDiscards === null ? 'Choose cards to discard (X)' : `Choose exactly ${requiredDiscards} cards to discard`}</h3>
        <p class="muted">The card being played cannot be selected.</p>
        <div class="combat-discard-choice-list">
          ${discardCandidates.map((candidate) => {
            const chosen = selectedDiscardIds.includes(candidate.instanceId);
            const wouldExceed = !chosen && requiredDiscards !== null && selectedDiscardIds.length >= requiredDiscards;
            const art = getActionRasterArtPath(candidate.id, candidate.cardType);
            return `<button class="discard-choice-card ${chosen ? 'is-selected' : ''}" data-action="toggle-card-discard" data-id="${candidate.instanceId}" ${wouldExceed ? 'disabled' : ''}>
              <img src="${art}" alt="" class="discard-choice-art" loading="lazy" />
              <span class="discard-choice-details"><b>${candidate.name}</b><small>${candidate.apCost} AP · ${candidate.cardType}</small></span>
              <span class="discard-choice-mark" aria-hidden="true">${chosen ? '✓' : ''}</span>
            </button>`;
          }).join('') || '<span class="muted">No other cards are available to discard.</span>'}
        </div>
        <div class="discard-choice-count">Selected: <b>${selectedDiscardIds.length}</b>${requiredDiscards === null ? '' : ` / ${requiredDiscards}`}</div>
      </section>`
          : ''
      }

      ${
        isAttack
          ? `
      <div class="confirm-calc-section">
        <div class="confirm-stat-chips-grid">
          <div class="confirm-chip acc">
            <span class="chip-label">Hero ACC</span>
            <span class="chip-value">${getDerivedStatIcon('acc', 'chip-icon')} <b>${totalAcc}</b></span>
            <span class="chip-sub">&lfloor;DEX / 2&rfloor; ${cardAccText}</span>
          </div>
          <span class="chip-operator">&minus;</span>
          <div class="confirm-chip eva">
            <span class="chip-label">Target EVA</span>
            <span class="chip-value">${getDerivedStatIcon('eva', 'chip-icon')} <b>${targetEva}</b></span>
            <span class="chip-sub">${targetMonster?.monster.name ?? 'Creature'}</span>
          </div>
          <span class="chip-operator">&equals;</span>
          <div class="confirm-chip net">
            <span class="chip-label">Net ACC</span>
            <span class="chip-value"><b>${netAcc >= 0 ? '+' : ''}${netAcc}</b></span>
            <span class="chip-sub">${netAcc >= 0 ? 'bonus' : 'penalty'}</span>
          </div>
          <span class="chip-operator">&rarr;</span>
          <div class="confirm-chip target-roll">
            <span class="chip-label">Dice Target</span>
            <span class="chip-value">🎲 <b>${neededRoll}+</b></span>
            <span class="chip-sub">7 &minus; (${netAcc >= 0 ? '+' : ''}${netAcc})</span>
          </div>
        </div>

        <div class="confirm-prob-box">
          <div class="prob-summary-row">
            <span class="prob-icon-label">${getDerivedStatIcon('acc', 'chip-icon')} Hit Probability:</span>
            <span class="prob-percentage"><b>${prob.hitPercent}%</b> (${prob.hitCombos} of 36 combinations)</span>
          </div>
          <div class="prob-notes-row">
            <span class="prob-note crit">👑 <b>${prob.critPercent}%</b> ${critLabel}</span>
            <span class="prob-note miss">🐍 <b>${prob.snakeEyesPercent}%</b> Snake Eyes Auto-Miss ([1, 1])</span>
          </div>
        </div>
      </div>`
          : `
      <div class="confirm-calc-section defense">
        <div class="confirm-stat-chips-grid">
          ${
            effect.block > 0
              ? `
          <div class="confirm-chip block">
            <span class="chip-label">Block Gained</span>
            <span class="chip-value">${getDerivedStatIcon('def', 'chip-icon')} +<b>${effect.block}</b></span>
            <span class="chip-sub">absorbs incoming DMG</span>
          </div>`
              : ''
          }
          ${
            effect.evasionBonus > 0
              ? `
          <div class="confirm-chip eva">
            <span class="chip-label">Combat EVA</span>
            <span class="chip-value">${getDerivedStatIcon('eva', 'chip-icon')} +<b>${effect.evasionBonus}</b></span>
            <span class="chip-sub">raises monster needed roll</span>
          </div>`
              : ''
          }
        </div>
      </div>`
      }

      <footer class="confirm-modal-footer">
        <button class="btn primary big confirm-action-btn" data-action="confirm-play-card" ${canConfirmDiscard ? '' : 'disabled'}>
          Confirm Use (${card.apCost} AP)
        </button>
        <button class="btn secondary cancel-action-btn" data-action="cancel-play-card">
          Cancel
        </button>
      </footer>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Shrine
// ---------------------------------------------------------------------------

function shrinePrayerSection(shrine: ActiveShrineState): string {
  const boon = shrine.grantedBoon ?? (shrine.chosenOptionId ? PRAYER_OPTION_CATALOG[shrine.chosenOptionId] : null);
  if (boon) {
    const replacedNotice = shrine.replacedBoonName
      ? `<div class="shrine-replaced-note">Note: Only 1 shrine blessing can be active at a time. Previous blessing (<b>${shrine.replacedBoonName}</b>) was replaced.</div>`
      : `<div class="shrine-replaced-note">Note: Only 1 shrine blessing can be active at a time. Visiting another shrine will replace this boon.</div>`;

    return `
    <div class="shrine-granted-box">
      <div class="shrine-granted-header">
        <span class="shrine-granted-icon">&#10024;</span>
        <div class="shrine-granted-title">
          <span class="shrine-granted-eyebrow">Sacred Blessing Granted</span>
          <h3>Visiting this Sacred Shrine has granted you: <b>${boon.name}</b>!</h3>
        </div>
      </div>
      <p class="shrine-granted-desc">${boon.description}</p>
      ${replacedNotice}
    </div>`;
  }

  return `
  <div class="shrine-granted-box">
    <div class="shrine-granted-header">
      <span class="shrine-granted-icon">&#10024;</span>
      <div class="shrine-granted-title">
        <span class="shrine-granted-eyebrow">Sacred Shrine</span>
        <h3>The divine spirits watch over your journey.</h3>
      </div>
    </div>
  </div>`;
}

function shrineSkillUpgradeSection(state: RunState): string {
  const shrineLevel = getShrineLevel(state);
  if (shrineLevel < 2 || !state.playerResources) return '';
  const options = getShrineSkillUpgradeOptions(state);
  const stats = getEffectiveStatsFromState(state);
  const upgradeCards = options.map((option) => {
    const canAfford = state.playerResources!.gold >= option.goldCost
      && state.playerResources!.statPoints >= option.statPointCost;
    return `
      <article class="void-upgrade-option">
        <div class="void-upgrade-cards">
          <div class="void-upgrade-card-source">${combatCardHtml(option.source, stats, false, 'play-card', true, state, true)}</div>
          <span class="void-upgrade-arrow" aria-hidden="true">→</span>
          <div class="void-upgrade-card-target">${combatCardHtml(option.upgrade, stats, false, 'play-card', true, state, true)}</div>
        </div>
        <div class="void-upgrade-details">
          <b>${option.source.name} → ${option.upgrade.name}</b>
          <span>Pull from the Void · ${option.source.apCost} AP → ${option.upgrade.apCost} AP</span>
        </div>
        <button class="btn primary void-upgrade-btn" data-action="shrine-upgrade-skill" data-id="${option.source.instanceId}" ${canAfford ? '' : 'disabled'}>
          Upgrade (${option.goldCost} Gold · ${option.statPointCost} SP)
        </button>
      </article>`;
  }).join('');

  return `
    <section class="shrine-section void-upgrade-section">
      <div class="void-upgrade-heading">
        <div>
          <h3>🌀 Void Skill Upgrades</h3>
          <p class="muted">This Level ${shrineLevel} Shrine can pull matching upgrade cards from the Void.</p>
        </div>
        <button class="void-inspect-link" data-action="open-pile" data-pile="void_deck">Inspect Void (${getVoidCards().length})</button>
      </div>
      <p class="void-upgrade-rule">
        ${shrineLevel >= 3
          ? 'Upgrade 1 AP → 2 AP for 10 Gold + 2 SP, or 2 AP → 3 AP for 30 Gold + 6 SP.'
          : 'Upgrade an owned 1 AP card to its 2 AP Void version for 10 Gold + 2 SP.'}
      </p>
      ${upgradeCards || '<p class="muted void-upgrade-empty">You do not currently own a card with an eligible Void upgrade.</p>'}
    </section>`;
}

export function statUpgradeWidgetHtml(state: RunState, action = 'shrine-upgrade'): string {
  const res = state.playerResources!;
  const eff = getEffectiveStatsFromState(state);

  const rows = STATS.map((s) => {
    const base = state.playerBaseStats[s];
    const cost = getBaseStatUpgradeCost(base);
    const can = res.statPoints >= cost;
    let benefitNote = '';
    if (s === 'str') {
      benefitNote = ` <small>(Max HP ${res.maxHp} &rarr; ${res.maxHp + 2}, DEF +${Math.floor(eff.str / 5)} &rarr; +${Math.floor((eff.str + 1) / 5)})</small>`;
    } else if (s === 'dex') {
      benefitNote = ` <small>(ACC ${Math.floor(eff.dex / 2)} &rarr; ${Math.floor((eff.dex + 1) / 2)}, ATK +${Math.floor(eff.dex / 3)} &rarr; +${Math.floor((eff.dex + 1) / 3)})</small>`;
    } else if (s === 'agi') {
      benefitNote = ` <small>(EVA ${Math.floor(eff.agi / 2)} &rarr; ${Math.floor((eff.agi + 1) / 2)}, DEF +${Math.floor(eff.agi / 3)} &rarr; +${Math.floor((eff.agi + 1) / 3)})</small>`;
    } else if (s === 'int') {
      benefitNote = ` <small>(MATK +${Math.floor(eff.int / 2)} &rarr; +${Math.floor((eff.int + 1) / 2)}, MDEF +${Math.floor(eff.int / 5)} &rarr; +${Math.floor((eff.int + 1) / 5)}, ACT ${3 + Math.floor(eff.int / 5)} &rarr; ${3 + Math.floor((eff.int + 1) / 5)})</small>`;
    } else if (s === 'cha') {
      benefitNote = ` <small>(Shop discount -${eff.cha * 5}% &rarr; -${(eff.cha + 1) * 5}%)</small>`;
    } else if (s === 'luk') {
      benefitNote = ` <small>(Crit ${Math.max(2, 12 - Math.floor(eff.luk / 10))}+ &rarr; ${Math.max(2, 12 - Math.floor((eff.luk + 1) / 10))}+, Gold +${Math.floor(eff.luk / 2)} &rarr; +${Math.floor((eff.luk + 1) / 2)})</small>`;
    }
    return `
    <div class="shop-row inspectable-stat"
      data-action="inspect-stat" data-stat="${s}" data-inspect-stat="${s}"
      title="Click or right-click to view full ${s.toUpperCase()} computation & next SP breakdown">
      <div style="display:flex;align-items:center;gap:8px;">
        ${getStatIcon(s, 'stat-icon')}
        <div>
          <b>${s.toUpperCase()}</b> ${eff[s]} &rarr; <b>${eff[s] + 1}</b>${benefitNote}<br/>
          <small>Base ${base} &rarr; ${base + 1} &middot; cost ${cost} SP</small>
        </div>
        <span class="stat-info-pill" title="View stat breakdown">&#9432;</span>
      </div>
      <button class="btn mini" data-action="${action}" data-stat="${s}" ${can ? '' : 'disabled'}>Upgrade (${cost} SP)</button>
    </div>`;
  }).join('');

  return `
  <div class="shrine-section stat-converter-section">
    <h3>Convert Stat Points into Base Stats</h3>
    <p class="muted">${getResourceIcon('sp', 'chip-icon')} Stat Points: <b>${res.statPoints} SP</b></p>
    <div class="shop-list">${rows}</div>
  </div>`;
}

function welcomePrepareModal(state: RunState): string {
  const classDef = state.playerClass ? CLASS_CATALOG[state.playerClass] : null;
  const className = classDef ? classDef.name : 'Adventurer';
  return `
  <div class="modal-backdrop welcome-prepare-backdrop">
    <div class="modal welcome-prepare-modal">
      <div class="welcome-prepare-header">
        <h2>Greetings, ${className}!</h2>
        <p class="eyebrow-prepare">&#10022; Prepare for Your Journey &#10022;</p>
      </div>
      <p class="welcome-intro-text">
        Welcome to <b>The Paths We Choose</b>! Before taking your first step onto the tiles, take time to prepare for your journey.
        You have been granted <b>4 Stat Points (SP)</b> to immediately upgrade your Base Stats.
      </p>

      ${statUpgradeWidgetHtml(state, 'welcome-upgrade')}

      <div class="modal-actions prepare-actions">
        <button class="btn primary big" data-action="dismiss-welcome-dialog">
          Begin Journey &rarr;
        </button>
      </div>
    </div>
  </div>`;
}

export function explorationModal(
  exploration: ActiveExplorationState,
  _state?: RunState
): string {
  const card = exploration.card;
  const terrainIcon =
    card.terrain === 'forest' ? '🌲' : card.terrain === 'swamp' ? '🪷' : '🌿';
  const capTerrain =
    card.terrain === 'forest' ? 'Forest' : card.terrain === 'swamp' ? 'Swamp' : 'Grasslands';

  const roll = exploration.roll;
  const luckBonus = exploration.luckBonus ?? 0;
  const effectiveRoll = exploration.effectiveRoll ?? roll + luckBonus;
  const rollBreakdown = luckBonus > 0
    ? `Natural ${roll} + LUK ${luckBonus} = ${effectiveRoll}`
    : `Natural ${roll}`;
  const outcome = exploration.outcome;

  return `
  <div class="modal-backdrop exploration-backdrop">
    <div class="modal exploration-modal">
      <div class="exploration-card-header">
        <span class="exploration-terrain-icon">${terrainIcon}</span>
        <div class="exploration-title-group">
          <h2>${card.name}</h2>
          <span class="exploration-level-pill">Level ${card.level} Undiscovered Terrain</span>
        </div>
      </div>

      <!-- 1d6 Dice Roll Display -->
      <div class="exploration-dice-section">
        <div class="exploration-dice-badge">
          <span class="dice-icon">🎲</span>
          <span class="dice-number">${effectiveRoll}</span>
        </div>
        <div class="exploration-dice-details">
          <div class="dice-label">1d6 Exploration Roll &middot; ${rollBreakdown}</div>
          <div class="dice-criteria ${outcome}">
            ${
              outcome === 'combat'
                ? `${rollBreakdown} &le; Card Level ${card.level} &middot; Enemy Encountered!`
                : outcome === 'treasure'
                ? (exploration.foundItem ? `${rollBreakdown} &middot; Treasure Found!` : `${rollBreakdown} &middot; No eligible treasure available`)
                : `${rollBreakdown} &middot; Calm &amp; Safe Passage`
            }
          </div>
        </div>
      </div>

      <!-- Outcome Details -->
      <div class="exploration-outcome-box ${outcome}">
        ${
          outcome === 'combat'
            ? `
            <div class="outcome-header combat">
              <span class="outcome-icon">⚔️</span>
              <h3>Hostile Ambush!</h3>
            </div>
            <p class="outcome-msg">
              Fierce wandering creatures prowling the <b>${card.name}</b> have ambushed your party!
            </p>
            <div class="exploration-encounter-hint">
              Encounter Budget: <b>Level ${card.level}</b> &middot; Terrain: <b>${capTerrain}</b>
            </div>
            <div class="exploration-actions">
              <button class="btn danger big exploration-btn" data-action="confirm-exploration-combat">⚔️ Proceed to Battle</button>
            </div>
            `
            : outcome === 'treasure'
            ? `
            <div class="outcome-header treasure">
              <span class="outcome-icon">💎</span>
              <h3>${exploration.foundItem ? 'Congratulations! Treasure Chest Found!' : 'No Treasure Available'}</h3>
            </div>
            <p class="outcome-msg">
              Fortune favors you! A natural 6 unearths a hidden treasure cache buried in the <b>${card.name}</b>.
            </p>
            ${
              exploration.foundItem
                ? `
                <div class="exploration-item-box">
                  <div class="exploration-item-card">
                    ${renderTcgItemCard(exploration.foundItem, { isMini: true })}
                  </div>
                  <div class="exploration-item-header">
                    <span class="item-name">${exploration.foundItem.name}</span>
                    <span class="item-level-tag">Level ${exploration.foundItem.level ?? 1}</span>
                  </div>
                  <p class="item-desc">${exploration.foundItem.description}</p>
                  <div class="item-stored-badge">🎒 Added directly to your Backpack</div>
                </div>
                `
                : `<p class="outcome-msg">No eligible treasure remains in the deck or graveyard.</p>`
            }
            <div class="exploration-actions">
              <button class="btn primary big exploration-btn" data-action="confirm-exploration-safe">${exploration.foundItem ? 'Return to Map View &rarr;' : 'Continue Journey &rarr;'}</button>
            </div>
            `
            : `
            <div class="outcome-header safe">
              <span class="outcome-icon">🌿</span>
              <h3>Peaceful Wilderness</h3>
            </div>
            <p class="outcome-msg">
              The journey through <b>${card.name}</b> is serene and undisturbed. No enemies emerged and no treasures were uncovered.
            </p>
            <div class="exploration-actions">
              <button class="btn primary big exploration-btn" data-action="confirm-exploration-safe">Continue Journey &rarr;</button>
            </div>
            `
        }
      </div>
    </div>
  </div>`;
}

export function victoryModal(
  victory: CombatVictoryState,
  _state?: RunState
): string {
  const isBoss = victory.isBoss;
  const foesHtml = victory.defeatedMonsters
    .map((m) => {
      const img = getMonsterIllustration(m.templateId);
      return `
      <div class="defeated-foe-card">
        <div class="foe-art-thumb">
          ${img}
          <span class="foe-defeated-tag">DEFEATED</span>
        </div>
        <div class="foe-meta">
          <span class="foe-name">${m.name}</span>
          <span class="foe-sub">${formatCreatureSubtype(m.creatureType)} &middot; Level ${m.level}</span>
          <div class="foe-rewards">
            <span class="reward-pill sp">${getResourceIcon('sp', 'chip-icon')} +${m.statPointReward} SP</span>
            <span class="reward-pill gold">${getResourceIcon('gold', 'chip-icon')} +${m.goldReward} Gold</span>
          </div>
        </div>
      </div>`;
    })
    .join('');

  const luckyCharmBonus = victory.luckyCharmGold;
  const luckBonus = victory.luckBonusGold;
  const hasBonuses = luckyCharmBonus > 0 || luckBonus > 0;

  return `
  <div class="modal-backdrop victory-backdrop">
    <div class="modal victory-modal">
      <!-- Header with Laurel & Title -->
      <div class="victory-header">
        <div class="victory-badge">🏆 VICTORY</div>
        <h2>Battle Won!</h2>
        <p class="victory-subtitle">All hostiles vanquished &middot; Spoils of battle claimed</p>
      </div>

      <!-- Defeated Monsters Section -->
      <div class="victory-section defeated-foes-section">
        <div class="victory-section-label">Defeated Foes</div>
        <div class="defeated-foes-list">
          ${foesHtml}
        </div>
      </div>

      <!-- Rewards & Loots Gained -->
      <div class="victory-section victory-spoils-section">
        <div class="victory-section-label">Loot &amp; Rewards Claimed</div>
        <div class="victory-rewards-grid">
          <div class="victory-reward-card sp">
            <div class="reward-card-header">
              ${getResourceIcon('sp', 'chip-icon')}
              <span class="reward-card-title">Stat Points</span>
            </div>
            <div class="reward-amount">+${victory.statPointsEarned} SP</div>
            <div class="reward-note">Inscribed directly for Sacred Shrine upgrades</div>
          </div>
          <div class="victory-reward-card gold">
            <div class="reward-card-header">
              ${getResourceIcon('gold', 'chip-icon')}
              <span class="reward-card-title">Gold Spoils</span>
            </div>
            <div class="reward-amount">+${victory.goldEarned} Gold</div>
            <div class="reward-breakdown">
              ${
                hasBonuses
                  ? `Base: +${victory.baseGold}g${luckBonus > 0 ? ` &middot; Luck: +${luckBonus}g` : ''}${
                      luckyCharmBonus > 0 ? ` &middot; Goldstar: +${luckyCharmBonus}g` : ''
                    }`
                  : 'Added directly to your treasury'
              }
            </div>
          </div>
        </div>
      </div>

      <!-- OK / Return to Map Action -->
      <div class="victory-actions">
        <button class="btn primary big victory-btn" data-action="confirm-victory">
          ${isBoss ? 'OK &mdash; Proceed &rarr;' : 'OK &mdash; Return to Map &rarr;'}
        </button>
      </div>
    </div>
  </div>`;
}

function shrineModal(state: RunState): string {
  const shrine = state.activeHook.type === 'SHRINE' ? state.activeHook.shrine : null;
  const prayerHtml = shrine ? shrinePrayerSection(shrine) : '';

  return `
  <div class="modal-backdrop">
    <div class="modal shrine-modal">
      <h2>&#10022; Sacred Shrine</h2>
      <p class="banner-inline">${state.bannerMessage}</p>

      ${prayerHtml}

      ${statUpgradeWidgetHtml(state, 'shrine-upgrade')}

      ${shrineSkillUpgradeSection(state)}

      <div class="modal-actions">
        <button class="btn primary big" data-action="leave-shrine">Leave Shrine &rarr;</button>
      </div>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Village
// ---------------------------------------------------------------------------

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

/** Chips such as "STR 4 â†’ 5 (+1)" for every stat that would change, plus Max HP. */
function deltaChips(p: GearPreview): string {
  const chips = STATS.filter((s) => p.after[s] !== p.before[s]).map((s) => {
    const d = p.after[s] - p.before[s];
    return `<span class="chip ${d > 0 ? 'up' : 'down'}">${s.toUpperCase()} ${p.before[s]} &rarr; ${p.after[s]} (${signed(d)})</span>`;
  });
  if (p.maxHpAfter !== p.maxHpBefore) {
    const d = p.maxHpAfter - p.maxHpBefore;
    chips.push(
      `<span class="chip ${d > 0 ? 'up' : 'down'}">Max HP ${p.maxHpBefore} &rarr; ${p.maxHpAfter} (${signed(d)})</span>`
    );
  }
  if (p.combatBefore && p.combatAfter) {
    const combatKeys = ['atk', 'def', 'matk', 'mdef', 'eva', 'acc', 'pen', 'act'] as const;
    for (const k of combatKeys) {
      const beforeVal = p.combatBefore[k];
      const afterVal = p.combatAfter[k];
      const diff = afterVal - beforeVal;
      if (diff !== 0) {
        chips.push(
          `<span class="chip ${diff > 0 ? 'up' : 'down'}">${k.toUpperCase()} ${beforeVal} &rarr; ${afterVal} (${signed(diff)})</span>`
        );
      }
    }
  }
  return chips.length ? chips.join('') : '<span class="chip">No stat change</span>';
}

function inventoryPanel(state: RunState): string {
  const eff = getEffectiveStatsFromState(state);
  const res = state.playerResources!;
  const slot = (label: string, item: ShopItemDef | null) => {
    const slotKey = label.toLowerCase();
    if (!item) {
      return `<div class="slot"><span class="slot-label">${getSlotIcon(slotKey, 'slot-icon')} ${label}</span><span class="slot-item">Empty</span></div>`;
    }
    const raster = getItemRasterArtPath(item.id);
    return `<div class="slot filled inspectable-row" data-inspect-kind="item" data-item-instance="${item.instanceId}" data-item-id="${item.id}" title="Right-click or hold to inspect ${item.name}">
      <span class="slot-label">${getSlotIcon(slotKey, 'slot-icon')} ${label}</span>
      <div class="slot-item-with-art">
        <img src="${raster}" alt="${item.name}" class="inv-slot-mini-img" loading="lazy" />
        <span class="slot-item">${item.name} <small>${item.description.replace(/^[A-Za-z]+ Slot: /, '')}</small></span>
      </div>
      <button class="btn mini secondary unequip-btn" data-action="unequip" data-id="${slotKey}" title="Unequip ${item.name} to backpack">Unequip</button>
    </div>`;
  };
  const bagItems = state.backpack.length
    ? state.backpack
        .map(
          (i) => {
            const raster = getItemRasterArtPath(i.id);
            return `<div class="backpack-item inspectable-row" data-inspect-kind="item" data-item-instance="${i.instanceId}" data-item-id="${i.id}" title="Right-click or hold to inspect ${i.name}">
              <div class="bag-item-left">
                <img src="${raster}" alt="${i.name}" class="inv-slot-mini-img" loading="lazy" />
                <span class="bag-item-name">${i.name}</span>
              </div>
              ${
                i.category === 'consumable'
                  ? `<button class="btn mini" data-action="use-item" data-id="${i.instanceId}">Use</button>`
                  : `<button class="btn mini" data-action="equip" data-id="${i.instanceId}">Equip</button>`
              }
            </div>`;
          }
        )
        .join('')
    : '<span class="muted">empty</span>';
  return `
  <div class="inventory">
    <h3>Your equipment</h3>
    ${slot('Weapon', state.equippedGear.weapon)}
    ${slot('Armor', state.equippedGear.armor)}
    ${slot('Accessory', state.equippedGear.accessory)}
    <div class="backpack-box">
      <div class="backpack-header"><span class="slot-label">Backpack</span> <small class="muted">(${state.backpack.length})</small></div>
      <div class="backpack-items">${bagItems}</div>
    </div>
    <div class="inv-stats-box">
      <span class="slot-label">Current stats</span>
      <p class="inv-stats">${STATS.map((s) => `${s.toUpperCase()} <b>${eff[s]}</b>`).join(' &middot; ')} &middot; HP <b>${res.hp}/${res.maxHp}</b></p>
    </div>
  </div>`;
}

function shopBuyRow(state: RunState, item: ShopItemDef | ShopItemTemplate): string {
  const gold = state.playerResources!.gold;
  const eff = getEffectiveStatsFromState(state);
  const price = calculateGoodsPrice(item.buyPrice, eff.cha);
  const affordable = gold >= price;
  const discountNote =
    eff.cha > 0 && price < item.buyPrice
      ? ` <span class="shop-discount" title="${eff.cha * 5}% Charisma Discount">(-${item.buyPrice - price}g CHA)</span>`
      : '';
  let detail = '';
  if (item.category === 'consumable') {
    detail = `<span class="chip">Goes to your backpack</span>`;
  } else {
    const preview = previewGearChange(state, item.category, item);
    const replaced = preview.replaced
      ? `Replaces <b>${preview.replaced.name}</b> (moves to backpack)`
      : `Fills your empty ${item.category} slot`;
    detail = `<div class="replace-note">${replaced}</div><div class="chips">${deltaChips(preview)}</div>`;
  }

  const rasterArt = getItemRasterArtPath(item.id);
  const slotIcon =
    item.category === 'weapon'
      ? getSlotIcon('weapon', 'header-icon')
      : item.category === 'armor'
      ? getSlotIcon('armor', 'header-icon')
      : item.category === 'accessory'
      ? getSlotIcon('accessory', 'header-icon')
      : '🧪';
  const typeLabel =
    item.category === 'weapon'
      ? 'Weapon'
      : item.category === 'armor'
      ? 'Armor'
      : item.category === 'accessory'
      ? 'Accessory'
      : 'Consumable';
  const instanceId = 'instanceId' in item && item.instanceId ? item.instanceId : item.id;

  return `
  <div class="shop-row inspectable-row" data-inspect-kind="item" data-item-id="${item.id}" data-item-instance="${instanceId}" title="Right-click or hold to inspect card">
    <div class="shop-card-preview-box" data-action="inspect-item" data-item-id="${item.id}" data-item-instance="${instanceId}" title="Click or hold to inspect card">
      <div class="shop-mini-card tcg-template-item">
        <img src="${rasterArt}" alt="${item.name}" class="shop-card-art-img" loading="lazy" />
        <span class="shop-mini-slot-badge" title="${typeLabel}">${slotIcon}</span>
        <span class="shop-mini-level-badge">Lvl ${item.level ?? 1}</span>
      </div>
    </div>
    <div class="shop-info">
      <div class="shop-item-title-row">
        <b class="shop-item-name">${item.name}</b>
        <span class="shop-item-type-badge">${slotIcon} ${typeLabel}</span>
      </div>
      <small class="shop-item-desc">${item.description}</small>
      ${detail}
    </div>
    <div class="shop-action-box">
      <button class="btn mini shop-buy-btn" data-action="buy" data-id="${instanceId}" ${affordable ? '' : 'disabled'}>
        Buy ${price}g${discountNote}
      </button>
    </div>
  </div>`;
}

function shopSellRow(state: RunState, item: ShopItemDef): string {
  const equipped = (['weapon', 'armor', 'accessory'] as const).find(
    (s) => state.equippedGear[s]?.instanceId === item.instanceId
  );
  let detail = '';
  if (equipped) {
    detail = `<div class="chips">${deltaChips(previewGearChange(state, equipped, null))}</div>`;
  }

  const rasterArt = getItemRasterArtPath(item.id);
  const slotIcon =
    item.category === 'weapon'
      ? getSlotIcon('weapon', 'header-icon')
      : item.category === 'armor'
      ? getSlotIcon('armor', 'header-icon')
      : item.category === 'accessory'
      ? getSlotIcon('accessory', 'header-icon')
      : '🧪';
  const typeLabel =
    item.category === 'weapon'
      ? 'Weapon'
      : item.category === 'armor'
      ? 'Armor'
      : item.category === 'accessory'
      ? 'Accessory'
      : 'Consumable';

  return `
  <div class="shop-row inspectable-row" data-inspect-kind="item" data-item-id="${item.id}" data-item-instance="${item.instanceId}" title="Right-click or hold to inspect card">
    <div class="shop-card-preview-box" data-action="inspect-item" data-item-id="${item.id}" data-item-instance="${item.instanceId}" title="Click or hold to inspect card">
      <div class="shop-mini-card tcg-template-item">
        <img src="${rasterArt}" alt="${item.name}" class="shop-card-art-img" loading="lazy" />
        <span class="shop-mini-slot-badge" title="${typeLabel}">${slotIcon}</span>
        <span class="shop-mini-level-badge">Lvl ${item.level ?? 1}</span>
      </div>
    </div>
    <div class="shop-info">
      <div class="shop-item-title-row">
        <b class="shop-item-name">${item.name}</b>
        ${equipped ? ` <small class="shop-equipped-tag">(equipped as ${equipped})</small>` : ''}
        <span class="shop-item-type-badge">${slotIcon} ${typeLabel}</span>
      </div>
      <small class="shop-item-desc">${item.description}</small>
      ${detail}
    </div>
    <div class="shop-action-box">
      <button class="btn mini shop-sell-btn" data-action="sell" data-id="${item.instanceId}">
        Sell ${item.sellPrice}g
      </button>
    </div>
  </div>`;
}

function villageModal(state: RunState, village: ActiveVillageState, ui: UiState): string {
  const res = state.playerResources!;
  const villageCard = state.board[coordToKey(village.coord)]?.card;
  const villageName = villageCard?.name ?? 'Village';
  const villageLevel = villageCard?.level ?? 1;
  const villageArt = villageCard ? getAdventureRasterArtPath(villageCard) : '/cards/adventure/grassland_village.jpg';
  const locationHeader = `
    <header class="village-location-header">
      <img src="${villageArt}" alt="${villageName}" class="village-location-art" loading="eager" />
      <div class="village-location-copy">
        <span class="village-location-type">VILLAGE</span>
        <h2>${villageName}</h2>
        <span class="village-location-level">Lvl ${villageLevel}</span>
      </div>
    </header>`;
  let body = '';
  if (village.subView === 'main') {
    const restOption = getVillageRestOption(res, ui.villageRestTicks);
    const eligibility = checkRestEligibility(state, restOption.ticks);
    const restLabels = Array.from({ length: restOption.maxTicks }, (_, index) => {
      const ticks = index + 1;
      const option = getVillageRestOption(res, ticks);
      return `<span>${option.isFullRest ? 'Full' : `${option.hpRestored} HP`}</span>`;
    }).join('');
    const restMessage = eligibility.reason === 'full_health'
      ? 'Already at full HP.'
      : eligibility.reason === 'insufficient_gold'
      ? `Need ${restOption.cost} Gold; you have ${res.gold}.`
      : `${restOption.isFullRest ? 'Full rest' : `Restore ${restOption.hpRestored} HP`} for ${restOption.cost} Gold.`;

    body = `
    <p class="village-intro">Use any service while you visit. Your shop stock and training offers are reserved when you arrive.</p>
    <div class="village-actions">
      <section class="village-service village-rest-service">
        <div class="village-service-heading"><b>Rest</b><span>${res.hp} / ${res.maxHp} HP</span></div>
        ${restOption.maxTicks > 0 ? `
          <input class="village-rest-slider" type="range" min="1" max="${restOption.maxTicks}" step="1" value="${restOption.ticks}" data-action="set-village-rest-ticks" aria-label="Rest duration: ${restOption.isFullRest ? 'Full' : `${restOption.hpRestored} HP`}" />
          <div class="village-rest-ticks" aria-hidden="true">${restLabels}</div>` : ''}
        <p class="village-service-note">${restMessage} Each tick restores up to 2 HP and costs 1 Gold.</p>
        <button class="btn primary" data-action="village-rest" ${eligibility.canRest ? '' : 'disabled'}>
          Rest ${restOption.isFullRest ? 'to Full' : `+${restOption.hpRestored} HP`} (${restOption.cost}g)
        </button>
      </section>
      <button class="btn big" data-action="village-shop">Shop<small>Buy &amp; sell gear</small></button>
      <button class="btn big" data-action="village-train">Training<small>Learn skills or remove cards</small></button>
    </div>
    <button class="btn" data-action="village-leave">Leave village</button>`;
  } else if (village.subView === 'shop') {
    const shopLevel = state.board[coordToKey(village.coord)]?.card.level ?? 1;
    const owned: ShopItemDef[] = [
      ...(['weapon', 'armor', 'accessory'] as const)
        .map((s) => state.equippedGear[s])
        .filter((i): i is ShopItemDef => !!i),
      ...state.backpack,
    ];
    const stock = village.shopStock && village.shopStock.length > 0 ? village.shopStock : [];
    const list =
      ui.villageTab === 'buy'
        ? stock.length > 0
          ? stock.map((i) => shopBuyRow(state, i)).join('')
          : `<p class="muted empty-shop-stock">No Level ${shopLevel} items are available in this store.</p>`
        : owned.length
        ? owned.map((i) => shopSellRow(state, i)).join('')
        : '<p class="muted">Nothing to sell.</p>';
    body = `
    <div class="shop-layout">
      <aside class="shop-sidebar">
        ${inventoryPanel(state)}
      </aside>
      <section class="shop-main">
        <p class="muted">Level ${shopLevel} store · Only Level ${shopLevel} items</p>
        <div class="shop-header">
          <p class="gold-display">${getResourceIcon('gold', 'chip-icon')} Gold: <b>${res.gold}</b></p>
          <div class="tabs">
            <button class="tab ${ui.villageTab === 'buy' ? 'on' : ''}" data-action="tab" data-id="buy">Buy (${stock.length})</button>
            <button class="tab ${ui.villageTab === 'sell' ? 'on' : ''}" data-action="tab" data-id="sell">Sell (${owned.length})</button>
          </div>
        </div>
        <div class="shop-list">${list}</div>
        <div class="modal-actions">
          <button class="btn" data-action="village-back">&larr; Village options</button>
          <button class="btn primary" data-action="village-leave">Done shopping</button>
        </div>
      </section>
    </div>`;
  } else {
    const stats = getEffectiveStatsFromState(state);
    const canRemove = state.playerMasterDeck.length > MIN_DECK_SIZE;
    const removalCost = getTrainRemovalCost(state);
    const canAffordRemoval = res.gold >= removalCost;
    body = `
    <section class="train-section">
      <h3>Learn a skill</h3>
      <p class="muted">1 AP: 5 Gold + 1 SP · 2 AP: 10 Gold + 2 SP · 3 AP: 20 Gold + 4 SP</p>
      <div class="train-card-grid">${village.trainOptions.length
        ? village.trainOptions.map((c) => {
          const cost = getTrainingSkillCost(c);
          const canLearn = res.gold >= cost.gold && res.statPoints >= cost.statPoints;
          return `<div class="train-card-offer">${combatCardHtml(c, stats, canLearn, 'train-draft', false, state)}<span>${cost.gold} Gold · ${cost.statPoints} SP</span></div>`;
        }).join('')
        : '<p class="muted">All pre-drawn training offers have been learned.</p>'}</div>
    </section>
    <section class="train-section">
      <h3>Remove a card <small>${canRemove ? `(${removalCost} Gold)` : '(deck at minimum size)'}</small></h3>
      <p class="muted">Each removal increases the next removal price by 1 Gold for this adventure.</p>
      <div class="train-card-grid">${state.playerMasterDeck
        .map((c) => `<div class="train-card-offer">${combatCardHtml(c, stats, canRemove && canAffordRemoval, 'train-remove', false, state)}<span>${removalCost} Gold</span></div>`)
        .join('')}</div>
    </section>
    <div class="modal-actions"><button class="btn" data-action="village-back">&larr; Village options</button><button class="btn primary" data-action="village-leave">Leave village</button></div>`;
  }
  return `
  <div class="modal-backdrop">
    <div class="modal village-modal ${village.subView === 'shop' ? 'is-shop' : ''}">
      ${locationHeader}
      ${body}
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Card Info Modal (Right-Click & Long-Press 2s Inspection)
// ---------------------------------------------------------------------------

export function cardInspectModal(inspected: InspectedCardInfo, state: RunState): string {
  const stats = getEffectiveStatsFromState(state);

  let cardHtml = '';
  let detailHtml = '';
  let title = 'Card Details & Tabletop Reference';

  if (inspected.kind === 'action') {
    const card = inspected.card;
    const isAtk = card.cardType === 'attack';
    const templateClass = isAtk ? 'is-attack tcg-template-attack' : 'is-defense tcg-template-defense';
    const eff = currentCardEffect(card, stats, state);
    const illustration = getActionCardIllustration(card.id, card.cardType);

    title = `${card.name} (Offline Print & Tabletop Reference)`;

    // Computation breakdowns for offline physical play & digital clarity
    const scalingRows: string[] = [];
    if (card.damageScalingStat && card.baseDamage > 0) {
      const s = card.damageScalingStat.toUpperCase();
      const statLabel = card.damageScalingStat === 'atk' || card.damageScalingStat === 'def' ? s : `Effective ${s}`;
      const div = card.damageScalingDivisor ?? 2;
      const multiplier = card.damageScalingMultiplier ?? 1;
      const sVal = card.damageScalingStat === 'atk'
        ? getPlayerAtk(stats, state ? computeCombatGearBonuses(state.equippedGear).atk : 0)
        : card.damageScalingStat === 'def'
        ? getPlayerDef(stats, state ? computeCombatGearBonuses(state.equippedGear).def : 0)
        : stats[card.damageScalingStat];
      const bonus = Math.floor(sVal / div) * multiplier;
      const additional = eff.damage - card.baseDamage - bonus;
      const additionalText = additional ? ` + ${additional} (DEX, gear and passive bonuses)` : '';
      const formulaStat = div === 1 ? statLabel : `&lfloor;${statLabel} / ${div}&rfloor;`;
      const calculationStat = div === 1 ? `${sVal}` : `&lfloor;${sVal} / ${div}&rfloor;`;
      scalingRows.push(`
        <div class="inspect-formula-row">
          <span class="formula-label">Damage Formula (Tabletop Rule)</span>
          <span class="formula-math">${card.baseDamage} Base DMG + ${multiplier === 1 ? '' : `${multiplier} × `}${formulaStat}${additionalText}</span>
          <span class="formula-calc">Hero Calculation: ${card.baseDamage} + ${multiplier === 1 ? '' : `${multiplier} × `}${calculationStat} = ${card.baseDamage} + ${bonus}${additionalText} = <b>${eff.damage} DMG</b></span>
        </div>
      `);
    } else if (card.baseDamage > 0) {
      scalingRows.push(`
        <div class="inspect-formula-row">
          <span class="formula-label">Damage</span>
          <span class="formula-math">Static: <b>${card.baseDamage} DMG</b> (No attribute scaling)</span>
        </div>
      `);
    }

    if (card.blockScalingStat && card.baseBlock > 0) {
      const s = card.blockScalingStat.toUpperCase();
      const statLabel = card.blockScalingStat === 'atk' || card.blockScalingStat === 'def' ? s : `Effective ${s}`;
      const div = card.blockScalingDivisor ?? 2;
      const multiplier = card.blockScalingMultiplier ?? 1;
      const sVal = card.blockScalingStat === 'def'
        ? getPlayerDef(stats, state ? computeCombatGearBonuses(state.equippedGear).def : 0)
        : card.blockScalingStat === 'atk'
        ? getPlayerAtk(stats, state ? computeCombatGearBonuses(state.equippedGear).atk : 0)
        : stats[card.blockScalingStat];
      const bonus = Math.floor(sVal / div) * multiplier;
      const formulaStat = div === 1 ? statLabel : `&lfloor;${statLabel} / ${div}&rfloor;`;
      const calculationStat = div === 1 ? `${sVal}` : `&lfloor;${sVal} / ${div}&rfloor;`;
      scalingRows.push(`
        <div class="inspect-formula-row">
          <span class="formula-label">Block Formula (Tabletop Rule)</span>
          <span class="formula-math">${card.baseBlock} Base Block + ${multiplier === 1 ? '' : `${multiplier} × `}${formulaStat}</span>
          <span class="formula-calc">Hero Calculation: ${card.baseBlock} + ${multiplier === 1 ? '' : `${multiplier} × `}${calculationStat} = ${card.baseBlock} + ${bonus} = <b>${eff.block} Block</b></span>
        </div>
      `);
    } else if (card.baseBlock > 0) {
      scalingRows.push(`
        <div class="inspect-formula-row">
          <span class="formula-label">Block</span>
          <span class="formula-math">Static: <b>${card.baseBlock} Block</b> (No attribute scaling)</span>
        </div>
      `);
    }

    if (card.evasionScalingStat) {
      const mult = card.evasionMultiplier ?? 1;
      scalingRows.push(`
        <div class="inspect-formula-row">
          <span class="formula-label">Combat Evasion Bonus (Tabletop Rule)</span>
          <span class="formula-math">+${mult} to hero EVA against 2d6 attacks this turn</span>
          <span class="formula-calc">Hero Calculation: +${eff.evasionBonus} EVA to raise required enemy 2d6 roll</span>
        </div>
      `);
    }

    if (card.accBonus) {
      scalingRows.push(`
        <div class="inspect-formula-row">
          <span class="formula-label">Attack Accuracy Bonus (Tabletop Rule)</span>
          <span class="formula-math">${card.accBonus > 0 ? '+' : ''}${card.accBonus} ACC on attack rolls</span>
          <span class="formula-calc">Hero Calculation: ${getPlayerAcc(stats, state ? computeCombatGearBonuses(state.equippedGear).acc : 0)} Hero ACC ${card.accBonus > 0 ? '+' : ''}${card.accBonus} Card ACC = <b>${getPlayerAcc(stats, state ? computeCombatGearBonuses(state.equippedGear).acc : 0) + card.accBonus} Total ACC</b></span>
        </div>
      `);
    }

    // Full Card Preview (Large Physical Print Scale with 5:7 ratio)
    cardHtml = `
    <div class="tcg-card tcg-action ${templateClass} tcg-inspect-card">
      <div class="tcg-inner-frame">
        <div class="tcg-art-window action-window full-inspect-art">
          ${illustration}
        </div>
        <header class="tcg-header">
          <div class="tcg-header-meta">
            <div class="tcg-type-stacked">
              <span class="tcg-type-main">ACTION</span>
              <span class="tcg-type-sub">${card.id === 'action_flee' ? 'Escape 🏃' : isAtk ? `Attack ${getDerivedStatIcon('atk', 'header-icon')}` : `Defense ${getDerivedStatIcon('def', 'header-icon')}`}</span>
            </div>
            <span class="tcg-ap-bubble">${card.apCost} AP</span>
          </div>
          <div class="tcg-header-title">
            <span class="tcg-name action-name">${card.name}</span>
          </div>
        </header>
        <div class="tcg-art-spacer"></div>
        <div class="tcg-textbox action-text">
          <div class="tcg-action-effect">${cardText(card, stats, state)}</div>
        </div>
        <footer class="tcg-footer">
          <span class="tcg-card-num">${card.cardNumber ?? (isAtk ? 'ATK' : 'DEF')}</span>
          <span class="tcg-class-tag">${card.classId.toUpperCase()}</span>
        </footer>
      </div>
    </div>`;

    detailHtml = `
    <div class="inspect-detail-content">
      <div class="inspect-section">
        <h3>⚔️ Tabletop Offline Rules &amp; Stat Scaling</h3>
        <p class="muted">This card is designed to be printed for physical tabletop play. When playing offline, players compute their output using their character sheet's current Effective Stat divided by ${
          card.damageScalingDivisor ?? 2
        } rounded down:</p>
        <div class="inspect-formulas">
          ${scalingRows.join('')}
        </div>
      </div>

      <div class="inspect-section">
        <h3>📜 Lore &amp; Flavor Text</h3>
        <blockquote class="inspect-quote">
          &ldquo;${card.flavorText ?? 'A standard martial action honed in the grasslands realm.'}&rdquo;
        </blockquote>
      </div>

      <div class="inspect-section">
        <h3>🎲 Offline Card Rules</h3>
        <ul class="inspect-bullet-list">
          <li><b>AP Cost:</b> Costs <b>${card.apCost} Action Point(s)</b> from your turn's pool (player turn starts with 3 AP).</li>
          <li><b>Class Usability:</b> Exclusively usable by <b>${card.classId.toUpperCase()}</b> characters.</li>
          ${card.damageScalingStat ? `<li><b>Damage Scaling:</b> Scaled directly by <b>Effective ${card.damageScalingStat.toUpperCase()}</b>. Upgrading base stats at Shrines increases this damage permanently.</li>` : ''}
          ${card.blockScalingStat ? `<li><b>Block Absorption:</b> Block absorbs incoming monster damage first before any HP is deducted. Unused block expires at the end of the round.</li>` : ''}
          ${card.evasionScalingStat ? `<li><b>2d6 Combat Evasion:</b> Grants temporary EVA against incoming 2d6 monster attack rolls for the current combat round.</li>` : ''}
          ${card.accBonus ? `<li><b>Attack Accuracy:</b> Applies <b>${card.accBonus > 0 ? '+' : ''}${card.accBonus} ACC</b> on attack rolls, changing the required roll by ${Math.abs(card.accBonus)}.</li>` : ''}
        </ul>
      </div>
    </div>`;
  } else if (inspected.kind === 'monster') {
    const m = inspected.monster;
    title = `${m.name} (Monster Card Reference)`;
    const attackBonus = inspected.attackBonus ?? 0;

    // Pattern steps
    const patternHtml = m.pattern.map((step, i) => {
      const effDmg = step.damage > 0 ? step.damage + attackBonus : 0;
      const isBuffed = step.damage > 0 && attackBonus > 0;
      return `
      <div class="inspect-pattern-step ${isBuffed ? 'is-buffed-step' : ''}">
        <span class="pattern-turn">Turn ${i + 1}</span>
        <span class="pattern-intent-name"><b>${step.label}</b></span>
        ${step.poisonOnHit ? '<span>Poison on hit</span>' : ''}
        ${step.ignoreDef ? `<span>Ignore ${step.ignoreDef} DEF</span>` : ''}
        <span class="pattern-intent-desc">
          ${
            effDmg > 0
              ? `<span class="${isBuffed ? 'is-buffed-flashing' : ''}"><b>${effDmg}</b> ${step.damageType === 'magical' ? 'MATK' : 'DMG'}${
                  isBuffed ? ` <small class="muted">(Base ${step.damage} + ${attackBonus} Boon)</small>` : ''
                }</span>`
              : ''
          }${
            step.heal && step.heal > 0
              ? (effDmg > 0 ? ' &middot; ' : '') + '+' + step.heal + ' HP'
              : ''
          }${
            step.block > 0
              ? (effDmg > 0 || (step.heal && step.heal > 0) ? ' &middot; ' : '') + '+' + step.block + ' Block'
              : ''
          }${
            step.evaBonus && step.evaBonus > 0
              ? (effDmg > 0 || (step.heal && step.heal > 0) || step.block > 0 ? ' &middot; ' : '') + '+' + step.evaBonus + ' EVA'
              : ''
          }${
            step.accBonus && step.accBonus > 0
              ? (effDmg > 0 || (step.heal && step.heal > 0) || step.block > 0 || (step.evaBonus && step.evaBonus > 0) ? ' &middot; ' : '') + '+' + step.accBonus + ' ACC'
              : ''
          }${
            step.heroStatDebuff ? heroHexIntentHtml(step) : step.heroEvaDebuff && step.heroEvaDebuff > 0
              ? (effDmg > 0 || (step.heal && step.heal > 0) || step.block > 0 || (step.evaBonus && step.evaBonus > 0) || (step.accBonus && step.accBonus > 0) ? ' &middot; ' : '') + '-' + step.heroEvaDebuff + ' Hero EVA (' + (step.heroEvaDebuffDuration ?? 2) + ' turns)'
              : ''
          }${
            !step.heroStatDebuff && !step.poisonOnHit && effDmg === 0 && step.block === 0 && (!step.heal || step.heal === 0) && (!step.evaBonus || step.evaBonus === 0) && (!step.accBonus || step.accBonus === 0) && (!step.heroEvaDebuff || step.heroEvaDebuff === 0) ? 'Idle' : ''
          }
        </span>
      </div>`;
    }).join('');

    cardHtml = fullCreatureCardHtml({
      monster: m,
      attackBonus,
      className: 'tcg-inspect-card',
      artWindowClassName: 'full-inspect-art',
    });

    detailHtml = `
    <div class="inspect-detail-content">
      <div class="inspect-section">
        <h3>👹 Encounter &amp; Spawn Profile</h3>
        <p><b>Level:</b> ${m.level} &middot; <b>Max HP:</b> ${m.maxHp} &middot; <b>ACC:</b> ${m.acc ?? 1} &middot; <b>EVA:</b> ${m.eva ?? 0}</p>
        <p><b>Spawn Terrains:</b> ${(m.spawnTerrains ?? []).map(terrain => terrain === 'grasslands' ? 'Grasslands 🌿' : terrain === 'forest' ? 'Forests 🌲' : terrain === 'swamp' ? 'Swamps 🪷' : terrain === 'cave' ? 'Caves 🪨' : terrain === 'underground' ? 'Underground ⛏️' : terrain).join(', ')}</p>
        <p><b>Rewards upon Defeat:</b> <span class="reward-chip sp">${getResourceIcon('sp', 'chip-icon')} +${m.statPointReward} Stat Points</span> <span class="reward-chip gold">${getResourceIcon('gold', 'chip-icon')} +${m.goldReward} Gold</span></p>
      </div>

      <div class="inspect-section inspect-boons-section">
        <h3>✨ Active Boons &amp; Combat Enhancements</h3>
        ${
          inspected.activeBoons && inspected.activeBoons.length > 0
            ? inspected.activeBoons
                .map(
                  (b) => `
              <div class="inspect-boon-card active">
                <div class="boon-card-header">
                  <span class="boon-card-icon">🔥</span>
                  <span class="boon-card-title">${b.name}</span>
                  <span class="boon-card-pill is-buffed-flashing">${b.value}</span>
                </div>
                <p class="boon-card-desc">${b.description}</p>
              </div>`
                )
                .join('')
            : '<p class="muted">No temporary combat boons currently active on this creature.</p>'
        }
      </div>

      <div class="inspect-section">
        <h3>🔄 Cycling AI Attack Pattern</h3>
        <p class="muted">The monster cycles through these moves in order every combat round:</p>
        <div class="inspect-patterns">
          ${patternHtml}
        </div>
      </div>

      <div class="inspect-section">
        <h3>📜 Lore &amp; Flavor Text</h3>
        <blockquote class="inspect-quote">
          &ldquo;${m.flavorText ?? 'A creature dwelling in the tall plains.'}&rdquo;
        </blockquote>
      </div>

      <div class="inspect-section">
        <h3>🎲 Tabletop 2d6 Combat Rules</h3>
        <ul class="inspect-bullet-list">
          <li><b>Attack Roll:</b> Rolls <code>2x 1d6</code> (2d6). Probability bell-curve gears towards 7 (result range 2–12). Rolls of <b>&ge; 7</b> hit; <b>&le; 6</b> miss.</li>
          <li><b>Net Accuracy &amp; Dodge:</b> <code>Net ACC = Attacker ACC (${m.acc ?? 1}) - Target EVA</code>. Each +1 net ACC lowers the required dice roll to hit by 1 (e.g. 1 bonus ACC hits on 6+).</li>
          <li><b>Criticals &amp; Total Misses:</b> <b>Snake Eyes</b> (1+1=2) is an automatic total miss. <b>Boxcars</b> (6+6=12) is an automatic critical hit dealing <b>+50% bonus ATK damage</b>!</li>
          <li><b>Inscribed Stat Points:</b> Defeating this monster awards <b>+${m.statPointReward} SP</b>. SP is converted into permanent Base Stats exclusively at Sacred Shrines.</li>
        </ul>
      </div>
    </div>`;
  } else if (inspected.kind === 'adventure') {
    const card = inspected.card;
    const cardName = getAdventureCardName(card);
    title = `${cardName} (Land Card Reference)`;
    const rasterArt = getAdventureRasterArtPath(card);
    const terrainIcon = card.terrain === 'forest' ? '🌲' : card.terrain === 'swamp' ? '🪷' : card.terrain === 'grasslands' ? '🌿' : '✦';
    const templateClass = card.terrain === 'forest'
      ? 'tcg-template-forest'
      : card.terrain === 'swamp'
      ? 'tcg-template-swamp'
      : card.terrain === 'start'
      ? 'tcg-template-start'
      : 'tcg-template-grassland';
    const typeLine = card.terrain === 'start'
      ? 'Land — Starting Crossroads'
      : `Land — ${cardName}`;

    cardHtml = `
    <div class="tcg-card tcg-adventure ${templateClass} tcg-inspect-card">
      <div class="tcg-inner-frame">
        <header class="tcg-header tcg-land-header">
          <div class="tcg-title-left">
            <span class="tcg-name">${cardName}</span>
          </div>
          <div class="tcg-header-right">
            ${card.level > 0 ? `<span class="adv-level-badge">Lvl ${card.level}</span>` : ''}
            <span class="tcg-spawn-badge ${card.terrain === 'forest' ? 'forest' : card.terrain === 'swamp' ? 'swamp' : 'grass'}">${terrainIcon}</span>
          </div>
        </header>

        <div class="tcg-art-window adv-art-window full-inspect-art">
          <img src="${rasterArt}" alt="${cardName}" class="tcg-art-raster adventure-raster" />
        </div>

        <div class="tcg-art-spacer adv-art-spacer"></div>

        <div class="tcg-textbox">
          <p class="adv-inspect-summary">
            ${
              card.hasHostile
                ? `<b>Encounter Zone (Level ${card.level}):</b> Draws monsters from the Monster Deck matching ${card.terrain === 'forest' ? 'Forests 🌲' : card.terrain === 'swamp' ? 'Swamps 🪷' : 'Grasslands 🌿'} until total monster level &ge; ${card.level}.`
                : card.hasVillage
                ? `<b>Village Haven:</b> Sanctuary offering Rest (Inn), Shop (Weapons, Armor, Accessories), and Card Training (Drafting / Removal).`
                : card.hasShrine
                ? `<b>Sacred Altar:</b> Spend Stat Points to permanently upgrade Base Stats (cost: <code>(baseStat + 1)&sup2;</code>), and pray for 1 map-temporary divine boon.`
                : `<b>Safe Open Land:</b> Travel through peaceful open terrain without monster ambush.`
            }
          </p>
          ${card.flavorText ? `<p class="tcg-flavor-text">${card.flavorText}</p>` : ''}
        </div>
      </div>
    </div>`;

    detailHtml = `
    <div class="inspect-detail-content">
      <div class="inspect-section">
        <h3>🗺️ ${cardName} &middot; Tabletop Land Rules</h3>
        <p><b>Card Classification:</b> ${typeLine}</p>
        <p><b>Collector Number:</b> ${card.cardNumber ?? 'ADV · #001'}</p>
        <p><b>Terrain Region:</b> ${card.terrain === 'forest' ? 'Forest 🌲' : card.terrain === 'swamp' ? 'Swamp 🪷' : card.terrain === 'grasslands' ? 'Grasslands 🌿' : 'Crossroads ✦'}</p>
        <p><b>Encounter &amp; Amenity Rules:</b> ${
          card.hasHostile
            ? `Stepping onto this card initiates an encounter. Monsters are drawn from the Monster Deck matching <code>spawnTerrains.includes('${card.terrain}')</code> until total creature level &ge; ${card.level}.`
            : card.hasVillage
            ? 'Safe resting haven. Resting restores full HP for 5 gold + 1 gold per 10 missing HP (rounded down). Shop allows equipment upgrades with live before/after stat delta previews. Training allows drafting 1 of 3 cards or removing an unwanted card.'
            : card.hasShrine
            ? 'Only place where Stat Points (earned from defeating monsters) can be converted into permanent Base Stats. Cost to upgrade from Base B to B+1 is (B+1)^2 SP (e.g. Base 1 to 2 costs 4 SP, Base 4 to 5 costs 25 SP). Also allows praying for 1 map-temporary divine favor.'
            : 'Safe territory. No monsters spawn. Player safely advances towards the Turn 15 Boss.'
        }</p>
      </div>

      <div class="inspect-section">
        <h3>📜 Lore &amp; Field Notes</h3>
        <blockquote class="inspect-quote">
          &ldquo;${card.flavorText ?? 'An untamed expanse of the realm where wanderers make their choice.'}&rdquo;
        </blockquote>
      </div>

      <div class="inspect-section">
        <h3>🎲 Tabletop Adventure Board Architecture</h3>
        <ul class="inspect-bullet-list">
          <li><b>Vision Cone:</b> Revealed in a 3-row inverted pyramid cone (Row 1: 2 choices, Row 2: 3 lookahead cards).</li>
          <li><b>9-Card Lagging Conservation:</b> Moving to row R sweeps only Row R-1 to discard, keeping up to 9 cards on the board across Rows R, R+1, and R+2.</li>
          <li><b>Physical Print Format:</b> Official standard 5:7 aspect ratio (2.5&quot; &times; 3.5&quot;) with raster art and full tabletop mechanics.</li>
        </ul>
      </div>
    </div>`;
  } else if (inspected.kind === 'item') {
    const item = inspected.item;
    title = `${item.name} (Physical TCG Item Reference)`;
    const slotIcon =
      item.category === 'weapon'
        ? getSlotIcon('weapon', 'badge-icon')
        : item.category === 'armor'
        ? getSlotIcon('armor', 'badge-icon')
        : item.category === 'accessory'
        ? getSlotIcon('accessory', 'badge-icon')
        : '🧪';
    const isEquip = item.category !== 'consumable';
    const typeLine = isEquip
      ? `Equipment — ${item.category.charAt(0).toUpperCase() + item.category.slice(1)}`
      : 'Item — Consumable';

    cardHtml = renderTcgItemCard(item, 'tcg-inspect-card');

    detailHtml = `
    <div class="inspect-detail-content">
      <div class="inspect-section">
        <h3>${slotIcon} ${item.name} &middot; Equipment Profile</h3>
        <p><b>Classification:</b> ${typeLine} &middot; <b>Level:</b> ${item.level ?? 1}</p>
        <p><b>Base Buy Price:</b> ${item.buyPrice} Gold &middot; <b>Resell Value:</b> ${item.sellPrice} Gold</p>
      </div>

      <div class="inspect-section">
        <h3>⚔️ Tabletop Stat Mechanics</h3>
        <p class="muted">Live character calculations &amp; physical rules:</p>
        <ul class="inspect-bullet-list">
          ${item.gearBonus?.atk ? `<li><b>Physical ATK (+${item.gearBonus.atk}):</b> Adds +${item.gearBonus.atk} damage to all physical attacks. (Hero ATK = &lfloor;STR / 2&rfloor; + Weapon ATK).</li>` : ''}
          ${item.gearBonus?.acc ? `<li><b>Accuracy (+${item.gearBonus.acc} ACC):</b> Adds +${item.gearBonus.acc} to hero attack rolls.</li>` : ''}
          ${item.gearBonus?.def ? `<li><b>Physical DEF (+${item.gearBonus.def}):</b> Reduces incoming physical damage by ${item.gearBonus.def} per hit. (Hero DEF = &lfloor;STR / 5&rfloor; + &lfloor;AGI / 3&rfloor; + Armor DEF).</li>` : ''}
          ${item.gearBonus?.matk ? `<li><b>Magical ATK &amp; DEF (+${item.gearBonus.matk} MATK, +${item.gearBonus.mdef} MDEF):</b> Boosts spell scaling and magic defense. (Hero MATK = &lfloor;INT / 2&rfloor; + Weapon, Hero MDEF = &lfloor;INT / 5&rfloor; + Armor MDEF).</li>` : ''}
          ${item.gearBonus?.eva ? `<li><b>Evasion (+${item.gearBonus.eva}):</b> Adds +${item.gearBonus.eva} EVA to evade incoming 2d6 attack rolls.</li>` : ''}
          ${item.gearBonus?.pen ? `<li><b>Penetration (+${item.gearBonus.pen} PEN):</b> Physical hero attacks ignore up to ${item.gearBonus.pen} of an enemy's natural DEF before temporary Block applies. Magical attacks still use MDEF and do not gain PEN.</li>` : ''}
          ${item.statBonus?.str ? `<li><b>Strength (+${item.statBonus.str} STR):</b> Increases Effective STR by ${item.statBonus.str}, granting +${item.statBonus.str * 2} Max HP and melee damage scaling.</li>` : ''}
          ${item.statBonus?.int ? `<li><b>Intellect (+${item.statBonus.int} INT):</b> Increases Effective INT by ${item.statBonus.int}, boosting spell damage, MATK, and MDEF.</li>` : ''}
          ${item.statBonus?.agi ? `<li><b>Agility (+${item.statBonus.agi} AGI):</b> Increases Effective AGI by ${item.statBonus.agi}, boosting baseline Evasion.</li>` : ''}
          ${item.healAmount ? `<li><b>Consumable Elixir:</b> Restores ${item.healAmount} HP immediately when used from backpack.</li>` : ''}
          ${item.luckyCharmGoldBonus ? `<li><b>Fortune Blessing:</b> Produces an extra <code>1d6 - 1</code> Gold (0–5 Gold) after every victorious combat encounter!</li>` : ''}
        </ul>
      </div>

      <div class="inspect-section">
        <h3>📜 Lore &amp; Field Notes</h3>
        <blockquote class="inspect-quote">
          &ldquo;${item.flavorText ?? item.description}&rdquo;
        </blockquote>
      </div>

      <div class="inspect-section">
        <h3>🎲 Tabletop Gear Architecture</h3>
        <ul class="inspect-bullet-list">
          <li><b>Equipment Slots:</b> 1 item equipped per slot (Weapon, Armor, Accessory). Equipping a new item automatically moves the replaced gear to your backpack.</li>
          <li><b>Shop Reselling:</b> Replaced gear stored in your backpack can be sold at any Village Shop for 50% gold value.</li>
          <li><b>Physical Print Format:</b> Official standard 5:7 aspect ratio (2.5&quot; &times; 3.5&quot;) collectible item card.</li>
        </ul>
      </div>
    </div>`;
  }

  return `
  <div class="modal-backdrop card-inspect-backdrop" data-action="close-inspect-backdrop">
    <div class="modal card-inspect-modal">
      <div class="inspect-header">
        <div>
          <h2>${title}</h2>
          <p class="muted">Right-click or long-press (2s) anywhere to inspect full physical card details.</p>
        </div>
        <button class="btn mini" data-action="close-inspect" aria-label="Close card inspect">&times; Close</button>
      </div>

      <div class="inspect-body">
        ${cardHtml ? `<div class="inspect-card-wrap">${cardHtml}</div>` : ''}
        ${detailHtml}
      </div>

      <div class="inspect-footer">
        <button class="btn primary" data-action="close-inspect">Back to Game</button>
      </div>
    </div>
  </div>`;
}

const STAT_DESCRIPTIONS: Record<
  StatKey,
  {
    name: string;
    role: string;
    derivedRules: (effVal: number, derived: DerivedCombatStats) => string[];
  }
> = {
  str: {
    name: 'Strength',
    role: 'Physical muscle power, resilience and martial force',
    derivedRules: (eff, derived) => [
      `<b>Max Health (Max HP):</b> Increases Hero Max HP by <b>+2 HP</b> per Effective STR (<code>Max HP = 10 + Effective STR &times; 2</code>). Current: <b>${10 + eff * 2} Max HP</b>.`,
      `<b>Physical Attack (ATK):</b> Grants <code>&lfloor;STR / 2&rfloor; + &lfloor;DEX / 3&rfloor; + Weapon ATK</code>. Adds flat bonus damage to physical attack cards (e.g. <i>Melee ATK</i>). Current Physical ATK: <b>${derived.atk} ATK</b> (STR contributes <code>&lfloor;${eff} / 2&rfloor; = ${Math.floor(eff / 2)}</code>).`,
      `<b>Physical Defense (DEF):</b> Grants <code>&lfloor;STR / 5&rfloor; + &lfloor;AGI / 3&rfloor; + Armor DEF</code>. Flatly absorbs damage from all non-magical enemy attacks when hit. Current Physical DEF: <b>${derived.def} DEF</b> (STR contributes <code>&lfloor;${eff} / 5&rfloor; = ${Math.floor(eff / 5)}</code>).`,
    ],
  },
  dex: {
    name: 'Dexterity',
    role: 'Precision, coordination, attack accuracy and martial finesse',
    derivedRules: (eff, derived) => [
      `<b>Combat Accuracy (ACC):</b> Grants <b>1 ACC for every 2 Effective DEX</b> (<code>&lfloor;DEX / 2&rfloor;</code>). Current: <b>${derived.acc} ACC</b> (<code>&lfloor;${eff} / 2&rfloor; = ${Math.floor(eff / 2)}</code>).`,
      `<b>Physical Attack Contribution:</b> Increases Physical ATK by <b>+1 for every 3 Effective DEX</b> (<code>&lfloor;DEX / 3&rfloor;</code>). Current DEX ATK bonus: <b>+${Math.floor(eff / 3)} ATK</b>.`,
      `<b>Tabletop 2d6 Attack Rolls:</b> Determines roll threshold against target Evasion (<code>Net ACC = Attacker ACC - Target EVA</code>; Needed Roll = <code>5 - Net ACC</code>). Each +1 Net ACC lowers the required 2d6 roll to hit by 1 (e.g. +2 Net ACC hits on 3+).`,
    ],
  },
  agi: {
    name: 'Agility',
    role: 'Reflexes, evasion, footwork and physical defense',
    derivedRules: (eff, derived) => [
      `<b>Combat Evasion (EVA):</b> Grants <b>1 EVA for every 2 Effective AGI</b> (<code>&lfloor;AGI / 2&rfloor; + Gear EVA</code>). Current: <b>${derived.eva} EVA</b> (Base <code>&lfloor;${eff} / 2&rfloor; = ${Math.floor(eff / 2)}</code> + Gear).`,
      `<b>Physical Defense Contribution:</b> Adds <b>+1 Physical DEF for every 3 Effective AGI</b> (<code>&lfloor;AGI / 3&rfloor;</code>). Current AGI DEF bonus: <b>+${Math.floor(eff / 3)} DEF</b>.`,
      `<b>Tabletop 2d6 Monster Attack Dodge:</b> Each point of EVA directly forces attacking creatures to roll higher on their 2d6 attack rolls to hit you (e.g. facing a 2 ACC monster with 2 EVA = 0 Net ACC, monster needs 5+ to hit; with 3 EVA, monster needs 6+).`,
    ],
  },
  int: {
    name: 'Intellect',
    role: 'Arcane acumen, spellcraft, magic resilience and battle action capacity',
    derivedRules: (eff, derived) => [
      `<b>Max Action Points (ACT):</b> Starts at <b>3 Base AP</b> and increases by <b>+1 ACT for every 5 Effective INT</b> (<code>3 + &lfloor;INT / 5&rfloor;</code>). Current: <b>${derived.act} Max AP</b> in battle (Base 3 + <code>&lfloor;${eff} / 5&rfloor; = ${Math.floor(eff / 5)}</code>).`,
      `<b>Magical Attack (MATK):</b> Grants <code>&lfloor;INT / 2&rfloor; + Weapon MATK</code>. Adds flat bonus damage to magical spell cards (e.g. <i>Fireball ATK</i>). Current MATK: <b>${derived.matk} MATK</b> (Base <code>&lfloor;${eff} / 2&rfloor; = ${Math.floor(eff / 2)}</code> + Weapon).`,
      `<b>Magical Defense (MDEF):</b> Grants <code>&lfloor;INT / 5&rfloor; + Armor MDEF</code> (increases by 1 for every 5 INT). Current MDEF: <b>${derived.mdef} MDEF</b> (INT contributes <code>&lfloor;${eff} / 5&rfloor; = ${Math.floor(eff / 5)}</code>).`,
    ],
  },
  cha: {
    name: 'Charisma',
    role: 'Charm, bargaining power and social presence',
    derivedRules: (eff) => [
      `<b>Village Shop Discount (DISC):</b> Grants a <b>5% price discount</b> per Effective CHA on all goods purchased at Village Shops (minimum 1 Gold). Current discount: <b>-${eff * 5}% off all items</b>.`,
      `<b>Economic Compounding:</b> Allows heroes to acquire high-tier weapons, armor, accessories, and health potions at significantly lower gold costs.`,
      `<b>Future Encounters:</b> Will be utilized for peaceful path events, wandering merchant negotiations, and faction dialogue.`,
    ],
  },
  luk: {
    name: 'Luck',
    role: 'Serendipity, battle spoils and critical hit mastery',
    derivedRules: (eff, derived) => [
      `<b>Critical Hit Range:</b> Improves critical hit threshold by <b>1 for every 10 Effective LUK</b> (<code>12 - &lfloor;LUK / 10&rfloor;</code>). Base threshold is 12 (Boxcars [6, 6] = 2.8%). At 10 LUK: rolls of 11+ crit (8.3%). At 20 LUK: rolls of 10+ crit (16.7%). Current critical threshold: <b>Rolls ${derived.critThreshold ?? 12}+</b>. Critical hits deal +50% ATK damage!`,
      `<b>Victory Gold Spoils:</b> Grants an additional <code>&lfloor;LUK / 2&rfloor; Gold</code> upon winning every battle. Current bonus: <b>+${Math.floor(eff / 2)} Gold</b> per victorious encounter.`,
      `<b>Undiscovered Terrain:</b> Each <b>5 Effective LUK</b> adds <code>+1</code> to the 1d6 exploration result before resolving outcomes. Current exploration bonus: <b>+${Math.floor(eff / 5)}</b>. A modified result of <b>6 or more</b> finds Treasure; otherwise a result at or below terrain level is an Ambush.`,
      `<b>Fortune Accessories:</b> Directly synergizes with items like the <i>Goldstar</i> (produces 1d6 - 1 bonus gold per victory) and special event fortune checks.`,
    ],
  },
};

export function statInspectModal(stat: StatKey, state: RunState): string {
  const eff = getEffectiveStatsFromState(state);
  const gear = computeGearBonuses(state.equippedGear);
  const derived = getDerivedCombatStats(eff, state.equippedGear);
  const sp = state.playerResources?.statPoints ?? 0;
  const base = state.playerBaseStats[stat];
  const classBonus = state.playerClassBonuses[stat];
  const blessing = state.playerBlessingBonuses?.[stat] ?? 0;
  const gearBonus = gear[stat] ?? 0;
  const cost = getBaseStatUpgradeCost(base);
  const info = STAT_DESCRIPTIONS[stat];
  const className = state.playerClass === 'wizard' ? 'Wizard' : state.playerClass === 'rogue' ? 'Rogue' : 'Fighter';

  return `
  <div class="modal-backdrop stat-inspect-backdrop" data-action="close-inspect-backdrop">
    <div class="modal stat-inspect-modal">
      <div class="inspect-header">
        <div class="stat-inspect-title-group">
          <span class="stat-inspect-badge-icon">${getStatIcon(stat, 'badge-icon')}</span>
          <div>
            <h2>${info.name} (${stat.toUpperCase()}) Attribute Profile</h2>
            <p class="muted">${info.role}</p>
          </div>
        </div>
        <button class="btn mini" data-action="close-inspect" aria-label="Close stat inspect">&times; Close</button>
      </div>

      <div class="inspect-body stat-inspect-body">
        <!-- 1. Full computation to get the final value -->
        <div class="inspect-section">
          <h3>📊 Effective Stat Value Breakdown</h3>
          <div class="stat-calc-box">
            <div class="stat-calc-header">
              <span class="calc-label">Effective ${stat.toUpperCase()} Value:</span>
              <span class="calc-hero-val">${getStatIcon(stat, 'stat-icon')} <b>${eff[stat]}</b></span>
            </div>
            <div class="stat-calc-formula">
              <code>Effective ${stat.toUpperCase()} = Base (${base}) + Class Bonus (+${classBonus}) ${blessing > 0 ? `+ Blessing (+${blessing}) ` : ''}${gearBonus > 0 ? `+ Gear (+${gearBonus}) ` : ''}= ${eff[stat]}</code>
            </div>
            <div class="stat-calc-components">
              <div class="calc-row">
                <span class="comp-name">Base Stat Level:</span>
                <span class="comp-val"><b>${base}</b> <small class="muted">(permanently upgraded with Stat Points at Shrines)</small></span>
              </div>
              <div class="calc-row">
                <span class="comp-name">${className} Class Archetype Bonus:</span>
                <span class="comp-val"><b>+${classBonus}</b> <small class="muted">(innate class archetype bonus)</small></span>
              </div>
              ${
                blessing > 0
                  ? `<div class="calc-row">
                <span class="comp-name">Shrine Altar Blessing:</span>
                <span class="comp-val"><b>+${blessing}</b> <small class="muted">(temporary boon for the current map)</small></span>
              </div>`
                  : ''
              }
              ${
                gearBonus > 0
                  ? `<div class="calc-row">
                <span class="comp-name">Equipped Gear Bonus:</span>
                <span class="comp-val"><b>+${gearBonus}</b> <small class="muted">(from equipped weapon, armor or accessory)</small></span>
              </div>`
                  : ''
              }
            </div>
          </div>
        </div>

        <!-- 2. Derived bonus stat produced -->
        <div class="inspect-section">
          <h3>⚔️ Derived Bonuses &amp; Combat Scaling</h3>
          <ul class="inspect-bullet-list">
            ${info.derivedRules(eff[stat], derived).map((r) => `<li>${r}</li>`).join('')}
          </ul>
        </div>

        <!-- 3. Next SP required to level -->
        <div class="inspect-section">
          <h3>⛩️ Base Stat Evolution &amp; Shrine Upgrade Cost</h3>
          <div class="stat-upgrade-cost-box">
            <div class="cost-row">
              <span class="cost-label">Current Base Level:</span>
              <span class="cost-val">Base <b>${base}</b></span>
            </div>
            <div class="cost-row">
              <span class="cost-label">Next Level Target:</span>
              <span class="cost-val">Base <b>${base + 1}</b></span>
            </div>
            <div class="cost-row highlight-sp">
              <span class="cost-label">Next SP Required:</span>
              <span class="sp-cost-badge">${getResourceIcon('sp', 'chip-icon')} <b>${cost} Stat Points</b></span>
            </div>
            <div class="cost-row">
              <span class="cost-label">Shrine Upgrade Formula:</span>
              <code class="formula-code">(currentBase + 1)&sup2; = (${base} + 1)&sup2; = ${cost} SP</code>
            </div>
            <div class="cost-row">
              <span class="cost-label">Your Current Stat Points:</span>
              <span class="player-sp-val">${getResourceIcon('sp', 'chip-icon')} <b>${sp} SP</b> ${
                sp >= cost
                  ? '<span class="chip up">Ready to upgrade!</span>'
                  : `<span class="chip down">Need ${cost - sp} more SP</span>`
              }</span>
            </div>
          </div>
          <p class="muted shrine-upgrade-note">
            <i>Notice:</i> Base Stats cannot be leveled in the open field. Upgrades are performed exclusively at <b>Sacred Shrines</b> (<code>hasShrine: true</code>) or during the initial Turn 0 adventure preparation.
          </p>
        </div>
      </div>

      <div class="inspect-footer">
        <button class="btn primary" data-action="close-inspect">Back to Game</button>
      </div>
    </div>
  </div>`;
}

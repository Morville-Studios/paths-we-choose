import { CLASS_CATALOG } from '../data/classes';
import {
  getMonsterRarity,
  MONSTER_TEMPLATES,
} from '../data/monsters';
import { ShopItemTemplate } from '../data/shopItems';
import { ADVENTURE_CARD_ORDER } from '../data/stages';
import { getHeroStatDebuffMods } from '../core/combat';
import { getVoidCards } from '../data/combatCards';
import { coordToKey } from '../core/grid';
import {
  getMonsterIllustration,
  getItemRasterArtPath,
  getAdventurerRasterArtPath,
} from './cardArt';
import {
  getStatIcon,
  getDerivedStatIcon,
  getSlotIcon,
  getResourceIcon,
} from './icons';
import { renderActionCardHtml } from './actionCard';
import {
  getAdventureCardName as getSharedAdventureCardName,
  renderAdventureCardHtml,
} from './adventureCard';
import { groupByCount } from './grouping';
import { publicAsset } from './publicAsset';
import {
  getEffectiveStatsFromState,
  getFighterBerzerkBonus,
  getDerivedCombatStats,
} from '../core/stats';
import {
  ActiveCombatState,
  AdventureCard,
  CharacterStats,
  ClassId,
  CombatCardDef,
  HeroStatDebuff,
  PlacedCardNode,
  RunState,
  ShopItemDef,
  MonsterCard,
  STATS,
} from '../core/types';

import {
  PileType,
  QteBarOptions,
  PendingCardPlay,
  PendingTrainingAction,
  PendingDiceRoll,
  PendingSaveAction,
  PendingShrineAction,
  UiState,
  hasBlockingUiOverlay,
} from './types';
import { saveModalHtml } from './modals/saveModal';
import { renderQteHitCheckBarHtml } from './components/qteBar';
import {
  getPlayerClassName,
  CLASS_CAROUSEL_ORDER,
  classDetailPanelContentHtml,
  updateClassCarouselDom,
  renderClassSelect,
} from './screens/classSelect';

export type {
  PileType,
  QteBarOptions,
  PendingCardPlay,
  PendingTrainingAction,
  PendingDiceRoll,
  PendingSaveAction,
  PendingShrineAction,
  UiState,
};
export {
  hasBlockingUiOverlay,
  renderQteHitCheckBarHtml,
  getPlayerClassName,
  CLASS_CAROUSEL_ORDER,
  classDetailPanelContentHtml,
  updateClassCarouselDom,
  renderClassSelect,
};

const ADVENTURE_CARD_ORDER_INDEX = new Map(
  ADVENTURE_CARD_ORDER.map((cardNumber, index) => [cardNumber, index]),
);

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

import { renderWelcome } from './screens/welcome';
import {
  getMonsterLowestTerrain,
  getMonsterLowestTerrainTier,
  getBestiaryMonstersForTerrain,
  getBestiaryBosses,
  getArmoryItemsForCategory,
  renderGuideModal,
} from './screens/guide';
import { cardInspectModal, statInspectModal, gameLogModal } from './modals/inspectModals';
import {
  getMonsterCarouselClass,
  updateMonsterCarouselDom,
  creatureHeaderHtml,
  creatureFooterHtml,
  fullCreatureCardHtml,
  parseCombatLogEntry,
  renderCombatLogEntries,
  heroHexIntentHtml,
  getHandCarouselIndex,
  updateHandCarouselDom,
  combatViewHtml,
  combatModal,
  fleeConfirmModal,
  combatDiceRollModal,
  combatConfirmModal,
} from './screens/combatView';
import {
  eventAdventureCardHtml,
  statUpgradeWidgetHtml,
  welcomePrepareModal,
  explorationModal,
  victoryModal,
  shrineModal,
  shrineConfirmModal,
} from './modals/eventModals';
import {
  villageViewHtml,
  trainingConfirmModal,
} from './screens/villageView';
export {
  getMonsterCarouselClass,
  updateMonsterCarouselDom,
  creatureHeaderHtml,
  creatureFooterHtml,
  fullCreatureCardHtml,
  parseCombatLogEntry,
  renderCombatLogEntries,
  heroHexIntentHtml,
  getHandCarouselIndex,
  updateHandCarouselDom,
  combatViewHtml,
  combatModal,
  fleeConfirmModal,
  combatDiceRollModal,
  combatConfirmModal,
  eventAdventureCardHtml,
  statUpgradeWidgetHtml,
  explorationModal,
  victoryModal,
  villageViewHtml,
  renderWelcome,
  getMonsterLowestTerrain,
  getMonsterLowestTerrainTier,
  getBestiaryMonstersForTerrain,
  getBestiaryBosses,
  getArmoryItemsForCategory,
  renderGuideModal,
  cardInspectModal,
  statInspectModal,
  gameLogModal,
};
function voidBossCards(): MonsterCard[] {
  return Object.values(MONSTER_TEMPLATES)
    .filter((monster) => monster.isBoss)
    .map((monster) => ({ ...monster, id: `void_${monster.templateId}` }));
}

function voidHeroClassIds(playerClass: ClassId | null): ClassId[] {
  return CLASS_CAROUSEL_ORDER.filter((classId) => classId !== playerClass);
}

export function voidCardCount(state: RunState): number {
  return getVoidCards().length
    + voidBossCards().length
    + voidHeroClassIds(state.playerClass).length
    + (state.voidCards?.length ?? 0)
    + (state.monsterVoid?.length ?? 0);
}

export function monsterRarityLabel(monster: Pick<MonsterCard, 'isBoss' | 'rarity'>): string {
  if (monster.isBoss) return 'Boss';
  const rarity = getMonsterRarity(monster);
  return rarity[0].toUpperCase() + rarity.slice(1);
}

export function monsterRaritySymbolHtml(monster: Pick<MonsterCard, 'isBoss' | 'rarity'>, className = ''): string {
  if (monster.isBoss) return '';
  const rarity = getMonsterRarity(monster);
  const label = monsterRarityLabel(monster);
  return `<span class="tcg-set-symbol is-${rarity} ${className}" title="New Paths · ${label}" aria-label="New Paths set symbol: ${label} rarity">
    <img src="${publicAsset(`icons/new-paths-${rarity}.svg`)}" alt="" aria-hidden="true" />
  </span>`;
}

// ---------------------------------------------------------------------------
// Play area
// ---------------------------------------------------------------------------

export function getAdventureCardName(card: AdventureCard): string {
  return getSharedAdventureCardName(card);
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
  const className = `${status} ${card.hasHostile ? 'is-hostile is-encounter' : ''} ${
    card.hasVillage ? 'is-village' : ''
  } ${card.hasShrine ? 'is-shrine' : ''} ${card.terrain === 'start' ? 'is-start' : ''}`;
  const action = interactive ? `data-action="choose" data-col="${coord.col}" data-row="${coord.row}"` : '';
  const attributes = `style="--dx:${dx};--dy:${dy}" ${action}
    data-inspect-kind="adventure" data-board-key="${coordToKey(coord)}" data-card-id="${card.id}" data-node-col="${coord.col}" data-node-row="${coord.row}" title="${cardName}"`;

  return renderAdventureCardHtml(card, {
    tag: interactive ? 'button' : 'div',
    className,
    attributes,
    centerHtml: isCurrent ? playerTokenHtml(state.playerClass) : '',
  });
}

function statPanelHtml(state: RunState): string {
  const eff = getEffectiveStatsFromState(state);
  const berzerkBonus = getFighterBerzerkBonus(
    state.playerClass,
    state.playerResources?.hp,
    state.playerResources?.maxHp
  );
  const combat: ActiveCombatState | undefined = state.activeHook.type === 'COMBAT' ? state.activeHook.combat : undefined;
  const roundEva = combat ? combat.playerEvasionMod : 0;
  const derived = getDerivedCombatStats(eff, state.equippedGear, roundEva, berzerkBonus, state.divineProtection ?? 0);
  if (combat) {
    const heroDebuffs = getHeroStatDebuffMods(combat);
    derived.acc += (combat.playerAccMod ?? 0) + heroDebuffs.acc;
    derived.eva += heroDebuffs.eva;
    derived.def = Math.max(0, derived.def + heroDebuffs.def);
    derived.mdef = Math.max(0, derived.mdef + heroDebuffs.mdef);
  }
  const className = getPlayerClassName(state.playerClass);
  const heroArt = getAdventurerRasterArtPath(state.playerClass);
  const res = state.playerResources;
  const hp = res?.hp ?? 0;
  const maxHp = res?.maxHp ?? 1;
  const hpPct = Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100)));
  const blockText = combat && combat.playerBlock > 0 ? ` (+${combat.playerBlock} &#128737;)` : '';

  return `
  <div class="stat-panel">
    <!-- Hero Resources (Gold & SP) above Health Bar -->
    <div class="hero-sidebar-resources">
      <div class="hero-res-chip gold" title="Current Gold">${getResourceIcon('gold', 'chip-icon')} <b>${res?.gold ?? 0} Gold</b></div>
      <div class="hero-res-chip sp" title="Current Stat Points">${getResourceIcon('sp', 'chip-icon')} <b>${res?.statPoints ?? 0} SP</b></div>
    </div>

    <!-- Hero Health & Vitals Bar above Portrait & Stats -->
    <div class="hero-sidebar-vitals-card">
      <div class="hero-sidebar-vitals-top">
        <span class="hero-sidebar-class-name">${className}</span>
        <span class="hero-sidebar-hp-text"><b>${hp}</b> / ${maxHp} HP${blockText}</span>
      </div>
      <div class="hero-sidebar-hp-track" role="progressbar" aria-valuenow="${hp}" aria-valuemin="0" aria-valuemax="${maxHp}" aria-label="${className} Health">
        <div class="hero-sidebar-hp-fill" style="width: ${hpPct}%;"></div>
      </div>
      ${
        combat && (
          (combat.heroStatDebuffs?.length ?? 0) > 0 ||
          (combat.playerAccMod ?? 0) < 0 ||
          (combat.playerEvasionMod ?? 0) < 0
        )
          ? `<div class="combat-debuff-tray" style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px;">
              ${(combat.heroStatDebuffs ?? []).map((effect: HeroStatDebuff) => `<span class="combat-debuff-chip" style="background: rgba(239, 68, 68, 0.25); border: 1px solid #ef4444; color: #fca5a5; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px;" title="${effect.label}">${effect.label}</span>`).join('')}
              ${(combat.playerAccMod ?? 0) < 0 ? `<span class="combat-debuff-chip" style="background: rgba(239, 68, 68, 0.25); border: 1px solid #ef4444; color: #fca5a5; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px;" title="Accuracy debuff">🔮 -1 ACC</span>` : ''}
              ${(combat.playerEvasionMod ?? 0) < 0 ? `<span class="combat-debuff-chip" style="background: rgba(239, 68, 68, 0.25); border: 1px solid #ef4444; color: #fca5a5; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px;" title="Evasion debuff">🔮 -1 EVA</span>` : ''}
            </div>`
          : ''
      }
    </div>

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
      <span class="derived-chip acc" title="Accuracy: 1 ACC per 1 DEX">${getDerivedStatIcon('acc')} ACC <b>${derived.acc}</b></span>
      <span class="derived-chip eva" title="Evasion: 1 EVA per 1 AGI + Gear EVA">${getDerivedStatIcon('eva')} EVA <b>${derived.eva}</b></span>
      <span class="derived-chip atk" title="Physical Attack: floor(STR / 2) + floor(DEX / 3) + Gear ATK">${getDerivedStatIcon('atk')} ATK <b>${derived.atk}</b></span>
      <span class="derived-chip def" title="Physical Defense: floor((STR + AGI + VIT) / 5) + Gear DEF">${getDerivedStatIcon('def')} DEF <b>${derived.def}</b></span>
      <span class="derived-chip matk" title="Magical Attack: floor(INT / 2) + Gear MATK">${getDerivedStatIcon('matk')} MATK <b>${derived.matk}</b></span>
      <span class="derived-chip mdef" title="Magical Defense: floor(INT / 5) + Gear MDEF">${getDerivedStatIcon('mdef')} MDEF <b>${derived.mdef}</b></span>
      ${derived.pen > 0 ? `<span class="derived-chip pen" title="Physical Penetration: physical attacks ignore this much enemy natural DEF"><span class="pen-symbol">PEN</span> PEN <b>${derived.pen}</b></span>` : ''}
      <span class="derived-chip act" title="Action Points: ${combat ? `${combat.playerAp}/${combat.playerMaxAp}` : `Max ${derived.act}`}">${getDerivedStatIcon('act')} ACT <b>${combat ? `${combat.playerAp}/${combat.playerMaxAp}` : derived.act}</b></span>
      <span class="derived-chip cha" title="Charisma: -5% shop prices per CHA">${getStatIcon('cha')} DISC <b>-${eff.cha * 5}%</b></span>
    </div>
    <p class="muted shrine-hint">Right-click any stat for full computation &amp; next SP cost.</p>
  </div>`;
}

export interface PlayerInfoWidgetOptions {
  title?: string;
  description?: string;
  showGear?: boolean;
}

/** Canonical player-information widget shared by the Map, Shrine, Village Shop, and future overlays. */
export function playerInfoWidgetHtml(
  state: RunState,
  options: PlayerInfoWidgetOptions = {},
): string {
  const title = options.title ?? 'Current Character';
  const description = options.description ?? 'Your live character statistics and combat values.';
  return `
  <section class="player-info-widget" aria-label="${title}">
    <header class="player-info-widget-header">
      <h3>${title}</h3>
      <p>${description}</p>
    </header>
    ${statPanelHtml(state)}
    ${options.showGear ? `<div class="player-info-gear">${gearHtml(state)}</div>` : ''}
  </section>`;
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
      return { icon: '🌀', title: 'The Void', deckLabel: 'Void', deckCount: voidCardCount(state), discardCount: 0, deckPile: 'void_deck', discardPile: 'void_deck', cssPrefix: 'void', showDiscard: false };
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

export function combatRightSidebarHtml(state: RunState, combat: ActiveCombatState): string {
  const gameEntries = state.gameLog ?? [];
  const combatEntries = combat.combatLog ?? [];
  const missingFromGame = combatEntries.filter((c) => !gameEntries.includes(c));
  const logEntries = missingFromGame.length > 0 ? [...gameEntries, ...missingFromGame] : (gameEntries.length > 0 ? gameEntries : combatEntries);
  return `
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
      <span class="combat-log-count">${logEntries.length}</span>
      <button class="btn mini secondary log-expand-btn" data-action="open-log" title="View Full Game Log">View All</button>
    </div>
    <ul class="combat-sidebar-log log">
      ${renderCombatLogEntries(logEntries)}
    </ul>
  </aside>`;
}

export function mapGameLogHtml(state: RunState): string {
  const logEntries = state.gameLog ?? [];
  return `
  <section class="main-viewport-log-box" aria-label="Recent Game Log">
    <div class="combat-log-header">
      <div class="main-viewport-log-title-group">
        <span class="combat-log-header-title">📜 Game Log</span>
        <span class="combat-log-count">${logEntries.length}</span>
      </div>
      <button class="btn mini secondary log-expand-btn" data-action="open-log" title="View Full Game Log">View All</button>
    </div>
    <ul class="combat-sidebar-log log main-viewport-recent-log">
      ${renderCombatLogEntries(logEntries.slice(-5))}
    </ul>
  </section>`;
}

export function rightSidebarHtml(state: RunState): string {
  return `
  <div class="map-sidebar-right-wrap">
    ${deckPilesPanelHtml(state, {
      visibleGroups: ['adventure', 'monster', 'player', 'treasure', 'newSkills', 'void'],
      heading: 'Decks &amp; Discards',
    })}
  </div>`;
}

function adventurePileCardItem(card: AdventureCard, count: number, totalCards: number): string {
  const cardName = getAdventureCardName(card);
  const className = `${card.hasHostile ? 'is-hostile is-encounter' : ''} ${
    card.hasVillage ? 'is-village' : ''
  } ${card.hasShrine ? 'is-shrine' : ''} ${card.terrain === 'start' ? 'is-start' : ''}`;

  return `
  <div class="deck-pile-card-item pile-card-wrapper" data-inspect-kind="adventure" data-adventure-card-number="${card.cardNumber ?? ''}" data-adventure-card-name="${cardName}" title="${cardName} (×${count} in pile)">
    <div class="card-multiplier-badge pile-multiplier-badge">&times;${count}</div>
    <div class="deck-pile-card-frame">
      ${renderAdventureCardHtml(card, { className })}
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
  if (terrains.includes('underworld')) {
    badges.push('<span class="tcg-spawn-badge underworld" title="Spawns in the Underworld">🔥</span>');
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
          <div class="tcg-item-header-ribbons">
            <span class="tcg-level-ribbon tcg-item-level-ribbon">${levelText}</span>
            <span class="tcg-item-cost-ribbon" title="Base Gold Cost">${getResourceIcon('gold', 'header-icon')} ${item.buyPrice}g</span>
          </div>
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
    const destroyed = state.voidCards ?? [];
    const voidMonsters = state.monsterVoid ?? [];
    const voidMonsterGroups = groupByCount(voidMonsters, (monster) => monster.templateId);
    const destroyedGroups = groupByCount(destroyed, (card) => card.id);
    icon = '🌀';
    title = 'The Void';
    desc = 'Public not-in-play cards. Ordinary creature copies not selected by the current scenario remain here. Static skill upgrades, Bosses, and unselected heroes remain inexhaustible; cards destroyed during Village Training are physical Void cards.';
    totalCards = upgradeCards.length + bosses.length + heroes.length + destroyed.length + voidMonsters.length;
    uniqueCount = upgradeCards.length + bosses.length + heroes.length + destroyedGroups.length + voidMonsterGroups.length;
    cardsHtml = [
      ...upgradeCards
        .sort((a, b) => (a.cardNumber ?? a.name).localeCompare(b.cardNumber ?? b.name))
        .map((card) => combatPileCardItem(card, 1, totalCards, stats, state)),
      ...bosses
        .sort((a, b) => (a.cardNumber ?? a.name).localeCompare(b.cardNumber ?? b.name))
        .map((monster) => monsterPileCardItem(monster, 1, totalCards)),
      ...voidMonsterGroups
        .sort((a, b) => (a.item.cardNumber ?? a.item.name).localeCompare(b.item.cardNumber ?? b.item.name))
        .map(({ item, count }) => monsterPileCardItem(item, count, totalCards)),
      ...heroes.map((classId) => voidHeroPileCardItem(classId, totalCards)),
      ...destroyedGroups
        .sort((a, b) => (a.item.cardNumber ?? a.item.name).localeCompare(b.item.cardNumber ?? b.item.name))
        .map(({ item, count }) => combatPileCardItem(item, count, totalCards, stats, state)),
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

    const groups = groupByCount(cards, (card) => card.cardNumber || `${card.name || getAdventureCardName(card)}_${card.level}`);
    uniqueCount = groups.length;
    cardsHtml = groups
      .sort((a, b) => {
        const codeA = a.item.cardNumber ?? '';
        const codeB = b.item.cardNumber ?? '';
        const idxA = ADVENTURE_CARD_ORDER_INDEX.get(codeA);
        const idxB = ADVENTURE_CARD_ORDER_INDEX.get(codeB);
        if (idxA !== undefined && idxB !== undefined) return idxA - idxB;
        if (idxA !== undefined) return -1;
        if (idxB !== undefined) return 1;
        return codeA.localeCompare(codeB);
      })
      .map(({ item, count }) => adventurePileCardItem(item, count, totalCards))
      .join('');
  } else if (pileType === 'monster_deck' || pileType === 'monster_discard') {
    const isDeck = pileType === 'monster_deck';
    const cards = isDeck ? state.monsterDeck : state.monsterDiscard;
    icon = isDeck ? '👹' : '💀';
    title = isDeck ? 'Monster Deck' : 'Monster Discard Pile';
    desc = isDeck
      ? `Scenario Level ${state.scenarioLevel ?? state.currentMission ?? 1} hostiles pulled from the physical creature supply. Encounters draw eligible cards from this hidden pile; unused creature copies remain publicly inspectable in the Void.`
      : 'Monsters defeated in battle during this stage.';
    totalCards = cards.length;

    const groups = groupByCount(cards, (monster) => monster.templateId || monster.name);
    uniqueCount = groups.length;
    cardsHtml = groups
      .sort((a, b) => {
        const codeA = a.item.cardNumber ?? a.item.name;
        const codeB = b.item.cardNumber ?? b.item.name;
        return codeA.localeCompare(codeB);
      })
      .map(({ item, count }) => monsterPileCardItem(item, count, totalCards))
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

    const groups = groupByCount(cards, (item) => item.id);
    uniqueCount = groups.length;
    cardsHtml = groups
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

    const groups = groupByCount(cards, (card) => card.id);
    uniqueCount = groups.length;
    cardsHtml = groups
      .sort((a, b) => {
        const codeA = a.item.cardNumber ?? a.item.name;
        const codeB = b.item.cardNumber ?? b.item.name;
        return codeA.localeCompare(codeB);
      })
      .map(({ item, count }) => combatPileCardItem(item, count, totalCards, stats, state))
      .join('');
  }

  return `
  <div class="modal-backdrop inspection-backdrop pile-inspect-backdrop" data-action="close-pile-backdrop">
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


/** Themed tabletop boardgame turn tracker strip with phase bands, nodes, and player standee marker. */
export function turnTrackerHtml(state: RunState): string {
  const currentTurn = state.turn;
  const maxTurns = state.maxTurns ?? 15;
  const heroArt = getAdventurerRasterArtPath(state.playerClass);
  const className = getPlayerClassName(state.playerClass);

  const meepleHtml = `
    <div class="turn-standee-marker" title="Hero Party Position: ${
      currentTurn === 0
        ? 'Preparation'
        : currentTurn >= maxTurns
        ? 'Stage Boss Confrontation!'
        : `Turn ${currentTurn} of ${maxTurns}`
    }">
      <div class="standee-token">
        <img src="${heroArt}" alt="${className}" class="standee-hero-art" loading="lazy" />
      </div>
      <div class="standee-base" aria-hidden="true"></div>
    </div>`;

  const nodesHtml: string[] = [];

  // Start Node (Turn 0)
  const isStartCurrent = currentTurn === 0;
  const isStartCompleted = currentTurn > 0;
  nodesHtml.push(`
    <div class="turn-node is-start ${isStartCurrent ? 'is-current' : ''} ${isStartCompleted ? 'is-completed' : ''}" data-turn="0" title="Turn 0: Adventure Preparation">
      ${isStartCurrent ? meepleHtml : ''}
      <span class="turn-node-circle start-circle">
        <span class="turn-label">START</span>
      </span>
    </div>
    <span class="turn-arrow ${currentTurn > 0 ? 'is-completed' : ''}" aria-hidden="true">&rarr;</span>
  `);

  // Turns 1 through maxTurns
  for (let i = 1; i <= maxTurns; i++) {
    const isCurrent = currentTurn === i;
    const isCompleted = currentTurn > i;
    const isBoss = i === maxTurns;

    nodesHtml.push(`
      <div class="turn-node ${isBoss ? 'is-boss-node' : ''} ${isCurrent ? 'is-current' : ''} ${isCompleted ? 'is-completed' : ''} ${!isCurrent && !isCompleted ? 'is-upcoming' : ''}" data-turn="${i}" title="${isBoss ? `Turn ${i}: Stage Boss Battle!` : `Turn ${i} of ${maxTurns}`}">
        ${isCurrent ? meepleHtml : ''}
        <span class="turn-node-circle ${isBoss ? 'boss-circle' : ''}">
          ${isBoss ? '<span class="turn-boss-skull" aria-hidden="true">&#9760;</span>' : ''}
          <span class="turn-num">${i}</span>
        </span>
      </div>
      ${i < maxTurns ? `<span class="turn-arrow ${currentTurn > i ? 'is-completed' : ''}" aria-hidden="true">&rarr;</span>` : ''}
    `);
  }

  return `
  <div class="boardgame-turn-tracker" aria-label="Scenario Turn Track (Turn ${currentTurn} of ${maxTurns})">
    <!-- Phase Category Banners (Bands) -->
    <div class="turn-phase-bands-row">
      <div class="turn-phase-band phase-start ${currentTurn === 0 ? 'is-active-phase' : ''}">
        <span class="phase-title">Preparation</span>
      </div>
      <div class="turn-phase-band phase-approach ${currentTurn >= 1 && currentTurn <= 4 ? 'is-active-phase' : ''}">
        <span class="phase-title">The Approach (1–4)</span>
      </div>
      <div class="turn-phase-band phase-wilds ${currentTurn >= 5 && currentTurn <= 9 ? 'is-active-phase' : ''}">
        <span class="phase-title">The Wilds (5–9)</span>
      </div>
      <div class="turn-phase-band phase-dungeon ${currentTurn >= 10 && currentTurn <= 14 ? 'is-active-phase' : ''}">
        <span class="phase-title">Deep Dungeon (10–14)</span>
      </div>
      <div class="turn-phase-band phase-boss ${currentTurn >= 15 ? 'is-active-phase' : ''}">
        <span class="phase-title">Stage Boss (15)</span>
      </div>
    </div>

    <!-- The Tabletop Track with Nodes & Meeple Standee -->
    <div class="turn-track-scroll">
      <div class="turn-track-nodes">
        ${nodesHtml.join('')}
      </div>
    </div>
  </div>`;
}

export function bossApproachViewHtml(state: RunState, bossMonsters: MonsterCard[]): string {
  const mission = state.currentMission ?? 1;
  const stageTitle = mission === 1 ? 'Stage 1 · The Goblin King' : 'Stage 2 · Cult of Trolls';
  const bossNames = bossMonsters.map((m) => m.name).join(' & ');

  const bossCardsHtml = bossMonsters
    .map((monster) => {
      const card = fullCreatureCardHtml({
        monster,
        attackBonus: 0,
        accBonus: 0,
        evaBonus: 0,
        defBonus: 0,
        className: 'is-boss-card is-boss-preview',
        artOverlayHtml: `<div class="tcg-boss-ribbon">👑 STAGE BOSS</div>`,
        attributes: `aria-label="${monster.name} Card" data-inspect-kind="monster" data-monster-id="${monster.templateId}"`,
      });

      return `
      <div class="boss-card-wrapper" data-action="start-boss-battle" role="button" tabindex="0" title="Click to engage ${monster.name} in battle">
        <div class="boss-card-target-pill">🎯 CLICK TO FIGHT</div>
        ${card}
      </div>`;
    })
    .join('');

  return `
  <section class="boss-approach-view" aria-label="Stage Boss Confrontation">
    <div class="boss-approach-header">
      <span class="boss-approach-eyebrow">⚔️ FINAL CONFRONTATION · ${stageTitle.toUpperCase()}</span>
      <h2 class="boss-approach-title">The Stage Boss Awaits: ${bossNames}!</h2>
      <p class="boss-approach-desc">
        You have traversed all 15 leagues of the realm and reached the final threshold. 
        <b>Prepare your hero before entering battle!</b> Change your equipment or consume potions from your backpack on the left. 
        When you are ready, click the Boss card below or press the battle button.
      </p>
    </div>

    <div class="boss-approach-cards-row">
      ${bossCardsHtml}
    </div>

    <div class="boss-approach-actions">
      <button class="btn primary big boss-start-btn" data-action="start-boss-battle" title="Begin the Boss encounter">
        ⚔️ Fight ${bossMonsters.length > 1 ? 'Bosses' : bossNames} — Enter Battle &rarr;
      </button>
      <span class="boss-approach-hint muted">You can also click the boss card directly or press <b>Enter</b> / <b>Space</b></span>
    </div>
  </section>`;
}

export function renderPlayArea(state: RunState, ui: UiState): string {
  const res = state.playerResources;
  if (!res) return '';
  const nodes = Object.values(state.board).sort((a, b) => a.coord.row - b.coord.row);
  const classDef = state.playerClass ? CLASS_CATALOG[state.playerClass] : null;
  const isCombat = state.activeHook.type === 'COMBAT';
  const stats = getEffectiveStatsFromState(state);

  const mainContent = state.activeHook.type === 'COMBAT'
    ? combatViewHtml(state, state.activeHook.combat, ui, stats)
    : state.activeHook.type === 'VILLAGE'
    ? villageViewHtml(state, state.activeHook.village, ui)
    : state.activeHook.type === 'BOSS_APPROACH'
    ? bossApproachViewHtml(state, state.activeHook.bossMonsters)
    : `
        <section class="board" aria-label="Adventure board">
          <div class="board-world">${nodes.map((n) => adventureCardHtml(n, state)).join('')}</div>
        </section>

        <div class="banner">${state.bannerMessage}</div>
      `;

  const leftSidebarContent = playerInfoWidgetHtml(state, {
    title: 'Character & Gear',
    description: 'Your live hero, derived combat values, equipment, and backpack.',
    showGear: true,
  });

  const rightSidebarContent = state.activeHook.type === 'COMBAT'
    ? combatRightSidebarHtml(state, state.activeHook.combat)
    : rightSidebarHtml(state);

  const logCount = (state.gameLog ?? []).length;

  return `
  <main class="screen play ${isCombat ? 'is-in-combat' : ''}">
    <header class="hud">
      <div class="hud-logo-col">
        <img src="${publicAsset('brand/paths-we-choose-logo.png')}" alt="The Paths We Choose" class="hud-game-logo" width="220" height="92" />
      </div>

      <div class="hud-content-col">
        <div class="hud-top">
          <div class="hud-scenario-group">
            <span class="hud-scenario-badge">Scenario ${state.currentMission ?? 1}</span>
            ${classDef ? `<span class="hud-hero-badge">${classDef.name}</span>` : ''}
          </div>

          <div class="hud-resources">
            ${state.divineProtection > 0 ? `<div class="hud-badge prot">&#10022; +${state.divineProtection} DEF/MDEF</div>` : ''}
            ${state.statusEffects && state.statusEffects.length > 0 ? `<div class="hud-badge status">${state.statusEffects.join(', ')}</div>` : ''}
          </div>

          <div class="hud-actions-group">
            <button class="btn mini hud-saves-btn" data-action="open-saves" title="Save or Load Adventure (5 Slots)">💾 Saves</button>
            <button class="btn mini hud-log-btn" data-action="open-log" title="Open Adventure Chronicle (Game Log)">📜 Log (${logCount})</button>
            <button class="btn mini hud-guide-btn" data-action="open-guide" title="Open the How to Play guide">📖 Guide</button>
          </div>
        </div>

        ${turnTrackerHtml(state)}
      </div>
    </header>

    <div class="play-layout">
      <aside class="play-sidebar ${isCombat ? 'is-combat-hero' : ''}">
        ${leftSidebarContent}
      </aside>

      <div class="play-main ${isCombat ? 'is-combat-main' : ''}">
        ${mainContent}
        ${!isCombat ? mapGameLogHtml(state) : ''}
      </div>

      <aside class="play-sidebar-right ${isCombat ? 'is-combat-right' : ''}">
        ${rightSidebarContent}
      </aside>
    </div>
    <footer class="foot">seed: ${state.seed}</footer>
    ${state.welcomePreparing ? welcomePrepareModal(state) : ''}
    ${ui.inspectedPile ? pileModal(ui.inspectedPile, state) : ''}
    ${ui.showDeck ? pileModal('player_deck', state) : ''}
    ${renderHook(state, ui)}
    ${ui.pendingCardPlay && state.activeHook.type === 'COMBAT' ? combatConfirmModal(state, state.activeHook.combat, ui.pendingCardPlay, stats) : ''}
    ${ui.pendingDiceRolls && ui.pendingDiceRolls.length > 0 ? combatDiceRollModal(ui.pendingDiceRolls[0]) : ''}
    ${ui.pendingFlee && state.activeHook.type === 'COMBAT' ? fleeConfirmModal(state, state.activeHook.combat, stats) : ''}
    ${ui.pendingTrainingAction ? trainingConfirmModal(state, ui.pendingTrainingAction) : ''}
    ${ui.pendingShrineAction ? shrineConfirmModal(state, ui.pendingShrineAction) : ''}
    ${ui.showGuide ? renderGuideModal(true, ui.guidePage ?? 1) : ''}
    ${ui.showLog ? gameLogModal(state, ui) : ''}
    ${ui.showSaves ? saveModalHtml(state, ui.pendingSaveAction ?? null) : ''}
    ${ui.inspectedCard ? cardInspectModal(ui.inspectedCard, state) : ''}
    ${ui.inspectedStat ? statInspectModal(ui.inspectedStat, state) : ''}
  </main>`;
}

export function combatCardHtml(
  card: CombatCardDef,
  stats: CharacterStats,
  playable: boolean,
  action = 'play-card',
  isMini = false,
  state?: RunState,
  viewOnly = false
): string {
  return renderActionCardHtml(card, stats, {
    playable,
    action,
    mini: isMini,
    state,
    viewOnly,
  });
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
      return ''; // Rendered inline in .play-main replacing the maps/board component
    case 'VILLAGE':
      return ''; // Rendered inline in .play-main replacing the maps/board component
    case 'BOSS_APPROACH':
      return ''; // Rendered inline in .play-main replacing the maps/board component
    case 'SHRINE':
      return shrineModal(state, ui);
    case 'EXPLORATION':
      return explorationModal(hook.exploration, state);
    case 'ENCOUNTER_CLEAR':
      return `
      <div class="modal-backdrop">
        <div class="modal encounter-clear-modal">
          <div class="encounter-clear-card">${eventAdventureCardHtml(hook.encounter.card, '✦ ENCOUNTER')}</div>
          <div class="encounter-clear-copy">
            <span class="shrine-heading-eyebrow">Encounter Resolved</span>
            <h2>${getAdventureCardName(hook.encounter.card)}</h2>
            <p>${hook.encounter.reason}</p>
            <p class="muted">No encounter rewards were created. The tile still resolves normally.</p>
            <button class="btn primary big" data-action="confirm-encounter-clear">
              ${state.turn >= state.maxTurns ? 'Continue to the Stage Boss →' : 'Return to Map →'}
            </button>
          </div>
        </div>
      </div>`;
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
      const stage = hook.stageNumber ?? (hook.canContinue ? 1 : 2);
      const isStage1 = stage === 1;
      const isStage2 = stage === 2;
      return `
      <div class="modal-backdrop"><div class="modal center stage-complete-modal">
        <h2>${
          isStage1
            ? 'Stage 1 Complete: The Goblin King Defeated!'
            : isStage2
            ? 'Stage 2 Complete: Cult of Trolls Cleansed!'
            : 'Stage 3 Complete: Fallen King Slain!'
        }</h2>
        <p>You defeated ${hook.bossDefeated} on turn ${hook.turn}.</p>
        ${
          isStage1
            ? `<div class="modal-actions horizontal stage-complete-actions">
                <button class="btn primary big" data-action="next-mission">Continue to Cult of Trolls</button>
                <button class="btn big" data-action="restart">Abandon Quest</button>
              </div>`
            : isStage2
            ? `<div class="modal-actions horizontal stage-complete-actions">
                <button class="btn primary big" data-action="next-mission">Continue to Tomb of the Fallen King</button>
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

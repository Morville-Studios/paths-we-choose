import { CLASS_CATALOG } from '../data/classes';
import {
  getMonsterMainTerrain,
  getMonsterRarity,
  getMonsterSupplyCount,
  MONSTER_TEMPLATES,
  MONSTER_TERRAIN_LEVELS,
} from '../data/monsters';
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
import { getActionCardEffect, renderActionCardHtml } from './actionCard';
import {
  getAdventureCardName as getSharedAdventureCardName,
  renderAdventureCardHtml,
} from './adventureCard';
import { getTerrainPresentation } from './terrainPresentation';
import { groupByCount } from './grouping';
import { MORVILLE_STUDIOS_URL, studioBrandHtml } from './brand';
import { publicAsset } from './publicAsset';
import {
  getBaseStatUpgradeCost,
  getActiveShrineBaseStatCap,
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

const ADVENTURE_CARD_ORDER_INDEX = new Map(
  ADVENTURE_CARD_ORDER.map((cardNumber, index) => [cardNumber, index]),
);

export interface PendingCardPlay {
  cardInstanceId: string;
  targetIndex: number;
  discardedCardInstanceIds?: string[];
}

export interface PendingTrainingAction {
  kind: 'learn' | 'destroy';
  cardInstanceId: string;
}

export type PendingShrineAction =
  | { kind: 'upgrade-stat'; stat: StatKey }
  | { kind: 'upgrade-skill'; sourceInstanceId: string }
  | { kind: 'leave' };

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
  pendingTrainingAction?: PendingTrainingAction | null;
  pendingShrineAction?: PendingShrineAction | null;
  selectedShrineStat?: StatKey | null;
  inspectedStat?: StatKey | null;
  villageRestTicks?: number;
  showGuide?: boolean;
  guidePage?: number;
}

/** True when keyboard/carousel input must not reach gameplay behind an overlay. */
export function hasBlockingUiOverlay(ui: UiState): boolean {
  return Boolean(
    ui.inspectedCard
    || ui.inspectedPile
    || ui.inspectedStat
    || ui.showDeck
    || ui.pendingCardPlay
    || ui.pendingFlee
    || ui.pendingTrainingAction
    || ui.pendingShrineAction
    || ui.showGuide
  );
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

export function renderWelcome(showGuide = false, guidePage = 1): string {
  return `
  <main class="screen welcome">
    <div class="welcome-vignette" aria-hidden="true"></div>
    <header class="welcome-studio-bar">
      ${studioBrandHtml({ className: 'welcome-studio-brand' })}
      <div class="welcome-studio-nav">
        <span>Original browser game</span>
        <a href="${MORVILLE_STUDIOS_URL}">MorvilleStudios.com <span aria-hidden="true">↗</span></a>
      </div>
    </header>

    <section class="welcome-stage" aria-labelledby="game-title">
      <div class="welcome-card">
        <div class="welcome-release-line">
          <span class="welcome-release-dot" aria-hidden="true"></span>
          Playable prototype · Stage 1 available
        </div>
        <p class="eyebrow">A tabletop-inspired card adventure</p>
        <h1 id="game-title">The Paths<br/>We Choose</h1>
        <p class="welcome-deckline">Build a path. Shape a hero. Survive what your choices reveal.</p>
        <p class="tagline">A solo browser game combining tactical deck-building, 2d6 tabletop combat, and a map that grows from every decision.</p>
        <div class="welcome-actions">
          <button class="btn primary big welcome-start" data-action="start">
            <span>Start Adventure</span><span aria-hidden="true">→</span>
          </button>
          <button class="btn guide-start-btn" data-action="open-guide">How to Play</button>
        </div>
        <dl class="welcome-facts" aria-label="Game information">
          <div><dt>Format</dt><dd>Solo strategy</dd></div>
          <div><dt>Play</dt><dd>Free in browser</dd></div>
          <div><dt>Current build</dt><dd>Grasslands</dd></div>
        </dl>
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
    </section>

    <footer class="welcome-footer">
      <span>© 2026 Morville Studios</span>
      <span class="welcome-footer-rule" aria-hidden="true"></span>
      <span>Strategy · Cards · Adventure</span>
      <span class="welcome-footer-build">v0.1</span>
    </footer>
    ${showGuide ? renderGuideModal(false, guidePage) : ''}
  </main>`;
}

/** A short, plain-language guide available before and during every adventure. */
export function renderGuideModal(inGame: boolean, currentPage = 1): string {
  const p = Math.max(1, Math.min(5, currentPage));

  return `
  <div class="modal-backdrop guide-backdrop" data-action="close-guide-backdrop">
    <div class="guide-book-tome" role="dialog" aria-modal="true" aria-labelledby="guide-book-title">
      <!-- Brass Filigree Corner Bracket Embellishments on Tome Binding -->
      <div class="guide-filigree guide-filigree-tl" aria-hidden="true"></div>
      <div class="guide-filigree guide-filigree-tr" aria-hidden="true"></div>
      <div class="guide-filigree guide-filigree-bl" aria-hidden="true"></div>
      <div class="guide-filigree guide-filigree-br" aria-hidden="true"></div>

      <!-- Ornate Medieval Tome Header -->
      <header class="guide-tome-header">
        <div class="guide-tome-identity">
          <span class="guide-tome-sigil" aria-hidden="true">&#9884;</span>
          <div>
            <span class="guide-tome-eyebrow">ADVANCED ADVENTURERS &amp; DUNGEONS &bull; 2ND EDITION</span>
            <h2 id="guide-book-title" class="guide-tome-title">The Paths We Choose &mdash; Player's Handbook</h2>
          </div>
        </div>
        <button class="modal-close-btn guide-tome-close" data-action="close-guide" aria-label="Close rulebook" title="Close Tome (Esc)">&times;</button>
      </header>

      <!-- Bookmark Ribbon Tabs (Top Page Navigation) -->
      <nav class="guide-ribbon-bar" aria-label="Rulebook Chapters">
        <button class="guide-ribbon-tab ${p === 1 ? 'is-active' : ''}" data-action="guide-jump-page" data-page="1" title="Page 1: The Quest &amp; Pathfinding">
          <span class="ribbon-tail"></span>
          <span class="ribbon-text">&#128220; I. The Quest</span>
        </button>
        <button class="guide-ribbon-tab ${p === 2 ? 'is-active' : ''}" data-action="guide-jump-page" data-page="2" title="Page 2: Combat Procedures &amp; Stack">
          <span class="ribbon-tail"></span>
          <span class="ribbon-text">&#9876;&#65039; II. Battle</span>
        </button>
        <button class="guide-ribbon-tab ${p === 3 ? 'is-active' : ''}" data-action="guide-jump-page" data-page="3" title="Page 3: The Six Attributes &amp; Vigor">
          <span class="ribbon-tail"></span>
          <span class="ribbon-text">&#128202; III. Attributes</span>
        </button>
        <button class="guide-ribbon-tab ${p === 4 ? 'is-active' : ''}" data-action="guide-jump-page" data-page="4" title="Page 4: Adventurer Classes">
          <span class="ribbon-tail"></span>
          <span class="ribbon-text">&#128737;&#65039; IV. Classes</span>
        </button>
        <button class="guide-ribbon-tab ${p === 5 ? 'is-active' : ''}" data-action="guide-jump-page" data-page="5" title="Page 5: Shrines, Villages &amp; The Void">
          <span class="ribbon-tail"></span>
          <span class="ribbon-text">&#127963;&#65039; V. Shrines &amp; Void</span>
        </button>
      </nav>

      <!-- The Parchment Folio Spread -->
      <div class="guide-parchment-spread">
        <!-- Center Book Spine Crease & Shadow Gutter -->
        <div class="guide-book-spine-gutter" aria-hidden="true"></div>

        <!-- ============================================================ -->
        <!-- PAGE 1: Frontispiece & Core Dungeon Crawl Loop               -->
        <!-- ============================================================ -->
        <article class="guide-book-page ${p === 1 ? 'is-active' : ''}" data-page="1">
          <header class="guide-page-header">
            <span class="guide-running-head">ADVANCED ADVENTURERS &amp; DUNGEONS &bull; RULEBOOK</span>
            <h3 class="guide-chapter-title">&mdash; PROLOGUE: THE PATH FORWARD &mdash;</h3>
            <p class="guide-chapter-sub">How to Play, Navigate the Vision Cone, and Survive the Dungeon Crawl</p>
          </header>

          <div class="guide-folio-grid">
            <div class="guide-folio-col">
              <h4 class="guide-section-heading">&#9884; The Adventurer's Call</h4>
              <p class="guide-body-text">
                <span class="guide-drop-cap">H</span>arken, brave wanderer. Before thee stretches the perilous wilderness of <i>The Paths We Choose</i>. In this tabletop card expedition, thou must forge a route across treacherous terrain, nurture thy hero's attributes, master the martial art of two six-sided dice, and slay the slumbering monstrosity awaiting at the journey's terminus.
              </p>

              <div class="adnd-parchment-box">
                <h5 class="adnd-box-title">THE THREE PILLARS OF EXPLORATION</h5>
                <ol class="adnd-numbered-list">
                  <li><b>Pick a Path:</b> Tap any forward Land card in front of your token. Every stride moves you forward and unmasks deeper dungeon rows.</li>
                  <li><b>Handle the Land:</b> <b>Encounters</b> trigger fierce creature battles; <b>Villages</b> provide rest, goods, and training; <b>Shrines</b> bless and upgrade your stats; and <b>Undiscovered Lands</b> hold fortune or peril.</li>
                  <li><b>Win the Battle:</b> Vanquish all foes using combat cards and Action Points (AP). Claim their inscribed Gold and Stat Points (SP) to grow ever stronger.</li>
                </ol>
              </div>

              <h4 class="guide-section-heading">&#9884; The 3-Row Vision Cone</h4>
              <p class="guide-body-text">
                The dungeon unfolds before your eyes in a strict <b>Three-Row Lookahead Cone</b>:
              </p>
              <ul class="adnd-bullet-list">
                <li><b>Current Row:</b> Where your hero token currently stands.</li>
                <li><b>Next Choice Row:</b> The 2 forward tiles immediately reachable on your next step.</li>
                <li><b>Lookahead Row:</b> 3 tiles branching beyond, allowing strategic long-term navigation toward villages, shrines, or safer terrain.</li>
              </ul>
            </div>

            <div class="guide-folio-col">
              <h4 class="guide-section-heading">&#9884; Terrain &amp; Dungeon Hazards</h4>
              <p class="guide-body-text">
                The realm is divided into distinct biomes&mdash;Grasslands, Forest, Swamp, and subterranean Caves. Each terrain spawns unique creature types and hazard levels:
              </p>

              <ul class="adnd-bullet-list">
                <li><b>Hostile Lands:</b> Initiates immediate battle against local horrors drawn to meet the card's danger level.</li>
                <li><b>Settlements &amp; Villages:</b> Civilized havens where an adventurer may rest at the inn, purchase equipment from dynamic treasure stores, and train skills.</li>
                <li><b>Sacred Shrines:</b> Mystical altars granting an automatic divine boon and permitting permanent Base Stat upgrades using earned Stat Points.</li>
                <li><b>Undiscovered Lands:</b> Shrouded regions. Stepping here triggers a 1d6 exploration check: a natural <b>6</b> unearths hidden treasure, while rolls at or below the card level invite an ambush!</li>
              </ul>

              <div class="adnd-parchment-box callout-quest">
                <h5 class="adnd-box-title">VICTORY CONDITIONS &amp; THE STAGE BOSS</h5>
                <p class="adnd-box-text">
                  On <b>Turn 15</b>, the journey culminates at the boss tile. The stage tyrant (such as the <i>Goblin King</i> in Stage 1 or the <i>Cult of Trolls</i> in Stage 2) emerges. Slay the boss to finish the scenario and unlock subsequent adventures!
                </p>
              </div>

              <div class="adnd-page-jump-row">
                <span class="adnd-jump-label">Next Chapter:</span>
                <button class="btn mini guide-jump-btn" data-action="guide-jump-page" data-page="2">Turn to Ch. I: Combat &rarr;</button>
              </div>
            </div>
          </div>
        </article>

        <!-- ============================================================ -->
        <!-- PAGE 2: Chapter I — Combat & The Stack                       -->
        <!-- ============================================================ -->
        <article class="guide-book-page ${p === 2 ? 'is-active' : ''}" data-page="2">
          <header class="guide-page-header">
            <span class="guide-running-head">ADVANCED ADVENTURERS &amp; DUNGEONS &bull; RULEBOOK</span>
            <h3 class="guide-chapter-title">&mdash; CHAPTER I: COMBAT &amp; THE RESOLUTION STACK &mdash;</h3>
            <p class="guide-chapter-sub">Battles in one minute: Turn Rhythm, Action Points, One-by-One Card Draws, and 2d6 Tabletop Rolls</p>
          </header>

          <div class="guide-folio-grid">
            <div class="guide-folio-col">
              <h4 class="guide-section-heading">&#9884; Turn Flow &amp; Action Points (AP)</h4>
              <p class="guide-body-text">
                <span class="guide-drop-cap">C</span>ombat in <i>The Paths We Choose</i> fuses tactical deckbuilding with classic tabletop dice checks. At the inception of battle&mdash;and at the beginning of each hero turn&mdash;you draw <b>5 cards</b> from your <b>Player Combat Deck</b>.
              </p>
              <ul class="adnd-bullet-list">
                <li><b>Action Cards:</b> Represent attacks, defensive shields, elemental incantations, and combat maneuvers.</li>
                <li><b>Action Points (AP):</b> Playing a card costs AP. Adventurers normally begin with <b>3 AP</b> per turn (which scales with INT via <code>3 + &lfloor;INT / 5&rfloor;</code>, and can be modified by relics or passives like Wizard's <code>[Conserve]</code>).</li>
                <li><b>Targeting:</b> Attack actions can be directed at enemy creatures in the 3D monster carousel, while shields and buffs target your own Hero.</li>
                <li><b>End of Turn:</b> Play cards until your AP is depleted. When you press <b>End Turn</b>, all unplayed cards in your hand are swept into your <b>Player Combat Discard Pile</b>, and enemies execute their intents.</li>
              </ul>

              <div class="adnd-parchment-box">
                <h5 class="adnd-box-title">ONE-BY-ONE DRAWS &amp; THE DECK REFRESH</h5>
                <p class="adnd-box-text">
                  In faithful tabletop fashion, every draw resolves <b>one single card at a time</b>:
                </p>
                <p class="adnd-box-text">
                  <b>The 1-Card Scenario:</b> If there is only <b>1 card remaining</b> in your Player Combat Deck and an effect commands you to <i>draw 2 cards</i>:
                </p>
                <ol class="adnd-numbered-list">
                  <li>You draw that 1st card first. If that card possesses an immediate draw or trigger effect (e.g. placing a card on top of your Player Combat Deck), that effect resolves immediately!</li>
                  <li>You then proceed to resolve drawing your 2nd card.</li>
                </ol>
                <p class="adnd-box-text">
                  <b>The Deck Refresh:</b> When a draw is required and your deck is empty, the deck automatically <b>refreshes</b> by shuffling your entire <b>Player Combat Discard Pile</b> to create a fresh new draw deck, then proceeds to draw that next card.
                </p>
                <p class="adnd-box-text">
                  <b>Stack Safety:</b> A card you just played remains on the resolving Stack until all costs and effects conclude, guaranteeing a card can never immediately redraw itself.
                </p>
              </div>
            </div>

            <div class="guide-folio-col">
              <h4 class="guide-section-heading">&#9884; The Tabletop 2d6 Attack Check</h4>
              <p class="guide-body-text">
                All physical attacks and monster strikes roll <b>two six-sided dice (2d6)</b> against the defender's Evasion (EVA).
              </p>
              <ul class="adnd-bullet-list">
                <li><b>Base Hit Threshold:</b> Without modifiers, rolls of <b>5 or higher hit</b> (83.3% chance), while rolls of 4 or below miss.</li>
                <li><b>Accuracy vs. Evasion:</b> <code>Needed Roll = 5 - (Attacker ACC - Target EVA)</code>. High net ACC lowers the roll required to hit.</li>
                <li><b>Snake Eyes (1+1=2):</b> An automatic total miss regardless of bonuses!</li>
                <li><b>Critical Hits (Boxcars 6+6=12):</b> Rolling double sixes (12) scores an automatic <b>Critical Hit</b> dealing <b>+50% bonus ATK damage</b> (&lfloor;damage &times; 1.5&rfloor;).</li>
                <li><b>Hit Preview:</b> The target badge and confirmation modal show your exact required roll and win percentage before confirming.</li>
              </ul>

              <h4 class="guide-section-heading">&#9884; Defense, Block &amp; Damage Mitigation</h4>
              <ul class="adnd-bullet-list">
                <li><b>Temporary Block:</b> Shields absorb incoming damage during the current round before dissipating.</li>
                <li><b>Physical Defense (DEF):</b> Permanent armor and bodily resistance that directly absorbs incoming physical blows on every hit (physical resistance to getting hurt).</li>
                <li><b>Magical Defense (MDEF):</b> Innate arcane warding reducing damage from hostile spell attacks.</li>
                <li><b>Hand Discards:</b> Cards requiring discards prompt selection directly in the confirmation window.</li>
              </ul>

              <div class="adnd-page-jump-row">
                <span class="adnd-jump-label">Next Chapter:</span>
                <button class="btn mini guide-jump-btn" data-action="guide-jump-page" data-page="3">Turn to Ch. II: Attributes &rarr;</button>
              </div>
            </div>
          </div>
        </article>

        <!-- ============================================================ -->
        <!-- PAGE 3: Chapter II — The Six Attributes                      -->
        <!-- ============================================================ -->
        <article class="guide-book-page ${p === 3 ? 'is-active' : ''}" data-page="3">
          <header class="guide-page-header">
            <span class="guide-running-head">ADVANCED ADVENTURERS &amp; DUNGEONS &bull; RULEBOOK</span>
            <h3 class="guide-chapter-title">&mdash; CHAPTER II: THE SIX ATTRIBUTES &amp; PHYSICAL VIGOR &mdash;</h3>
            <p class="guide-chapter-sub">Understanding Stats & Attributes: Direct Stat Evolution and Derived Combat Scaling</p>
          </header>

          <div class="guide-folio-grid">
            <div class="guide-folio-col">
              <h4 class="guide-section-heading">&#9884; No Levels &mdash; Stats Define Growth</h4>
              <p class="guide-body-text">
                <span class="guide-drop-cap">T</span>here are no arbitrary character levels or XP bars in this realm! Thy hero's attributes directly define character evolution. Every adventurer begins with <b>Base 1</b> across all six attributes, boosted by their class archetype bonuses. Stat Points (SP) won from battle are invested at Shrines to raise base stats.
              </p>

              <div class="adnd-stat-entry">
                <h5 class="adnd-stat-name"><span class="adnd-glyph">&#128170;</span> Strength (STR) &mdash; Power &amp; Martial Force</h5>
                <p class="adnd-stat-desc">Raw muscular force, weapon power, and physical toughness.</p>
                <ul class="adnd-stat-perks">
                  <li><b>Physical Attack (ATK):</b> Adds <code>+&lfloor;STR / 2&rfloor;</code> flat damage bonus to melee strikes (e.g. <i>Slash</i>).</li>
                  <li><b>Physical Defense (DEF):</b> Adds <code>+&lfloor;STR / 5&rfloor;</code> innate physical damage absorption, reducing damage suffered when struck.</li>
                  <li><b>Martial Scaling:</b> Directly amplifies physical class skills and frontline combat prowess.</li>
                </ul>
              </div>

              <div class="adnd-stat-entry">
                <h5 class="adnd-stat-name"><span class="adnd-glyph">&#9889;</span> Agility (AGI) &mdash; Reflexes &amp; Reactiveness</h5>
                <p class="adnd-stat-desc">Reactiveness, twitch speed, swift movement, and evasive footwork.</p>
                <ul class="adnd-stat-perks">
                  <li><b>Combat Evasion (EVA):</b> Grants <b>+1 EVA for every 2 AGI</b> (<code>&lfloor;AGI / 2&rfloor;</code>), directly forcing enemy attack rolls to meet a higher 2d6 threshold to hit you.</li>
                  <li><b>Physical Defense (DEF):</b> Adds <code>+&lfloor;AGI / 3&rfloor;</code> damage reduction through reactive dodging and glancing deflections.</li>
                  <li><b>Disengage &amp; Escape:</b> Boosts Sprint escape check threshold on 1d6 (<code>&lfloor;AGI / 2&rfloor;</code>, minimum 1).</li>
                </ul>
              </div>

              <div class="adnd-stat-entry">
                <h5 class="adnd-stat-name"><span class="adnd-glyph">&#127919;</span> Dexterity (DEX) &mdash; Skill &amp; Perceptiveness</h5>
                <p class="adnd-stat-desc">Skillfulness, fine motor precision, keen perceptiveness, and weapon finesse.</p>
                <ul class="adnd-stat-perks">
                  <li><b>Combat Accuracy (ACC):</b> Grants <b>+1 ACC for every 2 DEX</b> (<code>&lfloor;DEX / 2&rfloor;</code>), lowering the required 2d6 roll to hit enemy targets.</li>
                  <li><b>Physical Attack (ATK):</b> Adds <code>+&lfloor;DEX / 3&rfloor;</code> attack bonus through pinpoint targeting of vital weaknesses.</li>
                  <li><b>Hit Consistency:</b> Working with STR, ensures physical strikes reliably land even against high-evasion monsters.</li>
                </ul>
              </div>
            </div>

            <div class="guide-folio-col">
              <div class="adnd-stat-entry">
                <h5 class="adnd-stat-name"><span class="adnd-glyph">&#129504;</span> Intelligence (INT) &mdash; Arcane Wit &amp; Tactics</h5>
                <p class="adnd-stat-desc">Arcane comprehension, quick wittiness, memory, and battlefield tactical acumen.</p>
                <ul class="adnd-stat-perks">
                  <li><b>Magical Attack (MATK):</b> Adds <code>+&lfloor;INT / 2&rfloor;</code> bonus damage to spells and arcane cards (e.g. <i>Fireball</i>).</li>
                  <li><b>Magical Defense (MDEF):</b> Adds <code>+&lfloor;INT / 5&rfloor;</code> innate ward absorbing hostile magical and elemental damage.</li>
                  <li><b>Action Points (ACT / AP):</b> Grants <b>+1 Max AP for every 5 INT</b> (<code>3 + &lfloor;INT / 5&rfloor;</code>), unlocking explosive turn economy.</li>
                </ul>
              </div>

              <div class="adnd-stat-entry">
                <h5 class="adnd-stat-name"><span class="adnd-glyph">&#128172;</span> Charisma (CHA) &mdash; Influence &amp; Mind Games</h5>
                <p class="adnd-stat-desc">Street smarts, political maneuvering, manipulation, persuasion, mind games, and flirtatious charm.</p>
                <ul class="adnd-stat-perks">
                  <li><b>Village Shop Discount:</b> Cuts merchant purchase prices by <b>5% per Effective CHA</b> across all village wares (minimum 1 Gold).</li>
                  <li><b>Economic Leverage:</b> Lets high-CHA adventurers afford elite weapons, armor, and potions far earlier.</li>
                  <li><b>Future Encounters:</b> Governs peaceful resolutions, special NPC dialogues, and bribery checks.</li>
                </ul>
              </div>

              <div class="adnd-stat-entry">
                <h5 class="adnd-stat-name"><span class="adnd-glyph">&#10084;&#65039;</span> Vitality (VIT) &mdash; Vigor &amp; Fortitude</h5>
                <p class="adnd-stat-desc">Bodily constitution, life force, and physical resilience to trauma.</p>
                <ul class="adnd-stat-perks">
                  <li><b>Max Health (Max HP):</b> Increases Hero Max HP by <b>+2 HP</b> per Effective VIT (<code>Max HP = 10 + Effective VIT &times; 2</code>).</li>
                  <li><b>Physical Defense (DEF):</b> Adds <code>+&lfloor;VIT / 5&rfloor;</code> innate physical damage absorption alongside STR and AGI.</li>
                  <li><b>Frontline Endurance:</b> High VIT expands your life pool and sustains you through attrition and boss encounters.</li>
                </ul>
              </div>

              <div class="adnd-page-jump-row">
                <span class="adnd-jump-label">Next Chapter:</span>
                <button class="btn mini guide-jump-btn" data-action="guide-jump-page" data-page="4">Turn to Ch. III: Classes &rarr;</button>
              </div>
            </div>
          </div>
        </article>

        <!-- ============================================================ -->
        <!-- PAGE 4: Chapter III — The Adventurer Classes                 -->
        <!-- ============================================================ -->
        <article class="guide-book-page ${p === 4 ? 'is-active' : ''}" data-page="4">
          <header class="guide-page-header">
            <span class="guide-running-head">ADVANCED ADVENTURERS &amp; DUNGEONS &bull; RULEBOOK</span>
            <h3 class="guide-chapter-title">&mdash; CHAPTER III: THE ADVENTURER CLASSES &mdash;</h3>
            <p class="guide-chapter-sub">Player Class Guide: Primary &amp; Secondary Archetypes, Innate Passives, and Starter Combat Decks</p>
          </header>

          <div class="guide-folio-grid">
            <div class="guide-folio-col">
              <h4 class="guide-section-heading">&#9884; Archetype Class Bonuses</h4>
              <p class="guide-body-text">
                <span class="guide-drop-cap">E</span>ach adventurer class begins with Base Stats of 1 across all six attributes, elevated by <b>1 Primary Stat (+2 bonus)</b> and <b>2 Secondary Stats (+1 bonus each)</b>, an innate combat passive, and a distinct starter deck.
              </p>

              <div class="adnd-class-box">
                <div class="adnd-class-header">
                  <h5 class="adnd-class-title">&#9876;&#65039; Fighter</h5>
                  <span class="adnd-class-role">Primary: STR (+2) &bull; Secondary: VIT (+1), DEX (+1)</span>
                </div>
                <p class="adnd-class-summary">A battle-hardened warrior who dominates the frontline with brute strength, high HP, and heavy shield defense.</p>
                <div class="adnd-class-stats-strip">
                  <span><b>STR 3</b></span> &bull; <span><b>DEX 2</b></span> &bull; <span><b>AGI 1</b></span> &bull; <span><b>INT 1</b></span> &bull; <span><b>CHA 1</b></span> &bull; <span><b>VIT 2</b></span>
                </div>
                <ul class="adnd-stat-perks">
                  <li><b>Starting Vitals:</b> <b>14 Max HP</b>, 1 ACC, 0 EVA, 1 ATK, 0 DEF, 3 AP.</li>
                  <li><b>Passive &mdash; <code>[Berzerk]</code>:</b> Gains <b>+1 ATK</b> when at 50% HP or lower; increases to <b>+2 ATK</b> when critically wounded at 25% HP or lower.</li>
                  <li><b>Starter Combat Deck:</b> 8&times; Slash (1 AP, 5 physical damage + ATK) &bull; 2&times; Defend (1 AP, 4 Block).</li>
                  <li><b>Tactics:</b> High starting HP lets the Fighter absorb hits while scaling melee strikes through both STR and DEX. Exploit Berzerk surges during fierce boss fights!</li>
                </ul>
              </div>
            </div>

            <div class="guide-folio-col">
              <div class="adnd-class-box">
                <div class="adnd-class-header">
                  <h5 class="adnd-class-title">&#128302; Wizard</h5>
                  <span class="adnd-class-role">Primary: INT (+2) &bull; Secondary: DEX (+1), CHA (+1)</span>
                </div>
                <p class="adnd-class-summary">A tactical scholar commanding elemental flame, bending action economy, and outsmarting opponents with high wit.</p>
                <div class="adnd-class-stats-strip">
                  <span><b>STR 1</b></span> &bull; <span><b>DEX 2</b></span> &bull; <span><b>AGI 1</b></span> &bull; <span><b>INT 3</b></span> &bull; <span><b>CHA 2</b></span> &bull; <span><b>VIT 1</b></span>
                </div>
                <ul class="adnd-stat-perks">
                  <li><b>Starting Vitals:</b> <b>12 Max HP</b>, 1 ACC, 0 EVA, 1 MATK, 0 MDEF, 3 AP.</li>
                  <li><b>Passive &mdash; <code>[Conserve]</code>:</b> Unspent Action Points (AP) at the end of a battle turn are saved and carried over into the next round.</li>
                  <li><b>Starter Combat Deck:</b> 8&times; Fireball (1 AP, 5 magic damage + MATK) &bull; 2&times; Force Field (1 AP, 4 Block).</li>
                  <li><b>Tactics:</b> Save AP during quiet turns to unleash explosive multi-spell combos. Enjoys an immediate 10% discount in village shops from starting CHA 2.</li>
                </ul>
              </div>

              <div class="adnd-class-box">
                <div class="adnd-class-header">
                  <h5 class="adnd-class-title">&#128481;&#65039; Rogue</h5>
                  <span class="adnd-class-role">Primary: AGI (+2) &bull; Secondary: DEX (+1), STR (+1)</span>
                </div>
                <p class="adnd-class-summary">An elusive infiltrator blending lightning reflexes, tactical perceptiveness, and opportunistic thievery.</p>
                <div class="adnd-class-stats-strip">
                  <span><b>STR 2</b></span> &bull; <span><b>DEX 2</b></span> &bull; <span><b>AGI 3</b></span> &bull; <span><b>INT 1</b></span> &bull; <span><b>CHA 1</b></span> &bull; <span><b>VIT 1</b></span>
                </div>
                <ul class="adnd-stat-perks">
                  <li><b>Starting Vitals:</b> <b>12 Max HP</b>, 1 ACC, 1 EVA, 1 ATK, 1 DEF, 3 AP.</li>
                  <li><b>Passive &mdash; <code>[Steal]</code>:</b> Rolling any pair (1+1, 2+2, 3+3, 4+4, 5+5, 6+6) on a 2d6 attack roll instantly pickpockets Gold equal to the doubled die number (e.g. 6+6 steals <b>+6 Gold</b>, 5+5 steals <b>+5 Gold</b>, and even Snake Eyes 1+1 steals <b>+1 Gold</b>).</li>
                  <li><b>Starter Combat Deck:</b> 8&times; Slash (1 AP, 5 physical damage + ATK) &bull; 2&times; Defend (1 AP, 4 Block).</li>
                  <li><b>Tactics:</b> High EVA causes enemy attacks to miss; starts with 1 natural DEF from AGI 3; generates bonus gold in battle to buy elite gear quickly.</li>
                </ul>
              </div>

              <div class="adnd-page-jump-row">
                <span class="adnd-jump-label">Next Chapter:</span>
                <button class="btn mini guide-jump-btn" data-action="guide-jump-page" data-page="5">Turn to Ch. IV: Shrines &amp; Void &rarr;</button>
              </div>
            </div>
          </div>
        </article>

        <!-- ============================================================ -->
        <!-- PAGE 5: Chapter IV — Shrines, Villages & The Void            -->
        <!-- ============================================================ -->
        <article class="guide-book-page ${p === 5 ? 'is-active' : ''}" data-page="5">
          <header class="guide-page-header">
            <span class="guide-running-head">ADVANCED ADVENTURERS &amp; DUNGEONS &bull; RULEBOOK</span>
            <h3 class="guide-chapter-title">&mdash; CHAPTER IV: SHRINES, SETTLEMENTS &amp; THE VOID &mdash;</h3>
            <p class="guide-chapter-sub">Upgrading your hero at Shrines, Settlement Services, Villages, treasure, and decks, and the Finite Physical Void</p>
          </header>

          <div class="guide-folio-grid">
            <div class="guide-folio-col">
              <h4 class="guide-section-heading">&#9884; Upgrading at Sacred Shrines</h4>
              <p class="guide-body-text">
                <span class="guide-drop-cap">D</span>efeating monsters awards <b>Gold</b> and <b>Stat Points (SP)</b>. At a <b>Shrine</b> (or during Turn 0 preparation), spend SP to raise a base stat. The cost formula is:
              </p>
              <div class="adnd-parchment-box">
                <h5 class="adnd-box-title">BASE STAT UPGRADE COST FORMULA</h5>
                <p class="adnd-box-formula"><b>Cost(Base &rarr; Base + 1) = (currentBase + 1)&sup2; SP</b></p>
                <p class="adnd-box-text">Base 1 &rarr; 2: costs <b>4 SP</b> &bull; Base 2 &rarr; 3: costs <b>9 SP</b> &bull; Base 3 &rarr; 4: costs <b>16 SP</b></p>
              </div>
              <ul class="adnd-bullet-list">
                <li><b>Shrine Level Cap:</b> A Shrine can raise base stats only up to its <b>Shrine Level + 1</b>: Level 1 permits Base 1&rarr;2, Level 2 allows Base up to 3, and Level 3 allows Base up to 4.</li>
                <li><b>Automatic Sacred Boons:</b> Stepping on a Sacred Shrine bestows 1 eligible divine boon upon arrival (Cleanse, +1 Stat Blessing, Divine Protection, or Revitalize). Only 1 shrine blessing can be active at a time.</li>
                <li><b>Live Inspection:</b> Right-click (or hold/tap ⓘ) on any stat row in the sidebar or shrine to inspect the full calculation and derived attributes anytime.</li>
              </ul>
            </div>

            <div class="guide-folio-col">
              <h4 class="guide-section-heading">&#9884; Villages, treasure, and decks</h4>
              <ul class="adnd-bullet-list">
                <li><b>Resting:</b> Resting at the inn restores 2 HP per 1 Gold. Accessible anytime while visiting a village.</li>
                <li><b>Market Trading:</b> Stores stock <code>5 + Village Level</code> eligible item cards drawn from the 42-card Treasure Deck, offering weapons, armor, and consumables.</li>
                <li><b>Training &amp; Destruction:</b> Draft 1 of 3 learnable cards from the New Skills Deck, or permanently sacrifice an unwanted card to the Void.</li>
                <li><b>Undiscovered Exploration:</b> Roll 1d6. A natural <b>6</b> finds treasure; rolls &le; tile level trigger an Ambush; other rolls are safe passage.</li>
                <li><b>The Void &amp; Physical Supply:</b> Unselected creature copies remain publicly inspectable in the <b>Void</b>. Full creature cards use the New Paths set symbol for rarity: <span class="guide-rarity-key">${monsterRaritySymbolHtml(MONSTER_TEMPLATES.goblin, 'guide-set-symbol')} bronze = Common</span>, <span class="guide-rarity-key">${monsterRaritySymbolHtml(MONSTER_TEMPLATES.stalker, 'guide-set-symbol')} silver = Uncommon</span>, and <span class="guide-rarity-key">${monsterRaritySymbolHtml(MONSTER_TEMPLATES.rattler, 'guide-set-symbol')} gold = Rare</span>.</li>
              </ul>

              <div class="adnd-parchment-box callout-quest">
                <h5 class="adnd-box-title">COMMENCING THY JOURNEY</h5>
                <p class="adnd-box-text">
                  Equip thy weapon, steel thy resolve, and choose thy initial steps with wisdom. The realm awaits thy triumph!
                </p>
              </div>

              <div class="adnd-page-jump-row">
                <button class="btn primary guide-jump-btn" data-action="close-guide">${inGame ? 'Back to Game' : 'Ready to Begin'}</button>
              </div>
            </div>
          </div>
        </article>

      </div>

      <!-- Tome Page-Turn Footer with Medallion and Controls -->
      <footer class="guide-tome-footer">
        <button class="btn guide-turn-btn prev ${p <= 1 ? 'is-disabled' : ''}" data-action="guide-prev-page" ${p <= 1 ? 'disabled' : ''} title="Previous Page (A or &larr;)">
          &larr; Previous Page
        </button>

        <div class="guide-page-medallion">
          <span class="guide-medallion-crest" aria-hidden="true">&#10022;</span>
          <span class="guide-medallion-text">PAGE ${p} OF 5</span>
          <span class="guide-medallion-crest" aria-hidden="true">&#10022;</span>
          <span class="guide-turn-hint">Turn page with A / D or &larr; / &rarr; keys</span>
        </div>

        <button class="btn guide-turn-btn next" data-action="${p >= 5 ? 'close-guide' : 'guide-next-page'}" title="${p >= 5 ? 'Close Tome' : 'Next Page (D or &rarr;)'}">
          ${p >= 5 ? 'Close Tome &times;' : 'Next Page &rarr;'}
        </button>
      </footer>

    </div>
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

function voidCardCount(state: RunState): number {
  return getVoidCards().length
    + voidBossCards().length
    + voidHeroClassIds(state.playerClass).length
    + (state.voidCards?.length ?? 0)
    + (state.monsterVoid?.length ?? 0);
}

function monsterRarityLabel(monster: Pick<MonsterCard, 'isBoss' | 'rarity'>): string {
  if (monster.isBoss) return 'Boss';
  const rarity = getMonsterRarity(monster);
  return rarity[0].toUpperCase() + rarity.slice(1);
}

function monsterRaritySymbolHtml(monster: Pick<MonsterCard, 'isBoss' | 'rarity'>, className = ''): string {
  if (monster.isBoss) return '';
  const rarity = getMonsterRarity(monster);
  const label = monsterRarityLabel(monster);
  return `<span class="tcg-set-symbol is-${rarity} ${className}" title="New Paths · ${label}" aria-label="New Paths set symbol: ${label} rarity">
    <img src="${publicAsset(`icons/new-paths-${rarity}.svg`)}" alt="" aria-hidden="true" />
  </span>`;
}

export function classDetailPanelContentHtml(id: ClassId): string {
  const c = CLASS_CATALOG[id];
  const eff: CharacterStats = {
    str: 1 + c.classBonuses.str,
    dex: 1 + c.classBonuses.dex,
    agi: 1 + c.classBonuses.agi,
    int: 1 + c.classBonuses.int,
    cha: 1 + c.classBonuses.cha,
    vit: 1 + c.classBonuses.vit,
  };
  const hp = 10 + eff.vit * 2;
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
      <span class="derived-chip def" title="Physical Defense: floor(STR / 5) + floor(VIT / 5) + floor(AGI / 3) + Gear DEF">${getDerivedStatIcon('def')} DEF <b>${derived.def}</b></span>
      <span class="derived-chip matk" title="Magical Attack: floor(INT / 2) + Gear MATK">${getDerivedStatIcon('matk')} MATK <b>${derived.matk}</b></span>
      <span class="derived-chip mdef" title="Magical Defense: floor(INT / 5) + Gear MDEF">${getDerivedStatIcon('mdef')} MDEF <b>${derived.mdef}</b></span>
      ${derived.pen > 0 ? `<span class="derived-chip pen" title="Physical Penetration: physical attacks ignore this much enemy natural DEF"><span class="pen-symbol">PEN</span> PEN <b>${derived.pen}</b></span>` : ''}
      <span class="derived-chip act" title="Max Action Points: Base 3 + floor(INT / 5)">${getDerivedStatIcon('act')} ACT <b>${derived.act}</b></span>
      <span class="derived-chip crit" title="Critical Hit Range: Boxcars 12 (6+6)">🎲 CRIT <b>${derived.critThreshold ?? 12}+</b></span>
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

export function rightSidebarHtml(state: RunState): string {
  return deckPilesPanelHtml(state, {
    visibleGroups: ['adventure', 'monster', 'player', 'treasure', 'newSkills', 'void'],
    heading: 'Decks &amp; Discards',
  });
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
        <div class="scenario-level">Scenario ${state.currentMission ?? 1} &middot; Level ${state.scenarioLevel ?? state.currentMission ?? 1}</div>
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
        ${playerInfoWidgetHtml(state, {
          title: 'Character & Gear',
          description: 'Your live hero, derived combat values, equipment, and backpack.',
          showGear: true,
        })}
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
    ${ui.pendingTrainingAction ? trainingConfirmModal(state, ui.pendingTrainingAction) : ''}
    ${ui.pendingShrineAction ? shrineConfirmModal(state, ui.pendingShrineAction) : ''}
    ${ui.inspectedCard ? cardInspectModal(ui.inspectedCard, state) : ''}
    ${ui.inspectedStat ? statInspectModal(ui.inspectedStat, state) : ''}
    ${ui.showGuide ? renderGuideModal(true) : ''}
  </main>`;
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
      return combatModal(state, hook.combat, ui);
    case 'VILLAGE':
      return villageModal(state, hook.village, ui);
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
      ${monster.isBoss ? '<span class="tcg-type-main">BOSS</span>' : ''}
      <span class="tcg-type-sub">${formatCreatureSubtype(monster.creatureType)}</span>
      <div class="tcg-spawn-group" aria-label="Spawn terrains: ${(monster.spawnTerrains ?? []).join(', ')}">${renderSpawnBadges(monster.spawnTerrains)}</div>
    </div>
    <div class="creature-header-title"><span class="tcg-name">${monster.name}</span><span class="tcg-card-num">${monster.cardNumber ?? ''}</span></div>
  </header>`;
}

function creatureFooterHtml(monster: MonsterCard, accBonus = 0, evaBonus = 0, defBonus = 0): string {
  const entries = [
    { stat: 'def' as const, value: Math.max(0, (monster.def ?? 0) + defBonus), boosted: defBonus !== 0 },
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
  defBonus?: number;
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
  defBonus = 0,
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
          ${monsterRaritySymbolHtml(monster, 'tcg-creature-rarity-symbol')}
        </div>
        <div class="tcg-textbox tcg-creature-textbox">
          ${monster.abilities?.length ? `<div class="tcg-ability-line">${monster.abilities.join(' &middot; ')}</div>` : ''}
          ${
            attackBonus > 0
              ? `<div class="tcg-active-boon-badge is-buffed-flashing" title="Temporary attack boon active">🔥 Boon: +${attackBonus} ATK</div>`
              : ''
          }
          <div class="tcg-pattern-table">
            ${pattern.map((p, index) => {
              const effectiveDamage = p.damage > 0 ? p.damage + attackBonus : 0;
              const isBuffed = p.damage > 0 && attackBonus > 0;
              const hasPriorEffect = effectiveDamage > 0 || (p.heal ?? 0) > 0 || p.block > 0 || (p.evaBonus ?? 0) > 0 || (p.accBonus ?? 0) > 0 || (p.defBonus ?? 0) !== 0 || Boolean(p.randomBuff);
              return `
                <div class="tcg-pattern-row ${isBuffed ? 'is-buffed-row' : ''}">
                  <span class="p-turn">Turn ${index + 1}</span>
                  <span class="p-label">${p.label}</span>
                  ${p.poisonOnHit ? '<span>Poison on hit</span>' : ''}
                  ${p.ignoreDef ? `<span>Ignore ${p.ignoreDef} DEF</span>` : ''}
                  <span class="p-val">${
                    effectiveDamage > 0
                      ? `<span class="${isBuffed ? 'is-buffed-flashing' : ''}" title="${isBuffed ? `Base ${p.damage} + ${attackBonus} Boon` : ''}"><b>${effectiveDamage}</b> ${p.damageType === 'magical' ? 'MATK' : 'DMG'}${(p.hitCount ?? 1) > 1 ? ` ×${p.hitCount}` : ''}</span>`
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
                    p.defBonus && p.defBonus !== 0
                      ? `${effectiveDamage > 0 || (p.heal ?? 0) > 0 || p.block > 0 || (p.evaBonus ?? 0) > 0 || (p.accBonus ?? 0) > 0 ? ' &middot; ' : ''}${p.defBonus > 0 ? '+' : ''}<b>${p.defBonus}</b> DEF (${p.bonusDuration ?? 1}t)`
                      : ''
                  }${
                    p.randomBuff
                      ? `${effectiveDamage > 0 || (p.heal ?? 0) > 0 || p.block > 0 ? ' &middot; ' : ''}Random +<b>${p.randomBuff.amount}</b> ${p.randomBuff.stats.map(stat => stat.toUpperCase()).join(' / ')} (${p.randomBuff.duration}t)`
                      : ''
                  }${
                    p.summonFromMonsterDeck
                      ? (hasPriorEffect || (p.defBonus ?? 0) > 0 ? ' &middot; ' : '') + `Tutor ${MONSTER_TEMPLATES[p.summonFromMonsterDeck].name}`
                      : ''
                  }${
                    p.damagePerCreatureInPlay
                      ? ` +${p.damagePerCreatureInPlay.amount} per ${MONSTER_TEMPLATES[p.damagePerCreatureInPlay.templateId].name} in play`
                      : ''
                  }${
                    p.damagePerHeroDebuff
                      ? ` +${p.damagePerHeroDebuff} MATK per active Hero debuff`
                      : ''
                  }${
                    p.heroStatDebuff ? heroHexIntentHtml(p) : p.heroEvaDebuff && p.heroEvaDebuff > 0
                      ? (hasPriorEffect ? ' &middot; ' : '') + `-<b>${p.heroEvaDebuff}</b> Hero EVA (${p.heroEvaDebuffDuration ?? 2}t)`
                      : ''
                  }${
                    !p.heroStatDebuff && !p.poisonOnHit && !hasPriorEffect && !p.summonFromMonsterDeck && !p.defBonus && !p.randomBuff && (!p.heroEvaDebuff || p.heroEvaDebuff === 0) ? 'Idle' : ''
                  }</span>
                </div>`;
            }).join('')}
          </div>
        </div>
        ${creatureFooterHtml(monster, accBonus, evaBonus, defBonus)}
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
  carouselClass: string = '',
  allMonsters: CombatMonster[] = [],
  heroDebuffCount = 0
): string {
  const m = cm.monster;
  const dead = cm.hp <= 0;
  const currentHp = dead ? 0 : cm.hp;
  const hpPct = Math.max(0, Math.min(100, Math.round((currentHp / m.maxHp) * 100)));
  const intent = getMonsterIntent(cm, allMonsters, heroDebuffCount);
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
      defBonus: cm.defBonus ?? 0,
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
                      ? `<span class="${(cm.attackBonus ?? 0) > 0 ? 'is-buffed-flashing' : ''}"><b>${intent.damage}</b> ${intent.damageType === 'magical' ? 'MATK' : 'DMG'}${(intent.hitCount ?? 1) > 1 ? ` ×${intent.hitCount}` : ''}</span>`
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
                    intent.defBonus && intent.defBonus !== 0
                      ? (intent.damage > 0 || (intent.heal ?? 0) > 0 || intent.block > 0 ? ' &middot; ' : '') + `${intent.defBonus > 0 ? '+' : ''}<b>${intent.defBonus}</b> DEF`
                     : ''
                 }${
                    intent.randomBuff
                      ? (intent.damage > 0 || intent.block > 0 ? ' &middot; ' : '') + `Random +<b>${intent.randomBuff.amount}</b> ${intent.randomBuff.stats.map(stat => stat.toUpperCase()).join(' / ')}`
                      : ''
                  }${
                   intent.summonFromMonsterDeck
                     ? (intent.damage > 0 || intent.block > 0 || (intent.defBonus ?? 0) > 0 ? ' &middot; ' : '') + `Tutor ${MONSTER_TEMPLATES[intent.summonFromMonsterDeck].name}`
                     : ''
                 }${
                   intent.heroStatDebuff ? heroHexIntentHtml(intent) : intent.heroEvaDebuff && intent.heroEvaDebuff > 0
                     ? (intent.damage > 0 || (intent.heal && intent.heal > 0) || intent.block > 0 || (intent.evaBonus && intent.evaBonus > 0) || (intent.accBonus && intent.accBonus > 0) ? ' &middot; ' : '') + `-<b>${intent.heroEvaDebuff}</b> Hero EVA (${intent.heroEvaDebuffDuration ?? 2}t)`
                     : ''
                 }${
                    !intent.heroStatDebuff && !intent.poisonOnHit && !intent.summonFromMonsterDeck && !intent.defBonus && !intent.randomBuff && intent.damage === 0 && intent.block === 0 && (!intent.heal || intent.heal === 0) && (!intent.evaBonus || intent.evaBonus === 0) && (!intent.accBonus || intent.accBonus === 0) && (!intent.heroEvaDebuff || intent.heroEvaDebuff === 0) ? 'Idle' : ''
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
    text.includes('enters the Stack') ||
    text.includes('fully resolves') ||
    /:\s*(?:discarded|drew|regained)\b/i.test(text) ||
    text.includes('Battle Flag:') ||
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
    ${(combat.heroStatDebuffs ?? []).map(effect => `<div class="hud-badge status">${effect.label}: ${[
      ...Object.entries(effect.stats).map(([stat, value]) => `-${value} ${stat.toUpperCase()}`),
      effect.damageTaken ? `+${effect.damageTaken} DMG taken` : '',
    ].filter(Boolean).join(', ')} · ${effect.turnsRemaining} turn(s)</div>`).join('')}
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
  const combatGear = computeCombatGearBonuses(state.equippedGear);
  const heroDebuffs = getHeroStatDebuffMods(combat);
  const playerAcc = getPlayerAcc(stats, combatGear.acc) + (combat.playerAccMod ?? 0) + heroDebuffs.acc;
  const playerEva = getPlayerEva(stats, combat.playerEvasionMod + heroDebuffs.eva, combatGear.eva);
  const playerCritThreshold = getPlayerCritThreshold(stats);
  const res = state.playerResources!;
  const living = combat.monsters.filter((m) => m.hp > 0).length;
  const target =
    combat.monsters[ui.targetIndex] && combat.monsters[ui.targetIndex].hp > 0
      ? ui.targetIndex
      : firstLivingMonsterIndex(combat);
  ui.targetIndex = target;
  const totalMonsters = combat.monsters.length;
  const heroDebuffCount = (combat.heroStatDebuffs ?? []).filter((effect) => effect.turnsRemaining > 0).length
    + (state.statusEffects?.length ?? 0)
    + ((combat.playerEvaDebuffTurns ?? 0) > 0 ? 1 : 0);
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
                return monsterCardHtml(cm, i, i === target, living > 1, playerAcc, playerCritThreshold, posClass, combat.monsters, heroDebuffCount);
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
          <span>${getDerivedStatIcon('eva', 'chip-icon')} EVA <b>${playerEva}</b></span>
          ${combatGear.pen > 0 ? `<span class="pen-line" title="Physical attacks ignore enemy natural DEF">PEN <b>${combatGear.pen}</b></span>` : ''}
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
      <div class="confirm-modal-body">
        <div class="confirm-visual-col">
          <div class="confirm-card-comparison">
            <div class="confirm-card-col source">
              <div class="col-header-badge source-badge">Permanent Action (${FLEE_AP_COST} AP)</div>
              <div class="confirm-card-frame">${combatCardHtml(fleeCard, stats, true, 'noop', false, state)}</div>
            </div>
          </div>
        </div>
        <div class="confirm-details-col">
          <div class="confirm-calc-section">
        <div class="confirm-stat-chips-grid">
          <div class="confirm-chip">
            <span class="chip-label">Effective AGI</span>
            <span class="chip-value"><b>${stats.agi}</b></span>
            <span class="chip-sub">Effective stat</span>
          </div>
          <span class="chip-operator">&rarr;</span>
          <div class="confirm-chip target-roll">
            <span class="chip-label">Escape Target</span>
            <span class="chip-value">🎲 <b>&le; ${threshold}</b></span>
            <span class="chip-sub">&lfloor;AGI / 2&rfloor; (min 1) on 1d6</span>
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
      </div>
    </div>
  </div>`;
}

function heroTargetCardHtml(state: RunState, combat: ActiveCombatState, stats: CharacterStats): string {
  const className = getPlayerClassName(state.playerClass);
  const res = state.playerResources!;
  const combatGear = computeCombatGearBonuses(state.equippedGear);
  const heroDebuffs = getHeroStatDebuffMods(combat);
  const effEva = getPlayerEva(stats, combat.playerEvasionMod + heroDebuffs.eva, combatGear.eva);
  const effAcc = getPlayerAcc(stats, combatGear.acc) + (combat.playerAccMod ?? 0) + heroDebuffs.acc;
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
  const combatGear = computeCombatGearBonuses(state.equippedGear);
  const heroDebuffs = getHeroStatDebuffMods(combat);
  const effect = computeCardEffect(
    card,
    stats,
    combatGear,
    getFighterBerzerkBonus(state.playerClass, state.playerResources?.hp, state.playerResources?.maxHp),
    selectedDiscardIds.length,
    (combat.playerAccMod ?? 0) + heroDebuffs.acc,
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
  const playerAccMod = (combat.playerAccMod ?? 0) + heroDebuffs.acc;
  const baseAcc = getPlayerAcc(stats, combatGear.acc);
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

  const allTargetOdds = livingMonsters.map(({ m, idx }) => {
    const eva = (m.monster.eva ?? 0) + (m.evaBonus ?? 0);
    const targetNetAcc = totalAcc - eva;
    const targetNeededRoll = Math.max(2, Math.min(12, BASE_HIT_THRESHOLD - targetNetAcc));
    return { m, idx, eva, netAcc: targetNetAcc, neededRoll: targetNeededRoll, probability: computeHitProbability(targetNeededRoll, critThreshold) };
  });

  const targetCardHtml = isAttack && card.targetMode === 'all_enemies'
    ? `<div class="confirm-all-targets-grid">${allTargetOdds.map(({ m, idx, neededRoll: roll, probability }) => `
        <article class="confirm-all-target-card">
          <div class="confirm-all-target-card-frame">
            ${fullCreatureCardHtml({
              monster: m.monster,
              attackBonus: m.attackBonus ?? 0,
              accBonus: m.accBonus ?? 0,
              evaBonus: m.evaBonus ?? 0,
              defBonus: m.defBonus ?? 0,
              className: 'is-targeted',
              attributes: `data-inspect-kind="monster" data-monster-id="${m.monster.templateId}" data-monster-index="${idx}"`,
            })}
          </div>
          <div class="confirm-all-target-odds"><b>${m.monster.name}</b><span>Roll ${roll}+ · ${probability.hitPercent}% hit</span></div>
        </article>`).join('')}</div>`
    : isAttack && targetMonster
    ? monsterCardHtml(targetMonster, targetIdx, true, false, totalAcc, critThreshold, '', combat.monsters)
    : heroTargetCardHtml(state, combat, stats);

  return `
  <div class="modal-backdrop combat-confirm-backdrop" data-action="close-confirm-backdrop">
    <div class="modal combat-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <header class="confirm-modal-header">
        <h2 id="confirm-modal-title" class="confirm-title">Use <span>${card.name}</span> on <span>${targetName}</span></h2>
        <button class="modal-close-btn" data-action="cancel-play-card" aria-label="Cancel">&times;</button>
      </header>

      <div class="confirm-modal-body">
        <div class="confirm-visual-col">
          <div class="confirm-card-comparison ${card.targetMode === 'all_enemies' ? 'is-multitarget' : ''}">
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

        <div class="confirm-card-col target ${card.targetMode === 'all_enemies' ? 'is-all-targets' : ''}">
          <div class="col-header-badge target-badge">${card.targetMode === 'all_enemies' ? 'All Target Creatures · Separate Hit Checks' : isAttack ? 'Target Creature' : 'Target (Self)'}</div>
          <div class="confirm-card-frame">
            ${targetCardHtml}
          </div>
        </div>
      </div>
    </div>

    <div class="confirm-details-col">
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
        isAttack && card.targetMode !== 'all_enemies'
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
            <span class="chip-sub">5 &minus; (${netAcc >= 0 ? '+' : ''}${netAcc})</span>
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
          : isAttack
          ? `
      <div class="confirm-calc-section multitarget-calc">
        <h3>Every living enemy makes its own hit check</h3>
        <div class="multitarget-odds-list">
          ${allTargetOdds.map(({ m, eva, netAcc: targetNet, neededRoll: roll, probability }) => `
            <div class="multitarget-odds-row">
              <b>${m.monster.name}</b>
              <span>ACC ${totalAcc} − EVA ${eva} = ${targetNet >= 0 ? '+' : ''}${targetNet}</span>
              <span>Roll <b>${roll}+</b></span>
              <strong>${probability.hitPercent}%</strong>
            </div>`).join('')}
        </div>
        <div class="prob-notes-row">
          <span class="prob-note crit">👑 ${critLabel}</span>
          <span class="prob-note miss">🐍 Snake Eyes always misses</span>
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

function eventAdventureCardHtml(card: AdventureCard, setLabel = '✦ LAND'): string {
  return renderAdventureCardHtml(card, {
    className: 'shrine-land-card',
    attributes: `data-inspect-kind="adventure" data-card-id="${card.id}"`,
    setLabel,
    loading: 'eager',
  });
}

function shrineSkillUpgradeSection(state: RunState): string {
  const shrineLevel = getShrineLevel(state);
  if (shrineLevel < 2 || !state.playerResources) return '';
  const options = getShrineSkillUpgradeOptions(state);
  const stats = getEffectiveStatsFromState(state);
  const upgradeCards = options.map((option) => {
    const canAfford = state.playerResources!.gold >= option.goldCost
      && state.playerResources!.statPoints >= option.statPointCost;
    const missingCosts = [
      state.playerResources!.gold < option.goldCost ? `${option.goldCost - state.playerResources!.gold} Gold` : '',
      state.playerResources!.statPoints < option.statPointCost ? `${option.statPointCost - state.playerResources!.statPoints} SP` : '',
    ].filter(Boolean).join(' and ');
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
        ${canAfford
          ? `<button class="btn primary void-upgrade-btn" data-action="request-shrine-skill-upgrade" data-id="${option.source.instanceId}">
              Upgrade (${option.goldCost} Gold · ${option.statPointCost} SP)
            </button>`
          : `<div class="shrine-upgrade-unavailable">Needs ${missingCosts} to upgrade</div>`}
      </article>`;
  }).join('');

  return `
    <section class="shrine-section void-upgrade-section">
      <div class="void-upgrade-heading">
        <div>
          <h3>🌀 Void Skill Upgrades</h3>
          <p class="muted">This Level ${shrineLevel} Shrine can pull matching upgrade cards from the Void.</p>
        </div>
        <button class="void-inspect-link" data-action="open-pile" data-pile="void_deck">Inspect Void (${voidCardCount(state)})</button>
      </div>
      <p class="void-upgrade-rule">
        ${shrineLevel >= 3
          ? 'Upgrade an owned 1 AP base card to its matching + version for 10 Gold + 2 SP, or a 2 AP card to a 3 AP version for 30 Gold + 6 SP.'
          : 'Upgrade an owned 1 AP base card to its matching + version for 10 Gold + 2 SP.'}
      </p>
      ${upgradeCards || '<p class="muted void-upgrade-empty">You do not currently own a card with an eligible Void upgrade.</p>'}
    </section>`;
}

export function statUpgradeWidgetHtml(
  state: RunState,
  action = 'shrine-upgrade',
  selectedStat: StatKey | null = null,
): string {
  const res = state.playerResources!;
  const eff = getEffectiveStatsFromState(state);
  const shrineCap = action === 'shrine-upgrade' ? getActiveShrineBaseStatCap(state) : null;
  const isShrineSelection = action === 'shrine-upgrade';

  const rows = STATS.map((s) => {
    const base = state.playerBaseStats[s];
    const cost = getBaseStatUpgradeCost(base);
    const atShrineCap = shrineCap !== null && base >= shrineCap;
    const can = !atShrineCap && res.statPoints >= cost;
    let benefitNote = '';
    if (s === 'str') {
      benefitNote = ` <small>(ATK +${Math.floor(eff.str / 2)} &rarr; +${Math.floor((eff.str + 1) / 2)}, DEF +${Math.floor(eff.str / 5)} &rarr; +${Math.floor((eff.str + 1) / 5)})</small>`;
    } else if (s === 'dex') {
      benefitNote = ` <small>(ACC ${Math.floor(eff.dex / 2)} &rarr; ${Math.floor((eff.dex + 1) / 2)}, ATK +${Math.floor(eff.dex / 3)} &rarr; +${Math.floor((eff.dex + 1) / 3)})</small>`;
    } else if (s === 'agi') {
      benefitNote = ` <small>(EVA ${Math.floor(eff.agi / 2)} &rarr; ${Math.floor((eff.agi + 1) / 2)}, DEF +${Math.floor(eff.agi / 3)} &rarr; +${Math.floor((eff.agi + 1) / 3)})</small>`;
    } else if (s === 'int') {
      benefitNote = ` <small>(MATK +${Math.floor(eff.int / 2)} &rarr; +${Math.floor((eff.int + 1) / 2)}, MDEF +${Math.floor(eff.int / 5)} &rarr; +${Math.floor((eff.int + 1) / 5)}, ACT ${3 + Math.floor(eff.int / 5)} &rarr; ${3 + Math.floor((eff.int + 1) / 5)})</small>`;
    } else if (s === 'cha') {
      benefitNote = ` <small>(Shop discount -${eff.cha * 5}% &rarr; -${(eff.cha + 1) * 5}%)</small>`;
    } else if (s === 'vit') {
      benefitNote = ` <small>(Max HP ${res.maxHp} &rarr; ${res.maxHp + 2}, DEF +${Math.floor(eff.vit / 5)} &rarr; +${Math.floor((eff.vit + 1) / 5)})</small>`;
    }
    const rowContents = `
      <span style="display:flex;align-items:center;gap:8px;">
        ${getStatIcon(s, 'stat-icon')}
        <span>
          <b>${s.toUpperCase()}</b> ${eff[s]} &rarr; <b>${eff[s] + 1}</b>${benefitNote}<br/>
          <small>Base ${base} &rarr; ${base + 1} &middot; cost ${cost} SP</small>
        </span>
        <span class="stat-info-pill" title="View stat breakdown">&#9432;</span>
      </span>
      ${isShrineSelection ? `<span class="shrine-stat-option-status">${atShrineCap ? `Max Base ${shrineCap}` : `${cost} SP`}</span>` : ''}`;

    if (isShrineSelection) {
      return `
      <button type="button" class="shop-row shrine-stat-option inspectable-stat ${selectedStat === s ? 'is-selected' : ''} ${atShrineCap ? 'is-capped' : ''}"
        data-action="select-shrine-stat" data-stat="${s}" data-inspect-stat="${s}"
        aria-pressed="${selectedStat === s ? 'true' : 'false'}"
        title="Select ${s.toUpperCase()} for upgrading. Right-click for the full stat breakdown.">
        ${rowContents}
      </button>`;
    }

    return `
    <div class="shop-row inspectable-stat"
      data-action="inspect-stat" data-stat="${s}" data-inspect-stat="${s}"
      title="Click or right-click to view full ${s.toUpperCase()} computation & next SP breakdown">
      ${rowContents}
      <button class="btn mini" data-action="${action}" data-stat="${s}" ${can ? '' : 'disabled'}>
        ${atShrineCap ? `Max Base ${shrineCap}` : `Upgrade (${cost} SP)`}
      </button>
    </div>`;
  }).join('');

  let shrineActionHtml = '';
  if (isShrineSelection) {
    if (!selectedStat) {
      shrineActionHtml = '<div class="shrine-stat-action-message">Select a stat to review its upgrade.</div>';
    } else {
      const selectedBase = state.playerBaseStats[selectedStat];
      const selectedCost = getBaseStatUpgradeCost(selectedBase);
      const selectedAtCap = shrineCap !== null && selectedBase >= shrineCap;
      const missingSp = Math.max(0, selectedCost - res.statPoints);
      shrineActionHtml = selectedAtCap
        ? `<div class="shrine-stat-action-message is-capped">${selectedStat.toUpperCase()} is already at this Shrine's maximum Base ${shrineCap}.</div>`
        : missingSp > 0
          ? `<div class="shrine-stat-action-message is-needed">Needs ${missingSp} SP to upgrade ${selectedStat.toUpperCase()}.</div>`
          : `<button class="btn primary big shrine-stat-upgrade-btn" data-action="request-shrine-stat-upgrade" data-stat="${selectedStat}">
              Upgrade ${selectedStat.toUpperCase()} (${selectedCost} SP)
            </button>`;
    }
  }

  const rowsAndAction = `
    <div class="shop-list shrine-stat-options">${rows}</div>
    ${isShrineSelection ? `<div class="shrine-stat-action-area">${shrineActionHtml}</div>` : ''}`;

  return `
  <div class="shrine-section stat-converter-section">
    <h3>Convert Stat Points into Base Stats</h3>
    <p class="muted">${getResourceIcon('sp', 'chip-icon')} Stat Points: <b>${res.statPoints} SP</b></p>
    ${shrineCap !== null ? `<p class="shrine-stat-cap">This Level ${shrineCap - 1} Shrine can raise a Base Stat only as high as <b>Base ${shrineCap}</b>.</p>` : ''}
    ${isShrineSelection
      ? `<div class="shrine-stat-workspace">
          ${playerInfoWidgetHtml(state, {
            title: 'Current Character',
            description: 'Select a stat on the right to preview its upgrade.',
            showGear: false,
          })}
          <div class="shrine-stat-choice-panel">${rowsAndAction}</div>
        </div>`
      : rowsAndAction}
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
  const terrain = getTerrainPresentation(card.terrain);
  const terrainIcon = terrain.icon;
  const capTerrain = terrain.label;

  const roll = exploration.roll;
  const effectiveRoll = exploration.effectiveRoll ?? roll;
  const rollBreakdown = `Natural ${roll}`;
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
  const hasBonuses = luckyCharmBonus > 0;

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
                  ? `Base: +${victory.baseGold}g${
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

function shrineModal(state: RunState, ui: UiState): string {
  const shrine = state.activeHook.type === 'SHRINE' ? state.activeHook.shrine : null;
  const prayerHtml = shrine ? shrinePrayerSection(shrine) : '';
  const shrineCard = shrine ? state.board[coordToKey(shrine.coord)]?.card : null;
  const shrineLevel = shrineCard?.level ?? 0;

  return `
  <div class="modal-backdrop">
    <div class="modal shrine-modal">
      <header class="shrine-modal-heading">
        <div>
          <span class="shrine-heading-eyebrow">Sacred Shrine · Level ${shrineLevel}</span>
          <h2>&#10022; ${shrineCard?.name ?? 'Sacred Shrine'}</h2>
        </div>
        <p class="banner-inline">${state.bannerMessage}</p>
      </header>

      <div class="shrine-modal-layout">
        <aside class="shrine-context-column">
          ${shrineCard ? eventAdventureCardHtml(shrineCard, '✦ SHRINE') : ''}
          ${shrineCard ? `<section class="shrine-lore-panel">
            <span class="shrine-lore-eyebrow">Lore of the Shrine</span>
            <p>${shrineCard.flavorText ?? 'An ancient sacred place where a hero may reflect, grow, and choose a new path.'}</p>
          </section>` : ''}
        </aside>
        <div class="shrine-services-column">
          ${prayerHtml}
          ${statUpgradeWidgetHtml(state, 'shrine-upgrade', ui.selectedShrineStat ?? null)}
          ${shrineSkillUpgradeSection(state)}
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn primary big" data-action="request-leave-shrine">Leave Shrine &rarr;</button>
      </div>
    </div>
  </div>`;
}

function shrineConfirmModal(state: RunState, pending: PendingShrineAction): string {
  if (state.activeHook.type !== 'SHRINE' || !state.playerResources) return '';
  const res = state.playerResources;

  if (pending.kind === 'leave') {
    return `
    <div class="modal-backdrop transaction-confirm-backdrop" data-action="cancel-shrine-action-backdrop">
      <div class="modal shrine-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="shrine-confirm-title">
        <header class="confirm-modal-header">
          <h2 id="shrine-confirm-title">Leave this Shrine?</h2>
          <button class="modal-close-btn" data-action="cancel-shrine-action" aria-label="Cancel">&times;</button>
        </header>
        <div class="shrine-confirm-copy">
          <p>You are about to leave this Sacred Shrine and return to the map.</p>
          <p class="muted">Any upgrades already completed remain permanent.</p>
        </div>
        <footer class="confirm-modal-footer">
          <button class="btn primary big" data-action="confirm-shrine-action">Confirm Leave</button>
          <button class="btn secondary" data-action="cancel-shrine-action">Stay at Shrine</button>
        </footer>
      </div>
    </div>`;
  }

  if (pending.kind === 'upgrade-stat') {
    const stat = pending.stat;
    const base = state.playerBaseStats[stat];
    const effective = getEffectiveStatsFromState(state)[stat];
    const cost = getBaseStatUpgradeCost(base);
    const cap = getActiveShrineBaseStatCap(state);
    const canConfirm = (cap === null || base < cap) && res.statPoints >= cost;
    return `
    <div class="modal-backdrop transaction-confirm-backdrop" data-action="cancel-shrine-action-backdrop">
      <div class="modal shrine-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="shrine-confirm-title">
        <header class="confirm-modal-header">
          <h2 id="shrine-confirm-title">Upgrade ${stat.toUpperCase()}?</h2>
          <button class="modal-close-btn" data-action="cancel-shrine-action" aria-label="Cancel">&times;</button>
        </header>
        <div class="shrine-confirm-stat-preview">
          ${getStatIcon(stat, 'stat-icon')}
          <div><b>${stat.toUpperCase()} ${effective} &rarr; ${effective + 1}</b><span>Base ${base} &rarr; ${base + 1}</span></div>
        </div>
        <div class="shrine-confirm-cost">Spend <b>${cost} SP</b> &middot; Current balance: <b>${res.statPoints} SP</b></div>
        <p class="muted">This Base Stat upgrade is permanent.</p>
        <footer class="confirm-modal-footer">
          <button class="btn primary big" data-action="confirm-shrine-action" ${canConfirm ? '' : 'disabled'}>Confirm Upgrade</button>
          <button class="btn secondary" data-action="cancel-shrine-action">Cancel</button>
        </footer>
      </div>
    </div>`;
  }

  const option = getShrineSkillUpgradeOptions(state)
    .find(candidate => candidate.source.instanceId === pending.sourceInstanceId);
  if (!option) return '';
  const canConfirm = res.gold >= option.goldCost && res.statPoints >= option.statPointCost;
  const stats = getEffectiveStatsFromState(state);
  return `
  <div class="modal-backdrop transaction-confirm-backdrop" data-action="cancel-shrine-action-backdrop">
    <div class="modal shrine-confirm-modal shrine-skill-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="shrine-confirm-title">
      <header class="confirm-modal-header">
        <h2 id="shrine-confirm-title">Upgrade ${option.source.name}?</h2>
        <button class="modal-close-btn" data-action="cancel-shrine-action" aria-label="Cancel">&times;</button>
      </header>
      <div class="shrine-confirm-skill-cards">
        ${combatCardHtml(option.source, stats, false, 'play-card', true, state, true)}
        <span aria-hidden="true">&rarr;</span>
        ${combatCardHtml(option.upgrade, stats, false, 'play-card', true, state, true)}
      </div>
      <div class="shrine-confirm-cost">Spend <b>${option.goldCost} Gold + ${option.statPointCost} SP</b></div>
      <footer class="confirm-modal-footer">
        <button class="btn primary big" data-action="confirm-shrine-action" ${canConfirm ? '' : 'disabled'}>Confirm Upgrade</button>
        <button class="btn secondary" data-action="cancel-shrine-action">Cancel</button>
      </footer>
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
  const villageArt = villageCard ? getAdventureRasterArtPath(villageCard) : publicAsset('cards/adventure/grassland_village.jpg');
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
      <button class="btn big" data-action="village-train">Training<small>Learn skills or destroy cards</small></button>
    </div>
    <button class="btn" data-action="village-leave">Leave village</button>`;
  } else if (village.subView === 'shop') {
    const shopLevel = state.board[coordToKey(village.coord)]?.card.level ?? 1;
    const shopLevelBand = shopLevel === 1 ? 'Level 1' : `Levels ${shopLevel - 1}–${shopLevel}`;
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
          : `<p class="muted empty-shop-stock">No ${shopLevelBand} items are available in this store.</p>`
        : owned.length
        ? owned.map((i) => shopSellRow(state, i)).join('')
        : '<p class="muted">Nothing to sell.</p>';
    body = `
    <div class="shop-layout">
      <aside class="shop-sidebar">
        ${playerInfoWidgetHtml(state, {
          title: 'Character & Gear',
          description: 'Your live hero, derived combat values, equipment, and backpack.',
          showGear: true,
        })}
      </aside>
      <section class="shop-main">
        <p class="muted">Level ${shopLevel} store · Supplies ${shopLevelBand} items</p>
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

        </div>
      </section>
    </div>`;
  } else {
    const stats = getEffectiveStatsFromState(state);
    const canRemove = state.playerMasterDeck.length > MIN_DECK_SIZE;
    const removalCost = getTrainRemovalCost(state);
    const canAffordRemoval = res.gold >= removalCost;
    body = `
    <div class="village-training-layout">
      <div class="village-training-main">
        <section class="train-section">
          <h3>Learn a skill</h3>
          <p class="muted">Select a card to review its purchase before paying.</p>
          <div class="train-card-grid">${village.trainOptions.length
            ? village.trainOptions.map((c) => {
              const cost = getTrainingSkillCost(c);
              const canLearn = res.gold >= cost.gold && res.statPoints >= cost.statPoints;
              return `<div class="train-card-offer">${combatCardHtml(c, stats, canLearn, 'train-draft', false, state)}<span>${cost.gold} Gold · ${cost.statPoints} SP</span></div>`;
            }).join('')
            : '<p class="muted">All pre-drawn training offers have been learned.</p>'}</div>
        </section>
        <section class="train-section">
          <h3>Destroy a card <small>${canRemove ? `(${removalCost} Gold)` : '(deck at minimum size)'}</small></h3>
          <p class="muted">Destroyed cards go to the Void. Each destruction increases the next cost by 1 Gold for this adventure.</p>
          <div class="train-card-grid">${state.playerMasterDeck
            .map((c) => `<div class="train-card-offer">${combatCardHtml(c, stats, canRemove && canAffordRemoval, 'train-remove', false, state)}<span>${removalCost} Gold</span></div>`)
            .join('')}</div>
        </section>
      </div>
      <aside class="village-training-sidebar" aria-label="Training resources">
        <h3>Your Resources</h3>
        <div class="training-resource-value">${getResourceIcon('gold', 'chip-icon')} <span><b>${res.gold}</b> Gold</span></div>
        <div class="training-resource-value">${getResourceIcon('sp', 'chip-icon')} <span><b>${res.statPoints}</b> SP</span></div>
        <hr />
        <h4>Learning costs</h4>
        <ul><li>1 AP: 5 Gold + 1 SP</li><li>2 AP: 10 Gold + 2 SP</li><li>3 AP: 20 Gold + 4 SP</li></ul>
        <h4>Destroy cost</h4>
        <p><b>${removalCost} Gold</b> now<br/><small>Next: ${removalCost + 1} Gold</small></p>
        <button class="void-inspect-link" data-action="open-pile" data-pile="void_deck">Inspect Void (${voidCardCount(state)})</button>
      </aside>
    </div>
    <div class="modal-actions"><button class="btn" data-action="village-back">&larr; Village options</button><button class="btn primary" data-action="village-leave">Leave village</button></div>`;
  }
  return `
  <div class="modal-backdrop">
    <div class="modal village-modal ${village.subView === 'shop' ? 'is-shop' : ''} ${village.subView === 'train' ? 'is-train' : ''}">
      ${locationHeader}
      ${body}
    </div>
  </div>`;
}

function trainingConfirmModal(state: RunState, pending: PendingTrainingAction): string {
  if (state.activeHook.type !== 'VILLAGE' || state.activeHook.village.subView !== 'train' || !state.playerResources) return '';
  const village = state.activeHook.village;
  const card = pending.kind === 'learn'
    ? village.trainOptions.find(option => option.instanceId === pending.cardInstanceId)
    : state.playerMasterDeck.find(owned => owned.instanceId === pending.cardInstanceId);
  if (!card) return '';
  const stats = getEffectiveStatsFromState(state);
  const skillCost = getTrainingSkillCost(card);
  const destroyCost = getTrainRemovalCost(state);
  const goldCost = pending.kind === 'learn' ? skillCost.gold : destroyCost;
  const spCost = pending.kind === 'learn' ? skillCost.statPoints : 0;
  const canAfford = state.playerResources.gold >= goldCost && state.playerResources.statPoints >= spCost;
  const title = pending.kind === 'learn' ? `Learn ${card.name}?` : `Destroy ${card.name}?`;
  const detail = pending.kind === 'learn'
    ? `This exact card will move from the New Skills offer into your Combat Deck.`
    : `This card will permanently leave your Combat Deck and move to the Void. The next destruction will cost ${destroyCost + 1} Gold.`;

  return `
  <div class="modal-backdrop transaction-confirm-backdrop" data-action="cancel-training-action-backdrop">
    <div class="modal training-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="training-confirm-title">
      <header class="confirm-modal-header">
        <h2 id="training-confirm-title">${title}</h2>
        <button class="modal-close-btn" data-action="cancel-training-action" aria-label="Cancel">&times;</button>
      </header>
      <div class="training-confirm-body">
        <div class="training-confirm-card">${combatCardHtml(card, stats, false, 'noop', false, state)}</div>
        <div class="training-confirm-copy">
          <p>${detail}</p>
          <div class="training-confirm-balance">
            <span>${getResourceIcon('gold', 'chip-icon')} You have <b>${state.playerResources.gold} Gold</b></span>
            <span>${getResourceIcon('sp', 'chip-icon')} You have <b>${state.playerResources.statPoints} SP</b></span>
          </div>
          <div class="training-confirm-cost">Cost: <b>${goldCost} Gold${spCost > 0 ? ` + ${spCost} SP` : ''}</b></div>
        </div>
      </div>
      <footer class="confirm-modal-footer">
        <button class="btn primary big" data-action="confirm-training-action" ${canAfford ? '' : 'disabled'}>
          ${pending.kind === 'learn' ? 'Confirm Purchase' : 'Confirm Destroy'}
        </button>
        <button class="btn secondary" data-action="cancel-training-action">Cancel</button>
      </footer>
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
  let title = 'Card Details';

  if (inspected.kind === 'action') {
    const card = inspected.card;
    const combatGear = computeCombatGearBonuses(state.equippedGear);
    const eff = getActionCardEffect(card, stats, state);

    title = `${card.name} — Card Details`;

    // Card-specific formula breakdowns and live digital values.
    const scalingRows: string[] = [];
    if (card.damageScalingStat) {
      const s = card.damageScalingStat.toUpperCase();
      const statLabel = card.damageScalingStat === 'atk' || card.damageScalingStat === 'def' ? s : `Effective ${s}`;
      const div = card.damageScalingDivisor ?? 2;
      const multiplier = card.damageScalingMultiplier ?? 1;
      const sVal = card.damageScalingStat === 'atk'
        ? getPlayerAtk(stats, combatGear.atk)
          + getFighterBerzerkBonus(state.playerClass, state.playerResources?.hp, state.playerResources?.maxHp)
        : card.damageScalingStat === 'def'
        ? getPlayerDef(stats, combatGear.def)
        : stats[card.damageScalingStat];
      const bonus = Math.floor(sVal / div) * multiplier;
      const liveAccModifier = state.activeHook.type === 'COMBAT'
        ? (state.activeHook.combat.playerAccMod ?? 0) + getHeroStatDebuffMods(state.activeHook.combat).acc
        : 0;
      const accValue = card.damageAddsAccuracy
        ? getPlayerAcc(stats, combatGear.acc) + liveAccModifier
        : 0;
      const additional = eff.damage - card.baseDamage - bonus - accValue;
      const additionalText = additional ? ` + ${additional} (DEX, gear and passive bonuses)` : '';
      const formulaStat = div === 1 ? statLabel : `&lfloor;${statLabel} / ${div}&rfloor;`;
      const calculationStat = div === 1 ? `${sVal}` : `&lfloor;${sVal} / ${div}&rfloor;`;
      const formulaTerms = [
        card.baseDamage > 0 ? `${card.baseDamage} Base DMG` : '',
        `${multiplier === 1 ? '' : `${multiplier} × `}${formulaStat}`,
        card.damageAddsAccuracy ? 'ACC' : '',
      ].filter(Boolean).join(' + ');
      const calculationTerms = [
        card.baseDamage > 0 ? `${card.baseDamage}` : '',
        `${multiplier === 1 ? '' : `${multiplier} × `}${calculationStat}`,
        card.damageAddsAccuracy ? `${accValue} ACC` : '',
      ].filter(Boolean).join(' + ');
      scalingRows.push(`
        <div class="inspect-formula-row">
          <span class="formula-label">${card.id === 'melee_atk' ? 'Normal Damage Formula' : 'Damage Formula'}</span>
          <span class="formula-math">${formulaTerms}${additionalText}</span>
          <span class="formula-calc">Hero Calculation: ${calculationTerms}${additionalText} = <b>${eff.damage} DMG</b></span>
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
        ? getPlayerDef(stats, combatGear.def)
        : card.blockScalingStat === 'atk'
        ? getPlayerAtk(stats, combatGear.atk)
        : stats[card.blockScalingStat];
      const bonus = Math.floor(sVal / div) * multiplier;
      const formulaStat = div === 1 ? statLabel : `&lfloor;${statLabel} / ${div}&rfloor;`;
      const calculationStat = div === 1 ? `${sVal}` : `&lfloor;${sVal} / ${div}&rfloor;`;
      scalingRows.push(`
        <div class="inspect-formula-row">
          <span class="formula-label">Block Formula</span>
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
          <span class="formula-label">Combat Evasion Bonus</span>
          <span class="formula-math">+${mult} to hero EVA against 2d6 attacks this turn</span>
          <span class="formula-calc">Hero Calculation: +${eff.evasionBonus} EVA to raise required enemy 2d6 roll</span>
        </div>
      `);
    }

    if (card.accBonus) {
      const heroAcc = getPlayerAcc(stats, combatGear.acc);
      scalingRows.push(`
        <div class="inspect-formula-row">
          <span class="formula-label">Attack Accuracy Bonus</span>
          <span class="formula-math">${card.accBonus > 0 ? '+' : ''}${card.accBonus} ACC on attack rolls</span>
          <span class="formula-calc">Hero Calculation: ${heroAcc} Hero ACC ${card.accBonus > 0 ? '+' : ''}${card.accBonus} Card ACC = <b>${heroAcc + card.accBonus} Total ACC</b></span>
        </div>
      `);
    }

    cardHtml = renderActionCardHtml(card, stats, {
      state,
      viewOnly: true,
      className: 'tcg-inspect-card',
      artWindowClassName: 'full-inspect-art',
    });

    const cardRuleItems = [
      card.staysInPlay
        ? '<li><b>Enchantment:</b> Stays in play for the rest of this battle unless an effect destroys it.</li>'
        : '',
      card.drawOnApGain
        ? '<li><b>Rally Trigger:</b> While this is in play, whenever another card effect grants AP, draw one card. Playing Battle Flag does not regain AP.</li>'
        : '',
      card.blockScalingStat || card.baseBlock > 0
        ? '<li><b>Block:</b> Absorbs incoming damage before HP and expires at the end of the turn.</li>'
        : '',
      card.evasionScalingStat
        ? '<li><b>Evasion:</b> Its temporary EVA applies against incoming monster attack rolls for this turn.</li>'
        : '',
      card.accBonus
        ? `<li><b>Accuracy:</b> Applies ${card.accBonus > 0 ? '+' : ''}${card.accBonus} ACC to this card's attack rolls.</li>`
        : '',
    ].filter(Boolean).join('');

    detailHtml = `
    <div class="inspect-detail-content">
      ${scalingRows.length > 0 ? `<div class="inspect-section">
        <h3>⚔️ Effect &amp; Live Calculation</h3>
        <div class="inspect-formulas">
          ${scalingRows.join('')}
        </div>
      </div>` : ''}

      <div class="inspect-section">
        <h3>📜 Lore &amp; Flavor Text</h3>
        <blockquote class="inspect-quote">
          &ldquo;${card.flavorText ?? 'A standard martial action honed in the grasslands realm.'}&rdquo;
        </blockquote>
      </div>

      ${cardRuleItems ? `<div class="inspect-section">
        <h3>🎲 Card-Specific Rules</h3>
        <ul class="inspect-bullet-list">${cardRuleItems}</ul>
      </div>` : ''}
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
              ? `<span class="${isBuffed ? 'is-buffed-flashing' : ''}"><b>${effDmg}</b> ${step.damageType === 'magical' ? 'MATK' : 'DMG'}${(step.hitCount ?? 1) > 1 ? ` ×${step.hitCount}` : ''}${
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
            step.defBonus && step.defBonus !== 0
              ? (effDmg > 0 || (step.heal ?? 0) > 0 || step.block > 0 ? ' &middot; ' : '') + `${step.defBonus > 0 ? '+' : ''}${step.defBonus} DEF (${step.bonusDuration ?? 1} turn)`
              : ''
          }${
            step.randomBuff
              ? (effDmg > 0 || step.block > 0 ? ' &middot; ' : '') + `Random +${step.randomBuff.amount} ${step.randomBuff.stats.map(stat => stat.toUpperCase()).join(' / ')} (${step.randomBuff.duration} turn)`
              : ''
          }${
            step.damagePerHeroDebuff
              ? ` &middot; +${step.damagePerHeroDebuff} MATK per active Hero debuff`
              : ''
          }${
            step.heroStatDebuff ? `${effDmg > 0 ? ' &middot; ' : ''}${heroHexIntentHtml(step)}${step.heroStatDebuffOnHit ? ' on hit' : ''}` : step.heroEvaDebuff && step.heroEvaDebuff > 0
              ? (effDmg > 0 || (step.heal && step.heal > 0) || step.block > 0 || (step.evaBonus && step.evaBonus > 0) || (step.accBonus && step.accBonus > 0) ? ' &middot; ' : '') + '-' + step.heroEvaDebuff + ' Hero EVA (' + (step.heroEvaDebuffDuration ?? 2) + ' turns)'
              : ''
          }${
            !step.heroStatDebuff && !step.poisonOnHit && !step.randomBuff && !step.defBonus && effDmg === 0 && step.block === 0 && (!step.heal || step.heal === 0) && (!step.evaBonus || step.evaBonus === 0) && (!step.accBonus || step.accBonus === 0) && (!step.heroEvaDebuff || step.heroEvaDebuff === 0) ? 'Idle' : ''
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
        ${m.isBoss
          ? '<p><b>Card Pool:</b> Separate scenario Boss card</p>'
          : `<p><b>Physical copies:</b> ${getMonsterSupplyCount(m)}</p>`}
        <p><b>Main Terrain:</b> ${getMonsterMainTerrain(m)} (Terrain Level ${MONSTER_TERRAIN_LEVELS[getMonsterMainTerrain(m)]})</p>
        <p><b>Spawn Terrains:</b> ${(m.spawnTerrains ?? []).map(terrain => terrain === 'grasslands' ? 'Grasslands 🌿' : terrain === 'forest' ? 'Forests 🌲' : terrain === 'swamp' ? 'Swamps 🪷' : terrain === 'cave' ? 'Caves 🪨' : terrain === 'underground' ? 'Underground ⛏️' : terrain === 'underworld' ? 'Underworld 🔥' : terrain).join(', ')}</p>
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
          <li><b>Attack Roll:</b> Rolls <code>2x 1d6</code> (2d6). Probability bell-curve gears towards 7 (result range 2–12). With no modifiers, rolls of <b>&ge; 5</b> hit; <b>&le; 4</b> miss.</li>
          <li><b>Net Accuracy &amp; Dodge:</b> <code>Net ACC = Attacker ACC (${m.acc ?? 1}) - Target EVA</code>. Each +1 net ACC lowers the required dice roll to hit by 1 (e.g. +1 net ACC hits on 4+).</li>
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
    const terrain = getTerrainPresentation(card.terrain);
    const typeLine = card.terrain === 'start'
      ? 'Land — Starting Crossroads'
      : `Land — ${cardName}`;

    cardHtml = `
    <div class="tcg-card tcg-adventure ${terrain.templateClass} tcg-inspect-card">
      <div class="tcg-inner-frame">
        <header class="tcg-header tcg-land-header">
          <div class="tcg-title-left">
            <span class="tcg-name">${cardName}</span>
          </div>
          <div class="tcg-header-right">
            ${card.level > 0 ? `<span class="adv-level-badge">Lvl ${card.level}</span>` : ''}
            <span class="tcg-spawn-badge ${terrain.badgeClass}">${terrain.icon}</span>
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
                ? `<b>Encounter Zone (Level ${card.level}):</b> Draws monsters from the Monster Deck matching ${terrain.pluralLabel} ${terrain.icon} until total monster level &ge; ${card.level}.`
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
        <p><b>Terrain Region:</b> ${terrain.label} ${terrain.icon}</p>
        <p><b>Encounter &amp; Amenity Rules:</b> ${
          card.hasHostile
            ? `Stepping onto this card initiates an encounter. Monsters are drawn from the Monster Deck matching <code>spawnTerrains.includes('${card.terrain}')</code> until total creature level &ge; ${card.level}.`
            : card.hasVillage
            ? `Safe resting haven. Resting restores 2 HP per 1 Gold (up to full HP). Shop stocks ${5 + card.level} items from the Treasure Deck (Levels ${Math.max(1, card.level - 1)}–${card.level}) with live stat delta previews. Training offers 3 skills from the New Skills Deck or destroys a card to the Void.`
            : card.hasShrine
            ? `Sacred sanctuary. Automatically grants 1 eligible divine boon on arrival (1 active blessing at a time). Converts Stat Points into permanent Base Stats up to Base ${card.level + 1} at cost (B+1)^2 SP.${card.level >= 2 ? ' Also supports upgrading owned skills from the Void.' : ''}`
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
          ${item.statBonus?.str ? `<li><b>Strength (+${item.statBonus.str} STR):</b> Increases Effective STR by ${item.statBonus.str}, granting +${item.statBonus.str * 2} Max HP and boosting melee scaling.</li>` : ''}
          ${item.statBonus?.vit ? `<li><b>Vitality (+${item.statBonus.vit} VIT):</b> Increases Effective VIT by ${item.statBonus.vit}, granting +${item.statBonus.vit * 2} Max HP and physical defense scaling.</li>` : ''}
          ${item.statBonus?.dex ? `<li><b>Dexterity (+${item.statBonus.dex} DEX):</b> Increases Effective DEX by ${item.statBonus.dex}, boosting accuracy and physical attack scaling.</li>` : ''}
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
  <div class="modal-backdrop inspection-backdrop card-inspect-backdrop" data-action="close-inspect-backdrop">
    <div class="modal card-inspect-modal">
      <div class="inspect-header">
        <div>
          <h2>${title}</h2>
          <p class="muted">Card effect, live calculations, and reference details.</p>
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
    role: 'Physical muscle power, weapon force and martial toughness',
    derivedRules: (eff, derived) => [
      `<b>Physical Attack (ATK):</b> Grants <code>&lfloor;STR / 2&rfloor; + &lfloor;DEX / 3&rfloor; + Weapon ATK</code>. Adds flat bonus damage to normal physical attack cards (e.g. <i>Slash</i>). Current Physical ATK: <b>${derived.atk} ATK</b> (STR contributes <code>&lfloor;${eff} / 2&rfloor; = ${Math.floor(eff / 2)}</code>).`,
      `<b>Physical Defense (DEF):</b> Grants <code>&lfloor;STR / 5&rfloor; + &lfloor;VIT / 5&rfloor; + &lfloor;AGI / 3&rfloor; + Armor DEF</code>. Flatly absorbs damage from all non-magical enemy attacks when hit. Current Physical DEF: <b>${derived.def} DEF</b> (STR contributes <code>&lfloor;${eff} / 5&rfloor; = ${Math.floor(eff / 5)}</code>).`,
      `<b>Martial Scaling:</b> Amplifies physical action cards that scale directly with STR.`,
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
  vit: {
    name: 'Vitality',
    role: 'Bodily constitution, life force and physical resilience',
    derivedRules: (eff, derived) => [
      `<b>Max Health (Max HP):</b> Increases Hero Max HP by <b>+2 HP</b> per Effective VIT (<code>Max HP = 10 + Effective VIT &times; 2</code>). Current: <b>${10 + eff * 2} Max HP</b>.`,
      `<b>Physical Defense (DEF):</b> Grants <code>&lfloor;STR / 5&rfloor; + &lfloor;VIT / 5&rfloor; + &lfloor;AGI / 3&rfloor; + Armor DEF</code>. Flatly absorbs damage from all non-magical enemy attacks when hit. Current Physical DEF: <b>${derived.def} DEF</b> (VIT contributes <code>&lfloor;${eff} / 5&rfloor; = ${Math.floor(eff / 5)}</code>).`,
      `<b>Frontline Endurance:</b> Raising VIT immediately grants +2 current HP and +2 Max HP, keeping your hero alive through long dungeon delves.`,
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
  <div class="modal-backdrop inspection-backdrop stat-inspect-backdrop" data-action="close-inspect-backdrop">
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

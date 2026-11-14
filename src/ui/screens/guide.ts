import { AdventureCard, CharacterStats, ClassId, MonsterCard, MonsterTemplateId, MonsterTerrain, TerrainType } from '../../core/types';
import { CLASS_CATALOG, STARTING_BASE_STATS } from '../../data/classes';
import { COMBAT_CARD_CATALOG, CombatCardTemplate, createCombatCardInstance, createFleeCard } from '../../data/combatCards';
import { GlossaryCategory, KEYWORD_GLOSSARY } from '../../data/glossary';
import { getMonsterSupplyCount, MONSTER_TEMPLATES, MONSTER_TERRAIN_LEVELS } from '../../data/monsters';
import { PATH_CARD_CATALOG } from '../../data/paths';
import { getTreasureSupplyCount, SHOP_ITEM_CATALOG, ShopItemTemplate } from '../../data/shopItems';
import {
  ADVENTURE_CARD_CATALOG,
  ADVENTURE_CARD_ORDER,
  STAGE_1_DECK_COMPOSITION,
  STAGE_2_DECK_COMPOSITION,
  STAGE_3_DECK_COMPOSITION,
} from '../../data/stages';
import { renderActionCardHtml } from '../actionCard';
import { renderAdventureCardHtml } from '../adventureCard';
import { renderQteHitCheckBarHtml } from '../components/qteBar';
import { fullCreatureCardHtml, monsterRaritySymbolHtml, renderTcgItemCard, renderTcgPathCard } from '../render';

export const GUIDE_PAGE_COUNT = 11;
export function getMonsterLowestTerrain(monster: Pick<MonsterCard, 'spawnTerrains' | 'mainTerrain'>): MonsterTerrain {
  const terrains: MonsterTerrain[] = monster.spawnTerrains && monster.spawnTerrains.length > 0
    ? monster.spawnTerrains
    : (monster.mainTerrain ? [monster.mainTerrain] : ['grasslands']);
  return [...terrains].sort((a, b) => (MONSTER_TERRAIN_LEVELS[a] ?? 99) - (MONSTER_TERRAIN_LEVELS[b] ?? 99))[0];
}

export function getMonsterLowestTerrainTier(monster: Pick<MonsterCard, 'spawnTerrains' | 'mainTerrain'>): number {
  return MONSTER_TERRAIN_LEVELS[getMonsterLowestTerrain(monster)] ?? 1;
}

export function getBestiaryMonstersForTerrain(terrain: MonsterTerrain): MonsterTemplateId[] {
  const all = Object.values(MONSTER_TEMPLATES).filter(
    (m) => !m.isBoss && (m.mainTerrain ? m.mainTerrain === terrain : getMonsterLowestTerrain(m) === terrain)
  );
  return [...all]
    .sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.name.localeCompare(b.name);
    })
    .map((m) => m.templateId as MonsterTemplateId);
}

export function getBestiaryBosses(): MonsterTemplateId[] {
  const bosses = Object.values(MONSTER_TEMPLATES).filter((m) => m.isBoss);
  return [...bosses]
    .sort((a, b) => {
      const tierA = getMonsterLowestTerrainTier(a);
      const tierB = getMonsterLowestTerrainTier(b);
      if (tierA !== tierB) return tierA - tierB;
      if (a.level !== b.level) return a.level - b.level;
      return a.name.localeCompare(b.name);
    })
    .map((m) => m.templateId as MonsterTemplateId);
}

function renderGuideBestiaryCardItem(templateId: MonsterTemplateId): string {
  const m = MONSTER_TEMPLATES[templateId];
  if (!m) return '';
  const monsterCard: MonsterCard = { ...m, id: `guide_${m.templateId}` };
  const cardHtml = fullCreatureCardHtml({
    monster: monsterCard,
    className: 'guide-creature-card-preview',
    attributes: 'tabindex="-1"',
  });

  const supplyCount = m.isBoss ? 1 : getMonsterSupplyCount(m);
  const supplyLabel = `${supplyCount} ${supplyCount === 1 ? 'copy' : 'copies'} in game`;

  return `
    <div class="guide-bestiary-card-item" data-action="inspect-monster" data-inspect-kind="monster" data-monster-id="${m.templateId}" role="button" tabindex="0">
      <div class="guide-bestiary-card-wrapper">
        ${cardHtml}
      </div>
      <div class="guide-bestiary-card-footer">
        <div class="guide-card-supply-badge" title="Total physical copies in the board game">${supplyLabel}</div>
        <button type="button" class="guide-bestiary-inspect-btn" tabindex="-1">
          <span class="inspect-icon">&#9432;</span> Inspect Info
        </button>
      </div>
    </div>
  `;
}

export function getArmoryItemsForCategory(category: 'weapon' | 'armor' | 'accessory' | 'consumable'): ShopItemTemplate[] {
  return SHOP_ITEM_CATALOG
    .filter((i) => i.category === category)
    .sort((a, b) => (a.level ?? 1) - (b.level ?? 1) || a.name.localeCompare(b.name));
}

function renderGuideArmoryCardItem(item: ShopItemTemplate): string {
  const cardHtml = renderTcgItemCard(item, {
    extraClasses: 'guide-item-card-preview',
  });

  const supplyCount = getTreasureSupplyCount(item);
  const supplyLabel = `${supplyCount} ${supplyCount === 1 ? 'copy' : 'copies'} in game`;

  return `
    <div class="guide-bestiary-card-item guide-armory-card-item" data-action="inspect-item" data-inspect-kind="item" data-item-id="${item.id}" role="button" tabindex="0">
      <div class="guide-bestiary-card-wrapper">
        ${cardHtml}
      </div>
      <div class="guide-bestiary-card-footer">
        <div class="guide-card-supply-badge" title="Total physical copies in the board game">${supplyLabel}</div>
        <button type="button" class="guide-bestiary-inspect-btn" tabindex="-1">
          <span class="inspect-icon">&#9432;</span> Inspect Info
        </button>
      </div>
    </div>
  `;
}

function getTerrainCardsForBiome(terrain: TerrainType) {
  return ADVENTURE_CARD_ORDER
    .map((code) => ADVENTURE_CARD_CATALOG[code])
    .filter((def): def is NonNullable<typeof def> => Boolean(def) && def.terrain === terrain);
}

function renderGuideAdventureCardItem(cardCode: string): string {
  const def = ADVENTURE_CARD_CATALOG[cardCode];
  if (!def) return '';
  const card: AdventureCard = {
    id: `guide_${def.cardCode}`,
    name: def.name,
    terrain: def.terrain,
    level: def.level,
    hasHostile: def.hasHostile,
    hasVillage: def.hasVillage,
    hasShrine: def.hasShrine,
    revealed: true,
    cardNumber: def.cardCode,
    flavorText: def.flavorText,
  };
  const s1 = STAGE_1_DECK_COMPOSITION[def.cardCode] ?? 0;
  const s2 = STAGE_2_DECK_COMPOSITION[def.cardCode] ?? 0;
  const s3 = STAGE_3_DECK_COMPOSITION[def.cardCode] ?? 0;
  const maxCopies = Math.max(s1, s2, s3);
  const supplyLabel = maxCopies === 1 ? '1 copy in deck' : `Up to ${maxCopies} copies/stage`;
  const supplyTitle = `Deck count per stage — Stage 1: ${s1}, Stage 2: ${s2}, Stage 3: ${s3}`;
  const cardHtml = renderAdventureCardHtml(card, { className: 'guide-adventure-card-preview' });

  return `
    <div class="guide-bestiary-card-item guide-terrain-card-item" data-action="inspect-adventure" data-inspect-kind="adventure" data-adventure-card-number="${def.cardCode}" role="button" tabindex="0">
      <div class="guide-bestiary-card-wrapper">
        ${cardHtml}
      </div>
      <div class="guide-bestiary-card-footer">
        <div class="guide-card-supply-badge" title="${supplyTitle}">${supplyLabel}</div>
        <button type="button" class="guide-bestiary-inspect-btn" tabindex="-1">
          <span class="inspect-icon">&#9432;</span> Inspect Info
        </button>
      </div>
    </div>
  `;
}

function getClassPreviewStats(classId: ClassId): CharacterStats {
  const b = CLASS_CATALOG[classId].classBonuses;
  return {
    str: STARTING_BASE_STATS.str + 1 + b.str,
    dex: STARTING_BASE_STATS.dex + 1 + b.dex,
    agi: STARTING_BASE_STATS.agi + 1 + b.agi,
    int: STARTING_BASE_STATS.int + 1 + b.int,
    cha: STARTING_BASE_STATS.cha + 1 + b.cha,
    vit: STARTING_BASE_STATS.vit + 1 + b.vit,
  };
}

function getSkillSupplyLabel(tpl: CombatCardTemplate): string {
  if (tpl.isSkillUpgrade) return 'Void upgrade (Shrine)';
  const starterCount = CLASS_CATALOG[tpl.classId].starterCardIds.filter((id) => id === tpl.id).length;
  if (starterCount > 0) return `${starterCount} starter copies`;
  return '2 copies in New Skills';
}

function renderGuideSkillCardItem(tpl: CombatCardTemplate, previewClass?: ClassId): string {
  const card = createCombatCardInstance(tpl.id, 'guide');
  const stats = getClassPreviewStats(previewClass ?? tpl.classId);
  const cardHtml = renderActionCardHtml(card, stats, {
    viewOnly: true,
    className: 'guide-action-card-preview',
  });
  const supplyLabel = getSkillSupplyLabel(tpl);

  return `
    <div class="guide-bestiary-card-item guide-skill-card-item" data-action="inspect-action" data-inspect-kind="action" data-card-id="${tpl.id}" role="button" tabindex="0">
      <div class="guide-bestiary-card-wrapper">
        ${cardHtml}
      </div>
      <div class="guide-bestiary-card-footer">
        <div class="guide-card-supply-badge" title="Total physical copies in the board game">${supplyLabel}</div>
        <button type="button" class="guide-bestiary-inspect-btn" tabindex="-1">
          <span class="inspect-icon">&#9432;</span> Inspect Info
        </button>
      </div>
    </div>
  `;
}

function renderGuideFleeCardItem(): string {
  const card = createFleeCard('fighter');
  const cardHtml = renderActionCardHtml(card, getClassPreviewStats('fighter'), {
    viewOnly: true,
    className: 'guide-action-card-preview',
  });

  return `
    <div class="guide-bestiary-card-item guide-skill-card-item" data-action="inspect-action" data-inspect-kind="action" data-card-id="${card.id}" role="button" tabindex="0">
      <div class="guide-bestiary-card-wrapper">
        ${cardHtml}
      </div>
      <div class="guide-bestiary-card-footer">
        <div class="guide-card-supply-badge" title="Always available in every combat">Permanent action</div>
        <button type="button" class="guide-bestiary-inspect-btn" tabindex="-1">
          <span class="inspect-icon">&#9432;</span> Inspect Info
        </button>
      </div>
    </div>
  `;
}

/** A short, plain-language guide available before and during every adventure. */
export function renderGuideModal(inGame: boolean, currentPage = 1): string {
  const p = Math.max(1, Math.min(GUIDE_PAGE_COUNT, currentPage));

  return `
  <div class="modal-backdrop guide-backdrop" data-action="close-guide-backdrop">
    <div class="guide-book-tome" data-guide-page="${p}" role="dialog" aria-modal="true" aria-labelledby="guide-book-title">
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

      <!-- Wiki Layout: Sticky Sidebar Navigation + Scrollable Parchment Body -->
      <div class="guide-wiki-layout">
        <aside class="guide-wiki-sidebar" aria-label="Rulebook Navigation">
          <nav class="guide-ribbon-bar" aria-label="Rulebook Chapters">
            <button class="guide-ribbon-tab ${p === 1 ? 'is-active' : ''}" data-action="guide-jump-page" data-page="1" title="Page 1: The Quest &amp; Pathfinding">
              <span class="ribbon-text">&#128220; I. The Quest</span>
            </button>
            <button class="guide-ribbon-tab ${p === 2 ? 'is-active' : ''}" data-action="guide-jump-page" data-page="2" title="Page 2: Combat Procedures &amp; Stack">
              <span class="ribbon-text">&#9876;&#65039; II. Battle</span>
            </button>
            <button class="guide-ribbon-tab ${p === 3 ? 'is-active' : ''}" data-action="guide-jump-page" data-page="3" title="Page 3: The Six Attributes &amp; Vigor">
              <span class="ribbon-text">&#128202; III. Attributes</span>
            </button>
            <button class="guide-ribbon-tab ${p === 4 ? 'is-active' : ''}" data-action="guide-jump-page" data-page="4" title="Page 4: Adventurer Classes">
              <span class="ribbon-text">&#128737;&#65039; IV. Classes</span>
            </button>
            <button class="guide-ribbon-tab ${p === 5 ? 'is-active' : ''}" data-action="guide-jump-page" data-page="5" title="Page 5: Shrines, Villages &amp; The Void">
              <span class="ribbon-text">&#127963;&#65039; V. Shrines &amp; Void</span>
            </button>
            <button class="guide-ribbon-tab ${p === 6 ? 'is-active' : ''}" data-action="guide-jump-page" data-page="6" title="Page 6: Monstrous Compendium &amp; Bestiary">
              <span class="ribbon-text">&#128121; VI. Bestiary</span>
            </button>
            <button class="guide-ribbon-tab ${p === 7 ? 'is-active' : ''}" data-action="guide-jump-page" data-page="7" title="Page 7: Equipment Compendium &amp; Armory">
              <span class="ribbon-text">&#128481;&#65039; VII. Armory</span>
            </button>
            <button class="guide-ribbon-tab ${p === 8 ? 'is-active' : ''}" data-action="guide-jump-page" data-page="8" title="Page 8: Realm Terrains &amp; Adventure Cards">
              <span class="ribbon-text">&#128506;&#65039; VIII. Terrain</span>
            </button>
            <button class="guide-ribbon-tab ${p === 9 ? 'is-active' : ''}" data-action="guide-jump-page" data-page="9" title="Page 9: Combat Arts &amp; Action Cards">
              <span class="ribbon-text">&#10024; IX. Skills</span>
            </button>
            <button class="guide-ribbon-tab ${p === 10 ? 'is-active' : ''}" data-action="guide-jump-page" data-page="10" title="Page 10: Keyword Glossary">
              <span class="ribbon-text">&#128214; X. Glossary</span>
            </button>
            <button class="guide-ribbon-tab ${p === 11 ? 'is-active' : ''}" data-action="guide-jump-page" data-page="11" title="Page 11: Realm Paths">
              <span class="ribbon-text">&#129517; XI. Paths</span>
            </button>
          </nav>
        </aside>

        <!-- The Ancient Parchment Wiki Viewport -->
        <div class="guide-spread-viewport">
        <div class="guide-parchment-spread">

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
                <span class="guide-drop-cap">H</span>arken, brave wanderer. Before thee stretches the perilous wilderness of <i>The Paths We Choose</i>. In this tabletop card expedition, thou must forge a route across treacherous terrain, nurture thy hero's attributes, master the martial art of three six-sided dice, and slay the slumbering monstrosity awaiting at the journey's terminus.
              </p>

              <div class="adnd-parchment-box">
                <h5 class="adnd-box-title">THE THREE PILLARS OF EXPLORATION</h5>
                <ol class="adnd-numbered-list">
                  <li><b>Pick a Path:</b> Tap any forward Land card in front of your token. Every stride moves you forward and unmasks deeper dungeon rows.</li>
                  <li><b>Handle the Land:</b> <b>Encounters</b> trigger fierce creature battles; <b>Villages</b> provide rest, goods, and training; <b>Shrines</b> bless and upgrade your stats; and <b>Undiscovered Lands</b> hold fortune or peril.</li>
                  <li><b>Win the Battle:</b> Vanquish all foes using combat cards and Action Points (AP). Claim their inscribed Gold and Stat Points (SP) to grow ever stronger.</li>
                </ol>
              </div>

              <h4 class="guide-section-heading">&#9884; The 3-Row Vision Cone (MACG-PG&trade;)</h4>
              <p class="guide-body-text">
                The dungeon unfolds before your eyes via the <b>Morville Adventure Card Game Path Generator&trade; (MACG-PG&trade;)</b> in a strict <b>Three-Row Lookahead Cone</b>:
              </p>
              <ul class="adnd-bullet-list">
                <li><b>Current Row:</b> Where your hero token currently stands.</li>
                <li><b>Next Choice Row:</b> The 2 forward tiles immediately reachable on your next step (offset brick math <code>C &plusmn; 0.5</code>).</li>
                <li><b>Lookahead Row:</b> 3 tiles branching beyond, where the center tile is shared by both forward choices.</li>
              </ul>

              <h4 class="guide-section-heading">&#9884; Terrain &amp; Dungeon Hazards</h4>
              <p class="guide-body-text">
                The realm spans four primary biomes: <b>Grasslands</b>, <b>Forest</b>, <b>Swamp</b>, and subterranean <b>Caves</b>:
              </p>
              <ul class="adnd-bullet-list">
                <li><b>Hostile Lands:</b> Initiates battle against local creatures drawn to meet the card's danger level.</li>
                <li><b>Settlements &amp; Villages:</b> Provide Inn Rest, market shops, and training / Void removal.</li>
                <li><b>Sacred Shrines:</b> Grant an automatic divine boon and allow permanent Base Stat upgrades with SP.</li>
                <li><b>Undiscovered Lands:</b> 1d6 check: roll 6 for treasure, &le; tile level triggers an ambush!</li>
              </ul>
            </div>

            <div class="guide-folio-col">
              <h4 class="guide-section-heading">&#9884; Scenario Deck Setups &amp; Physical Supply</h4>
              <p class="guide-body-text">
                Each scenario features a deterministic deck setup across its Adventure, Monster, and Treasure card pools:
              </p>

              <div class="adnd-parchment-box">
                <h5 class="adnd-box-title">SCENARIO 1: THE GOBLIN KING</h5>
                <ul class="adnd-bullet-list">
                  <li><b>Adventure Deck (30 Cards):</b>
                    <br/>&bull; <b>17 Grasslands:</b> 3 Undiscovered, 8 Plains (Hostile Lvl 1), 3 Village, 3 Shrine
                    <br/>&bull; <b>11 Forest:</b> 2 Undiscovered, 5 Deep Forest (Hostile Lvl 2), 2 Village, 2 Shrine
                    <br/>&bull; <b>2 Swamp:</b> 1 Undiscovered, 1 Murky Swamp (Hostile Lvl 3)
                  </li>
                  <li><b>Monster Deck (45 Cards in Deck &bull; 40 in Void):</b>
                    <br/>&bull; <b>25 Grasslands (Full Supply):</b> 6 Goblin, 4 Pink Slime, 4 Beetle, 4 Wild Dog, 4 Stalker, 3 Ramram
                    <br/>&bull; <b>15 Forest (~2/3 Supply):</b> 4 Zombie, 3 Bullwark, 3 Tree Snapper, 3 Ghoul, 2 Rattler
                    <br/>&bull; <b>5 Swamp (~1/3 Supply):</b> 2 Assassin, 1 Leech, 1 Witch, 1 Creeper
                    <br/>&bull; <i>Cave creatures remain in the Void.</i>
                    <br/>&bull; <b>Stage Boss:</b> Grundy (Turn 15 Culmination)
                  </li>
                  <li><b>Treasure Deck (48 Cards):</b>
                    <br/>&bull; 2 copies each of 17 gear items, plus <code>6 - Level</code> Health Potions (12 Weapons, 12 Armor, 10 Accessories, 14 Potions: Lvl 1&times;5, Lvl 2&times;4, Lvl 3&times;3, Lvl 4&times;2)
                  </li>
                </ul>
              </div>

              <div class="adnd-parchment-box">
                <h5 class="adnd-box-title">SCENARIO 2: CULT OF TROLLS</h5>
                <ul class="adnd-bullet-list">
                  <li><b>Adventure Deck (30 Cards):</b>
                    <br/>&bull; <b>17 Forest:</b> 3 Undiscovered, 8 Deep Forest (Hostile Lvl 2), 3 Village, 3 Shrine
                    <br/>&bull; <b>11 Swamp:</b> 2 Undiscovered, 5 Murky Swamp (Hostile Lvl 3), 2 Village, 2 Shrine
                    <br/>&bull; <b>2 Cave:</b> 1 Undiscovered, 1 Dark Cavern (Hostile Lvl 4)
                  </li>
                  <li><b>Monster Deck (37 Cards in Deck &bull; 48 in Void):</b>
                    <br/>&bull; <b>21 Forest (Full Supply):</b> 6 Zombie, 4 Bullwark, 4 Tree Snapper, 4 Ghoul, 3 Rattler
                    <br/>&bull; <b>12 Swamp (~2/3 Supply):</b> 4 Assassin, 3 Leech, 3 Witch, 2 Creeper
                    <br/>&bull; <b>4 Cave (~1/3 Supply):</b> 2 Cultist Mage, 1 Lurker, 1 Phalanx
                    <br/>&bull; <i>Grasslands creatures remain in the Void.</i>
                    <br/>&bull; <b>Stage Bosses:</b> Cult of Trolls &mdash; Troll Healer, Troll Hexer &amp; Troll Warrior (Turn 15)
                  </li>
                  <li><b>Treasure Deck (48 Cards):</b>
                    <br/>&bull; 2 copies each of 17 gear items + <code>6 - Level</code> Health Potions; villages stock exact-level items
                  </li>
                </ul>
              </div>

              <div class="adnd-parchment-box">
                <h5 class="adnd-box-title">SCENARIO 3: TOMB OF THE FALLEN KING</h5>
                <ul class="adnd-bullet-list">
                  <li><b>Adventure Deck (30 Cards):</b>
                    <br/>&bull; <b>17 Swamp:</b> 3 Undiscovered, 8 Murky Swamp (Hostile Lvl 3), 3 Village, 3 Shrine
                    <br/>&bull; <b>11 Cave:</b> 2 Undiscovered, 5 Dark Cavern (Hostile Lvl 4), 2 Village, 2 Shrine
                    <br/>&bull; <b>2 Underground:</b> 1 Undiscovered, 1 Eerie Underground (Hostile Lvl 5)
                  </li>
                  <li><b>Monster Deck (30 Cards in Deck &bull; 55 in Void):</b>
                    <br/>&bull; <b>17 Swamp (~2/3 Supply):</b> 6 Assassin, 4 Leech, 4 Witch, 3 Creeper
                    <br/>&bull; <b>10 Cave (~1/3 Supply):</b> 4 Cultist Mage, 3 Lurker, 3 Phalanx
                    <br/>&bull; <b>3 Underground (~1/3 Supply):</b> 2 Dark Orc, 1 Orc Shaman
                    <br/>&bull; <b>Stage Boss:</b> Fallen King (Turn 15 Culmination)
                  </li>
                  <li><b>Treasure Deck (48 Cards):</b>
                    <br/>&bull; 2 copies each of 17 gear items + <code>6 - Level</code> Health Potions (Lvl 1&times;5, Lvl 2&times;4, Lvl 3&times;3, Lvl 4&times;2)
                  </li>
                </ul>
              </div>

              <div class="adnd-parchment-box callout-quest">
                <h5 class="adnd-box-title">&#127922; MACG-3D6™ CORE MECHANICS &amp; PATHS DECK</h5>
                <p class="adnd-box-text">
                  <b>The Paths We Choose</b> is a <b>MACG-3D6™ tabletop game</b>. Whenever you make a combat attack, Path Sneak Check, or Treasure Discovery Check, roll <b>3d6</b> against the <b>MACG-3D6™ Success Check Bar</b>. <b>Tier 4 (+0 Net)</b> is the baseline (7&ndash;14, 81.5%): each +1 Net expands the success band outward, <b>10 &amp; 11</b> are always <b>Sure Hit Rolls</b> (25.0% floor), and <b>3 &amp; 18</b> are <b>Diabolic Rolls</b> that always fail.
                </p>
                <p class="adnd-box-text">
                  <b>Paths Deck (17 Cards · MIDS™):</b> Stepping onto an <b>Undiscovered Terrain</b> draws a Path Card (<code>5&times; Enemy Camp</code>, <code>2&times; Merchant</code>, <code>2&times; Sanctuary</code>, <code>2&times; Ambush</code>, <code>1&times; Magical Chest</code>, <code>1&times; Trapped Chest</code>, <code>2&times; Gold Stash</code>, <code>2&times; Spring Trap</code>). Under the <b>Morville Infinite Deck System™ (MIDS™)</b>, empty decks automatically reshuffle from their discard pile. See the Path Card Compendium for each card&apos;s exact rules.
                </p>
              </div>

              <div style="margin: 10px 0 14px 0;">
                ${renderQteHitCheckBarHtml({ minHitRoll: 10, maxHitRoll: 11, hitPercent: 25.0, rolledTotal: 10, isHit: true })}
              </div>

              <div class="adnd-parchment-box adnd-prob-table-box">
                <h5 class="adnd-box-title">&#128207; MACG-3D6™ SUCCESS ROLL RANGE TABLE REFERENCE</h5>
                <p class="adnd-box-text">
                  In MACG-3D6™, rolls naturally gravitate toward the median of <b>10 &amp; 11</b> (combined <b>25.0% Sure Hit Rolls</b> / minimum success roll). Success bands expand outward symmetrically from Tier 4 (+0 Net baseline):
                </p>
                <div class="adnd-prob-table-wrap">
                  <table class="adnd-prob-table" aria-label="MACG-3D6 Success Roll Range Table Reference">
                    <thead>
                      <tr>
                        <th>Success Tier</th>
                        <th>Roll Range</th>
                        <th>Probability</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr class="is-peak-row">
                        <td><b>Tier 1</b> <small>(&le; -3 Net · Sure Hit Rolls)</small></td>
                        <td><b>10 &ndash; 11</b></td>
                        <td><b>25.0%</b></td>
                      </tr>
                      <tr>
                        <td><b>Tier 2</b> <small>(-2 Net)</small></td>
                        <td><b>9 &ndash; 12</b></td>
                        <td><b>48.1%</b></td>
                      </tr>
                      <tr>
                        <td><b>Tier 3</b> <small>(-1 Net)</small></td>
                        <td><b>8 &ndash; 13</b></td>
                        <td><b>67.6%</b></td>
                      </tr>
                      <tr class="is-base-hit-row">
                        <td><b>Tier 4</b> <small>(+0 Net · Baseline)</small></td>
                        <td><b>7 &ndash; 14</b></td>
                        <td><b>81.5%</b></td>
                      </tr>
                      <tr>
                        <td><b>Tier 5</b> <small>(+1 Net)</small></td>
                        <td><b>6 &ndash; 15</b></td>
                        <td><b>90.7%</b></td>
                      </tr>
                      <tr>
                        <td><b>Tier 6</b> <small>(+2 Net)</small></td>
                        <td><b>5 &ndash; 16</b></td>
                        <td><b>96.3%</b></td>
                      </tr>
                      <tr>
                        <td><b>Tier 7</b> <small>(&ge; +3 Net)</small></td>
                        <td><b>4 &ndash; 17</b></td>
                        <td><b>99.1%</b></td>
                      </tr>
                      <tr class="is-miss-row">
                        <td><b>Diabolic Rolls</b> 😈 <small>(Always Miss)</small></td>
                        <td><b>3 &amp; 18</b></td>
                        <td><b>0.9%</b></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="adnd-parchment-box callout-quest">
                <h5 class="adnd-box-title">VICTORY CONDITIONS &amp; TURN 15 BOSS</h5>
                <p class="adnd-box-text">
                  On <b>Turn 15</b>, the journey reaches the boss lair. Inspect the Boss card, change equipment or consume potions, then initiate the battle. Slaying the boss completes the scenario!
                </p>
              </div>

              <div class="adnd-page-jump-row">
                <span class="adnd-jump-label">Next Chapter:</span>
                <button class="btn mini guide-jump-btn" data-action="guide-jump-page" data-page="2">Turn to Ch. II: Battle &rarr;</button>
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
            <p class="guide-chapter-sub">Battles in one minute: Turn Rhythm, Action Points, One-by-One Card Draws, and 3d6 Tabletop Rolls</p>
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
              <h4 class="guide-section-heading">&#9884; Combat Attacks &amp; MACG-3D6™</h4>
              <p class="guide-body-text">
                All physical attacks and monster strikes roll <b>three six-sided dice (3d6)</b> on the <b>MACG-3D6™ Success Check Bar</b> using <code>Net ACC = Attacker ACC &minus; Defender EVA</code> (see <b>Ch. I</b> for the full Tier 1&ndash;7 Success Roll Range Table).
              </p>
              <ul class="adnd-bullet-list">
                <li><b>No Critical Hits:</b> Pure tactical clarity&mdash;no arbitrary critical multiplier spikes; character ACC directly expands your visible Success Roll Range on the <b>MACG-3D6™ Success Check Bar</b>.</li>
                <li><b>Monster Keywords:</b> See <b>Ch. X: Glossary</b> for full definitions of <code>ATK (X)</code>, <code>MATK (X)</code>, <code>Regenerate (X)</code>, <code>Block (X)</code>, <code>Summon</code>, and creature traits.</li>
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
                <span class="guide-drop-cap">T</span>here are no arbitrary character levels or XP bars in this realm! Thy hero's attributes directly define character evolution. Every adventurer begins with <b>Base 1</b> across all six attributes plus an <b>Innate +1 Stat Bonus</b> across all attributes (<code>Effective = 1 (Innate) + Base + Class + Blessing + Gear</code>), boosted by their class archetype bonuses. This innate baseline ensures leveling a Base Stat from 1 to 2 creates a smooth 50% progression (2 &rarr; 3) rather than a jarring 100% leap. Stat Points (SP) won from battle are invested at Shrines to raise base stats.
              </p>

              <div class="adnd-stat-entry">
                <h5 class="adnd-stat-name"><span class="adnd-glyph">&#128170;</span> Strength (STR) &mdash; Power &amp; Martial Force</h5>
                <p class="adnd-stat-desc">Raw muscular force, weapon power, and physical toughness.</p>
                <ul class="adnd-stat-perks">
                  <li><b>Physical Attack (ATK):</b> Adds <code>+&lfloor;STR / 2&rfloor;</code> flat damage bonus to melee strikes (e.g. <i>Slash</i>).</li>
                  <li><b>Physical Defense (DEF):</b> Contributes to deflection defense alongside AGI and VIT (<code>DEF = &lfloor;(STR + AGI + VIT) / 5&rfloor; + Armor DEF</code>).</li>
                  <li><b>Martial Scaling:</b> Directly amplifies physical class skills and frontline combat prowess.</li>
                </ul>
              </div>

              <div class="adnd-stat-entry">
                <h5 class="adnd-stat-name"><span class="adnd-glyph">&#9889;</span> Agility (AGI) &mdash; Reflexes &amp; Reactiveness</h5>
                <p class="adnd-stat-desc">Reactiveness, twitch speed, swift movement, and evasive footwork.</p>
                <ul class="adnd-stat-perks">
                  <li><b>Combat Evasion (EVA):</b> Grants <b>+1 EVA for every 1 AGI</b> (<code>AGI</code>), directly forcing enemy attack rolls to meet a higher threshold to hit you.</li>
                  <li><b>Physical Defense (DEF):</b> Adds <code>+&lfloor;(STR + AGI + VIT) / 5&rfloor;</code> damage reduction through body tilting, armor angling, and glancing deflections.</li>
                  <li><b>Disengage &amp; Escape:</b> Boosts Sprint escape check threshold on 1d6 (<code>&lfloor;AGI / 2&rfloor;</code>, minimum 1).</li>
                </ul>
              </div>

              <div class="adnd-stat-entry">
                <h5 class="adnd-stat-name"><span class="adnd-glyph">&#127919;</span> Dexterity (DEX) &mdash; Skill &amp; Perceptiveness</h5>
                <p class="adnd-stat-desc">Skillfulness, fine motor precision, keen perceptiveness, and weapon finesse.</p>
                <ul class="adnd-stat-perks">
                  <li><b>Combat Accuracy (ACC):</b> Grants <b>+1 ACC for every 1 DEX</b> (<code>DEX</code>), expanding your MACG-3D6™ hit range against enemy Evasion.</li>
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
                  <li><b>Physical Defense (DEF):</b> Fortitude combines with STR and AGI to deflect and minimize incoming physical damage (<code>DEF = &lfloor;(STR + AGI + VIT) / 5&rfloor; + Armor DEF</code>).</li>
                  <li><b>Frontline Endurance:</b> High VIT expands your life pool and sustains you through attrition and boss encounters.</li>
                </ul>
              </div>

              <div class="adnd-stat-entry">
                <h5 class="adnd-stat-name"><span class="adnd-glyph">&#9878;&#65039;</span> Derived &amp; Computed Combat Stats</h5>
                <p class="adnd-stat-desc">Your Hero Sheet computes these live combat and shop values from Effective Attributes, Equipped Gear, and Shrine Protection:</p>
                <ul class="adnd-stat-perks">
                  <li><b>ACC (Accuracy):</b> <code>DEX + Gear ACC</code> &mdash; raises your 3d6 hit chance against enemy EVA.</li>
                  <li><b>EVA (Evasion):</b> <code>AGI + Gear EVA + Round Bonuses</code> &mdash; lowers enemy hit chance against you.</li>
                  <li><b>ATK (Physical Attack):</b> <code>&lfloor;STR / 2&rfloor; + &lfloor;DEX / 3&rfloor; + Gear ATK</code> (plus Fighter <code>[Berzerk]</code>).</li>
                  <li><b>DEF (Physical Defense):</b> <code>&lfloor;(STR + AGI + VIT) / 5&rfloor; + Gear DEF + Divine Protection</code>.</li>
                  <li><b>MATK (Magical Attack):</b> <code>&lfloor;INT / 2&rfloor; + Gear MATK</code> &mdash; scales spell card damage.</li>
                  <li><b>MDEF (Magical Defense):</b> <code>&lfloor;INT / 5&rfloor; + Gear MDEF + Divine Protection</code> &mdash; reduces incoming spell damage.</li>
                  <li><b>ACT (Action Points):</b> <code>3 + &lfloor;INT / 5&rfloor;</code> &mdash; max AP refreshed at the start of each combat turn.</li>
                  <li><b>DISC (Shop Discount):</b> <code>min(90%, CHA &times; 5%)</code> &mdash; reduces Village Shop gold prices.</li>
                  <li><b>PEN (Penetration, Gear):</b> Bypasses enemy natural DEF before remaining DEF and Block absorb physical damage.</li>
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
                <span class="guide-drop-cap">E</span>ach adventurer begins with <b>Base Stats of 1</b> across all six attributes plus an <b>Innate +1 Stat Bonus</b> across all attributes, elevated by <b>1 Primary Stat (+2 bonus)</b> and <b>2 Secondary Stats (+1 bonus each)</b>, an innate combat passive, and a distinct starter deck.
              </p>

              <div class="adnd-class-box">
                <div class="adnd-class-header">
                  <h5 class="adnd-class-title">&#9876;&#65039; Fighter</h5>
                  <span class="adnd-class-role">Primary: STR (+2) &bull; Secondary: VIT (+1), DEX (+1)</span>
                </div>
                <p class="adnd-class-summary">A battle-hardened warrior who dominates the frontline with brute strength, high HP, and heavy shield defense.</p>
                <div class="adnd-class-stats-strip">
                  <span><b>STR 4</b></span> &bull; <span><b>DEX 3</b></span> &bull; <span><b>AGI 2</b></span> &bull; <span><b>INT 2</b></span> &bull; <span><b>CHA 2</b></span> &bull; <span><b>VIT 3</b></span>
                </div>
                <ul class="adnd-stat-perks">
                  <li><b>Starting Vitals:</b> <b>16 Max HP</b>, 3 ACC, 2 EVA, 3 ATK, 0 DEF, 3 AP.</li>
                  <li><b>Passive &mdash; <code>[Berzerk]</code>:</b> Gains <b>+1 ATK</b> when at 50% HP or lower; increases to <b>+2 ATK</b> when critically wounded at 25% HP or lower.</li>
                  <li><b>Starter Combat Deck:</b> 8&times; Slash (1 AP, 5 physical damage + ATK) &bull; 2&times; Defend (1 AP, 4 Block).</li>
                  <li><b>Starter Gear:</b> LVL 1 Iron Sword (+1 ATK) &bull; LVL 1 Chainmail (+1 DEF).</li>
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
                  <span><b>STR 2</b></span> &bull; <span><b>DEX 3</b></span> &bull; <span><b>AGI 2</b></span> &bull; <span><b>INT 4</b></span> &bull; <span><b>CHA 3</b></span> &bull; <span><b>VIT 2</b></span>
                </div>
                <ul class="adnd-stat-perks">
                  <li><b>Starting Vitals:</b> <b>14 Max HP</b>, 3 ACC, 2 EVA, 2 MATK, 0 MDEF, 3 AP.</li>
                  <li><b>Passive &mdash; <code>[Conserve]</code>:</b> Unspent Action Points (AP) at the end of a battle turn are saved and carried over into the next round.</li>
                  <li><b>Starter Combat Deck:</b> 8&times; Fireball (1 AP, 5 magic damage + MATK) &bull; 2&times; Force Field (1 AP, 4 Block).</li>
                  <li><b>Starter Gear:</b> LVL 1 Apprentice Staff (+1 MATK) &bull; LVL 1 Robe (+1 MDEF).</li>
                  <li><b>Tactics:</b> Save AP during quiet turns to unleash explosive multi-spell combos. Enjoys an immediate 15% discount in village shops from starting CHA 3.</li>
                </ul>
              </div>

              <div class="adnd-class-box">
                <div class="adnd-class-header">
                  <h5 class="adnd-class-title">&#128481;&#65039; Rogue</h5>
                  <span class="adnd-class-role">Primary: AGI (+2) &bull; Secondary: DEX (+1), STR (+1)</span>
                </div>
                <p class="adnd-class-summary">An elusive infiltrator blending lightning reflexes, tactical perceptiveness, and opportunistic thievery.</p>
                <div class="adnd-class-stats-strip">
                  <span><b>STR 3</b></span> &bull; <span><b>DEX 3</b></span> &bull; <span><b>AGI 4</b></span> &bull; <span><b>INT 2</b></span> &bull; <span><b>CHA 2</b></span> &bull; <span><b>VIT 2</b></span>
                </div>
                <ul class="adnd-stat-perks">
                  <li><b>Starting Vitals:</b> <b>14 Max HP</b>, 3 ACC, 4 EVA, 2 ATK, 1 DEF, 3 AP.</li>
                  <li><b>Passive &mdash; <code>[Steal]</code>:</b> Rolling any matching pair on a 3d6 attack hit check (e.g. [6, 6, 2], [5, 3, 5], [1, 1, 4]) instantly pickpockets Gold equal to the matching die number (e.g. pair of 6s steals <b>+6 Gold</b>, pair of 5s steals <b>+5 Gold</b>, and even a pair of 1s steals <b>+1 Gold</b>).</li>
                  <li><b>Starter Combat Deck:</b> 8&times; Slash (1 AP, 5 physical damage + ATK) &bull; 2&times; Defend (1 AP, 4 Block).</li>
                  <li><b>Starter Gear:</b> LVL 1 Dagger (+1 ACC) &bull; LVL 1 Leather Gear (+1 EVA).</li>
                  <li><b>Tactics:</b> High EVA causes enemy attacks to miss; starts with 1 natural DEF from AGI 4; generates bonus gold in battle to buy elite gear quickly.</li>
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
                <p class="adnd-box-formula"><b>Cost(Base &rarr; Base + 1) = currentBase &times; 10 SP</b></p>
                <p class="adnd-box-text">Base 1 &rarr; 2: costs <b>10 SP</b> &bull; Base 2 &rarr; 3: costs <b>20 SP</b> &bull; Base 3 &rarr; 4: costs <b>30 SP</b></p>
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
                <li><b>Resting:</b> Resting at the inn restores 1 HP per <code>1 + Terrain Level</code> Gold (e.g. Level 1 costs 2g/HP; Level 3 costs 4g/HP). Accessible anytime while visiting a village.</li>
                <li><b>Market Trading:</b> Stores stock up to <code>3 + Village Level</code> unique item cards matching the village&rsquo;s exact level (Grassland 4, Forest 5, Swamp 6, Cave 7) drawn from the 48-card Treasure Deck. Wrong-level or duplicate draws go to the Treasure Discard Pile; if eligible supply runs out after reshuffling, the shop opens with what is available. Equipped gear is marked <b>Equipped</b> and must be unequipped before selling; selling an item requires confirmation and <b>Banishes</b> it to <b>The Void</b> so you won&rsquo;t re-draw sold gear.</li>
                <li><b>Training &amp; Banishing:</b> Draft 1 of 3 learnable cards from the Skills Deck, or pay Gold to <b>Banish</b> an unwanted card out of the game into <b>The Void</b>.</li>
                <li><b>Undiscovered Exploration:</b> Stepping onto an Undiscovered Terrain draws a Path Card from the <b>17-card Paths Deck</b> (<b>MIDS™</b>), triggering sidequests, ambushes, chests, traps, merchants, or sanctuaries.</li>
                <li><b>The Void (Game Box):</b> <b>The Void</b> is not a deck—it is the game box where you can inspect cards not currently in use (unselected monster/terrain copies, Shrine upgrade templates, and <b>Banished</b> cards). Full creature cards use the New Paths set symbol for rarity: <span class="guide-rarity-key">${monsterRaritySymbolHtml(MONSTER_TEMPLATES.goblin, 'guide-set-symbol')} bronze = Common</span>, <span class="guide-rarity-key">${monsterRaritySymbolHtml(MONSTER_TEMPLATES.stalker, 'guide-set-symbol')} silver = Uncommon</span>, and <span class="guide-rarity-key">${monsterRaritySymbolHtml(MONSTER_TEMPLATES.rattler, 'guide-set-symbol')} gold = Rare</span>.</li>
              </ul>

              <div class="adnd-parchment-box callout-quest">
                <h5 class="adnd-box-title">COMMENCING THY JOURNEY</h5>
                <p class="adnd-box-text">
                  Equip thy weapon, steel thy resolve, and choose thy initial steps with wisdom. The realm awaits thy triumph!
                </p>
              </div>

              <div class="adnd-page-jump-row">
                <span class="adnd-jump-label">Next Chapter:</span>
                <button class="btn mini guide-jump-btn" data-action="guide-jump-page" data-page="6">Turn to Ch. VI: Bestiary &rarr;</button>
                <button class="btn primary guide-jump-btn" data-action="close-guide">${inGame ? 'Back to Game' : 'Ready to Begin'}</button>
              </div>
            </div>
          </div>
        </article>

        <!-- ============================================================ -->
        <!-- PAGE 6: Chapter VI — The Monstrous Compendium (Bestiary)     -->
        <!-- ============================================================ -->
        <article class="guide-book-page ${p === 6 ? 'is-active' : ''}" data-page="6">
          <header class="guide-page-header">
            <span class="guide-running-head">ADVANCED ADVENTURERS &amp; DUNGEONS &bull; RULEBOOK</span>
            <h3 class="guide-chapter-title">&mdash; CHAPTER VI: THE MONSTROUS COMPENDIUM &mdash;</h3>
            <p class="guide-chapter-sub">Field Guide to Creatures of the Realm &bull; Click any monster card to inspect full stats, intents, rewards &amp; lore</p>
          </header>

          <nav class="guide-bestiary-quicknav" aria-label="Bestiary Biome Navigation">
            <button type="button" class="guide-quicknav-btn" data-action="guide-scroll-section" data-target="bestiary-grasslands">🌿 Grasslands (6)</button>
            <button type="button" class="guide-quicknav-btn" data-action="guide-scroll-section" data-target="bestiary-forest">🌲 Forest (5)</button>
            <button type="button" class="guide-quicknav-btn" data-action="guide-scroll-section" data-target="bestiary-swamp">🪷 Swamp (4)</button>
            <button type="button" class="guide-quicknav-btn" data-action="guide-scroll-section" data-target="bestiary-cave">🪨 Caves (3)</button>
            <button type="button" class="guide-quicknav-btn" data-action="guide-scroll-section" data-target="bestiary-underground">⛏️ Underground (2)</button>
            <button type="button" class="guide-quicknav-btn" data-action="guide-scroll-section" data-target="bestiary-bosses">👑 Bosses (6)</button>
          </nav>

          <div class="guide-folio-grid">
            <div class="guide-folio-col">
              <section id="bestiary-grasslands" class="guide-bestiary-category">
                <div class="guide-bestiary-cat-header">
                  <h4 class="guide-bestiary-cat-title"><span>🌿</span> Grasslands Dwellers <small>(Lvl 1–2)</small></h4>
                  <p class="guide-bestiary-cat-sub">Encountered across open plains and grassy borders</p>
                </div>
                <div class="guide-bestiary-grid">
                  ${getBestiaryMonstersForTerrain('grasslands').map(id => renderGuideBestiaryCardItem(id)).join('')}
                </div>
              </section>

              <section id="bestiary-forest" class="guide-bestiary-category">
                <div class="guide-bestiary-cat-header">
                  <h4 class="guide-bestiary-cat-title"><span>🌲</span> Forest Predators <small>(Lvl 2–3)</small></h4>
                  <p class="guide-bestiary-cat-sub">Lurking beneath deep canopies and ancient thickets</p>
                </div>
                <div class="guide-bestiary-grid">
                  ${getBestiaryMonstersForTerrain('forest').map(id => renderGuideBestiaryCardItem(id)).join('')}
                </div>
              </section>

              <section id="bestiary-swamp" class="guide-bestiary-category">
                <div class="guide-bestiary-cat-header">
                  <h4 class="guide-bestiary-cat-title"><span>🪷</span> Swamp Horrors <small>(Lvl 3–4)</small></h4>
                  <p class="guide-bestiary-cat-sub">Festering in murky bogs, toxic fens and rotting marshes</p>
                </div>
                <div class="guide-bestiary-grid">
                  ${getBestiaryMonstersForTerrain('swamp').map(id => renderGuideBestiaryCardItem(id)).join('')}
                </div>
              </section>
            </div>

            <div class="guide-folio-col">
              <section id="bestiary-cave" class="guide-bestiary-category">
                <div class="guide-bestiary-cat-header">
                  <h4 class="guide-bestiary-cat-title"><span>🪨</span> Cave Denizens <small>(Lvl 4–5)</small></h4>
                  <p class="guide-bestiary-cat-sub">Stalking subterranean caverns, shadows and crystal depths</p>
                </div>
                <div class="guide-bestiary-grid">
                  ${getBestiaryMonstersForTerrain('cave').map(id => renderGuideBestiaryCardItem(id)).join('')}
                </div>
              </section>

              <section id="bestiary-underground" class="guide-bestiary-category">
                <div class="guide-bestiary-cat-header">
                  <h4 class="guide-bestiary-cat-title"><span>⛏️</span> Underground Horrors <small>(Lvl 5–6)</small></h4>
                  <p class="guide-bestiary-cat-sub">Stalking subterranean abysses, deep ruins and ancient sepulchers</p>
                </div>
                <div class="guide-bestiary-grid">
                  ${getBestiaryMonstersForTerrain('underground').map(id => renderGuideBestiaryCardItem(id)).join('')}
                </div>
              </section>

              <section id="bestiary-bosses" class="guide-bestiary-category">
                <div class="guide-bestiary-cat-header">
                  <h4 class="guide-bestiary-cat-title"><span>👑</span> Legendary Bosses <small>(Culminations)</small></h4>
                  <p class="guide-bestiary-cat-sub">Turn 15 culmination encounters across all scenarios</p>
                </div>
                <div class="guide-bestiary-grid">
                  ${getBestiaryBosses().map(id => renderGuideBestiaryCardItem(id)).join('')}
                </div>
              </section>

              <div class="adnd-page-jump-row">
                <span class="adnd-jump-label">Next Chapter:</span>
                <button class="btn mini guide-jump-btn" data-action="guide-jump-page" data-page="5">&larr; Back to Ch. V: Shrines &amp; Void</button>
                <button class="btn mini guide-jump-btn" data-action="guide-jump-page" data-page="7">Turn to Ch. VII: Armory &rarr;</button>
                <button class="btn primary guide-jump-btn" data-action="close-guide">${inGame ? 'Back to Game' : 'Ready to Begin'}</button>
              </div>
            </div>
          </div>
        </article>

        <!-- ============================================================ -->
        <!-- PAGE 7: Chapter VII — The Grand Armory (Equipment & Items)   -->
        <!-- ============================================================ -->
        <article class="guide-book-page ${p === 7 ? 'is-active' : ''}" data-page="7">
          <header class="guide-page-header">
            <span class="guide-running-head">ADVANCED ADVENTURERS &amp; DUNGEONS &bull; RULEBOOK</span>
            <h3 class="guide-chapter-title">&mdash; CHAPTER VII: THE GRAND ARMORY &mdash;</h3>
            <p class="guide-chapter-sub">Equipment &amp; Treasure Compendium &bull; Click any card to inspect full stats, formulas, resell values &amp; lore</p>
          </header>

          <div class="guide-folio-grid">
            <div class="guide-folio-col">
              <section class="guide-bestiary-category">
                <div class="guide-bestiary-cat-header">
                  <h4 class="guide-bestiary-cat-title"><span>⚔️</span> Weapons &amp; Armaments <small>(Blades, Staves &amp; Daggers)</small></h4>
                  <p class="guide-bestiary-cat-sub">Equipped in the Weapon slot &bull; Boosts physical ATK, magical MATK, or armor Penetration</p>
                </div>
                <div class="guide-bestiary-grid">
                  ${getArmoryItemsForCategory('weapon').map(item => renderGuideArmoryCardItem(item)).join('')}
                </div>
              </section>

              <section class="guide-bestiary-category">
                <div class="guide-bestiary-cat-header">
                  <h4 class="guide-bestiary-cat-title"><span>🛡️</span> Armor &amp; Defensive Attire <small>(Mail, Leather &amp; Robes)</small></h4>
                  <p class="guide-bestiary-cat-sub">Equipped in the Armor slot &bull; Deflects attacks, reduces damage, and raises DEF, MDEF, or EVA</p>
                </div>
                <div class="guide-bestiary-grid">
                  ${getArmoryItemsForCategory('armor').map(item => renderGuideArmoryCardItem(item)).join('')}
                </div>
              </section>
            </div>

            <div class="guide-folio-col">
              <section class="guide-bestiary-category">
                <div class="guide-bestiary-cat-header">
                  <h4 class="guide-bestiary-cat-title"><span>💍</span> Accessories &amp; Talismans <small>(Rings, Relics &amp; Charms)</small></h4>
                  <p class="guide-bestiary-cat-sub">Equipped in the Accessory slot &bull; Raises core attributes (STR, DEX, AGI, INT) or victory spoils</p>
                </div>
                <div class="guide-bestiary-grid">
                  ${getArmoryItemsForCategory('accessory').map(item => renderGuideArmoryCardItem(item)).join('')}
                </div>
              </section>

              <section class="guide-bestiary-category">
                <div class="guide-bestiary-cat-header">
                  <h4 class="guide-bestiary-cat-title"><span>🧪</span> Potions &amp; Restoratives <small>(Consumable Elixirs)</small></h4>
                  <p class="guide-bestiary-cat-sub">Kept in backpack &bull; Usable during exploration to immediately restore health</p>
                </div>
                <div class="guide-bestiary-grid">
                  ${getArmoryItemsForCategory('consumable').map(item => renderGuideArmoryCardItem(item)).join('')}
                </div>
              </section>

              <div class="adnd-page-jump-row">
                <span class="adnd-jump-label">Next Chapter:</span>
                <button class="btn mini guide-jump-btn" data-action="guide-jump-page" data-page="8">Turn to Ch. VIII: Terrain &rarr;</button>
              </div>
            </div>
          </div>
        </article>

        <!-- ============================================================ -->
        <!-- PAGE 8: Chapter VIII — Realm Terrains (Adventure Cards)      -->
        <!-- ============================================================ -->
        <article class="guide-book-page ${p === 8 ? 'is-active' : ''}" data-page="8">
          <header class="guide-page-header">
            <span class="guide-running-head">ADVANCED ADVENTURERS &amp; DUNGEONS &bull; RULEBOOK</span>
            <h3 class="guide-chapter-title">&mdash; CHAPTER VIII: REALM TERRAINS &mdash;</h3>
            <p class="guide-chapter-sub">Adventure Cards Compendium &bull; Click any terrain card to inspect encounter levels, events &amp; deck counts</p>
          </header>

          <nav class="guide-bestiary-quicknav" aria-label="Terrain Sections">
            <button type="button" class="guide-quicknav-btn" data-action="guide-scroll-section" data-target="terrain-grasslands">🌿 Grasslands (4)</button>
            <button type="button" class="guide-quicknav-btn" data-action="guide-scroll-section" data-target="terrain-forest">🌲 Forest (4)</button>
            <button type="button" class="guide-quicknav-btn" data-action="guide-scroll-section" data-target="terrain-swamp">🪷 Swamp (4)</button>
            <button type="button" class="guide-quicknav-btn" data-action="guide-scroll-section" data-target="terrain-cave">🪨 Cave (4)</button>
            <button type="button" class="guide-quicknav-btn" data-action="guide-scroll-section" data-target="terrain-underground">⛏️ Underground (2)</button>
          </nav>

          <div class="guide-folio-grid">
            <div class="guide-folio-col">
              <section id="terrain-grasslands" class="guide-bestiary-category">
                <div class="guide-bestiary-cat-header">
                  <h4 class="guide-bestiary-cat-title"><span>🌿</span> Grasslands <small>(Tier 1 Biome)</small></h4>
                  <p class="guide-bestiary-cat-sub">Stage 1 primary biome &bull; Rolling plains, starter villages, and golden shrines</p>
                </div>
                <div class="guide-bestiary-grid">
                  ${getTerrainCardsForBiome('grasslands').map((def) => renderGuideAdventureCardItem(def.cardCode)).join('')}
                </div>
              </section>

              <section id="terrain-forest" class="guide-bestiary-category">
                <div class="guide-bestiary-cat-header">
                  <h4 class="guide-bestiary-cat-title"><span>🌲</span> Forest <small>(Tier 2 Biome)</small></h4>
                  <p class="guide-bestiary-cat-sub">Stage 1 secondary / Stage 2 primary biome &bull; Treetop villages and druidic circles</p>
                </div>
                <div class="guide-bestiary-grid">
                  ${getTerrainCardsForBiome('forest').map((def) => renderGuideAdventureCardItem(def.cardCode)).join('')}
                </div>
              </section>
            </div>

            <div class="guide-folio-col">
              <section id="terrain-swamp" class="guide-bestiary-category">
                <div class="guide-bestiary-cat-header">
                  <h4 class="guide-bestiary-cat-title"><span>🪷</span> Swamp <small>(Tier 3 Biome)</small></h4>
                  <p class="guide-bestiary-cat-sub">Stage 2 secondary / Stage 3 primary biome &bull; Stilt villages and sunken altars</p>
                </div>
                <div class="guide-bestiary-grid">
                  ${getTerrainCardsForBiome('swamp').map((def) => renderGuideAdventureCardItem(def.cardCode)).join('')}
                </div>
              </section>

              <section id="terrain-cave" class="guide-bestiary-category">
                <div class="guide-bestiary-cat-header">
                  <h4 class="guide-bestiary-cat-title"><span>🪨</span> Cave <small>(Tier 4 Biome)</small></h4>
                  <p class="guide-bestiary-cat-sub">Stage 2 deepest / Stage 3 secondary biome &bull; Miners encampments and crystal shrines</p>
                </div>
                <div class="guide-bestiary-grid">
                  ${getTerrainCardsForBiome('cave').map((def) => renderGuideAdventureCardItem(def.cardCode)).join('')}
                </div>
              </section>

              <section id="terrain-underground" class="guide-bestiary-category">
                <div class="guide-bestiary-cat-header">
                  <h4 class="guide-bestiary-cat-title"><span>⛏️</span> Underground <small>(Tier 5 Biome)</small></h4>
                  <p class="guide-bestiary-cat-sub">Stage 3 deepest frontier &bull; Uncharted abyssal depths and royal sepulchers</p>
                </div>
                <div class="guide-bestiary-grid">
                  ${getTerrainCardsForBiome('underground').map((def) => renderGuideAdventureCardItem(def.cardCode)).join('')}
                </div>
              </section>

              <div class="adnd-page-jump-row">
                <span class="adnd-jump-label">Next Chapter:</span>
                <button class="btn mini guide-jump-btn" data-action="guide-jump-page" data-page="9">Turn to Ch. IX: Skills &rarr;</button>
              </div>
            </div>
          </div>
        </article>

        <!-- ============================================================ -->
        <!-- PAGE 9: Chapter IX — Combat Arts & Spells (Action Cards)     -->
        <!-- ============================================================ -->
        <article class="guide-book-page ${p === 9 ? 'is-active' : ''}" data-page="9">
          <header class="guide-page-header">
            <span class="guide-running-head">ADVANCED ADVENTURERS &amp; DUNGEONS &bull; RULEBOOK</span>
            <h3 class="guide-chapter-title">&mdash; CHAPTER IX: COMBAT ARTS &amp; SPELLS &mdash;</h3>
            <p class="guide-chapter-sub">Action Cards Compendium &bull; Click any skill card to inspect AP cost, scaling formulas &amp; supply</p>
          </header>

          <nav class="guide-bestiary-quicknav" aria-label="Skill Sections">
            <button type="button" class="guide-quicknav-btn" data-action="guide-scroll-section" data-target="skills-fighter">⚔️ Martial / Fighter (10)</button>
            <button type="button" class="guide-quicknav-btn" data-action="guide-scroll-section" data-target="skills-wizard">🔮 Wizard Spells (5)</button>
            <button type="button" class="guide-quicknav-btn" data-action="guide-scroll-section" data-target="skills-upgrades">✨ Shrine Void Upgrades (3)</button>
            <button type="button" class="guide-quicknav-btn" data-action="guide-scroll-section" data-target="skills-universal">🏃 Universal (1)</button>
          </nav>

          <div class="guide-folio-grid">
            <div class="guide-folio-col">
              <section id="skills-fighter" class="guide-bestiary-category">
                <div class="guide-bestiary-cat-header">
                  <h4 class="guide-bestiary-cat-title"><span>⚔️</span> Martial &amp; Fighter Arts <small>(Fighter &amp; Rogue Pool)</small></h4>
                  <p class="guide-bestiary-cat-sub">Slash, Defend, High Strike, Parry &amp; Fortify are shared with Rogue; Whirlwind through Final Smash are Fighter-exclusive</p>
                </div>
                <div class="guide-bestiary-grid">
                  ${Object.values(COMBAT_CARD_CATALOG)
                    .filter((tpl) => tpl.classId === 'fighter' && !tpl.isSkillUpgrade)
                    .map((tpl) => renderGuideSkillCardItem(tpl, 'fighter'))
                    .join('')}
                </div>
              </section>
            </div>

            <div class="guide-folio-col">
              <section id="skills-wizard" class="guide-bestiary-category">
                <div class="guide-bestiary-cat-header">
                  <h4 class="guide-bestiary-cat-title"><span>🔮</span> Wizard Arcane Spells <small>(INT Scaling)</small></h4>
                  <p class="guide-bestiary-cat-sub">Starter spells (Fireball &times;8, Force Field &times;2) plus trainable New Skills deck spells</p>
                </div>
                <div class="guide-bestiary-grid">
                  ${Object.values(COMBAT_CARD_CATALOG)
                    .filter((tpl) => tpl.classId === 'wizard' && !tpl.isSkillUpgrade)
                    .map((tpl) => renderGuideSkillCardItem(tpl, 'wizard'))
                    .join('')}
                </div>
              </section>

              <section id="skills-upgrades" class="guide-bestiary-category">
                <div class="guide-bestiary-cat-header">
                  <h4 class="guide-bestiary-cat-title"><span>✨</span> Shrine Void Upgrades <small>(Inexhaustible Templates)</small></h4>
                  <p class="guide-bestiary-cat-sub">Forged at Sacred Shrines by upgrading an eligible owned base skill card</p>
                </div>
                <div class="guide-bestiary-grid">
                  ${Object.values(COMBAT_CARD_CATALOG)
                    .filter((tpl) => tpl.isSkillUpgrade)
                    .map((tpl) => renderGuideSkillCardItem(tpl))
                    .join('')}
                </div>
              </section>

              <section id="skills-universal" class="guide-bestiary-category">
                <div class="guide-bestiary-cat-header">
                  <h4 class="guide-bestiary-cat-title"><span>🏃</span> Universal Combat Action <small>(Always Available)</small></h4>
                  <p class="guide-bestiary-cat-sub">Permanent escape option available every battle without occupying deck slots</p>
                </div>
                <div class="guide-bestiary-grid">
                  ${renderGuideFleeCardItem()}
                </div>
              </section>

              <div class="adnd-page-jump-row">
                <span class="adnd-jump-label">Continue Reading:</span>
                <button class="btn mini guide-jump-btn" data-action="guide-jump-page" data-page="8">&larr; Back to Ch. VIII: Terrain</button>
                <button class="btn primary guide-jump-btn" data-action="guide-jump-page" data-page="10">Next: Ch. X Glossary &rarr;</button>
              </div>
            </div>
          </div>
        </article>

        <!-- ============================================================ -->
        <!-- PAGE 10: Keyword Glossary (MTG-style Card Vocabulary)         -->
        <!-- ============================================================ -->
        <article class="guide-book-page ${p === 10 ? 'is-active' : ''}" data-page="10">
          <header class="guide-page-header">
            <span class="guide-running-head">ADVANCED ADVENTURERS &amp; DUNGEONS &bull; RULEBOOK</span>
            <h3 class="guide-chapter-title">&mdash; CHAPTER X: KEYWORD GLOSSARY &mdash;</h3>
            <p class="guide-chapter-sub">Standardized Physical Card Vocabulary &bull; Hover any underlined keyword on a Monster Card in-game for its live tooltip</p>
          </header>

          <div class="guide-folio-grid">
            ${(['Combat Damage', 'Defense & Recovery', 'Status & Debuffs', 'Creature Traits'] as GlossaryCategory[]).map((cat) => {
              const entries = KEYWORD_GLOSSARY.filter((e) => e.category === cat);
              return `
                <section class="guide-bestiary-category">
                  <div class="guide-bestiary-cat-header">
                    <h4 class="guide-bestiary-cat-title">${cat}</h4>
                    <p class="guide-bestiary-cat-sub">Official tabletop card shorthand &amp; resolution rules</p>
                  </div>
                  <div class="guide-glossary-list">
                    ${entries.map((entry) => `
                      <div class="guide-rule-callout guide-glossary-card">
                        <div class="guide-glossary-head">
                          <strong class="guide-glossary-term">${entry.term}</strong>
                          <code class="guide-glossary-syntax">${entry.syntax}</code>
                        </div>
                        <p class="guide-body-text">${entry.ruleText}</p>
                        <p class="guide-glossary-example"><em>Example:</em> ${entry.example}</p>
                      </div>
                    `).join('')}
                  </div>
                </section>
              `;
            }).join('')}

            <section class="guide-bestiary-category">
              <div class="guide-bestiary-cat-header">
                <h4 class="guide-bestiary-cat-title">Core Game Terms</h4>
                <p class="guide-bestiary-cat-sub">Shared tabletop deck, defense, and combat terminology</p>
              </div>
              <ul class="adnd-bullet-list">
                <li><b>Morville Infinite Deck System™ (MIDS™):</b> Applies to the <b>Adventure, Paths, Monster, Combat, Treasure, and Skills Decks</b>. Each MIDS™ deck always has a <b>Deck + Discard Pile</b> pair. Cards go to their discard pile when used, destroyed, or discarded—except when <b>Banished</b>. Whenever any rule, process, or effect draws from an empty MIDS™ deck, its discard pile is automatically shuffled into a fresh deck and drawing continues seamlessly.</li>
                <li><b>Banished:</b> An effect that sends a card out of the game and into <b>The Void</b> instead of its discard pile.</li>
                <li><b>The Void:</b> Not a deck—it is the player&rsquo;s game box where cards not currently being used (unselected scenario cards, Shrine upgrade templates, and <b>Banished</b> cards) can be inspected.</li>
                <li><b>Summon:</b> Finding a specific card in a particular deck (e.g. Monster Deck), putting it directly into play, then shuffling the deck it came from. If none is found in the deck, look at the discard pile for that card (First In, First Out) and put it on top of the deck.</li>
                <li><b>Temporary Block:</b> Shields absorb incoming attack damage during the current round before dissipating.</li>
                <li><b>Physical Defense (DEF):</b> Permanent armor and bodily resistance that directly absorbs or deflects incoming physical blows on every hit.</li>
                <li><b>Magical Defense (MDEF):</b> Innate arcane warding reducing damage from hostile spell attacks.</li>
                <li><b>Creature ATK:</b> Increases any non-magical turn damage dealt by the creature.</li>
              </ul>
            </section>

            <div class="adnd-page-jump-row">
              <span class="adnd-jump-label">Previous Chapter:</span>
              <button class="btn mini guide-jump-btn" data-action="guide-jump-page" data-page="9">&larr; Back to Ch. IX: Skills</button>
              <button class="btn mini guide-jump-btn" data-action="guide-jump-page" data-page="11">Turn to Ch. XI: Paths &rarr;</button>
            </div>
          </div>
        </article>

        <!-- ============================================================ -->
        <!-- PAGE 11: Realm Paths (Paths Deck Compendium)                 -->
        <!-- ============================================================ -->
        <article class="guide-book-page ${p === 11 ? 'is-active' : ''}" data-page="11">
          <header class="guide-page-header">
            <span class="guide-running-head">ADVANCED ADVENTURERS &amp; DUNGEONS &bull; RULEBOOK</span>
            <h3 class="guide-chapter-title">&mdash; CHAPTER XI: REALM PATHS &mdash;</h3>
            <p class="guide-chapter-sub">Challenge Cards Drawn on Undiscovered Terrains &bull; Uses MIDS&trade; &amp; the MACG-3D6&trade; Success Check Bar</p>
          </header>

          <div class="guide-folio-grid">
            <section class="guide-bestiary-category">
              <div class="guide-bestiary-cat-header">
                <h4 class="guide-bestiary-cat-title"><span>&#129517;</span> Paths Deck Rules (MIDS&trade;)</h4>
                <p class="guide-bestiary-cat-sub">Whenever you step onto an Undiscovered Terrain, draw the top card from the Paths Deck</p>
              </div>
              <div class="guide-rule-callout">
                <p class="guide-body-text">
                  Paths cards test your hero using the <strong>MACG-3D6&trade; Success Check Bar</strong> and resolve into the <strong>Paths Discard Pile</strong>
                  (reshuffled automatically via <strong>MIDS&trade;</strong> whenever the Paths Deck runs empty).
                </p>
              </div>
            </section>

            <section class="guide-bestiary-category">
              <div class="guide-bestiary-cat-header">
                <h4 class="guide-bestiary-cat-title"><span>&#129517;</span> Path Card Compendium <small>(${PATH_CARD_CATALOG.reduce((sum, entry) => sum + entry.copies, 0)} Cards Total)</small></h4>
                <p class="guide-bestiary-cat-sub">All Path Challenge cards currently in the game</p>
              </div>
              <div class="guide-bestiary-grid">
                ${PATH_CARD_CATALOG.map((entry) => `
                  <div class="guide-bestiary-card-item guide-armory-card-item" data-action="inspect-path" data-inspect-kind="path" data-path-id="${entry.templateId}" role="button" tabindex="0">
                    <div class="guide-bestiary-card-wrapper">
                      ${renderTcgPathCard(entry, { extraClasses: 'guide-item-card-preview' })}
                    </div>
                    <div class="guide-bestiary-card-footer">
                      <div class="guide-card-supply-badge" title="Total physical copies in the board game">${entry.copies} ${entry.copies === 1 ? 'copy' : 'copies'} in game</div>
                      <button type="button" class="guide-bestiary-inspect-btn" tabindex="-1">
                        <span class="inspect-icon">&#9432;</span> Inspect Info
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </section>

            <div class="adnd-page-jump-row">
              <span class="adnd-jump-label">Previous Chapter:</span>
              <button class="btn mini guide-jump-btn" data-action="guide-jump-page" data-page="10">&larr; Back to Ch. X: Glossary</button>
              <button class="btn primary guide-jump-btn" data-action="close-guide">${inGame ? 'Back to Game' : 'Ready to Begin'}</button>
            </div>
          </div>
        </article>

        </div>
        </div>
      </div>

      <!-- Tome Page-Turn Footer with Medallion and Controls -->
      <footer class="guide-tome-footer">
        <button class="btn guide-turn-btn prev ${p <= 1 ? 'is-disabled' : ''}" data-action="guide-prev-page" ${p <= 1 ? 'disabled' : ''} title="Previous Page (A or &larr;)">
          &larr; Previous Page
        </button>

        <div class="guide-page-medallion">
          <span class="guide-medallion-crest" aria-hidden="true">&#10022;</span>
          <span class="guide-medallion-text">PAGE ${p} OF ${GUIDE_PAGE_COUNT}</span>
          <span class="guide-medallion-crest" aria-hidden="true">&#10022;</span>
          <span class="guide-turn-hint">Turn page with A / D or &larr; / &rarr; keys</span>
        </div>

        <button class="btn guide-turn-btn next" data-action="${p >= GUIDE_PAGE_COUNT ? 'close-guide' : 'guide-next-page'}" title="${p >= GUIDE_PAGE_COUNT ? 'Close Tome' : 'Next Page (D or &rarr;)'}">
          ${p >= GUIDE_PAGE_COUNT ? 'Close Tome &times;' : 'Next Page &rarr;'}
        </button>
      </footer>

    </div>
  </div>`;
}


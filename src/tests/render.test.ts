import { describe, it, expect } from 'vitest';
import { startAdventure } from '../core/engine';
import {
  renderPlayArea,
  renderClassSelect,
  renderWelcome,
  deckPilesPanelHtml,
  pileModal,
  UiState,
  updateClassCarouselDom,
  CLASS_CAROUSEL_ORDER,
  parseCombatLogEntry,
  renderCombatLogEntries,
  cardInspectModal,
  hasBlockingUiOverlay,
  getMonsterCarouselClass,
  updateMonsterCarouselDom,
  victoryModal,
  renderQteHitCheckBarHtml,
  getBestiaryMonstersForTerrain,
  renderGuideModal,
} from '../ui/render';
import { MONSTER_TEMPLATES } from '../data/monsters';
import { SHOP_ITEM_CATALOG } from '../data/shopItems';
import { createCombatCardInstance } from '../data/combatCards';
import { ADVENTURE_CARD_CATALOG } from '../data/stages';
import { getActionRasterArtPath } from '../ui/cardArt';
import { AdventureCard, CombatVictoryState, MonsterCard, RunState } from '../core/types';

describe('Render Play Area and Shop Layout', () => {
  it('treats every modal UI state as blocking gameplay carousel input', () => {
    const base: UiState = { selectedClass: 'fighter', showDeck: false, villageTab: 'buy', targetIndex: 0 };
    expect(hasBlockingUiOverlay(base)).toBe(false);
    expect(hasBlockingUiOverlay({ ...base, inspectedStat: 'str' })).toBe(true);
    expect(hasBlockingUiOverlay({ ...base, inspectedCard: { kind: 'action', card: createCombatCardInstance('melee_atk', 'blocking') } })).toBe(true);
    expect(hasBlockingUiOverlay({ ...base, inspectedPile: 'player_deck' })).toBe(true);
    expect(hasBlockingUiOverlay({ ...base, pendingCardPlay: { cardInstanceId: 'card', targetIndex: 0 } })).toBe(true);
    expect(hasBlockingUiOverlay({ ...base, pendingFlee: true })).toBe(true);
    expect(hasBlockingUiOverlay({ ...base, pendingTrainingAction: { kind: 'destroy', cardInstanceId: 'card' } })).toBe(true);
    expect(hasBlockingUiOverlay({ ...base, pendingShrineAction: { kind: 'upgrade-stat', stat: 'agi' } })).toBe(true);
    expect(hasBlockingUiOverlay({ ...base, showGuide: true })).toBe(true);
  });

  it('offers a friendly How to Play guide from the welcome screen and in-game HUD', () => {
    expect(renderWelcome()).toContain('data-action="open-guide"');
    const welcomeGuide = renderWelcome(true);
    expect(welcomeGuide).toContain('How to Play');
    expect(welcomeGuide.indexOf('welcome-card')).toBeLessThan(welcomeGuide.indexOf('guide-backdrop'));
    const state = startAdventure('fighter', 'guide-seed');
    const ui: UiState = { selectedClass: 'fighter', showDeck: false, villageTab: 'buy', targetIndex: 0, showGuide: true };
    const html = renderPlayArea(state, ui);
    expect(html).toContain('hud-guide-btn');
    expect(html).toContain('Battles in one minute');
    expect(html).toContain('Undiscovered Lands');
    expect(welcomeGuide).toContain('Player Combat Deck');
    expect(welcomeGuide).toContain('Player Combat Discard Pile');
    expect(welcomeGuide).toContain('one single card at a time');
    expect(welcomeGuide).toContain('refreshes');
  });

  it('features a comprehensive Player Class Guide and Understanding Stats section in the How to Play guide', () => {
    const welcomeGuide = renderWelcome(true);
    // Stats section
    expect(welcomeGuide).toContain('Understanding Stats & Attributes');
    expect(welcomeGuide).toContain('Strength (STR)');
    expect(welcomeGuide).toContain('Agility (AGI)');
    expect(welcomeGuide).toContain('Dexterity (DEX)');
    expect(welcomeGuide).toContain('Intelligence (INT)');
    expect(welcomeGuide).toContain('Charisma (CHA)');
    expect(welcomeGuide).toContain('Vitality (VIT)');
    expect(welcomeGuide).not.toContain('Luck (LUK)');
    expect(welcomeGuide).toContain('physical resistance to getting hurt');

    // Player Class Guide
    expect(welcomeGuide).toContain('Player Class Guide');
    expect(welcomeGuide).toContain('Fighter');
    expect(welcomeGuide).toContain('[Berzerk]');
    expect(welcomeGuide).toContain('Wizard');
    expect(welcomeGuide).toContain('[Conserve]');
    expect(welcomeGuide).toContain('Rogue');
    expect(welcomeGuide).toContain('[Steal]');
  });

  it('renders an AD&D-inspired rulebook with interactive page turning across 7 chapters including Bestiary and Armory', () => {
    const page1Html = renderWelcome(true, 1);
    expect(page1Html).toContain('guide-book-tome');
    expect(page1Html).toContain('guide-spread-viewport');
    expect(page1Html).toContain('guide-book-spine-gutter');
    expect(page1Html).toContain('guide-parchment-spread');
    expect(page1Html).toContain('guide-ribbon-bar');
    expect(page1Html).toContain('guide-page-medallion');
    expect(page1Html).toContain('PAGE 1 OF 7');
    expect(page1Html).toContain('guide-book-page is-active" data-page="1"');
    expect(page1Html).toContain('data-action="guide-jump-page" data-page="1"');
    expect(page1Html).toContain('data-action="guide-jump-page" data-page="5"');
    expect(page1Html).toContain('data-action="guide-jump-page" data-page="6"');
    expect(page1Html).toContain('data-action="guide-jump-page" data-page="7');
    expect(page1Html).toContain('SCENARIO 1: THE GOBLIN KING');
    expect(page1Html).toContain('SCENARIO 2: CULT OF TROLLS');
    expect(page1Html).toContain('Adventure Deck (30 Cards)');
    expect(page1Html).toContain('Monster Deck (45 Cards in Deck');
    expect(page1Html).toContain('Monster Deck (37 Cards in Deck');
    expect(page1Html).toContain('Treasure Deck (42 Cards)');
    expect(page1Html).toContain('Turn to Ch. II: Battle &rarr;');

    const page2Html = renderWelcome(true, 2);
    expect(page2Html).toContain('PAGE 2 OF 7');
    expect(page2Html).toContain('MACG-3D6');
    expect(page2Html).toContain('qte-bar-container');
    expect(page2Html).toContain('/icons/qte-token.png');
    expect(page2Html).toContain('adnd-prob-table');
    expect(page2Html).not.toContain('Combat Note');
    expect(page2Html).toContain('MACG-3D6™ SUCCESS ROLL RANGE TABLE REFERENCE');
    expect(page2Html).toContain('<b>Tier 1</b> <small>(&le; -3 Net ACC · Sure Hit Rolls)</small>');
    expect(page2Html).toContain('<b>Tier 2</b>');
    expect(page2Html).toContain('<b>Tier 3</b>');
    expect(page2Html).toContain('<b>Tier 4</b>');
    expect(page2Html).toContain('<b>Tier 5</b>');
    expect(page2Html).toContain('<b>Tier 6</b>');
    expect(page2Html).toContain('<b>Tier 7</b>');
    expect(page2Html).toContain('<b>Diabolic Rolls</b> 😈 <small>(Always Miss)</small>');
    expect(page2Html).toContain('<b>0.9%</b>');
    expect(page2Html).toContain('10 &ndash; 11');
    expect(page2Html).toContain('4 &ndash; 17');

    const page3Html = renderWelcome(true, 3);
    expect(page3Html).toContain('PAGE 3 OF 7');
    expect(page3Html).toContain('guide-book-page is-active" data-page="3"');

    const page5Html = renderWelcome(true, 5);
    expect(page5Html).toContain('PAGE 5 OF 7');
    expect(page5Html).toContain('guide-book-page is-active" data-page="5"');
    expect(page5Html).toContain('data-action="guide-jump-page" data-page="6"');

    // Page 6: Monstrous Compendium / Bestiary
    const page6Html = renderWelcome(true, 6);
    expect(page6Html).toContain('PAGE 6 OF 7');
    expect(page6Html).toContain('guide-book-page is-active" data-page="6"');
    expect(page6Html).toContain('CHAPTER VI: THE MONSTROUS COMPENDIUM');
    expect(page6Html).toContain('Grasslands Dwellers');
    expect(page6Html).toContain('Forest Predators');
    expect(page6Html).toContain('Swamp Horrors');
    expect(page6Html).toContain('Cave Denizens');
    expect(page6Html).toContain('Legendary Bosses');
    expect(page6Html).toContain('data-action="inspect-monster"');
    expect(page6Html).toContain('data-inspect-kind="monster"');
    expect(page6Html).toContain('data-monster-id="goblin"');
    expect(page6Html).toContain('data-monster-id="stalker"');
    expect(page6Html).toContain('data-monster-id="goblin_chieftain"');
    expect(page6Html).toContain('Inspect Info');
    expect(page6Html).toContain('data-action="guide-jump-page" data-page="7"');
    expect(page6Html).toContain('Turn to Ch. VII: Armory &rarr;');

    // Verify lowest territory symbol grouping: Stalker (grasslands/forest) is in Grasslands Dwellers, not Cave Denizens
    const grasslandsSection = page6Html.match(/Grasslands Dwellers[\s\S]*?Forest Predators/)?.[0] ?? '';
    expect(grasslandsSection).toContain('data-monster-id="stalker"');
    expect(grasslandsSection).toContain('data-monster-id="pink_slime"');
    expect(grasslandsSection).toContain('data-monster-id="goblin"');

    const caveSection = page6Html.match(/Cave Denizens[\s\S]*?Legendary Bosses/)?.[0] ?? '';
    expect(caveSection).not.toContain('data-monster-id="stalker"');
    expect(caveSection).not.toContain('data-monster-id="witch"');
    expect(caveSection).not.toContain('data-monster-id="assassin"');
    expect(caveSection).toContain('data-monster-id="phalanx"');
    expect(caveSection).toContain('data-monster-id="cultist_mage"');
    expect(caveSection).toContain('data-monster-id="lurker"');

    // Inspecting a monster card from the guide opens the card-inspect-modal
    const inspectedGuideHtml = renderWelcome(true, 6, {
      kind: 'monster',
      monster: { ...MONSTER_TEMPLATES.goblin, id: 'inspect_goblin' },
    });
    expect(inspectedGuideHtml).toContain('card-inspect-modal');
    expect(inspectedGuideHtml).toContain('Goblin (Monster Card Reference)');
    expect(inspectedGuideHtml).toContain('Back to Game');

    // Page 7: Equipment Compendium / The Grand Armory
    const page7Html = renderWelcome(true, 7);
    expect(page7Html).toContain('PAGE 7 OF 7');
    expect(page7Html).toContain('guide-book-page is-active" data-page="7"');
    expect(page7Html).toContain('CHAPTER VII: THE GRAND ARMORY');
    expect(page7Html).toContain('Weapons &amp; Armaments');
    expect(page7Html).toContain('Armor &amp; Defensive Attire');
    expect(page7Html).toContain('Accessories &amp; Talismans');
    expect(page7Html).toContain('Potions &amp; Restoratives');
    expect(page7Html).toContain('data-action="inspect-item"');
    expect(page7Html).toContain('data-inspect-kind="item"');
    expect(page7Html).toContain('data-item-id="lvl1_iron_sword"');
    expect(page7Html).toContain('data-item-id="lvl1_chainmail"');
    expect(page7Html).toContain('data-item-id="lvl2_beast_ring"');
    expect(page7Html).toContain('data-item-id="lvl1_health_potion"');
    expect(page7Html).toContain('data-action="guide-jump-page" data-page="6"');
    expect(page7Html).toContain('&larr; Back to Ch. VI: Bestiary');

    // Inspecting an item card from the guide opens the item card-inspect-modal
    const inspectedItemHtml = renderWelcome(true, 7, {
      kind: 'item',
      item: { ...SHOP_ITEM_CATALOG[1], instanceId: 'inspect_lvl1_iron_sword' },
    });
    expect(inspectedItemHtml).toContain('card-inspect-modal');
    expect(inspectedItemHtml).toContain('Iron Sword (Physical TCG Item Reference)');
    expect(inspectedItemHtml).toContain('Back to Game');
  });

  it('renders shop layout with sidebar and main content', () => {
    let state = startAdventure('fighter', 'test-seed');
    state = {
      ...state,
      welcomePreparing: false,
      activeHook: {
        type: 'VILLAGE',
        village: {
          coord: { col: 0, row: 1 },
          turn: 1,
          subView: 'shop',
          actionTaken: false,
          trainOptions: [],
          shopStock: SHOP_ITEM_CATALOG.slice(0, 6).map((tpl, i) => ({ ...tpl, instanceId: `stock_${i}` })),
        },
      },
    };
    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
    };

    const bodyHtml = renderPlayArea(state, ui);
    expect(bodyHtml).toContain('play-layout');
    expect(bodyHtml).toContain('play-sidebar');
    expect(bodyHtml).toContain('play-main');
    expect(bodyHtml).toContain('village-view');
    expect(bodyHtml).toContain('is-shop');
    expect(bodyHtml).not.toContain('modal-backdrop');
    expect(bodyHtml).toContain('shop-layout');
    expect(bodyHtml).toContain('shop-main');
    expect(bodyHtml).toContain('Character & Gear');
    expect(bodyHtml).not.toContain('Done shopping');
    expect(bodyHtml).not.toContain('Current stats');
    expect(bodyHtml.match(/class="player-info-widget"/g)).toHaveLength(1);
    expect(bodyHtml).toContain('Backpack');

    // Card art is rendered in the shop options
    expect(bodyHtml).toContain('shop-card-preview-box');
    expect(bodyHtml).toContain('shop-mini-card');
    expect(bodyHtml).toContain('shop-card-art-img');
    expect(bodyHtml).toContain('/cards/items/');
  });

  it('shows training Gold/SP in a sidebar and confirms learning or destroying cards', () => {
    const state = startAdventure('fighter', 'training-confirm-ui');
    const offer = createCombatCardInstance('battlecry', 'training-offer');
    state.activeHook = {
      type: 'VILLAGE',
      village: { coord: { col: 0, row: 1 }, turn: 1, subView: 'train', trainOptions: [offer], shopStock: [] },
    };
    const baseUi: UiState = { selectedClass: 'fighter', showDeck: false, villageTab: 'buy', targetIndex: 0 };
    const training = renderPlayArea(state, baseUi);
    expect(training).toContain('village-training-sidebar');
    expect(training).toContain('Your Resources');
    expect(training).toContain('Destroy a card');
    expect(training).toContain('Destroyed cards go to the Void');

    const purchase = renderPlayArea(state, {
      ...baseUi,
      pendingTrainingAction: { kind: 'learn', cardInstanceId: offer.instanceId },
    });
    expect(purchase).toContain('Learn Battlecry?');
    expect(purchase).toContain('Confirm Purchase');

    const destroy = renderPlayArea(state, {
      ...baseUi,
      pendingTrainingAction: { kind: 'destroy', cardInstanceId: state.playerMasterDeck[0].instanceId },
    });
    expect(destroy).toContain('Destroy Slash?');
    expect(destroy).toContain('Confirm Destroy');
  });

  it('shows every living target and its independent hit chance for Whirlwind', () => {
    const state = startAdventure('fighter', 'whirlwind-target-ui');
    const whirlwind = createCombatCardInstance('whirlwind', 'all-targets');
    const goblin = { ...MONSTER_TEMPLATES.goblin, id: 'whirlwind-goblin' };
    const rattler = { ...MONSTER_TEMPLATES.rattler, id: 'whirlwind-rattler' };
    state.activeHook = {
      type: 'COMBAT',
      combat: {
        monsters: [
          { monster: goblin, hp: goblin.maxHp, block: 0, patternIndex: 0 },
          { monster: rattler, hp: rattler.maxHp, block: 0, patternIndex: 0 },
        ],
        combatTurn: 1, playerAp: 3, playerMaxAp: 3, playerBlock: 0, playerEvasionMod: 0,
        drawPile: [], hand: [whirlwind], discardPile: [], stack: [], inPlay: [], combatLog: [],
      },
    };
    const html = renderPlayArea(state, {
      selectedClass: 'fighter', showDeck: false, villageTab: 'buy', targetIndex: 0,
      pendingCardPlay: { cardInstanceId: whirlwind.instanceId, targetIndex: 0 },
    });
    expect(html).toContain('All Target Creatures · Separate Hit Checks');
    expect(html).toContain('Every living enemy makes its own hit check');
    expect(html).toContain('Goblin');
    expect(html).toContain('Rattler');
    expect(html.match(/confirm-all-target-card/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('renders TCG monster cards with grassland frame, spawn terrain icons, art, and card number', () => {
    let state = startAdventure('fighter', 'test-seed');
    const goblinCard: MonsterCard = {
      ...MONSTER_TEMPLATES['goblin'],
      id: 'monster_goblin_01',
    };
    state = {
      ...state,
      activeHook: {
        type: 'COMBAT',
        combat: {
          monsters: [
            {
              monster: goblinCard,
              hp: goblinCard.maxHp,
              block: 0,
              patternIndex: 0,
            },
          ],
          combatTurn: 1,
          playerBlock: 0,
          playerEvasionMod: 0,
          hand: [state.playerMasterDeck[0]],
          drawPile: [],
          discardPile: [],
          playerAp: 3,
          playerMaxAp: 3,
          combatLog: [],
        },
      },
    };
    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
    };

    const html = renderPlayArea(state, ui);
    // TCG creature card structure & reusable template
    expect(html).toContain('tcg-card tcg-creature');
    expect(html).toContain('tcg-template-grassland');
    expect(html).toContain('tcg-inner-frame');
    expect(html).toContain('tcg-header');
    expect(html).toContain('tcg-name');
    expect(html).toContain('Goblin');

    // No HP pill in the header — ample space for name; HP is displayed in bottom-right PT box
    expect(html).not.toContain('tcg-hp-pill');

    // Spawn terrain icons (Grasslands 🌿 and Forest 🌲)
    expect(html).toContain('tcg-spawn-group');
    expect(html).toContain('tcg-spawn-badge grass');
    expect(html).toContain('tcg-spawn-badge forest');
    expect(html).toContain('🌿');
    expect(html).toContain('🌲');

    // Kid-friendly full-bleed raster art illustration
    expect(html).toContain('tcg-art-window');
    expect(html).toContain('tcg-art-raster');
    expect(html).toContain('/cards/creatures/goblin.jpg');

    // Header with level and subtype, without the now-redundant CREATURE word
    expect(html).toContain('tcg-header-meta');
    expect(html).not.toContain('<span class="tcg-type-main">CREATURE</span>');
    expect(html).toContain('Goblinoid');
    expect(html).toContain('Lvl 1');
    expect(html).toContain('tcg-header-title');
    expect(html).toContain('<span class="tcg-name">Goblin</span>');

    // Floating reward badges on artwork with SP & Gold
    expect(html).toContain('tcg-art-rewards');
    expect(html).toContain('tcg-art-reward-badge sp');
    expect(html).toContain('tcg-art-reward-badge gold');
    expect(html).toContain('+1');
    expect(html).toContain('+2');

    // Physical Card Face: pattern table, abilities, and creature stats row (DEF, EVA)
    expect(html).toContain('tcg-textbox');
    expect(html).toContain('tcg-pattern-table');
    expect(html).toContain('Slash');
    expect(html).toContain('Cautious Poke');
    expect(html).toContain('creature-stat-footer');
    expect(html).not.toContain('creature-stats-row');
    expect(html).not.toContain('data-creature-stat="def"');
    expect(html).toContain('aria-label="EVA: 3"');

    // Interactive Combat Status Dock below card (NEXT move & live HP bar)
    expect(html).toContain('creature-combat-dock');
    expect(html).toContain('dock-intent-row');
    expect(html).toContain('hp-bar creature-hp-bar dock-hp-bar');
    expect(html).toContain('6 / 6 HP');

    // Card footer & card number & PT badge
    expect(html).toContain('tcg-footer');
    expect(html).toContain('tcg-card-num');
    expect(html).toContain('mon1grs-01');
    expect(html).toContain('creature-footer-hp');
    expect(html).toContain('HP <b>6</b>');

    // Action cards in hand (Official 5:7 ratio, raster art & template)
    expect(html).toContain('tcg-card tcg-action is-attack tcg-template-attack');
    expect(html).toContain('tcg-art-raster action-raster');
    expect(html).toContain('/cards/actions/blade.jpg');
    expect(html).toContain('tcg-ap-bubble');
    expect(html).toContain('1 AP');
  });

  it('renders Pincer with full untruncated name in header and HP in PT badge', () => {
    let state = startAdventure('fighter', 'test-seed');
    const beetleCard: MonsterCard = {
      ...MONSTER_TEMPLATES['fighting_beetle'],
      id: 'monster_fighting_beetle_01',
    };
    state = {
      ...state,
      activeHook: {
        type: 'COMBAT',
        combat: {
          monsters: [
            {
              monster: beetleCard,
              hp: beetleCard.maxHp,
              block: 0,
              patternIndex: 0,
            },
          ],
          combatTurn: 1,
          playerBlock: 0,
          playerEvasionMod: 0,
          hand: [state.playerMasterDeck[0]],
          drawPile: [],
          discardPile: [],
          playerAp: 3,
          playerMaxAp: 3,
          combatLog: [],
        },
      },
    };
    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
    };

    const html = renderPlayArea(state, ui);
    // Full untruncated name in the header
    expect(html).toContain('<span class="tcg-name">Pincer</span>');
    expect(html).not.toContain('tcg-hp-pill');
    // Live HP bar in combat dock and creature stats (DEF, EVA) with icons
    expect(html).toContain('hp-bar creature-hp-bar');
    expect(html).toContain('6 / 6 HP');
    expect(html).toContain('creature-stat-footer');
    expect(html).not.toContain('creature-stats-row');
    expect(html).toContain('aria-label="DEF: 1"');
    expect(html).toContain('aria-label="EVA: 1"');
    expect(html).not.toContain('data-creature-stat="mdef"');
    expect(html).toContain('+1');
    expect(html).toContain('+2');
    // Live HP in the lower-right PT badge
    expect(html).toContain('HP <b>6</b>');
    // Raster art for Pincer
    expect(html).toContain('/cards/creatures/fighting_beetle.jpg');
  });

  it('renders damaged creature HP bar showing HP/MAXHP progress and block shield', () => {
    let state = startAdventure('fighter', 'test-seed');
    const ramramCard: MonsterCard = {
      ...MONSTER_TEMPLATES['ramram'],
      id: 'monster_ramram_01',
    };
    state = {
      ...state,
      activeHook: {
        type: 'COMBAT',
        combat: {
          monsters: [
            {
              monster: ramramCard,
              hp: 4,
              block: 3,
              patternIndex: 0,
            },
          ],
          combatTurn: 2,
          playerBlock: 0,
          playerEvasionMod: 0,
          hand: [state.playerMasterDeck[0]],
          drawPile: [],
          discardPile: [],
          playerAp: 3,
          playerMaxAp: 3,
          combatLog: [],
        },
      },
    };
    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
    };

    const html = renderPlayArea(state, ui);
    expect(html).toContain('Ramram');
    // HP bar showing 4 / 8 HP with block shield indicator
    expect(html).toContain('hp-bar creature-hp-bar');
    expect(html).toContain('4 / 8 HP (+3 &#128737;)');
    expect(html).toContain('style="width: 50%"');
    // Creature stats: DEF 0, EVA 1
    expect(html).toContain('creature-stat-footer');
    expect(html).not.toContain('creature-stats-row');
    expect(html).not.toContain('data-creature-stat="def"');
    expect(html).toContain('aria-label="EVA: 1"');
    // Floating rewards: +1 and +2
    expect(html).toContain('+1');
    expect(html).toContain('+2');
  });

  it('renders Card Info Modal with card-specific detail, flavor text, and live stat computation', () => {
    let state = startAdventure('fighter', 'test-seed');
    const actionCard = state.playerMasterDeck[0]; // Slash
    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
      inspectedCard: { kind: 'action', card: actionCard },
    };

    const html = renderPlayArea(state, ui);
    // Modal container
    expect(html).toContain('card-inspect-backdrop');
    expect(html).toContain('card-inspect-modal');
    expect(html).toContain('tcg-inspect-card');

    // Only useful card-specific effect and live computation details are shown.
    expect(html).toContain('Effect &amp; Live Calculation');
    expect(html).toContain('Normal Damage Formula');
    expect(html).toContain('3 Base DMG + ATK');
    expect(html).toContain('Hero Calculation: 3 + 4 = <b>7 DMG</b>');
    expect(html).not.toContain('This card is designed to be printed');
    expect(html).not.toContain('Tabletop Offline Rules &amp; Stat Scaling');

    // Flavor text printed on the card and in the lore quote
    expect(html).toContain('A direct martial strike that deals 3 plus the hero’s ATK as normal physical damage.');
    expect(html).toContain('data-action="close-inspect"');
    expect(html).toContain('data-action="close-inspect-backdrop"');
    expect(html).not.toContain('event.stopPropagation()');

    const finalSmash = state.newSkillsDeck.find((card) => card.id === 'final_smash')!;
    const finalSmashHtml = renderPlayArea(state, { ...ui, inspectedCard: { kind: 'action', card: finalSmash } });
    expect(finalSmashHtml).toContain('6 Base DMG + 2 × ATK');
    expect(finalSmashHtml).not.toContain('ATK / 1');

    // Inspecting a monster card
    const dogCard: MonsterCard = { ...MONSTER_TEMPLATES['wild_dog'], id: 'monster_wild_dog_01' };
    const uiMonster: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
      inspectedCard: { kind: 'monster', monster: dogCard, currentHp: 6 },
    };
    const monsterHtml = renderPlayArea(state, uiMonster);
    expect(monsterHtml).toContain('Scavenger (Monster Card Reference)');
    expect(monsterHtml).toContain('Encounter &amp; Spawn Profile');
    expect(monsterHtml).toContain('Grasslands 🌿, Forests 🌲');
    expect(monsterHtml).toContain('+2 Stat Points');
    expect(monsterHtml).toContain('+5 Gold');
    expect(monsterHtml).toContain('Cycling AI Attack Pattern');
    expect(monsterHtml).toContain('Savage Bite');
    expect(monsterHtml).toContain('Lunging Bite');
    expect(monsterHtml).toContain('3d6 QTE Combat Rules');
    expect(monsterHtml).toContain('Swift hunter of the plains grass');
    expect(monsterHtml).toContain('mon1grs-04');
  });

  it('renders adventure board cards as raster art MTG full-art land cards', () => {
    const state = startAdventure('fighter', 'test-seed');
    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
    };

    const html = renderPlayArea(state, ui);
    // Board cards have full TCG adventure architecture
    expect(html).toContain('tcg-card tcg-adventure');
    expect(html).toContain('tcg-art-window adv-art-window');
    expect(html).toContain('adventure-raster');
    expect(html).toContain('/cards/adventure/');

    // Top Land Header & Bottom Land Ribbon
    expect(html).toContain('adv-card-header');
    expect(html).toContain('tcg-land-ribbon');
    expect(html).toContain('tcg-land-type');
    expect(html).toContain('tcg-land-icon');

    // Player Token
    expect(html).toContain('player-token');
    expect(html).toContain('player token');
  });

  it('renders Card Info Modal for adventure cards with physical land preview and tabletop rules', () => {
    const state = startAdventure('fighter', 'test-seed');
    const allCards = [...state.adventureDeck, ...Object.values(state.board).map((n) => n.card)];
    const gVillage = allCards.find((c) => c.hasVillage && c.terrain === 'grasslands');
    const fVillage = allCards.find((c) => c.hasVillage && c.terrain === 'forest');
    expect(gVillage).toBeDefined();
    expect(fVillage).toBeDefined();

    const uiG: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
      inspectedCard: { kind: 'adventure', card: gVillage! },
    };

    const htmlG = renderPlayArea(state, uiG);
    expect(htmlG).toContain('Grassland Village (Land Card Reference)');
    expect(htmlG).toContain('tcg-card tcg-adventure tcg-template-grassland tcg-inspect-card');
    expect(htmlG).toContain('/cards/adventure/grassland_village.jpg');
    expect(htmlG).toContain('Village Haven:');
    expect(htmlG).toContain('Tabletop Adventure Board Architecture');

    const uiF: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
      inspectedCard: { kind: 'adventure', card: fVillage! },
    };

    const htmlF = renderPlayArea(state, uiF);
    expect(htmlF).toContain('Forest Village (Land Card Reference)');
    expect(htmlF).toContain('tcg-card tcg-adventure tcg-template-forest tcg-inspect-card');
    expect(htmlF).toContain('/cards/adventure/forest_village.jpg');
    expect(htmlF).toContain('Village Haven:');
  });

  it('renders Ramram with grasslands-only icon and Rattler with forest-only icon', () => {
    let state = startAdventure('fighter', 'test-seed');
    const ramramCard: MonsterCard = { ...MONSTER_TEMPLATES['ramram'], id: 'monster_ramram_01' };
    state = {
      ...state,
      activeHook: {
        type: 'COMBAT',
        combat: {
          monsters: [{ monster: ramramCard, hp: 6, block: 0, patternIndex: 0 }],
          combatTurn: 1,
          playerBlock: 0,
          playerEvasionMod: 0,
          hand: [state.playerMasterDeck[0]],
          drawPile: [],
          discardPile: [],
          playerAp: 3,
          playerMaxAp: 3,
          combatLog: [],
        },
      },
    };
    const ui: UiState = { selectedClass: 'fighter', showDeck: false, villageTab: 'buy', targetIndex: 0 };
    const ramramHtml = renderPlayArea(state, ui);
    expect(ramramHtml).toContain('Ramram');
    expect(ramramHtml).toContain('/cards/creatures/ramram.jpg');
    expect(ramramHtml).toContain('tcg-spawn-badge grass');
    expect(ramramHtml).not.toContain('tcg-spawn-badge forest'); // Grasslands only

    // Now test Rattler
    const rattlerCard: MonsterCard = { ...MONSTER_TEMPLATES['rattler'], id: 'monster_rattler_01' };
    state = {
      ...state,
      activeHook: {
        type: 'COMBAT',
        combat: {
          monsters: [{ monster: rattlerCard, hp: 6, block: 0, patternIndex: 0 }],
          combatTurn: 1,
          playerBlock: 0,
          playerEvasionMod: 0,
          hand: [state.playerMasterDeck[0]],
          drawPile: [],
          discardPile: [],
          playerAp: 3,
          playerMaxAp: 3,
          combatLog: [],
        },
      },
    };
    const rattlerHtml = renderPlayArea(state, ui);
    expect(rattlerHtml).toContain('Rattler');
    expect(rattlerHtml).toContain('/cards/creatures/rattler.jpg');
    expect(rattlerHtml).toContain('tcg-spawn-badge forest');
    expect(rattlerHtml).not.toContain('tcg-spawn-badge grass'); // Forest only!
  });

  it('renders adventure board cards with centered headers, upper-right level badges, and class tokens', () => {
    const fighterState = startAdventure('fighter', 'board-test-seed');
    const ui: UiState = { selectedClass: 'fighter', showDeck: false, villageTab: 'buy', targetIndex: 0 };
    const fighterHtml = renderPlayArea(fighterState, ui);

    // Board container and world layer
    expect(fighterHtml).toContain('board-world');
    expect(fighterHtml).toContain('adv-card tcg-card tcg-adventure');

    // Start tile at Row 0 (dx:0, dy:-1)
    expect(fighterHtml).toContain('style="--dx:0;--dy:-1"');
    expect(fighterHtml).toContain('Start Tile');
    expect(fighterHtml).toContain('tcg-template-start');

    // Fighter hero token instead of a generic yellow dot
    expect(fighterHtml).toContain('player-token fighter');
    expect(fighterHtml).toContain('fighter-base');

    // Minimized cards do not clutter with "Choose", "Ahead", or "START"
    expect(fighterHtml).not.toContain('<span class="adv-status available">Choose</span>');
    expect(fighterHtml).not.toContain('<span class="adv-status lookahead">Ahead</span>');
    expect(fighterHtml).not.toContain('<span class="marker start">START</span>');

    // Centered card headers and upper-right level badges
    expect(fighterHtml).toContain('adv-card-header');
    expect(fighterHtml).toContain('adv-name');
    expect(fighterHtml).toContain('adv-card-level-badge');

    // Wizard player token test
    const wizardState = startAdventure('wizard', 'board-test-seed');
    const wizardHtml = renderPlayArea(wizardState, ui);
    expect(wizardHtml).toContain('player-token wizard');
    expect(wizardHtml).toContain('wizard-base');
  });

  it('renders right sidebar with adventure, monster, and player deck and discard piles', () => {
    const state = startAdventure('fighter', 'sidebar-test-seed');
    const ui: UiState = { selectedClass: 'fighter', showDeck: false, villageTab: 'buy', targetIndex: 0 };
    const html = renderPlayArea(state, ui);

    // Right sidebar presence
    expect(html).toContain('play-sidebar-right');
    expect(html).toContain('deck-piles-panel');
    expect(html).toContain('Decks &amp; Discards');

    // 1. Adventure Deck & Discard
    expect(html).toContain('data-pile="adventure_deck"');
    expect(html).toContain('data-pile="adventure_discard"');

    // 2. Monster Deck & Discard
    expect(html).toContain('data-pile="monster_deck"');
    expect(html).toContain('data-pile="monster_discard"');

    // 3. Player Combat Deck & Discard
    expect(html).toContain('data-pile="player_deck"');
    expect(html).toContain('data-pile="player_discard"');
  });

  it('configures the reusable deck panel with only the requested pile groups', () => {
    const state = startAdventure('fighter', 'deck-panel-config-seed');
    const html = deckPilesPanelHtml(state, {
      visibleGroups: ['player'],
      heading: 'Action Deck',
      showFooter: false,
      groupLabels: { player: 'Action Cards' },
    });

    expect(html).toContain('Action Deck');
    expect(html).toContain('Action Cards');
    expect(html).toContain('data-pile-default="player_deck"');
    expect(html).toContain('data-pile="player_deck"');
    expect(html).toContain('data-pile="player_discard"');
    expect(html).not.toContain('data-pile="adventure_deck"');
    expect(html).not.toContain('piles-footer-note');
  });

  it('renders adventure deck modal with unique cards and multiplier badges', () => {
    const state = startAdventure('fighter', 'pile-test-seed');
    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
      inspectedPile: 'adventure_deck',
    };
    const html = renderPlayArea(state, ui);

    expect(html).toContain('modal pile-modal');
    expect(html).toContain('Adventure Deck');
    expect(html).toContain('pile-modal-grid');
    expect(html).toContain('pile-multiplier-badge');
    expect(html).toContain('&times;');
    expect(html).toContain('tcg-adventure');

    // Extract all card codes rendered in the pile modal
    const matches = Array.from(html.matchAll(/data-adventure-card-number="([^"]+)"/g)).map((m) => m[1]);
    expect(matches.length).toBeGreaterThan(0);
    // Verify each card code in order matches the expected index progression in ADVENTURE_CARD_ORDER
    const expectedOrder = [
      'advgrs-00',
      'advgrs-01',
      'advgrs-03',
      'advgrs-04',
      'advfrs-00',
      'advfrs-01',
      'advfrs-03',
      'advfrs-04',
      'advsmp-00',
      'advsmp-01',
      'advsmp-03',
      'advsmp-04',
    ];
    let prevIndex = -1;
    for (const code of matches) {
      const idx = expectedOrder.indexOf(code);
      expect(idx).toBeGreaterThanOrEqual(prevIndex);
      prevIndex = idx;
    }
  });

  it('renders monster deck modal with unique monsters and multiplier badges', () => {
    const state = startAdventure('fighter', 'pile-test-seed');
    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
      inspectedPile: 'monster_deck',
    };
    const html = renderPlayArea(state, ui);

    expect(html).toContain('modal pile-modal');
    expect(html).toContain('Monster Deck');
    expect(html).toContain('pile-modal-grid');
    expect(html).toContain('pile-multiplier-badge');
    expect(html).toContain('Goblin');
    expect(html).toContain('Blob');
  });

  it('renders player combat deck modal with unique action cards and multipliers (8x Slash, 2x Defend)', () => {
    const state = startAdventure('fighter', 'pile-test-seed');
    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
      inspectedPile: 'player_deck',
    };
    const html = renderPlayArea(state, ui);

    expect(html).toContain('modal pile-modal');
    expect(html).toContain('Player Combat Master Deck');
    expect(html).toContain('pile-multiplier-badge');
    // Fighter starter deck has 8x Slash and 2x Defend
    expect(html).toContain('&times;8');
    expect(html).toContain('&times;2');
    expect(html).toContain('Slash');
    expect(html).toContain('Defend');
    // Reference cards should be readable, even though they cannot trigger combat actions.
    expect(html).not.toMatch(/data-card-id="(?:melee_atk|shield_def)"[^>]*disabled/);
    expect(html).not.toContain('data-action="play-card"');
  });

  it('renders empty pile message when inspecting an empty discard pile', () => {
    const state = startAdventure('fighter', 'pile-test-seed');
    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
      inspectedPile: 'adventure_discard', // starts with 0 discard cards
    };
    const html = renderPlayArea(state, ui);

    expect(html).toContain('modal pile-modal');
    expect(html).toContain('Adventure Discard Pile');
    expect(html).toContain('empty-pile-box');
    expect(html).toContain('This pile is currently empty (0 cards).');
  });

  it('embeds boardKey and cardId on all board cards including current tile and lookahead 3-tile row', () => {
    const state = startAdventure('fighter', 'inspect-test-seed');
    const ui: UiState = { selectedClass: 'fighter', showDeck: false, villageTab: 'buy', targetIndex: 0 };
    const html = renderPlayArea(state, ui);

    // Current tile (Row 0, col 0)
    expect(html).toContain('data-board-key="0.0,0"');
    expect(html).toContain('data-inspect-kind="adventure"');

    // Available tiles (Row 1, cols -0.5 and 0.5)
    expect(html).toContain('data-board-key="-0.5,1"');
    expect(html).toContain('data-board-key="0.5,1"');

    // Lookahead tiles (Row 2, cols -1.0, 0.0, 1.0)
    expect(html).toContain('data-board-key="-1.0,2"');
    expect(html).toContain('data-board-key="0.0,2"');
    expect(html).toContain('data-board-key="1.0,2"');
  });

  it('renders tabletop 3d6 combat dice modal and QTE bar when pendingDiceRolls is present', () => {
    let state = startAdventure('fighter', 'test-seed');
    const goblinCard = { ...MONSTER_TEMPLATES.goblin, id: 'test_goblin', instanceId: 'test_goblin' };

    const roll = {
      attackerName: 'Hero',
      targetName: 'Goblin',
      actionName: 'Slash',
      die1: 4,
      die2: 3,
      die3: 3,
      total: 10,
      netAcc: 1,
      minHitRoll: 9,
      maxHitRoll: 12,
      isHit: true,
      damageDealt: 4,
      damageBlocked: 0,
    };

    state = {
      ...state,
      activeHook: {
        type: 'COMBAT',
        combat: {
          monsters: [{ monster: goblinCard, hp: 8, block: 0, patternIndex: 0 }],
          combatTurn: 1,
          playerBlock: 0,
          playerEvasionMod: 0,
          hand: [state.playerMasterDeck[0]],
          drawPile: [],
          discardPile: [],
          playerAp: 3,
          playerMaxAp: 3,
          combatLog: [],
          lastAttackRoll: roll,
        },
      },
    };

    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
      pendingDiceRolls: [{ roll, settled: true }],
    };

    const html = renderPlayArea(state, ui);
    expect(html).toContain('dice-roll-modal');
    expect(html).toContain('Hero');
    expect(html).toContain('Goblin');
    expect(html).toContain('dice-die" data-final="4">🎲 4');
    expect(html).toContain('dice-die" data-final="3">🎲 3');
    expect(html).toContain('dice-total');
    expect(html).toContain('10');
    expect(html).toContain('Hit Range:');
    expect(html).toContain('9–12');
    expect(html).toContain('HIT! (4 DMG)');
    expect(html).toContain('Apply');
    expect(html).toContain('TARGET (Hit: 7–14 · 81.5%)');
    expect(html).toContain('qte-bar-container');
    expect(html).toContain('/icons/qte-token.png');
  });

  it('renders card confirmation modal for attack card (Slash on Goblin) with source/target cards, stats, probability and confirm button', () => {
    let state = startAdventure('fighter', 'test-seed');
    const goblinCard = { ...MONSTER_TEMPLATES.goblin, id: 'test_goblin', instanceId: 'test_goblin' };
    const meleeCard = state.playerMasterDeck[0]; // Slash

    state = {
      ...state,
      activeHook: {
        type: 'COMBAT',
        combat: {
          monsters: [{ monster: goblinCard, hp: 8, block: 0, patternIndex: 0 }],
          combatTurn: 1,
          playerBlock: 0,
          playerEvasionMod: 0,
          hand: [meleeCard],
          drawPile: [],
          discardPile: [],
          playerAp: 3,
          playerMaxAp: 3,
          combatLog: [],
        },
      },
    };

    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
      pendingCardPlay: {
        cardInstanceId: meleeCard.instanceId,
        targetIndex: 0,
      },
    };

    const html = renderPlayArea(state, ui);

    // Modal structure
    expect(html).toContain('combat-confirm-modal');
    expect(html).toContain('confirm-modal-body');
    expect(html).toContain('confirm-visual-col');
    expect(html).toContain('confirm-details-col');
    expect(html).toContain('Use <span>Slash</span> on <span>Goblin</span>');

    // Source Card and Target Card comparison
    expect(html).toContain('Source Action (1 AP)');
    expect(html).toContain('Target Creature');
    expect(html).toContain('Slash');
    expect(html).toContain('Goblin');

    // In case of attack on creature: show ACC and EVA stats and bonuses
    expect(html).toContain('Hero ACC');
    expect(html).toContain('Target EVA');
    expect(html).toContain('Net ACC');
    expect(html).toContain('Hit Range');
    // Fighter has 3 default ACC vs 3 Goblin EVA = +0 Net ACC -> Tier 4 Hit Range 7–14
    expect(html).toContain('🎯 <b>7–14</b>');
    expect(html).toContain('qte-bar-container');

    // Show probability to hit
    expect(html).toContain('Hit Probability');
    expect(html).toContain('81.5%');
    expect(html).toContain('176 of 216 combinations');
    expect(html).toContain('Diabolic Rolls');
    expect(html).toContain('Sure Hit Rolls');

    // Confirm button and Cancel button below
    expect(html).toContain('data-action="confirm-play-card"');
    expect(html).toContain('Confirm Use (1 AP)');
    expect(html).toContain('data-action="cancel-play-card"');
    expect(html).toContain('Cancel');
  });

  it('renders card confirmation modal for Defend with Block but no EVA bonus', () => {
    let state = startAdventure('fighter', 'test-seed');
    const goblinCard = { ...MONSTER_TEMPLATES.goblin, id: 'test_goblin', instanceId: 'test_goblin' };
    const shieldCard = state.playerMasterDeck.find((c) => c.cardType === 'defense')!;

    state = {
      ...state,
      activeHook: {
        type: 'COMBAT',
        combat: {
          monsters: [{ monster: goblinCard, hp: 8, block: 0, patternIndex: 0 }],
          combatTurn: 1,
          playerBlock: 0,
          playerEvasionMod: 0,
          hand: [shieldCard],
          drawPile: [],
          discardPile: [],
          playerAp: 3,
          playerMaxAp: 3,
          combatLog: [],
        },
      },
    };

    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
      pendingCardPlay: {
        cardInstanceId: shieldCard.instanceId,
        targetIndex: 0,
      },
    };

    const html = renderPlayArea(state, ui);

    expect(html).toContain('combat-confirm-modal');
    expect(html).toContain('Use <span>Defend</span> on <span>Fighter (Hero)</span>');
    expect(html).toContain('Source Action (1 AP)');
    expect(html).toContain('Target (Self)');
    expect(html).toContain('/cards/adventurers/fighter.jpg');
    expect(html).toContain('hero-sidebar-portrait-frame');
    expect(html).toContain('Block Gained');
    expect(html).not.toContain('Combat EVA');
    expect(html).toContain('data-action="confirm-play-card"');
    expect(html).toContain('Confirm Use (1 AP)');
  });

  it('renders visual mini-card choices when Battlecry selects cards to discard', () => {
    let state = startAdventure('fighter', 'battlecry-selection-seed');
    const goblinCard = { ...MONSTER_TEMPLATES.goblin, id: 'test_goblin', instanceId: 'test_goblin' };
    const battlecry = createCombatCardInstance('battlecry', 'test');
    const melee = createCombatCardInstance('melee_atk', 'discard');
    const shield = createCombatCardInstance('shield_def', 'discard');

    state = {
      ...state,
      activeHook: {
        type: 'COMBAT',
        combat: {
          monsters: [{ monster: goblinCard, hp: 8, block: 0, patternIndex: 0 }],
          combatTurn: 1,
          playerBlock: 0,
          playerEvasionMod: 0,
          hand: [battlecry, melee, shield],
          drawPile: [],
          discardPile: [],
          playerAp: 3,
          playerMaxAp: 3,
          combatLog: [],
        },
      },
    };

    const html = renderPlayArea(state, {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
      pendingCardPlay: { cardInstanceId: battlecry.instanceId, targetIndex: 0 },
    });

    expect(html).toContain('Choose exactly 2 cards to discard');
    expect(html).toContain('class="discard-choice-card');
    expect(html).toContain('class="discard-choice-art"');
    expect(html).toContain('/cards/actions/blade.jpg');
    expect(html).toContain('/cards/actions/shield.jpg');
    expect(html).toContain('Slash');
    expect(html).toContain('Defend');
    const discardChoices = html.match(/<div class="combat-discard-choice-list">([\s\S]*?)<\/div>\s*<div class="discard-choice-count">/)?.[1] ?? '';
    expect(discardChoices).not.toContain(`data-id="${battlecry.instanceId}"`);
  });

  it('renders Class Select screen with Primary/Secondary badges, passives, stat icons, and 6 stats including CHA', () => {
    const html = renderClassSelect({ selectedClass: 'fighter', showDeck: false, villageTab: 'buy', targetIndex: 0 });
    expect(html).toContain('PRIMARY: STR (+2)');
    expect(html).toContain('SECONDARY: VIT, DEX (+1)');
    expect(html).toContain('[Berzerk]');
    expect(html).toContain('stat-select-icon');
    expect(html).toContain('CHA');
    expect(html).toContain('16 Max HP'); // Fighter
    expect(html).toContain('/cards/adventurers/fighter.jpg');
    expect(html).toContain('/cards/adventurers/wizard.jpg');
    expect(html).toContain('/cards/adventurers/rogue.jpg');

    // Wizard active class shows Wizard info in detail panel
    const htmlWiz = renderClassSelect({ selectedClass: 'wizard', showDeck: false, villageTab: 'buy', targetIndex: 0 });
    expect(htmlWiz).toContain('PRIMARY: INT (+2)');
    expect(htmlWiz).toContain('SECONDARY: DEX, CHA (+1)');
    expect(htmlWiz).toContain('[Conserve]');
    expect(htmlWiz).toContain('14 Max HP');

    // Rogue active class shows Rogue info in detail panel
    const htmlRog = renderClassSelect({ selectedClass: 'rogue', showDeck: false, villageTab: 'buy', targetIndex: 0 });
    expect(htmlRog).toContain('PRIMARY: AGI (+2)');
    expect(htmlRog).toContain('SECONDARY: DEX, STR (+1)');
    expect(htmlRog).toContain('[Steal]');
    expect(htmlRog).toContain('14 Max HP');
  });

  it('renders interactive 3-card class selection carousel with instructions and sidebar embark button', () => {
    expect(CLASS_CAROUSEL_ORDER).toEqual(['fighter', 'wizard', 'rogue']);
    const html = renderClassSelect({ selectedClass: 'fighter', showDeck: false, villageTab: 'buy', targetIndex: 0 });
    expect(html).toContain('class="class-carousel"');
    expect(html).toContain('class="class-carousel-track"');
    expect(html).toContain('class="class-select-instructions"');
    expect(html).toContain('Move left or right with A or D');
    expect(html).toContain('class="class-detail-col"');
    expect(html).toContain('data-action="embark"');

    // Fighter is active/center, Rogue is prev, Wizard is next
    expect(html).toContain('class-card is-center selected" data-action="select-class" data-id="fighter"');
    expect(html).toContain('class-card is-prev" data-action="select-class" data-id="rogue"');
    expect(html).toContain('class-card is-next" data-action="select-class" data-id="wizard"');
  });

  it('updateClassCarouselDom dynamically updates card classes without destroying DOM elements', () => {
    const makeCardMock = (id: string, initialClassList: string[]) => {
      const classList = new Set<string>(initialClassList);
      const attrs: Record<string, string> = { 'data-id': id };
      return {
        classList: {
          contains: (c: string) => classList.has(c),
          add: (...cs: string[]) => cs.forEach((c) => classList.add(c)),
          remove: (...cs: string[]) => cs.forEach((c) => classList.delete(c)),
        },
        setAttribute: (name: string, val: string) => { attrs[name] = val; },
        getAttribute: (name: string) => attrs[name] ?? null,
        tabIndex: 0,
      };
    };

    const fighterCard = makeCardMock('fighter', ['class-card', 'is-center', 'selected']);
    const wizardCard = makeCardMock('wizard', ['class-card', 'is-next']);
    const rogueCard = makeCardMock('rogue', ['class-card', 'is-prev']);

    const track = {
      querySelector: (sel: string) => {
        if (sel === '.class-card[data-id="fighter"]') return fighterCard;
        if (sel === '.class-card[data-id="wizard"]') return wizardCard;
        if (sel === '.class-card[data-id="rogue"]') return rogueCard;
        return null;
      },
    };

    const prevBtn = { attrs: {} as Record<string, string>, setAttribute(k: string, v: string) { this.attrs[k] = v; } };
    const nextBtn = { attrs: {} as Record<string, string>, setAttribute(k: string, v: string) { this.attrs[k] = v; } };

    const container = {
      querySelector: (sel: string) => {
        if (sel === '.class-carousel-track') return track;
        if (sel === '[data-action="prev-class"]') return prevBtn;
        if (sel === '[data-action="next-class"]') return nextBtn;
        return null;
      },
    } as unknown as HTMLElement;

    // Initial state: Fighter center
    expect(fighterCard.classList.contains('is-center')).toBe(true);
    expect(rogueCard.classList.contains('is-prev')).toBe(true);
    expect(wizardCard.classList.contains('is-next')).toBe(true);

    // Switch to Wizard: Wizard is center, Fighter is prev, Rogue is next
    const updated1 = updateClassCarouselDom(container, 'wizard');
    expect(updated1).toBe(true);
    expect(wizardCard.classList.contains('is-center')).toBe(true);
    expect(fighterCard.classList.contains('is-prev')).toBe(true);
    expect(rogueCard.classList.contains('is-next')).toBe(true);
    expect(prevBtn.attrs.title).toContain('Fighter');
    expect(nextBtn.attrs.title).toContain('Rogue');

    // Switch to Rogue: Rogue is center, Wizard is prev, Fighter is next
    const updated2 = updateClassCarouselDom(container, 'rogue');
    expect(updated2).toBe(true);
    expect(rogueCard.classList.contains('is-center')).toBe(true);
    expect(wizardCard.classList.contains('is-prev')).toBe(true);
    expect(fighterCard.classList.contains('is-next')).toBe(true);
    expect(prevBtn.attrs.title).toContain('Wizard');
    expect(nextBtn.attrs.title).toContain('Fighter');
  });

  it('renders Welcome Preparation Dialog on game start with 4 SP and stat upgrade widget', () => {
    const state = startAdventure('fighter', 'test-welcome');
    expect(state.welcomePreparing).toBe(true);
    expect(state.playerResources?.statPoints).toBe(10);

    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
    };

    const html = renderPlayArea(state, ui);
    expect(html).toContain('welcome-prepare-modal');
    expect(html).toContain('Greetings, Fighter!');
    expect(html).toContain('Prepare for Your Journey');
    expect(html).toContain('Convert Stat Points into Base Stats');
    expect(html).toContain('10 SP');
    expect(html).toContain('cost 10 SP');
    expect(html).toContain('Upgrade (10 SP)');
    expect(html).toContain('data-action="welcome-upgrade"');
    expect(html).toContain('data-action="dismiss-welcome-dialog"');
    expect(html).toContain('Begin Journey');
    expect(html).toContain('DISC');
    expect(html).toContain('-5%'); // 1 CHA = -5%
    expect(html).toContain('ATK');
    expect(html).toContain('DEF');
    expect(html).toContain('MATK');
    expect(html).toContain('MDEF');
    expect(html).toContain('20 Gold');
    expect(html).toContain('/icons/cha.png');
    expect(html).toContain('/icons/atk.png');
    expect(html).toContain('/icons/def.png');
  });

  it('renders stat inspection in the shared top inspection layer during preparation', () => {
    const state = startAdventure('fighter', 'prepare-stat-inspection');
    const html = renderPlayArea(state, {
      selectedClass: 'fighter', showDeck: false, villageTab: 'buy', targetIndex: 0, inspectedStat: 'str',
    });
    expect(html).toContain('welcome-prepare-backdrop');
    expect(html).toContain('inspection-backdrop stat-inspect-backdrop');
    expect(html.indexOf('welcome-prepare-backdrop')).toBeLessThan(html.indexOf('inspection-backdrop stat-inspect-backdrop'));
  });

  it('renders game logo in the header and places Gold and SP in the Character sidebar above health bar', () => {
    let state = startAdventure('fighter', 'test-header-brand-and-resources');
    state = { ...state, welcomePreparing: false };
    const html = renderPlayArea(state, {
      selectedClass: 'fighter', showDeck: false, villageTab: 'buy', targetIndex: 0,
    });

    // 1. Logo in game header
    expect(html).toContain('hud-logo-col');
    expect(html).toContain('hud-game-logo');
    expect(html).toContain('paths-we-choose-logo.png');

    // 2. Header does not have Gold and SP chips
    const headerHtml = html.split('</header>')[0];
    expect(headerHtml).not.toContain('hud-res-chip');
    expect(headerHtml).not.toContain('20 Gold');
    expect(headerHtml).not.toContain('10 SP');

    // 3. Gold and SP appear in Character sidebar above health bar
    expect(html).toContain('hero-sidebar-resources');
    expect(html).toContain('hero-res-chip gold');
    expect(html).toContain('hero-res-chip sp');
    expect(html).toContain('20 Gold');
    expect(html).toContain('10 SP');
    const resourcesIndex = html.indexOf('hero-sidebar-resources');
    const hpTrackIndex = html.indexOf('hero-sidebar-hp-track');
    expect(resourcesIndex).toBeLessThan(hpTrackIndex);
  });

  it('renders item inspection modal with standard 5:7 physical TCG card', () => {
    const state = startAdventure('fighter', 'test-inspect-item');
    const sword = SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl1_iron_sword')!;
    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
      inspectedCard: { kind: 'item', item: { ...sword, instanceId: 'test_sword' } },
    };

    const html = renderPlayArea(state, ui);
    expect(html).toContain('card-inspect-modal');
    expect(html).toContain('Iron Sword');
    expect(html).toContain('tcg-template-item');
    expect(html).toContain('/cards/items/iron_sword.jpg');
    expect(html).toContain('Equipment — Weapon');
    expect(html).toContain('+1 ATK');
    expect(html).toContain('Hero ATK = &lfloor;STR / 2&rfloor; + Weapon ATK');
  });

  it('village rest is disabled at full health and describes the one-Gold, two-HP ticks', () => {
    let state = startAdventure('fighter', 'test-rest-disabled');
    state = {
      ...state,
      welcomePreparing: false,
      statusEffects: [],
      activeHook: {
        type: 'VILLAGE',
        village: {
          coord: { col: 0, row: 1 },
          turn: 1,
          subView: 'main',
          trainOptions: [],
          shopStock: [],
          actionTaken: false,
        },
      },
    };
    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
    };

    const html = renderPlayArea(state, ui);
    expect(html).toContain('data-action="village-rest" disabled');
    expect(html).toContain('Already at full HP.');
    expect(html).toContain('Each tick restores up to 2 HP and costs 1 Gold');
  });

  it('village rest remains disabled at full health even with negative ailments', () => {
    let state = startAdventure('fighter', 'test-rest-ailments');
    state = {
      ...state,
      welcomePreparing: false,
      statusEffects: ['poison'],
      playerResources: { ...state.playerResources!, gold: 20 },
      activeHook: {
        type: 'VILLAGE',
        village: {
          coord: { col: 0, row: 1 },
          turn: 1,
          subView: 'main',
          trainOptions: [],
          shopStock: [],
          actionTaken: false,
        },
      },
    };
    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
    };

    const html = renderPlayArea(state, ui);
    expect(html).toContain('data-action="village-rest"');
    expect(html).toContain('data-action="village-rest" disabled');
    expect(html).toContain('Already at full HP.');
  });

  it('action cards have dedicated unique artwork and do not all reuse blade or shield art', () => {
    // Fighter cards
    expect(getActionRasterArtPath('melee_atk', 'attack')).toBe('/cards/actions/blade.jpg');
    expect(getActionRasterArtPath('shield_def', 'defense')).toBe('/cards/actions/shield.jpg');
    expect(getActionRasterArtPath('heavy_cleave', 'attack')).toBe('/cards/actions/heavy_cleave.jpg');
    expect(getActionRasterArtPath('heavy_cleave', 'attack')).not.toBe('/cards/actions/blade.jpg');
    expect(getActionRasterArtPath('iron_parry', 'defense')).toBe('/cards/actions/iron_parry.jpg');
    expect(getActionRasterArtPath('iron_parry', 'defense')).not.toBe('/cards/actions/shield.jpg');
    expect(getActionRasterArtPath('battle_focus', 'defense')).toBe('/cards/actions/battle_focus.jpg');
    expect(getActionRasterArtPath('battle_focus', 'defense')).not.toBe('/cards/actions/shield.jpg');
    expect(getActionRasterArtPath('whirlwind_plus', 'attack')).toBe('/cards/actions/whirlwind.jpg');
    expect(getActionRasterArtPath('battlecry_plus', 'skill')).toBe('/cards/actions/battlecry.jpg');
    expect(getActionRasterArtPath('battle_flag', 'enchantment')).toBe('/cards/actions/battleflag.jpg');
    expect(getActionRasterArtPath('adrenalin', 'skill')).toBe('/cards/actions/adrenalin.jpg');
    expect(getActionRasterArtPath('final_smash', 'attack')).toBe('/cards/actions/final_smash.jpg');

    // Wizard cards
    expect(getActionRasterArtPath('fireball_atk', 'attack')).toBe('/cards/actions/fireball.jpg');
    expect(getActionRasterArtPath('force_field_def', 'defense')).toBe('/cards/actions/force_field.jpg');
    expect(getActionRasterArtPath('arcane_blast', 'attack')).toBe('/cards/actions/arcane_blast.jpg');
    expect(getActionRasterArtPath('frost_nova', 'defense')).toBe('/cards/actions/frost_nova.jpg');
    expect(getActionRasterArtPath('blink_ward', 'defense')).toBe('/cards/actions/blink_ward.jpg');
  });

  it('renders welcome start screen with height-maximized background and card container', () => {
    const html = renderWelcome();
    expect(html).toContain('class="screen welcome"');
    expect(html).toContain('class="welcome-card-showcase"');
    expect(html).toContain('class="welcome-floating-logo-wrap"');
    expect(html).toContain('class="welcome-game-logo"');
    expect(html).toContain('class="welcome-bottom-tray"');
    expect(html).toContain('alt="The Paths We Choose"');
    expect(html).toContain('data-action="start"');
    expect(html).toContain('Start Adventure');
  });

  it('unifies full-art TCG card template across action and creature cards with name on top-left and art spacer', () => {
    let state = startAdventure('fighter', 'test-seed');
    const goblinCard: MonsterCard = {
      ...MONSTER_TEMPLATES['goblin'],
      id: 'monster_goblin_01',
    };
    state = {
      ...state,
      activeHook: {
        type: 'COMBAT',
        combat: {
          monsters: [
            {
              monster: goblinCard,
              hp: goblinCard.maxHp,
              block: 0,
              patternIndex: 0,
            },
          ],
          combatTurn: 1,
          playerBlock: 0,
          playerEvasionMod: 0,
          hand: [state.playerMasterDeck[0]],
          drawPile: [],
          discardPile: [],
          playerAp: 3,
          playerMaxAp: 3,
          combatLog: [],
        },
      },
    };
    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
    };

    const html = renderPlayArea(state, ui);

    // 1. Creature card has full-bleed art window, meta stack in header, name in title row, art spacer, and no middle ribbon
    expect(html).toContain('tcg-card tcg-creature');
    expect(html).toContain('tcg-art-spacer');
    expect(html).toContain('tcg-header-meta');
    expect(html).toContain('<span class="tcg-name">Goblin</span>');
    expect(html).toContain('creature-header-top');

    // 2. Action card has full-bleed art window, meta stack with AP bubble, and art spacer
    expect(html).toContain('tcg-card tcg-action');
    expect(html).toContain('<span class="tcg-name action-name">Slash</span>');
    expect(html).toContain('<span class="tcg-ap-bubble">1 AP</span>');
  });

  it('renders permanent backpack and unequip actions, and cleans up stat rows', () => {
    let state = startAdventure('fighter', 'test-seed');
    const sword = { ...SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl1_iron_sword')!, instanceId: 'test_sword' };
    const potion = { ...SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl1_health_potion')!, instanceId: 'test_potion' };
    state = {
      ...state,
      equippedGear: { weapon: sword, armor: null, accessory: null },
      backpack: [potion],
    };

    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
    };

    const html = renderPlayArea(state, ui);

    // 1. Stat panel does NOT contain 'next: 4 SP' or 'next: 9 SP' in stat rows
    expect(html).not.toContain('next: 4 SP');
    expect(html).not.toContain('next: 9 SP');
    expect(html).toContain('inspectable-stat');
    expect(html).toContain('data-inspect-stat="str"');

    // 2. Permanent backpack section is displayed with items
    expect(html).toContain('backpack-box');
    expect(html).toContain('Backpack (1)');
    expect(html).toContain('Health Potion');
    expect(html).toContain('data-action="use-item"');

    // 3. Equipped slot has an unequip button
    expect(html).toContain('unequip-btn');
    expect(html).toContain('data-action="unequip"');
  });

  it('renders full Stat Info Modal with computation breakdown and upgrade formula when a stat is inspected', () => {
    const state = startAdventure('fighter', 'test-seed');
    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
      inspectedStat: 'str',
    };

    const html = renderPlayArea(state, ui);

    // Stat inspect modal is opened
    expect(html).toContain('inspection-backdrop stat-inspect-backdrop');
    expect(html).toContain('stat-inspect-modal');
    expect(html).toContain('Strength (STR) Attribute Profile');
    expect(html).toContain('Effective Stat Value Breakdown');
    expect(html).toContain('Effective STR = Innate (1) + Base (1) + Class Bonus (+2)');
    expect(html).toContain('Martial Scaling:');
    expect(html).toContain('Physical Attack (ATK):');
    expect(html).toContain('Physical Defense (DEF):');
    expect(html).toContain('currentBase &times; 10');
    expect(html).toContain('10 Stat Points');
  });

  it('renders creature cards without duplicate Creature text, with visible inscribed rewards, and docked info box', () => {
    const state = startAdventure('fighter', 'test-seed');
    const ramramCard: MonsterCard = {
      ...MONSTER_TEMPLATES['ramram'],
      id: 'monster_ramram_01',
    };

    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
      inspectedCard: {
        kind: 'monster',
        monster: ramramCard,
      },
    };

    const html = renderPlayArea(state, ui);

    // 1. Subtype stands alone; the obvious Creature label is omitted.
    expect(html).not.toContain('<span class="tcg-type-main">CREATURE</span>');
    expect(html).toContain('<span class="tcg-type-sub">Beast</span>');
    expect(html).not.toContain('<span class="tcg-type-sub">Creature — Beast</span>');
    expect(html).toContain('/icons/new-paths-rare.svg');

    // 2. Inscribed rewards contain SP and Gold badges with numeric values
    expect(html).toContain('tcg-art-rewards');
    expect(html).toContain('+2'); // Gold reward
    expect(html).toContain('+1'); // SP reward
    expect(html).toContain('tcg-art-reward-badge gold');
    expect(html).toContain('tcg-art-reward-badge sp');

    // 3. Textbox is marked with tcg-creature-textbox to dock to the bottom
    expect(html).toContain('tcg-textbox tcg-creature-textbox');
  });

  it('renders minified creature cards in monster pile modal without pattern, reward badges, or stats rows, with footer subtype and spawn icons', () => {
    const state = startAdventure('fighter', 'test-seed');
    const html = pileModal('monster_deck', state);

    // 1. Minified creature cards must have header with name and level
    expect(html).toContain('tcg-mini-creature-header');
    expect(html).toContain('Lvl 1');
    expect(html).toContain('Lvl 2');
    expect(html).toContain('Rattler');
    expect(html).toContain('Goblin');

    // 2. Minified creature cards must have footer with subtype and spawn terrain icons
    expect(html).toContain('tcg-mini-creature-footer');
    expect(html).toContain('tcg-mini-subtype');
    expect(html).toContain('Reptile');
    expect(html).toContain('Goblinoid');
    expect(html).toContain('Beast');
    expect(html).toContain('tcg-spawn-badge');

    // 3. Minified creature cards must NOT show pattern tables, rewards, or creature stats row
    expect(html).not.toContain('tcg-pattern-table');
    expect(html).not.toContain('tcg-art-rewards');
    expect(html).not.toContain('creature-stats-row');
    expect(html).not.toContain('DEF:');
    expect(html).not.toContain('tcg-set-symbol');
    expect(html).not.toContain('/icons/new-paths-');
  });

  it('renders Bullwark, Basilisk, and Zombie in monster deck modal with correct artwork, levels, and spawn badges', () => {
    const state = startAdventure('fighter', 'test-seed');
    const html = pileModal('monster_deck', state);

    expect(html).toContain('Bullwark');
    expect(html).toContain('/cards/creatures/bullwark.jpg');
    expect(html).toContain('Lvl 3');
    expect(html).toContain('tcg-spawn-badge swamp');
    expect(html).toContain('tcg-spawn-badge forest');

    expect(html).toContain('Basilisk');
    expect(html).toContain('/cards/creatures/tree_snapper.jpg');
    expect(html).toContain('Reptile');

    expect(html).toContain('Zombie');
    expect(html).toContain('/cards/creatures/zombie.jpg');
    expect(html).toContain('Undead');
    expect(html).toContain('tcg-spawn-badge cave');
  });

  it('renders unique adventure cards ADV #009 (Lvl 3 Forest Encounter) and ADV #011, #012, #013 (Lvl 3 Swamp cards) in pile modal and inspect views', () => {
    const state = startAdventure('fighter', 'test-seed-adv-unique');
    const deckHtml = pileModal('adventure_deck', state);

    // Deck modal renders level badges and card names for adventure biomes
    expect(deckHtml).toContain('Forest Encounter');
    expect(deckHtml).toContain('Grassland Encounter');

    // Inspect view for ADV #009 (Level 3 Forest Encounter)
    const forestLvl3Card: AdventureCard = {
      id: 'adv_forest_encounter_lvl3_01',
      name: 'Forest Encounter',
      terrain: 'forest',
      level: 3,
      hasHostile: true,
      hasVillage: false,
      hasShrine: false,
      revealed: true,
      cardNumber: 'ADV · #009',
      flavorText: 'Deep shadowy thickets where ancient predators and howling packs ambush the unwary.',
    };
    const uiForest: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
      inspectedCard: { kind: 'adventure', card: forestLvl3Card },
    };
    const htmlForestInspect = renderPlayArea(state, uiForest);
    expect(htmlForestInspect).toContain('Forest Encounter (Land Card Reference)');
    expect(htmlForestInspect).toContain('Lvl 3');
    expect(htmlForestInspect).toContain('ADV · #009');
    expect(htmlForestInspect).toContain('Encounter Zone (Level 3):');
    expect(htmlForestInspect).toContain('total creature level &ge; 3');

    // Inspect view for ADV #011 (Level 3 Swamp Encounter)
    const swampLvl3Encounter: AdventureCard = {
      id: 'adv_swamp_encounter_lvl3_01',
      name: 'Swamp Encounter',
      terrain: 'swamp',
      level: 3,
      hasHostile: true,
      hasVillage: false,
      hasShrine: false,
      revealed: true,
      cardNumber: 'ADV · #011',
      flavorText: 'Murky stagnant bogs filled with twisted roots, toxic vapors, and lurking horrors.',
    };
    const uiSwampEnc: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
      inspectedCard: { kind: 'adventure', card: swampLvl3Encounter },
    };
    const htmlSwampEncInspect = renderPlayArea(state, uiSwampEnc);
    expect(htmlSwampEncInspect).toContain('Swamp Encounter (Land Card Reference)');
    expect(htmlSwampEncInspect).toContain('Lvl 3');
    expect(htmlSwampEncInspect).toContain('ADV · #011');
    expect(htmlSwampEncInspect).toContain('Swamps 🪷');
    expect(htmlSwampEncInspect).toContain('tcg-template-swamp');

    // Inspect view for ADV #012 (Level 3 Swamp Shrine)
    const swampLvl3Shrine: AdventureCard = {
      id: 'adv_swamp_shrine_lvl3_01',
      name: 'Swamp Shrine',
      terrain: 'swamp',
      level: 3,
      hasHostile: false,
      hasVillage: false,
      hasShrine: true,
      revealed: true,
      cardNumber: 'ADV · #012',
      flavorText: 'An ancient waterlogged altar carved from sunken stone, lit by eerie will-o-wisps.',
    };
    const uiSwampShrine: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
      inspectedCard: { kind: 'adventure', card: swampLvl3Shrine },
    };
    const htmlSwampShrineInspect = renderPlayArea(state, uiSwampShrine);
    expect(htmlSwampShrineInspect).toContain('Swamp Shrine (Land Card Reference)');
    expect(htmlSwampShrineInspect).toContain('ADV · #012');
    expect(htmlSwampShrineInspect).toContain('Sacred Altar:');

    // Inspect view for ADV #013 (Level 3 Swamp Village)
    const swampLvl3Village: AdventureCard = {
      id: 'adv_swamp_village_lvl3_01',
      name: 'Swamp Village',
      terrain: 'swamp',
      level: 3,
      hasHostile: false,
      hasVillage: true,
      hasShrine: false,
      revealed: true,
      cardNumber: 'ADV · #013',
      flavorText: 'A resilient stilt village built high above treacherous waters and noxious mists.',
    };
    const uiSwampVillage: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
      inspectedCard: { kind: 'adventure', card: swampLvl3Village },
    };
    const htmlSwampVillageInspect = renderPlayArea(state, uiSwampVillage);
    expect(htmlSwampVillageInspect).toContain('Swamp Village (Land Card Reference)');
    expect(htmlSwampVillageInspect).toContain('ADV · #013');
    expect(htmlSwampVillageInspect).toContain('Village Haven:');
  });

  it('renders Sacred Shrine with automatic granted boon and inspectable stat upgrade rows', () => {
    let state = startAdventure('fighter', 'shrine-render-seed');
    state = {
      ...state,
      board: {
        ...state.board,
        '0.0,0': {
          ...state.board['0.0,0'],
          card: { ...ADVENTURE_CARD_CATALOG['advgrs-04'], id: 'shrine-render-card', revealed: true },
        },
      },
      activeHook: {
        type: 'SHRINE',
        shrine: {
          coord: { col: 0, row: 0 },
          turn: 1,
          grantedBoon: {
            id: 'blessing_str',
            name: 'Blessing of Strength',
            description: '+1 STR bonus for this map (+2 Max HP and scales Melee & Shield actions).',
          },
          replacedBoonName: null,
          prayed: true,
          chosenOptionId: 'blessing_str',
        },
      },
    };

    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
    };

    const html = renderPlayArea(state, ui);
    // 1. Shows granted boon box and eliminated prayer button
    expect(html).toContain('shrine-granted-box');
    expect(html).toContain('Visiting this Sacred Shrine has granted you: <b>Blessing of Strength</b>!');
    expect(html).toContain('Only 1 shrine blessing can be active at a time');
    expect(html).not.toContain('Pray to the Gods');
    expect(html).toContain('Leave Shrine &rarr;');
    expect(html).toContain('Grassland Shrine');
    expect(html).toContain('/cards/adventure/grassland_shrine.jpg');
    expect(html).toContain('Current Character');
    expect(html).toContain('This Level 1 Shrine can raise a Base Stat only as high as <b>Base 2</b>');

    // 2. Stat converter options include right-click inspection attributes
    expect(html).toContain('data-inspect-stat="str"');
    expect(html).toContain('data-inspect-stat="dex"');
    expect(html).toContain('data-inspect-stat="agi"');
    expect(html).toContain('stat-info-pill');
    expect(html.match(/class="player-info-widget"/g)).toHaveLength(2); // Map + Shrine use the same component.
    expect(html).toContain('shrine-lore-panel');
    expect(html).toContain('data-action="select-shrine-stat"');
    expect(html).toContain('data-action="request-leave-shrine"');
  });

  it('selects Shrine stat rows before enabling one contextual upgrade action', () => {
    let state = startAdventure('fighter', 'shrine-selection-seed');
    state = {
      ...state,
      playerResources: { ...state.playerResources!, statPoints: 2 },
      board: {
        ...state.board,
        '0.0,0': {
          ...state.board['0.0,0'],
          card: { ...ADVENTURE_CARD_CATALOG['advgrs-04'], id: 'shrine-selection-card', revealed: true },
        },
      },
      activeHook: { type: 'SHRINE', shrine: { coord: { col: 0, row: 0 }, turn: 1, prayed: true } },
    };
    const ui: UiState = {
      selectedClass: 'fighter', showDeck: false, villageTab: 'buy', targetIndex: 0, selectedShrineStat: 'agi',
    };

    const insufficient = renderPlayArea(state, ui);
    const selectedAgi = insufficient.match(/<button[^>]*class="[^"]*shrine-stat-option[^"]*is-selected[^"]*"[\s\S]*?data-stat="agi"[\s\S]*?<\/button>/)?.[0] ?? '';
    expect(selectedAgi).toContain('aria-pressed="true"');
    expect(selectedAgi).not.toContain('disabled');
    expect(insufficient).toContain('Needs 8 SP to upgrade AGI.');
    expect(insufficient).not.toContain('data-action="request-shrine-stat-upgrade"');

    state = { ...state, playerResources: { ...state.playerResources!, statPoints: 10 } };
    const affordable = renderPlayArea(state, ui);
    expect(affordable).toContain('data-action="request-shrine-stat-upgrade" data-stat="agi"');
    expect(affordable).toContain('Upgrade AGI (10 SP)');
  });

  it('renders confirmations before a Shrine stat upgrade or leaving', () => {
    let state = startAdventure('fighter', 'shrine-confirm-seed');
    state = {
      ...state,
      board: {
        ...state.board,
        '0.0,0': {
          ...state.board['0.0,0'],
          card: { ...ADVENTURE_CARD_CATALOG['advgrs-04'], id: 'shrine-confirm-card', revealed: true },
        },
      },
      activeHook: { type: 'SHRINE', shrine: { coord: { col: 0, row: 0 }, turn: 1, prayed: true } },
    };
    const baseUi: UiState = { selectedClass: 'fighter', showDeck: false, villageTab: 'buy', targetIndex: 0, selectedShrineStat: 'agi' };

    const upgrade = renderPlayArea(state, { ...baseUi, pendingShrineAction: { kind: 'upgrade-stat', stat: 'agi' } });
    expect(upgrade).toContain('Upgrade AGI?');
    expect(upgrade).toContain('Confirm Upgrade');
    expect(upgrade).toContain('data-action="cancel-shrine-action"');

    const leave = renderPlayArea(state, { ...baseUi, pendingShrineAction: { kind: 'leave' } });
    expect(leave).toContain('Leave this Shrine?');
    expect(leave).toContain('Confirm Leave');
    expect(leave).toContain('Stay at Shrine');
  });

  it('correctly parses combat log entries with timestamps and assigns blue for You and red for enemies', () => {
    // 1. Player attack
    const heroEntry = parseCombatLogEntry(
      '[10:25:34] ⚔️ Played Slash on Scavenger: rolled 3d6 = [4, 3, 3] = 10 -> 🎯 HIT! Dealt 4 DMG.'
    );
    expect(heroEntry.timestamp).toBe('10:25:34');
    expect(heroEntry.actorType).toBe('hero');
    expect(heroEntry.actorLabel).toBe('You');

    // 2. Player passive (Steal)
    const stealEntry = parseCombatLogEntry(
      '[10:25:35] 💰 [Steal] Rolled a pair [3, 3]! Snatched +3 Gold (Total: 23 Gold).'
    );
    expect(stealEntry.timestamp).toBe('10:25:35');
    expect(stealEntry.actorType).toBe('hero');
    expect(stealEntry.actorLabel).toBe('You');

    // 3. Enemy attack (Pincer)
    const enemyEntry = parseCombatLogEntry(
      '[10:25:36] ⚔️ Pincer uses Shell Guard (2 DMG): rolled 3d6 = [2, 2, 3] = 7 -> 🎯 HIT!'
    );
    expect(enemyEntry.timestamp).toBe('10:25:36');
    expect(enemyEntry.actorType).toBe('enemy');
    expect(enemyEntry.actorLabel).toBe('Pincer');

    // 4. Enemy momentum / charge (Bullwark)
    const bullwarkEntry = parseCombatLogEntry(
      '[10:25:37] 🐂 Bullwark gathers momentum (+1 ATK)!'
    );
    expect(bullwarkEntry.timestamp).toBe('10:25:37');
    expect(bullwarkEntry.actorType).toBe('enemy');
    expect(bullwarkEntry.actorLabel).toBe('Bullwark');

    // 5. Enemy lifesteal (Zombie)
    const zombieEntry = parseCombatLogEntry(
      '[10:25:38] 🩸 Zombie drains life and restores +2 HP! (6/7 HP)'
    );
    expect(zombieEntry.timestamp).toBe('10:25:38');
    expect(zombieEntry.actorType).toBe('enemy');
    expect(zombieEntry.actorLabel).toBe('Zombie');

    // 6. System encounter
    const encounterEntry = parseCombatLogEntry(
      '[10:25:30] Encountered Pincer (Lvl 1, 11 HP) + Scavenger (Lvl 1, 7 HP)!'
    );
    expect(encounterEntry.timestamp).toBe('10:25:30');
    expect(encounterEntry.actorType).toBe('system');
    expect(encounterEntry.actorLabel).toBe('Encounter');

    // 7. Direct rendering of combat log entries
    const renderedEntries = renderCombatLogEntries([
      '[10:25:34] ⚔️ Played Slash on Scavenger: rolled 3d6 = [4, 3, 3] = 10 -> 🎯 HIT! Dealt 4 DMG.',
      '[10:25:36] ⚔️ Pincer uses Shell Guard (2 DMG): rolled 3d6 = [2, 2, 3] = 7 -> 🎯 HIT!',
    ]);
    expect(renderedEntries).toContain('combat-sidebar-log-item actor-hero');
    expect(renderedEntries).toContain('combat-sidebar-log-item actor-enemy');
    expect(renderedEntries).toContain('combat-log-actor is-hero');
    expect(renderedEntries).toContain('combat-log-actor is-enemy');
  });

  it('renders Combat Modal with split layout: main area on left and dedicated combat log sidebar on right', () => {
    let state = startAdventure('fighter', 'test-seed');
    const beetle: MonsterCard = {
      ...MONSTER_TEMPLATES['fighting_beetle'],
      id: 'beetle_01',
    };
    state = {
      ...state,
      activeHook: {
        type: 'COMBAT',
        combat: {
          combatTurn: 1,
          monsters: [
            {
              monster: beetle,
              hp: 11,
              block: 0,
              patternIndex: 0,
            },
          ],
          playerAp: 3,
          playerMaxAp: 3,
          playerBlock: 0,
          playerEvasionMod: 0,
          drawPile: [],
          hand: state.playerMasterDeck.slice(0, 3),
          discardPile: [],
          combatLog: [
            '[10:25:30] Encountered Pincer (Lvl 1, 11 HP)!',
            '[10:25:34] ⚔️ Played Slash on Pincer: rolled 3d6 = [3, 3, 3] = 9 -> 🎯 HIT! Dealt 4 DMG.',
            '[10:25:38] ⚔️ Pincer uses Shell Guard (2 DMG): rolled 3d6 = [2, 3, 3] = 8 -> 🎯 HIT!',
          ],
          lastAttackRoll: undefined,
        },
      },
    };

    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
    };

    const html = renderPlayArea(state, ui);

    // 1. Split layout structure
    expect(html).toContain('combat-main-col');
    expect(html).toContain('combat-log-sidebar');
    expect(html).toContain('combat-action-piles');
    expect(html).toContain('Action Deck');
    expect(html).toContain('Action Cards');
    expect(html).toContain('📜 Battle Log');
    expect(html).toContain('combat-log-count');

    // 2. Contains timestamps and actor badges
    expect(html).toContain('combat-log-time');
    expect(html).toContain('[10:25:30]');
    expect(html).toContain('[10:25:34]');
    expect(html).toContain('[10:25:38]');

    // 3. Actor badge classes: .is-hero (Blue) and .is-enemy (Red)
    expect(html).toContain('combat-log-actor is-hero');
    expect(html).toContain('You');
    expect(html).toContain('combat-log-actor is-enemy');
    expect(html).toContain('Pincer');
    expect(html).toContain('combat-log-actor is-system');
  });

  it('renders Hero Sidebar in Combat with HP progress bar, natural DEF, ATK, and usable backpack consumables', () => {
    let state = startAdventure('fighter', 'test-seed');
    const potion = { ...SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl1_health_potion')!, instanceId: 'test_combat_potion' };
    state = {
      ...state,
      backpack: [potion],
      playerResources: { ...state.playerResources!, hp: 10, maxHp: 16 },
      activeHook: {
        type: 'COMBAT',
        combat: {
          combatTurn: 1,
          monsters: [
            {
              monster: { ...MONSTER_TEMPLATES['fighting_beetle'], id: 'b_01' },
              hp: 11,
              block: 0,
              patternIndex: 0,
            },
          ],
          playerAp: 3,
          playerMaxAp: 3,
          playerBlock: 0,
          playerEvasionMod: 0,
          drawPile: [],
          hand: state.playerMasterDeck.slice(0, 3),
          discardPile: [],
          combatLog: [],
          lastAttackRoll: undefined,
        },
      },
    };

    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
    };

    const html = renderPlayArea(state, ui);

    // 1. Hero sidebar exists in combat via canonical reusable player-info-widget
    expect(html).toContain('player-info-widget');
    expect(html).toContain('Character & Gear');
    expect(html).toContain('hero-sidebar-vitals-card');
    expect(html).toContain('<b>10</b> / 16 HP');

    // 2. Natural DEF chip is visible in the combat hero sidebar
    expect(html).toContain('DEF');
    expect(html).toContain('ATK');

    // 3. Backpack section with consumable Health Potion has a "Use" button
    expect(html).toContain('backpack-box');
    expect(html).toContain('Health Potion');
    expect(html).toContain('data-action="use-item"');
    expect(html).toContain('data-id="test_combat_potion"');
  });

  it('renders Bullwark boosted attack damage flashing on card face, dock, and inspect modal with active boons', () => {
    let state = startAdventure('fighter', 'test-seed');
    const bullwarkCard = { ...MONSTER_TEMPLATES['bullwark'], id: 'bullwark_01' };
    state = {
      ...state,
      activeHook: {
        type: 'COMBAT',
        combat: {
          combatTurn: 2,
          monsters: [
            {
              monster: bullwarkCard,
              hp: 20,
              block: 0,
              patternIndex: 1, // Turn 2: Heavy Charge
              attackBonus: 1,  // Gained +1 ATK from previous charge
            },
          ],
          playerAp: 3,
          playerMaxAp: 3,
          playerBlock: 0,
          playerEvasionMod: 0,
          drawPile: [],
          hand: state.playerMasterDeck.slice(0, 3),
          discardPile: [],
          combatLog: [],
          lastAttackRoll: undefined,
        },
      },
    };

    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
    };

    const html = renderPlayArea(state, ui);

    // 1. On card face, Heavy Charge shows its 7 base + 1 temporary ATK buff.
    expect(html).toContain('is-buffed-flashing');
    expect(html).toContain('<b>8</b> DMG');
    expect(html).toContain('🔥 Boon: +1 ATK');

    // 2. Monster inspect button exists
    expect(html).toContain('combat-monster-info-btn');
    expect(html).toContain('data-action="inspect-monster"');

    // 3. Inspect modal rendering with active boons
    const inspectHtml = cardInspectModal(
      {
        kind: 'monster',
        monster: bullwarkCard,
        currentHp: 20,
        attackBonus: 1,
        activeBoons: [
          {
            name: 'Chaotic Impulse',
            value: '+1 ATK',
            description: 'Chaotic Impulse empowers the next action. Heavy Charge currently deals 8 DMG (Base 7 + 1 Boon).',
          },
        ],
      },
      state
    );

    expect(inspectHtml).toContain('inspect-boons-section');
    expect(inspectHtml).toContain('Chaotic Impulse');
    expect(inspectHtml).toContain('+1 ATK');
    expect(inspectHtml).toContain('is-buffed-flashing');
    expect(inspectHtml).toContain('Base 7 + 1 Boon');
  });

  it('renders dice banner and outcome when monster damage is absorbed by Hero natural DEF', () => {
    let state = startAdventure('fighter', 'test-seed');
    state = {
      ...state,
      activeHook: {
        type: 'COMBAT',
        combat: {
          combatTurn: 2,
          monsters: [
            {
              monster: { ...MONSTER_TEMPLATES['bullwark'], id: 'bullwark_01' },
              hp: 15,
              block: 0,
              patternIndex: 0,
            },
          ],
          playerAp: 3,
          playerMaxAp: 3,
          playerBlock: 0,
          playerEvasionMod: 0,
          drawPile: [],
          hand: state.playerMasterDeck.slice(0, 3),
          discardPile: [],
          combatLog: [],
          lastAttackRoll: {
            attackerName: 'Bullwark',
            targetName: 'Hero',
            actionName: 'Heavy Charge',
            die1: 5,
            die2: 4,
            die3: 2,
            total: 11,
            netAcc: 2,
            minHitRoll: 8,
            maxHitRoll: 13,
            isHit: true,
            damageDealt: 4,
            damageBlocked: 0,
            damageDefReduced: 2,
          },
        },
      },
    };

    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
      pendingDiceRolls: [
        {
          roll: state.activeHook.type === 'COMBAT' ? state.activeHook.combat.lastAttackRoll! : ({} as any),
          settled: true,
        },
      ],
    };

    const html = renderPlayArea(state, ui);

    // Shows absorbed by Hero DEF in dice outcome badge
    expect(html).toContain('dice-roll-modal');
    expect(html).toContain('absorbed by Hero DEF');
    expect(html).toContain('4 DMG');
    expect(html).toContain('2 absorbed by Hero DEF');
    expect(html).toContain('Apply');
  });

  it('enforces universal bottom-docked info textbox layout across all card types', () => {
    const state = startAdventure('fighter', 'universal-docking-seed');

    // 1. Adventure inspect card (e.g. Grassland Village)
    const villageCard: AdventureCard = {
      id: 'adv_village_01',
      name: 'Grassland Village',
      terrain: 'grasslands',
      level: 1,
      hasHostile: false,
      hasVillage: true,
      hasShrine: false,
      revealed: true,
      cardNumber: 'ADV · #003',
    };
    const villageInspectHtml = cardInspectModal({ kind: 'adventure', card: villageCard }, state);
    expect(villageInspectHtml).toContain('tcg-inner-frame');
    expect(villageInspectHtml).toContain('adv-art-spacer');
    expect(villageInspectHtml).toContain('tcg-textbox');
    expect(villageInspectHtml).toContain('adv-inspect-summary');
    expect(villageInspectHtml).toContain('Village Haven:');
    // Ensure no broken floating type line or footer on the adventure preview card
    expect(villageInspectHtml).not.toContain('<div class="tcg-type-line">');

    // 2. Action inspect card (e.g. Slash)
    const actionCard = state.playerMasterDeck[0];
    const actionInspectHtml = cardInspectModal({ kind: 'action', card: actionCard }, state);
    expect(actionInspectHtml).toContain('tcg-inner-frame');
    expect(actionInspectHtml).toContain('tcg-art-spacer');
    expect(actionInspectHtml).toContain('tcg-textbox action-text');
    expect(actionInspectHtml).toContain('tcg-footer');

    // 3. Creature inspect card (e.g. Pincer)
    const beetle: MonsterCard = { ...MONSTER_TEMPLATES['fighting_beetle'], id: 'm_test_1' };
    const creatureInspectHtml = cardInspectModal({ kind: 'monster', monster: beetle, currentHp: 11 }, state);
    expect(creatureInspectHtml).toContain('tcg-inner-frame');
    expect(creatureInspectHtml).toContain('tcg-art-spacer');
    expect(creatureInspectHtml).toContain('tcg-textbox tcg-creature-textbox');
    expect(creatureInspectHtml).toContain('tcg-footer');

    // 4. Item inspect card (e.g. Iron Sword)
    const sword = SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl1_iron_sword')!;
    const itemInspectHtml = cardInspectModal({ kind: 'item', item: { ...sword, instanceId: 'itm_test_1' } }, state);
    expect(itemInspectHtml).toContain('tcg-inner-frame');
    expect(itemInspectHtml).toContain('tcg-item-art-spacer');
    expect(itemInspectHtml).toContain('tcg-textbox');
    expect(itemInspectHtml).toContain('tcg-footer');
  });

  it('renders Zombie with 1 DEF, 0 EVA, and Regenerate healing in combat and inspect modal', () => {
    const state = startAdventure('fighter', 'test-seed-zombie');
    const zombieCard: MonsterCard = { ...MONSTER_TEMPLATES.zombie, id: 'm_zombie_test' };

    // Inspect view
    const inspectHtml = cardInspectModal({ kind: 'monster', monster: zombieCard, currentHp: 7 }, state);
    expect(inspectHtml).toContain('aria-label="DEF: 1"');
    expect(inspectHtml).not.toContain('data-creature-stat="eva"');
    expect(inspectHtml).toContain('Regenerate');
    expect(inspectHtml).toContain('+<b>3</b> HP');
    expect(inspectHtml).toContain('aria-label="MDEF: 1"');
    expect(inspectHtml).toContain('Rotting Claw');
    expect(inspectHtml).toContain('<b>5</b> DMG');

    // In-combat view with Zombie as target
    const combatUi: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
    };
    const combatState: RunState = {
      ...state,
      activeHook: {
        type: 'COMBAT',
        combat: {
          monsters: [
            {
              monster: zombieCard,
              hp: 7,
              block: 0,
              patternIndex: 0, // Regenerate
            },
          ],
          combatTurn: 1,
          playerAp: 3,
          playerMaxAp: 3,
          playerBlock: 0,
          playerEvasionMod: 0,
          drawPile: [],
          hand: [],
          discardPile: [],
          combatLog: [],
        },
      },
    };
    const combatHtml = renderPlayArea(combatState, combatUi);
    expect(combatHtml).toContain('Regenerate');
    expect(combatHtml).toContain('+<b>3</b> HP');
    expect(combatHtml).toContain('aria-label="MDEF: 1"');
    expect(combatHtml).toContain('aria-label="DEF: 1"');
    expect(combatHtml).not.toContain('data-creature-stat="eva"');
  });

  it('computes correct 3D carousel positioning classes for 1, 2, 3, and 4 monsters', () => {
    // 1 monster
    expect(getMonsterCarouselClass(0, 0, 1)).toBe('is-center');

    // 2 monsters: target = 0
    expect(getMonsterCarouselClass(0, 0, 2)).toBe('is-center');
    expect(getMonsterCarouselClass(1, 0, 2)).toBe('is-next');
    // 2 monsters: target = 1
    expect(getMonsterCarouselClass(1, 1, 2)).toBe('is-center');
    expect(getMonsterCarouselClass(0, 1, 2)).toBe('is-prev');

    // 3 monsters: target = 0 (Blob, Rattler, Scavenger)
    expect(getMonsterCarouselClass(0, 0, 3)).toBe('is-center');
    expect(getMonsterCarouselClass(2, 0, 3)).toBe('is-prev');
    expect(getMonsterCarouselClass(1, 0, 3)).toBe('is-next');

    // 3 monsters: target = 1 (Rattler)
    expect(getMonsterCarouselClass(1, 1, 3)).toBe('is-center');
    expect(getMonsterCarouselClass(0, 1, 3)).toBe('is-prev');
    expect(getMonsterCarouselClass(2, 1, 3)).toBe('is-next');

    // 4 monsters: target = 0
    expect(getMonsterCarouselClass(0, 0, 4)).toBe('is-center');
    expect(getMonsterCarouselClass(3, 0, 4)).toBe('is-prev');
    expect(getMonsterCarouselClass(1, 0, 4)).toBe('is-next');
    expect(getMonsterCarouselClass(2, 0, 4)).toBe('is-hidden');
  });

  it('renders Monster Carousel with keyboard A, D or LEFT RIGHT instructions and navigation controls', () => {
    const s = startAdventure('fighter', 'test-3-monsters');
    const slime = { ...MONSTER_TEMPLATES['pink_slime'], id: 'm0' };
    const rattler = { ...MONSTER_TEMPLATES['rattler'], id: 'm1' };
    const dog = { ...MONSTER_TEMPLATES['wild_dog'], id: 'm2' };

    const combatState: RunState = {
      ...s,
      activeHook: {
        type: 'COMBAT',
        combat: {
          combatTurn: 1,
          monsters: [
            { monster: slime, hp: 9, block: 0, patternIndex: 0 },
            { monster: rattler, hp: 14, block: 0, patternIndex: 0 },
            { monster: dog, hp: 7, block: 0, patternIndex: 0 },
          ],
          playerAp: 3,
          playerMaxAp: 3,
          playerBlock: 0,
          playerEvasionMod: 0,
          drawPile: [],
          hand: [],
          discardPile: [],
          combatLog: [],
        },
      },
    };

    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
      inspectedCard: null,
      inspectedPile: null,
    };

    const html = renderPlayArea(combatState, ui);

    // Carousel structure
    expect(html).toContain('monster-carousel');
    expect(html).toContain('monster-carousel-track');
    expect(html).toContain('monster-carousel-nav prev');
    expect(html).toContain('monster-carousel-nav next');

    // Instructions displaying A, D, LEFT, RIGHT
    expect(html).toContain('Traverse targets with <b>A</b> or <b>D</b>');
    expect(html).toContain('<b>LEFT</b> and <b>RIGHT</b> keys');
    expect(html).toContain('Tap a monster to target it with attacks');

    // Check positioning classes on monster units
    expect(html).toMatch(/combat-monster-unit\s+is-center\s+is-selected-unit\s+selected[^"]*" data-id="0"/);
    expect(html).toMatch(/combat-monster-unit\s+is-next[^"]*" data-id="1"/);
    expect(html).toMatch(/combat-monster-unit\s+is-prev[^"]*" data-id="2"/);

    // Verify in-place DOM updater function
    const makeUnitMock = (_id: string, initialClasses: string[]) => {
      const classList = new Set<string>(initialClasses);
      const cardClassList = new Set<string>();
      const header = { innerHTML: '', querySelector: () => null };
      return {
        classList: {
          contains: (c: string) => classList.has(c),
          add: (...cs: string[]) => cs.forEach((c) => classList.add(c)),
          remove: (...cs: string[]) => cs.forEach((c) => classList.delete(c)),
        },
        querySelector: (sel: string) => {
          if (sel === '.tcg-creature') {
            return {
              classList: {
                remove: (...cs: string[]) => cs.forEach((c) => cardClassList.delete(c)),
                add: (...cs: string[]) => cs.forEach((c) => cardClassList.add(c)),
                contains: (c: string) => cardClassList.has(c),
              },
            };
          }
          if (sel === '.combat-target-header') return header;
          return null;
        },
      };
    };

    const unit0 = makeUnitMock('0', ['combat-monster-unit', 'is-center', 'is-selected-unit']);
    const unit1 = makeUnitMock('1', ['combat-monster-unit', 'is-next']);
    const unit2 = makeUnitMock('2', ['combat-monster-unit', 'is-prev']);

    const track = {
      querySelector: (sel: string) => {
        if (sel === '.combat-monster-unit[data-id="0"]') return unit0;
        if (sel === '.combat-monster-unit[data-id="1"]') return unit1;
        if (sel === '.combat-monster-unit[data-id="2"]') return unit2;
        return null;
      },
    };

    const container = {
      querySelector: (sel: string) => {
        if (sel === '.monster-carousel-track') return track;
        return null;
      },
    } as unknown as HTMLElement;

    if (combatState.activeHook.type === 'COMBAT') {
      const updated = updateMonsterCarouselDom(container, combatState.activeHook.combat, 1, 1);
      expect(updated).toBe(true);

      expect(unit1.classList.contains('is-center')).toBe(true);
      expect(unit1.classList.contains('is-selected-unit')).toBe(true);
      expect(unit0.classList.contains('is-prev')).toBe(true);
      expect(unit2.classList.contains('is-next')).toBe(true);
    }
  });

  it('renders monster card inspect modal with proper 2-column layout and balanced DOM tags', () => {
    const state = startAdventure('fighter', 'test-tree-snapper');
    const treeSnapper = { ...MONSTER_TEMPLATES['tree_snapper'], id: 'm_snapper' };
    const html = cardInspectModal({ kind: 'monster', monster: treeSnapper, currentHp: 18 }, state);

    // Verify modal and body structure
    expect(html).toContain('card-inspect-modal');
    expect(html).toContain('inspect-body');
    expect(html).toContain('inspect-card-wrap');
    expect(html).toContain('inspect-detail-content');

    // Verify all 5 sections are properly present
    expect(html).toContain('Encounter &amp; Spawn Profile');
    expect(html).toContain('Active Boons &amp; Combat Enhancements');
    expect(html).toContain('Cycling AI Attack Pattern');
    expect(html).toContain('Lore &amp; Flavor Text');
    expect(html).toContain('3d6 QTE Combat Rules');

    // Ensure the footer is inside the modal
    expect(html).toContain('<div class="inspect-footer">');
    expect(html).toContain('Back to Game');

    // Count opening vs closing divs in the rendered modal
    const openDivs = (html.match(/<div(\s|>)/g) || []).length;
    const closeDivs = (html.match(/<\/div>/g) || []).length;
    expect(openDivs).toBe(closeDivs);
  });

  it('guarantees universal card frame bottom docking and flicker prevention styles in styles.css', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = globalThis as any;
    const req = g.require || eval('require');
    const fs = req('fs');
    const path = req('path');
    const cwd = g.process?.cwd?.() || '.';
    const cssPath = path.resolve(cwd, 'src/ui/styles.css');
    const rawCss = fs.readFileSync(cssPath, 'utf-8');
    const css = rawCss.replace(/@import\s+['"](.+?)['"];/g, (_: string, rel: string) =>
      fs.readFileSync(path.resolve(path.dirname(cssPath), rel), 'utf-8')
    );

    // 1. Universal card frame positioning: absolute inset to prevent height collapse
    expect(css).toContain('position: absolute !important;\n  inset: 3px !important;');
    expect(css).toContain('margin-top: auto !important;');

    // 2. Flickering prevention: no box-shadow badge animation
    expect(css).not.toContain('animation: badge-pulse');
    expect(css).not.toContain('animation: buffPulse');

    // 3. Dock and combat card textboxes have backdrop-filter: none to prevent compositor blur shader thrashing
    expect(css).toContain('.creature-combat-dock {\n  width: 100%;\n  max-width: 215px;\n  margin-top: 6px;\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  background: rgba(15, 23, 42, 0.96) !important;\n  border: 1px solid rgba(148, 163, 184, 0.3);\n  border-radius: 7px;\n  padding: 5px 7px;\n  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.6);\n  backdrop-filter: none !important;\n  -webkit-backdrop-filter: none !important;\n  box-sizing: border-box;\n}');
    expect(css).toContain('.combat-monster-unit .tcg-card:hover');
  });

  describe('Victory Modal Rendering', () => {
    it('renders victory modal with defeated foes, SP, Gold spoils breakdown, and OK action button', () => {
      const mockVictory: CombatVictoryState = {
        defeatedMonsters: [
          {
            id: 'test_goblin',
            templateId: 'goblin',
            name: 'Goblin',
            creatureType: 'goblinoid',
            level: 1,
            maxHp: 6,
            goldReward: 2,
            statPointReward: 1,
            acc: 1,
            eva: 1,
            abilities: [],
            pattern: [],
          },
        ],
        statPointsEarned: 1,
        goldEarned: 5,
        baseGold: 2,
        luckyCharmGold: 2,
        isBoss: false,
        stageNumber: 1,
        canContinue: true,
      };

      const html = victoryModal(mockVictory);
      expect(html).toContain('victory-backdrop');
      expect(html).toContain('victory-modal');
      expect(html).toContain('Battle Won!');
      expect(html).toContain('Defeated Foes');
      expect(html).toContain('Goblin');
      expect(html).toContain('+1 SP');
      expect(html).toContain('+5 Gold');
      expect(html).toContain('data-action="confirm-victory"');
      expect(html).toContain('OK &mdash; Return to Map &rarr;');
    });

    it('renders boss victory action button with Proceed text', () => {
      const mockVictory: CombatVictoryState = {
        defeatedMonsters: [],
        statPointsEarned: 10,
        goldEarned: 25,
        baseGold: 25,
        luckyCharmGold: 0,
        isBoss: true,
        bossTitle: 'Goblin Chieftain',
        stageNumber: 1,
        canContinue: true,
      };

      const html = victoryModal(mockVictory);
      expect(html).toContain('OK &mdash; Proceed &rarr;');
    });
  });

  describe('QTE Hit Check Bar (MACG-3D6™)', () => {
    it('renders hit check bar with Diabolic slots (3 & 18), Sure Hit Rolls core (10-11), and Rolls tag', () => {
      const html = renderQteHitCheckBarHtml({
        minHitRoll: 9,
        maxHitRoll: 12,
        hitPercent: 48.1,
      });

      expect(html).toContain('qte-bar-container');
      expect(html).toContain('Hit Range: <b>9 – 12</b> <span class="qte-rolls-tag">Rolls</span>');
      expect(html).toContain('<b>48.1%</b> chance');

      // Visual track zones
      expect(html).toContain('qte-zone diabolic left');
      expect(html).toContain('qte-zone diabolic right');
      expect(html).toContain('qte-zone miss left');
      expect(html).toContain('qte-zone miss right');
      expect(html).toContain('qte-zone hit');
      expect(html).toContain('qte-zone sure-hit');
      expect(html).toContain('qte-center-notch');

      // Ruler markings (3, 9, 10-11, 12, 18)
      expect(html).toContain('mark-diabolic mark-min');
      expect(html).toContain('>3<');
      expect(html).toContain('mark-hit-min');
      expect(html).toContain('>9<');
      expect(html).toContain('mark-sure-hit');
      expect(html).toContain('>10-11<');
      expect(html).toContain('mark-hit-max');
      expect(html).toContain('>12<');
      expect(html).toContain('mark-diabolic mark-max');
      expect(html).toContain('>18<');
    });

    it('renders Tier 1 (10-11) without redundant 10 or 11 outer bound marks', () => {
      const html = renderQteHitCheckBarHtml({
        minHitRoll: 10,
        maxHitRoll: 11,
        hitPercent: 25.0,
      });

      expect(html).toContain('>3<');
      expect(html).toContain('>10-11<');
      expect(html).toContain('>18<');
      expect(html).not.toContain('mark-hit-min');
      expect(html).not.toContain('mark-hit-max');
    });

    it('renders rolled token when rolledTotal is provided', () => {
      const html = renderQteHitCheckBarHtml({
        minHitRoll: 9,
        maxHitRoll: 12,
        rolledTotal: 10,
        isHit: true,
      });

      expect(html).toContain('qte-token-anchor');
      expect(html).toContain('/icons/qte-token.png');
      expect(html).toContain('qte-token-label">10</span>');
      expect(html).toContain('token-hit');
    });

    it('includes underground monsters in Bestiary', () => {
      const underground = getBestiaryMonstersForTerrain('underground');
      expect(underground).toEqual(['dark_orc', 'orc_shaman']);
      const guideHtml = renderGuideModal(false, 6);
      expect(guideHtml).toContain('Dark Orc');
      expect(guideHtml).toContain('Orc Shaman');
    });
  });
});

import { describe, it, expect } from 'vitest';
import { startAdventure } from '../core/engine';
import {
  renderPlayArea,
  renderClassSelect,
  renderWelcome,
  pileModal,
  UiState,
  updateClassCarouselDom,
  CLASS_CAROUSEL_ORDER,
  parseCombatLogEntry,
  renderCombatLogEntries,
  cardInspectModal,
  getMonsterCarouselClass,
  updateMonsterCarouselDom,
  victoryModal,
} from '../ui/render';
import { MONSTER_TEMPLATES } from '../data/monsters';
import { SHOP_ITEM_CATALOG } from '../data/shopItems';
import { getActionRasterArtPath } from '../ui/cardArt';
import { AdventureCard, CombatVictoryState, MonsterCard, RunState } from '../core/types';

describe('Render Play Area and Shop Layout', () => {
  it('renders shop layout with sidebar and main content', () => {
    let state = startAdventure('fighter', 'test-seed');
    state = {
      ...state,
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
    expect(bodyHtml).toContain('modal village-modal is-shop');
    expect(bodyHtml).toContain('shop-layout');
    expect(bodyHtml).toContain('shop-sidebar');
    expect(bodyHtml).toContain('shop-main');
    expect(bodyHtml).toContain('Your equipment');
    expect(bodyHtml).toContain('Backpack');

    // Card art is rendered in the shop options
    expect(bodyHtml).toContain('shop-card-preview-box');
    expect(bodyHtml).toContain('shop-mini-card');
    expect(bodyHtml).toContain('shop-card-art-img');
    expect(bodyHtml).toContain('/cards/items/');
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

    // Header with meta stack (Type & level) and name below
    expect(html).toContain('tcg-header-meta');
    expect(html).toContain('tcg-type-main');
    expect(html).toContain('CREATURE');
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
    expect(html).toContain('aria-label="EVA: 1"');

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
    expect(html).toContain('5 / 5 HP');
    expect(html).toContain('creature-stat-footer');
    expect(html).not.toContain('creature-stats-row');
    expect(html).toContain('aria-label="DEF: 1"');
    expect(html).not.toContain('data-creature-stat="eva"');
    expect(html).toContain('+1');
    expect(html).toContain('+2');
    // Live HP in the lower-right PT badge
    expect(html).toContain('HP <b>5</b>');
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
    // HP bar showing 4 / 6 HP with block shield indicator
    expect(html).toContain('hp-bar creature-hp-bar');
    expect(html).toContain('4 / 6 HP (+3 &#128737;)');
    expect(html).toContain('style="width: 67%"');
    // Creature stats: DEF 0, EVA 1
    expect(html).toContain('creature-stat-footer');
    expect(html).not.toContain('creature-stats-row');
    expect(html).not.toContain('data-creature-stat="def"');
    expect(html).toContain('aria-label="EVA: 1"');
    // Floating rewards: +1 and +2
    expect(html).toContain('+1');
    expect(html).toContain('+2');
  });

  it('renders Card Info Modal with full detail, flavor text, and stat computation for offline play', () => {
    let state = startAdventure('fighter', 'test-seed');
    const actionCard = state.playerMasterDeck[0]; // Melee ATK
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

    // Tabletop Offline computation details
    expect(html).toContain('Tabletop Offline Rules &amp; Stat Scaling');
    expect(html).toContain('Damage Formula (Tabletop Rule)');
    expect(html).toContain('2 Base DMG + &lfloor;Effective STR / 2&rfloor;');
    expect(html).toContain('Hero Calculation: 2 + &lfloor;3 / 2&rfloor; = 2 + 1 = <b>3 DMG</b>');

    // Flavor text printed on the card and in the lore quote
    expect(html).toContain('A disciplined, swift blade stroke');
    expect(html).toContain('data-action="close-inspect"');
    expect(html).toContain('data-action="close-inspect-backdrop"');
    expect(html).not.toContain('event.stopPropagation()');

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
    expect(monsterHtml).toContain('+1 Stat Points');
    expect(monsterHtml).toContain('+2 Gold');
    expect(monsterHtml).toContain('Cycling AI Attack Pattern');
    expect(monsterHtml).toContain('Savage Bite');
    expect(monsterHtml).toContain('Lunging Bite');
    expect(monsterHtml).toContain('Tabletop 2d6 Combat Rules');
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
      'advgrs-02',
      'advgrs-03',
      'advgrs-04',
      'advfrs-00',
      'advfrs-01',
      'advfrs-02',
      'advfrs-03',
      'advfrs-04',
      'advsmp-00',
      'advsmp-01',
      'advsmp-02',
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

  it('renders player combat deck modal with unique action cards and multipliers (e.g. 8x Melee, 2x Shield)', () => {
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
    // Fighter starter deck has 8x Melee ATK and 2x Shield DEF
    expect(html).toContain('&times;8');
    expect(html).toContain('&times;2');
    expect(html).toContain('Melee ATK');
    expect(html).toContain('Shield DEF');
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

  it('renders tabletop 2d6 combat dice banner when lastAttackRoll is present', () => {
    let state = startAdventure('fighter', 'test-seed');
    const goblinCard = { ...MONSTER_TEMPLATES.goblin, id: 'test_goblin', instanceId: 'test_goblin' };

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
          lastAttackRoll: {
            attackerName: 'Hero',
            targetName: 'Goblin',
            actionName: 'Melee ATK',
            die1: 4,
            die2: 3,
            total: 7,
            netAcc: 1,
            neededRoll: 6,
            isHit: true,
            isCrit: false,
            isSnakeEyes: false,
            damageDealt: 4,
            damageBlocked: 0,
          },
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
    expect(html).toContain('combat-dice-banner is-hit');
    expect(html).toContain('Hero');
    expect(html).toContain('Goblin');
    expect(html).toContain('dice-die">🎲 4');
    expect(html).toContain('dice-die">🎲 3');
    expect(html).toContain('dice-total">7');
    expect(html).toContain('(vs 6+ needed)');
    expect(html).toContain('HIT! (4 DMG)');
    expect(html).toContain('TARGET (Roll 7+)');
  });

  it('renders card confirmation modal for attack card (Melee ATK on Goblin) with source/target cards, stats, probability and confirm button', () => {
    let state = startAdventure('fighter', 'test-seed');
    const goblinCard = { ...MONSTER_TEMPLATES.goblin, id: 'test_goblin', instanceId: 'test_goblin' };
    const meleeCard = state.playerMasterDeck[0]; // Melee ATK

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
    expect(html).toContain('Use <span>Melee ATK</span> on <span>Goblin</span>');

    // Source Card and Target Card comparison
    expect(html).toContain('Source Action (1 AP)');
    expect(html).toContain('Target Creature');
    expect(html).toContain('Melee ATK');
    expect(html).toContain('Goblin');

    // In case of attack on creature: show ACC and EVA stats and bonuses
    expect(html).toContain('Hero ACC');
    expect(html).toContain('Target EVA');
    expect(html).toContain('Net ACC');
    expect(html).toContain('Dice Target');
    // Fighter has 1 DEX ACC (floor(2/2)) + 1 Melee ATK = 2 Total ACC vs 1 Goblin EVA = +1 Net ACC -> Need 6+
    expect(html).toContain('🎲 <b>6+</b>');

    // Show probability to hit
    expect(html).toContain('Hit Probability');
    expect(html).toContain('72.2%');
    expect(html).toContain('26 of 36 combinations');
    expect(html).toContain('Boxcars Critical');
    expect(html).toContain('Snake Eyes Auto-Miss');

    // Confirm button and Cancel button below
    expect(html).toContain('data-action="confirm-play-card"');
    expect(html).toContain('Confirm Use (1 AP)');
    expect(html).toContain('data-action="cancel-play-card"');
    expect(html).toContain('Cancel');
  });

  it('renders card confirmation modal for defense card (Shield DEF on Hero) with block and EVA stats', () => {
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
    expect(html).toContain('Use <span>Shield DEF</span> on <span>Fighter (Hero)</span>');
    expect(html).toContain('Source Action (1 AP)');
    expect(html).toContain('Target (Self)');
    expect(html).toContain('/cards/adventurers/fighter.jpg');
    expect(html).toContain('hero-sidebar-portrait-frame');
    expect(html).toContain('Block Gained');
    expect(html).toContain('Combat EVA');
    expect(html).toContain('data-action="confirm-play-card"');
    expect(html).toContain('Confirm Use (1 AP)');
  });

  it('renders Class Select screen with Primary/Secondary badges, passives, stat icons, and 6 stats including CHA', () => {
    const html = renderClassSelect({ selectedClass: 'fighter', showDeck: false, villageTab: 'buy', targetIndex: 0 });
    expect(html).toContain('PRIMARY: STR (+2)');
    expect(html).toContain('SECONDARY: DEX, AGI (+1)');
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
    expect(htmlWiz).toContain('12 Max HP');

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
    expect(state.playerResources?.statPoints).toBe(4);

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
    expect(html).toContain('4 SP');
    expect(html).toContain('cost 4 SP');
    expect(html).toContain('Upgrade (4 SP)');
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

  it('village rest button is disabled on full health with no negative ailments', () => {
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
    expect(html).toContain('Already at full health (no ailments to cure)');
  });

  it('village rest button is enabled when on full health but has negative ailments', () => {
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
    expect(html).not.toContain('data-action="village-rest" disabled');
    expect(html).toContain('Cleanse all negative ailments (5g)');
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
    expect(html).toContain('class="welcome-card"');
    expect(html).toContain('The Paths<br/>We Choose');
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
    expect(html).toContain('<span class="tcg-name action-name">Melee ATK</span>');
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
    expect(html).toContain('stat-inspect-modal');
    expect(html).toContain('Strength (STR) Attribute Profile');
    expect(html).toContain('Effective Stat Value Breakdown');
    expect(html).toContain('Effective STR = Base (1) + Class Bonus (+2)');
    expect(html).toContain('Max Health (Max HP):');
    expect(html).toContain('Physical Attack (ATK):');
    expect(html).toContain('Physical Defense (DEF):');
    expect(html).toContain('(currentBase + 1)&sup2;');
    expect(html).toContain('4 Stat Points');
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

    // 1. Subtype does not repeat 'Creature — ' (shows 'Beast' instead of 'Creature — Beast')
    expect(html).toContain('<span class="tcg-type-main">CREATURE</span>');
    expect(html).toContain('<span class="tcg-type-sub">Beast</span>');
    expect(html).not.toContain('<span class="tcg-type-sub">Creature — Beast</span>');

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
      activeHook: {
        type: 'SHRINE',
        shrine: {
          coord: { col: 0, row: 1 },
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

    // 2. Stat converter options include right-click inspection attributes
    expect(html).toContain('data-inspect-stat="str"');
    expect(html).toContain('data-inspect-stat="dex"');
    expect(html).toContain('data-inspect-stat="agi"');
    expect(html).toContain('stat-info-pill');
  });

  it('correctly parses combat log entries with timestamps and assigns blue for You and red for enemies', () => {
    // 1. Player attack
    const heroEntry = parseCombatLogEntry(
      '[10:25:34] ⚔️ Played Melee ATK on Scavenger: rolled 2d6 = [6, 4] = 10 -> 🎯 HIT! Dealt 4 DMG.'
    );
    expect(heroEntry.timestamp).toBe('10:25:34');
    expect(heroEntry.actorType).toBe('hero');
    expect(heroEntry.actorLabel).toBe('You');

    // 2. Player passive (Steal)
    const stealEntry = parseCombatLogEntry(
      '[10:25:35] 💰 [Steal] Rolled a pair [3, 3]! Snatched +1 Gold (Total: 21 Gold).'
    );
    expect(stealEntry.timestamp).toBe('10:25:35');
    expect(stealEntry.actorType).toBe('hero');
    expect(stealEntry.actorLabel).toBe('You');

    // 3. Enemy attack (Pincer)
    const enemyEntry = parseCombatLogEntry(
      '[10:25:36] ⚔️ Pincer uses Shell Guard (2 DMG): rolled 2d6 = [3, 4] = 7 -> 🎯 HIT!'
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
      '[10:25:34] ⚔️ Played Melee ATK on Scavenger: rolled 2d6 = [6, 4] = 10 -> 🎯 HIT! Dealt 4 DMG.',
      '[10:25:36] ⚔️ Pincer uses Shell Guard (2 DMG): rolled 2d6 = [3, 4] = 7 -> 🎯 HIT!',
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
            '[10:25:34] ⚔️ Played Melee ATK on Pincer: rolled 2d6 = [5, 4] = 9 -> 🎯 HIT! Dealt 4 DMG.',
            '[10:25:38] ⚔️ Pincer uses Shell Guard (2 DMG): rolled 2d6 = [4, 4] = 8 -> 🎯 HIT!',
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

    // 1. Hero sidebar exists in combat
    expect(html).toContain('combat-hero-sidebar');
    expect(html).toContain('combat-hero-hp-bar');
    expect(html).toContain('10 / 16 HP');

    // 2. Natural DEF chip is visible in the combat hero sidebar
    expect(html).toContain('DEF');
    expect(html).toContain('ATK');

    // 3. Backpack section with consumable Health Potion has a "Use" button
    expect(html).toContain('combat-backpack-card');
    expect(html).toContain('Health Potion');
    expect(html).toContain('use-consumable-btn');
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

    // 1. On card face, Heavy Charge shows 7 DMG (not 6) and has flashing class
    expect(html).toContain('is-buffed-flashing');
    expect(html).toContain('<b>7</b> DMG');
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
            name: 'Charge Momentum',
            value: '+1 ATK',
            description: 'Momentum accelerates with each charge. Heavy Charge currently deals 7 DMG (Base 6 + 1 Boon).',
          },
        ],
      },
      state
    );

    expect(inspectHtml).toContain('inspect-boons-section');
    expect(inspectHtml).toContain('Charge Momentum');
    expect(inspectHtml).toContain('+1 ATK');
    expect(inspectHtml).toContain('is-buffed-flashing');
    expect(inspectHtml).toContain('Base 6 + 1 Boon');
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
            total: 9,
            netAcc: 2,
            neededRoll: 5,
            isHit: true,
            isCrit: false,
            isSnakeEyes: false,
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
    };

    const html = renderPlayArea(state, ui);

    // Shows absorbed by Hero DEF in dice outcome badge
    expect(html).toContain('absorbed by Hero DEF');
    expect(html).toContain('4 DMG');
    expect(html).toContain('2 absorbed by Hero DEF');
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

    // 2. Action inspect card (e.g. Melee ATK)
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
    expect(inspectHtml).toContain('+<b>2</b> HP');
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
    expect(combatHtml).toContain('+<b>2</b> HP');
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
    expect(html).toContain('Tabletop 2d6 Combat Rules');

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
    const css = fs.readFileSync(cssPath, 'utf-8');

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
        luckBonusGold: 1,
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
        luckBonusGold: 0,
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
});

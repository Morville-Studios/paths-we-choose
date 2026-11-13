import { describe, expect, it } from 'vitest';
import {
  chooseCard,
  getAvailableCoords,
  playCard,
  startAdventure,
} from '../core/engine';
import {
  attemptCombatFlee,
  createCombatSession,
  endPlayerCombatTurn,
} from '../core/combat';
import {
  buyItem,
  equipItem,
  prepareVillage,
  villageRest,
  sellItem,
  unequipItem,
  villageOpenShop,
  villageOpenTrain,
  villageTrainDraft,
  villageTrainRemove,
} from '../core/village';
import { grantShrineBoonOnEnter } from '../core/shrine';
import { upgradeBaseStat } from '../core/stats';
import { MONSTER_TEMPLATES } from '../data/monsters';
import { SHOP_ITEM_CATALOG } from '../data/shopItems';
import {
  gameLogModal,
  parseCombatLogEntry,
  renderPlayArea,
  UiState,
} from '../ui/render';
import { MonsterCard } from '../core/types';

describe('Unified Game Log & In-Place Combat Component', () => {
  it('initializes gameLog with embarkation and initial board deal on startAdventure', () => {
    const state = startAdventure('fighter', 'seed-test-log');
    expect(state.gameLog).toBeDefined();
    expect(state.gameLog!.length).toBeGreaterThanOrEqual(2);
    expect(state.gameLog![0]).toContain('Embarked on Scenario 1');
    expect(state.gameLog![1]).toContain('Dealt initial adventure board');
  });

  it('appends path choice and dealt horizon cards to gameLog on chooseCard', () => {
    let state = startAdventure('fighter', 'seed-step-log');
    const initialLogLength = state.gameLog!.length;
    const available = getAvailableCoords(state);
    expect(available.length).toBeGreaterThan(0);

    state = chooseCard(state, available[0]);
    expect(state.gameLog!.length).toBeGreaterThan(initialLogLength);
    expect(state.gameLog!.some((entry) => entry.includes('Chose path'))).toBe(true);
    expect(state.gameLog!.some((entry) => entry.includes('Dealt 3 Adventure cards to the horizon'))).toBe(true);
  });

  it('appends village actions (arrive, rest, buy, sell, equip, unequip, train, remove) to gameLog', () => {
    let state = startAdventure('fighter', 'seed-village-log');
    state = prepareVillage(state, { col: 0, row: 1 }, 1);
    expect(state.gameLog!.some((entry) => entry.includes('Arrived at'))).toBe(true);

    // Damage hero and rest
    state.playerResources!.hp = 10;
    state = villageRest(state, 1);
    expect(state.gameLog!.some((entry) => entry.includes('Rested at Village'))).toBe(true);

    // Open shop & populate stock
    state = villageOpenShop(state);
    const potion = { ...SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl1_health_potion')!, instanceId: 'stock_pot_1' };
    if (state.activeHook.type === 'VILLAGE') {
      state.activeHook.village.shopStock.push(potion);
    }

    // Buy item
    state = buyItem(state, 'stock_pot_1');
    expect(state.gameLog!.some((entry) => entry.includes('Bought Health Potion'))).toBe(true);

    // Sell item
    state = sellItem(state, 'stock_pot_1');
    expect(state.gameLog!.some((entry) => entry.includes('Sold Health Potion'))).toBe(true);

    // Equip & unequip
    const sword = SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl1_iron_sword')!;
    state.backpack.push({ ...sword, instanceId: 'inst_sword_1' });
    state = equipItem(state, 'inst_sword_1');
    expect(state.gameLog!.some((entry) => entry.includes('Equipped Iron Sword'))).toBe(true);

    state = unequipItem(state, 'weapon');
    expect(state.gameLog!.some((entry) => entry.includes('Unequipped Iron Sword'))).toBe(true);

    // Open training
    state = villageOpenTrain(state);
    const offer = state.playerMasterDeck[0];
    if (state.activeHook.type === 'VILLAGE') {
      state.activeHook.village.trainOptions = [offer];
    }
    state = villageTrainDraft(state, offer.instanceId);
    expect(state.gameLog!.some((entry) => entry.includes('Learned skill:'))).toBe(true);

    // Remove card
    state = villageTrainRemove(state, offer.instanceId);
    expect(state.gameLog!.some((entry) => entry.includes('Purged') && entry.includes('to the Void'))).toBe(true);
  });

  it('appends shrine visits and base stat upgrades to gameLog', () => {
    let state = startAdventure('fighter', 'seed-shrine-log');
    state = grantShrineBoonOnEnter(state, { col: 0, row: 1 }, 1);
    expect(state.gameLog!.some((entry) => entry.includes('Visited Sacred Shrine'))).toBe(true);

    state = upgradeBaseStat(state, 'str');
    expect(state.gameLog!.some((entry) => entry.includes('Upgraded Base STR'))).toBe(true);
  });

  it('appends combat actions, turns, and flee to gameLog continuously', () => {
    let state = startAdventure('fighter', 'seed-combat-stream');
    const goblin: MonsterCard = { ...MONSTER_TEMPLATES['goblin'], id: 'test_gob', maxHp: 30 };
    const session = createCombatSession([goblin], state.playerMasterDeck, 12345, 3);

    state = {
      ...state,
      activeHook: {
        type: 'COMBAT',
        combat: session.combat,
      },
      gameLog: [...(state.gameLog ?? []), ...session.combat.combatLog],
    };

    expect(state.gameLog!.some((entry) => entry.includes('Encountered Goblin'))).toBe(true);

    // Play card
    const card = session.combat.hand[0];
    const played = playCard(state, card.instanceId, 0);
    expect(played.gameLog!.some((entry) => entry.includes('Played'))).toBe(true);

    // End combat turn
    const ended = endPlayerCombatTurn(played);
    expect(ended.gameLog!.some((entry) => entry.includes('Combat Turn 2: Drew'))).toBe(true);

    // Flee combat
    const fled = attemptCombatFlee(ended);
    expect(fled.gameLog!.some((entry) => entry.includes('Escaped from battle') || entry.includes('Attempted to flee'))).toBe(true);
  });

  it('renders in-place combat component inside .play-main without modal backdrop wrapper', () => {
    let state = startAdventure('fighter', 'seed-combat-inplace');
    const goblin: MonsterCard = { ...MONSTER_TEMPLATES['goblin'], id: 'gob_01' };
    state = {
      ...state,
      welcomePreparing: false,
      activeHook: {
        type: 'COMBAT',
        combat: {
          combatTurn: 1,
          monsters: [{ monster: goblin, hp: 6, block: 0, patternIndex: 0 }],
          playerAp: 3,
          playerMaxAp: 3,
          playerBlock: 0,
          playerEvasionMod: 0,
          drawPile: [],
          hand: state.playerMasterDeck.slice(0, 3),
          discardPile: [],
          combatLog: ['[10:00:00] Encountered Goblin (Lvl 1, 6 HP)!'],
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

    // 1. Swapped into .play-main:
    expect(html).toContain('class="play-main is-combat-main"');
    expect(html).toContain('class="combat-view combat-component"');
    expect(html).toContain('class="combat-main-col"');
    expect(html).toContain('monster-carousel');

    // 2. NO modal backdrop wrapper around the whole battle area!
    expect(html).not.toContain('<div class="modal-backdrop combat">');
    expect(html).not.toContain('<div class="modal combat-modal">');

    // 3. Sidebars stay in main layout:
    expect(html).toContain('class="play-sidebar is-combat-hero"');
    expect(html).toContain('player-info-widget');
    expect(html).toContain('Character & Gear');
    expect(html).toContain('class="play-sidebar-right is-combat-right"');
    expect(html).toContain('combat-log-sidebar');
    expect(html).toContain('Action Deck');
    expect(html).toContain('📜 Battle Log');

    // 4. Top HUD remains visible with Turn Tracker & Log button:
    expect(html).toContain('hud-scenario-badge');
    expect(html).toContain('hud-log-btn');
    expect(html).toContain('boardgame-turn-tracker');
  });

  it('renders gameLogModal with all chronicle entries, timestamps, and actor categories', () => {
    let state = startAdventure('fighter', 'seed-chronicle');
    state.gameLog = [
      '[10:00:00] 🗺️ Embarked on Scenario 1 as a Fighter.',
      '[10:01:00] 🗺️ Turn 1: Chose path Forest Village (Row 1, Col 1).',
      '[10:02:00] 🏡 Arrived at Forest Village.',
      '[10:03:00] ✦ Visited Sacred Shrine: granted boon Blessing of Strength!',
      '[10:04:00] ⚔️ Played Slash on Goblin: rolled 3d6 = 9 -> 🎯 HIT! 5 DMG.',
      '[10:05:00] 🏆 Victory! Defeated Goblin! Claimed +1 SP and +3 Gold.',
    ];

    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
      showLog: true,
    };

    const modalHtml = gameLogModal(state, ui);
    expect(modalHtml).toContain('game-log-modal');
    expect(modalHtml).toContain('📜 Adventure Chronicle');
    expect(modalHtml).toContain('6 entries');
    expect(modalHtml).toContain('data-action="close-log"');
    expect(modalHtml).toContain('Return to Adventure');

    // Verify actor classes are parsed
    expect(modalHtml).toContain('actor-map');
    expect(modalHtml).toContain('actor-village');
    expect(modalHtml).toContain('actor-shrine');
    expect(modalHtml).toContain('actor-hero');
    expect(modalHtml).toContain('actor-system');
  });

  it('correctly categorizes all log entry types with parseCombatLogEntry', () => {
    expect(parseCombatLogEntry('[12:00:00] 🗺️ Turn 2: Chose path Grassland').actorType).toBe('map');
    expect(parseCombatLogEntry('[12:01:00] 🏡 Arrived at Grassland Village').actorType).toBe('village');
    expect(parseCombatLogEntry('[12:02:00] 🛏️ Rested at Village: restored 4 HP').actorType).toBe('village');
    expect(parseCombatLogEntry('[12:03:00] ✦ Visited Sacred Shrine').actorType).toBe('shrine');
    expect(parseCombatLogEntry('[12:04:00] ⚔️ Played Slash on Pincer').actorType).toBe('hero');
    expect(parseCombatLogEntry('[12:05:00] 🏆 Victory! Defeated Pincer').actorType).toBe('system');
    expect(parseCombatLogEntry('[12:06:00] Pincer uses Shell Guard').actorType).toBe('enemy');
  });

  it('renders Game Log directly below the main viewport rather than in the right sidebar on the map', () => {
    let state = startAdventure('fighter', 'seed-map-log-placement');
    state = { ...state, welcomePreparing: false };

    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
    };

    const html = renderPlayArea(state, ui);

    // 1. Log box is in .play-main below the board and banner:
    expect(html).toContain('class="play-main "');
    expect(html).toContain('main-viewport-log-box');
    expect(html).toContain('📜 Game Log');
    expect(html).toContain('main-viewport-recent-log');

    const boardIndex = html.indexOf('class="board"');
    const bannerIndex = html.indexOf('class="banner"');
    const logBoxIndex = html.indexOf('main-viewport-log-box');
    const rightSidebarIndex = html.indexOf('class="play-sidebar-right');

    expect(boardIndex).toBeGreaterThan(-1);
    expect(bannerIndex).toBeGreaterThan(boardIndex);
    expect(logBoxIndex).toBeGreaterThan(bannerIndex);
    expect(logBoxIndex).toBeLessThan(rightSidebarIndex);

    // 2. Right sidebar on map only has Decks & Discards, no log box:
    const rightSidebarHtmlStr = html.slice(rightSidebarIndex);
    expect(rightSidebarHtmlStr).not.toContain('main-viewport-log-box');
    expect(rightSidebarHtmlStr).not.toContain('sidebar-log-box');
    expect(rightSidebarHtmlStr).not.toContain('📜 Game Log');
    expect(rightSidebarHtmlStr).toContain('Decks &amp; Discards');
  });

  it('records targetIndex on attack rolls and preserves finalCombatState on victory for smooth death transitions', () => {
    const state = startAdventure('fighter', 'seed-vfx-test');
    const monster: MonsterCard = { ...MONSTER_TEMPLATES.goblin, maxHp: 1, id: 'gob_vfx' };
    const combatSession = createCombatSession([monster], state.playerMasterDeck, state.rngState);
    state.activeHook = { type: 'COMBAT', combat: combatSession.combat };

    const slashCard = combatSession.combat.hand.find((c) => c.cardType === 'attack');
    expect(slashCard).toBeDefined();

    const afterAttack = playCard(state, slashCard!.instanceId, 0);
    // Monster had 1 HP, slash hits or reduces HP to 0 -> victory
    if (afterAttack.activeHook.type === 'VICTORY') {
      const victory = afterAttack.activeHook.victory;
      expect(victory.finalCombatState).toBeDefined();
      expect(victory.finalCombatState!.monsters[0].hp).toBe(0);
      expect(victory.lastAttackRolls).toBeDefined();
      expect(victory.lastAttackRolls![0].targetIndex).toBe(0);
    } else if (afterAttack.activeHook.type === 'COMBAT') {
      expect(afterAttack.activeHook.combat.lastAttackRolls![0].targetIndex).toBe(0);
    }
  });
});

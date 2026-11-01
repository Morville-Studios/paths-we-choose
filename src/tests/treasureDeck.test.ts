import { describe, expect, it } from 'vitest';
import {
  buildStage1TreasureDeck,
  drawTreasureCardsWithReshuffle,
} from '../core/deck';
import {
  buyItem,
  chooseCard,
  finishVillage,
  sellItem,
  startAdventure,
  villageChooseShop,
  villageGoBack,
} from '../core/engine';
import { SHOP_ITEM_CATALOG } from '../data/shopItems';
import {
  cardInspectModal,
  getItemDisplayName,
  pileModal,
  renderPlayArea,
  renderTcgItemCard,
  UiState,
} from '../ui/render';

describe('Treasure Deck & Village Shop Draw Mechanics', () => {
  it('buildStage1TreasureDeck creates exactly 42 cards (all 21 catalog items x 2 copies)', () => {
    const { deck } = buildStage1TreasureDeck(12345);
    expect(deck.length).toBe(42);

    // Verify exactly 2 copies of each catalog item
    for (const tpl of SHOP_ITEM_CATALOG) {
      const copies = deck.filter((c) => c.id === tpl.id);
      expect(copies.length).toBe(2);
      const ids = copies.map((c) => c.instanceId).sort();
      expect(ids).toEqual([`tr_${tpl.id}_c1`, `tr_${tpl.id}_c2`]);
    }
  });

  it('new adventure starts with 42 treasure deck cards and 0 discard', () => {
    const s = startAdventure('fighter', 'seed-treasure-test');
    expect(s.treasureDeck.length).toBe(42);
    expect(s.treasureDiscard.length).toBe(0);
    expect(s.treasureReshuffleCount).toBe(0);
  });

  it('opening a village store draws 5 + villageLevel items from treasure deck into shopStock', () => {
    let s = startAdventure('fighter', 'seed-shop-draw');
    const avail = Object.values(s.board).find((n) => n.status === 'available');
    expect(avail).toBeDefined();
    if (!avail) return;

    // Put a Level 1 village on the available tile
    s = {
      ...s,
      board: {
        ...s.board,
        [`${avail.coord.col},${avail.coord.row}`]: {
          ...avail,
          card: {
            ...avail.card,
            hasVillage: true,
            hasHostile: false,
            hasShrine: false,
            level: 1,
          },
        },
      },
    };

    // Step onto village
    const inVillage = chooseCard(s, avail.coord);
    expect(inVillage.activeHook.type).toBe('VILLAGE');
    if (inVillage.activeHook.type !== 'VILLAGE') return;
    // Stock is prepared on entry, before Shop is opened.
    expect(inVillage.activeHook.village.shopStock.length).toBe(6);
    expect(inVillage.treasureDeck.length + inVillage.treasureDiscard.length).toBe(36);
    const preparedStock = inVillage.activeHook.village.shopStock;

    // Open shop
    const inShop = villageChooseShop(inVillage);
    expect(inShop.activeHook.type).toBe('VILLAGE');
    if (inShop.activeHook.type !== 'VILLAGE') return;

    const village = inShop.activeHook.village;
    expect(village.subView).toBe('shop');
    // 5 + 1 = 6 items drawn
    expect(village.shopStock.length).toBe(6);
    expect(village.shopStock).toEqual(preparedStock);
    expect(inShop.treasureDeck.length + inShop.treasureDiscard.length).toBe(36);
    expect(village.shopStock.every(item => (item.level ?? 1) === 1)).toBe(true);
    expect(inShop.treasureDiscard.every(item => item.level !== 1)).toBe(true);
  });

  it('opening a level 2 village store draws 5 + 2 = 7 items', () => {
    let s = startAdventure('wizard', 'seed-lvl2-shop');
    const avail = Object.values(s.board).find((n) => n.status === 'available');
    expect(avail).toBeDefined();
    if (!avail) return;

    s = {
      ...s,
      board: {
        ...s.board,
        [`${avail.coord.col},${avail.coord.row}`]: {
          ...avail,
          card: {
            ...avail.card,
            hasVillage: true,
            hasHostile: false,
            hasShrine: false,
            level: 2,
          },
        },
      },
    };

    const inVillage = chooseCard(s, avail.coord);
    const inShop = villageChooseShop(inVillage);
    if (inShop.activeHook.type !== 'VILLAGE') return;

    expect(inShop.activeHook.village.shopStock.length).toBe(7);
    expect(inShop.treasureDeck.length + inShop.treasureDiscard.length).toBe(35);
    expect(inShop.activeHook.village.shopStock.every(item => item.level === 2)).toBe(true);
  });

  it('going back to menu before purchasing retains shopStock and does not re-draw', () => {
    let s = startAdventure('fighter', 'seed-back-menu');
    const avail = Object.values(s.board).find((n) => n.status === 'available')!;
    s = {
      ...s,
      board: {
        ...s.board,
        [`${avail.coord.col},${avail.coord.row}`]: {
          ...avail,
          card: { ...avail.card, hasVillage: true, hasHostile: false, hasShrine: false, level: 1 },
        },
      },
    };

    const inVillage = chooseCard(s, avail.coord);
    const inShop = villageChooseShop(inVillage);
    if (inShop.activeHook.type !== 'VILLAGE') return;
    const initialDrawn = inShop.activeHook.village.shopStock;
    expect(initialDrawn.length).toBe(6);

    // Go back to main menu
    const back = villageGoBack(inShop);
    if (back.activeHook.type !== 'VILLAGE') return;
    expect(back.activeHook.village.subView).toBe('main');
    expect(back.treasureDeck).toEqual(inShop.treasureDeck);
    expect(back.treasureDiscard).toEqual(inShop.treasureDiscard);

    // Re-open shop
    const reOpen = villageChooseShop(back);
    if (reOpen.activeHook.type !== 'VILLAGE') return;
    expect(reOpen.activeHook.village.shopStock).toEqual(initialDrawn);
    expect(reOpen.treasureDeck).toEqual(inShop.treasureDeck);
    expect(reOpen.treasureDiscard).toEqual(inShop.treasureDiscard);
  });

  it('buying an item removes it from shopStock, equips/adds to backpack, and deducts gold', () => {
    let s = startAdventure('fighter', 'seed-buy-item');
    s = { ...s, playerResources: { ...s.playerResources!, gold: 100 } };
    const avail = Object.values(s.board).find((n) => n.status === 'available')!;
    s = {
      ...s,
      board: {
        ...s.board,
        [`${avail.coord.col},${avail.coord.row}`]: {
          ...avail,
          card: { ...avail.card, hasVillage: true, hasHostile: false, hasShrine: false, level: 1 },
        },
      },
    };

    const inVillage = chooseCard(s, avail.coord);
    const inShop = villageChooseShop(inVillage);
    if (inShop.activeHook.type !== 'VILLAGE') return;

    const targetItem = inShop.activeHook.village.shopStock[0];
    const initialGold = inShop.playerResources!.gold;
    const initialStockLen = inShop.activeHook.village.shopStock.length;

    const afterBuy = buyItem(inShop, targetItem.instanceId!);
    if (afterBuy.activeHook.type !== 'VILLAGE') return;

    // Remaining stock has 1 less card
    expect(afterBuy.activeHook.village.shopStock.length).toBe(initialStockLen - 1);
    expect(afterBuy.activeHook.village.shopStock.find((i) => i.instanceId === targetItem.instanceId)).toBeUndefined();
    const backToMenu = villageGoBack(afterBuy);
    expect(backToMenu.activeHook.type === 'VILLAGE' && backToMenu.activeHook.village.subView).toBe('main');
    expect(afterBuy.playerResources!.gold).toBeLessThan(initialGold);

    // Item is held by player
    const isHeld =
      afterBuy.backpack.some((i) => i.instanceId === targetItem.instanceId) ||
      Object.values(afterBuy.equippedGear).some((g) => g?.instanceId === targetItem.instanceId);
    expect(isHeld).toBe(true);
  });

  it('leaving the village discards remaining unbought shop cards into treasureDiscard', () => {
    let s = startAdventure('fighter', 'seed-discard-on-leave');
    const avail = Object.values(s.board).find((n) => n.status === 'available')!;
    s = {
      ...s,
      board: {
        ...s.board,
        [`${avail.coord.col},${avail.coord.row}`]: {
          ...avail,
          card: { ...avail.card, hasVillage: true, hasHostile: false, hasShrine: false, level: 1 },
        },
      },
    };

    const inVillage = chooseCard(s, avail.coord);
    const inShop = villageChooseShop(inVillage);
    if (inShop.activeHook.type !== 'VILLAGE') return;

    const unboughtCount = inShop.activeHook.village.shopStock.length;
    expect(unboughtCount).toBe(6);
    const rejectedCount = inShop.treasureDiscard.length;

    // Leave village
    const left = finishVillage(inShop);
    expect(left.activeHook.type).toBe('NONE');
    expect(left.treasureDiscard.length).toBe(rejectedCount + unboughtCount);
    expect(left.treasureDeck).toEqual(inShop.treasureDeck);
  });

  it('selling an item puts it into treasureDiscard', () => {
    let s = startAdventure('fighter', 'seed-sell-discard');
    s = { ...s, playerResources: { ...s.playerResources!, gold: 100 } };
    const avail = Object.values(s.board).find((n) => n.status === 'available')!;
    s = {
      ...s,
      board: {
        ...s.board,
        [`${avail.coord.col},${avail.coord.row}`]: {
          ...avail,
          card: { ...avail.card, hasVillage: true, hasHostile: false, hasShrine: false, level: 1 },
        },
      },
    };

    const inVillage = chooseCard(s, avail.coord);
    const inShop = villageChooseShop(inVillage);
    if (inShop.activeHook.type !== 'VILLAGE') return;

    // Buy an item first
    const boughtItem = inShop.activeHook.village.shopStock[0];
    const afterBuy = buyItem(inShop, boughtItem.instanceId!);

    const discardBefore = afterBuy.treasureDiscard.length;
    const afterSell = sellItem(afterBuy, boughtItem.instanceId!);

    expect(afterSell.treasureDiscard.length).toBe(discardBefore + 1);
    expect(afterSell.treasureDiscard.some((i) => i.instanceId === boughtItem.instanceId)).toBe(true);
  });

  it('drawTreasureCardsWithReshuffle reshuffles discard pile when deck runs empty', () => {
    const { deck } = buildStage1TreasureDeck(42);
    // 3 cards left in deck, 10 cards in discard
    const smallDeck = deck.slice(0, 3);
    const discardPile = deck.slice(3, 13);

    // Draw 6 cards: needs 3 from deck + 3 from reshuffled discard
    const r = drawTreasureCardsWithReshuffle(smallDeck, discardPile, 6, 9999, 0);
    expect(r.drawn.length).toBe(6);
    expect(r.deck.length).toBe(7); // 10 - 3 = 7 left in new deck
    expect(r.discard.length).toBe(0);
    expect(r.reshuffleCount).toBe(1);
  });

  it('pileModal renders treasure deck and discard with unique card multipliers', () => {
    const s = startAdventure('fighter', 'seed-pile-render');
    const deckModalHtml = pileModal('treasure_deck', s);
    expect(deckModalHtml).toContain('Treasure Deck');
    expect(deckModalHtml).toContain('42 cards total');
    expect(deckModalHtml).toContain('<b>21</b> unique card types');
    expect(deckModalHtml).toContain('&times;2'); // 2 copies of each card

    const discardModalHtml = pileModal('treasure_discard', s);
    expect(discardModalHtml).toContain('Treasure Discard Pile');
    expect(discardModalHtml).toContain('This pile is empty');
  });

  it('HUD displays treasure deck and discard counter', () => {
    const s = startAdventure('fighter', 'seed-hud-treasure');
    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
    };
    const html = renderPlayArea(s, ui);
    expect(html).toContain('Treasure 42 / 0 discard');
  });

  it('renders full-art physical TCG item card according to layout specifications', () => {
    // Check clean name extraction
    expect(getItemDisplayName('LVL 1 Health Potion')).toBe('Health Potion');
    expect(getItemDisplayName('LVL 1 Chainmail')).toBe('Chainmail');
    expect(getItemDisplayName('LVL 1 Iron Sword')).toBe('Iron Sword');

    const chainmail = SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl1_chainmail')!;
    const cardHtml = renderTcgItemCard(chainmail);

    // 1. Full-art raster layer
    expect(cardHtml).toContain('class="tcg-card tcg-item tcg-template-item');
    expect(cardHtml).toContain('class="tcg-art-window item-art-window"');
    expect(cardHtml).toContain('class="tcg-art-raster item-raster"');
    expect(cardHtml).toContain('/cards/items/chainmail.jpg');

    // 2. Header only has the card name without LVL 1 (no level badge, no slot icon on top)
    expect(cardHtml).toContain('<span class="tcg-name">Chainmail</span>');
    expect(cardHtml).not.toContain('<span class="tcg-name">LVL 1 Chainmail</span>');
    expect(cardHtml).not.toContain('class="tcg-header-right"');
    expect(cardHtml).not.toContain('class="tcg-item-slot-badge"');

    // 3. Open artwork showcase spacer
    expect(cardHtml).toContain('tcg-item-art-spacer');

    // 4. Header meta stack: stacked 2 lines (Equipment on line 1, Armor + icon on line 2), level on right, no broken dash
    expect(cardHtml).toContain('tcg-item-type-stacked');
    expect(cardHtml).toContain('tcg-item-type-main');
    expect(cardHtml).toContain('Equipment');
    expect(cardHtml).toContain('Armor <span class="item-type-icon"><img src="/icons/slot-armor.png"');
    expect(cardHtml).toContain('tcg-item-level-ribbon');
    expect(cardHtml).toContain('Lvl 1');
    expect(cardHtml).not.toContain('Equipment — Armor');
    expect(cardHtml).not.toContain('&#10022; ITM');
    expect(cardHtml).not.toContain('&bull; ITM');
    expect(cardHtml).not.toContain('✦ ITM');

    // 5. Description textbox only shows important gameplay text (no flavor text on card face)
    expect(cardHtml).toContain('class="tcg-textbox"');
    expect(cardHtml).toContain('Armor Slot: +1 DEF (reduces incoming physical attack damage).');
    expect(cardHtml).not.toContain('Interlinked iron rings that blunt claws, teeth, and blade edges upon impact.');

    // 6. Footer has collector number but NO stat badge (+1 DEF badge removed)
    expect(cardHtml).toContain('ITM · #006');
    expect(cardHtml).not.toContain('item-stat-badge');
    expect(cardHtml).not.toContain('tcg-pt-badge');
  });

  it('mini card icon format omits footer and flavor text to conserve space for essential details', () => {
    const healthPotion = SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl1_health_potion')!;
    const miniHtml = renderTcgItemCard(healthPotion, { isMini: true });

    // Header has clean name
    expect(miniHtml).toContain('<span class="tcg-name">Health Potion</span>');
    expect(miniHtml).not.toContain('LVL 1 Health Potion');

    // Stacked type line: Item / Consumable
    expect(miniHtml).toContain('tcg-item-type-main');
    expect(miniHtml).toContain('Item');
    expect(miniHtml).toContain('Consumable <span class="item-type-icon">🧪</span>');
    expect(miniHtml).toContain('tcg-item-level-ribbon');
    expect(miniHtml).toContain('Lvl 1');

    // Description is present, flavor text is omitted to conserve space
    expect(miniHtml).toContain('Restores 10 HP immediately when used.');
    expect(miniHtml).not.toContain('Brewed with wild meadow blossoms');

    // Footer is omitted in mini card
    expect(miniHtml).not.toContain('class="tcg-footer"');
    expect(miniHtml).not.toContain('ITM · #001');
    expect(miniHtml).toContain('is-mini');
  });

  it('cardInspectModal renders item cards using the full-art card format with clean name and stacked type line', () => {
    const s = startAdventure('fighter', 'seed-inspect-test');
    const chainmail = SHOP_ITEM_CATALOG.find((i) => i.id === 'lvl1_chainmail')!;
    const modalHtml = cardInspectModal(
      {
        kind: 'item',
        item: { ...chainmail, instanceId: 'tr_lvl1_chainmail_c1' },
      },
      s
    );

    expect(modalHtml).toContain('tcg-inspect-card');
    expect(modalHtml).toContain('item-art-window');
    expect(modalHtml).toContain('<span class="tcg-name">Chainmail</span>');
    expect(modalHtml).toContain('tcg-item-type-main');
    expect(modalHtml).toContain('Equipment');
    expect(modalHtml).toContain('Armor <span class="item-type-icon"><img src="/icons/slot-armor.png"');
    expect(modalHtml).toContain('tcg-item-level-ribbon');
    expect(modalHtml).not.toContain('item-stat-badge');
  });
});

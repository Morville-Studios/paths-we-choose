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
  startNextMission,
  unequipItem,
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
  it('buildStage1TreasureDeck places Level 1-2 items (43 cards) in deck and Level 3+ items (5 cards) in void', () => {
    const { deck, void: treasureVoid } = buildStage1TreasureDeck(12345);
    expect(deck.length).toBe(43);
    expect(treasureVoid.length).toBe(5);
    expect(deck.every((c) => (c.level ?? 1) >= 1 && (c.level ?? 1) <= 2)).toBe(true);
    expect(treasureVoid.every((c) => (c.level ?? 1) > 2)).toBe(true);

    const allCards = [...deck, ...treasureVoid];
    expect(allCards.length).toBe(48);

    const expectedCounts: Record<string, number> = {
      lvl1_health_potion: 5,
      lvl2_health_potion: 4,
      lvl3_health_potion: 3,
      lvl4_health_potion: 2,
    };
    for (const tpl of SHOP_ITEM_CATALOG) {
      const copies = allCards.filter((c) => c.id === tpl.id);
      const expected = expectedCounts[tpl.id] ?? 2;
      expect(copies.length).toBe(expected);
      const ids = copies.map((c) => c.instanceId).sort();
      expect(ids).toEqual(Array.from({ length: expected }, (_, idx) => `tr_${tpl.id}_c${idx + 1}`));
    }
  });

  it('new adventure pulls starting gear and starting village shop stock from the Scenario 1 Level 1-2 deck, keeping Level 3+ in treasureVoid', () => {
    const s = startAdventure('fighter', 'seed-treasure-test');
    const shopStockCount = s.activeHook.type === 'VILLAGE' ? s.activeHook.village.shopStock.length : 0;
    expect(shopStockCount).toBe(4);
    expect(s.treasureDeck.length + s.treasureDiscard.length + shopStockCount).toBe(41);
    expect(s.treasureVoid?.length).toBe(5);
    expect(s.treasureReshuffleCount).toBe(0);
    // Physical supply conservation: 41 in Scenario 1 deck/discard/shop + 2 equipped starting gear + 5 in treasureVoid = 48
    const allDeckCards = [
      ...s.treasureDeck,
      ...s.treasureDiscard,
      ...(s.activeHook.type === 'VILLAGE' ? s.activeHook.village.shopStock : []),
    ];
    expect(allDeckCards.every((c) => (c.level ?? 1) <= 2)).toBe(true);
    expect(allDeckCards.filter((c) => c.id === 'lvl1_iron_sword')).toHaveLength(1);
    expect(allDeckCards.filter((c) => c.id === 'lvl1_chainmail')).toHaveLength(1);
  });

  it('opening a village store draws 3 + villageLevel unique exact-level items from treasure deck into shopStock', () => {
    let s = finishVillage(startAdventure('fighter', 'seed-shop-draw'));
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
    expect(inVillage.activeHook.village.shopStock.length).toBe(4);
    expect(inVillage.treasureDeck.length + inVillage.treasureDiscard.length).toBe(37);
    const preparedStock = inVillage.activeHook.village.shopStock;

    // Open shop
    const inShop = villageChooseShop(inVillage);
    expect(inShop.activeHook.type).toBe('VILLAGE');
    if (inShop.activeHook.type !== 'VILLAGE') return;

    const village = inShop.activeHook.village;
    expect(village.subView).toBe('shop');
    // 3 + 1 = 4 unique Level 1 items drawn
    expect(village.shopStock.length).toBe(4);
    expect(village.shopStock).toEqual(preparedStock);
    expect(new Set(village.shopStock.map(item => item.id)).size).toBe(4);
    expect(inShop.treasureDeck.length + inShop.treasureDiscard.length).toBe(37);
    expect(village.shopStock.every(item => (item.level ?? 1) === 1)).toBe(true);
    const stockIds = new Set(village.shopStock.map(item => item.id));
    const newlyDiscarded = inShop.treasureDiscard.slice(s.treasureDiscard.length);
    expect(newlyDiscarded.every(item => item.level !== 1 || stockIds.has(item.id))).toBe(true);
  });

  it('opening a level 2 village store draws 3 + 2 = 5 unique Level 2 items', () => {
    let s = finishVillage(startAdventure('wizard', 'seed-lvl2-shop'));
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

    expect(inShop.activeHook.village.shopStock.length).toBe(5);
    expect(inShop.treasureDeck.length + inShop.treasureDiscard.length).toBe(36);
    expect(inShop.activeHook.village.shopStock.every(item => item.level === 2)).toBe(true);
    expect(new Set(inShop.activeHook.village.shopStock.map(item => item.id)).size).toBe(5);
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
    expect(initialDrawn.length).toBe(4);

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
    expect(unboughtCount).toBe(4);
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

    // Buy an item first; if it auto-equipped, verify it cannot be sold while equipped, then unequip
    const boughtItem = inShop.activeHook.village.shopStock[0];
    let afterBuy = buyItem(inShop, boughtItem.instanceId!);
    const equippedSlot = (['weapon', 'armor', 'accessory'] as const).find(
      (slot) => afterBuy.equippedGear[slot]?.instanceId === boughtItem.instanceId
    );
    if (equippedSlot) {
      const blocked = sellItem(afterBuy, boughtItem.instanceId!);
      expect(blocked.playerResources?.gold).toBe(afterBuy.playerResources?.gold);
      afterBuy = unequipItem(afterBuy, equippedSlot);
    }

    const discardBefore = afterBuy.treasureDiscard.length;
    const afterSell = sellItem(afterBuy, boughtItem.instanceId!);

    expect(afterSell.treasureDiscard.length).toBe(discardBefore);
    expect(afterSell.voidItems?.some((i) => i.instanceId === boughtItem.instanceId)).toBe(true);
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
    const s = finishVillage(startAdventure('fighter', 'seed-pile-render'));
    const deckModalHtml = pileModal('treasure_deck', s);
    expect(deckModalHtml).toContain('Treasure Deck');
    expect(deckModalHtml).toContain(`${s.treasureDeck.length} cards total`);
    expect(deckModalHtml).toContain('unique card types');
    expect(deckModalHtml).toContain('&times;');

    const discardModalHtml = pileModal('treasure_discard', s);
    expect(discardModalHtml).toContain('Treasure Discard Pile');
    expect(discardModalHtml).toContain(`${s.treasureDiscard.length} cards total`);
  });

  it('sidebar displays treasure deck and discard counter', () => {
    const s = startAdventure('fighter', 'seed-hud-treasure');
    const ui: UiState = {
      selectedClass: 'fighter',
      showDeck: false,
      villageTab: 'buy',
      targetIndex: 0,
    };
    const html = renderPlayArea(s, ui);
    expect(html).toContain('Treasure Cards');
    expect(html).toContain('data-pile-group="treasure"');
    expect(html).toContain('data-pile="treasure_deck"');
    expect(html).toContain('data-pile="treasure_discard"');
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
    expect(miniHtml).toContain('Restores 5 HP immediately when used.');
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

  it('startNextMission swaps treasureDeck to [scenarioLevel, scenarioLevel + 1] and keeps unused cards in treasureVoid', () => {
    // Scenario 1: Level 1-2 in treasureDeck/shop/discard, Level 3-4 in treasureVoid
    let s1 = startAdventure('fighter', 'seed-scenario-treasure-transition');
    const getActiveShopStock = (st: typeof s1) =>
      st.activeHook.type === 'VILLAGE' ? st.activeHook.village.shopStock : [];

    const s1InPlay = [...s1.treasureDeck, ...s1.treasureDiscard, ...getActiveShopStock(s1)];
    expect(s1InPlay.every((item) => (item.level ?? 1) >= 1 && (item.level ?? 1) <= 2)).toBe(true);
    expect((s1.treasureVoid ?? []).length).toBe(5);
    expect((s1.treasureVoid ?? []).every((item) => (item.level ?? 1) >= 3)).toBe(true);

    // Sell a starting item so it enters voidItems (permanently banished)
    const swordEntry = Object.entries(s1.equippedGear).find(([, g]) => g?.id === 'lvl1_iron_sword');
    const sword = swordEntry?.[1];
    expect(sword?.id).toBe('lvl1_iron_sword');
    if (!swordEntry || !sword?.instanceId) return;
    s1 = villageChooseShop(s1);
    s1 = unequipItem(s1, swordEntry[0] as keyof typeof s1.equippedGear);
    s1 = sellItem(s1, sword.instanceId);
    expect((s1.voidItems ?? []).some((i) => i.instanceId === sword.instanceId)).toBe(true);

    // Advance to Scenario 2: Level 2-3 in treasureDeck/shop/discard, Level 1 & Level 4 in treasureVoid
    const s2 = startNextMission(s1);
    expect(s2.scenarioLevel).toBe(2);
    const s2InPlay = [...s2.treasureDeck, ...s2.treasureDiscard, ...getActiveShopStock(s2)];
    expect(s2InPlay.every((item) => (item.level ?? 1) >= 2 && (item.level ?? 1) <= 3)).toBe(true);
    expect((s2.treasureVoid ?? []).every((item) => {
      const lvl = item.level ?? 1;
      return lvl < 2 || lvl > 3;
    })).toBe(true);
    // Permanently banished voidItems must not return to treasureDeck or treasureVoid
    expect(s2InPlay.some((i) => i.instanceId === sword.instanceId)).toBe(false);
    expect((s2.treasureVoid ?? []).some((i) => i.instanceId === sword.instanceId)).toBe(false);
    // Remaining owned gear (chainmail) must stay out of both treasureDeck and treasureVoid
    const chainmail = s2.equippedGear.armor;
    expect(chainmail?.instanceId).toBeDefined();
    expect(s2InPlay.some((i) => i.instanceId === chainmail?.instanceId)).toBe(false);
    expect((s2.treasureVoid ?? []).some((i) => i.instanceId === chainmail?.instanceId)).toBe(false);

    // Advance to Scenario 3: Level 3-4 in treasureDeck/shop/discard, Level 1-2 in treasureVoid
    const s3 = startNextMission(s2);
    expect(s3.scenarioLevel).toBe(3);
    const s3InPlay = [...s3.treasureDeck, ...s3.treasureDiscard, ...getActiveShopStock(s3)];
    expect(s3InPlay.every((item) => (item.level ?? 1) >= 3 && (item.level ?? 1) <= 4)).toBe(true);
    expect((s3.treasureVoid ?? []).every((item) => (item.level ?? 1) <= 2)).toBe(true);
  });
});

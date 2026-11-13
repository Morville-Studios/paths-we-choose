import { toGridKey } from '../core/grid';
import type { InspectedCardInfo, MonsterTemplateId, RunState } from '../core/types';
import { createCombatCardInstance, createFleeCard, FLEE_CARD_ID } from '../data/combatCards';
import { MONSTER_TEMPLATES } from '../data/monsters';
import { SHOP_ITEM_CATALOG } from '../data/shopItems';
import { ADVENTURE_CARD_CATALOG } from '../data/stages';
import { getAdventureCardName } from '../ui/render';

/** Resolves full card, monster, adventure tile, or item inspection details from a DOM element's dataset. */
export function findInspectedCard(state: RunState, cardEl: HTMLElement): InspectedCardInfo | null {
  const {
    inspectKind,
    cardId,
    cardInstance,
    monsterId,
    monsterIndex,
    nodeCol,
    nodeRow,
    boardKey,
    adventureCardName,
    adventureCardNumber,
  } = cardEl.dataset;

  if (inspectKind === 'action') {
    if (state.activeHook.type === 'COMBAT') {
      const fromHand = state.activeHook.combat.hand.find((c) => c.instanceId === cardInstance);
      if (fromHand) return { kind: 'action', card: fromHand };
    }
    const fromDeck = state.playerMasterDeck.find((c) => c.instanceId === cardInstance);
    if (fromDeck) return { kind: 'action', card: fromDeck };

    const fromNewSkills = [...state.newSkillsDeck, ...state.newSkillsDiscard].find(
      (c) => c.instanceId === cardInstance
    );
    if (fromNewSkills) return { kind: 'action', card: fromNewSkills };

    if (state.activeHook.type === 'VILLAGE') {
      const fromTrain = state.activeHook.village.trainOptions.find(
        (c) => c.instanceId === cardInstance
      );
      if (fromTrain) return { kind: 'action', card: fromTrain };
    }

    if (cardId === FLEE_CARD_ID) {
      return { kind: 'action', card: createFleeCard(state.playerClass ?? 'fighter') };
    }
    if (cardId) {
      try {
        return { kind: 'action', card: createCombatCardInstance(cardId, 'inspect') };
      } catch {
        // Ignore unknown catalog IDs during DOM inspection.
      }
    }
    return null;
  }

  if (inspectKind === 'monster') {
    if (state.activeHook.type === 'COMBAT') {
      const idx = Number(monsterIndex);
      const cm = state.activeHook.combat.monsters[idx];
      if (cm) {
        const boons: { name: string; description: string; value: string }[] = [];
        const bonus = cm.attackBonus ?? 0;
        if (bonus > 0) {
          const damagingIntent = cm.monster.pattern.find((intent) => intent.damage > 0);
          const baseDamage = damagingIntent?.damage ?? 0;
          boons.push({
            name: cm.monster.templateId === 'bullwark' ? 'Chaotic Impulse' : 'Temporary Attack Boon',
            value: `+${bonus} ATK`,
            description: damagingIntent
              ? `${damagingIntent.label} currently deals ${baseDamage + bonus} DMG (Base ${baseDamage} + ${bonus} Boon).`
              : `Gains +${bonus} ATK while this temporary boon remains active.`,
          });
        }
        if (cm.evaBonus && cm.evaBonus > 0) {
          boons.push({
            name: 'Stalking Evasion',
            value: `+${cm.evaBonus} EVA`,
            description: `Carefully stalks prey from concealment, gaining +${cm.evaBonus} EVA against incoming attacks this round.`,
          });
        }
        if (cm.accBonus && cm.accBonus > 0) {
          boons.push({
            name: cm.monster.templateId === 'bullwark' ? 'Chaotic Impulse' : 'Lunging Accuracy',
            value: `+${cm.accBonus} ACC`,
            description:
              cm.monster.templateId === 'bullwark'
                ? `Chaotic Impulse grants +${cm.accBonus} ACC to Bullwark's next action.`
                : `Leaps forward with predatory precision, gaining +${cm.accBonus} ACC on attack rolls this round.`,
          });
        }
        if (cm.block > 0) {
          boons.push({
            name: 'Active Block',
            value: `+${cm.block} Block`,
            description: 'Absorbs incoming attack damage before creature HP is reduced.',
          });
        }
        return {
          kind: 'monster',
          monster: cm.monster,
          currentHp: cm.hp,
          block: cm.block,
          attackBonus: cm.attackBonus,
          accBonus: cm.accBonus,
          evaBonus: cm.evaBonus,
          activeBoons: boons,
        };
      }
    }
    if (monsterId && monsterId in MONSTER_TEMPLATES) {
      const tpl = MONSTER_TEMPLATES[monsterId as MonsterTemplateId];
      return { kind: 'monster', monster: { ...tpl, id: `monster_${monsterId}_inspect` } };
    }
    return null;
  }

  if (inspectKind === 'adventure') {
    if (boardKey && state.board[boardKey]) {
      return { kind: 'adventure', card: state.board[boardKey].card };
    }
    if (nodeCol !== undefined && nodeRow !== undefined) {
      const gridKey = toGridKey(Number(nodeCol), Number(nodeRow));
      if (state.board[gridKey]) {
        return { kind: 'adventure', card: state.board[gridKey].card };
      }
      const rawKey = `${nodeCol},${nodeRow}`;
      if (state.board[rawKey]) {
        return { kind: 'adventure', card: state.board[rawKey].card };
      }
    }
    if (cardId) {
      const foundNode = Object.values(state.board).find((n) => n.card.id === cardId);
      if (foundNode) return { kind: 'adventure', card: foundNode.card };
    }
    if (adventureCardNumber) {
      const fromDeck = state.adventureDeck.find((c) => c.cardNumber === adventureCardNumber);
      if (fromDeck) return { kind: 'adventure', card: fromDeck };
      const fromDiscard = state.adventureDiscard.find((c) => c.cardNumber === adventureCardNumber);
      if (fromDiscard) return { kind: 'adventure', card: fromDiscard };
      if (adventureCardNumber in ADVENTURE_CARD_CATALOG) {
        const def = ADVENTURE_CARD_CATALOG[adventureCardNumber];
        return {
          kind: 'adventure',
          card: {
            id: `inspect_${def.cardCode}`,
            name: def.name,
            terrain: def.terrain,
            level: def.level,
            hasHostile: def.hasHostile,
            hasVillage: def.hasVillage,
            hasShrine: def.hasShrine,
            revealed: true,
            cardNumber: def.cardCode,
            flavorText: def.flavorText,
          },
        };
      }
    }
    if (adventureCardName) {
      const fromDeck = state.adventureDeck.find(
        (c) => (c.name || getAdventureCardName(c)) === adventureCardName
      );
      if (fromDeck) return { kind: 'adventure', card: fromDeck };
      const fromDiscard = state.adventureDiscard.find(
        (c) => (c.name || getAdventureCardName(c)) === adventureCardName
      );
      if (fromDiscard) return { kind: 'adventure', card: fromDiscard };
    }
    return null;
  }

  if (inspectKind === 'item') {
    const { itemId, itemInstance } = cardEl.dataset;
    if (state.activeHook.type === 'VILLAGE' && state.activeHook.village.shopStock) {
      const inStock = state.activeHook.village.shopStock.find(
        (i) => (itemInstance && i.instanceId === itemInstance) || i.id === itemId
      );
      if (inStock) return { kind: 'item', item: inStock };
    }
    if (itemInstance) {
      const inDeck = state.treasureDeck.find((i) => i.instanceId === itemInstance);
      if (inDeck) return { kind: 'item', item: inDeck };
      const inDiscard = state.treasureDiscard.find((i) => i.instanceId === itemInstance);
      if (inDiscard) return { kind: 'item', item: inDiscard };

      for (const slot of ['weapon', 'armor', 'accessory'] as const) {
        if (state.equippedGear[slot]?.instanceId === itemInstance) {
          return { kind: 'item', item: state.equippedGear[slot]! };
        }
      }
      const inBackpack = state.backpack.find((i) => i.instanceId === itemInstance);
      if (inBackpack) return { kind: 'item', item: inBackpack };
    }
    if (itemId) {
      const cat = SHOP_ITEM_CATALOG.find((i) => i.id === itemId);
      if (cat) {
        return { kind: 'item', item: { ...cat, instanceId: itemInstance || `inspect_${cat.id}` } };
      }
    }
  }

  return null;
}

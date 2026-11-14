import { shuffleArray } from '../core/rng';
import { PathCard } from '../core/types';

export const ENEMY_CAMP_DECK_COUNT = 5;
export const MERCHANT_DECK_COUNT = 2;
export const SANCTUARY_DECK_COUNT = 2;
export const AMBUSH_DECK_COUNT = 2;
export const MAGICAL_CHEST_DECK_COUNT = 1;
export const TRAPPED_CHEST_DECK_COUNT = 1;
export const GOLD_STASH_DECK_COUNT = 2;
export const SPRING_TRAP_DECK_COUNT = 2;

export interface PathCardCatalogEntry extends Omit<PathCard, 'id'> {
  copies: number;
  flavorText: string;
}

export const PATH_CARD_CATALOG: PathCardCatalogEntry[] = [
  {
    templateId: 'enemy_camp',
    name: 'Enemy Camp',
    cardNumber: 'PTH · #001',
    copies: ENEMY_CAMP_DECK_COUNT,
    challengeLabel: 'Sneak: AGI − Lvl×2 | Loot: DEX − Lvl×2',
    description:
      'Sneak: AGI − Lvl×2 (Fail: Encounter; Flee forfeits Loot). Loot: DEX − Lvl×2 (Draw Treasure ≤ Lvl).',
    flavorText:
      'You wander into an enemy camp and spot hostiles ahead. Perform an AGI Sneak Check (AGI − Terrain Lvl × 2) to slip past unnoticed; on failure, fight them as an Encounter (fleeing forfeits treasure). After sneaking past or winning, perform a DEX Treasure Discovery Check (DEX − Terrain Lvl × 2) to draw from the Treasure Deck until you find an item with Lvl ≤ Terrain Lvl (higher-level cards are discarded).',
  },
  {
    templateId: 'merchant',
    name: 'Merchant',
    cardNumber: 'PTH · #002',
    copies: MERCHANT_DECK_COUNT,
    challengeLabel: 'Wandering Shop: Top 2 Treasure · 2× DISC',
    description:
      'Draws the top 2 Treasure cards and offers them at double your DISC (rounded up). Purchase if Gold allows, or decline and leave.',
    flavorText:
      'A traveling peddler emerges from the mist with rare wares. Draws the top 2 cards from the Treasure Deck and offers them at double your Charisma DISC (rounded up). Purchase what you can afford or decline and continue your journey.',
  },
  {
    templateId: 'sanctuary',
    name: 'Sanctuary',
    cardNumber: 'PTH · #003',
    copies: SANCTUARY_DECK_COUNT,
    challengeLabel: 'Free Rest: Full HP Restore',
    description:
      'A peaceful haven along the path. Rest for free to restore your HP to full.',
    flavorText:
      'Sunlight pierces the canopy over an ancient moss-draped spring. Here, weary travelers may rest in safety and mend all wounds without spending a single coin.',
  },
  {
    templateId: 'ambush',
    name: 'Ambush',
    cardNumber: 'PTH · #004',
    copies: AMBUSH_DECK_COUNT,
    challengeLabel: 'Ambush: Encounter (Enemies Act First)',
    description:
      'Triggers a terrain-level Encounter immediately, but the monsters act first before your first turn.',
    flavorText:
      'Shadows burst from the undergrowth before you can draw your weapon. Fight an Encounter for this terrain, with hostiles taking the opening turn.',
  },
  {
    templateId: 'magical_chest',
    name: 'Magical Chest',
    cardNumber: 'PTH · #005',
    copies: MAGICAL_CHEST_DECK_COUNT,
    challengeLabel: 'STR(3+2×Lvl) / DEX(3+2×Lvl) / INT(1+2×Lvl) or Abandon',
    description:
      'Force Open (STR − 3−2×Lvl), Lockpick (DEX − 3−2×Lvl), Remove Seal (INT − 1−2×Lvl), or Abandon. Success: top Treasure card. Fail: item destroyed & 3 DMG.',
    flavorText:
      'An arcane-sealed coffer pulses with volatile mana. Crack it with brute strength, deft lockpicking, or dispelling magic—or walk away. Failure detonates the ward, destroying the treasure inside and dealing 3 damage.',
  },
  {
    templateId: 'trapped_chest',
    name: 'Trapped Chest',
    cardNumber: 'PTH · #006',
    copies: TRAPPED_CHEST_DECK_COUNT,
    challengeLabel: 'STR(3+2×Lvl) / DEX(1+2×Lvl) or Abandon',
    description:
      'Force Open (STR − 3−2×Lvl), Lockpick (DEX − 1−2×Lvl), or Abandon. Success: top Treasure card. Fail: item destroyed & 3 DMG.',
    flavorText:
      'A heavy ironbound chest rigged with hair-trigger needles. Nimble fingers can disarm it easily, or brute force can pry it open—at the risk of a 3-damage blast that ruins the prize.',
  },
  {
    templateId: 'gold_stash',
    name: 'Gold Stash',
    cardNumber: 'PTH · #007',
    copies: GOLD_STASH_DECK_COUNT,
    challengeLabel: '1d6: 1–3 (+10G) | 4–5 (+20G) | 6 (+30G)',
    description:
      'Roll 1d6 to claim hidden coin: 1–3 grants 10 Gold, 4–5 grants 20 Gold, and 6 grants 30 Gold.',
    flavorText:
      'Beneath gnarled roots lies a forgotten traveler’s coffer gleaming with stamped sovereigns. Roll 1d6 to see how much coin remains intact.',
  },
  {
    templateId: 'spring_trap',
    name: 'Spring Trap',
    cardNumber: 'PTH · #008',
    copies: SPRING_TRAP_DECK_COUNT,
    challengeLabel: 'Dodge: AGI − (1+2×Lvl) | Fail: 4 DMG',
    description:
      'Roll a MACG-3D6™ AGI − (1 + 2×Lvl) check. Succeed to avoid harm; fail to suffer 4 direct damage.',
    flavorText:
      'A taut wire snaps underfoot! React in a split second with an AGI check (AGI − 1 − 2×Lvl) to leap clear, or take 4 direct damage from the concealed spikes.',
  },
];

export function buildPathsDeck(rng: number): { deck: PathCard[]; nextState: number } {
  const cards: PathCard[] = [];
  for (const entry of PATH_CARD_CATALOG) {
    for (let idx = 0; idx < entry.copies; idx++) {
      cards.push({
        id: `path_${entry.templateId}_${idx + 1}`,
        templateId: entry.templateId,
        name: entry.name,
        cardNumber: entry.cardNumber,
        challengeLabel: entry.challengeLabel,
        description: entry.description,
      });
    }
  }
  const { shuffled, nextState } = shuffleArray(cards, rng);
  return { deck: shuffled, nextState };
}

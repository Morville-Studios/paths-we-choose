import { AdventureCard } from '../core/types';

/**
 * Raster art illustrations and paths for official standard TCG cards.
 * Loads full-bleed, kid and young-adult friendly raster illustrations
 * on top of reusable card base templates.
 */

export function getMonsterRasterArtPath(templateId: string): string {
  switch (templateId) {
    case 'witch':
      return '/cards/creatures/witch.jpg';
    case 'leech':
      return '/cards/creatures/leech.jpg';
    case 'stalker':
      return '/cards/creatures/stalker.jpg';
    case 'creeper':
      return '/cards/creatures/creeper.jpg';
    case 'assassin':
      return '/cards/creatures/assasin.jpg';
    case 'goblin':
      return '/cards/creatures/goblin.jpg';
    case 'pink_slime':
      return '/cards/creatures/pink_slime.jpg';
    case 'fighting_beetle':
      return '/cards/creatures/fighting_beetle.jpg';
    case 'wild_dog':
      return '/cards/creatures/wild_dog.jpg';
    case 'ramram':
      return '/cards/creatures/ramram.jpg';
    case 'rattler':
      return '/cards/creatures/rattler.jpg';
    case 'bullwark':
      return '/cards/creatures/bullwark.jpg';
    case 'tree_snapper':
      return '/cards/creatures/tree_snapper.jpg';
    case 'zombie':
      return '/cards/creatures/zombie.jpg';
    case 'ghoul':
      return '/cards/creatures/ghoul.jpg';
    case 'goblin_chieftain':
      return '/cards/creatures/goblin_chieftain.jpg';
    case 'troll_healer':
      return '/cards/creatures/troll_healer.jpg';
    case 'troll_hexer':
      return '/cards/creatures/troll_hexer.jpg';
    case 'troll_brute':
      return '/cards/creatures/troll_brute.jpg';
    default:
      return '/cards/creatures/goblin.jpg';
  }
}

export function getAdventureRasterArtPath(card: AdventureCard): string {
  if (card.terrain === 'start') {
    return '/cards/adventure/start_tile.jpg';
  }
  if (card.hasVillage) {
    if (card.terrain === 'swamp') {
      return '/cards/adventure/swamp_village.jpg';
    }
    if (card.terrain === 'forest') {
      return '/cards/adventure/forest_village.jpg';
    }
    return '/cards/adventure/grassland_village.jpg';
  }
  if (card.hasShrine) {
    if (card.terrain === 'swamp') {
      return '/cards/adventure/swamp_shrine.jpg';
    }
    if (card.terrain === 'forest') {
      return '/cards/adventure/forest_shrine.jpg';
    }
    return '/cards/adventure/grassland_shrine.jpg';
  }
  if (card.hasHostile) {
    if (card.terrain === 'swamp') {
      return '/cards/adventure/swamp_encounter.jpg';
    }
    if (card.terrain === 'forest') {
      return '/cards/adventure/forest_encounter.jpg';
    }
    return '/cards/adventure/grassland_encounter.jpg';
  }
  if (card.terrain === 'swamp') {
    return '/cards/adventure/swamp.jpg';
  }
  if (card.terrain === 'forest') {
    return '/cards/adventure/forest.jpg';
  }
  return '/cards/adventure/grassland.jpg';
}

export function getActionRasterArtPath(cardId: string, cardType: 'attack' | 'defense' | 'skill' | 'enchantment'): string {
  if (cardId.includes('whirlwind')) {
    return '/cards/actions/whirlwind.jpg';
  }
  if (cardId.includes('battlecry')) {
    return '/cards/actions/battlecry.jpg';
  }
  if (cardId.includes('battle_flag') || cardId.includes('battleflag')) {
    return '/cards/actions/battleflag.jpg';
  }
  if (cardId.includes('adrenalin')) {
    return '/cards/actions/adrenalin.jpg';
  }
  if (cardId.includes('final_smash')) {
    return '/cards/actions/final_smash.jpg';
  }
  if (cardId.includes('heavy_cleave') || cardId.includes('high_strike')) {
    return '/cards/actions/heavy_cleave.jpg';
  }
  if (cardId.includes('iron_parry') || cardId.includes('parry')) {
    return '/cards/actions/iron_parry.jpg';
  }
  if (cardId.includes('battle_focus') || cardId.includes('fortify')) {
    return '/cards/actions/battle_focus.jpg';
  }
  if (cardId.includes('flee')) {
    return '/cards/actions/flee.jpg';
  }
  if (cardId.includes('arcane_blast')) {
    return '/cards/actions/arcane_blast.jpg';
  }
  if (cardId.includes('frost_nova') || cardId.includes('frost')) {
    return '/cards/actions/frost_nova.jpg';
  }
  if (cardId.includes('blink_ward') || cardId.includes('blink')) {
    return '/cards/actions/blink_ward.jpg';
  }
  if (cardId.includes('fireball')) {
    return '/cards/actions/fireball.jpg';
  }
  if (cardId.includes('force_field') || cardId.includes('barrier')) {
    return '/cards/actions/force_field.jpg';
  }
  if (cardType === 'defense' || cardId.includes('shield')) {
    return '/cards/actions/shield.jpg';
  }
  return '/cards/actions/blade.jpg';
}

export function getMonsterIllustration(templateId: string): string {
  const rasterPath = getMonsterRasterArtPath(templateId);
  return `<img src="${rasterPath}" alt="${templateId}" class="tcg-art-raster" loading="eager" />`;
}

export function getAdventureCardIllustration(card: AdventureCard): string {
  const rasterPath = getAdventureRasterArtPath(card);
  const alt = card.name ?? card.terrain;
  return `<img src="${rasterPath}" alt="${alt}" class="tcg-art-raster adventure-raster" loading="lazy" />`;
}

export function getActionCardIllustration(cardId: string, cardType: 'attack' | 'defense' | 'skill' | 'enchantment'): string {
  const rasterPath = getActionRasterArtPath(cardId, cardType);
  return `<img src="${rasterPath}" alt="${cardId}" class="tcg-art-raster action-raster" loading="eager" />`;
}

export function getAdventurerRasterArtPath(classId?: string | null): string {
  switch (classId) {
    case 'rogue':
      return '/cards/adventurers/rogue.jpg';
    case 'wizard':
      return '/cards/adventurers/wizard.jpg';
    case 'fighter':
    default:
      return '/cards/adventurers/fighter.jpg';
  }
}

export function getAdventurerIllustration(classId?: string | null, name = 'Adventurer'): string {
  const rasterPath = getAdventurerRasterArtPath(classId);
  return `<img src="${rasterPath}" alt="${name}" class="tcg-art-raster adventurer-raster" loading="lazy" />`;
}

export function getItemRasterArtPath(itemId?: string): string {
  if (!itemId) return '/cards/items/wooden_sword.jpg';
  const cleanId = itemId.replace(/^lvl\d+_/, '').replace(/(?:_plus)+$/, '');
  switch (cleanId) {
    case 'health_potion':
      return '/cards/items/health_potion.jpg';
    case 'wooden_sword':
    case 'iron_sword':
      return '/cards/items/iron_sword.jpg';
    case 'apprentice_staff':
      return '/cards/items/apprentice_staff.jpg';
    case 'robe':
      return '/cards/items/robe.jpg';
    case 'leather_clothes':
    case 'leather_gear':
      return '/cards/items/leather_clothes.jpg';
    case 'chainmail':
      return '/cards/items/chainmail.jpg';
    case 'book_of_spells':
    case 'spellbinder':
      return '/cards/items/book_of_spells.jpg';
    case 'ring_of_beasts':
    case 'beast_ring':
    case 'focus_ring':
      return '/cards/items/ring_of_beasts.jpg';
    case 'sandals_of_swiftness':
    case 'hermes_gear':
      return '/cards/items/sandals_of_swiftness.jpg';
    case 'lucky_charm':
    case 'goldstar':
      return '/cards/items/lucky_charm.jpg';
    case 'dagger':
      return '/cards/items/iron_sword.jpg';
    default:
      return '/cards/items/wooden_sword.jpg';
  }
}

export function getItemIllustration(itemId: string, name = 'Item'): string {
  const rasterPath = getItemRasterArtPath(itemId);
  return `<img src="${rasterPath}" alt="${name}" class="tcg-art-raster item-raster" loading="lazy" />`;
}

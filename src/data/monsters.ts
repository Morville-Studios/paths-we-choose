import { MonsterCard, MonsterRarity, MonsterTemplateId, MonsterTerrain } from '../core/types';

export type MonsterTemplate = Omit<MonsterCard, 'id'>;

/** Default inscriptions; explicit creature/boss rewards may override these. */
export function getDefaultMonsterRewards(level: number) {
  const factor = 2 ** (level - 1);
  return { statPointReward: factor, goldReward: 2 * factor };
}

export const MONSTER_TERRAIN_LEVELS: Readonly<Record<MonsterTerrain, number>> = {
  grasslands: 1,
  forest: 2,
  swamp: 3,
  cave: 4,
  underground: 5,
  underworld: 6,
};

export function getMonsterRarity(monster: Pick<MonsterCard, 'rarity'>): MonsterRarity {
  return monster.rarity ?? 'uncommon';
}

export function getMonsterSupplyCount(monster: Pick<MonsterCard, 'rarity'>): number {
  const rarity = getMonsterRarity(monster);
  return rarity === 'common' ? 6 : rarity === 'rare' ? 3 : 4;
}

export function getMonsterMainTerrain(
  monster: Pick<MonsterCard, 'mainTerrain' | 'spawnTerrains'>,
): MonsterTerrain {
  if (monster.mainTerrain) return monster.mainTerrain;
  const terrains = monster.spawnTerrains ?? [];
  if (terrains.length === 0) return 'grasslands';
  return [...terrains].sort((a, b) => MONSTER_TERRAIN_LEVELS[a] - MONSTER_TERRAIN_LEVELS[b])[0];
}

export const MONSTER_TEMPLATES: Record<MonsterTemplateId, MonsterTemplate> = {
  goblin: {
    templateId: 'goblin',
    name: 'Goblin',
    level: 1,
    maxHp: 6,
    def: 0,
    acc: 1,
    eva: 1,
    ...getDefaultMonsterRewards(1),
    abilities: [],
    cardNumber: 'mon1grs-01',
    rarity: 'common',
    mainTerrain: 'grasslands',
    spawnTerrains: ['grasslands', 'forest', 'swamp'],
    creatureType: 'Goblinoid',
    flavorText: 'Nimble scavengers with a knack for ambushes and shiny loot.',
    pattern: [
      { label: 'Slash', damage: 4, block: 0 },
      { label: 'Cautious Poke', damage: 3, block: 2 },
    ],
  },
  pink_slime: {
    templateId: 'pink_slime',
    name: 'Blob',
    level: 1,
    maxHp: 4,
    def: 1,
    mdef: 1,
    acc: 0,
    eva: 0,
    ...getDefaultMonsterRewards(1),
    abilities: [],
    cardNumber: 'mon1grs-02',
    mainTerrain: 'grasslands',
    spawnTerrains: ['grasslands', 'forest'],
    creatureType: 'Ooze',
    flavorText: 'A cheerful puddle of jelly that packs a surprisingly sticky punch.',
    pattern: [
      { label: 'Ooze Bump', damage: 3, block: 0, heal: 1 },
      { label: 'Acid Glob', damage: 4, block: 0 },
    ],
  },
  fighting_beetle: {
    templateId: 'fighting_beetle',
    name: 'Pincer',
    level: 1,
    maxHp: 5,
    def: 1,
    acc: 0,
    eva: 0,
    ...getDefaultMonsterRewards(1),
    abilities: [],
    cardNumber: 'mon1grs-03',
    mainTerrain: 'grasslands',
    spawnTerrains: ['grasslands', 'forest'],
    creatureType: 'Insect',
    flavorText: 'A heavy-shelled brawler with hardened pincers and a fearless charge.',
    pattern: [
      { label: 'Shell Guard', damage: 3, block: 0, defBonus: 1, bonusDuration: 1 },
      { label: 'Horn Charge', damage: 4, block: 0 },
    ],
  },
  wild_dog: {
    templateId: 'wild_dog',
    name: 'Scavenger',
    level: 1,
    maxHp: 6,
    def: 0,
    acc: 2,
    eva: 2,
    ...getDefaultMonsterRewards(1),
    abilities: [],
    cardNumber: 'mon1grs-04',
    mainTerrain: 'grasslands',
    spawnTerrains: ['grasslands', 'forest'],
    creatureType: 'Beast',
    flavorText: 'Swift hunter of the plains grass with keen instincts and sharp teeth.',
    pattern: [
      { label: 'Savage Bite', damage: 4, block: 0 },
      { label: 'Lunging Bite', damage: 3, block: 0, accBonus: 1 },
    ],
  },
  ramram: {
    templateId: 'ramram',
    name: 'Ramram',
    level: 1,
    maxHp: 6,
    def: 0,
    acc: 2,
    eva: 1,
    ...getDefaultMonsterRewards(1),
    abilities: [],
    cardNumber: 'mon1grs-05',
    rarity: 'rare',
    mainTerrain: 'grasslands',
    spawnTerrains: ['grasslands'],
    creatureType: 'Beast',
    flavorText: 'A stout, sure-footed mountain goat warrior whose spiraled horns can crack boulder stone.',
    pattern: [
      { label: 'Headbutt', damage: 4, block: 0 },
      { label: 'Sturdy Horn Guard', damage: 3, block: 2 },
    ],
  },
  rattler: {
    templateId: 'rattler',
    name: 'Rattler',
    level: 2,
    maxHp: 7,
    def: 1,
    acc: 3,
    eva: 1,
    ...getDefaultMonsterRewards(2),
    abilities: [],
    cardNumber: 'mon2frs-01',
    rarity: 'rare',
    mainTerrain: 'forest',
    spawnTerrains: ['forest'],
    creatureType: 'Reptile',
    flavorText: 'A camouflaged pit viper that strikes from the canopy with blinding speed and potent venom.',
    pattern: [
      { label: 'Venom Strike', damage: 5, block: 0 },
      { label: 'Coil & Strike', damage: 4, block: 2 },
    ],
  },
  bullwark: {
    templateId: 'bullwark',
    name: 'Bullwark',
    level: 3,
    maxHp: 14,
    def: 2,
    acc: 1,
    eva: 0,
    ...getDefaultMonsterRewards(3),
    abilities: ['Chaotic Impulse grants either +1 ATK or +1 ACC for its next turn.'],
    cardNumber: 'mon2frs-05',
    mainTerrain: 'forest',
    spawnTerrains: ['swamp', 'forest'],
    creatureType: 'Beast',
    flavorText: 'An imposing horned beast plated in heavy chitin. Its momentum accelerates with each devastating charge.',
    pattern: [
      { label: 'Chaotic Impulse', damage: 0, block: 0, randomBuff: { amount: 1, stats: ['atk', 'acc'], duration: 1 } },
      { label: 'Heavy Charge', damage: 7, block: 0 },
    ],
  },
  tree_snapper: {
    templateId: 'tree_snapper',
    name: 'Basilisk',
    level: 2,
    maxHp: 8,
    def: 1,
    acc: 1,
    eva: 1,
    ...getDefaultMonsterRewards(2),
    abilities: [],
    cardNumber: 'mon2frs-02',
    mainTerrain: 'forest',
    spawnTerrains: ['swamp', 'forest'],
    creatureType: 'Reptile',
    flavorText: 'An ancient carnivorous reptile lurking in the wetlands with snapping bark-like jaws.',
    pattern: [
      { label: 'Stalk', damage: 0, block: 0, evaBonus: 2 },
      { label: 'Snapping Jaws', damage: 6, block: 0 },
    ],
  },
  zombie: {
    templateId: 'zombie',
    name: 'Zombie',
    level: 2,
    maxHp: 7,
    def: 1,
    mdef: 1,
    acc: 0,
    eva: 0,
    ...getDefaultMonsterRewards(2),
    abilities: ['Lifesteal (Attacks restore HP equal to unblocked damage dealt)'],
    cardNumber: 'mon2frs-03',
    rarity: 'common',
    mainTerrain: 'forest',
    spawnTerrains: ['swamp', 'cave', 'forest'],
    creatureType: 'Undead',
    flavorText: 'A reanimated corpse wandering the damp wilds. It slowly mends its decaying flesh between ferocious rotting strikes.',
    pattern: [
      { label: 'Regenerate', damage: 0, block: 0, heal: 3 },
      { label: 'Rotting Claw', damage: 5, block: 0 },
    ],
  },
  ghoul: {
    templateId: 'ghoul',
    name: 'Ghoul',
    level: 2,
    maxHp: 10,
    def: 0,
    mdef: 1,
    acc: 1,
    eva: 2,
    ...getDefaultMonsterRewards(2),
    abilities: [],
    cardNumber: 'mon2frs-04',
    mainTerrain: 'forest',
    spawnTerrains: ['forest', 'swamp'],
    creatureType: 'Undead',
    flavorText:
      'A ravenous nocturnal stalker feasting on carrion in the dark woods and bogs. Its chilling growl saps an adventurer\'s agility before a savage mad dash.',
    pattern: [
      { label: 'Growl', damage: 0, block: 0, heroEvaDebuff: 1, heroEvaDebuffDuration: 2 },
      { label: 'Mad Dash', damage: 6, block: 0 },
    ],
  },
  leech: {
    templateId: 'leech',
    creatureType: 'Undead',
    name: 'Leech',
    level: 4,
    maxHp: 18,
    def: 1,
    mdef: 3,
    eva: 2,
    acc: 2,
    ...getDefaultMonsterRewards(4),
    cardNumber: 'mon3smp-01',
    mainTerrain: 'swamp',
    spawnTerrains: ['swamp', 'cave'],
    abilities: [
      'Soul Drain restores 50% of HP damage dealt (rounded down).',
      'Every third Channel returns one Zombie from the monster discard pile at full HP; it acts next round.',
    ],
    pattern: [
      { label: 'Soul Drain', damage: 8, damageType: 'magical', drainFraction: 0.5, block: 0 },
      { label: 'Channel', damage: 0, heal: 2, block: 2, reviveEvery: 3, reviveTemplateId: 'zombie' },
    ],
  },
  creeper: {
    templateId: 'creeper',
    creatureType: 'Undead',
    name: 'Creeper',
    level: 3,
    cardNumber: 'mon3smp-02',
    rarity: 'rare',
    mainTerrain: 'swamp',
    spawnTerrains: ['swamp'],
    maxHp: 12,
    def: 2,
    eva: 0,
    acc: 1,
    mdef: 1,
    ...getDefaultMonsterRewards(3),
    resilient: { requiredRoll: 6, reviveHp: 6 },
    abilities: ['Resilient: Whenever defeated, roll 1d6. On a 6, return to life with 6 HP.'],
    pattern: [
      { label: 'Submerge', damage: 0, heal: 3, block: 3 },
      { label: 'Ambush', damage: 7, damageType: 'physical', block: 0 },
    ],
  },
  assassin: {
    templateId: 'assassin',
    creatureType: 'Human',
    name: 'Assasin',
    level: 3,
    cardNumber: 'mon3smp-03',
    rarity: 'common',
    mainTerrain: 'swamp',
    spawnTerrains: ['swamp', 'cave', 'underground'],
    maxHp: 13,
    def: 1,
    eva: 3,
    acc: 2,
    mdef: 1,
    ...getDefaultMonsterRewards(3),
    abilities: [
      'Poison Dart poisons on hit: 1 HP damage at each subsequent hero End Turn until cleansed; does not stack.',
      'Piercing Strike ignores up to 2 Hero DEF.',
    ],
    pattern: [
      { label: 'Poison Dart', damage: 3, block: 0, damageType: 'physical', ignoreDef: 3, poisonOnHit: true },
      { label: 'Piercing Strike', damage: 7, block: 0, damageType: 'physical', ignoreDef: 2 },
    ],
  },
  stalker: {
    templateId: 'stalker',
    name: 'Stalker',
    level: 2,
    cardNumber: 'mon1grs-06',
    mainTerrain: 'grasslands',
    spawnTerrains: ['grasslands', 'forest'],
    maxHp: 8,
    def: 0,
    eva: 2,
    acc: 1,
    ...getDefaultMonsterRewards(2),
    skittishEvaOnHit: 1,
    abilities: ['Skittish: Each hit immediately grants +1 EVA for the rest of the hero turn.', 'Sprint grants +1 EVA and +1 ACC for 2 turns; refreshing does not stack.'],
    pattern: [
      { label: 'Sprint', damage: 0, block: 0, evaBonus: 1, accBonus: 1, bonusDuration: 2 },
      { label: 'Pounce', damage: 6, damageType: 'physical', block: 0 },
    ],
  },
  witch: {
    templateId: 'witch',
    name: 'Witch',
    cardNumber: 'mon3smp-04',
    mainTerrain: 'swamp',
    level: 3,
    spawnTerrains: ['swamp', 'cave'],
    maxHp: 14,
    def: 1,
    mdef: 3,
    eva: 1,
    acc: 1,
    ...getDefaultMonsterRewards(3),
    endTurnRegen: 1,
    abilities: ['Regen1: Regain 1 HP at the end of each turn, up to Max HP.'],
    pattern: [
      { label: 'Blinding Hex', damage: 0, block: 0, heroStatDebuff: { stats: { eva: 1, acc: 1 }, duration: 2 } },
      { label: 'Expose weakness', damage: 0, block: 0, heroStatDebuff: { stats: { def: 1, mdef: 1 }, duration: 1 } },
      { label: 'Smite', damage: 7, damageType: 'magical', block: 0 },
    ],
  },
  phalanx: {
    templateId: 'phalanx',
    name: 'Phalanx',
    level: 4,
    maxHp: 20,
    def: 3,
    mdef: 0,
    acc: 1,
    eva: 2,
    ...getDefaultMonsterRewards(4),
    cardNumber: 'mon4cav-01',
    rarity: 'rare',
    mainTerrain: 'cave',
    spawnTerrains: ['cave'],
    creatureType: 'Arachnid',
    abilities: [],
    flavorText: 'An armored cave hunter that blinds intruders with webbing before crushing them beneath paired limbs.',
    pattern: [
      {
        label: 'Blinding Web', damage: 6, block: 0,
        heroStatDebuff: { stats: { acc: 1, eva: 2 }, duration: 1 },
        heroStatDebuffOnHit: true,
      },
      { label: 'Double Smash', damage: 8, block: 0, hitCount: 2 },
    ],
  },
  cultist_mage: {
    templateId: 'cultist_mage',
    name: 'Cultist Mage',
    level: 4,
    maxHp: 18,
    def: 1,
    mdef: 2,
    acc: 3,
    eva: 2,
    ...getDefaultMonsterRewards(4),
    cardNumber: 'mon4cav-02',
    rarity: 'common',
    mainTerrain: 'cave',
    spawnTerrains: ['cave', 'underground', 'underworld'],
    creatureType: 'Human',
    abilities: [],
    flavorText: 'A masked cavern mystic who feeds hostile soul-fire with forbidden rites.',
    pattern: [
      { label: 'Soul Burn', damage: 8, damageType: 'magical', block: 0 },
    ],
  },
  lurker: {
    templateId: 'lurker',
    name: 'Lurker',
    level: 5,
    maxHp: 25,
    def: 2,
    mdef: 1,
    acc: 1,
    eva: 0,
    ...getDefaultMonsterRewards(5),
    cardNumber: 'mon4cav-03',
    mainTerrain: 'cave',
    spawnTerrains: ['cave', 'underground'],
    creatureType: 'Wurm',
    retaliationDamageOnHeroAttack: 1,
    abilities: ['Acid Retaliation: After a successful player attack while Lurker survives, deal 1 damage that ignores DEF and Block.'],
    flavorText: 'A plated subterranean Wurm that drills through stone and answers every wound with corrosive acid.',
    pattern: [
      { label: 'Drill', damage: 10, block: 0 },
      { label: 'Shed', damage: 0, heal: 12, block: 0, defBonus: -2, bonusDuration: 1 },
    ],
  },
  goblin_chieftain: {
    templateId: 'goblin_chieftain',
    name: 'Grundy',
    level: 5,
    isBoss: true,
    maxHp: 30,
    def: 1,
    mdef: 1,
    acc: 1,
    eva: 1,
    ...getDefaultMonsterRewards(5),
    abilities: ['Goblin Warlord: Calls Goblins from the hidden Monster Deck and grows stronger with each Goblin in play.'],
    cardNumber: 'GRS · #BOSS-01',
    mainTerrain: 'grasslands',
    spawnTerrains: ['grasslands', 'forest'],
    creatureType: 'Goblinoid Warlord',
    flavorText: 'Grundy leads the plains warband with a bellow loud enough to summon every Goblin within earshot.',
    pattern: [
      {
        label: 'Call Goblin', damage: 0, block: 0,
        summonFromMonsterDeck: 'goblin', returnDiscardToMonsterDeckOnMiss: 'goblin',
      },
      { label: 'Beef up!', damage: 0, block: 4, defBonus: 1, bonusDuration: 1 },
      {
        label: 'Goblin March', damage: 6, block: 0,
        damagePerCreatureInPlay: { templateId: 'goblin', amount: 1 },
      },
    ],
  },
  troll_healer: {
    templateId: 'troll_healer',
    name: 'Troll Healer',
    level: 4,
    isBoss: true,
    maxHp: 25,
    def: 1,
    mdef: 2,
    acc: 2,
    eva: 1,
    ...getDefaultMonsterRewards(4),
    abilities: ['Troll Mending (Heals a random troll for 10 HP each round)'],
    cardNumber: 'TRO · #BOSS-01',
    mainTerrain: 'forest',
    spawnTerrains: ['swamp', 'forest'],
    creatureType: 'Troll Shaman',
    flavorText: 'An elder troll shaman invoking ancient bog spirits to mend the wounds of its brethren.',
    pattern: [
      { label: 'Troll Mending', damage: 0, block: 2 },
    ],
  },
  troll_hexer: {
    templateId: 'troll_hexer',
    name: 'Troll Hexer',
    level: 4,
    isBoss: true,
    maxHp: 25,
    def: 1,
    mdef: 2,
    acc: 2,
    eva: 1,
    ...getDefaultMonsterRewards(4),
    abilities: ['Hex Curse (Casts a stacking random 5-turn debuff: -1 ACC, +1 DMG taken, or -1 EVA)'],
    cardNumber: 'TRO · #BOSS-02',
    mainTerrain: 'forest',
    spawnTerrains: ['swamp', 'forest'],
    creatureType: 'Troll Witch Doctor',
    flavorText: 'A sinister practitioner of dark occult hexes, muttering curses that enfeeble adventurers.',
    pattern: [
      { label: 'Troll Hex', damage: 0, block: 2 },
      { label: 'Cursed Recoil', damage: 2, block: 0, damageType: 'magical', damagePerHeroDebuff: 2 },
    ],
  },
  troll_brute: {
    templateId: 'troll_brute',
    name: 'Troll Warrior',
    level: 4,
    isBoss: true,
    maxHp: 25,
    def: 2,
    acc: 3,
    eva: 1,
    ...getDefaultMonsterRewards(4),
    abilities: ['Relentless Assault (Attacks hero for 6 DMG each round)'],
    cardNumber: 'TRO · #BOSS-03',
    mainTerrain: 'forest',
    spawnTerrains: ['swamp', 'forest'],
    creatureType: 'Troll Brute',
    flavorText: 'A towering brute of muscle and stone-like hide, wielding a colossal club with savage fury.',
    pattern: [
      { label: 'Troll Smash', damage: 6, block: 0 },
    ],
  },
};

export interface ScenarioMonsterCompositionEntry {
  templateId: MonsterTemplateId;
  count: number;
}

export const ORDINARY_MONSTER_TEMPLATE_IDS = (Object.keys(MONSTER_TEMPLATES) as MonsterTemplateId[])
  .filter((templateId) => !MONSTER_TEMPLATES[templateId].isBoss);

/**
 * Scenario setup pulls ordinary creatures from the Void by main-terrain band:
 * scenario terrain = 100%, next terrain = round(2/3), final terrain = round(1/3).
 */
export function getScenarioMonsterDeckComposition(scenarioLevel: number): ScenarioMonsterCompositionEntry[] {
  const normalizedLevel = Math.max(1, Math.min(6, Math.floor(scenarioLevel)));
  return ORDINARY_MONSTER_TEMPLATE_IDS.flatMap((templateId) => {
    const template = MONSTER_TEMPLATES[templateId];
    const terrainLevel = MONSTER_TERRAIN_LEVELS[getMonsterMainTerrain(template)];
    const offset = terrainLevel - normalizedLevel;
    if (offset < 0 || offset > 2) return [];
    const supply = getMonsterSupplyCount(template);
    const count = offset === 0 ? supply : Math.round(supply * (offset === 1 ? 2 / 3 : 1 / 3));
    return count > 0 ? [{ templateId, count }] : [];
  });
}

export const STAGE_1_MONSTER_DECK_COMPOSITION = getScenarioMonsterDeckComposition(1);
export const STAGE_2_MONSTER_DECK_COMPOSITION = getScenarioMonsterDeckComposition(2);

export function createBossMonsterCard(): MonsterCard {
  const tpl = MONSTER_TEMPLATES.goblin_chieftain;
  return {
    ...tpl,
    id: 'boss_goblin_chieftain',
  };
}

export function createMission2BossCards(): MonsterCard[] {
  return [
    { ...MONSTER_TEMPLATES.troll_healer, id: 'boss_troll_healer' },
    { ...MONSTER_TEMPLATES.troll_hexer, id: 'boss_troll_hexer' },
    { ...MONSTER_TEMPLATES.troll_brute, id: 'boss_troll_brute' },
  ];
}

export function createBossMonstersForMission(mission = 1): MonsterCard[] {
  if (mission === 2) {
    return createMission2BossCards();
  }
  return [createBossMonsterCard()];
}

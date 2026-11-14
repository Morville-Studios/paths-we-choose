import { MonsterCard, MonsterRarity, MonsterTemplateId, MonsterTerrain } from '../core/types';

export type MonsterTemplate = Omit<MonsterCard, 'id'>;

/** Default inscriptions: ordinary monsters get level * 5 Gold and level + 1 SP; Bosses get double. */
export function getDefaultMonsterRewards(level: number, isBoss = false) {
  const baseGold = level * 5;
  const baseSp = level + 1;
  return isBoss
    ? { statPointReward: baseSp * 2, goldReward: baseGold * 2 }
    : { statPointReward: baseSp, goldReward: baseGold };
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
    acc: 2,
    eva: 3,
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
    maxHp: 8,
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
    maxHp: 6,
    def: 1,
    acc: 1,
    eva: 1,
    ...getDefaultMonsterRewards(1),
    abilities: [],
    cardNumber: 'mon1grs-03',
    mainTerrain: 'grasslands',
    spawnTerrains: ['grasslands', 'forest'],
    creatureType: 'Insect',
    flavorText: 'A heavy-shelled brawler with hardened pincers and a fearless charge.',
    pattern: [
      { label: 'Shell Guard', damage: 0, block: 0, defBonus: 1, defDuration: 2 },
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
    eva: 3,
    ...getDefaultMonsterRewards(1),
    abilities: [],
    cardNumber: 'mon1grs-04',
    mainTerrain: 'grasslands',
    spawnTerrains: ['grasslands', 'forest'],
    creatureType: 'Beast',
    flavorText: 'Swift hunter of the plains grass with keen instincts and sharp teeth.',
    pattern: [
      { label: 'Savage Bite', damage: 5, block: 0 },
      { label: 'Lunging Bite', damage: 4, block: 0, accBonus: 2 },
    ],
  },
  ramram: {
    templateId: 'ramram',
    name: 'Ramram',
    level: 1,
    maxHp: 8,
    def: 0,
    acc: 3,
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
      { label: 'Headbutt', damage: 5, block: 0 },
      { label: 'Horn Pierce', damage: 4, block: 0, ignoreDef: 2 },
    ],
  },
  rattler: {
    templateId: 'rattler',
    name: 'Rattler',
    level: 2,
    maxHp: 10,
    def: 1,
    mdef: 1,
    acc: 4,
    eva: 2,
    ...getDefaultMonsterRewards(2),
    hardenDefOnHit: 1,
    abilities: ['Harden (1)'],
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
    maxHp: 16,
    def: 2,
    mdef: 2,
    acc: 3,
    eva: 3,
    ...getDefaultMonsterRewards(3),
    hardenDefOnHit: 1,
    skittishEvaOnHit: 1,
    abilities: ['Harden (1)', 'Skittish (1)'],
    cardNumber: 'mon2frs-05',
    mainTerrain: 'forest',
    spawnTerrains: ['swamp', 'forest'],
    creatureType: 'Beast',
    flavorText: 'An imposing horned beast plated in heavy chitin. Its momentum accelerates with each devastating charge.',
    pattern: [
      { label: 'Heal', damage: 0, block: 0, heal: 4 },
      { label: 'Heavy Charge', damage: 7, block: 0 },
    ],
  },
  tree_snapper: {
    templateId: 'tree_snapper',
    name: 'Basilisk',
    level: 2,
    maxHp: 12,
    def: 2,
    acc: 2,
    eva: 2,
    ...getDefaultMonsterRewards(2),
    hardenDefOnHit: 1,
    abilities: ['Harden (1)'],
    cardNumber: 'mon2frs-02',
    mainTerrain: 'forest',
    spawnTerrains: ['swamp', 'forest'],
    creatureType: 'Reptile',
    flavorText: 'An ancient carnivorous reptile lurking in the wetlands with snapping bark-like jaws.',
    pattern: [
      { label: 'Snapping Jaws', damage: 6, block: 0 },
    ],
  },
  zombie: {
    templateId: 'zombie',
    name: 'Zombie',
    level: 2,
    maxHp: 12,
    def: 1,
    mdef: 1,
    acc: 2,
    eva: 0,
    ...getDefaultMonsterRewards(2),
    regenOnStart: 2,
    abilities: ['Regen (2)'],
    cardNumber: 'mon2frs-03',
    rarity: 'common',
    mainTerrain: 'forest',
    spawnTerrains: ['swamp', 'cave', 'forest'],
    creatureType: 'Undead',
    flavorText: 'A reanimated corpse wandering the damp wilds. It slowly mends its decaying flesh between ferocious rotting strikes.',
    pattern: [
      { label: 'Life Steal', damage: 6, block: 0, drainFraction: 0.5, drainRound: 'ceil' },
    ],
  },
  ghoul: {
    templateId: 'ghoul',
    name: 'Ghoul',
    level: 2,
    maxHp: 12,
    def: 0,
    mdef: 2,
    acc: 2,
    eva: 3,
    ...getDefaultMonsterRewards(2),
    abilities: [],
    cardNumber: 'mon2frs-04',
    mainTerrain: 'forest',
    spawnTerrains: ['forest', 'swamp'],
    creatureType: 'Undead',
    flavorText:
      'A ravenous nocturnal stalker feasting on carrion in the dark woods and bogs. Its chilling growl saps an adventurer\'s agility before a savage mad dash.',
    pattern: [
      { label: 'Blind', damage: 0, block: 0, heroStatDebuff: { stats: { acc: 1 }, duration: 2 } },
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
    acc: 3,
    ...getDefaultMonsterRewards(4),
    cardNumber: 'mon3smp-01',
    mainTerrain: 'swamp',
    spawnTerrains: ['swamp', 'cave'],
    regenOnStart: 2,
    abilities: ['Regen (2)'],
    pattern: [
      { label: 'T1', damage: 0, block: 0, summonFromMonsterDeck: 'zombie', returnDiscardToMonsterDeckOnMiss: 'zombie' },
      { label: 'T2', damage: 7, damageType: 'magical', drainFraction: 0.5, drainRound: 'ceil', lifesteal: true, block: 0 },
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
    maxHp: 14,
    def: 2,
    eva: 3,
    acc: 3,
    mdef: 2,
    ...getDefaultMonsterRewards(3),
    undyingTokens: 3,
    abilities: ['Undying (3)'],
    pattern: [
      { label: 'T1', damage: 0, heal: 3, block: 3 },
      { label: 'T2', damage: 7, damageType: 'physical', block: 0 },
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
    def: 2,
    eva: 4,
    acc: 4,
    mdef: 1,
    ...getDefaultMonsterRewards(3),
    skittishEvaOnHit: 2,
    abilities: ['Skittish (2)'],
    pattern: [
      { label: 'T1', damage: 5, block: 0, damageType: 'physical', ignoreDef: 3 },
      { label: 'T2', damage: 0, block: 0, accBonus: 2, poison: { damage: 4, duration: 2 } },
    ],
  },
  stalker: {
    templateId: 'stalker',
    name: 'Stalker',
    level: 2,
    cardNumber: 'mon1grs-06',
    mainTerrain: 'grasslands',
    spawnTerrains: ['grasslands', 'forest'],
    maxHp: 10,
    def: 0,
    eva: 4,
    acc: 3,
    ...getDefaultMonsterRewards(2),
    skittishEvaOnHit: 1,
    abilities: ['Skittish: Grants +1 EVA every time it gets hit for 1 turn.'],
    pattern: [
      { label: 'Sprint', damage: 0, block: 0, evaBonus: 1, evaDuration: 2, accBonus: 1, accDuration: 1 },
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
    eva: 2,
    acc: 4,
    ...getDefaultMonsterRewards(3),
    regenOnStart: 2,
    abilities: ['Regen (2)'],
    pattern: [
      { label: 'T1', damage: 0, block: 0, heroStatDebuff: { stats: { acc: 2, eva: 2 }, duration: 2 } },
      { label: 'T2', damage: 7, damageType: 'magical', block: 0 },
    ],
  },
  phalanx: {
    templateId: 'phalanx',
    name: 'Phalanx',
    level: 4,
    maxHp: 20,
    def: 3,
    mdef: 2,
    acc: 4,
    eva: 5,
    ...getDefaultMonsterRewards(4),
    cardNumber: 'mon4cav-01',
    rarity: 'rare',
    mainTerrain: 'cave',
    spawnTerrains: ['cave'],
    creatureType: 'Arachnid',
    skittishEvaOnHit: 2,
    abilities: ['Skittish (2)'],
    flavorText: 'An armored cave hunter that blinds intruders with webbing before crushing them beneath paired limbs.',
    pattern: [
      {
        label: 'T1', damage: 0, block: 0,
        heroStatDebuff: { stats: { eva: 3, acc: 2 }, duration: 1 },
      },
      { label: 'T2', damage: 7, offhandDamage: 6, block: 0 },
    ],
  },
  cultist_mage: {
    templateId: 'cultist_mage',
    name: 'Cultist Mage',
    level: 4,
    maxHp: 18,
    def: 2,
    mdef: 3,
    acc: 5,
    eva: 4,
    ...getDefaultMonsterRewards(4),
    cardNumber: 'mon4cav-02',
    rarity: 'common',
    mainTerrain: 'cave',
    spawnTerrains: ['cave', 'underground', 'underworld'],
    creatureType: 'Human',
    channel: { amount: 1, duration: 3 },
    abilities: ['Channel (1, 3)'],
    flavorText: 'A masked cavern mystic who feeds hostile soul-fire with forbidden rites.',
    pattern: [
      { label: 'T1', damage: 8, damageType: 'magical', block: 0 },
    ],
  },
  lurker: {
    templateId: 'lurker',
    name: 'Lurker',
    level: 5,
    maxHp: 25,
    def: 4,
    mdef: 3,
    acc: 4,
    eva: 4,
    ...getDefaultMonsterRewards(5),
    cardNumber: 'mon4cav-03',
    mainTerrain: 'cave',
    spawnTerrains: ['cave', 'underground'],
    creatureType: 'Wurm',
    retaliationDamageOnHeroAttack: 1,
    hardenDefOnHit: 1,
    abilities: ['Thorn (1)', 'Harden (1)'],
    flavorText: 'A plated subterranean Wurm that drills through stone and answers every wound with corrosive acid.',
    pattern: [
      { label: 'T1', damage: 10, block: 0 },
      { label: 'T2', damage: 0, heal: 12, block: 0, defBonus: -2, bonusDuration: 1 },
    ],
  },
  dark_orc: {
    templateId: 'dark_orc',
    name: 'Dark Orc',
    level: 5,
    maxHp: 22,
    def: 3,
    mdef: 2,
    acc: 4,
    eva: 5,
    ...getDefaultMonsterRewards(5),
    cardNumber: 'mon5und-01',
    rarity: 'common',
    mainTerrain: 'underground',
    spawnTerrains: ['cave', 'underground', 'underworld'],
    creatureType: 'Orc',
    bloodlust: true,
    regenOnStart: 2,
    abilities: ['Bloodlust', 'Regen (2)'],
    flavorText: 'A ruthless frontline orc forged in subterranean darkness, swinging a notched cleaver with reckless fury.',
    pattern: [
      { label: 'T1', damage: 9, block: 0 },
      { label: 'T2', damage: 11, block: 0, accBonus: -1 },
    ],
  },
  orc_shaman: {
    templateId: 'orc_shaman',
    name: 'Orc Shaman',
    level: 6,
    maxHp: 30,
    def: 3,
    mdef: 4,
    acc: 5,
    eva: 5,
    ...getDefaultMonsterRewards(6),
    cardNumber: 'mon6und-01',
    rarity: 'rare',
    mainTerrain: 'underground',
    spawnTerrains: ['cave', 'underground'],
    creatureType: 'Orc',
    regenOnStart: 2,
    channel: { amount: 1 },
    abilities: ['Regen (2)', 'Channel (1)'],
    flavorText: 'An orc mystic channeling dual sparks of brute martial power and crackling earthen spellfire.',
    pattern: [
      { label: 'T1', damage: 6, magicDamage: 6, block: 0 },
    ],
  },
  goblin_chieftain: {
    templateId: 'goblin_chieftain',
    name: 'Grundy',
    level: 5,
    isBoss: true,
    maxHp: 30,
    def: 3,
    mdef: 1,
    acc: 3,
    eva: 3,
    ...getDefaultMonsterRewards(5, true),
    abilities: ["Grundy's ATK and DEF increases for each other goblin creatures in play"],
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
      { label: 'Goblin March', damage: 6, block: 0 },
    ],
  },
  troll_healer: {
    templateId: 'troll_healer',
    name: 'Troll Healer',
    level: 4,
    isBoss: true,
    maxHp: 25,
    def: 1,
    mdef: 3,
    acc: 3,
    eva: 2,
    ...getDefaultMonsterRewards(4, true),
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
    def: 2,
    mdef: 2,
    acc: 3,
    eva: 2,
    ...getDefaultMonsterRewards(4, true),
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
    def: 3,
    mdef: 1,
    acc: 4,
    eva: 2,
    ...getDefaultMonsterRewards(4, true),
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
  king_nezenheim: {
    templateId: 'king_nezenheim',
    name: 'Fallen King',
    level: 7,
    isBoss: true,
    maxHp: 40,
    def: 5,
    mdef: 5,
    acc: 6,
    eva: 5,
    ...getDefaultMonsterRewards(7, true),
    cardNumber: 'UND · #BOSS-01',
    mainTerrain: 'underground',
    spawnTerrains: ['underground'],
    creatureType: 'Undead',
    abilities: ['Unholy Aura (Heals all undead allies and himself for 3 HP at turn start)'],
    flavorText: 'The entombed ruler of old awakened from eternal slumber, commanding legions of the restless dead.',
    pattern: [
      {
        label: 'Summon Undead',
        damage: 0,
        block: 2,
        summonUndeadFromMonsterDeck: true,
        returnUndeadDiscardToMonsterDeckOnMiss: true,
      },
      { label: 'Corrupted Blade', damage: 7, magicDamage: 7, block: 0 },
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
  if (normalizedLevel === 3) {
    // Scenario 3: Tomb of the Fallen King (30 Cards in Deck • remainder in Void)
    // 17 Swamp (~2/3 Supply): 6 Assassin, 4 Leech, 4 Witch, 3 Creeper
    // 10 Cave (~1/3 Supply): 4 Cultist Mage, 3 Lurker, 3 Phalanx
    // 3 Underground (~1/3 Supply): 2 Dark Orc, 1 Orc Shaman
    return [
      { templateId: 'assassin', count: 6 },
      { templateId: 'leech', count: 4 },
      { templateId: 'witch', count: 4 },
      { templateId: 'creeper', count: 3 },
      { templateId: 'cultist_mage', count: 4 },
      { templateId: 'lurker', count: 3 },
      { templateId: 'phalanx', count: 3 },
      { templateId: 'dark_orc', count: 2 },
      { templateId: 'orc_shaman', count: 1 },
    ];
  }
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
export const STAGE_3_MONSTER_DECK_COMPOSITION = getScenarioMonsterDeckComposition(3);

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

export function createMission3BossCard(): MonsterCard {
  return {
    ...MONSTER_TEMPLATES.king_nezenheim,
    id: 'boss_king_nezenheim',
  };
}

export function createBossMonstersForMission(mission = 1): MonsterCard[] {
  if (mission === 3) {
    return [createMission3BossCard()];
  }
  if (mission === 2) {
    return createMission2BossCards();
  }
  return [createBossMonsterCard()];
}

import monstersData from '../../data/monsters.json';
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

export const MONSTER_TEMPLATES: Record<MonsterTemplateId, MonsterTemplate> = Object.fromEntries(
  monstersData
    .filter((entry) => entry.type === 'monster')
    .map(({ type: _type, ...monster }) => [monster.templateId, monster as MonsterTemplate])
) as Record<MonsterTemplateId, MonsterTemplate>;

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

import enemiesData from '../../data/enemies.json';
import { EnemyCard, EnemyRarity, EnemyTemplateId, EnemyTerrain } from '../core/types';

export type EnemyTemplate = Omit<EnemyCard, 'id'>;

/** Default inscriptions: ordinary enemies get level * 5 Gold and level + 1 SP; Bosses get double. */
export function getDefaultEnemyRewards(level: number, isBoss = false) {
  const baseGold = level * 5;
  const baseSp = level + 1;
  return isBoss
    ? { statPointReward: baseSp * 2, goldReward: baseGold * 2 }
    : { statPointReward: baseSp, goldReward: baseGold };
}

export const ENEMY_TERRAIN_LEVELS: Readonly<Record<EnemyTerrain, number>> = {
  grasslands: 1,
  forest: 2,
  swamp: 3,
  cave: 4,
  underground: 5,
  underworld: 6,
};

export function getEnemyRarity(enemy: Pick<EnemyCard, 'rarity'>): EnemyRarity {
  return enemy.rarity ?? 'uncommon';
}

export function getEnemySupplyCount(enemy: Pick<EnemyCard, 'rarity'>): number {
  const rarity = getEnemyRarity(enemy);
  return rarity === 'common' ? 6 : rarity === 'rare' ? 3 : 4;
}

export function getEnemyMainTerrain(
  enemy: Pick<EnemyCard, 'mainTerrain' | 'spawnTerrains'>,
): EnemyTerrain {
  if (enemy.mainTerrain) return enemy.mainTerrain;
  const terrains = enemy.spawnTerrains ?? [];
  if (terrains.length === 0) return 'grasslands';
  return [...terrains].sort((a, b) => ENEMY_TERRAIN_LEVELS[a] - ENEMY_TERRAIN_LEVELS[b])[0];
}

export const ENEMY_TEMPLATES: Record<EnemyTemplateId, EnemyTemplate> = Object.fromEntries(
  enemiesData
    .filter((entry) => entry.type === 'enemy')
    .map(({ type: _type, ...enemy }) => [enemy.templateId, enemy as EnemyTemplate])
) as Record<EnemyTemplateId, EnemyTemplate>;

export interface ScenarioEnemyCompositionEntry {
  templateId: EnemyTemplateId;
  count: number;
}

export const ORDINARY_ENEMY_TEMPLATE_IDS = (Object.keys(ENEMY_TEMPLATES) as EnemyTemplateId[])
  .filter((templateId) => !ENEMY_TEMPLATES[templateId].isBoss);

/**
 * Scenario setup pulls ordinary enemies from the Void by main-terrain band:
 * scenario terrain = 100%, next terrain = round(2/3), final terrain = round(1/3).
 */
export function getScenarioEnemyDeckComposition(scenarioLevel: number): ScenarioEnemyCompositionEntry[] {
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
  return ORDINARY_ENEMY_TEMPLATE_IDS.flatMap((templateId) => {
    const template = ENEMY_TEMPLATES[templateId];
    const terrainLevel = ENEMY_TERRAIN_LEVELS[getEnemyMainTerrain(template)];
    const offset = terrainLevel - normalizedLevel;
    if (offset < 0 || offset > 2) return [];
    const supply = getEnemySupplyCount(template);
    const count = offset === 0 ? supply : Math.round(supply * (offset === 1 ? 2 / 3 : 1 / 3));
    return count > 0 ? [{ templateId, count }] : [];
  });
}

export const STAGE_1_ENEMY_DECK_COMPOSITION = getScenarioEnemyDeckComposition(1);
export const STAGE_2_ENEMY_DECK_COMPOSITION = getScenarioEnemyDeckComposition(2);
export const STAGE_3_ENEMY_DECK_COMPOSITION = getScenarioEnemyDeckComposition(3);

export function createBossEnemyCard(): EnemyCard {
  const tpl = ENEMY_TEMPLATES.goblin_chieftain;
  return {
    ...tpl,
    id: 'boss_goblin_chieftain',
  };
}

export function createMission2BossCards(): EnemyCard[] {
  return [
    { ...ENEMY_TEMPLATES.troll_healer, id: 'boss_troll_healer' },
    { ...ENEMY_TEMPLATES.troll_hexer, id: 'boss_troll_hexer' },
    { ...ENEMY_TEMPLATES.troll_brute, id: 'boss_troll_brute' },
  ];
}

export function createMission3BossCard(): EnemyCard {
  return {
    ...ENEMY_TEMPLATES.king_nezenheim,
    id: 'boss_king_nezenheim',
  };
}

export function createBossEnemiesForMission(mission = 1): EnemyCard[] {
  if (mission === 3) {
    return [createMission3BossCard()];
  }
  if (mission === 2) {
    return createMission2BossCards();
  }
  return [createBossEnemyCard()];
}

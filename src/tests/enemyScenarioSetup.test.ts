import { describe, expect, it } from 'vitest';
import { buildPhysicalEnemySupply, buildScenarioEnemyDeck } from '../core/deck';
import { startAdventure, startNextMission } from '../core/engine';
import {
  getEnemyMainTerrain,
  getEnemyRarity,
  getEnemySupplyCount,
  getScenarioEnemyDeckComposition,
  ENEMY_TEMPLATES,
  ENEMY_TERRAIN_LEVELS,
  ORDINARY_ENEMY_TEMPLATE_IDS,
} from '../data/enemies';
import { pileModal } from '../ui/render';

function countsByTemplate(cards: Array<{ templateId: string }>): Record<string, number> {
  return cards.reduce<Record<string, number>>((counts, card) => {
    counts[card.templateId] = (counts[card.templateId] ?? 0) + 1;
    return counts;
  }, {});
}

describe('scenario enemy supply and Void setup', () => {
  it('uses the six ordered terrain levels and each enemy lowest terrain as its main terrain', () => {
    expect(ENEMY_TERRAIN_LEVELS).toEqual({
      grasslands: 1,
      forest: 2,
      swamp: 3,
      cave: 4,
      underground: 5,
      underworld: 6,
    });
    for (const templateId of ORDINARY_ENEMY_TEMPLATE_IDS) {
      const enemy = ENEMY_TEMPLATES[templateId];
      const minimum = enemy.mainTerrain ?? [...(enemy.spawnTerrains ?? [])]
        .sort((a, b) => ENEMY_TERRAIN_LEVELS[a] - ENEMY_TERRAIN_LEVELS[b])[0];
      expect(getEnemyMainTerrain(enemy), templateId).toBe(minimum);
    }
  });

  it('creates 6 Common, 4 Uncommon, and 3 Rare physical copies', () => {
    for (const templateId of ['goblin', 'zombie', 'assassin', 'cultist_mage', 'dark_orc'] as const) {
      expect(getEnemyRarity(ENEMY_TEMPLATES[templateId])).toBe('common');
      expect(getEnemySupplyCount(ENEMY_TEMPLATES[templateId])).toBe(6);
    }
    for (const templateId of ['ramram', 'rattler', 'creeper', 'phalanx', 'orc_shaman'] as const) {
      expect(getEnemyRarity(ENEMY_TEMPLATES[templateId])).toBe('rare');
      expect(getEnemySupplyCount(ENEMY_TEMPLATES[templateId])).toBe(3);
    }
    expect(getEnemyRarity(ENEMY_TEMPLATES.pink_slime)).toBe('uncommon');
    expect(getEnemySupplyCount(ENEMY_TEMPLATES.pink_slime)).toBe(4);

    const supply = buildPhysicalEnemySupply();
    expect(supply).toHaveLength(85);
    expect(new Set(supply.map(card => card.id)).size).toBe(85);
    const counts = countsByTemplate(supply);
    for (const templateId of ORDINARY_ENEMY_TEMPLATE_IDS) {
      expect(counts[templateId], templateId).toBe(getEnemySupplyCount(ENEMY_TEMPLATES[templateId]));
    }
  });

  it('builds Scenario 1 from all Grassland, rounded two-thirds Forest, and rounded one-third Swamp supply', () => {
    const composition = Object.fromEntries(
      getScenarioEnemyDeckComposition(1).map(entry => [entry.templateId, entry.count]),
    );
    expect(composition).toMatchObject({
      goblin: 6,
      pink_slime: 4,
      fighting_beetle: 4,
      wild_dog: 4,
      ramram: 3,
      stalker: 4,
      rattler: 2,
      bullwark: 3,
      tree_snapper: 3,
      zombie: 4,
      ghoul: 3,
      leech: 1,
      creeper: 1,
      assassin: 2,
      witch: 1,
    });
    expect(Object.values(composition).reduce((sum, value) => sum + value, 0)).toBe(45);
    expect(composition).not.toHaveProperty('phalanx');
    expect(composition).not.toHaveProperty('cultist_mage');
    expect(composition).not.toHaveProperty('lurker');

    const built = buildScenarioEnemyDeck(1, 12345);
    expect(built.deck).toHaveLength(45);
    expect(built.void).toHaveLength(40);
    expect(new Set([...built.deck, ...built.void].map(card => card.id)).size).toBe(85);
  });

  it('rebuilds Scenario 2 from Forest, Swamp, and Cave main-terrain bands', () => {
    const composition = Object.fromEntries(
      getScenarioEnemyDeckComposition(2).map(entry => [entry.templateId, entry.count]),
    );
    expect(composition).toMatchObject({
      rattler: 3,
      bullwark: 4,
      tree_snapper: 4,
      zombie: 6,
      ghoul: 4,
      leech: 3,
      creeper: 2,
      assassin: 4,
      witch: 3,
      phalanx: 1,
      cultist_mage: 2,
      lurker: 1,
    });
    expect(Object.values(composition).reduce((sum, value) => sum + value, 0)).toBe(37);
    expect(composition).not.toHaveProperty('goblin');

    const stage1 = startAdventure('fighter', 'scenario-transition');
    const stage2 = startNextMission(stage1);
    expect(stage2.currentMission).toBe(2);
    expect(stage2.scenarioLevel).toBe(2);
    expect(stage2.enemyDeck).toHaveLength(37);
    expect(stage2.enemyDiscard).toEqual([]);
    expect(stage2.enemyVoid).toHaveLength(48);
    expect(countsByTemplate(stage2.enemyDeck)).toMatchObject(composition);
    expect(new Set([...stage2.enemyDeck, ...stage2.enemyVoid].map(card => card.id)).size).toBe(85);
  });

  it('builds Scenario 3 from Swamp, Cave, and Underground main-terrain bands', () => {
    const composition = Object.fromEntries(
      getScenarioEnemyDeckComposition(3).map(entry => [entry.templateId, entry.count]),
    );
    expect(composition).toMatchObject({
      assassin: 6,
      leech: 4,
      witch: 4,
      creeper: 3,
      cultist_mage: 4,
      lurker: 3,
      phalanx: 3,
      dark_orc: 2,
      orc_shaman: 1,
    });
    expect(Object.values(composition).reduce((sum, value) => sum + value, 0)).toBe(30);
    expect(composition).not.toHaveProperty('goblin');
    expect(composition).not.toHaveProperty('zombie');

    const stage1 = startAdventure('fighter', 'scenario-3-test');
    const stage2 = startNextMission(stage1);
    const stage3 = startNextMission(stage2);
    expect(stage3.currentMission).toBe(3);
    expect(stage3.scenarioLevel).toBe(3);
    expect(stage3.missionName).toBe('Tomb of the Fallen King');
    expect(stage3.enemyDeck).toHaveLength(30);
    expect(stage3.enemyDiscard).toEqual([]);
    expect(stage3.enemyVoid).toHaveLength(55);
    expect(countsByTemplate(stage3.enemyDeck)).toMatchObject(composition);
    expect(new Set([...stage3.enemyDeck, ...stage3.enemyVoid].map(card => card.id)).size).toBe(85);
  });

  it('shows all ordinary enemy copies not selected by the scenario in the public Void', () => {
    const state = startAdventure('fighter', 'enemy-void-viewer');
    const html = pileModal('void_deck', state);
    expect(html).toContain('Ordinary enemy copies not selected by the current scenario');
    expect(html).toContain('Cultist Mage');
    expect(html).toContain('Phalanx');
    expect(html).toContain('Lurker');
    expect(html).toContain('&times;6');
    expect(html).not.toContain('tcg-set-symbol');
    expect(html).not.toContain('/icons/new-paths-');
  });
});

import { describe, expect, it } from 'vitest';
import { buildPhysicalMonsterSupply, buildScenarioMonsterDeck } from '../core/deck';
import { startAdventure, startNextMission } from '../core/engine';
import {
  getMonsterMainTerrain,
  getMonsterRarity,
  getMonsterSupplyCount,
  getScenarioMonsterDeckComposition,
  MONSTER_TEMPLATES,
  MONSTER_TERRAIN_LEVELS,
  ORDINARY_MONSTER_TEMPLATE_IDS,
} from '../data/monsters';
import { pileModal } from '../ui/render';

function countsByTemplate(cards: Array<{ templateId: string }>): Record<string, number> {
  return cards.reduce<Record<string, number>>((counts, card) => {
    counts[card.templateId] = (counts[card.templateId] ?? 0) + 1;
    return counts;
  }, {});
}

describe('scenario creature supply and Void setup', () => {
  it('uses the six ordered terrain levels and each creature lowest terrain as its main terrain', () => {
    expect(MONSTER_TERRAIN_LEVELS).toEqual({
      grasslands: 1,
      forest: 2,
      swamp: 3,
      cave: 4,
      underground: 5,
      underworld: 6,
    });
    for (const templateId of ORDINARY_MONSTER_TEMPLATE_IDS) {
      const monster = MONSTER_TEMPLATES[templateId];
      const minimum = [...(monster.spawnTerrains ?? [])]
        .sort((a, b) => MONSTER_TERRAIN_LEVELS[a] - MONSTER_TERRAIN_LEVELS[b])[0];
      expect(getMonsterMainTerrain(monster), templateId).toBe(minimum);
    }
  });

  it('creates 6 Common, 4 Uncommon, and 3 Rare physical copies', () => {
    for (const templateId of ['goblin', 'zombie', 'assassin', 'cultist_mage'] as const) {
      expect(getMonsterRarity(MONSTER_TEMPLATES[templateId])).toBe('common');
      expect(getMonsterSupplyCount(MONSTER_TEMPLATES[templateId])).toBe(6);
      expect(MONSTER_TEMPLATES[templateId].spawnTerrains).toHaveLength(3);
    }
    for (const templateId of ['ramram', 'rattler', 'creeper', 'phalanx'] as const) {
      expect(getMonsterRarity(MONSTER_TEMPLATES[templateId])).toBe('rare');
      expect(getMonsterSupplyCount(MONSTER_TEMPLATES[templateId])).toBe(3);
    }
    expect(getMonsterRarity(MONSTER_TEMPLATES.pink_slime)).toBe('uncommon');
    expect(getMonsterSupplyCount(MONSTER_TEMPLATES.pink_slime)).toBe(4);

    const supply = buildPhysicalMonsterSupply();
    expect(supply).toHaveLength(76);
    expect(new Set(supply.map(card => card.id)).size).toBe(76);
    const counts = countsByTemplate(supply);
    for (const templateId of ORDINARY_MONSTER_TEMPLATE_IDS) {
      expect(counts[templateId], templateId).toBe(getMonsterSupplyCount(MONSTER_TEMPLATES[templateId]));
    }
  });

  it('builds Scenario 1 from all Grassland, rounded two-thirds Forest, and rounded one-third Swamp supply', () => {
    const composition = Object.fromEntries(
      getScenarioMonsterDeckComposition(1).map(entry => [entry.templateId, entry.count]),
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

    const built = buildScenarioMonsterDeck(1, 12345);
    expect(built.deck).toHaveLength(45);
    expect(built.void).toHaveLength(31);
    expect(new Set([...built.deck, ...built.void].map(card => card.id)).size).toBe(76);
  });

  it('rebuilds Scenario 2 from Forest, Swamp, and Cave main-terrain bands', () => {
    const composition = Object.fromEntries(
      getScenarioMonsterDeckComposition(2).map(entry => [entry.templateId, entry.count]),
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
    expect(stage2.monsterDeck).toHaveLength(37);
    expect(stage2.monsterDiscard).toEqual([]);
    expect(stage2.monsterVoid).toHaveLength(39);
    expect(countsByTemplate(stage2.monsterDeck)).toMatchObject(composition);
    expect(new Set([...stage2.monsterDeck, ...stage2.monsterVoid].map(card => card.id)).size).toBe(76);
  });

  it('shows all ordinary creature copies not selected by the scenario in the public Void', () => {
    const state = startAdventure('fighter', 'creature-void-viewer');
    const html = pileModal('void_deck', state);
    expect(html).toContain('Ordinary creature copies not selected by the current scenario');
    expect(html).toContain('Cultist Mage');
    expect(html).toContain('Phalanx');
    expect(html).toContain('Lurker');
    expect(html).toContain('&times;6');
    expect(html).not.toContain('tcg-set-symbol');
    expect(html).not.toContain('/icons/new-paths-');
  });
});

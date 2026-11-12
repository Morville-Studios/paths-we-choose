import { describe, expect, it } from 'vitest';
import { startAdventure } from '../core/engine';
import { AdventureCard } from '../core/types';
import { getEffectiveStatsFromState } from '../core/stats';
import { createCombatCardInstance } from '../data/combatCards';
import { renderActionCardHtml } from '../ui/actionCard';
import { getAdventureCardName, renderAdventureCardHtml } from '../ui/adventureCard';
import { groupByCount } from '../ui/grouping';
import { getTerrainPresentation } from '../ui/terrainPresentation';
import { gameLogoHtml, studioBrandHtml } from '../ui/brand';
import { publicAsset } from '../ui/publicAsset';

describe('shared UI presentation helpers', () => {
  it('groups repeated cards in one stable pass', () => {
    const cards = [
      { id: 'slash', copy: 1 },
      { id: 'defend', copy: 1 },
      { id: 'slash', copy: 2 },
    ];
    expect(groupByCount(cards, (card) => card.id)).toEqual([
      { item: cards[0], count: 2 },
      { item: cards[1], count: 1 },
    ]);
  });

  it('uses one terrain source for labels, art classes, icons and set codes', () => {
    expect(getTerrainPresentation('grasslands')).toMatchObject({
      label: 'Grassland', icon: '🌿', setCode: '✦ GRS', templateClass: 'tcg-template-grassland',
    });
    expect(getTerrainPresentation('cave')).toMatchObject({
      pluralLabel: 'Caves', icon: '🪨', setCode: '✦ CAV', badgeClass: 'cave',
    });
  });

  it('renders the same complete action-card template for inspection and gameplay contexts', () => {
    const state = startAdventure('fighter', 'shared-action-card');
    const slash = createCombatCardInstance('melee_atk', 'shared');
    const html = renderActionCardHtml(slash, getEffectiveStatsFromState(state), {
      state,
      viewOnly: true,
      className: 'tcg-inspect-card',
      artWindowClassName: 'full-inspect-art',
    });

    expect(html).toContain('tcg-card tcg-action');
    expect(html).toContain('tcg-inspect-card');
    expect(html).toContain('full-inspect-art');
    expect(html).toContain('<span class="tcg-name action-name">Slash</span>');
    expect(html).toContain('Deal <b>6</b> Normal DMG');
    expect(html).toContain('GRS · #012/021');
  });

  it('renders compact Land cards through one reusable terrain-aware template', () => {
    const cave: AdventureCard = {
      id: 'test-cave', name: 'Cave Encounter', terrain: 'cave', level: 5,
      hasHostile: true, hasVillage: false, hasShrine: false, revealed: true,
    };
    const html = renderAdventureCardHtml(cave, { className: 'test-card' });

    expect(getAdventureCardName(cave)).toBe('Cave Encounter');
    expect(html).toContain('tcg-template-cave');
    expect(html).toContain('🪨');
    expect(html).toContain('✦ CAV');
    expect(html).toContain('Lvl 5');
  });

  it('uses the canonical Morville Studios lockup and deployment-aware public assets', () => {
    expect(publicAsset('/cards/adventurers/fighter.jpg')).toBe('/cards/adventurers/fighter.jpg');
    const brand = studioBrandHtml();
    expect(brand).toContain('morville-studios-games-lockup-on-dark.svg');
    expect(brand).toContain('alt="Morville Studios"');
    expect(brand).toContain('https://morvillestudios.com/');
  });

  it('renders the tabletop AD&D style game logo', () => {
    const logo = gameLogoHtml();
    expect(logo).toContain('paths-we-choose-logo.png');
    expect(logo).toContain('alt="The Paths We Choose"');
  });
});

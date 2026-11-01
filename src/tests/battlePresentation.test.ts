import { describe, it, expect } from 'vitest';
import { startAdventure } from '../core/engine';
import { createCombatSession } from '../core/combat';
import { MONSTER_TEMPLATES } from '../data/monsters';
import { cardInspectModal, getHandCarouselIndex, renderPlayArea, UiState } from '../ui/render';

const ui: UiState = { selectedClass: 'fighter', showDeck: false, villageTab: 'buy', targetIndex: 0, handIndex: 3 };
describe('battle hand and creature presentation', () => {
  it('keeps all hand instances, centers the selected one and keeps Flee outside the hand track', () => {
    const state = startAdventure('fighter', 'hand-layout');
    state.activeHook = { type: 'COMBAT', combat: createCombatSession([{ ...MONSTER_TEMPLATES.stalker, id: 'stalker' }], state.playerMasterDeck, state.rngState).combat };
    const html = renderPlayArea(state, ui);
    expect(html).toContain('hand-carousel-unit is-center" data-hand-index="3"');
    expect(html.match(/data-hand-dot /g)).toHaveLength(5);
    expect(html).toContain('data-action="prev-hand-card"');
    expect(html).toContain('flee-card-slot');
    expect(getHandCarouselIndex(4, 3)).toBe(2);
    expect(getHandCarouselIndex(3, 0)).toBe(0);
  });
  it('keeps the End Turn action available with an empty hand and disables carousel navigation', () => {
    const state = startAdventure('fighter', 'empty-hand');
    state.activeHook = { type: 'COMBAT', combat: createCombatSession([{ ...MONSTER_TEMPLATES.goblin, id: 'goblin' }], [], state.rngState).combat };
    const html = renderPlayArea(state, ui);
    expect(html).toContain('No cards left. End your turn');
    expect(html).toContain('aria-label="Next action card" disabled');
    expect(html).toContain('data-action="end-turn"');
  });
  it('moves the collector number to the header and omits zero combat stats from the footer', () => {
    const state = startAdventure('fighter', 'creature-template');
    const html = cardInspectModal({ kind: 'monster', monster: { ...MONSTER_TEMPLATES.stalker, id: 'stalker' }, currentHp: 8 }, state);
    const header = html.match(/<header class="tcg-header creature-header">[\s\S]*?<\/header>/)![0];
    const footer = html.match(/<footer class="tcg-footer creature-stat-footer">[\s\S]*?<\/footer>/)![0];
    expect(header).toContain('mon1grs-06');
    expect(header.indexOf('Lvl 2')).toBeLessThan(header.indexOf('CREATURE'));
    expect(footer).not.toContain('mon1grs-06');
    expect(footer).not.toContain('data-creature-stat="def"');
    expect(footer).not.toContain('data-creature-stat="mdef"');
    expect(footer).toContain('aria-label="ACC: 1"');
    expect(footer).toContain('aria-label="EVA: 1"');
    expect(html).not.toContain('creature-stats-row');
  });
  it('retains positive MDEF and DEF in the unified stat footer', () => {
    const html = cardInspectModal({ kind: 'monster', monster: { ...MONSTER_TEMPLATES.leech, id: 'leech' }, currentHp: 10 }, startAdventure('fighter', 'leech-layout'));
    const footer = html.match(/<footer class="tcg-footer creature-stat-footer">[\s\S]*?<\/footer>/)![0];
    expect(footer).toContain('aria-label="MDEF: 3"');
    expect(footer).toContain('aria-label="DEF: 1"');
  });
});

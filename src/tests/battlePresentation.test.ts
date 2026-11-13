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
    expect(html).toContain('data-action="flee-card"');
    expect(html).not.toContain('flee-card-slot');
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
  it('moves the collector number to the header, omits the redundant creature label, and uses the set symbol', () => {
    const state = startAdventure('fighter', 'creature-template');
    const html = cardInspectModal({ kind: 'monster', monster: { ...MONSTER_TEMPLATES.stalker, id: 'stalker' }, currentHp: 8 }, state);
    const header = html.match(/<header class="tcg-header creature-header">[\s\S]*?<\/header>/)![0];
    const footer = html.match(/<footer class="tcg-footer creature-stat-footer">[\s\S]*?<\/footer>/)![0];
    expect(header).toContain('mon1grs-06');
    expect(header).toContain('Lvl 2');
    expect(header).toContain('Beast');
    expect(header).not.toContain('CREATURE');
    expect(html).toContain('/icons/new-paths-uncommon.svg');
    expect(html).toContain('tcg-creature-rarity-symbol');
    expect(footer).not.toContain('mon1grs-06');
    expect(footer).not.toContain('data-creature-stat="def"');
    expect(footer).not.toContain('data-creature-stat="mdef"');
    expect(footer).toContain('aria-label="ACC: 3"');
    expect(footer).toContain('aria-label="EVA: 4"');
    expect(html).not.toContain('creature-stats-row');
  });

  it('uses bronze, silver, and gold New Paths symbols for ordinary full-card rarities', () => {
    const state = startAdventure('fighter', 'rarity-symbols');
    const common = cardInspectModal({ kind: 'monster', monster: { ...MONSTER_TEMPLATES.goblin, id: 'goblin' } }, state);
    const uncommon = cardInspectModal({ kind: 'monster', monster: { ...MONSTER_TEMPLATES.stalker, id: 'stalker' } }, state);
    const rare = cardInspectModal({ kind: 'monster', monster: { ...MONSTER_TEMPLATES.rattler, id: 'rattler' } }, state);
    expect(common).toContain('/icons/new-paths-common.svg');
    expect(uncommon).toContain('/icons/new-paths-uncommon.svg');
    expect(rare).toContain('/icons/new-paths-rare.svg');
    expect(common).not.toContain('<b>Rarity:</b>');
    expect(uncommon).not.toContain('<b>Rarity:</b>');
    expect(rare).not.toContain('<b>Rarity:</b>');
  });
  it('retains positive MDEF and DEF in the unified stat footer', () => {
    const html = cardInspectModal({ kind: 'monster', monster: { ...MONSTER_TEMPLATES.leech, id: 'leech' }, currentHp: 10 }, startAdventure('fighter', 'leech-layout'));
    const footer = html.match(/<footer class="tcg-footer creature-stat-footer">[\s\S]*?<\/footer>/)![0];
    expect(footer).toContain('aria-label="MDEF: 3"');
    expect(footer).toContain('aria-label="DEF: 1"');
  });

  it('renders tabletop 3d6 dice roll modal in both rolling and settled states', () => {
    const state = startAdventure('fighter', 'dice-modal-test');
    state.welcomePreparing = false;
    state.activeHook = {
      type: 'COMBAT',
      combat: createCombatSession([{ ...MONSTER_TEMPLATES.goblin, id: 'goblin' }], state.playerMasterDeck, state.rngState).combat,
    };

    const roll = {
      attackerName: 'Hero',
      targetName: 'Goblin',
      actionName: 'Slash',
      die1: 5,
      die2: 4,
      die3: 2,
      total: 11,
      netAcc: 2,
      minHitRoll: 8,
      maxHitRoll: 13,
      isHit: true,
      damageDealt: 3,
      damageBlocked: 0,
    };

    // 1. Rolling state
    const rollingUi: UiState = {
      ...ui,
      pendingDiceRolls: [{ roll, settled: false }],
    };
    const rollingHtml = renderPlayArea(state, rollingUi);
    expect(rollingHtml).toContain('dice-roll-modal');
    expect(rollingHtml).toContain('is-rolling');
    expect(rollingHtml).toContain('Rolling 3d6...');
    expect(rollingHtml).toContain('disabled');

    // 2. Settled state
    const settledUi: UiState = {
      ...ui,
      pendingDiceRolls: [{ roll, settled: true }],
    };
    const settledHtml = renderPlayArea(state, settledUi);
    expect(settledHtml).toContain('dice-roll-modal');
    expect(settledHtml).toContain('is-settled');
    expect(settledHtml).toContain('dice-die" data-final="5">🎲 5');
    expect(settledHtml).toContain('dice-die" data-final="4">🎲 4');
    expect(settledHtml).toContain('dice-die" data-final="2">🎲 2');
    expect(settledHtml).toContain('qte-bar-container');
    expect(settledHtml).toContain('HIT! (3 DMG)');
    expect(settledHtml).toContain('data-action="apply-dice-roll"');
    expect(settledHtml).not.toContain('event.stopPropagation()');
    expect(settledHtml).not.toContain('disabled');
    expect(settledHtml).not.toContain('confirm-target-picker');
    expect(settledHtml).not.toContain('CRIT Triples');
  });

  it('keeps target monster centered even when defeated during damage/greyout animation until carousel rotates', () => {
    const state = startAdventure('fighter', 'target-center-test');
    const combat = createCombatSession(
      [
        { ...MONSTER_TEMPLATES.goblin, id: 'goblin_0' },
        { ...MONSTER_TEMPLATES.stalker, id: 'stalker_1' },
      ],
      state.playerMasterDeck,
      state.rngState
    ).combat;
    // Set goblin (target 0) to 0 HP (defeated)
    combat.monsters[0].hp = 0;
    state.activeHook = { type: 'COMBAT', combat };

    // With targetIndex: 0, goblin remains centered in the carousel
    const target0Ui: UiState = { ...ui, targetIndex: 0 };
    const html0 = renderPlayArea(state, target0Ui);
    const unit0Match = html0.match(/<div class="combat-monster-unit[^>]*data-id="0"[^>]*>/);
    expect(unit0Match).not.toBeNull();
    expect(unit0Match![0]).toContain('is-center');
    expect(unit0Match![0]).toContain('is-dead-unit');

    const unit1Match = html0.match(/<div class="combat-monster-unit[^>]*data-id="1"[^>]*>/);
    expect(unit1Match).not.toBeNull();
    expect(unit1Match![0]).toContain('is-next');
  });
});

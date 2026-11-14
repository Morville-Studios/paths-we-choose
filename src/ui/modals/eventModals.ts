import { computeHitProbability } from '../../core/combat';
import { coordToKey } from '../../core/grid';
import { getShrineLevel, getShrineSkillUpgradeOptions, PRAYER_OPTION_CATALOG } from '../../core/shrine';
import {
  calculateMerchantGoodsPrice,
  getActiveShrineBaseStatCap,
  getBaseStatUpgradeCost,
  getEffectiveStatsFromState,
} from '../../core/stats';
import {
  ActiveCombatState,
  ActiveExplorationState,
  ActivePathChallengeState,
  ActiveShrineState,
  AdventureCard,
  CombatVictoryState,
  RunState,
  StatKey,
  STATS,
} from '../../core/types';
import { renderAdventureCardHtml } from '../adventureCard';
import { getMonsterIllustration } from '../cardArt';
import { renderQteHitCheckBarHtml } from '../components/qteBar';
import { getResourceIcon, getStatIcon } from '../icons';
import { getTerrainPresentation } from '../terrainPresentation';
import { PendingShrineAction, UiState } from '../types';
import {
  combatCardHtml,
  formatCreatureSubtype,
  playerInfoWidgetHtml,
  renderTcgItemCard,
  renderTcgPathCard,
  voidCardCount,
} from '../render';
function shrinePrayerSection(shrine: ActiveShrineState): string {
  const boon = shrine.grantedBoon ?? (shrine.chosenOptionId ? PRAYER_OPTION_CATALOG[shrine.chosenOptionId] : null);
  if (boon) {
    const replacedNotice = shrine.replacedBoonName
      ? `<div class="shrine-replaced-note">Note: Only 1 shrine blessing can be active at a time. Previous blessing (<b>${shrine.replacedBoonName}</b>) was replaced.</div>`
      : `<div class="shrine-replaced-note">Note: Only 1 shrine blessing can be active at a time. Visiting another shrine will replace this boon.</div>`;

    const heading = shrine.alreadyVisited
      ? `You already received your blessing of <b>${boon.name}</b> from this shrine.`
      : `Visiting this Sacred Shrine has granted you: <b>${boon.name}</b>!`;
    const eyebrow = shrine.alreadyVisited ? 'Already Blessed' : 'Sacred Blessing Granted';

    return `
    <div class="shrine-granted-box">
      <div class="shrine-granted-header">
        <span class="shrine-granted-icon">&#10024;</span>
        <div class="shrine-granted-title">
          <span class="shrine-granted-eyebrow">${eyebrow}</span>
          <h3>${heading}</h3>
        </div>
      </div>
      <p class="shrine-granted-desc">${boon.description}</p>
      ${replacedNotice}
    </div>`;
  }

  return `
  <div class="shrine-granted-box">
    <div class="shrine-granted-header">
      <span class="shrine-granted-icon">&#10024;</span>
      <div class="shrine-granted-title">
        <span class="shrine-granted-eyebrow">Sacred Shrine</span>
        <h3>The divine spirits watch over your journey.</h3>
      </div>
    </div>
  </div>`;
}

export function eventAdventureCardHtml(card: AdventureCard, setLabel = '✦ LAND'): string {
  return renderAdventureCardHtml(card, {
    className: 'shrine-land-card',
    attributes: `data-inspect-kind="adventure" data-card-id="${card.id}"`,
    setLabel,
    loading: 'eager',
  });
}

function shrineSkillUpgradeSection(state: RunState): string {
  const shrineLevel = getShrineLevel(state);
  if (shrineLevel < 2 || !state.playerResources) return '';
  const options = getShrineSkillUpgradeOptions(state);
  const stats = getEffectiveStatsFromState(state);
  const upgradeCards = options.map((option) => {
    const canAfford = state.playerResources!.gold >= option.goldCost
      && state.playerResources!.statPoints >= option.statPointCost;
    const missingCosts = [
      state.playerResources!.gold < option.goldCost ? `${option.goldCost - state.playerResources!.gold} Gold` : '',
      state.playerResources!.statPoints < option.statPointCost ? `${option.statPointCost - state.playerResources!.statPoints} SP` : '',
    ].filter(Boolean).join(' and ');
    return `
      <article class="void-upgrade-option">
        <div class="void-upgrade-cards">
          <div class="void-upgrade-card-source">${combatCardHtml(option.source, stats, false, 'play-card', true, state, true)}</div>
          <span class="void-upgrade-arrow" aria-hidden="true">→</span>
          <div class="void-upgrade-card-target">${combatCardHtml(option.upgrade, stats, false, 'play-card', true, state, true)}</div>
        </div>
        <div class="void-upgrade-details">
          <b>${option.source.name} → ${option.upgrade.name}</b>
          <span>Pull from the Void · ${option.source.apCost} AP → ${option.upgrade.apCost} AP</span>
        </div>
        ${canAfford
          ? `<button class="btn primary void-upgrade-btn" data-action="request-shrine-skill-upgrade" data-id="${option.source.instanceId}">
              Upgrade (${option.goldCost} Gold · ${option.statPointCost} SP)
            </button>`
          : `<div class="shrine-upgrade-unavailable">Needs ${missingCosts} to upgrade</div>`}
      </article>`;
  }).join('');

  return `
    <section class="shrine-section void-upgrade-section">
      <div class="void-upgrade-heading">
        <div>
          <h3>🌀 Void Skill Upgrades</h3>
          <p class="muted">This Level ${shrineLevel} Shrine can pull matching upgrade cards from the Void.</p>
        </div>
        <button class="void-inspect-link" data-action="open-pile" data-pile="void_deck">Inspect Void (${voidCardCount(state)})</button>
      </div>
      <p class="void-upgrade-rule">
        ${shrineLevel >= 3
          ? 'Upgrade an owned 1 AP base card to its matching + version for 10 Gold + 2 SP, or a 2 AP card to a 3 AP version for 30 Gold + 6 SP.'
          : 'Upgrade an owned 1 AP base card to its matching + version for 10 Gold + 2 SP.'}
      </p>
      ${upgradeCards || '<p class="muted void-upgrade-empty">You do not currently own a card with an eligible Void upgrade.</p>'}
    </section>`;
}

export function statUpgradeWidgetHtml(
  state: RunState,
  action = 'shrine-upgrade',
  selectedStat: StatKey | null = null,
): string {
  const res = state.playerResources!;
  const eff = getEffectiveStatsFromState(state);
  const shrineCap = action === 'shrine-upgrade' ? getActiveShrineBaseStatCap(state) : null;
  const isShrineSelection = action === 'shrine-upgrade';

  const rows = STATS.map((s) => {
    const base = state.playerBaseStats[s];
    const cost = getBaseStatUpgradeCost(base);
    const atShrineCap = shrineCap !== null && base >= shrineCap;
    const can = !atShrineCap && res.statPoints >= cost;
    let benefitNote = '';
    if (s === 'str') {
      benefitNote = ` <small>(ATK +${Math.floor(eff.str / 2)} &rarr; +${Math.floor((eff.str + 1) / 2)}, DEF +${Math.floor(eff.str / 5)} &rarr; +${Math.floor((eff.str + 1) / 5)})</small>`;
    } else if (s === 'dex') {
      benefitNote = ` <small>(ACC ${eff.dex} &rarr; ${eff.dex + 1}, ATK +${Math.floor(eff.dex / 3)} &rarr; +${Math.floor((eff.dex + 1) / 3)})</small>`;
    } else if (s === 'agi') {
      benefitNote = ` <small>(EVA ${eff.agi} &rarr; ${eff.agi + 1}, DEF +${Math.floor(eff.agi / 3)} &rarr; +${Math.floor((eff.agi + 1) / 3)})</small>`;
    } else if (s === 'int') {
      benefitNote = ` <small>(MATK +${Math.floor(eff.int / 2)} &rarr; +${Math.floor((eff.int + 1) / 2)}, MDEF +${Math.floor(eff.int / 5)} &rarr; +${Math.floor((eff.int + 1) / 5)}, ACT ${3 + Math.floor(eff.int / 5)} &rarr; ${3 + Math.floor((eff.int + 1) / 5)})</small>`;
    } else if (s === 'cha') {
      benefitNote = ` <small>(Shop discount -${eff.cha * 5}% &rarr; -${(eff.cha + 1) * 5}%)</small>`;
    } else if (s === 'vit') {
      benefitNote = ` <small>(Max HP ${res.maxHp} &rarr; ${res.maxHp + 2}, DEF +${Math.floor(eff.vit / 5)} &rarr; +${Math.floor((eff.vit + 1) / 5)})</small>`;
    }
    const rowContents = `
      <span style="display:flex;align-items:center;gap:8px;">
        ${getStatIcon(s, 'stat-icon')}
        <span>
          <b>${s.toUpperCase()}</b> ${eff[s]} &rarr; <b>${eff[s] + 1}</b>${benefitNote}<br/>
          <small>Base ${base} &rarr; ${base + 1} &middot; cost ${cost} SP</small>
        </span>
        <span class="stat-info-pill" title="View stat breakdown">&#9432;</span>
      </span>
      ${isShrineSelection ? `<span class="shrine-stat-option-status">${atShrineCap ? `Max Base ${shrineCap}` : `${cost} SP`}</span>` : ''}`;

    if (isShrineSelection) {
      return `
      <button type="button" class="shop-row shrine-stat-option inspectable-stat ${selectedStat === s ? 'is-selected' : ''} ${atShrineCap ? 'is-capped' : ''}"
        data-action="select-shrine-stat" data-stat="${s}" data-inspect-stat="${s}"
        aria-pressed="${selectedStat === s ? 'true' : 'false'}"
        title="Select ${s.toUpperCase()} for upgrading. Right-click for the full stat breakdown.">
        ${rowContents}
      </button>`;
    }

    return `
    <div class="shop-row inspectable-stat"
      data-action="inspect-stat" data-stat="${s}" data-inspect-stat="${s}"
      title="Click or right-click to view full ${s.toUpperCase()} computation & next SP breakdown">
      ${rowContents}
      <button class="btn mini" data-action="${action}" data-stat="${s}" ${can ? '' : 'disabled'}>
        ${atShrineCap ? `Max Base ${shrineCap}` : `Upgrade (${cost} SP)`}
      </button>
    </div>`;
  }).join('');

  let shrineActionHtml = '';
  if (isShrineSelection) {
    if (!selectedStat) {
      shrineActionHtml = '<div class="shrine-stat-action-message">Select a stat to review its upgrade.</div>';
    } else {
      const selectedBase = state.playerBaseStats[selectedStat];
      const selectedCost = getBaseStatUpgradeCost(selectedBase);
      const selectedAtCap = shrineCap !== null && selectedBase >= shrineCap;
      const missingSp = Math.max(0, selectedCost - res.statPoints);
      shrineActionHtml = selectedAtCap
        ? `<div class="shrine-stat-action-message is-capped">${selectedStat.toUpperCase()} is already at this Shrine's maximum Base ${shrineCap}.</div>`
        : missingSp > 0
          ? `<div class="shrine-stat-action-message is-needed">Needs ${missingSp} SP to upgrade ${selectedStat.toUpperCase()}.</div>`
          : `<button class="btn primary big shrine-stat-upgrade-btn" data-action="request-shrine-stat-upgrade" data-stat="${selectedStat}">
              Upgrade ${selectedStat.toUpperCase()} (${selectedCost} SP)
            </button>`;
    }
  }

  const rowsAndAction = `
    <div class="shop-list shrine-stat-options">${rows}</div>
    ${isShrineSelection ? `<div class="shrine-stat-action-area">${shrineActionHtml}</div>` : ''}`;

  return `
  <div class="shrine-section stat-converter-section">
    <h3>Convert Stat Points into Base Stats</h3>
    <p class="muted">${getResourceIcon('sp', 'chip-icon')} Stat Points: <b>${res.statPoints} SP</b></p>
    ${shrineCap !== null ? `<p class="shrine-stat-cap">This Level ${shrineCap - 1} Shrine can raise a Base Stat only as high as <b>Base ${shrineCap}</b>.</p>` : ''}
    ${isShrineSelection
      ? `<div class="shrine-stat-workspace">
          ${playerInfoWidgetHtml(state, {
            title: 'Current Character',
            description: 'Select a stat on the right to preview its upgrade.',
            showGear: false,
          })}
          <div class="shrine-stat-choice-panel">${rowsAndAction}</div>
        </div>`
      : rowsAndAction}
  </div>`;
}

export function explorationModal(
  exploration: ActiveExplorationState,
  _state?: RunState
): string {
  const card = exploration.card;
  const terrain = getTerrainPresentation(card.terrain);
  const terrainIcon = terrain.icon;
  const capTerrain = terrain.label;

  const roll = exploration.roll;
  const effectiveRoll = exploration.effectiveRoll ?? roll;
  const rollBreakdown = `Natural ${roll}`;
  const outcome = exploration.outcome;

  return `
  <div class="modal-backdrop exploration-backdrop">
    <div class="modal exploration-modal">
      <div class="exploration-card-header">
        <span class="exploration-terrain-icon">${terrainIcon}</span>
        <div class="exploration-title-group">
          <h2>${card.name}</h2>
          <span class="exploration-level-pill">Level ${card.level} Undiscovered Terrain</span>
        </div>
      </div>

      <!-- 1d6 Dice Roll Display -->
      <div class="exploration-dice-section">
        <div class="exploration-dice-badge">
          <span class="dice-icon">🎲</span>
          <span class="dice-number">${effectiveRoll}</span>
        </div>
        <div class="exploration-dice-details">
          <div class="dice-label">1d6 Exploration Roll &middot; ${rollBreakdown}</div>
          <div class="dice-criteria ${outcome}">
            ${
              outcome === 'combat'
                ? `${rollBreakdown} &le; Card Level ${card.level} &middot; Enemy Encountered!`
                : outcome === 'treasure'
                ? (exploration.foundItem ? `${rollBreakdown} &middot; Treasure Found!` : `${rollBreakdown} &middot; No eligible treasure available`)
                : `${rollBreakdown} &middot; Calm &amp; Safe Passage`
            }
          </div>
        </div>
      </div>

      <!-- Outcome Details -->
      <div class="exploration-outcome-box ${outcome}">
        ${
          outcome === 'combat'
            ? `
            <div class="outcome-header combat">
              <span class="outcome-icon">⚔️</span>
              <h3>Hostile Ambush!</h3>
            </div>
            <p class="outcome-msg">
              Fierce wandering creatures prowling the <b>${card.name}</b> have ambushed your party!
            </p>
            <div class="exploration-encounter-hint">
              Encounter Budget: <b>Level ${card.level}</b> &middot; Terrain: <b>${capTerrain}</b>
            </div>
            <div class="exploration-actions">
              <button class="btn danger big exploration-btn" data-action="confirm-exploration-combat">⚔️ Proceed to Battle</button>
            </div>
            `
            : outcome === 'treasure'
            ? `
            <div class="outcome-header treasure">
              <span class="outcome-icon">💎</span>
              <h3>${exploration.foundItem ? 'Congratulations! Treasure Chest Found!' : 'No Treasure Available'}</h3>
            </div>
            <p class="outcome-msg">
              Fortune favors you! A natural 6 unearths a hidden treasure cache buried in the <b>${card.name}</b>.
            </p>
            ${
              exploration.foundItem
                ? `
                <div class="exploration-item-box">
                  <div class="exploration-item-card">
                    ${renderTcgItemCard(exploration.foundItem, { isMini: true })}
                  </div>
                  <div class="exploration-item-header">
                    <span class="item-name">${exploration.foundItem.name}</span>
                    <span class="item-level-tag">Level ${exploration.foundItem.level ?? 1}</span>
                  </div>
                  <p class="item-desc">${exploration.foundItem.description}</p>
                  <div class="item-stored-badge">🎒 Added directly to your Backpack</div>
                </div>
                `
                : `<p class="outcome-msg">No eligible treasure remains in the deck or graveyard.</p>`
            }
            <div class="exploration-actions">
              <button class="btn primary big exploration-btn" data-action="confirm-exploration-safe">${exploration.foundItem ? 'Return to Map View &rarr;' : 'Continue Journey &rarr;'}</button>
            </div>
            `
            : `
            <div class="outcome-header safe">
              <span class="outcome-icon">🌿</span>
              <h3>Peaceful Wilderness</h3>
            </div>
            <p class="outcome-msg">
              The journey through <b>${card.name}</b> is serene and undisturbed. No enemies emerged and no treasures were uncovered.
            </p>
            <div class="exploration-actions">
              <button class="btn primary big exploration-btn" data-action="confirm-exploration-safe">Continue Journey &rarr;</button>
            </div>
            `
        }
      </div>
    </div>
  </div>`;
}

export function pathChallengeModal(
  pc: ActivePathChallengeState,
  state: RunState
): string {
  const card = pc.terrainCard;
  const terrain = getTerrainPresentation(card.terrain);
  const eff = getEffectiveStatsFromState(state);
  const isTreasurePhase =
    pc.phase === 'treasure_prompt' || pc.phase === 'treasure_success' || pc.phase === 'treasure_fail';
  const isSpringTrapPhase =
    pc.phase === 'spring_trap_prompt' || pc.phase === 'spring_trap_success' || pc.phase === 'spring_trap_fail';
  const isChestResultPhase = pc.phase === 'chest_success' || pc.phase === 'chest_fail';

  const net = isTreasurePhase
    ? (pc.treasureNet ?? eff.dex - card.level * 2)
    : isSpringTrapPhase
    ? (pc.trapNet ?? eff.agi - (1 + 2 * card.level))
    : isChestResultPhase
    ? (pc.chestCheckRoll?.netModifier ?? 0)
    : pc.sneakNet;
  const tier = Math.max(1, Math.min(7, 4 + net));
  const prob = computeHitProbability(net);
  const roll = isTreasurePhase
    ? pc.treasureRoll
    : isSpringTrapPhase
    ? pc.trapRoll
    : isChestResultPhase
    ? pc.chestCheckRoll
    : pc.sneakRoll;
  const qteBarHtml = renderQteHitCheckBarHtml({
    minHitRoll: roll?.minHitRoll ?? prob.minHitRoll,
    maxHitRoll: roll?.maxHitRoll ?? prob.maxHitRoll,
    hitPercent: roll?.hitPercent ?? prob.hitPercent,
    rolledTotal: roll?.total,
    die1: roll?.dice[0],
    die2: roll?.dice[1],
    die3: roll?.dice[2],
    isHit: roll?.success,
    netAcc: net,
  });

  const diceReadoutHtml = roll
    ? `<div class="exploration-dice-section">
        <div class="exploration-dice-badge">
          <span class="dice-icon">🎲</span>
          <span class="dice-number">${roll.total}</span>
        </div>
        <div class="exploration-dice-details">
          <div class="dice-label">MACG-3D6™ Roll: [${roll.dice.join(' + ')}] = <b>${roll.total}</b> (Tier ${roll.tier})</div>
          <div class="dice-criteria ${roll.success ? 'treasure' : 'combat'}">
            ${
              roll.isDiabolic
                ? `😈 Diabolic Roll (${roll.total}) — Always Fails!`
                : roll.success
                ? `✅ Success! (${roll.total} within ${roll.minHitRoll}–${roll.maxHitRoll})`
                : `❌ Failed! (${roll.total} outside ${roll.minHitRoll}–${roll.maxHitRoll})`
            }
          </div>
        </div>
      </div>`
    : '';

  let bodyHtml = '';
  if (pc.phase === 'sanctuary_prompt' || pc.phase === 'sanctuary_done') {
    const hp = state.playerResources?.hp ?? 0;
    const maxHp = state.playerResources?.maxHp ?? 0;
    bodyHtml = `
      <div class="exploration-outcome-box treasure">
        <div class="outcome-header treasure">
          <span class="outcome-icon">🌿</span>
          <h3>Path Card: ${pc.pathCard.name} <small class="muted">(${pc.pathCard.cardNumber})</small></h3>
        </div>
        <div class="exploration-item-card">${renderTcgPathCard(pc.pathCard, { isMini: true })}</div>
        <p class="outcome-msg">
          ${
            pc.phase === 'sanctuary_prompt'
              ? `You discover a tranquil <b>${pc.pathCard.name}</b> in <b>${card.name}</b>. Rest here for free to restore your HP to full (<b>${hp}/${maxHp} HP</b>).`
              : `You rested peacefully at the <b>${pc.pathCard.name}</b> and restored <b>${pc.healedAmount ?? 0} HP</b> (now <b>${hp}/${maxHp} HP</b>).`
          }
        </p>
        <div class="exploration-actions">
          ${
            pc.phase === 'sanctuary_prompt'
              ? `<button class="btn primary big exploration-btn" data-action="path-sanctuary-rest">🌿 Rest for Free (Full Heal)</button>`
              : `<button class="btn primary big exploration-btn" data-action="path-done">Continue Journey &rarr;</button>`
          }
        </div>
      </div>
    `;
  } else if (pc.phase === 'ambush_prompt') {
    bodyHtml = `
      <div class="exploration-outcome-box combat">
        <div class="outcome-header combat">
          <span class="outcome-icon">⚠️</span>
          <h3>Path Card: ${pc.pathCard.name} <small class="muted">(${pc.pathCard.cardNumber})</small></h3>
        </div>
        <div class="exploration-item-card">${renderTcgPathCard(pc.pathCard, { isMini: true })}</div>
        <p class="outcome-msg">
          <b>Ambush!</b> Hostiles leap out from <b>${card.name}</b> (Lvl ${card.level})!
          <br />This triggers a Level ${card.level} Encounter immediately, and <b>the creatures act first</b> before your first turn.
        </p>
        <div class="exploration-actions">
          <button class="btn danger big exploration-btn" data-action="path-ambush-combat">⚔️ Fight Ambush! (Enemies Strike First) &rarr;</button>
        </div>
      </div>
    `;
  } else if (pc.phase === 'chest_prompt' || pc.phase === 'chest_success' || pc.phase === 'chest_fail') {
    const isTrapped = pc.pathCard.templateId === 'trapped_chest';
    const lvl = card.level;
    const strDc = 3 + 2 * lvl;
    const dexDc = (isTrapped ? 1 : 3) + 2 * lvl;
    const intDc = 1 + 2 * lvl;
    const strNet = eff.str - strDc;
    const dexNet = eff.dex - dexDc;
    const intNet = eff.int - intDc;
    const strProb = computeHitProbability(strNet);
    const dexProb = computeHitProbability(dexNet);
    const intProb = computeHitProbability(intNet);

    const chestCardHtml =
      pc.phase === 'chest_success' && pc.foundItem
        ? `<div class="exploration-item-card">${renderTcgItemCard(pc.foundItem, { isMini: true })}</div>`
        : `<div class="exploration-item-card">${renderTcgPathCard(pc.pathCard, { isMini: true })}</div>`;

    bodyHtml = `
      <div class="exploration-outcome-box ${pc.phase === 'chest_fail' ? 'combat' : pc.phase === 'chest_success' ? 'treasure' : ''}">
        <div class="outcome-header ${pc.phase === 'chest_success' ? 'treasure' : pc.phase === 'chest_fail' ? 'combat' : ''}">
          <span class="outcome-icon">${pc.phase === 'chest_fail' ? '💥' : '🗝️'}</span>
          <h3>Path Card: ${pc.pathCard.name} <small class="muted">(${pc.pathCard.cardNumber})</small></h3>
        </div>
        ${chestCardHtml}
        <p class="outcome-msg">
          ${
            pc.phase === 'chest_prompt'
              ? `You found a <b>${pc.pathCard.name}</b> in <b>${card.name}</b> (Lvl ${lvl}). Choose how to open it—or abandon it safely. Failure detonates the chest, <b>destroying the treasure inside</b> and dealing <b>3 damage</b>.`
              : pc.phase === 'chest_success'
              ? (pc.foundItem
                  ? `Success! You opened the <b>${pc.pathCard.name}</b> and claimed <b>${pc.foundItem.name}</b> into your backpack!`
                  : `Success! You opened the <b>${pc.pathCard.name}</b>, though the Treasure Deck was empty.`)
              : `💥 The <b>${pc.pathCard.name}</b> exploded! You took <b>3 damage</b>${
                  pc.destroyedItem ? ` and <b>${pc.destroyedItem.name}</b> inside was destroyed` : ''
                }.`
          }
        </p>
        ${pc.phase !== 'chest_prompt' ? `${qteBarHtml}${diceReadoutHtml}` : ''}
        <div class="exploration-actions" style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">
          ${
            pc.phase === 'chest_prompt'
              ? `
                <button class="btn primary exploration-btn" data-action="path-chest-force">
                  💪 Force Open (STR ${eff.str} &minus; ${strDc} = ${strNet >= 0 ? '+' : ''}${strNet} · ${strProb.hitPercent}%)
                </button>
                <button class="btn primary exploration-btn" data-action="path-chest-lockpick">
                  🗝️ Lockpick (DEX ${eff.dex} &minus; ${dexDc} = ${dexNet >= 0 ? '+' : ''}${dexNet} · ${dexProb.hitPercent}%)
                </button>
                ${
                  !isTrapped
                    ? `<button class="btn primary exploration-btn" data-action="path-chest-seal">
                        ✨ Remove Seal (INT ${eff.int} &minus; ${intDc} = ${intNet >= 0 ? '+' : ''}${intNet} · ${intProb.hitPercent}%)
                      </button>`
                    : ''
                }
                <button class="btn secondary exploration-btn" data-action="path-chest-abandon">
                  🚶 Abandon
                </button>
              `
              : `<button class="btn primary big exploration-btn" data-action="path-done">Continue Journey &rarr;</button>`
          }
        </div>
      </div>
    `;
  } else if (pc.phase === 'gold_stash_prompt' || pc.phase === 'gold_stash_done') {
    bodyHtml = `
      <div class="exploration-outcome-box treasure">
        <div class="outcome-header treasure">
          <span class="outcome-icon">💰</span>
          <h3>Path Card: ${pc.pathCard.name} <small class="muted">(${pc.pathCard.cardNumber})</small></h3>
        </div>
        <div class="exploration-item-card">${renderTcgPathCard(pc.pathCard, { isMini: true })}</div>
        <p class="outcome-msg">
          ${
            pc.phase === 'gold_stash_prompt'
              ? `You uncovered a hidden <b>${pc.pathCard.name}</b> in <b>${card.name}</b>! Roll 1d6: <b>1–3</b> = +10 Gold, <b>4–5</b> = +20 Gold, <b>6</b> = +30 Gold.`
              : `🎲 Rolled <b>1d6 = ${pc.goldRollDie}</b>! You collected <b>+${pc.goldAwarded ?? 0} Gold</b>!`
          }
        </p>
        <div class="exploration-actions">
          ${
            pc.phase === 'gold_stash_prompt'
              ? `<button class="btn primary big exploration-btn" data-action="path-gold-roll">🎲 Roll 1d6 for Gold</button>`
              : `<button class="btn primary big exploration-btn" data-action="path-done">Continue Journey &rarr;</button>`
          }
        </div>
      </div>
    `;
  } else if (isSpringTrapPhase) {
    const dc = 1 + 2 * card.level;
    bodyHtml = `
      <div class="exploration-outcome-box ${pc.phase === 'spring_trap_fail' ? 'combat' : pc.phase === 'spring_trap_success' ? 'treasure' : ''}">
        <div class="outcome-header ${pc.phase === 'spring_trap_fail' ? 'combat' : pc.phase === 'spring_trap_success' ? 'treasure' : ''}">
          <span class="outcome-icon">🪤</span>
          <h3>Path Card: ${pc.pathCard.name} <small class="muted">(${pc.pathCard.cardNumber})</small></h3>
        </div>
        <div class="exploration-item-card">${renderTcgPathCard(pc.pathCard, { isMini: true })}</div>
        <p class="outcome-msg">
          ${
            pc.phase === 'spring_trap_prompt'
              ? `A concealed <b>${pc.pathCard.name}</b> snaps beneath you in <b>${card.name}</b> (Lvl ${card.level})! Pass an <b>AGI</b> check to dodge, or suffer <b>4 direct damage</b>.`
              : pc.phase === 'spring_trap_success'
              ? `✅ You leaped clear of the <b>${pc.pathCard.name}</b> and avoided all damage!`
              : `❌ The <b>${pc.pathCard.name}</b> struck you for <b>4 direct damage</b>!`
          }
        </p>
        <p class="muted" style="font-size:0.84rem;">
          <b>MACG-3D6™ Success Check Bar:</b> AGI (${eff.agi}) &minus; (1 + 2 &times; Terrain Lvl ${card.level} = ${dc}) = <b>${net >= 0 ? '+' : ''}${net}</b> &middot; <b>Tier ${tier}</b> (${prob.hitPercent}%)
        </p>
        ${qteBarHtml}
        ${diceReadoutHtml}
        <div class="exploration-actions">
          ${
            pc.phase === 'spring_trap_prompt'
              ? `<button class="btn primary big exploration-btn" data-action="path-spring-trap-roll">🎲 Roll Dodge Check (3d6)</button>`
              : `<button class="btn primary big exploration-btn" data-action="path-done">Continue Journey &rarr;</button>`
          }
        </div>
      </div>
    `;
  } else if (pc.phase === 'merchant_offer') {
    const stock = pc.merchantStock ?? [];
    const gold = state.playerResources?.gold ?? 0;
    const normalDiscPct = Math.min(90, Math.max(0, eff.cha * 5));
    const merchantDiscPct = Math.min(90, normalDiscPct * 2);
    const itemsHtml = stock.length > 0
      ? `<div class="merchant-offer-grid" style="display:flex;flex-wrap:wrap;gap:14px;justify-content:center;margin:12px 0;">
          ${stock
            .map((item) => {
              const cost = calculateMerchantGoodsPrice(item.buyPrice, eff.cha);
              const canAfford = gold >= cost;
              const itemId = item.instanceId ?? item.id;
              return `
                <div class="merchant-offer-card" style="display:flex;flex-direction:column;align-items:center;gap:8px;">
                  ${renderTcgItemCard(item, { isMini: true })}
                  <div class="merchant-offer-price muted" style="font-size:0.84rem;">
                    Base: <s>${item.buyPrice}G</s> &rarr; <b>${cost} Gold</b>
                  </div>
                  <button class="btn ${canAfford ? 'primary' : 'secondary'}" data-action="path-merchant-buy" data-id="${itemId}" ${canAfford ? '' : 'disabled'}>
                    ${canAfford ? `🛒 Buy (${cost} Gold)` : `Need ${cost} Gold`}
                  </button>
                </div>
              `;
            })
            .join('')}
        </div>`
      : `<p class="outcome-msg">You purchased all of the Merchant&apos;s wares!</p>`;

    bodyHtml = `
      <div class="exploration-outcome-box treasure">
        <div class="outcome-header treasure">
          <span class="outcome-icon">🧳</span>
          <h3>Path Card: ${pc.pathCard.name} <small class="muted">(${pc.pathCard.cardNumber})</small></h3>
        </div>
        <div class="exploration-item-card">${renderTcgPathCard(pc.pathCard, { isMini: true })}</div>
        <p class="outcome-msg">
          A wandering <b>${pc.pathCard.name}</b> emerges in <b>${card.name}</b>, offering the top 2 cards from the Treasure Deck at <b>double your DISC</b>!
        </p>
        <p class="muted" style="font-size:0.84rem;">
          <b>Your Gold:</b> ${gold} Gold &middot; <b>Charisma (${eff.cha}):</b> Normal DISC ${normalDiscPct}% &rarr; Merchant <b>${merchantDiscPct}% OFF</b> (rounded up)
        </p>
        ${itemsHtml}
        <div class="exploration-actions">
          <button class="btn secondary big exploration-btn" data-action="path-done">
            ${stock.length > 0 ? 'Decline &amp; Leave &rarr;' : 'Continue Journey &rarr;'}
          </button>
        </div>
      </div>
    `;
  } else if (!isTreasurePhase) {
    bodyHtml = `
      <div class="exploration-outcome-box ${pc.phase === 'sneak_fail' ? 'combat' : pc.phase === 'sneak_success' ? 'treasure' : ''}">
        <div class="outcome-header">
          <span class="outcome-icon">🧭</span>
          <h3>Path Card: ${pc.pathCard.name} <small class="muted">(${pc.pathCard.cardNumber})</small></h3>
        </div>
        <div class="exploration-item-card">${renderTcgPathCard(pc.pathCard, { isMini: true })}</div>
        <p class="outcome-msg">
          You wandered into <b>${card.name}</b> (Lvl ${card.level}) and see hostiles ahead! Perform a <b>Sneak Check</b> to avoid being noticed.
        </p>
        <p class="muted" style="font-size:0.84rem;">
          <b>MACG-3D6™ Success Check Bar:</b> AGI (${eff.agi}) &minus; (Terrain Lvl ${card.level} &times; 2) = <b>${net >= 0 ? '+' : ''}${net}</b> &middot; <b>Tier ${tier}</b> (${prob.hitPercent}%)
          <br />If you fail, you must fight the hostiles—<b>fleeing from that battle forfeits your Treasure Discovery roll</b>.
        </p>
        ${qteBarHtml}
        ${diceReadoutHtml}
        <div class="exploration-actions">
          ${
            pc.phase === 'sneak_prompt'
              ? `<button class="btn primary big exploration-btn" data-action="path-roll-sneak">🎲 Roll Sneak Check (3d6)</button>`
              : pc.phase === 'sneak_success'
              ? `<button class="btn primary big exploration-btn" data-action="path-to-treasure">💎 Sneak Succeeded! Roll Treasure Discovery &rarr;</button>`
              : `<button class="btn danger big exploration-btn" data-action="path-start-combat">⚔️ Spotted! Fight Encounter &rarr;</button>`
          }
        </div>
      </div>
    `;
  } else {
    const foundItem = pc.foundItem;
    const itemCardHtml = foundItem
      ? `<div class="exploration-item-card">${renderTcgItemCard(foundItem, { isMini: true })}</div>`
      : '';
    bodyHtml = `
      <div class="exploration-outcome-box ${pc.phase === 'treasure_success' ? 'treasure' : pc.phase === 'treasure_fail' ? 'safe' : ''}">
        <div class="outcome-header ${pc.phase === 'treasure_success' ? 'treasure' : ''}">
          <span class="outcome-icon">💎</span>
          <h3>${
            pc.phase === 'treasure_success'
              ? (foundItem ? 'Treasure Found!' : 'No Eligible Treasure')
              : pc.phase === 'treasure_fail'
              ? 'You Find Nothing'
              : 'Treasure Discovery Roll'
          }</h3>
        </div>
        <p class="outcome-msg">
          ${
            pc.phase === 'treasure_prompt'
              ? `Search <b>${card.name}</b> for hidden loot! Draws from the Treasure Deck until an item of <b>Lvl &le; ${card.level}</b> is found (higher-level cards are discarded).`
              : pc.phase === 'treasure_fail'
              ? `You searched <b>${card.name}</b> thoroughly, but <b>you find nothing</b>.`
              : foundItem
              ? `You uncovered <b>${foundItem.name}</b> (Lvl ${foundItem.level ?? 1}) and tucked it into your backpack!`
              : `Your search succeeded, but no eligible Lvl &le; ${card.level} treasure remains in the deck.`
          }
        </p>
        <p class="muted" style="font-size:0.84rem;">
          <b>MACG-3D6™ Success Check Bar:</b> DEX (${eff.dex}) &minus; (Terrain Lvl ${card.level} &times; 2) = <b>${net >= 0 ? '+' : ''}${net}</b> &middot; <b>Tier ${tier}</b> (${prob.hitPercent}%)
        </p>
        ${qteBarHtml}
        ${diceReadoutHtml}
        ${itemCardHtml}
        <div class="exploration-actions">
          ${
            pc.phase === 'treasure_prompt'
              ? `<button class="btn primary big exploration-btn" data-action="path-roll-treasure">🎲 Roll Treasure Discovery (3d6)</button>`
              : `<button class="btn primary big exploration-btn" data-action="path-done">Continue Journey &rarr;</button>`
          }
        </div>
      </div>
    `;
  }

  return `
  <div class="modal-backdrop exploration-backdrop">
    <div class="modal exploration-modal">
      <div class="exploration-card-header">
        <span class="exploration-terrain-icon">${terrain.icon}</span>
        <div class="exploration-title-group">
          <h2>${card.name}</h2>
          <span class="exploration-level-pill">Level ${card.level} Undiscovered Terrain &middot; ${pc.pathCard.name}</span>
        </div>
      </div>
      ${bodyHtml}
    </div>
  </div>`;
}

export function victoryModal(
  victory: CombatVictoryState,
  _state?: RunState
): string {
  const isBoss = victory.isBoss;
  const foesHtml = victory.defeatedMonsters
    .map((m) => {
      const img = getMonsterIllustration(m.templateId);
      return `
      <div class="defeated-foe-card">
        <div class="foe-art-thumb">
          ${img}
          <span class="foe-defeated-tag">DEFEATED</span>
        </div>
        <div class="foe-meta">
          <span class="foe-name">${m.name}</span>
          <span class="foe-sub">${formatCreatureSubtype(m.creatureType)} &middot; Level ${m.level}</span>
          <div class="foe-rewards">
            <span class="reward-pill sp">${getResourceIcon('sp', 'chip-icon')} +${m.statPointReward} SP</span>
            <span class="reward-pill gold">${getResourceIcon('gold', 'chip-icon')} +${m.goldReward} Gold</span>
          </div>
        </div>
      </div>`;
    })
    .join('');

  const luckyCharmBonus = victory.luckyCharmGold;
  const hasBonuses = luckyCharmBonus > 0;

  return `
  <div class="modal-backdrop victory-backdrop">
    <div class="modal victory-modal">
      <!-- Header with Laurel & Title -->
      <div class="victory-header">
        <div class="victory-badge">🏆 VICTORY</div>
        <h2>Battle Won!</h2>
        <p class="victory-subtitle">All hostiles vanquished &middot; Spoils of battle claimed</p>
      </div>

      <!-- Defeated Monsters Section -->
      <div class="victory-section defeated-foes-section">
        <div class="victory-section-label">Defeated Foes</div>
        <div class="defeated-foes-list">
          ${foesHtml}
        </div>
      </div>

      <!-- Rewards & Loots Gained -->
      <div class="victory-section victory-spoils-section">
        <div class="victory-section-label">Loot &amp; Rewards Claimed</div>
        <div class="victory-rewards-grid">
          <div class="victory-reward-card sp">
            <div class="reward-card-header">
              ${getResourceIcon('sp', 'chip-icon')}
              <span class="reward-card-title">Stat Points</span>
            </div>
            <div class="reward-amount">+${victory.statPointsEarned} SP</div>
            <div class="reward-note">Inscribed directly for Sacred Shrine upgrades</div>
          </div>
          <div class="victory-reward-card gold">
            <div class="reward-card-header">
              ${getResourceIcon('gold', 'chip-icon')}
              <span class="reward-card-title">Gold Spoils</span>
            </div>
            <div class="reward-amount">+${victory.goldEarned} Gold</div>
            <div class="reward-breakdown">
              ${
                hasBonuses
                  ? `Base: +${victory.baseGold}g${
                      luckyCharmBonus > 0 ? ` &middot; Goldstar: +${luckyCharmBonus}g` : ''
                    }`
                  : 'Added directly to your treasury'
              }
            </div>
          </div>
        </div>
      </div>

      <!-- OK / Return to Map Action -->
      <div class="victory-actions">
        <button class="btn primary big victory-btn" data-action="confirm-victory">
          ${isBoss ? 'OK &mdash; Proceed &rarr;' : 'OK &mdash; Return to Map &rarr;'}
        </button>
      </div>
    </div>
  </div>`;
}

export function shrineModal(state: RunState, ui: UiState): string {
  const shrine = state.activeHook.type === 'SHRINE' ? state.activeHook.shrine : null;
  const prayerHtml = shrine ? shrinePrayerSection(shrine) : '';
  const node = shrine ? state.board[coordToKey(shrine.coord)] : null;
  const shrineCard = shrine?.shrineCard ?? node?.attachedShrineCard ?? node?.card ?? null;
  const shrineLevel = shrineCard?.level ?? 0;
  const leaveLabel = shrine?.returnToVillage ? 'Back to Village &rarr;' : 'Leave Shrine &rarr;';

  return `
  <div class="modal-backdrop">
    <div class="modal shrine-modal">
      <header class="shrine-modal-heading">
        <div>
          <span class="shrine-heading-eyebrow">Sacred Shrine · Level ${shrineLevel}</span>
          <h2>&#10022; ${shrineCard?.name ?? 'Sacred Shrine'}</h2>
        </div>
        <p class="banner-inline">${state.bannerMessage}</p>
      </header>

      <div class="shrine-modal-layout">
        <aside class="shrine-context-column">
          ${shrineCard ? eventAdventureCardHtml(shrineCard, '✦ SHRINE') : ''}
          ${shrineCard ? `<section class="shrine-lore-panel">
            <span class="shrine-lore-eyebrow">Lore of the Shrine</span>
            <p>${shrineCard.flavorText ?? 'An ancient sacred place where a hero may reflect, grow, and choose a new path.'}</p>
          </section>` : ''}
        </aside>
        <div class="shrine-services-column">
          ${prayerHtml}
          ${statUpgradeWidgetHtml(state, 'shrine-upgrade', ui.selectedShrineStat ?? null)}
          ${shrineSkillUpgradeSection(state)}
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn primary big" data-action="request-leave-shrine">${leaveLabel}</button>
      </div>
    </div>
  </div>`;
}

export function shrineConfirmModal(state: RunState, pending: PendingShrineAction): string {
  if (state.activeHook.type !== 'SHRINE' || !state.playerResources) return '';
  const res = state.playerResources;

  if (pending.kind === 'leave') {
    return `
    <div class="modal-backdrop transaction-confirm-backdrop" data-action="cancel-shrine-action-backdrop">
      <div class="modal shrine-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="shrine-confirm-title">
        <header class="confirm-modal-header">
          <h2 id="shrine-confirm-title">Leave this Shrine?</h2>
          <button class="modal-close-btn" data-action="cancel-shrine-action" aria-label="Cancel">&times;</button>
        </header>
        <div class="shrine-confirm-copy">
          <p>You are about to leave this Sacred Shrine and return to the map.</p>
          <p class="muted">Any upgrades already completed remain permanent.</p>
        </div>
        <footer class="confirm-modal-footer">
          <button class="btn primary big" data-action="confirm-shrine-action">Confirm Leave</button>
          <button class="btn secondary" data-action="cancel-shrine-action">Stay at Shrine</button>
        </footer>
      </div>
    </div>`;
  }

  if (pending.kind === 'upgrade-stat') {
    const stat = pending.stat;
    const base = state.playerBaseStats[stat];
    const effective = getEffectiveStatsFromState(state)[stat];
    const cost = getBaseStatUpgradeCost(base);
    const cap = getActiveShrineBaseStatCap(state);
    const canConfirm = (cap === null || base < cap) && res.statPoints >= cost;
    return `
    <div class="modal-backdrop transaction-confirm-backdrop" data-action="cancel-shrine-action-backdrop">
      <div class="modal shrine-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="shrine-confirm-title">
        <header class="confirm-modal-header">
          <h2 id="shrine-confirm-title">Upgrade ${stat.toUpperCase()}?</h2>
          <button class="modal-close-btn" data-action="cancel-shrine-action" aria-label="Cancel">&times;</button>
        </header>
        <div class="shrine-confirm-stat-preview">
          ${getStatIcon(stat, 'stat-icon')}
          <div><b>${stat.toUpperCase()} ${effective} &rarr; ${effective + 1}</b><span>Base ${base} &rarr; ${base + 1}</span></div>
        </div>
        <div class="shrine-confirm-cost">Spend <b>${cost} SP</b> &middot; Current balance: <b>${res.statPoints} SP</b></div>
        <p class="muted">This Base Stat upgrade is permanent.</p>
        <footer class="confirm-modal-footer">
          <button class="btn primary big" data-action="confirm-shrine-action" ${canConfirm ? '' : 'disabled'}>Confirm Upgrade</button>
          <button class="btn secondary" data-action="cancel-shrine-action">Cancel</button>
        </footer>
      </div>
    </div>`;
  }

  const option = getShrineSkillUpgradeOptions(state)
    .find(candidate => candidate.source.instanceId === pending.sourceInstanceId);
  if (!option) return '';
  const canConfirm = res.gold >= option.goldCost && res.statPoints >= option.statPointCost;
  const stats = getEffectiveStatsFromState(state);
  return `
  <div class="modal-backdrop transaction-confirm-backdrop" data-action="cancel-shrine-action-backdrop">
    <div class="modal shrine-confirm-modal shrine-skill-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="shrine-confirm-title">
      <header class="confirm-modal-header">
        <h2 id="shrine-confirm-title">Upgrade ${option.source.name}?</h2>
        <button class="modal-close-btn" data-action="cancel-shrine-action" aria-label="Cancel">&times;</button>
      </header>
      <div class="shrine-confirm-skill-cards">
        ${combatCardHtml(option.source, stats, false, 'play-card', true, state, true)}
        <span aria-hidden="true">&rarr;</span>
        ${combatCardHtml(option.upgrade, stats, false, 'play-card', true, state, true)}
      </div>
      <div class="shrine-confirm-cost">Spend <b>${option.goldCost} Gold + ${option.statPointCost} SP</b></div>
      <footer class="confirm-modal-footer">
        <button class="btn primary big" data-action="confirm-shrine-action" ${canConfirm ? '' : 'disabled'}>Confirm Upgrade</button>
        <button class="btn secondary" data-action="cancel-shrine-action">Cancel</button>
      </footer>
    </div>
  </div>`;
}

export function endTurnConfirmModal(combat: ActiveCombatState): string {
  const apLeft = combat.playerAp;
  return `
  <div class="modal-backdrop transaction-confirm-backdrop" data-action="cancel-end-turn-backdrop">
    <div class="modal training-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="end-turn-confirm-title">
      <header class="confirm-modal-header">
        <h2 id="end-turn-confirm-title">End Turn with Unused AP?</h2>
        <button class="modal-close-btn" data-action="cancel-end-turn" aria-label="Cancel">&times;</button>
      </header>
      <div class="training-confirm-body">
        <div class="training-confirm-copy">
          <p>You still have <b>${apLeft} AP</b> remaining this turn.</p>
          <p class="muted">Any remaining hand cards will be discarded and the enemies will take their turn.</p>
        </div>
      </div>
      <footer class="confirm-modal-footer">
        <button class="btn danger big" data-action="confirm-end-turn">End Turn Anyway</button>
        <button class="btn secondary" data-action="cancel-end-turn">Keep Playing</button>
      </footer>
    </div>
  </div>`;
}

export function useItemConfirmModal(state: RunState, itemInstanceId: string): string {
  const item = state.backpack.find((i) => i.instanceId === itemInstanceId);
  const res = state.playerResources;
  if (!item || !res) return '';
  const healPreview = item.healAmount ? Math.min(res.maxHp - res.hp, item.healAmount) : 0;
  return `
  <div class="modal-backdrop transaction-confirm-backdrop" data-action="cancel-use-item-backdrop">
    <div class="modal training-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="use-item-confirm-title">
      <header class="confirm-modal-header">
        <h2 id="use-item-confirm-title">Use ${item.name}?</h2>
        <button class="modal-close-btn" data-action="cancel-use-item" aria-label="Cancel">&times;</button>
      </header>
      <div class="training-confirm-body">
        <div class="training-confirm-card">${renderTcgItemCard(item, { isMini: true })}</div>
        <div class="training-confirm-copy">
          <p>${item.description}</p>
          ${item.healAmount ? `<p>Restores <b>+${healPreview} HP</b> (${res.hp} &rarr; ${res.hp + healPreview} / ${res.maxHp} HP).</p>` : ''}
          <p class="muted">This consumable will be spent and moved to the Treasure Discard Pile.</p>
        </div>
      </div>
      <footer class="confirm-modal-footer">
        <button class="btn primary big" data-action="confirm-use-item">Use ${item.name}</button>
        <button class="btn secondary" data-action="cancel-use-item">Cancel</button>
      </footer>
    </div>
  </div>`;
}

export function sellItemConfirmModal(state: RunState, itemInstanceId: string): string {
  const item = state.backpack.find((i) => i.instanceId === itemInstanceId);
  if (!item) return '';
  return `
  <div class="modal-backdrop transaction-confirm-backdrop" data-action="cancel-sell-item-backdrop">
    <div class="modal training-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="sell-item-confirm-title">
      <header class="confirm-modal-header">
        <h2 id="sell-item-confirm-title">Sell ${item.name}?</h2>
        <button class="modal-close-btn" data-action="cancel-sell-item" aria-label="Cancel">&times;</button>
      </header>
      <div class="training-confirm-body">
        <div class="training-confirm-card">${renderTcgItemCard(item, { isMini: true })}</div>
        <div class="training-confirm-copy">
          <p>Are you sure you want to sell <b>${item.name}</b> for <b>${item.sellPrice} Gold</b>?</p>
          <p class="muted">Sold items are <b>Banished</b> into <b>The Void</b> for the rest of this adventure instead of returning to the Treasure Discard Pile.</p>
        </div>
      </div>
      <footer class="confirm-modal-footer">
        <button class="btn danger big" data-action="confirm-sell-item">Sell for ${item.sellPrice} Gold</button>
        <button class="btn secondary" data-action="cancel-sell-item">Cancel</button>
      </footer>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Village
// ---------------------------------------------------------------------------


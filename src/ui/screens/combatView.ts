import {
  computeCardEffect,
  computeHitProbability,
  firstLivingMonsterIndex,
  FLEE_AP_COST,
  getHeroStatDebuffMods,
  getMonsterEffectiveAtk,
  getMonsterEffectiveDef,
  getMonsterIntent,
} from '../../core/combat';
import { parseGameLogEntry } from '../../core/log';
import {
  computeCombatGearBonuses,
  getEffectiveStatsFromState,
  getFighterBerzerkBonus,
  getPlayerAcc,
  getPlayerEva,
} from '../../core/stats';
import {
  ActiveCombatState,
  CharacterStats,
  CombatMonster,
  MonsterCard,
  MonsterIntent,
  RunState,
} from '../../core/types';
import { createFleeCard } from '../../data/combatCards';
import { MONSTER_TEMPLATES } from '../../data/monsters';
import { getActionRasterArtPath, getAdventurerRasterArtPath, getMonsterIllustration } from '../cardArt';
import { renderQteHitCheckBarHtml } from '../components/qteBar';
import { getDerivedStatIcon, getResourceIcon } from '../icons';
import { getPlayerClassName } from './classSelect';
import { PendingCardPlay, PendingDiceRoll, UiState } from '../types';
import {
  combatCardHtml,
  formatCreatureSubtype,
  monsterRaritySymbolHtml,
  renderSpawnBadges,
} from '../render';
export function getMonsterCarouselClass(i: number, target: number, total: number): string {
  if (total <= 1) {
    return 'is-center';
  }
  if (total === 2) {
    if (i === target) return 'is-center';
    return target === 0 ? 'is-next' : 'is-prev';
  }
  if (i === target) {
    return 'is-center';
  }
  const prevIdx = (target - 1 + total) % total;
  const nextIdx = (target + 1) % total;
  if (i === prevIdx) {
    return 'is-prev';
  }
  if (i === nextIdx) {
    return 'is-next';
  }
  return 'is-hidden';
}

export function updateMonsterCarouselDom(
  container: HTMLElement,
  combat: ActiveCombatState,
  targetIndex: number,
  playerAcc: number,
): boolean {
  const track = container.querySelector<HTMLElement>('.monster-carousel-track');
  if (!track) return false;

  const total = combat.monsters.length;
  const target =
    targetIndex >= 0 && targetIndex < total
      ? targetIndex
      : (firstLivingMonsterIndex(combat) >= 0 ? firstLivingMonsterIndex(combat) : 0);

  combat.monsters.forEach((cm, i) => {
    const unit = track.querySelector<HTMLElement>(`.combat-monster-unit[data-id="${i}"]`);
    if (!unit) return;

    unit.classList.remove('is-center', 'is-prev', 'is-next', 'is-hidden', 'is-selected-unit', 'selected');
    const card = unit.querySelector<HTMLElement>('.tcg-creature');
    if (card) {
      card.classList.remove('is-targeted');
    }

    const posClass = getMonsterCarouselClass(i, target, total);
    posClass.split(' ').forEach((c) => {
      if (c) unit.classList.add(c);
    });

    const isSelected = i === target && cm.hp > 0;
    if (isSelected) {
      unit.classList.add('is-selected-unit', 'selected');
      if (card) card.classList.add('is-targeted');
    }

    const header = unit.querySelector<HTMLElement>('.combat-target-header');
    if (header) {
      const netAcc = playerAcc !== undefined ? playerAcc - ((cm.monster.eva ?? 0) + (cm.evaBonus ?? 0)) : null;
      const prob = netAcc !== null ? computeHitProbability(netAcc) : null;
      const targetText = prob !== null
        ? `🎯 TARGET (Hit: ${prob.minHitRoll}–${prob.maxHitRoll} · ${prob.hitPercent}%)`
        : '🎯 TARGET';
      const badgeHtml = isSelected
        ? `<div class="combat-target-badge-top">${targetText}</div>`
        : '<div class="combat-target-spacer"></div>';
      const infoBtn = header.querySelector<HTMLElement>('.combat-monster-info-btn');
      header.innerHTML = `${badgeHtml}${infoBtn ? infoBtn.outerHTML : ''}`;
    }
  });

  return true;
}

export function creatureHeaderHtml(monster: MonsterCard): string {
  return `<header class="tcg-header creature-header">
    <div class="creature-header-top">
      <span class="tcg-level-ribbon">Lvl ${monster.level}</span>
      ${monster.isBoss ? '<span class="tcg-type-main">BOSS</span>' : ''}
      <span class="tcg-type-sub">${formatCreatureSubtype(monster.creatureType)}</span>
      <div class="tcg-spawn-group" aria-label="Spawn terrains: ${(monster.spawnTerrains ?? []).join(', ')}">${renderSpawnBadges(monster.spawnTerrains)}</div>
    </div>
    <div class="creature-header-title"><span class="tcg-name">${monster.name}</span><span class="tcg-card-num">${monster.cardNumber ?? ''}</span></div>
  </header>`;
}

export function creatureFooterHtml(monster: MonsterCard, attackBonus = 0, accBonus = 0, evaBonus = 0, defBonus = 0): string {
  const entries = [
    { stat: 'atk' as const, value: Math.max(0, (monster.atk ?? 0) + attackBonus), boosted: attackBonus !== 0 },
    { stat: 'def' as const, value: Math.max(0, (monster.def ?? 0) + defBonus), boosted: defBonus !== 0 },
    { stat: 'mdef' as const, value: monster.mdef ?? 0, boosted: false },
    { stat: 'acc' as const, value: (monster.acc ?? 1) + accBonus, boosted: accBonus > 0 },
    { stat: 'eva' as const, value: (monster.eva ?? 0) + evaBonus, boosted: evaBonus > 0 },
  ];
  return `<footer class="tcg-footer creature-stat-footer">
    <span class="creature-footer-hp">HP <b>${monster.maxHp}</b></span>
    <div class="creature-footer-stats">${entries.filter(entry => entry.value > 0).map(entry => `<span class="creature-footer-stat ${entry.boosted ? 'is-buffed-flashing' : ''}" data-creature-stat="${entry.stat}" aria-label="${entry.stat.toUpperCase()}: ${entry.value}">${getDerivedStatIcon(entry.stat, 'chip-icon')} <b>${entry.value}</b></span>`).join('')}</div>
  </footer>`;
}

interface FullCreatureCardOptions {
  monster: MonsterCard;
  attackBonus?: number;
  accBonus?: number;
  evaBonus?: number;
  defBonus?: number;
  className?: string;
  artWindowClassName?: string;
  artOverlayHtml?: string;
  attributes?: string;
}

/**
 * The canonical full-size creature card face. Battle and card inspection use
 * this same markup; callers supply only live combat presentation differences.
 */
export function fullCreatureCardHtml({
  monster,
  attackBonus = 0,
  accBonus = 0,
  evaBonus = 0,
  defBonus = 0,
  className = '',
  artWindowClassName = '',
  artOverlayHtml = '',
  attributes = '',
}: FullCreatureCardOptions): string {
  const templateClass = monster.isBoss ? 'is-boss tcg-template-boss' : 'tcg-template-grassland';
  const illustration = getMonsterIllustration(monster.templateId);
  const pattern = monster.pattern?.length ? monster.pattern : [{ label: 'Idle', damage: 0, block: 0 }];

  return `
    <div class="tcg-card tcg-creature ${templateClass} ${className}" ${attributes}>
      <div class="tcg-inner-frame">
        <div class="tcg-art-window ${artWindowClassName}">
          ${illustration}
          ${artOverlayHtml}
        </div>
        ${creatureHeaderHtml(monster)}
        <div class="tcg-art-spacer">
          <div class="tcg-art-rewards">
            <div class="tcg-art-reward-badge gold" title="Reward: +${monster.goldReward} Gold">
              ${getResourceIcon('gold', 'chip-icon')} <span>+${monster.goldReward}</span>
            </div>
            <div class="tcg-art-reward-badge sp" title="Reward: +${monster.statPointReward} SP">
              ${getResourceIcon('sp', 'chip-icon')} <span>+${monster.statPointReward}</span>
            </div>
          </div>
          ${monsterRaritySymbolHtml(monster, 'tcg-creature-rarity-symbol')}
        </div>
        <div class="tcg-textbox tcg-creature-textbox">
          ${monster.abilities?.length ? `<div class="tcg-ability-line">${monster.abilities.join(' &middot; ')}</div>` : ''}
          ${
            attackBonus > 0
              ? `<div class="tcg-active-boon-badge is-buffed-flashing" title="Temporary attack boon active">🔥 Boon: +${attackBonus} ATK</div>`
              : ''
          }
          <div class="tcg-pattern-table">
            ${pattern.map((p, index) => {
              const effectiveDamage = p.damage > 0 ? p.damage + attackBonus : 0;
              const isBuffed = p.damage > 0 && attackBonus > 0;
              const hasPriorEffect = effectiveDamage > 0 || (p.heal ?? 0) > 0 || p.block > 0 || (p.evaBonus ?? 0) > 0 || (p.accBonus ?? 0) > 0 || (p.defBonus ?? 0) !== 0 || Boolean(p.randomBuff);
              return `
                <div class="tcg-pattern-row ${isBuffed ? 'is-buffed-row' : ''}">
                  <span class="p-turn">Turn ${index + 1}</span>
                  <span class="p-label">${p.label}</span>
                  ${p.poisonOnHit ? '<span>Poison on hit</span>' : ''}
                  ${p.ignoreDef ? `<span>Ignore ${p.ignoreDef} DEF</span>` : ''}
                  <span class="p-val">${
                    effectiveDamage > 0
                      ? `<span class="${isBuffed ? 'is-buffed-flashing' : ''}" title="${isBuffed ? `Base ${p.damage} + ${attackBonus} Boon` : ''}"><b>${effectiveDamage}</b> ${p.damageType === 'magical' ? 'MATK' : 'DMG'}${(p.hitCount ?? 1) > 1 ? ` ×${p.hitCount}` : ''}</span>`
                      : ''
                  }${
                    p.heal && p.heal > 0
                      ? (effectiveDamage > 0 ? ' &middot; ' : '') + `+<b>${p.heal}</b> HP`
                      : ''
                  }${
                    p.block > 0
                      ? (effectiveDamage > 0 || (p.heal && p.heal > 0) ? ' &middot; ' : '') + `+<b>${p.block}</b> Blk`
                      : ''
                  }${
                    p.evaBonus && p.evaBonus > 0
                      ? (effectiveDamage > 0 || (p.heal && p.heal > 0) || p.block > 0 ? ' &middot; ' : '') + `+<b>${p.evaBonus}</b> EVA`
                      : ''
                  }${
                    p.accBonus && p.accBonus > 0
                      ? (effectiveDamage > 0 || (p.heal && p.heal > 0) || p.block > 0 || (p.evaBonus && p.evaBonus > 0) ? ' &middot; ' : '') + `+<b>${p.accBonus}</b> ACC`
                      : ''
                  }${
                    p.defBonus && p.defBonus !== 0
                      ? `${effectiveDamage > 0 || (p.heal ?? 0) > 0 || p.block > 0 || (p.evaBonus ?? 0) > 0 || (p.accBonus ?? 0) > 0 ? ' &middot; ' : ''}${p.defBonus > 0 ? '+' : ''}<b>${p.defBonus}</b> DEF (${p.bonusDuration ?? 1}t)`
                      : ''
                  }${
                    p.randomBuff
                      ? `${effectiveDamage > 0 || (p.heal ?? 0) > 0 || p.block > 0 ? ' &middot; ' : ''}Random +<b>${p.randomBuff.amount}</b> ${p.randomBuff.stats.map(stat => stat.toUpperCase()).join(' / ')} (${p.randomBuff.duration}t)`
                      : ''
                  }${
                    p.summonFromMonsterDeck
                      ? (hasPriorEffect || (p.defBonus ?? 0) > 0 ? ' &middot; ' : '') + `Summon ${MONSTER_TEMPLATES[p.summonFromMonsterDeck].name}`
                      : ''
                  }${
                    p.damagePerCreatureInPlay
                      ? ` +${p.damagePerCreatureInPlay.amount} per ${MONSTER_TEMPLATES[p.damagePerCreatureInPlay.templateId].name} in play`
                      : ''
                  }${
                    p.damagePerHeroDebuff
                      ? ` +${p.damagePerHeroDebuff} MATK per active Hero debuff`
                      : ''
                  }${
                    p.heroStatDebuff ? heroHexIntentHtml(p) : p.heroEvaDebuff && p.heroEvaDebuff > 0
                      ? (hasPriorEffect ? ' &middot; ' : '') + `-<b>${p.heroEvaDebuff}</b> Hero EVA (${p.heroEvaDebuffDuration ?? 2}t)`
                      : ''
                  }${
                    !p.heroStatDebuff && !p.poisonOnHit && !hasPriorEffect && !p.summonFromMonsterDeck && !p.defBonus && !p.randomBuff && (!p.heroEvaDebuff || p.heroEvaDebuff === 0) ? 'Idle' : ''
                  }</span>
                </div>`;
            }).join('')}
          </div>
        </div>
        ${creatureFooterHtml(monster, attackBonus, accBonus, evaBonus, defBonus)}
      </div>
    </div>`;
}

function monsterCardHtml(
  cm: CombatMonster,
  index: number,
  selected: boolean,
  canTarget: boolean,
  playerAcc?: number,
  carouselClass: string = '',
  allMonsters: CombatMonster[] = [],
  heroDebuffCount = 0
): string {
  const m = cm.monster;
  const dead = cm.hp <= 0;
  const currentHp = dead ? 0 : cm.hp;
  const hpPct = Math.max(0, Math.min(100, Math.round((currentHp / m.maxHp) * 100)));
  const intent = getMonsterIntent(cm, allMonsters, heroDebuffCount);
  const actionAttr = canTarget && !dead ? `data-action="target"` : '';

  const netAcc = playerAcc !== undefined ? playerAcc - ((m.eva ?? 0) + (cm.evaBonus ?? 0)) : null;
  const prob = netAcc !== null ? computeHitProbability(netAcc) : null;
  const targetText = prob !== null
    ? `🎯 TARGET (Hit: ${prob.minHitRoll}–${prob.maxHitRoll} · ${prob.hitPercent}%)`
    : '🎯 TARGET';

  return `
  <div class="combat-monster-unit ${carouselClass} ${selected && !dead ? 'is-selected-unit selected' : ''} ${dead ? 'is-dead-unit' : ''}" data-id="${index}" ${actionAttr}>
    <div class="combat-target-header">
      ${cm.isSummon && !dead ? '<span class="combat-summon-badge" title="Summoned Creature: Returns to discard upon defeat; awards no Gold or SP"><span class="summon-token-icon">✦</span> SUMMON</span>' : ''}
      ${selected && !dead ? `<div class="combat-target-badge-top">${targetText}</div>` : '<div class="combat-target-spacer"></div>'}
      <button type="button" class="combat-monster-info-btn" data-action="inspect-monster" data-inspect-kind="monster" data-monster-id="${m.templateId}" data-monster-index="${index}" title="Inspect ${m.name} boons & stats">&#9432;</button>
    </div>
    ${fullCreatureCardHtml({
      monster: m,
      attackBonus: getMonsterEffectiveAtk(cm, allMonsters) - (m.atk ?? 0),
      accBonus: cm.accBonus ?? 0,
      evaBonus: cm.evaBonus ?? 0,
      defBonus: getMonsterEffectiveDef(cm, allMonsters) - (m.def ?? 0),
      className: `${dead ? 'is-dead' : ''} ${selected && !dead ? 'is-targeted' : ''}`,
      artOverlayHtml: `${cm.block > 0 && !dead ? `<div class="tcg-shield-overlay">&#128737; ${cm.block} Block</div>` : ''}${cm.isSummon && !dead ? '<div class="tcg-summon-token-overlay">✦ SUMMON</div>' : ''}${dead ? '<div class="tcg-dead-banner">DEFEATED</div>' : ''}`,
      attributes: `aria-label="${m.name} Card" data-inspect-kind="monster" data-monster-id="${m.templateId}" data-monster-index="${index}"`,
    })}

    <!-- Interactive Combat Status Dock Below Card: NEXT Intent & Live HP Bar -->
    <div class="creature-combat-dock ${dead ? 'is-dead' : ''}">
      <div class="combat-dock-row dock-intent-row">
        <span class="dock-label">NEXT:</span>
        <div class="dock-intent-val">
          ${
            dead
              ? '<span class="intent-dead">Defeated</span>'
              : `<span class="intent-icon">&#9876;</span>
                 <span class="intent-label">${intent.label}</span>
                 ${intent.poisonOnHit ? '<span>Poison on hit</span>' : ''}
                 ${intent.ignoreDef ? `<span>Ignore ${intent.ignoreDef} DEF</span>` : ''}
                 <span class="intent-val">${
                   intent.damage > 0
                      ? `<span class="${(cm.attackBonus ?? 0) > 0 ? 'is-buffed-flashing' : ''}"><b>${intent.damage}</b> ${intent.damageType === 'magical' ? 'MATK' : 'DMG'}${(intent.hitCount ?? 1) > 1 ? ` ×${intent.hitCount}` : ''}</span>`
                     : ''
                 }${
                   intent.heal && intent.heal > 0
                     ? (intent.damage > 0 ? ' &middot; ' : '') + `+<b>${intent.heal}</b> HP`
                     : ''
                 }${
                   intent.block > 0
                     ? (intent.damage > 0 || (intent.heal && intent.heal > 0) ? ' &middot; ' : '') + `+<b>${intent.block}</b> Blk`
                     : ''
                 }${
                   intent.evaBonus && intent.evaBonus > 0
                     ? (intent.damage > 0 || (intent.heal && intent.heal > 0) || intent.block > 0 ? ' &middot; ' : '') + `+<b>${intent.evaBonus}</b> EVA`
                     : ''
                 }${
                   intent.accBonus && intent.accBonus > 0
                     ? (intent.damage > 0 || (intent.heal && intent.heal > 0) || intent.block > 0 || (intent.evaBonus && intent.evaBonus > 0) ? ' &middot; ' : '') + `+<b>${intent.accBonus}</b> ACC`
                     : ''
                 }${
                    intent.defBonus && intent.defBonus !== 0
                      ? (intent.damage > 0 || (intent.heal ?? 0) > 0 || intent.block > 0 ? ' &middot; ' : '') + `${intent.defBonus > 0 ? '+' : ''}<b>${intent.defBonus}</b> DEF`
                     : ''
                 }${
                    intent.randomBuff
                      ? (intent.damage > 0 || intent.block > 0 ? ' &middot; ' : '') + `Random +<b>${intent.randomBuff.amount}</b> ${intent.randomBuff.stats.map(stat => stat.toUpperCase()).join(' / ')}`
                      : ''
                  }${
                   intent.summonFromMonsterDeck
                     ? (intent.damage > 0 || intent.block > 0 || (intent.defBonus ?? 0) > 0 ? ' &middot; ' : '') + `Summon ${MONSTER_TEMPLATES[intent.summonFromMonsterDeck].name}`
                     : ''
                 }${
                   intent.heroStatDebuff ? heroHexIntentHtml(intent) : intent.heroEvaDebuff && intent.heroEvaDebuff > 0
                     ? (intent.damage > 0 || (intent.heal && intent.heal > 0) || intent.block > 0 || (intent.evaBonus && intent.evaBonus > 0) || (intent.accBonus && intent.accBonus > 0) ? ' &middot; ' : '') + `-<b>${intent.heroEvaDebuff}</b> Hero EVA (${intent.heroEvaDebuffDuration ?? 2}t)`
                     : ''
                 }${
                    !intent.heroStatDebuff && !intent.poisonOnHit && !intent.summonFromMonsterDeck && !intent.defBonus && !intent.randomBuff && intent.damage === 0 && intent.block === 0 && (!intent.heal || intent.heal === 0) && (!intent.evaBonus || intent.evaBonus === 0) && (!intent.accBonus || intent.accBonus === 0) && (!intent.heroEvaDebuff || intent.heroEvaDebuff === 0) ? 'Idle' : ''
                 }</span>`
          }
        </div>
      </div>
      <div class="combat-dock-row dock-hp-row">
        <span class="dock-label">HP:</span>
        <div class="hp-bar creature-hp-bar dock-hp-bar" title="Health: ${currentHp} / ${m.maxHp} HP${cm.block > 0 && !dead ? ` (+${cm.block} Block)` : ''}">
          <div class="hp-fill" style="width: ${hpPct}%"></div>
          <span class="hp-text">${currentHp} / ${m.maxHp} HP${cm.block > 0 && !dead ? ` (+${cm.block} &#128737;)` : ''}</span>
        </div>
      </div>
    </div>
  </div>`;
}

export interface ParsedCombatLogEntry {
  timestamp: string;
  actorType: 'hero' | 'enemy' | 'system';
  actorLabel: string;
  text: string;
}

export function parseCombatLogEntry(entry: string): ParsedCombatLogEntry {
  return parseGameLogEntry(entry) as ParsedCombatLogEntry;
}

export function renderCombatLogEntries(combatLog: string[]): string {
  if (!combatLog || combatLog.length === 0) {
    return `<li class="combat-sidebar-empty">No combat actions yet.</li>`;
  }
  return combatLog
    .slice()
    .reverse()
    .map((entry) => {
      const parsed = parseCombatLogEntry(entry);
      return `
      <li class="combat-sidebar-log-item actor-${parsed.actorType}">
        <div class="combat-log-meta">
          <span class="combat-log-actor is-${parsed.actorType}">${parsed.actorLabel}</span>
          ${parsed.timestamp ? `<span class="combat-log-time">[${parsed.timestamp}]</span>` : ''}
        </div>
        <div class="combat-log-text">${parsed.text}</div>
      </li>`;
    })
    .join('');
}

export function heroHexIntentHtml(intent: MonsterIntent): string {
  if (!intent.heroStatDebuff) return '';
  const stats = Object.entries(intent.heroStatDebuff.stats).map(([stat, value]) => `-${value} ${stat.toUpperCase()}`).join(' / ');
  return `Hero ${stats} (${intent.heroStatDebuff.duration}t)`;
}

export function getHandCarouselIndex(index: number, count: number): number {
  return count > 0 ? Math.max(0, Math.min(count - 1, index)) : 0;
}

export function updateHandCarouselDom(container: HTMLElement, index: number): boolean {
  const track = container.querySelector<HTMLElement>('.hand-carousel-track');
  if (!track) return false;
  const units = track.querySelectorAll<HTMLElement>('.hand-carousel-unit');
  const selected = getHandCarouselIndex(index, units.length);
  units.forEach((unit, i) => {
    const position = getMonsterCarouselClass(i, selected, units.length);
    unit.classList.remove('is-center', 'is-prev', 'is-next', 'is-hidden');
    unit.classList.add(position);
    unit.inert = position === 'is-hidden';
    unit.setAttribute('aria-hidden', String(position === 'is-hidden'));
    const actionCard = unit.querySelector<HTMLButtonElement>('.tcg-card');
    if (actionCard) actionCard.tabIndex = i === selected ? 0 : -1;
    const preview = unit.querySelector<HTMLButtonElement>('.hand-preview-select');
    if (preview) preview.tabIndex = i === selected ? -1 : 0;
  });
  container.querySelectorAll<HTMLButtonElement>('[data-hand-dot]').forEach((dot, i) => {
    dot.setAttribute('aria-pressed', String(i === selected));
  });
  const counter = container.querySelector('[data-hand-position]');
  if (counter) counter.textContent = units.length ? `${selected + 1} / ${units.length}` : '0 / 0';
  return true;
}

function combatHandCarousel(state: RunState, combat: ActiveCombatState, ui: UiState, stats: CharacterStats): string {
  const selected = getHandCarouselIndex(ui.handIndex ?? 0, combat.hand.length);
  const count = combat.hand.length;
  return `<section class="battle-hand" aria-label="Combat hand">
    <div class="hand-carousel-heading"><b>Your hand</b><span data-hand-position aria-live="polite">${count ? selected + 1 : 0} / ${count}</span></div>
    <div class="hand-carousel" role="region" aria-roledescription="carousel" aria-label="Action cards">
      <div class="hand hand-carousel-track">
        ${count ? combat.hand.map((card, i) => {
          const position = getMonsterCarouselClass(i, selected, count);
          return `<div class="hand-carousel-unit ${position}" data-hand-index="${i}" role="group" aria-roledescription="slide" aria-label="${card.name}, ${i + 1} of ${count}" aria-hidden="${position === 'is-hidden'}" ${position === 'is-hidden' ? 'inert' : ''}>
            ${combatCardHtml(card, stats, combat.playerAp >= card.apCost, 'play-card', false, state).replace('<button ', `<button tabindex="${i === selected ? 0 : -1}" `)}
            <button type="button" class="hand-preview-select" data-action="select-hand-card" data-id="${i}" aria-label="Select ${card.name}, card ${i + 1}" ${i === selected ? 'tabindex="-1"' : ''}></button>
          </div>`;
        }).join('') : '<p class="empty-hand">No cards left. End your turn to draw a new hand.</p>'}
      </div>
      <button type="button" class="hand-carousel-nav prev" data-action="prev-hand-card" aria-label="Previous action card" ${count < 2 ? 'disabled' : ''}>‹</button>
      <button type="button" class="hand-carousel-nav next" data-action="next-hand-card" aria-label="Next action card" ${count < 2 ? 'disabled' : ''}>›</button>
    </div>
    <div class="hand-carousel-dots" aria-label="Choose a card">${combat.hand.map((card, i) => `<button type="button" data-hand-dot data-action="select-hand-card" data-id="${i}" aria-label="${card.name}, ${card.apCost} AP, card ${i + 1}" aria-pressed="${i === selected}">${i + 1}</button>`).join('')}</div>
    <p class="hand-carousel-hint">Click a side card, use Q / E, or swipe to browse. With one enemy, A / D and LEFT / RIGHT also browse your hand. Tap the center card to use it.</p>
  </section>`;
}

export function combatViewHtml(
  state: RunState,
  combat: ActiveCombatState,
  ui: UiState,
  stats: CharacterStats = getEffectiveStatsFromState(state)
): string {
  const combatGear = computeCombatGearBonuses(state.equippedGear);
  const heroDebuffs = getHeroStatDebuffMods(combat);
  const playerAcc = getPlayerAcc(stats, combatGear.acc) + (combat.playerAccMod ?? 0) + heroDebuffs.acc;
  const playerEva = getPlayerEva(stats, combat.playerEvasionMod + heroDebuffs.eva, combatGear.eva);
  const res = state.playerResources!;
  const living = combat.monsters.filter((m) => m.hp > 0).length;
  const totalMonsters = combat.monsters.length;
  const target =
    ui.targetIndex >= 0 && ui.targetIndex < totalMonsters
      ? ui.targetIndex
      : (firstLivingMonsterIndex(combat) >= 0 ? firstLivingMonsterIndex(combat) : 0);
  ui.targetIndex = target;
  const heroDebuffCount = (combat.heroStatDebuffs ?? []).filter((effect) => effect.turnsRemaining > 0).length
    + (state.statusEffects?.length ?? 0)
    + ((combat.playerEvaDebuffTurns ?? 0) > 0 ? 1 : 0);

  return `
  <section class="combat-view combat-component" aria-label="Battle Area">
    <div class="combat-main-col">
      <div class="monster-carousel">
        <div class="monster-carousel-track">
          ${combat.monsters
            .map((cm, i) => {
              const posClass = getMonsterCarouselClass(i, target, totalMonsters);
              return monsterCardHtml(cm, i, i === target, living > 1, playerAcc, posClass, combat.monsters, heroDebuffCount);
            })
            .join('')}
        </div>
        ${
          totalMonsters > 1
            ? `
        <button type="button" class="monster-carousel-nav prev" data-action="prev-target" title="Previous Target (Press A or Left Arrow)" aria-label="Previous Target" ${
                living <= 1 ? 'disabled' : ''
              }>&#10094;</button>
        <button type="button" class="monster-carousel-nav next" data-action="next-target" title="Next Target (Press D or Right Arrow)" aria-label="Next Target" ${
                living <= 1 ? 'disabled' : ''
              }>&#10095;</button>`
            : ''
        }
      </div>
      <p class="monster-carousel-instructions">
        ${
          living > 1
            ? 'Traverse targets with <b>A</b> or <b>D</b>. You can also use the <b>LEFT</b> and <b>RIGHT</b> keys. Tap a monster to target it with attacks.'
            : 'Tap a monster to target it with attacks.'
        }
      </p>
      <div class="player-line">
        <span>HP <b>${res.hp}</b>/${res.maxHp}</span>
        <span>${getDerivedStatIcon('def', 'chip-icon')} Block <b>${combat.playerBlock}</b></span>
        <span>${getDerivedStatIcon('acc', 'chip-icon')} ACC <b>${playerAcc}</b></span>
        <span>${getDerivedStatIcon('eva', 'chip-icon')} EVA <b>${playerEva}</b></span>
        ${combatGear.pen > 0 ? `<span class="pen-line" title="Physical attacks ignore enemy natural DEF">PEN <b>${combatGear.pen}</b></span>` : ''}
        <span class="ap">AP <b>${combat.playerAp}</b>/${combat.playerMaxAp}</span>
      </div>
      <div class="hand-row">
        ${combatHandCarousel(state, combat, ui, stats)}
      </div>
      ${(combat.inPlay?.length ?? 0) > 0 ? `
      <section class="combat-in-play" aria-label="Cards in play">
        <span class="combat-in-play-label">In play</span>
        ${combat.inPlay!.map((card) => `<span class="combat-in-play-card" title="${card.flavorText ?? card.name}">🚩 ${card.name}</span>`).join('')}
      </section>` : ''}
      <div class="combat-actions">
        <button class="btn secondary flee-btn" data-action="flee-card" ${
          combat.playerAp < FLEE_AP_COST || combat.monsters.some((m) => m.monster.isBoss) ? 'disabled' : ''
        } title="${
          combat.monsters.some((m) => m.monster.isBoss)
            ? 'Cannot flee a Boss encounter'
            : combat.playerAp < FLEE_AP_COST
            ? 'Need 2 AP to attempt fleeing'
            : 'Attempt to flee from battle (2 AP)'
        }">🏃 Flee (${FLEE_AP_COST} AP)</button>
        <button class="btn primary end-turn-btn" data-action="end-turn">End Turn</button>
      </div>
    </div>
  </section>`;
}

export function combatModal(state: RunState, combat: ActiveCombatState, ui: UiState): string {
  return combatViewHtml(state, combat, ui);
}

export function fleeConfirmModal(state: RunState, combat: ActiveCombatState, stats: CharacterStats): string {
  const fleeCard = createFleeCard(state.playerClass ?? 'fighter');
  const combatGear = computeCombatGearBonuses(state.equippedGear);
  const heroDebuffs = getHeroStatDebuffMods(combat);
  const playerEva = getPlayerEva(stats, combat.playerEvasionMod + heroDebuffs.eva, combatGear.eva);

  const livingMonsters = combat.monsters.filter((m) => m.hp > 0);
  const totalEnemyAcc = livingMonsters.reduce((sum, m) => sum + (m.monster.acc ?? 0), 0);
  const netFlee = playerEva - totalEnemyAcc;

  const prob = computeHitProbability(netFlee);
  const tierNum = Math.max(1, Math.min(7, 4 + netFlee));
  const enemyAccBreakdown = livingMonsters.map((m) => `${m.monster.name} (${m.monster.acc ?? 0} ACC)`).join(' + ');

  return `
  <div class="modal-backdrop combat-confirm-backdrop" data-action="cancel-flee-backdrop">
    <div class="modal combat-confirm-modal flee-confirm-modal" role="dialog" aria-modal="true">
      <header class="confirm-modal-header">
        <h2 class="confirm-title">Attempt to <span>Flee</span> from battle?</h2>
        <button class="modal-close-btn" data-action="cancel-flee" aria-label="Cancel">&times;</button>
      </header>
      <div class="confirm-modal-body">
        <div class="confirm-visual-col">
          <div class="confirm-card-comparison">
            <div class="confirm-card-col source">
              <div class="col-header-badge source-badge">Permanent Action (${FLEE_AP_COST} AP)</div>
              <div class="confirm-card-frame">${combatCardHtml(fleeCard, stats, true, 'noop', false, state)}</div>
            </div>
          </div>
        </div>
        <div class="confirm-details-col">
          <div class="confirm-calc-section">
            <div class="confirm-stat-chips-grid">
              <div class="confirm-chip">
                <span class="chip-label">Hero EVA</span>
                <span class="chip-value">🏃 <b>${playerEva}</b></span>
                <span class="chip-sub">Player Evasion</span>
              </div>
              <span class="chip-operator">&minus;</span>
              <div class="confirm-chip">
                <span class="chip-label">Foes Total ACC</span>
                <span class="chip-value">🎯 <b>${totalEnemyAcc}</b></span>
                <span class="chip-sub" title="${enemyAccBreakdown}">${livingMonsters.length} living ${livingMonsters.length === 1 ? 'foe' : 'foes'}</span>
              </div>
              <span class="chip-operator">=</span>
              <div class="confirm-chip net-acc">
                <span class="chip-label">Net Modifier</span>
                <span class="chip-value"><b>${netFlee >= 0 ? `+${netFlee}` : netFlee}</b></span>
                <span class="chip-sub">Tier ${tierNum}</span>
              </div>
              <div class="confirm-chip target-roll">
                <span class="chip-label">Success Range</span>
                <span class="chip-value">🎲 <b>${prob.minHitRoll}–${prob.maxHitRoll}</b></span>
                <span class="chip-sub">MACG-3D6™</span>
              </div>
            </div>

            ${renderQteHitCheckBarHtml({
              minHitRoll: prob.minHitRoll,
              maxHitRoll: prob.maxHitRoll,
              netAcc: netFlee,
              hitPercent: prob.hitPercent,
            })}

            <div class="confirm-prob-box">
              <div class="prob-summary-row">
                <span class="prob-icon-label">🏃 Escape Probability:</span>
                <span class="prob-percentage"><b>${prob.hitPercent}%</b> (Tier ${tierNum})</span>
              </div>
              <div class="prob-notes-row">
                <span class="prob-note diabolic">😈 <b>0.9%</b> Diabolic Rolls (3 &amp; 18 Always Fail)</span>
                <span class="prob-note miss">⚠️ Escaping forfeits all rewards: no SP, Gold, or loot. On failure, ${FLEE_AP_COST} AP is spent and battle continues.</span>
              </div>
            </div>
          </div>
          <footer class="confirm-modal-footer">
            <button class="btn primary big confirm-action-btn" data-action="confirm-flee">Attempt Flee (${FLEE_AP_COST} AP)</button>
            <button class="btn secondary cancel-action-btn" data-action="cancel-flee">Cancel</button>
          </footer>
        </div>
      </div>
    </div>
  </div>`;
}

function heroTargetCardHtml(state: RunState, combat: ActiveCombatState, stats: CharacterStats): string {
  const className = getPlayerClassName(state.playerClass);
  const res = state.playerResources!;
  const combatGear = computeCombatGearBonuses(state.equippedGear);
  const heroDebuffs = getHeroStatDebuffMods(combat);
  const effEva = getPlayerEva(stats, combat.playerEvasionMod + heroDebuffs.eva, combatGear.eva);
  const effAcc = getPlayerAcc(stats, combatGear.acc) + (combat.playerAccMod ?? 0) + heroDebuffs.acc;
  const illustration = getAdventurerRasterArtPath(state.playerClass);

  return `
  <div class="tcg-card tcg-creature tcg-template-hero" aria-label="Hero Card">
    <div class="tcg-inner-frame">
      <div class="tcg-art-window">
        <img src="${illustration}" alt="${className} Hero" class="tcg-art-raster" />
        ${combat.playerBlock > 0 ? `<div class="tcg-shield-overlay">&#128737; ${combat.playerBlock} Block</div>` : ''}
      </div>

      <header class="tcg-header">
        <div class="tcg-header-meta">
          <div class="tcg-type-stacked">
            <span class="tcg-type-main">HERO</span>
            <span class="tcg-type-sub">Adventurer &middot; Turn ${state.turn}</span>
          </div>
          <span class="tcg-badge hero">YOU</span>
        </div>
        <div class="tcg-header-title">
          <span class="tcg-name">${className} (Hero)</span>
        </div>
      </header>

      <div class="tcg-art-spacer"></div>

      <div class="tcg-textbox hero-target-textbox">
        <div class="tcg-intent-box hero-target-intent">
          <span class="intent-icon">&#128737;</span>
          <span class="intent-label">Target</span>
          <span class="intent-val">Self</span>
        </div>
      </div>

      <footer class="tcg-footer">
        <div class="tcg-pt-badge">
          HP <b>${res.hp}</b> / <b>${res.maxHp}</b> &middot; ${getDerivedStatIcon('acc', 'chip-icon')} ${effAcc} ${getDerivedStatIcon('eva', 'chip-icon')} ${effEva}
        </div>
      </footer>
    </div>
  </div>`;
}

export function combatDiceRollModal(pending: PendingDiceRoll): string {
  const { roll, settled } = pending;
  const isFlee = roll.actionName === 'Flee';
  const outcomeText = roll.isDiabolic
    ? `😈 DIABOLIC ROLL [${roll.total}] (GUARANTEED ${isFlee ? 'FAILURE' : 'MISS'})!`
    : isFlee
    ? roll.isHit
      ? '🏃 ESCAPED FROM BATTLE!'
      : '💨 FAILED TO ESCAPE!'
    : roll.isHit
    ? `🎯 HIT! (${roll.damageDealt} DMG${
        (roll.damagePenetrated ?? 0) > 0
          ? `, ${roll.damagePenetrated} DEF bypassed by PEN`
          : ''
      }${
        (roll.damageDefReduced ?? 0) > 0
          ? `, ${roll.damageDefReduced} absorbed by ${
              roll.attackerName === 'Hero' ? roll.targetName : 'Hero'
            } ${roll.defenseType ?? 'DEF'}`
          : ''
      }${
        roll.damageBlocked > 0
          ? `, ${roll.damageBlocked} blocked`
          : ''
      })`
    : '💨 MISSED!';

  return `
  <div class="modal-backdrop dice-roll-modal-backdrop" data-action="skip-or-apply-dice">
    <div class="modal dice-roll-modal ${roll.isHit ? 'is-hit' : 'is-miss'} ${roll.isDiabolic ? 'is-diabolic' : ''}" role="dialog" aria-modal="true">
      <header class="dice-modal-header">
        <div class="dice-modal-title">
          <span class="dice-title-icon">🎲</span>
          <span class="dice-title-text">${isFlee ? 'Tabletop 3d6 Escape Check' : 'Tabletop 3d6 Hit Check'}</span>
        </div>
        <div class="dice-modal-matchup">
          <span class="dice-actor attacker">${roll.attackerName}</span>
          <span class="dice-action-badge">${roll.actionName}</span>
          <span class="dice-arrow">&rarr;</span>
          <span class="dice-actor target">${roll.targetName}</span>
        </div>
      </header>

      <div class="dice-roll-stage">
        <div class="dice-hit-range-pill">
          <span class="pill-label">${isFlee ? 'Escape Range:' : 'Hit Range:'}</span>
          <span class="pill-value">${roll.minHitRoll ?? 10}–${roll.maxHitRoll ?? 11}</span>
          <span class="pill-sub">(Sure Hit: 10–11)</span>
        </div>

        <div class="dice-bounce-container ${settled ? 'is-settled' : 'is-rolling'}">
          <div class="tabletop-die die-1 dice-die" data-final="${roll.die1}">🎲 ${settled ? roll.die1 : 4}</div>
          <span class="dice-math-op">+</span>
          <div class="tabletop-die die-2 dice-die" data-final="${roll.die2}">🎲 ${settled ? roll.die2 : 3}</div>
          <span class="dice-math-op">+</span>
          <div class="tabletop-die die-3 dice-die" data-final="${roll.die3 ?? 0}">🎲 ${settled ? (roll.die3 ?? 0) : 3}</div>
          <span class="dice-math-op">=</span>
          <div class="tabletop-die-total dice-total">
            <span class="die-total-label">TOTAL</span>
            <span class="die-total-value">${settled ? roll.total : '?'}</span>
          </div>
        </div>

        ${settled ? `
        <div class="dice-qte-wrapper">
          ${renderQteHitCheckBarHtml({
            minHitRoll: roll.minHitRoll ?? 10,
            maxHitRoll: roll.maxHitRoll ?? 11,
            rolledTotal: roll.total,
            die1: roll.die1,
            die2: roll.die2,
            die3: roll.die3,
            isHit: roll.isHit,
            compact: false,
          })}
        </div>

        <div class="dice-outcome-container">
          <div class="dice-outcome-badge ${roll.isDiabolic ? 'is-diabolic' : roll.isHit ? 'is-hit' : 'is-miss'}">
            ${outcomeText}
          </div>
        </div>
        ` : `
        <div class="dice-rolling-placeholder">
          <span class="rolling-text">🎲 Rolling 3d6...</span>
        </div>
        `}
      </div>

      <footer class="dice-modal-footer">
        <button type="button" class="btn btn-primary btn-lg dice-apply-btn" data-action="apply-dice-roll" ${!settled ? 'disabled' : ''}>
          Apply
        </button>
        <span class="dice-footer-hint">
          ${settled ? 'Click Apply or press Enter / Space to proceed' : 'Rolling... click to settle'}
        </span>
      </footer>
    </div>
  </div>`;
}

export function combatConfirmModal(
  state: RunState,
  combat: ActiveCombatState,
  pending: PendingCardPlay,
  stats: CharacterStats
): string {
  const card = combat.hand.find((c) => c.instanceId === pending.cardInstanceId);
  if (!card) return '';

  const selectedDiscardIds = pending.discardedCardInstanceIds ?? [];
  const combatGear = computeCombatGearBonuses(state.equippedGear);
  const heroDebuffs = getHeroStatDebuffMods(combat);
  const effect = computeCardEffect(
    card,
    stats,
    combatGear,
    getFighterBerzerkBonus(state.playerClass, state.playerResources?.hp, state.playerResources?.maxHp),
    selectedDiscardIds.length,
    (combat.playerAccMod ?? 0) + heroDebuffs.acc,
  );
  const isAttack = card.cardType === 'attack' || effect.damage > 0;
  const discardCandidates = combat.hand.filter((candidate) => candidate.instanceId !== card.instanceId);
  const requiredDiscards = card.discardMode === 'exact' ? (card.discardCount ?? 0) : null;
  const canConfirmDiscard = requiredDiscards === null || selectedDiscardIds.length === requiredDiscards;

  const livingMonsters = combat.monsters
    .map((m, idx) => ({ m, idx }))
    .filter(({ m }) => m.hp > 0);

  const targetIdx =
    combat.monsters[pending.targetIndex] && combat.monsters[pending.targetIndex].hp > 0
      ? pending.targetIndex
      : (livingMonsters[0]?.idx ?? 0);

  const targetMonster = combat.monsters[targetIdx];
  const targetName = card.targetMode === 'all_enemies'
    ? 'All Living Enemies'
    : isAttack
    ? (targetMonster ? targetMonster.monster.name : 'Target')
    : `${getPlayerClassName(state.playerClass)} (Hero)`;

  const cardAccBonus = card.accBonus ?? 0;
  const cardAccText = cardAccBonus === 0 ? '' : `${cardAccBonus > 0 ? '+' : ''}${cardAccBonus} card`;
  const playerAccMod = (combat.playerAccMod ?? 0) + heroDebuffs.acc;
  const baseAcc = getPlayerAcc(stats, combatGear.acc);
  const totalAcc = baseAcc + cardAccBonus + playerAccMod;
  const targetEva = (targetMonster?.monster.eva ?? 0) + (targetMonster?.evaBonus ?? 0);
  const netAcc = totalAcc - targetEva;
  const prob = computeHitProbability(netAcc);

  const allTargetOdds = livingMonsters.map(({ m, idx }) => {
    const eva = (m.monster.eva ?? 0) + (m.evaBonus ?? 0);
    const targetNetAcc = totalAcc - eva;
    const targetProb = computeHitProbability(targetNetAcc);
    return { m, idx, eva, netAcc: targetNetAcc, minHitRoll: targetProb.minHitRoll, probability: targetProb };
  });

  const targetCardHtml = isAttack && card.targetMode === 'all_enemies'
    ? `<div class="confirm-all-targets-grid">${allTargetOdds.map(({ m, idx, minHitRoll: roll, probability }) => `
        <article class="confirm-all-target-card">
          <div class="confirm-all-target-card-frame">
            ${fullCreatureCardHtml({
              monster: m.monster,
              attackBonus: m.attackBonus ?? 0,
              accBonus: m.accBonus ?? 0,
              evaBonus: m.evaBonus ?? 0,
              defBonus: m.defBonus ?? 0,
              className: 'is-targeted',
              attributes: `data-inspect-kind="monster" data-monster-id="${m.monster.templateId}" data-monster-index="${idx}"`,
            })}
          </div>
          <div class="confirm-all-target-odds"><b>${m.monster.name}</b><span>Hit ${roll}–${probability.maxHitRoll} · ${probability.hitPercent}%</span></div>
        </article>`).join('')}</div>`
    : isAttack && targetMonster
    ? monsterCardHtml(targetMonster, targetIdx, true, false, totalAcc, '', combat.monsters)
    : heroTargetCardHtml(state, combat, stats);

  return `
  <div class="modal-backdrop combat-confirm-backdrop" data-action="close-confirm-backdrop">
    <div class="modal combat-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <header class="confirm-modal-header">
        <h2 id="confirm-modal-title" class="confirm-title">Use <span>${card.name}</span> on <span>${targetName}</span></h2>
        <button class="modal-close-btn" data-action="cancel-play-card" aria-label="Cancel">&times;</button>
      </header>

      <div class="confirm-modal-body">
        <div class="confirm-visual-col">
          <div class="confirm-card-comparison ${card.targetMode === 'all_enemies' ? 'is-multitarget' : ''}">
        <div class="confirm-card-col source">
          <div class="col-header-badge source-badge">Source Action (${card.apCost} AP)</div>
          <div class="confirm-card-frame">
            ${combatCardHtml(card, stats, true, 'noop', false, state)}
          </div>
        </div>

        <div class="confirm-vs-col">
          <div class="confirm-action-arrow">&rarr;</div>
          <span class="confirm-action-verb">${isAttack ? 'ATTACK' : 'APPLY'}</span>
        </div>

        <div class="confirm-card-col target ${card.targetMode === 'all_enemies' ? 'is-all-targets' : ''}">
          <div class="col-header-badge target-badge">${card.targetMode === 'all_enemies' ? 'All Target Creatures · Separate Hit Checks' : isAttack ? 'Target Creature' : 'Target (Self)'}</div>
          <div class="confirm-card-frame">
            ${targetCardHtml}
          </div>
        </div>
      </div>
    </div>

    <div class="confirm-details-col">
      ${
        card.discardMode && card.discardMode !== 'none'
          ? `
      <section class="combat-discard-choice">
        <h3>${requiredDiscards === null ? 'Choose cards to discard (X)' : `Choose exactly ${requiredDiscards} cards to discard`}</h3>
        <p class="muted">The card being played cannot be selected.</p>
        <div class="combat-discard-choice-list">
          ${discardCandidates.map((candidate) => {
            const chosen = selectedDiscardIds.includes(candidate.instanceId);
            const wouldExceed = !chosen && requiredDiscards !== null && selectedDiscardIds.length >= requiredDiscards;
            const art = getActionRasterArtPath(candidate.id, candidate.cardType);
            return `<button class="discard-choice-card ${chosen ? 'is-selected' : ''}" data-action="toggle-card-discard" data-id="${candidate.instanceId}" ${wouldExceed ? 'disabled' : ''}>
              <img src="${art}" alt="" class="discard-choice-art" loading="lazy" />
              <span class="discard-choice-details"><b>${candidate.name}</b><small>${candidate.apCost} AP · ${candidate.cardType}</small></span>
              <span class="discard-choice-mark" aria-hidden="true">${chosen ? '✓' : ''}</span>
            </button>`;
          }).join('') || '<span class="muted">No other cards are available to discard.</span>'}
        </div>
        <div class="discard-choice-count">Selected: <b>${selectedDiscardIds.length}</b>${requiredDiscards === null ? '' : ` / ${requiredDiscards}`}</div>
      </section>`
          : ''
      }

      ${
        isAttack && card.targetMode !== 'all_enemies'
          ? `
      <div class="confirm-calc-section">
        <div class="confirm-stat-chips-grid">
          <div class="confirm-chip acc">
            <span class="chip-label">Hero ACC</span>
            <span class="chip-value">${getDerivedStatIcon('acc', 'chip-icon')} <b>${totalAcc}</b></span>
            <span class="chip-sub">DEX ${cardAccText}</span>
          </div>
          <span class="chip-operator">&minus;</span>
          <div class="confirm-chip eva">
            <span class="chip-label">Target EVA</span>
            <span class="chip-value">${getDerivedStatIcon('eva', 'chip-icon')} <b>${targetEva}</b></span>
            <span class="chip-sub">${targetMonster?.monster.name ?? 'Creature'}</span>
          </div>
          <span class="chip-operator">&equals;</span>
          <div class="confirm-chip net">
            <span class="chip-label">Net ACC</span>
            <span class="chip-value"><b>${netAcc >= 0 ? '+' : ''}${netAcc}</b></span>
            <span class="chip-sub">${netAcc >= 0 ? 'bonus' : 'penalty'}</span>
          </div>
          <span class="chip-operator">&rarr;</span>
          <div class="confirm-chip target-roll">
            <span class="chip-label">Hit Range</span>
            <span class="chip-value">🎯 <b>${prob.minHitRoll}–${prob.maxHitRoll}</b></span>
            <span class="chip-sub">MACG-3D6™</span>
          </div>
        </div>

        ${renderQteHitCheckBarHtml({
          minHitRoll: prob.minHitRoll,
          maxHitRoll: prob.maxHitRoll,
          netAcc,
          hitPercent: prob.hitPercent,
        })}

        <div class="confirm-prob-box">
          <div class="prob-summary-row">
            <span class="prob-icon-label">${getDerivedStatIcon('acc', 'chip-icon')} Hit Probability:</span>
            <span class="prob-percentage"><b>${prob.hitPercent}%</b> (${prob.hitCombos} of 216 combinations)</span>
          </div>
          <div class="prob-notes-row">
            <span class="prob-note diabolic">😈 <b>0.9%</b> Diabolic Rolls (3 &amp; 18 Always Miss)</span>
            <span class="prob-note sweet">🎯 <b>25.0%</b> Sure Hit Rolls (Rolls 10 &amp; 11)</span>
          </div>
        </div>
      </div>`
          : isAttack
          ? `
      <div class="confirm-calc-section multitarget-calc">
        <h3>Every living enemy makes its own hit check</h3>
        <div class="multitarget-odds-list">
          ${allTargetOdds.map(({ m, eva, netAcc: targetNet, probability }) => `
            <div class="multitarget-odds-row">
              <b>${m.monster.name}</b>
              <span>ACC ${totalAcc} − EVA ${eva} = ${targetNet >= 0 ? '+' : ''}${targetNet}</span>
              <span>Hit <b>${probability.minHitRoll}–${probability.maxHitRoll}</b></span>
              <strong>${probability.hitPercent}%</strong>
            </div>`).join('')}
        </div>
        <div class="prob-notes-row">
          <span class="prob-note diabolic">😈 Diabolic Rolls (3 &amp; 18) Always Miss</span>
          <span class="prob-note sweet">🎯 25.0% Sure Hit Rolls (10 &amp; 11)</span>
        </div>
      </div>`
          : `
      <div class="confirm-calc-section defense">
        <div class="confirm-stat-chips-grid">
          ${
            effect.block > 0
              ? `
          <div class="confirm-chip block">
            <span class="chip-label">Block Gained</span>
            <span class="chip-value">${getDerivedStatIcon('def', 'chip-icon')} +<b>${effect.block}</b></span>
            <span class="chip-sub">absorbs incoming DMG</span>
          </div>`
              : ''
          }
          ${
            effect.evasionBonus > 0
              ? `
          <div class="confirm-chip eva">
            <span class="chip-label">Combat EVA</span>
            <span class="chip-value">${getDerivedStatIcon('eva', 'chip-icon')} +<b>${effect.evasionBonus}</b></span>
            <span class="chip-sub">raises monster needed roll</span>
          </div>`
              : ''
          }
        </div>
      </div>`
      }

        <footer class="confirm-modal-footer">
          <button class="btn primary big confirm-action-btn" data-action="confirm-play-card" ${canConfirmDiscard ? '' : 'disabled'}>
            Confirm Use (${card.apCost} AP)
          </button>
          <button class="btn secondary cancel-action-btn" data-action="cancel-play-card">
            Cancel
          </button>
        </footer>
      </div>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Shrine
// ---------------------------------------------------------------------------


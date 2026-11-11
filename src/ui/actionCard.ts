import { computeCardEffect, getHeroStatDebuffMods } from '../core/combat';
import {
  computeCombatGearBonuses,
  getFighterBerzerkBonus,
  getFleeThreshold,
} from '../core/stats';
import { CharacterStats, CombatCardDef, RunState } from '../core/types';
import { getActionCardIllustration } from './cardArt';
import { getDerivedStatIcon } from './icons';

export interface ActionCardRenderOptions {
  playable?: boolean;
  action?: string;
  mini?: boolean;
  state?: RunState;
  viewOnly?: boolean;
  className?: string;
  artWindowClassName?: string;
}

/** Compute one action card's live effect from the current run, if supplied. */
export function getActionCardEffect(
  card: CombatCardDef,
  stats: CharacterStats,
  state?: RunState,
) {
  const liveAccModifier = state?.activeHook.type === 'COMBAT'
    ? (state.activeHook.combat.playerAccMod ?? 0) + getHeroStatDebuffMods(state.activeHook.combat).acc
    : 0;
  return computeCardEffect(
    card,
    stats,
    state ? computeCombatGearBonuses(state.equippedGear) : undefined,
    state
      ? getFighterBerzerkBonus(state.playerClass, state.playerResources?.hp, state.playerResources?.maxHp)
      : 0,
    0,
    liveAccModifier,
  );
}

/** Canonical face text shared by hand, deck, training, confirmation and inspect cards. */
export function getActionCardText(
  card: CombatCardDef,
  stats: CharacterStats,
  state?: RunState,
): string {
  if (card.id === 'action_flee') {
    return `Roll 1d6 &le; <b>${getFleeThreshold(stats)}</b> to escape<br/>No rewards`;
  }
  const effect = getActionCardEffect(card, stats, state);
  const parts: string[] = [];
  if (effect.damage > 0) {
    parts.push(`Deal <b>${effect.damage}</b> ${card.id === 'melee_atk' ? 'Normal DMG' : 'DMG'}${card.targetMode === 'all_enemies' ? ' to all enemies' : ''}`);
  }
  if (card.accBonus) parts.push(`${card.accBonus > 0 ? '+' : ''}<b>${card.accBonus}</b> ACC on rolls`);
  if (effect.block > 0) parts.push(`Gain <b>${effect.block}</b> Block this turn`);
  if (effect.evasionBonus > 0) parts.push(`+<b>${effect.evasionBonus}</b> EVA this round`);
  if (card.discardMode === 'exact') parts.push(`Discard <b>${card.discardCount ?? 0}</b>, draw <b>${card.drawCards ?? 0}</b>`);
  if (card.discardMode === 'any') parts.push(`Discard <b>X</b>${card.damagePerDiscard ? `: +${card.damagePerDiscard} DMG each` : ': +1 AP each'}`);
  if (card.gainAp && card.id !== 'adrenalin') parts.push(`Regain <b>${card.gainAp}</b> AP`);
  if (card.drawOnApGain) parts.push(`When another card grants AP, draw <b>1</b> card`);
  if (card.staysInPlay) parts.push('<b>Stays in play</b>');
  return parts.join('<br/>');
}

/**
 * Single full action-card template. Callers configure interaction and scale,
 * while the physical card structure remains identical everywhere.
 */
export function renderActionCardHtml(
  card: CombatCardDef,
  stats: CharacterStats,
  options: ActionCardRenderOptions = {},
): string {
  const {
    playable = false,
    action = 'play-card',
    mini = false,
    state,
    viewOnly = false,
    className = '',
    artWindowClassName = '',
  } = options;
  const illustration = getActionCardIllustration(card.id, card.cardType);
  const isAttack = card.cardType === 'attack';
  const cardKind = card.cardType === 'enchantment'
    ? 'Enchantment 🚩'
    : card.cardType === 'skill'
    ? 'Skill ✨'
    : isAttack
    ? `Attack ${getDerivedStatIcon('atk', 'header-icon')}`
    : `Defense ${getDerivedStatIcon('def', 'header-icon')}`;
  const templateClass = isAttack ? 'is-attack tcg-template-attack' : 'is-defense tcg-template-defense';
  const tag = viewOnly ? 'div' : 'button';
  const actionAttributes = viewOnly ? '' : `data-action="${action}" data-id="${card.instanceId}"`;
  const disabledAttribute = !viewOnly && !playable ? 'disabled' : '';

  return `
  <${tag} class="tcg-card tcg-action ${templateClass} ${card.classId} ${mini ? 'is-mini' : ''} ${className}"
    ${actionAttributes}
    data-inspect-kind="action" data-card-id="${card.id}" data-card-instance="${card.instanceId}"
    ${disabledAttribute}>
    <div class="tcg-inner-frame">
      <div class="tcg-art-window action-window ${artWindowClassName}">
        ${illustration}
      </div>
      <header class="tcg-header">
        <div class="tcg-header-meta">
          <div class="tcg-type-stacked">
            <span class="tcg-type-main">ACTION</span>
            <span class="tcg-type-sub">${card.id === 'action_flee' ? 'Escape 🏃' : cardKind}</span>
          </div>
          ${card.isSkillUpgrade ? '<span class="skill-upgrade-tag">VOID UPGRADE</span>' : ''}
          <span class="tcg-ap-bubble">${card.apCost} AP</span>
        </div>
        <div class="tcg-header-title">
          <span class="tcg-name action-name">${card.name}</span>
        </div>
      </header>
      <div class="tcg-art-spacer"></div>
      <div class="tcg-textbox action-text">
        <div class="tcg-action-effect">${getActionCardText(card, stats, state)}</div>
      </div>
      ${!mini ? `<footer class="tcg-footer">
        <span class="tcg-card-num">${card.cardNumber ?? (isAttack ? 'ATK' : 'DEF')}</span>
        <span class="tcg-class-tag">${card.classId.toUpperCase()}</span>
      </footer>` : ''}
    </div>
  </${tag}>`;
}

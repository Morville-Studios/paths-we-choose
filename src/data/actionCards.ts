import actionCardsData from '../../data/actionCards.json';
import { ClassId, ActionCardDef } from '../core/types';

export type ActionCardTemplate = Omit<ActionCardDef, 'instanceId'>;

export const ACTION_CARD_CATALOG: Record<string, ActionCardTemplate> = Object.fromEntries(
  actionCardsData
    .filter((entry) => entry.type === 'action')
    .map(({ type: _type, ...card }) => [card.id, card as ActionCardTemplate])
);

export const CLASS_TRAIN_POOLS: Record<ClassId, string[]> = {
  fighter: ['melee_atk', 'shield_def', 'heavy_cleave', 'iron_parry', 'battle_focus', 'whirlwind', 'battlecry', 'battle_flag', 'adrenalin', 'final_smash'],
  wizard: ['fireball_atk', 'force_field_def', 'arcane_blast', 'frost_nova', 'blink_ward'],
  rogue: ['melee_atk', 'shield_def', 'heavy_cleave', 'iron_parry', 'battle_focus', 'final_smash'],
};

/**
 * The Void is an inexhaustible, public template zone. Its cards cannot be
 * trained or drawn; Shrines instantiate an appropriate one when upgrading an
 * owned base card.
 */
export function getVoidCards(): ActionCardDef[] {
  return Object.values(ACTION_CARD_CATALOG)
    .filter((card) => card.isSkillUpgrade)
    .map((card) => createActionCardInstance(card.id, 'void'));
}

export function createActionCardInstance(templateId: string, instanceSuffix: string): ActionCardDef {
  const tpl = ACTION_CARD_CATALOG[templateId];
  if (!tpl) {
    throw new Error(`Unknown Action Card template: ${templateId}`);
  }
  return {
    ...tpl,
    instanceId: `${templateId}_${instanceSuffix}`,
  };
}

export const FLEE_CARD_ID = 'action_flee';
export const FLEE_CARD_INSTANCE_ID = 'permanent_flee';

export function createFleeCard(classId: ClassId = 'fighter'): ActionCardDef {
  return {
    id: FLEE_CARD_ID,
    instanceId: FLEE_CARD_INSTANCE_ID,
    name: 'Flee',
    classId,
    cardType: 'defense',
    level: 1,
    apCost: 1,
    baseDamage: 0,
    baseBlock: 0,
    cardNumber: 'ACT · FLEE',
    flavorText:
      'Disengage and sprint away from battle. Escape check: roll 1d6 ≤ ⌊AGI / 2⌋. No rewards or loots collected.',
  };
}

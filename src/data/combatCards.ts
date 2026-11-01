import { ClassId, CombatCardDef } from '../core/types';

export type CombatCardTemplate = Omit<CombatCardDef, 'instanceId'>;

export const COMBAT_CARD_CATALOG: Record<string, CombatCardTemplate> = {
  // Fighter Starter & Trainable Cards
  melee_atk: {
    id: 'melee_atk',
    name: 'Melee ATK',
    classId: 'fighter',
    cardType: 'attack',
    apCost: 1,
    baseDamage: 2,
    damageScalingStat: 'str',
    damageScalingDivisor: 2,
    baseBlock: 0,
    accBonus: 1,
    cardNumber: 'GRS · #012/021',
    flavorText: 'A disciplined, swift blade stroke honed by countless hours of sparring. Grants +1 ACC on attack rolls.',
  },
  shield_def: {
    id: 'shield_def',
    name: 'Shield DEF',
    classId: 'fighter',
    cardType: 'defense',
    apCost: 1,
    baseDamage: 0,
    baseBlock: 2,
    blockScalingStat: 'str',
    blockScalingDivisor: 2,
    evasionScalingStat: 'agi',
    evasionMultiplier: 1,
    cardNumber: 'GRS · #013/021',
    flavorText: 'Brace behind solid oak and steel. A sturdy guard turns deadly blows into mere glances.',
  },
  heavy_cleave: {
    id: 'heavy_cleave',
    name: 'High Strike',
    classId: 'fighter',
    cardType: 'attack',
    apCost: 2,
    baseDamage: 3,
    damageScalingStat: 'atk',
    damageScalingDivisor: 1,
    damageScalingMultiplier: 2,
    baseBlock: 0,
    cardNumber: 'GRS · #014/021',
    flavorText: 'Drive a precise, punishing strike through the enemy guard. Deals 3 plus twice the hero ATK.',
  },
  iron_parry: {
    id: 'iron_parry',
    name: 'Parry',
    classId: 'fighter',
    cardType: 'defense',
    apCost: 1,
    baseDamage: 0,
    baseBlock: 5,
    evasionScalingStat: 'agi',
    evasionMultiplier: 1,
    cardNumber: 'GRS · #015/021',
    flavorText: 'Deflect the incoming strike with a clean guard: gain 5 Block and +1 EVA this round.',
  },
  battle_focus: {
    id: 'battle_focus',
    name: 'Fortify',
    classId: 'fighter',
    cardType: 'defense',
    apCost: 1,
    baseDamage: 0,
    baseBlock: 5,
    blockScalingStat: 'def',
    blockScalingDivisor: 1,
    cardNumber: 'GRS · #016/021',
    flavorText: 'Set a disciplined guard. Gain 5 Block plus 1 Block for each hero DEF.',
  },
  high_strike_plus: {
    id: 'high_strike_plus', name: 'High Strike +', classId: 'fighter', cardType: 'attack', apCost: 3,
    baseDamage: 5, damageScalingStat: 'atk', damageScalingDivisor: 1, damageScalingMultiplier: 3, baseBlock: 0,
    isSkillUpgrade: true, upgradeOf: 'heavy_cleave',
    cardNumber: 'FTR · #017', flavorText: 'A crushing follow-through: 5 damage plus three times the hero ATK.',
  },
  parry_plus: {
    id: 'parry_plus', name: 'Parry +', classId: 'fighter', cardType: 'defense', apCost: 2,
    baseDamage: 0, baseBlock: 7, evasionScalingStat: 'agi', evasionMultiplier: 2,
    isSkillUpgrade: true, upgradeOf: 'iron_parry',
    cardNumber: 'FTR · #018', flavorText: 'An expert guard that grants 7 Block and +2 EVA this round.',
  },
  fortify_plus: {
    id: 'fortify_plus', name: 'Fortify +', classId: 'fighter', cardType: 'defense', apCost: 2,
    baseDamage: 0, baseBlock: 7, blockScalingStat: 'def', blockScalingDivisor: 1, blockScalingMultiplier: 2,
    isSkillUpgrade: true, upgradeOf: 'battle_focus',
    cardNumber: 'FTR · #019', flavorText: 'Gain 7 Block plus twice the hero DEF.',
  },
  whirlwind: {
    id: 'whirlwind', name: 'Whirlwind', classId: 'fighter', cardType: 'attack', apCost: 1,
    baseDamage: 1, damageScalingStat: 'atk', damageScalingDivisor: 2, baseBlock: 0, accBonus: -1, targetMode: 'all_enemies',
    cardNumber: 'FTR · #020', flavorText: 'Strike every enemy for 1 plus 1 per 2 hero ATK. Each target rolls separately; -1 ACC.',
  },
  whirlwind_plus: {
    id: 'whirlwind_plus', name: 'Whirlwind +', classId: 'fighter', cardType: 'attack', apCost: 2,
    baseDamage: 2, damageScalingStat: 'atk', damageScalingDivisor: 1, baseBlock: 0, accBonus: -1, targetMode: 'all_enemies',
    isSkillUpgrade: true, upgradeOf: 'whirlwind',
    cardNumber: 'FTR · #021', flavorText: 'Strike every enemy for 2 plus hero ATK. Each target rolls separately; -1 ACC.',
  },
  battlecry: {
    id: 'battlecry', name: 'Battlecry', classId: 'fighter', cardType: 'skill', apCost: 1,
    baseDamage: 0, baseBlock: 0, discardMode: 'exact', discardCount: 2, drawCards: 3, gainAp: 1,
    cardNumber: 'FTR · #022', flavorText: 'Discard 2 cards, draw 3, then regain 1 AP.',
  },
  battlecry_plus: {
    id: 'battlecry_plus', name: 'Battlecry +', classId: 'fighter', cardType: 'skill', apCost: 2,
    baseDamage: 0, baseBlock: 0, discardMode: 'exact', discardCount: 2, drawCards: 4, gainAp: 2,
    isSkillUpgrade: true, upgradeOf: 'battlecry',
    cardNumber: 'FTR · #023', flavorText: 'Discard 2 cards, draw 4, then regain 2 AP.',
  },
  battle_flag: {
    id: 'battle_flag', name: 'Battle Flag', classId: 'fighter', cardType: 'enchantment', apCost: 1,
    baseDamage: 0, baseBlock: 0, staysInPlay: true, gainAp: 1, drawOnApGain: true,
    cardNumber: 'FTR · #024', flavorText: 'Stays in play for this battle. Whenever a card effect grants AP, draw a card. On play, regain 1 AP.',
  },
  adrenalin: {
    id: 'adrenalin', name: 'Adrenalin', classId: 'fighter', cardType: 'skill', apCost: 1,
    baseDamage: 0, baseBlock: 0, discardMode: 'any', gainAp: 0,
    cardNumber: 'FTR · #025', flavorText: 'Discard any number of cards; regain 1 AP for each card discarded.',
  },
  final_smash: {
    id: 'final_smash', name: 'Final Smash', classId: 'fighter', cardType: 'attack', apCost: 3,
    baseDamage: 6, damageScalingStat: 'atk', damageScalingDivisor: 1, damageScalingMultiplier: 2, baseBlock: 0,
    discardMode: 'any', damagePerDiscard: 3,
    cardNumber: 'FTR · #026', flavorText: 'Discard any number of cards. Deal 6 plus twice hero ATK plus 3 per card discarded.',
  },

  // Wizard Starter & Trainable Cards
  fireball_atk: {
    id: 'fireball_atk',
    name: 'Fireball ATK',
    classId: 'wizard',
    cardType: 'attack',
    apCost: 1,
    baseDamage: 2,
    damageScalingStat: 'int',
    damageScalingDivisor: 2,
    baseBlock: 0,
    cardNumber: 'GRS · #017/021',
    flavorText: 'A condensed orb of roaring arcane flame that streaks across the grass and explodes on impact.',
  },
  force_field_def: {
    id: 'force_field_def',
    name: 'Force Field DEF',
    classId: 'wizard',
    cardType: 'defense',
    apCost: 1,
    baseDamage: 0,
    baseBlock: 2,
    blockScalingStat: 'int',
    blockScalingDivisor: 2,
    evasionScalingStat: 'agi',
    evasionMultiplier: 1,
    cardNumber: 'GRS · #018/021',
    flavorText: 'Weave shimmering glyphs of kinetic wards that repel hostile physical strikes.',
  },
  arcane_blast: {
    id: 'arcane_blast',
    name: 'Arcane Blast',
    classId: 'wizard',
    cardType: 'attack',
    apCost: 2,
    baseDamage: 5,
    damageScalingStat: 'int',
    damageScalingDivisor: 1,
    baseBlock: 0,
    cardNumber: 'GRS · #019/021',
    flavorText: 'Unleash raw mana in an overwhelming burst of pure destructive brilliance.',
  },
  frost_nova: {
    id: 'frost_nova',
    name: 'Frost Nova',
    classId: 'wizard',
    cardType: 'defense',
    apCost: 1,
    baseDamage: 2,
    damageScalingStat: 'int',
    damageScalingDivisor: 2,
    baseBlock: 2,
    blockScalingStat: 'int',
    blockScalingDivisor: 2,
    evasionScalingStat: 'agi',
    evasionMultiplier: 1,
    cardNumber: 'GRS · #020/021',
    flavorText: 'Flash-freeze the surrounding air into crystalline shards that chill foes and shield the caster.',
  },
  blink_ward: {
    id: 'blink_ward',
    name: 'Blink Ward',
    classId: 'wizard',
    cardType: 'defense',
    apCost: 1,
    baseDamage: 0,
    baseBlock: 2,
    blockScalingStat: 'int',
    blockScalingDivisor: 2,
    evasionScalingStat: 'agi',
    evasionMultiplier: 2,
    cardNumber: 'GRS · #021/021',
    flavorText: 'Bend ambient light and space to confound enemy sight, stepping through shadows.',
  },
};

export const CLASS_TRAIN_POOLS: Record<ClassId, string[]> = {
  fighter: ['melee_atk', 'shield_def', 'heavy_cleave', 'iron_parry', 'battle_focus', 'whirlwind', 'battlecry', 'battle_flag', 'adrenalin', 'final_smash'],
  wizard: ['fireball_atk', 'force_field_def', 'arcane_blast', 'frost_nova', 'blink_ward'],
  rogue: ['melee_atk', 'shield_def', 'heavy_cleave', 'iron_parry', 'battle_focus'],
};

/**
 * The Void is an inexhaustible, public template zone. Its cards cannot be
 * trained or drawn; Shrines instantiate an appropriate one when upgrading an
 * owned base card.
 */
export function getVoidCards(): CombatCardDef[] {
  return Object.values(COMBAT_CARD_CATALOG)
    .filter((card) => card.isSkillUpgrade)
    .map((card) => createCombatCardInstance(card.id, 'void'));
}

export function createCombatCardInstance(templateId: string, instanceSuffix: string): CombatCardDef {
  const tpl = COMBAT_CARD_CATALOG[templateId];
  if (!tpl) {
    throw new Error(`Unknown combat card template: ${templateId}`);
  }
  return {
    ...tpl,
    instanceId: `${templateId}_${instanceSuffix}`,
  };
}

export const FLEE_CARD_ID = 'action_flee';
export const FLEE_CARD_INSTANCE_ID = 'permanent_flee';

export function createFleeCard(classId: ClassId = 'fighter'): CombatCardDef {
  return {
    id: FLEE_CARD_ID,
    instanceId: FLEE_CARD_INSTANCE_ID,
    name: 'Flee',
    classId,
    cardType: 'defense',
    apCost: 2,
    baseDamage: 0,
    baseBlock: 0,
    cardNumber: 'ACT · FLEE',
    flavorText:
      'Disengage and sprint away from battle. Escape check: roll 1d6 ≤ ⌊(AGI + LUK) / 2⌋. No rewards or loots collected.',
  };
}

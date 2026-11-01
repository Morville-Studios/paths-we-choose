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
    name: 'Heavy Cleave',
    classId: 'fighter',
    cardType: 'attack',
    apCost: 2,
    baseDamage: 5,
    damageScalingStat: 'str',
    damageScalingDivisor: 1,
    baseBlock: 0,
    cardNumber: 'GRS · #014/021',
    flavorText: 'Pour every ounce of muscle into an overhead swing that shatters armor and bone alike.',
  },
  iron_parry: {
    id: 'iron_parry',
    name: 'Iron Parry',
    classId: 'fighter',
    cardType: 'defense',
    apCost: 1,
    baseDamage: 1,
    damageScalingStat: 'str',
    damageScalingDivisor: 2,
    baseBlock: 3,
    blockScalingStat: 'str',
    blockScalingDivisor: 2,
    evasionScalingStat: 'agi',
    evasionMultiplier: 1,
    cardNumber: 'GRS · #015/021',
    flavorText: 'Deflect the incoming strike and counter in a single fluid, unbroken motion.',
  },
  battle_focus: {
    id: 'battle_focus',
    name: 'Battle Focus',
    classId: 'fighter',
    cardType: 'defense',
    apCost: 1,
    baseDamage: 0,
    baseBlock: 2,
    blockScalingStat: 'str',
    blockScalingDivisor: 2,
    evasionScalingStat: 'agi',
    evasionMultiplier: 2,
    cardNumber: 'GRS · #016/021',
    flavorText: 'Breathe deep, anticipate the enemy footwork, and slip through the chaos unscathed.',
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
  fighter: ['melee_atk', 'shield_def', 'heavy_cleave', 'iron_parry', 'battle_focus'],
  wizard: ['fireball_atk', 'force_field_def', 'arcane_blast', 'frost_nova', 'blink_ward'],
  rogue: ['melee_atk', 'shield_def', 'heavy_cleave', 'iron_parry', 'battle_focus'],
};

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

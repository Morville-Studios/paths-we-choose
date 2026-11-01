import { CharacterClassDef, CharacterStats, ClassId } from '../core/types';

export const STARTING_BASE_STATS: CharacterStats = {
  str: 1,
  dex: 1,
  agi: 1,
  int: 1,
  cha: 1,
  luk: 1,
};

export const CLASS_CATALOG: Record<ClassId, CharacterClassDef> = {
  fighter: {
    id: 'fighter',
    name: 'Fighter',
    title: 'Vanguard of Steel',
    description:
      'A battle-hardened warrior who excels in physical might and shield defense. High STR grants superior vitality and melee power.',
    primaryStat: 'str',
    secondaryStats: ['dex', 'agi'],
    classBonuses: {
      str: 2,
      dex: 1,
      agi: 1,
      int: 0,
      cha: 0,
      luk: 0,
    },
    starterCardIds: [
      'melee_atk',
      'melee_atk',
      'melee_atk',
      'melee_atk',
      'melee_atk',
      'melee_atk',
      'melee_atk',
      'melee_atk',
      'shield_def',
      'shield_def',
    ],
    passive: {
      name: '[Berzerk]',
      description: 'Gain +1 ATK bonus when HP is 50% or below Max HP. If 25% or below, gain +2 ATK bonus instead.',
    },
  },
  wizard: {
    id: 'wizard',
    name: 'Wizard',
    title: 'Scholar of the Arcane',
    description:
      'A master of elemental fire and protective wards. High INT amplifies spell damage and arcane force fields.',
    primaryStat: 'int',
    secondaryStats: ['dex', 'cha'],
    classBonuses: {
      str: 0,
      dex: 1,
      agi: 0,
      int: 2,
      cha: 1,
      luk: 0,
    },
    starterCardIds: [
      'fireball_atk',
      'fireball_atk',
      'fireball_atk',
      'fireball_atk',
      'fireball_atk',
      'fireball_atk',
      'fireball_atk',
      'fireball_atk',
      'force_field_def',
      'force_field_def',
    ],
    passive: {
      name: '[Conserve]',
      description: 'When you end turn in battle with unused Action Points, they carry over to your next battle turn.',
    },
  },
  rogue: {
    id: 'rogue',
    name: 'Rogue',
    title: 'Shadow of the Blades',
    description:
      'A swift, cunning rogue who thrives on agility and opportunistic fortune. High AGI grants superior evasion while DEX ensures lethal precision.',
    primaryStat: 'agi',
    secondaryStats: ['dex', 'str'],
    classBonuses: {
      str: 1,
      dex: 1,
      agi: 2,
      int: 0,
      cha: 0,
      luk: 0,
    },
    starterCardIds: [
      'melee_atk',
      'melee_atk',
      'melee_atk',
      'melee_atk',
      'melee_atk',
      'melee_atk',
      'melee_atk',
      'melee_atk',
      'shield_def',
      'shield_def',
    ],
    passive: {
      name: '[Steal]',
      description: 'Whenever you roll a 2d6 to perform an attack hit check and it is a pair (1+1, 2+2, 3+3, 4+4, 5+5, 6+6), you immediately gain 1 Gold.',
    },
  },
};

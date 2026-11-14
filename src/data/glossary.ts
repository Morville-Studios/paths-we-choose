export type GlossaryCategory =
  | 'Combat Damage'
  | 'Defense & Recovery'
  | 'Status & Debuffs'
  | 'Creature Traits';

export interface GlossaryEntry {
  id: string;
  term: string;
  syntax: string;
  category: GlossaryCategory;
  ruleText: string;
  example: string;
}

export const KEYWORD_GLOSSARY: GlossaryEntry[] = [
  {
    id: 'atk',
    term: 'ATK',
    syntax: 'ATK (X)',
    category: 'Combat Damage',
    ruleText: 'Deals X physical damage. Reduced by target DEF and absorbed by temporary Block.',
    example: 'Goblin Slash: ATK (4) deals 4 physical damage.',
  },
  {
    id: 'matk',
    term: 'MATK',
    syntax: 'MATK (X)',
    category: 'Combat Damage',
    ruleText: 'Deals X magical damage. Reduced by target MDEF and absorbed by temporary Block.',
    example: 'Cultist Mage Soul Burn: MATK (8) deals 8 magical damage.',
  },
  {
    id: 'pen',
    term: 'PEN (Penetration)',
    syntax: 'PEN (X)',
    category: 'Combat Damage',
    ruleText: 'Penetration: makes the attack ignore the target’s DEF by the amount indicated.',
    example: 'Ramram T2: ATK (4), PEN (2) ignores up to 2 Hero DEF.',
  },
  {
    id: 'regen',
    term: 'Regen',
    syntax: 'Regen (X)',
    category: 'Defense & Recovery',
    ruleText: 'Creature gains X HP on activation (when the creature starts its turn), capped at its Max HP.',
    example: 'Zombie T1: Regen (3); Blob T1: ATK (3), Regen (1).',
  },
  {
    id: 'def',
    term: 'DEF',
    syntax: 'DEF (X[, D])',
    category: 'Defense & Recovery',
    ruleText: 'Adds X temporary DEF to the creature for 1 turn (default duration). A second parameter overrides duration: DEF (1, 2) lasts until the creature completes another turn action after it was cast.',
    example: 'Goblin T2: ATK (3), DEF (2); Pincer T1: DEF (1, 2).',
  },
  {
    id: 'acc',
    term: 'ACC',
    syntax: 'ACC (X[, D])',
    category: 'Defense & Recovery',
    ruleText: 'Grants +X immediate ACC for this attack. If a duration D is specified (e.g. ACC (1, 2)), it also persists up to the next turn(s).',
    example: 'Scavenger T2: ATK (4), ACC (2); Stalker T1: EVA (1, 2), ACC (1).',
  },
  {
    id: 'eva',
    term: 'EVA',
    syntax: 'EVA (X[, D])',
    category: 'Defense & Recovery',
    ruleText: 'Grants +X EVA for 1 turn, or up to the given duration D when a second parameter is specified.',
    example: 'Stalker T1: EVA (1, 2), ACC (1) grants +1 EVA for 2 turns.',
  },
  {
    id: 'lsteal',
    term: 'LSTEAL (Life Steal)',
    syntax: 'LSTEAL (X)',
    category: 'Defense & Recovery',
    ruleText: 'Deals X physical damage and heals the creature for half of the damage dealt (rounded up), capped at Max HP.',
    example: 'Zombie T1: LSTEAL (6).',
  },
  {
    id: 'heal',
    term: 'Heal',
    syntax: 'Heal (X)',
    category: 'Defense & Recovery',
    ruleText: 'Allows a creature to self-heal for X HP on its turn, capped at its Max HP.',
    example: 'Bullwark T1: Heal (4).',
  },
  {
    id: 'poison',
    term: 'Poison',
    syntax: 'Poison (X, D)',
    category: 'Status & Debuffs',
    ruleText: 'On hit, inflicts Poison dealing X damage (ignoring DEF/MDEF) at the start of the target’s turn for D turns. Players test Poison vs VIT with MACG-3D6™ to shake it off.',
    example: 'Assasin T2: ACC (2), Poison (4, 2).',
  },
  {
    id: 'blind',
    term: 'Blind',
    syntax: 'Blind (X, D)',
    category: 'Status & Debuffs',
    ruleText: 'Inflicts a -X ACC token on the Hero that lasts for D turns.',
    example: 'Ghoul T1: Blind (1, 2) applies -1 Hero ACC for 2 turns.',
  },
  {
    id: 'ensnare',
    term: 'Ensnare',
    syntax: 'Ensnare (X, D)',
    category: 'Status & Debuffs',
    ruleText: 'Reduces the Hero’s EVA by X for D turns.',
    example: 'Witch T1: Blind (2, 2), Ensnare (2, 2).',
  },
  {
    id: 'harden',
    term: 'Harden',
    syntax: 'Harden (X)',
    category: 'Creature Traits',
    ruleText: 'Grants +X DEF for 1 turn whenever the creature gets hit by an attack (successful hit only).',
    example: 'Basilisk / Rattler / Bullwark Passive: Harden (1).',
  },
  {
    id: 'skittish',
    term: 'Skittish',
    syntax: 'Skittish (X)',
    category: 'Creature Traits',
    ruleText: 'Grants +X EVA immediately for this turn whenever this creature is attacked (hit or miss), making it harder to hit with each attempt.',
    example: 'Stalker Passive: Skittish (1) grants +1 EVA after each attack attempt against it this turn.',
  },
  {
    id: 'undying',
    term: 'Undying',
    syntax: 'Undying (X)',
    category: 'Creature Traits',
    ruleText: 'Starts with X Undying tokens. Whenever defeated, consumes 1 token and rolls 1d6; if the roll is ≤ 1 + remaining tokens, revives with full HP.',
    example: 'Creeper Passive: Undying (3) needs 1–3 on first try, 1–2 on second, and 1 on final token.',
  },
  {
    id: 'thorn',
    term: 'Thorn',
    syntax: 'Thorn (X)',
    category: 'Creature Traits',
    ruleText: 'After a successful Melee Hero attack while this creature survives, deals X damage that ignores DEF and Block.',
    example: 'Lurker Passive: Thorn (1), Harden (1).',
  },
  {
    id: 'channel',
    term: 'Channel',
    syntax: 'Channel (X, D)',
    category: 'Creature Traits',
    ruleText: 'At the end of the creature’s turn, gains +X MATK (lasting D turns, or permanently for the battle if D is omitted).',
    example: 'Cultist Mage Passive: Channel (1, 3); Orc Shaman Passive: Channel (1).',
  },
  {
    id: 'bloodlust',
    term: 'Bloodlust',
    syntax: 'Bloodlust',
    category: 'Creature Traits',
    ruleText: 'Grants +1 ATK when HP is below 50% Max HP, and +2 ATK when HP is below 25% Max HP.',
    example: 'Dark Orc Passive: Bloodlust, Regen (2).',
  },
  {
    id: 'summon',
    term: 'Summon',
    syntax: 'Summon (Name)',
    category: 'Creature Traits',
    ruleText: 'Summons the named creature from the Monster Deck into battle (or returns one from discard on miss).',
    example: 'Grundy Call Goblin: Summon (Goblin).',
  },
];

export const GLOSSARY_TOOLTIP_TEMPLATES = {
  atk: (amount: number, hits = 1): string =>
    hits > 1
      ? `Deals ${amount} physical damage ×${hits} hits (each reduced by Hero DEF and Block).`
      : `Deals ${amount} physical damage (reduced by Hero DEF and Block).`,
  matk: (amount: number, hits = 1): string =>
    hits > 1
      ? `Deals ${amount} magical damage ×${hits} hits (each reduced by Hero MDEF and Block).`
      : `Deals ${amount} magical damage (reduced by Hero MDEF and Block).`,
  regen: (amount: number): string =>
    `Creature gains ${amount} HP on activation (up to Max HP).`,
  regenerate: (amount: number): string =>
    `Creature gains ${amount} HP on activation (up to Max HP).`,
  def: (amount: number, duration = 1): string =>
    duration > 1
      ? `Adds ${amount} temporary DEF for ${duration} turns (until the creature completes another turn action after casting).`
      : `Adds ${amount} temporary DEF for 1 turn.`,
  block: (amount: number): string =>
    `Adds ${amount} temporary DEF for 1 turn.`,
  pen: (amount: number): string =>
    `Penetration: makes the attack ignore up to ${amount} of the target’s DEF.`,
  pierce: (amount: number): string =>
    `Penetration: makes the attack ignore up to ${amount} of the target’s DEF.`,
  acc: (amount: number, duration = 1): string =>
    duration > 1
      ? `Grants +${amount} immediate ACC for this attack and persists for ${duration} turns.`
      : `Grants +${amount} immediate ACC for this attack.`,
  eva: (amount: number, duration = 1): string =>
    duration > 1
      ? `Grants +${amount} EVA for ${duration} turns.`
      : `Grants +${amount} EVA for 1 turn.`,
  poison: (damage?: number, duration?: number): string =>
    damage && duration
      ? `On hit, inflicts Poison (${damage} damage ignoring DEF/MDEF at Hero turn start for ${duration} turns; tested vs VIT via MACG-3D6™).`
      : 'Inflicts Poison on hit: Hero takes 1 HP damage at each End Turn until cleansed (does not stack).',
  lsteal: (amount: number): string =>
    `Deals ${amount} physical damage and restores HP equal to half of the damage dealt (rounded up), up to Max HP.`,
  lstealAttr: (): string =>
    'Life Steal: Restores HP equal to 50% of actual damage dealt (rounded up), up to Max HP.',
  heal: (amount: number): string =>
    `Creature self-heals for ${amount} HP (up to Max HP).`,
  blind: (amount: number, duration = 1): string =>
    `Inflicts a -${amount} ACC token on the Hero lasting ${duration} turn${duration > 1 ? 's' : ''}.`,
  ensnare: (amount: number, duration = 1): string =>
    `Reduces the Hero’s EVA by ${amount} for ${duration} turn${duration > 1 ? 's' : ''}.`,
  harden: (amount: number): string =>
    `Grants +${amount} DEF for 1 turn whenever this creature gets hit by an attack (successful hit only).`,
  lifesteal: (pct = 100): string =>
    pct === 100
      ? 'Restores HP equal to unblocked damage dealt (up to Max HP).'
      : `Restores ${pct}% of unblocked HP damage dealt (rounded down).`,
  skittish: (amount: number): string =>
    `Grants +${amount} EVA for this turn whenever it is attacked (hit or miss), making it harder to hit the more you attempt to hit it.`,
  undying: (tokens: number): string =>
    `Starts with ${tokens} Undying tokens. On defeat, consumes 1 token and rolls 1d6: revives at full HP if roll ≤ 1 + remaining tokens.`,
  thorn: (amount: number): string =>
    `After a successful Melee Hero attack while alive, deals ${amount} damage ignoring DEF and Block.`,
  channel: (amount: number, duration?: number): string =>
    duration
      ? `At the end of its turn, gains +${amount} MATK for ${duration} turns (stacking).`
      : `At the end of its turn, permanently gains +${amount} MATK for the rest of combat.`,
  bloodlust: (): string =>
    'Grants +1 ATK when HP is below 50% Max HP, and +2 ATK when HP is below 25% Max HP.',
  summon: (name: string): string =>
    `Summons ${name} from the Monster Deck into battle (or returns one from discard on miss).`,
  hex: (summary: string): string =>
    `Applies a temporary Hero debuff: ${summary}.`,
  buff: (summary: string): string =>
    `Creature gains a temporary combat buff: ${summary}.`,
} as const;

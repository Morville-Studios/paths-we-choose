# Generated Content Catalogs

Generated from src/data by scripts/sync-doc-catalogs.cjs. Do not edit these tables manually. Run npm run docs:sync after changing catalogs; npm run docs:check verifies them. These tables record implementation data, not approval for a new gameplay rule. Mechanics and ability timing are specified in MECHANICS_AND_DATA.md.

## Classes

Effective stats below are Base + Class, before preparation upgrades, gear or blessings. Stat order: STR / DEX / AGI / INT / CHA / VIT.

| Class | Primary | Secondary | Class bonuses | Effective stats | Max HP | Starter deck | Passive |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Fighter | str | vit, dex | 2 / 1 / 0 / 0 / 0 / 1 | 3 / 2 / 1 / 1 / 1 / 2 | 14 | 8× Slash, 2× Defend | Gain +1 ATK bonus when HP is 50% or below Max HP. If 25% or below, gain +2 ATK bonus instead. |
| Wizard | int | dex, cha | 0 / 1 / 0 / 2 / 1 / 0 | 1 / 2 / 1 / 3 / 2 / 1 | 12 | 8× Fireball ATK, 2× Force Field DEF | When you end turn in battle with unused Action Points, they carry over to your next battle turn. |
| Rogue | agi | dex, str | 1 / 1 / 2 / 0 / 0 / 0 | 2 / 2 / 3 / 1 / 1 / 1 | 12 | 8× Slash, 2× Defend | Whenever you roll a 2d6 to perform an attack hit check and it is a pair (1+1, 2+2, 3+3, 4+4, 5+5, 6+6), you immediately gain Gold equal to the doubled number (e.g. 1+1 grants +1 Gold, 5+5 grants +5 Gold, 6+6 grants +6 Gold; even Snake Eyes steals +1 Gold). |

## Ordinary Monsters

Physical ordinary-creature supply: **76 cards**. Common types have 6 copies, Uncommon types have 4, and Rare types have 3. Scenario setup pulls cards from the Void by main-terrain band: 100% / rounded 2/3 / rounded 1/3. Stage 1 pulls **45** cards and leaves **31** in the Void; Stage 2 pulls **37** and leaves **39**. Runtime instance IDs distinguish physical copies; collector numbers identify types.

| Collector ID | Template ID | Name | Type | Rarity | Supply | Main terrain | Stage 1 deck | Stage 1 Void | Stage 2 deck | Level | HP | DEF | MDEF | ACC | EVA | SP | Gold | Terrains | Pattern | Abilities |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mon1grs-01 | goblin | Goblin | Goblinoid | common | 6 | grasslands | 6 | 0 | 0 | 1 | 6 | 0 | 0 | 1 | 1 | 1 | 2 | grasslands, forest, swamp | 1. Slash: 4 physical damage<br>2. Cautious Poke: 3 physical damage; +2 Block | None |
| mon1grs-02 | pink_slime | Blob | Ooze | uncommon | 4 | grasslands | 4 | 0 | 0 | 1 | 4 | 1 | 1 | 0 | 0 | 1 | 2 | grasslands, forest | 1. Ooze Bump: 3 physical damage; +1 HP<br>2. Acid Glob: 4 physical damage | None |
| mon1grs-03 | fighting_beetle | Pincer | Insect | uncommon | 4 | grasslands | 4 | 0 | 0 | 1 | 5 | 1 | 0 | 0 | 0 | 1 | 2 | grasslands, forest | 1. Shell Guard: 3 physical damage; +1 DEF for 1 turn(s)<br>2. Horn Charge: 4 physical damage | None |
| mon1grs-04 | wild_dog | Scavenger | Beast | uncommon | 4 | grasslands | 4 | 0 | 0 | 1 | 6 | 0 | 0 | 2 | 2 | 1 | 2 | grasslands, forest | 1. Savage Bite: 4 physical damage<br>2. Lunging Bite: 3 physical damage; +1 ACC for 1 turn(s) | None |
| mon1grs-05 | ramram | Ramram | Beast | rare | 3 | grasslands | 3 | 0 | 0 | 1 | 6 | 0 | 0 | 2 | 1 | 1 | 2 | grasslands | 1. Headbutt: 4 physical damage<br>2. Sturdy Horn Guard: 3 physical damage; +2 Block | None |
| mon1grs-06 | stalker | Stalker | Unspecified | uncommon | 4 | grasslands | 4 | 0 | 0 | 2 | 8 | 0 | 0 | 1 | 2 | 2 | 4 | grasslands, forest | 1. Sprint: +1 EVA for 2 turn(s); +1 ACC for 2 turn(s)<br>2. Pounce: 6 physical damage | Skittish: Each hit immediately grants +1 EVA for the rest of the hero turn.; Sprint grants +1 EVA and +1 ACC for 2 turns; refreshing does not stack. |
| mon2frs-01 | rattler | Rattler | Reptile | rare | 3 | forest | 2 | 1 | 3 | 2 | 7 | 1 | 0 | 3 | 1 | 2 | 4 | forest | 1. Venom Strike: 5 physical damage<br>2. Coil & Strike: 4 physical damage; +2 Block | None |
| mon2frs-02 | tree_snapper | Basilisk | Reptile | uncommon | 4 | forest | 3 | 1 | 4 | 2 | 8 | 1 | 0 | 1 | 1 | 2 | 4 | swamp, forest | 1. Stalk: +2 EVA for 1 turn(s)<br>2. Snapping Jaws: 6 physical damage | None |
| mon2frs-03 | zombie | Zombie | Undead | common | 6 | forest | 4 | 2 | 6 | 2 | 7 | 1 | 1 | 0 | 0 | 2 | 4 | swamp, cave, forest | 1. Regenerate: +3 HP<br>2. Rotting Claw: 5 physical damage | Lifesteal (Attacks restore HP equal to unblocked damage dealt) |
| mon2frs-04 | ghoul | Ghoul | Undead | uncommon | 4 | forest | 3 | 1 | 4 | 2 | 10 | 0 | 1 | 1 | 2 | 2 | 4 | forest, swamp | 1. Growl: -1 Hero EVA for 2 turns<br>2. Mad Dash: 6 physical damage | None |
| mon2frs-05 | bullwark | Bullwark | Beast | uncommon | 4 | forest | 3 | 1 | 4 | 3 | 14 | 2 | 0 | 1 | 0 | 4 | 8 | swamp, forest | 1. Chaotic Impulse: random +1 ATK or ACC for 1 turn(s)<br>2. Heavy Charge: 7 physical damage | Chaotic Impulse grants either +1 ATK or +1 ACC for its next turn. |
| mon3smp-01 | leech | Leech | Undead | uncommon | 4 | swamp | 1 | 3 | 3 | 4 | 18 | 1 | 3 | 2 | 2 | 8 | 16 | swamp, cave | 1. Soul Drain: 8 magical damage; drain 50% HP damage<br>2. Channel: +2 Block; +2 HP; every 3 casts revive one discarded zombie | Soul Drain restores 50% of HP damage dealt (rounded down).; Every third Channel returns one Zombie from the monster discard pile at full HP; it acts next round. |
| mon3smp-02 | creeper | Creeper | Undead | rare | 3 | swamp | 1 | 2 | 2 | 3 | 12 | 2 | 1 | 1 | 0 | 4 | 8 | swamp | 1. Submerge: +3 Block; +3 HP<br>2. Ambush: 7 physical damage | Resilient: Whenever defeated, roll 1d6. On a 6, return to life with 6 HP. |
| mon3smp-03 | assassin | Assasin | Human | common | 6 | swamp | 2 | 4 | 4 | 3 | 13 | 1 | 1 | 2 | 3 | 4 | 8 | swamp, cave, underground | 1. Poison Dart: 3 physical damage; ignore 3 DEF; poison on hit<br>2. Piercing Strike: 7 physical damage; ignore 2 DEF | Poison Dart poisons on hit: 1 HP damage at each subsequent hero End Turn until cleansed; does not stack.; Piercing Strike ignores up to 2 Hero DEF. |
| mon3smp-04 | witch | Witch | Unspecified | uncommon | 4 | swamp | 1 | 3 | 3 | 3 | 14 | 1 | 3 | 1 | 1 | 4 | 8 | swamp, cave | 1. Blinding Hex: -1 Hero EVA, -1 Hero ACC for 2 turns<br>2. Expose weakness: -1 Hero DEF, -1 Hero MDEF for 1 turns<br>3. Smite: 7 magical damage | Regen1: Regain 1 HP at the end of each turn, up to Max HP. |
| mon4cav-01 | phalanx | Phalanx | Arachnid | rare | 3 | cave | 0 | 3 | 1 | 4 | 20 | 3 | 0 | 1 | 2 | 8 | 16 | cave | 1. Blinding Web: 6 physical damage; -1 Hero ACC, -2 Hero EVA for 1 turns on hit<br>2. Double Smash: 8 physical damage; 2 separate hits | None |
| mon4cav-02 | cultist_mage | Cultist Mage | Human | common | 6 | cave | 0 | 6 | 2 | 4 | 18 | 1 | 2 | 3 | 2 | 8 | 16 | cave, underground, underworld | 1. Soul Burn: 8 magical damage | None |
| mon4cav-03 | lurker | Lurker | Wurm | uncommon | 4 | cave | 0 | 4 | 1 | 5 | 25 | 2 | 1 | 1 | 0 | 16 | 32 | cave, underground | 1. Drill: 10 physical damage<br>2. Shed: +12 HP; -2 DEF for 1 turn(s) | Acid Retaliation: After a successful player attack while Lurker survives, deal 1 damage that ignores DEF and Block. |

## Bosses

Bosses are spawned separately and excluded from ordinary-deck conservation. Stage 1 uses Grundy; Stage 2 uses the three Trolls together.

| Name | Template | Level | HP | DEF | MDEF | ACC | EVA | SP | Gold | Pattern | Abilities |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Grundy | goblin_chieftain | 5 | 30 | 1 | 1 | 1 | 1 | 16 | 32 | 1. Call Goblin: tutor one goblin from Monster Deck into play; if tutor misses, return one discarded goblin to top of Monster Deck<br>2. Beef up!: +4 Block; +1 DEF for 1 turn(s)<br>3. Goblin March: 6 physical damage; +1 damage per living goblin | Goblin Warlord: Calls Goblins from the hidden Monster Deck and grows stronger with each Goblin in play. |
| Troll Healer | troll_healer | 4 | 25 | 1 | 2 | 2 | 1 | 8 | 16 | 1. Troll Mending: +2 Block | Troll Mending (Heals a random troll for 10 HP each round) |
| Troll Hexer | troll_hexer | 4 | 25 | 1 | 2 | 2 | 1 | 8 | 16 | 1. Troll Hex: +2 Block<br>2. Cursed Recoil: 2 magical damage; +2 damage per active Hero debuff | Hex Curse (Casts a stacking random 5-turn debuff: -1 ACC, +1 DMG taken, or -1 EVA) |
| Troll Warrior | troll_brute | 4 | 25 | 2 | 0 | 3 | 1 | 8 | 16 | 1. Troll Smash: 6 physical damage | Relentless Assault (Attacks hero for 6 DMG each round) |

## Adventure Decks

Both missions contain 30 land cards. Start Tile is separate.

| Collector ID | Name | Terrain | Level | Stage 1 copies | Stage 2 copies |
| --- | --- | --- | --- | --- | --- |
| advgrs-00 | Undiscovered Grassland | grasslands | 1 | 3 | 0 |
| advgrs-01 | Grassland Encounter | grasslands | 2 | 8 | 0 |
| advgrs-03 | Grassland Village | grasslands | 1 | 3 | 0 |
| advgrs-04 | Grassland Shrine | grasslands | 1 | 3 | 0 |
| advfrs-00 | Undiscovered Forest | forest | 2 | 2 | 3 |
| advfrs-01 | Forest Encounter | forest | 3 | 5 | 8 |
| advfrs-03 | Forest Village | forest | 2 | 2 | 3 |
| advfrs-04 | Forest Shrine | forest | 2 | 2 | 3 |
| advsmp-00 | Undiscovered Swamp | swamp | 3 | 1 | 2 |
| advsmp-01 | Swamp Encounter | swamp | 4 | 1 | 5 |
| advsmp-03 | Swamp Village | swamp | 3 | 0 | 2 |
| advsmp-04 | Swamp Shrine | swamp | 3 | 0 | 2 |
| advcav-00 | Undiscovered Cave | cave | 4 | 0 | 1 |
| advcav-01 | Cave Encounter | cave | 5 | 0 | 1 |

## Shop and Treasure

Treasure deck: two copies per item, 42 cards total. Prices below are before Charisma discount.

| Item | ID | Slot/type | Level | Buy Gold | Sell Gold | Effects |
| --- | --- | --- | --- | --- | --- | --- |
| Health Potion | lvl1_health_potion | consumable | 1 | 6 | 3 | Restores 10 HP immediately when used. |
| Iron Sword | lvl1_iron_sword | weapon | 1 | 10 | 5 | Weapon Slot: +1 ATK (boosts physical attack card damage). |
| Apprentice Staff | lvl1_apprentice_staff | weapon | 1 | 15 | 7 | Weapon Slot: +1 MATK (boosts magical spell damage). |
| Robe | lvl1_robe | armor | 1 | 15 | 7 | Armor Slot: +1 MDEF (reduces incoming magic damage intake). |
| Leather Gear | lvl1_leather_gear | armor | 1 | 12 | 6 | Armor Slot: +1 EVA (increases evasion against all 2d6 attacks). |
| Chainmail | lvl1_chainmail | armor | 1 | 15 | 7 | Armor Slot: +1 DEF (reduces incoming physical attack damage). |
| Spellbinder | lvl2_spellbinder | accessory | 2 | 20 | 10 | Accessory Slot: +1 INT (boosts spellcraft and intellect). |
| Beast Ring | lvl2_beast_ring | accessory | 2 | 20 | 10 | Accessory Slot: +1 STR (boosts melee attack and physical defense scaling). |
| Hermes Gear | lvl2_hermes_gear | accessory | 2 | 20 | 10 | Accessory Slot: +1 AGI (improves agility and baseline evasion). |
| Goldstar | lvl2_goldstar | accessory | 2 | 20 | 10 | Accessory Slot: Produces an additional (1d6 - 1) Gold per victory. |
| Iron Sword + | lvl2_iron_sword_plus | weapon | 2 | 30 | 15 | Weapon Slot: +2 ATK and +1 ACC (boosts physical attack damage and hit rolls). |
| Chainmail + | lvl2_chainmail_plus | armor | 2 | 45 | 22 | Armor Slot: +2 DEF and +1 EVA (reduces physical damage and improves dodging). |
| Robe + | lvl2_robe_plus | armor | 2 | 45 | 22 | Armor Slot: +2 MDEF and +1 DEF (reduces magical and physical damage intake). |
| Apprentice Staff + | lvl2_apprentice_staff_plus | weapon | 2 | 45 | 22 | Weapon Slot: +2 MATK and +1 ATK (amplifies magical and physical attacks). |
| Leather Gear + | lvl2_leather_gear_plus | armor | 2 | 45 | 22 | Armor Slot: +2 EVA and +1 DEF (improves dodging and reduces physical damage). |
| Health Potion + | lvl2_health_potion_plus | consumable | 2 | 14 | 7 | Restores 18 HP immediately when used. |
| Health Potion ++ | lvl3_health_potion_plus_plus | consumable | 3 | 24 | 12 | Restores 24 HP immediately when used. |
| Health Potion +++ | lvl4_health_potion_plus_plus_plus | consumable | 4 | 36 | 18 | Restores 28 HP immediately when used. |
| Dagger | lvl1_dagger | weapon | 1 | 10 | 5 | Weapon Slot: +1 PEN (physical attacks ignore 1 enemy DEF). |
| Dagger + | lvl2_dagger_plus | weapon | 2 | 30 | 15 | Weapon Slot: +2 PEN and +1 ATK (physical attacks ignore 2 enemy DEF). |
| Focus Ring | lvl2_focus_ring | accessory | 2 | 20 | 10 | Accessory Slot: +1 DEX (improves accuracy and physical attack scaling). |

## Combat Cards

Fields below are base data, not complete effective damage. STR damage also adds floor(DEX/3), weapon ATK and Berzerk; INT damage adds weapon MATK. Gear DEF/MDEF do not directly increase card Block. EVA effects use the multiplier as a flat amount. See MECHANICS_AND_DATA.md for formulas.

| Card | ID | AP | Damage base | Damage scaling | Block base | Block scaling | Round EVA | Card ACC | Zone | Upgrades |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Slash | melee_atk | 1 | 3 | 1×atk/1 | 0 | None | 0 | 0 | Starter / New Skills | None |
| Defend | shield_def | 1 | 0 | None | 4 | 1×def/1 | 0 | 0 | Starter / New Skills | None |
| High Strike | heavy_cleave | 1 | 0 | 1×atk/1 + ACC | 0 | None | 0 | 0 | Starter / New Skills | None |
| Parry | iron_parry | 1 | 0 | None | 5 | None | 1 | 0 | Starter / New Skills | None |
| Fortify | battle_focus | 1 | 0 | None | 3 | 1×def/1 | 0 | 0 | Starter / New Skills | None |
| High Strike + | high_strike_plus | 1 | 0 | 2×atk/1 + ACC | 0 | None | 0 | 0 | Void | heavy_cleave |
| Parry + | parry_plus | 2 | 0 | None | 7 | None | 2 | 0 | Void | iron_parry |
| Fortify + | fortify_plus | 2 | 0 | None | 4 | 2×def/1 | 0 | 0 | Void | battle_focus |
| Whirlwind | whirlwind | 1 | 1 | 1×atk/1 | 0 | None | 0 | -1 | Starter / New Skills | None |
| Whirlwind + | whirlwind_plus | 2 | 2 | 2×atk/1 | 0 | None | 0 | -1 | Void | whirlwind |
| Battlecry | battlecry | 1 | 0 | None | 0 | None | 0 | 0 | Starter / New Skills | None |
| Battlecry + | battlecry_plus | 2 | 0 | None | 0 | None | 0 | 0 | Void | battlecry |
| Battle Flag | battle_flag | 1 | 0 | None | 0 | None | 0 | 0 | Starter / New Skills | None |
| Adrenalin | adrenalin | 1 | 0 | None | 0 | None | 0 | 0 | Starter / New Skills | None |
| Final Smash | final_smash | 3 | 6 | 2×atk/1 | 0 | None | 0 | 0 | Starter / New Skills | None |
| Fireball ATK | fireball_atk | 1 | 2 | 1×int/2 | 0 | None | 0 | 0 | Starter / New Skills | None |
| Force Field DEF | force_field_def | 1 | 0 | None | 2 | 1×int/2 | 1 | 0 | Starter / New Skills | None |
| Arcane Blast | arcane_blast | 2 | 5 | 1×int/1 | 0 | None | 0 | 0 | Starter / New Skills | None |
| Frost Nova | frost_nova | 1 | 2 | 1×int/2 | 2 | 1×int/2 | 1 | 0 | Starter / New Skills | None |
| Blink Ward | blink_ward | 1 | 0 | None | 2 | 1×int/2 | 2 | 0 | Starter / New Skills | None |

Train pools: fighter: melee_atk, shield_def, heavy_cleave, iron_parry, battle_focus, whirlwind, battlecry, battle_flag, adrenalin, final_smash; wizard: fireball_atk, force_field_def, arcane_blast, frost_nova, blink_ward; rogue: melee_atk, shield_def, heavy_cleave, iron_parry, battle_focus.

Void cards: High Strike + (upgrades High Strike); Parry + (upgrades Parry); Fortify + (upgrades Fortify); Whirlwind + (upgrades Whirlwind); Battlecry + (upgrades Battlecry). Void cards are not trainable or physically counted in New Skills decks.
